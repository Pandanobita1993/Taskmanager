-- AN AN: recurring employee tasks. Run this entire file once in Supabase SQL Editor.
-- Uses the existing device-profile pilot mode; no changes to employee sign-in.
begin;

create table if not exists public.recurring_task_templates (
 id uuid primary key default gen_random_uuid(),
 staff_id uuid not null references public.app_users(id),
 client_id uuid not null references public.clients(id),
 request_id uuid not null,
 content text not null check (length(trim(content)) between 1 and 2000),
 notes text not null default '' check (length(notes) <= 5000),
 action_type text not null check (action_type in ('ke_toan','bhxh','nop_ho_so','ra_soat','dau_tu','khac')),
 frequency text not null check (frequency in ('monthly','weekly','daily')),
 month_day integer check (month_day between 1 and 31),
 week_day integer check (week_day between 1 and 7),
 start_on date not null, end_on date,
 next_run_on date not null, is_active boolean not null default true,
 last_generated_on date, last_error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(staff_id,request_id,client_id),
 check (end_on is null or end_on >= start_on),
 check ((frequency='monthly' and month_day is not null) or (frequency='weekly' and week_day is not null) or frequency='daily')
);
create index if not exists recurring_tasks_due_idx on public.recurring_task_templates(next_run_on) where is_active;
create index if not exists recurring_tasks_staff_idx on public.recurring_task_templates(staff_id);

alter table public.tasks add column if not exists recurring_template_id uuid references public.recurring_task_templates(id);
alter table public.tasks add column if not exists recurring_for date;
alter table public.tasks add column if not exists intake_date date;
create unique index if not exists tasks_recurring_occurrence_idx on public.tasks(recurring_template_id,recurring_for)
 where recurring_template_id is not null;

-- Keep the occurrence even if someone later deletes its task: a refresh must not recreate it.
create table if not exists public.recurring_task_occurrences (
 template_id uuid not null references public.recurring_task_templates(id),
 scheduled_for date not null,
 task_id uuid references public.tasks(id) on delete set null,
 generated_at timestamptz not null default now(),
 primary key(template_id,scheduled_for)
);
alter table public.recurring_task_templates enable row level security;
alter table public.recurring_task_occurrences enable row level security;
revoke all on public.recurring_task_templates,public.recurring_task_occurrences from anon,authenticated;

create or replace function public.recurring_next_date(p_frequency text,p_month_day integer,p_week_day integer,p_from date)
returns date language plpgsql immutable set search_path=public as $$
declare first_day date; candidate date; last_day integer;
begin
 if p_from is null then raise exception 'Thiếu ngày bắt đầu.'; end if;
 if p_frequency='daily' then return p_from;
 elsif p_frequency='weekly' and p_week_day between 1 and 7 then
  return p_from + ((p_week_day - extract(isodow from p_from)::integer + 7) % 7);
 elsif p_frequency='monthly' and p_month_day between 1 and 31 then
  first_day:=date_trunc('month',p_from)::date;
  last_day:=extract(day from first_day+interval '1 month - 1 day')::integer;
  candidate:=first_day+least(p_month_day,last_day)-1;
  if candidate<p_from then
   first_day:=(first_day+interval '1 month')::date;
   last_day:=extract(day from first_day+interval '1 month - 1 day')::integer;
   candidate:=first_day+least(p_month_day,last_day)-1;
  end if;
  return candidate;
 end if;
 raise exception 'Lịch lặp không hợp lệ.';
end $$;

create or replace function public.recurring_client_access(p_staff_id uuid,p_client_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from clients c join app_users u on u.id=p_staff_id and u.is_active
  where c.id=p_client_id and c.archived_at is null and
  (c.accounting_person=u.name or c.insurance_person=u.name
   or ('Rà soát:'||u.name)=any(c.services) or ('Đầu tư:'||u.name)=any(c.services)
   or exists(select 1 from tasks t where t.client_id=c.id and t.user_id in(u.id::text,u.name))))
$$;

-- Internal only: the browser cannot choose a future processing date or generate for all staff.
create or replace function public.generate_recurring_tasks(p_as_of date,p_staff_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r recurring_task_templates%rowtype; due_on date; task_uuid uuid;
 inserted integer; made integer:=0; per_rule integer; failures integer:=0; loops integer;
 contact text; rendered text;
begin
 if p_as_of is null then raise exception 'Thiếu ngày chạy.'; end if;
 for r in select rt.* from recurring_task_templates rt join app_users u on u.id=rt.staff_id and u.is_active
  join clients c on c.id=rt.client_id and c.archived_at is null
  where rt.is_active and rt.next_run_on<=p_as_of and (p_staff_id is null or rt.staff_id=p_staff_id)
   and (rt.end_on is null or rt.next_run_on<=rt.end_on)
  order by rt.next_run_on,rt.id for update of rt skip locked
 loop
  begin
   due_on:=r.next_run_on; per_rule:=0; loops:=0;
   select coalesce(nullif(trim(contact_name),''),nullif(trim(contact_phone),''),'Người liên hệ cty')
    into contact from clients where id=r.client_id;
   while due_on<=p_as_of and (r.end_on is null or due_on<=r.end_on) and loops<100 loop
    loops:=loops+1;
    insert into recurring_task_occurrences(template_id,scheduled_for) values(r.id,due_on) on conflict do nothing;
    get diagnostics inserted=row_count;
    if inserted=1 then
     rendered:=replace(replace(replace(r.content,'{{thang}}',to_char(due_on,'MM')),'{{nam}}',to_char(due_on,'YYYY')),'{{ngay}}',to_char(due_on,'DD/MM/YYYY'));
     insert into tasks(type,client_id,user_id,contact_person,content,notes,is_urgent,status,task_category,action_type,
      intake_date,recurring_template_id,recurring_for)
     values('normal',r.client_id,r.staff_id::text,contact,rendered,r.notes,false,'received','main',r.action_type,due_on,r.id,due_on)
     returning id into task_uuid;
     update recurring_task_occurrences set task_id=task_uuid where template_id=r.id and scheduled_for=due_on;
     per_rule:=per_rule+1;
    end if;
    update recurring_task_templates set last_generated_on=due_on where id=r.id;
    due_on:=recurring_next_date(r.frequency,r.month_day,r.week_day,due_on+1);
   end loop;
   update recurring_task_templates set next_run_on=due_on,last_error=null,updated_at=now() where id=r.id;
   made:=made+per_rule;
  exception when others then
   update recurring_task_templates set last_error='Chưa tạo được việc: '||sqlerrm,updated_at=now() where id=r.id;
   failures:=failures+1;
  end;
 end loop;
 return jsonb_build_object('created_count',made,'failed_count',failures);
end $$;

create or replace function public.sync_my_recurring_tasks(p_staff_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên.'; end if;
 return generate_recurring_tasks((now() at time zone 'Asia/Ho_Chi_Minh')::date,p_staff_id);
end $$;

create or replace function public.recurring_tasks_portal(p_staff_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare scheduler_ready boolean:=false;
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên.'; end if;
 if to_regclass('cron.job') is not null then
  execute 'select exists(select 1 from cron.job where jobname=''anan-recurring-tasks'' and active)' into scheduler_ready;
 end if;
 return jsonb_build_object(
  'scheduler_ready',scheduler_ready,'today',(now() at time zone 'Asia/Ho_Chi_Minh')::date,
  'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'tax_code',c.tax_code) order by c.name)
   from clients c where recurring_client_access(p_staff_id,c.id)),'[]'::jsonb),
  'templates',coalesce((select jsonb_agg(to_jsonb(rt)||jsonb_build_object('client_name',c.name,'client_archived',c.archived_at is not null,
   'generated_count',(select count(*) from recurring_task_occurrences o where o.template_id=rt.id)) order by rt.created_at desc)
   from recurring_task_templates rt join clients c on c.id=rt.client_id where rt.staff_id=p_staff_id),'[]'::jsonb)
 );
end $$;

create or replace function public.save_recurring_tasks(p_staff_id uuid,p_template jsonb,p_client_ids uuid[])
returns jsonb language plpgsql security definer set search_path=public as $$
declare today date:=(now() at time zone 'Asia/Ho_Chi_Minh')::date;
 tid uuid:=nullif(p_template->>'id','')::uuid; req uuid:=(p_template->>'request_id')::uuid;
 freq text:=p_template->>'frequency'; md integer:=nullif(p_template->>'month_day','')::integer;
 wd integer:=nullif(p_template->>'week_day','')::integer; start_day date:=(p_template->>'start_on')::date;
 end_day date:=nullif(p_template->>'end_on','')::date; next_day date; cid uuid; old_rule recurring_task_templates%rowtype;
 results jsonb:='[]'::jsonb; saved_id uuid;
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên.'; end if;
 if jsonb_typeof(p_template) is distinct from 'object' or req is null then raise exception 'Thiếu thông tin lịch.'; end if;
 if coalesce(length(trim(p_template->>'content')),0) not between 1 and 2000 or coalesce(length(p_template->>'notes'),0)>5000 then raise exception 'Nội dung cần có từ 1 đến 2.000 ký tự, ghi chú tối đa 5.000 ký tự.'; end if;
 if coalesce(p_template->>'action_type','') not in ('ke_toan','bhxh','nop_ho_so','ra_soat','dau_tu','khac') then raise exception 'Nghiệp vụ không hợp lệ.'; end if;
 if start_day is null or (end_day is not null and end_day<start_day) then raise exception 'Ngày bắt đầu / kết thúc không hợp lệ.'; end if;
 next_day:=recurring_next_date(freq,md,wd,greatest(today,start_day));
 if tid is not null then
  select * into old_rule from recurring_task_templates where id=tid and staff_id=p_staff_id for update;
  if not found then raise exception 'Không tìm thấy lịch của nhân viên này.'; end if;
  if start_day<today and start_day<>old_rule.start_on then raise exception 'Ngày bắt đầu mới không được ở quá khứ.'; end if;
  if not recurring_client_access(p_staff_id,old_rule.client_id) then raise exception 'Khách hàng đã lưu trữ hoặc không còn trong phạm vi phụ trách.'; end if;
  if (freq,md,wd,start_day) is not distinct from (old_rule.frequency,old_rule.month_day,old_rule.week_day,old_rule.start_on) then next_day:=old_rule.next_run_on; end if;
  update recurring_task_templates set content=trim(p_template->>'content'),notes=coalesce(p_template->>'notes',''),
   action_type=p_template->>'action_type',frequency=freq,month_day=md,week_day=wd,start_on=start_day,end_on=end_day,
   next_run_on=next_day,last_error=null,updated_at=now() where id=tid;
  results:=jsonb_build_array(tid);
 else
  if start_day<today then raise exception 'Ngày bắt đầu không được ở quá khứ.'; end if;
  if end_day is not null and next_day>end_day then raise exception 'Không có ngày tạo việc trong khoảng thời gian đã chọn.'; end if;
  if coalesce(array_length(p_client_ids,1),0) not between 1 and 200 then raise exception 'Chọn từ 1 đến 200 khách hàng.'; end if;
  for cid in select distinct unnest(p_client_ids) loop
   if not recurring_client_access(p_staff_id,cid) then raise exception 'Có khách hàng không thuộc phạm vi phụ trách hoặc đã lưu trữ.'; end if;
   insert into recurring_task_templates(staff_id,client_id,request_id,content,notes,action_type,frequency,month_day,week_day,start_on,end_on,next_run_on)
    values(p_staff_id,cid,req,trim(p_template->>'content'),coalesce(p_template->>'notes',''),p_template->>'action_type',freq,md,wd,start_day,end_day,next_day)
    on conflict(staff_id,request_id,client_id) do nothing returning id into saved_id;
   if saved_id is null then select id into saved_id from recurring_task_templates where staff_id=p_staff_id and request_id=req and client_id=cid; end if;
   results:=results||jsonb_build_array(saved_id);
  end loop;
 end if;
 return jsonb_build_object('ids',results,'generation',sync_my_recurring_tasks(p_staff_id));
end $$;

create or replace function public.set_recurring_task_active(p_staff_id uuid,p_template_id uuid,p_active boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r recurring_task_templates%rowtype; today date:=(now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
 if p_active is null or not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên.'; end if;
 select * into r from recurring_task_templates where id=p_template_id and staff_id=p_staff_id for update;
 if not found then raise exception 'Không tìm thấy lịch của nhân viên này.'; end if;
 if p_active and not recurring_client_access(p_staff_id,r.client_id) then raise exception 'Khách hàng đã lưu trữ hoặc không còn trong phạm vi phụ trách.'; end if;
 if p_active and r.end_on<today then raise exception 'Lịch đã kết thúc. Hãy sửa ngày kết thúc trước khi bật lại.'; end if;
 update recurring_task_templates set is_active=p_active,updated_at=now(),last_error=null,
  next_run_on=case when p_active and not r.is_active then recurring_next_date(r.frequency,r.month_day,r.week_day,greatest(today,r.start_on)) else r.next_run_on end
  where id=r.id;
 return sync_my_recurring_tasks(p_staff_id);
end $$;

revoke all on function public.recurring_next_date(text,integer,integer,date),public.recurring_client_access(uuid,uuid),
 public.generate_recurring_tasks(date,uuid),public.sync_my_recurring_tasks(uuid),public.recurring_tasks_portal(uuid),
 public.save_recurring_tasks(uuid,jsonb,uuid[]),public.set_recurring_task_active(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.sync_my_recurring_tasks(uuid),public.recurring_tasks_portal(uuid),public.save_recurring_tasks(uuid,jsonb,uuid[]),
 public.set_recurring_task_active(uuid,uuid,boolean) to anon,authenticated;

-- CRON INSTALL: server-side worker. Existing jobs are preserved; rerunning updates only this named job.
create extension if not exists pg_cron;
select cron.schedule('anan-recurring-tasks','*/5 * * * *',
 $$select public.generate_recurring_tasks((now() at time zone 'Asia/Ho_Chi_Minh')::date);$$);
notify pgrst,'reload schema';
commit;

-- Expected: one active row after installation.
select jobname,schedule,active from cron.job where jobname='anan-recurring-tasks';
