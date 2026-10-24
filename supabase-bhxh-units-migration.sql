-- Run the ENTIRE file after supabase-bhxh-agencies-migration.sql. Safe to rerun.
-- Existing codes and financial entries remain in one unclassified legacy unit per client.
-- No amount, period, proof, transfer snapshot or old audit event is rewritten.
begin;
create table if not exists public.bhxh_client_units (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id),
 kind text check(kind in ('employees','legal_representative','foreign_workers')),
 code text not null default '', is_active boolean not null default true, version integer not null default 1,
 notes text not null default '', created_by uuid references public.app_users(id), updated_by uuid references public.app_users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,client_id)
);
create unique index if not exists bhxh_unit_active_kind on public.bhxh_client_units(client_id,kind) where is_active and kind is not null;
create unique index if not exists bhxh_unit_active_legacy on public.bhxh_client_units(client_id) where is_active and kind is null;
create unique index if not exists bhxh_unit_active_code on public.bhxh_client_units(client_id,upper(trim(code))) where is_active and trim(code)<>'';
create table if not exists public.bhxh_unit_events (
 request_id uuid primary key, unit_id uuid not null references public.bhxh_client_units(id), client_id uuid not null references public.clients(id),
 actor_id uuid not null references public.app_users(id), actor_name text not null, payload jsonb not null, snapshot jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.bhxh_client_units enable row level security;
alter table public.bhxh_unit_events enable row level security;
revoke all on public.bhxh_client_units,public.bhxh_unit_events from public,anon,authenticated;

create or replace function public.bhxh_limit_units()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('bhxh:'||new.client_id::text,0));
 if new.is_active and (select count(*) from bhxh_client_units where client_id=new.client_id and is_active and id<>new.id)>=3 then
  raise exception 'Mỗi khách có tối đa 3 mã đang sử dụng. Mã cũ chờ phân loại cũng tính là một mã.';
 end if;
 return new;
end $$;
drop trigger if exists bhxh_limit_client_units on public.bhxh_client_units;
create trigger bhxh_limit_client_units before insert or update on public.bhxh_client_units for each row execute function public.bhxh_limit_units();

-- Preserve uncertainty: never guess whether a previous code is for employees, a
-- legal representative, or foreign workers. Empty legacy codes retain old balances.
insert into public.bhxh_client_units(client_id,kind,code,notes)
select c.id,null,coalesce(nullif(trim(to_jsonb(c)->>'ins_code'),''),''),'Mã cũ trước khi tách nhóm; giữ nguyên dữ liệu để đối chiếu.'
from public.clients c where not exists(select 1 from public.bhxh_client_units u where u.client_id=c.id)
and (nullif(trim(to_jsonb(c)->>'ins_code'),'') is not null
 or exists(select 1 from public.bhxh_periods p where p.client_id=c.id)
 or exists(select 1 from public.bhxh_payments p where p.client_id=c.id)
 or exists(select 1 from public.payment_followups r where r.client_id=c.id and r.kind='bhxh')
 or exists(select 1 from public.bhxh_client_receivers r where r.client_id=c.id));

alter table public.bhxh_periods add column if not exists unit_id uuid;
alter table public.bhxh_periods add column if not exists unit_code text not null default '';
alter table public.bhxh_payments add column if not exists unit_id uuid;
alter table public.bhxh_payments add column if not exists unit_code text not null default '';
alter table public.payment_followups add column if not exists unit_id uuid;
alter table public.payment_followups add column if not exists unit_code text not null default '';
alter table public.bhxh_client_receivers add column if not exists unit_id uuid;
update public.bhxh_periods p set unit_id=u.id,unit_code=u.code from public.bhxh_client_units u where p.unit_id is null and u.client_id=p.client_id and u.kind is null;
update public.bhxh_payments p set unit_id=u.id,unit_code=u.code from public.bhxh_client_units u where p.unit_id is null and u.client_id=p.client_id and u.kind is null;
update public.payment_followups r set unit_id=u.id,unit_code=u.code from public.bhxh_client_units u where r.kind='bhxh' and r.unit_id is null and u.client_id=r.client_id and u.kind is null;
update public.bhxh_client_receivers r set unit_id=u.id from public.bhxh_client_units u where r.unit_id is null and u.client_id=r.client_id and u.kind is null;
alter table public.bhxh_periods alter column unit_id set not null;
alter table public.bhxh_payments alter column unit_id set not null;
alter table public.bhxh_client_receivers alter column unit_id set not null;
alter table public.bhxh_periods drop constraint if exists bhxh_periods_client_id_period_on_key;
create unique index if not exists bhxh_periods_unit_month on public.bhxh_periods(unit_id,period_on);
create index if not exists bhxh_payments_unit_month on public.bhxh_payments(unit_id,paid_on) where not is_void;
drop index if exists public.bhxh_payments_reference;
create unique index bhxh_payments_reference on public.bhxh_payments(unit_id,lower(trim(reference))) where not is_void and trim(reference)<>'';
drop index if exists public.payment_followups_client_period;
create unique index if not exists payment_followups_tax_period on public.payment_followups(client_id,kind,lower(regexp_replace(trim(period),'\s+',' ','g'))) where kind<>'bhxh';
create unique index if not exists payment_followups_bhxh_unit_period on public.payment_followups(unit_id,lower(regexp_replace(trim(period),'\s+',' ','g'))) where kind='bhxh';
alter table public.bhxh_client_receivers drop constraint if exists bhxh_client_receivers_pkey;
alter table public.bhxh_client_receivers add primary key(unit_id);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='bhxh_periods_unit_client_fk') then
  alter table public.bhxh_periods add constraint bhxh_periods_unit_client_fk foreign key(unit_id,client_id) references public.bhxh_client_units(id,client_id);
  alter table public.bhxh_payments add constraint bhxh_payments_unit_client_fk foreign key(unit_id,client_id) references public.bhxh_client_units(id,client_id);
  alter table public.payment_followups add constraint bhxh_followups_unit_client_fk foreign key(unit_id,client_id) references public.bhxh_client_units(id,client_id);
  alter table public.bhxh_client_receivers add constraint bhxh_receivers_unit_client_fk foreign key(unit_id,client_id) references public.bhxh_client_units(id,client_id);
  alter table public.payment_followups add constraint bhxh_followups_unit_required check((kind='bhxh' and unit_id is not null) or (kind<>'bhxh' and unit_id is null));
 end if;
end $$;

create or replace function public.bhxh_resolve_unit(p_client_id uuid,p_requested uuid,p_existing uuid default null,p_new boolean default true)
returns uuid language plpgsql stable security definer set search_path=public as $$
declare uid uuid; u bhxh_client_units%rowtype;
begin
 if p_existing is not null and p_requested is not null and p_existing<>p_requested then raise exception 'Không đổi mã đơn vị của bản ghi đã lưu. Hãy đối chiếu bản ghi gốc trước khi điều chỉnh.'; end if;
 uid:=coalesce(p_existing,p_requested);
 if uid is null then
  if (select count(*) from bhxh_client_units where client_id=p_client_id and is_active)=1 then
   select id into uid from bhxh_client_units where client_id=p_client_id and is_active;
  else raise exception 'Chọn đúng mã đơn vị BHXH của khách hàng.'; end if;
 end if;
 select * into u from bhxh_client_units where id=uid and client_id=p_client_id;
 if not found then raise exception 'Mã đơn vị không thuộc khách đã chọn.'; end if;
 if p_new and (not u.is_active or trim(u.code)='') then raise exception 'Chọn mã đang sử dụng và đã có mã số; cập nhật tại Mã đơn vị BHXH.'; end if;
 return uid;
end $$;
create or replace function public.bhxh_units_json(p_client_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(u)||jsonb_build_object('has_activity',
  exists(select 1 from bhxh_periods p where p.unit_id=u.id) or exists(select 1 from bhxh_payments p where p.unit_id=u.id)
  or exists(select 1 from payment_followups r where r.unit_id=u.id)) order by u.is_active desc,case u.kind when 'employees' then 0 when 'legal_representative' then 1 when 'foreign_workers' then 2 else -1 end,u.code),'[]'::jsonb)
 from bhxh_client_units u where u.client_id=p_client_id
$$;
create or replace function public.bhxh_units_portal(p_staff_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 return jsonb_build_object('clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'tax_code',c.tax_code,
  'archived',c.archived_at is not null,'participating',coalesce('BHXH'=any(c.services),false),'can_edit_units',c.insurance_person=(select name from app_users where id=p_staff_id),'units',bhxh_units_json(c.id)) order by c.name)
  from clients c where bhxh_client_access(p_staff_id,c.id)),'[]'::jsonb));
end $$;
create or replace function public.save_bhxh_unit(p_staff_id uuid,p_request_id uuid,p_record jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor text; u bhxh_client_units%rowtype; previous bhxh_client_units%rowtype; e bhxh_unit_events%rowtype;
 cid uuid:=(p_record->>'client_id')::uuid; rid uuid:=(p_record->>'id')::uuid; activity boolean;
begin
 select name into actor from app_users where id=p_staff_id and is_active;
 if actor is null then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 if rid is null or cid is null or p_request_id is null then raise exception 'Yêu cầu không hợp lệ.'; end if;
 if not exists(select 1 from clients where id=cid and insurance_person=actor) then raise exception 'Chỉ nhân viên phụ trách BHXH của khách được cập nhật mã đơn vị.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('bhxh-unit-request:'||p_request_id::text,0));
 select * into e from bhxh_unit_events where request_id=p_request_id;
 if found then
  if e.actor_id<>p_staff_id or e.unit_id<>rid or e.payload<>p_record then raise exception 'Mã yêu cầu đã dùng cho cập nhật khác.'; end if;
  return e.snapshot;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('bhxh:'||cid::text,0));
 select * into previous from bhxh_client_units where id=rid for update;
 if previous.id is not null and previous.client_id<>cid then raise exception 'Không thể đổi khách của mã đơn vị.'; end if;
 if (p_record->>'version')::integer is distinct from coalesce(previous.version,0) then raise exception 'Mã đơn vị vừa được cập nhật. Hãy làm mới.'; end if;
 u:=previous; u.id:=rid; u.client_id:=cid; u.kind:=nullif(p_record->>'kind','');
 u.code:=upper(trim(coalesce(p_record->>'code',''))); u.notes:=trim(coalesce(p_record->>'notes','')); u.is_active:=coalesce((p_record->>'is_active')::boolean,true);
 if u.kind is not null and u.kind not in ('employees','legal_representative','foreign_workers') then raise exception 'Chọn đúng nhóm mã BHXH.'; end if;
 if previous.id is null and u.kind is null then raise exception 'Mã mới phải có nhóm: người lao động, đại diện pháp luật hoặc người nước ngoài.'; end if;
 if (u.code<>'' and u.code !~ '^[A-Z0-9]{2,30}$') or (u.code='' and (previous.id is null or previous.code<>'')) or length(u.notes)>5000 then raise exception 'Mã đơn vị gồm 2–30 chữ / số, không có khoảng trắng; giữ số 0 đầu.'; end if;
 activity:=exists(select 1 from bhxh_periods where unit_id=rid) or exists(select 1 from bhxh_payments where unit_id=rid) or exists(select 1 from payment_followups where unit_id=rid);
 if activity and previous.code<>'' and upper(trim(previous.code))<>u.code then raise exception 'Mã đã có dữ liệu, không thay số mã làm đổi công nợ lịch sử. Ngừng mã cũ và thêm mã mới nếu được cấp mã khác.'; end if;
 if previous.id is not null and previous.kind is not null and u.kind is distinct from previous.kind and activity then raise exception 'Mã đã phân loại và có dữ liệu. Kiểm tra hồ sơ trước khi đổi nhóm; mã cũ chờ phân loại vẫn được chọn nhóm một lần.'; end if;
 if previous.id is not null and u.is_active<>previous.is_active and u.notes='' then raise exception 'Ghi lý do ngừng / khôi phục mã.'; end if;
 if previous.id is null and not exists(select 1 from clients where id=cid and 'BHXH'=any(services)) then raise exception 'Khách chưa sử dụng dịch vụ BHXH.'; end if;
 if previous.id is null and exists(select 1 from clients where id=cid and archived_at is not null) then raise exception 'Khách đã lưu trữ, không thêm mã mới.'; end if;
 u.version:=coalesce(previous.version,0)+1; u.updated_by:=p_staff_id; u.updated_at:=now();
 if previous.id is null then u.created_by:=p_staff_id; u.created_at:=now(); insert into bhxh_client_units select u.*;
 else update bhxh_client_units set kind=u.kind,code=u.code,is_active=u.is_active,notes=u.notes,version=u.version,updated_by=p_staff_id,updated_at=now() where id=rid; end if;
 insert into bhxh_unit_events(request_id,unit_id,client_id,actor_id,actor_name,payload,snapshot) values(p_request_id,rid,cid,p_staff_id,actor,p_record,to_jsonb(u));
 return to_jsonb(u);
exception when unique_violation then raise exception 'Nhóm mã hoặc số mã đã có ở khách này. Hãy kiểm tra mã cũ chờ phân loại.';
end $$;
create or replace function public.bhxh_protect_legacy_code()
returns trigger language plpgsql set search_path=public as $$
begin
 if new.ins_code is distinct from old.ins_code then raise exception 'Cập nhật mã tại Theo dõi BHXH → Mã đơn vị, để giữ riêng công nợ từng mã.'; end if;
 return new;
end $$;
drop trigger if exists bhxh_protect_client_ins_code on public.clients;
-- Create the compatibility guard only when the old optional column exists.
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='clients' and column_name='ins_code') then
  create trigger bhxh_protect_client_ins_code before update of ins_code on public.clients for each row execute function public.bhxh_protect_legacy_code();
 end if;
end $$;
create or replace function public.bhxh_unit_balances(p_unit_id uuid)
returns table(id uuid,client_id uuid,period_on date,opening_override numeric,opening_reason text,charges numeric,
 notes text,source_filename text,version integer,updated_at timestamptz,paid_total numeric,payment_count bigint,
 opening_balance numeric,opening_source text,closing_balance numeric,unit_id uuid,unit_code text)
language sql stable security definer set search_path=public as $$
 with recursive ordered as (
  select r.*,coalesce(p.total,0)::numeric as paid_total,coalesce(p.cnt,0)::bigint as payment_count,
   row_number() over(order by r.period_on) as seq
  from bhxh_periods r left join lateral (select sum(amount) total,count(*) cnt from bhxh_payments p
   where p.unit_id=r.unit_id and not p.is_void and p.paid_on>=r.period_on and p.paid_on<r.period_on+interval '1 month') p on true
  where r.unit_id=p_unit_id
 ), balances as (
  select r.*,r.opening_override::numeric as opening_balance,
   case when r.opening_override is null then 'missing' else 'manual' end as opening_source,
   (r.opening_override+r.charges-r.paid_total)::numeric as closing_balance from ordered r where seq=1
  union all
  select r.*,x.opening_balance,
   case when r.opening_override is not null then 'manual' when x.opening_balance is null then 'missing' else 'previous' end,
   (x.opening_balance+r.charges-r.paid_total)::numeric
  from balances b join ordered r on r.seq=b.seq+1 cross join lateral (
   select case when r.opening_override is not null then r.opening_override
    when r.period_on=(b.period_on+interval '1 month')::date then b.closing_balance else null::numeric end opening_balance
  ) x
 ) select id,client_id,period_on,opening_override,opening_reason,charges,notes,source_filename,version,updated_at,
  paid_total,payment_count,opening_balance,opening_source,closing_balance,unit_id,unit_code from balances
$$;

create or replace function public.bhxh_balances(p_client_id uuid)
returns table(id uuid,client_id uuid,period_on date,opening_override numeric,opening_reason text,charges numeric,
 notes text,source_filename text,version integer,updated_at timestamptz,paid_total numeric,payment_count bigint,
 opening_balance numeric,opening_source text,closing_balance numeric)
language sql stable security definer set search_path=public as $$
 select b.id,b.client_id,b.period_on,b.opening_override,b.opening_reason,b.charges,b.notes,b.source_filename,b.version,b.updated_at,b.paid_total,b.payment_count,b.opening_balance,b.opening_source,b.closing_balance from bhxh_client_units u cross join lateral bhxh_unit_balances(u.id) b where u.client_id=p_client_id
$$;

create or replace function public.bhxh_ledger_portal(p_staff_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 return jsonb_build_object('today',(now() at time zone 'Asia/Ho_Chi_Minh')::date,
  'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'tax_code',c.tax_code,'ins_code',to_jsonb(c)->>'ins_code',
   'units',bhxh_units_json(c.id),'archived',c.archived_at is not null,'participating',c.archived_at is null and coalesce('BHXH'=any(c.services),false)) order by c.name) from clients c where bhxh_client_access(p_staff_id,c.id)),'[]'::jsonb),
  'periods',coalesce((select jsonb_agg(to_jsonb(b)||jsonb_build_object('client_name',c.name,'tax_code',c.tax_code,'unit_kind',u.kind,'unit_code',coalesce(nullif(b.unit_code,''),u.code)) order by b.period_on desc,c.name)
   from clients c join bhxh_client_units u on u.client_id=c.id cross join lateral bhxh_unit_balances(u.id) b where bhxh_client_access(p_staff_id,c.id)),'[]'::jsonb),
  'payments',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('client_name',c.name,'unit_kind',u.kind,'unit_code',coalesce(nullif(p.unit_code,''),u.code),'reporter_name',(select u.name from app_users u where u.id=p.created_by)) order by p.paid_on desc,p.created_at desc)
   from bhxh_payments p join bhxh_client_units u on u.id=p.unit_id join clients c on c.id=p.client_id where bhxh_client_access(p_staff_id,c.id)),'[]'::jsonb));
end $$;

create or replace function public.save_bhxh_ledger(p_staff_id uuid,p_request_id uuid,p_entity text,p_action text,p_record jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare rid uuid:=(p_record->>'id')::uuid; cid uuid:=(p_record->>'client_id')::uuid;
 uid uuid; actor text; pr bhxh_periods%rowtype; pay bhxh_payments%rowtype; evt bhxh_ledger_events%rowtype;
 previous_version integer; snap jsonb; note_text text:=trim(coalesce(p_record->>'event_note',''));
 today date:=(now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
 select name into actor from app_users where id=p_staff_id and is_active;
 if actor is null then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 if p_request_id is null or rid is null or cid is null or p_entity is null or p_entity not in ('period','payment')
  or p_action is null or p_action not in ('save','void','restore') or (p_entity='period' and p_action<>'save')
  then raise exception 'Yêu cầu không hợp lệ.'; end if;
 if not bhxh_client_access(p_staff_id,cid) then raise exception 'Khách hàng ngoài phạm vi phụ trách.'; end if;
 if length(note_text)>5000 then raise exception 'Ghi chú tối đa 5000 ký tự.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into evt from bhxh_ledger_events where request_id=p_request_id;
 if found then
  if evt.actor_id<>p_staff_id or evt.entity_type<>p_entity or evt.entity_id<>rid or evt.action<>p_action or evt.payload<>p_record then
   raise exception 'Mã yêu cầu đã dùng cho cập nhật khác.';
  end if;
  return evt.snapshot;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('bhxh:'||cid::text,0));
 if p_entity='period' then
  if p_record ?| array['paid_total','closing_balance','opening_balance'] then raise exception 'Tiền đã nộp và số dư tự động được tính từ sổ, không nhập tại C12.'; end if;
  select * into pr from bhxh_periods where id=rid for update;
  previous_version:=coalesce(pr.version,0);
  uid:=bhxh_resolve_unit(cid,nullif(p_record->>'unit_id','')::uuid,pr.unit_id,pr.id is null);
  pr.unit_id:=uid; pr.unit_code:=coalesce(nullif(pr.unit_code,''),(select code from bhxh_client_units where id=uid));
  if pr.id is not null and pr.client_id<>cid then raise exception 'Không thể đổi khách hàng.'; end if;
  if pr.id is not null and pr.period_on is distinct from (p_record->>'period_on')::date then raise exception 'Không thể đổi kỳ của bản ghi đã tạo.'; end if;
  pr.id:=rid; pr.client_id:=cid; pr.period_on:=(p_record->>'period_on')::date;
  pr.opening_override:=bhxh_money(p_record->>'opening_override',false);
  pr.opening_reason:=trim(coalesce(p_record->>'opening_reason',''));
  pr.charges:=bhxh_money(p_record->>'charges'); pr.notes:=trim(coalesce(p_record->>'notes',''));
  pr.source_filename:=trim(coalesce(p_record->>'source_filename',''));
  if pr.period_on is null or extract(day from pr.period_on)<>1 or pr.period_on not between date '1900-01-01' and date '2200-12-01'
   or (pr.opening_override is not null and pr.opening_reason='') or length(pr.opening_reason)>1000 or length(pr.notes)>5000 or length(pr.source_filename)>500 then
   raise exception 'Kiểm tra kỳ, lý do sửa đầu kỳ và ghi chú.'; end if;
  if pr.opening_override is null then pr.opening_reason:=''; end if;
 else
  select * into pay from bhxh_payments where id=rid for update;
  previous_version:=coalesce(pay.version,0);
  uid:=bhxh_resolve_unit(cid,nullif(p_record->>'unit_id','')::uuid,pay.unit_id,pay.id is null);
  pay.unit_id:=uid; pay.unit_code:=coalesce(nullif(pay.unit_code,''),(select code from bhxh_client_units where id=uid));
  if pay.id is not null and pay.client_id<>cid then raise exception 'Không thể đổi khách hàng.'; end if;
  if pay.id is null and p_action<>'save' then raise exception 'Không tìm thấy lần nộp.'; end if;
  pay.id:=rid; pay.client_id:=cid;
  if p_action='save' then
   if pay.is_void then raise exception 'Khôi phục lần nộp trước khi sửa.'; end if;
   pay.paid_on:=(p_record->>'paid_on')::date; pay.amount:=bhxh_money(p_record->>'amount');
   pay.reference:=trim(coalesce(p_record->>'reference','')); pay.notes:=trim(coalesce(p_record->>'notes',''));
   pay.is_void:=false; pay.void_reason:='';
   pay.proof_file:=coalesce(nullif(p_record->>'proof_file',''),pay.proof_file,'');
   perform bhxh_validate_proof(pay.proof_file);
   if pay.paid_on is null or pay.paid_on>today or pay.paid_on<date '1900-01-01' or pay.amount<=0 or length(pay.reference)>500 or length(pay.notes)>5000 then
    raise exception 'Kiểm tra ngày thực nộp (không ở tương lai), số tiền dương và thông tin chứng từ.'; end if;
  else
   if note_text='' then raise exception 'Nhập lý do hủy / khôi phục lần nộp.'; end if;
   if (p_action='void')=pay.is_void then raise exception 'Trạng thái lần nộp đã thay đổi. Hãy làm mới.'; end if;
   if p_action='restore' then
    pay.proof_file:=coalesce(nullif(p_record->>'proof_file',''),pay.proof_file,'');
    perform bhxh_validate_proof(pay.proof_file);
   end if;
   pay.is_void:=(p_action='void'); pay.void_reason:=case when pay.is_void then note_text else '' end;
  end if;
 end if;
 if (p_record->>'version')::integer is distinct from previous_version then raise exception 'Dữ liệu vừa được người khác cập nhật. Hãy làm mới rồi thử lại.'; end if;
 if previous_version=0 and not exists(select 1 from clients where id=cid and 'BHXH'=any(services)) then raise exception 'Khách hàng chưa sử dụng dịch vụ BHXH.'; end if;
 if previous_version=0 and exists(select 1 from clients where id=cid and archived_at is not null) then raise exception 'Khách hàng đã lưu trữ, không thêm bản ghi mới.'; end if;
 begin
  if p_entity='period' then
   pr.version:=previous_version+1; pr.updated_by:=p_staff_id; pr.updated_at:=now();
   if previous_version=0 then
    pr.created_by:=p_staff_id; pr.created_at:=now(); insert into bhxh_periods select pr.*;
   else
    update bhxh_periods set unit_code=pr.unit_code,opening_override=pr.opening_override,opening_reason=pr.opening_reason,charges=pr.charges,
     notes=pr.notes,source_filename=pr.source_filename,version=pr.version,updated_by=pr.updated_by,updated_at=pr.updated_at where id=rid;
   end if;
   snap:=to_jsonb(pr);
  else
   pay.version:=previous_version+1; pay.updated_by:=p_staff_id; pay.updated_at:=now();
   if previous_version=0 then
    pay.created_by:=p_staff_id; pay.created_at:=now(); insert into bhxh_payments select pay.*;
   else
    update bhxh_payments set unit_code=pay.unit_code,paid_on=pay.paid_on,amount=pay.amount,reference=pay.reference,notes=pay.notes,is_void=pay.is_void,
     void_reason=pay.void_reason,proof_file=pay.proof_file,version=pay.version,updated_by=pay.updated_by,updated_at=pay.updated_at where id=rid;
   end if;
   snap:=to_jsonb(pay);
  end if;
 exception when unique_violation then raise exception 'Đã có kỳ C12 hoặc mã chứng từ này cho mã đơn vị. Kiểm tra bản ghi cũ trước khi thêm.'; end;
 insert into bhxh_ledger_events(request_id,entity_type,entity_id,client_id,action,actor_id,actor_name,note,snapshot,payload)
 values(p_request_id,p_entity,rid,cid,p_action,p_staff_id,actor,note_text,snap,p_record);
 return snap;
end $$;

create or replace function public.bhxh_followup_portal(p_staff_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; totals jsonb;
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 select jsonb_build_object('unpaid',count(*),'overdue',count(*) filter(where due_on<today),
  'attention',count(*) filter(where due_on<=today+3 or next_reminder_on<=today or promised_on<today)) into totals
 from payment_followups r where r.kind='bhxh' and bhxh_client_access(p_staff_id,r.client_id) and status not in ('paid','cancelled');
 return jsonb_build_object('today',today,
  'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'tax_code',c.tax_code,
   'units',bhxh_units_json(c.id),'ins_code',to_jsonb(c)->>'ins_code','contact_name',c.contact_name,'contact_phone',c.contact_phone,
   'archived',c.archived_at is not null or not coalesce('BHXH'=any(c.services),false)) order by c.name)
   from clients c where bhxh_client_access(p_staff_id,c.id)),'[]'::jsonb),
  'records',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('client_name',c.name,'tax_code',c.tax_code,
   'unit_kind',u.kind,'unit_code',coalesce(nullif(r.unit_code,''),u.code),'client_archived',c.archived_at is not null) order by r.due_on,r.created_at)
   from payment_followups r join clients c on c.id=r.client_id join bhxh_client_units u on u.id=r.unit_id
   where r.kind='bhxh' and bhxh_client_access(p_staff_id,r.client_id)),'[]'::jsonb),
  'summary',totals);
end $$;

create or replace function public.save_payment_followup(p_staff_id uuid,p_request_id uuid,p_action text,p_record jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r payment_followups%rowtype; old_row payment_followups%rowtype; actor text;
 rid uuid := (p_record->>'id')::uuid; cid uuid; event_row payment_followup_events%rowtype;
 today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
 note_text text := trim(coalesce(p_record->>'event_note','')); amount_input numeric;
begin
 select name into actor from app_users where id=p_staff_id and is_active;
 if actor is null then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 if p_request_id is null or rid is null or p_action is null or p_action not in ('save','notify','promise','paid','reopen','cancel') then raise exception 'Yêu cầu không hợp lệ.'; end if;
 if length(note_text)>5000 then raise exception 'Ghi chú tối đa 5000 ký tự.'; end if;
 -- Serialize retries of the same request, before checking the event table.
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into event_row from payment_followup_events where id=p_request_id;
 if found then
  if event_row.actor_id<>p_staff_id or event_row.followup_id<>rid or event_row.action<>p_action
   or not payment_followup_record_access(p_staff_id,(event_row.snapshot->>'client_id')::uuid,event_row.snapshot->>'kind')
   then raise exception 'Yêu cầu không hợp lệ hoặc ngoài phạm vi phụ trách.'; end if;
  return event_row.snapshot;
 end if;
 select * into r from payment_followups where id=rid for update;
 if found then
  if not payment_followup_record_access(p_staff_id,r.client_id,r.kind) then raise exception 'Khách hàng ngoài phạm vi phụ trách.'; end if;
  if (p_record->>'version')::integer is distinct from r.version then raise exception 'Khoản đóng vừa được người khác cập nhật. Hãy làm mới danh sách rồi thử lại.'; end if;
  old_row:=r;
 else
  if p_action<>'save' or coalesce((p_record->>'version')::integer,0)<>0 then raise exception 'Không tìm thấy khoản đóng.'; end if;
  cid:=(p_record->>'client_id')::uuid;
  if not payment_followup_record_access(p_staff_id,cid,p_record->>'kind') then raise exception 'Khách hàng ngoài phạm vi phụ trách.'; end if;
  if exists(select 1 from clients where id=cid and archived_at is not null) then raise exception 'Khách hàng đã lưu trữ.'; end if;
  if p_record->>'kind'='bhxh' and not exists(select 1 from clients where id=cid and 'BHXH'=any(services)) then raise exception 'Khách hàng chưa sử dụng dịch vụ BHXH.'; end if;
  r.proof_file:=''; r.transfer_details:='{}';
  r.id:=rid; r.client_id:=cid; r.created_by:=p_staff_id; r.created_at:=now();
  r.status:='pending'; r.notification_count:=0; r.version:=0; r.payment_reference:='';
 end if;
 if p_action='save' then
  if r.status in ('paid','cancelled') then raise exception 'Mở lại theo dõi trước khi sửa thông tin.'; end if;
  if nullif(p_record->>'client_id','')::uuid is distinct from r.client_id then raise exception 'Không thể đổi khách hàng của khoản đã tạo.'; end if;
  if old_row.id is not null and (old_row.kind='bhxh') is distinct from (p_record->>'kind'='bhxh') then raise exception 'Không chuyển khoản đã tạo giữa BHXH và thuế.'; end if;
  r.kind:=p_record->>'kind';
  if not payment_followup_record_access(p_staff_id,r.client_id,r.kind) then raise exception 'Khách hàng ngoài phạm vi phụ trách.'; end if; r.period:=regexp_replace(trim(p_record->>'period'),'\s+',' ','g');
  amount_input:=nullif(p_record->>'amount','')::numeric;
  if amount_input is not null and (amount_input::text in ('NaN','Infinity','-Infinity') or amount_input<0 or amount_input<>trunc(amount_input) or amount_input>999999999999999) then
   raise exception 'Số tiền phải là đồng nguyên, không âm và tối đa 15 chữ số.';
  end if;
  r.amount:=amount_input;
  r.due_on:=(p_record->>'due_on')::date;
  r.next_reminder_on:=(p_record->>'next_reminder_on')::date;
  r.notes:=trim(coalesce(p_record->>'notes',''));
  if r.kind is null or r.kind not in ('bhxh','thue_gtgt','thue_tncn','thue_tndn','thue_khac') or r.period is null or length(r.period) not between 1 and 100
   or r.due_on is null or r.next_reminder_on is null or length(r.notes)>5000
   or (r.amount is not null and (r.amount::text in ('NaN','Infinity','-Infinity') or r.amount<0 or r.amount<>trunc(r.amount) or r.amount>9999999999999999))
   then raise exception 'Kiểm tra loại khoản đóng, kỳ, ngày và số tiền (đồng nguyên, không âm).'; end if;
 elsif p_action in ('notify','promise','paid','cancel') then
  if r.status in ('paid','cancelled') then raise exception 'Khoản này đã kết thúc theo dõi. Hãy mở lại trước.'; end if;
  if p_action='notify' then
   if r.kind='bhxh' and p_record ? 'amount' then
    r.amount:=bhxh_money(p_record->>'amount',false);
    if r.amount<0 then raise exception 'Số tiền nhắc khách phải không âm.'; end if;
   end if;
   if r.status<>'promised' then r.status:='notified'; end if;
   r.last_notified_at:=now(); r.notification_count:=r.notification_count+1;
   r.next_reminder_on:=(p_record->>'next_reminder_on')::date;
  elsif p_action='promise' then
   r.status:='promised'; r.promised_on:=(p_record->>'promised_on')::date;
   r.next_reminder_on:=(p_record->>'next_reminder_on')::date;
   if r.promised_on is null or r.promised_on<today then raise exception 'Ngày khách hẹn phải từ hôm nay.'; end if;
  elsif p_action='paid' then
   if r.kind='bhxh' then
    r.proof_file:=coalesce(p_record->>'proof_file','');
    perform bhxh_validate_proof(r.proof_file);
   end if;
   r.status:='paid'; r.paid_on:=(p_record->>'paid_on')::date; r.next_reminder_on:=null;
   r.payment_reference:=trim(coalesce(p_record->>'payment_reference',''));
   if r.paid_on is null or r.paid_on>today or length(r.payment_reference)>500 then raise exception 'Nhập ngày đã đóng không ở tương lai và mã chứng từ tối đa 500 ký tự.'; end if;
  else
   if note_text='' then raise exception 'Nhập lý do ngừng theo dõi.'; end if;
   r.status:='cancelled'; r.next_reminder_on:=null;
  end if;
 elsif p_action='reopen' then
  if r.status not in ('paid','cancelled') then raise exception 'Khoản này vẫn đang được theo dõi.'; end if;
  if note_text='' then raise exception 'Nhập lý do mở lại theo dõi.'; end if;
  r.proof_file:='';
  r.status:='pending'; r.paid_on:=null; r.payment_reference:=''; r.promised_on:=null;
  r.next_reminder_on:=(p_record->>'next_reminder_on')::date;
 end if;
 if r.kind='bhxh' then
  perform pg_advisory_xact_lock(hashtextextended('bhxh:'||r.client_id::text,0));
  r.unit_id:=bhxh_resolve_unit(r.client_id,nullif(p_record->>'unit_id','')::uuid,old_row.unit_id,old_row.id is null);
  r.unit_code:=coalesce(nullif(r.unit_code,''),(select code from bhxh_client_units where id=r.unit_id));
 else r.unit_id:=null; r.unit_code:=''; end if;
 if r.kind='bhxh' and p_action in ('save','notify') and p_record ? 'receiver_agency_id' then
  if nullif(p_record->>'receiver_agency_id','') is null then r.transfer_details:='{}';
  else r.transfer_details:=bhxh_transfer_snapshot((p_record->>'receiver_agency_id')::uuid,(p_record->>'receiver_account_id')::uuid,
   (p_record->>'receiver_version')::integer,r.unit_code,p_record->>'transfer_memo')||jsonb_build_object('unit_id',r.unit_id,'unit_kind',(select kind from bhxh_client_units where id=r.unit_id)); end if;
 elsif r.kind<>'bhxh' then r.transfer_details:='{}'; end if;
 if p_action in ('notify','promise','reopen') and (r.next_reminder_on is null or r.next_reminder_on<today) then raise exception 'Ngày nhắc tiếp theo phải từ hôm nay.'; end if;
 r.version:=r.version+1; r.updated_by:=p_staff_id; r.updated_at:=now();
 if old_row.id is null then
  begin
   insert into payment_followups select r.*;
  exception when unique_violation then raise exception 'Đã có khoản cho khách, loại và kỳ này. Hãy kiểm tra cả mục Đã đóng / Ngừng theo dõi.'; end;
 else
  begin
   update payment_followups set unit_id=r.unit_id,unit_code=r.unit_code,kind=r.kind,period=r.period,amount=r.amount,due_on=r.due_on,next_reminder_on=r.next_reminder_on,
    status=r.status,transfer_details=r.transfer_details,proof_file=r.proof_file,promised_on=r.promised_on,paid_on=r.paid_on,payment_reference=r.payment_reference,
    last_notified_at=r.last_notified_at,notification_count=r.notification_count,notes=r.notes,
    version=r.version,updated_by=r.updated_by,updated_at=r.updated_at where id=r.id;
  exception when unique_violation then raise exception 'Đã có khoản cho khách, loại và kỳ này.'; end;
 end if;
 insert into payment_followup_events(id,followup_id,actor_id,actor_name,action,note,snapshot)
 values(p_request_id,r.id,p_staff_id,actor,p_action,note_text,to_jsonb(r));
 return to_jsonb(r);
end $$;

create or replace function public.save_bhxh_directory(p_staff_id uuid,p_request_id uuid,p_entity text,p_record jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid; actor text; rid uuid; previous_version integer; snap jsonb; a bhxh_agencies%rowtype; r bhxh_client_receivers%rowtype;
 evt bhxh_directory_events%rowtype; item jsonb; cleaned_accounts jsonb:='[]'; cleaned_areas jsonb:='[]';
 aid uuid; bin_value text; number_value text; holder text; kind_value text; name_value text; code_value text; token text[];
begin
 select name into actor from app_users where id=p_staff_id and is_active;
 if actor is null then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 rid:=case when p_entity='receiver' then (p_record->>'client_id')::uuid else (p_record->>'id')::uuid end;
 if p_request_id is null or rid is null or p_entity is null or p_entity not in ('agency','receiver') then raise exception 'Yêu cầu không hợp lệ.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('bhxh-directory-request:'||p_request_id::text,0));
 select * into evt from bhxh_directory_events where request_id=p_request_id;
 if found then
  if evt.actor_id<>p_staff_id or evt.entity<>p_entity or evt.entity_id<>rid or evt.payload<>p_record then raise exception 'Mã yêu cầu đã dùng cho cập nhật khác.'; end if;
  return evt.snapshot;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('bhxh-directory:'||p_entity||rid::text,0));
 if p_entity='agency' then
  select * into a from bhxh_agencies where id=rid for update;
  previous_version:=coalesce(a.version,0);
  if (p_record->>'version')::integer is distinct from previous_version then raise exception 'Cơ sở vừa được người khác cập nhật. Hãy làm mới.'; end if;
  a.id:=rid; a.name:=trim(coalesce(p_record->>'name','')); a.address:=trim(coalesce(p_record->>'address',''));
  a.phone:=trim(coalesce(p_record->>'phone','')); a.province_code:=p_record->>'province_code';
  a.agency_code:=upper(trim(coalesce(p_record->>'agency_code',''))); a.notes:=trim(coalesce(p_record->>'notes',''));
  a.memo_template:=trim(coalesce(p_record->>'memo_template','')); a.is_active:=coalesce((p_record->>'is_active')::boolean,true);
  if length(a.name) not between 2 and 300 or length(a.address) not between 2 and 1000
   or a.phone !~ '^\+?[0-9][0-9 .()-]{5,24}$' or a.agency_code !~ '^[A-Z0-9]{2,20}$'
   or not exists(select 1 from bhxh_provinces where code=a.province_code) or length(a.notes)>5000
   or length(a.memo_template) not between 1 and 500 then raise exception 'Kiểm tra tên, mã cơ sở, địa chỉ, tỉnh, một số điện thoại chính và mẫu chuyển khoản.'; end if;
  for token in select regexp_matches(a.memo_template,'\{\{([^{}]*)\}\}','g') loop
   if trim(token[1]) not in ('ma_don_vi','ma_co_quan','ky','thang','nam') then raise exception 'Biến trong mẫu chuyển khoản không được hỗ trợ.'; end if;
  end loop;
  if regexp_replace(a.memo_template,'\{\{\s*(ma_don_vi|ma_co_quan|ky|thang|nam)\s*\}\}','','g') like '%{{%'
   or regexp_replace(a.memo_template,'\{\{\s*(ma_don_vi|ma_co_quan|ky|thang|nam)\s*\}\}','','g') like '%}}%'
   then raise exception 'Kiểm tra dấu ngoặc và tên biến trong mẫu chuyển khoản.'; end if;
  if jsonb_typeof(p_record->'accounts') is distinct from 'array' or jsonb_array_length(p_record->'accounts')>30
   or jsonb_typeof(p_record->'areas') is distinct from 'array' or jsonb_array_length(p_record->'areas')>1000 then raise exception 'Kiểm tra danh sách tài khoản và địa bàn.'; end if;
  for item in select * from jsonb_array_elements(p_record->'accounts') loop
   aid:=(item->>'id')::uuid; bin_value:=item->>'bank_bin'; number_value:=trim(coalesce(item->>'account_no','')); holder:=trim(coalesce(item->>'account_name',''));
   if aid is null or not exists(select 1 from bhxh_banks where bin=bin_value) or number_value !~ '^[0-9]{6,34}$'
    or holder !~ '^[A-Z0-9 .,()/+&_-]{2,150}$' or length(coalesce(item->>'branch',''))>300 then raise exception 'Chọn ngân hàng, số tài khoản 6–34 chữ số, tên nhận không dấu viết hoa và chi nhánh.'; end if;
   if exists(select 1 from jsonb_array_elements(cleaned_accounts) x where x->>'id'=aid::text or (x->>'bank_bin'=bin_value and x->>'account_no'=number_value)) then raise exception 'Tài khoản bị trùng trong cơ sở.'; end if;
   cleaned_accounts:=cleaned_accounts||jsonb_build_array(jsonb_build_object('id',aid,'bank_bin',bin_value,'account_no',number_value,'account_name',holder,'branch',trim(coalesce(item->>'branch',''))));
  end loop;
  for item in select * from jsonb_array_elements(p_record->'areas') loop
   aid:=(item->>'id')::uuid; kind_value:=item->>'kind'; name_value:=regexp_replace(trim(coalesce(item->>'name','')),'\s+',' ','g'); code_value:=trim(coalesce(item->>'commune_code',''));
   if aid is null or kind_value is null or kind_value not in ('Xã','Phường','Thị trấn','Đặc khu') or length(name_value) not between 1 and 150
    or (code_value<>'' and code_value !~ '^[0-9]{5}$') then raise exception 'Kiểm tra loại và tên địa bàn; mã địa bàn nếu có phải đủ 5 chữ số.'; end if;
   if exists(select 1 from jsonb_array_elements(cleaned_areas) x where x->>'id'=aid::text or (x->>'kind'=kind_value and lower(x->>'name')=lower(name_value))
    or (code_value<>'' and x->>'commune_code'=code_value)) then raise exception 'Địa bàn bị trùng trong cơ sở.'; end if;
   cleaned_areas:=cleaned_areas||jsonb_build_array(jsonb_build_object('id',aid,'kind',kind_value,'name',name_value,'commune_code',code_value));
  end loop;
  a.accounts:=cleaned_accounts; a.areas:=cleaned_areas; a.version:=previous_version+1; a.updated_by:=p_staff_id; a.updated_at:=now();
  if previous_version=0 then a.created_by:=p_staff_id; a.created_at:=now(); insert into bhxh_agencies select a.*;
  else update bhxh_agencies set name=a.name,address=a.address,phone=a.phone,province_code=a.province_code,agency_code=a.agency_code,
   memo_template=a.memo_template,notes=a.notes,accounts=a.accounts,areas=a.areas,is_active=a.is_active,version=a.version,updated_by=p_staff_id,updated_at=now() where id=rid; end if;
  snap:=to_jsonb(a);
 else
  if not bhxh_client_access(p_staff_id,rid) or not exists(select 1 from clients where id=rid and archived_at is null and 'BHXH'=any(services)) then raise exception 'Chọn khách đang sử dụng dịch vụ BHXH.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('bhxh:'||rid::text,0));
  uid:=bhxh_resolve_unit(rid,nullif(p_record->>'unit_id','')::uuid);
  select * into r from bhxh_client_receivers where unit_id=uid for update;
  previous_version:=coalesce(r.version,0);
  if (p_record->>'version')::integer is distinct from previous_version then raise exception 'Cơ sở của khách vừa được cập nhật. Hãy làm mới.'; end if;
  r.unit_id:=uid; r.client_id:=rid; r.agency_id:=nullif(p_record->>'agency_id','')::uuid; r.account_id:=nullif(p_record->>'account_id','')::uuid;
  if (r.agency_id is null)<>(r.account_id is null) then raise exception 'Chọn cả cơ sở và tài khoản.'; end if;
  if r.agency_id is not null then
   perform 1 from bhxh_agencies where id=r.agency_id and is_active and exists(select 1 from jsonb_array_elements(accounts) x where x->>'id'=r.account_id::text) for share;
   if not found then raise exception 'Cơ sở hoặc tài khoản không còn sử dụng. Hãy chọn lại.'; end if;
  end if;
  r.version:=previous_version+1; r.updated_by:=p_staff_id; r.updated_at:=now();
  insert into bhxh_client_receivers select r.* on conflict(unit_id) do update set agency_id=excluded.agency_id,account_id=excluded.account_id,version=excluded.version,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  snap:=to_jsonb(r);
 end if;
 insert into bhxh_directory_events(request_id,entity,entity_id,actor_id,actor_name,payload,snapshot) values(p_request_id,p_entity,rid,p_staff_id,actor,p_record,snap);
 return snap;
exception when unique_violation then raise exception 'Mã cơ sở BHXH này đang được sử dụng. Hãy kiểm tra cơ sở đã có.';
end $$;
revoke all on function public.bhxh_unit_balances(uuid) from public,anon,authenticated;

revoke all on function public.bhxh_limit_units(),public.bhxh_protect_legacy_code(),public.bhxh_resolve_unit(uuid,uuid,uuid,boolean),public.bhxh_units_json(uuid) from public,anon,authenticated;
revoke all on function public.bhxh_units_portal(uuid),public.save_bhxh_unit(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.bhxh_units_portal(uuid),public.save_bhxh_unit(uuid,uuid,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
