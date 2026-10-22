-- Sổ theo dõi khách đóng BHXH / thuế, theo cơ chế hồ sơ thiết bị hiện có.
-- Run the complete file in Supabase SQL Editor as postgres. Safe to rerun.
-- Does not change tasks, service debt, or cash receipts. No cron required.
begin;

create table if not exists public.payment_followups (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.clients(id) on delete restrict,
 kind text not null check (kind in ('bhxh','thue_gtgt','thue_tncn','thue_tndn','thue_khac')),
 period text not null check (length(trim(period)) between 1 and 100),
 amount numeric(16,0) check (amount >= 0),
 due_on date not null,
 next_reminder_on date,
 status text not null default 'pending' check (status in ('pending','notified','promised','paid','cancelled')),
 promised_on date,
 paid_on date,
 payment_reference text not null default '',
 last_notified_at timestamptz,
 notification_count integer not null default 0,
 notes text not null default '',
 created_by uuid not null references public.app_users(id) on delete restrict,
 updated_by uuid not null references public.app_users(id) on delete restrict,
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check ((status = 'paid') = (paid_on is not null)),
 check ((status in ('paid','cancelled')) = (next_reminder_on is null)),
 check (status <> 'promised' or promised_on is not null)
);
create unique index if not exists payment_followups_client_period
 on public.payment_followups(client_id,kind,lower(regexp_replace(trim(period),'\s+',' ','g')));
create index if not exists payment_followups_open_dates on public.payment_followups(next_reminder_on,due_on)
 where status not in ('paid','cancelled');
create table if not exists public.payment_followup_events (
 id uuid primary key, -- Browser-generated request ID makes retries idempotent.
 followup_id uuid not null references public.payment_followups(id) on delete restrict,
 actor_id uuid not null references public.app_users(id) on delete restrict,
 actor_name text not null,
 action text not null check (action in ('save','notify','promise','paid','reopen','cancel')),
 note text not null default '',
 snapshot jsonb not null,
 created_at timestamptz not null default now()
);
create index if not exists payment_followup_events_record on public.payment_followup_events(followup_id,created_at desc);
alter table public.payment_followups enable row level security;
alter table public.payment_followup_events enable row level security;
revoke all on public.payment_followups,public.payment_followup_events from public,anon,authenticated;

-- Same staff assignment scope as My Clients, including legacy service assignments.
-- Archived clients retain history but cannot receive new obligations.
create or replace function public.payment_followup_client_access(p_staff_id uuid,p_client_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from clients c join app_users u on u.id=p_staff_id and u.is_active
  where c.id=p_client_id and (c.accounting_person=u.name or c.insurance_person=u.name
   or ('Rà soát:'||u.name)=any(c.services) or ('Đầu tư:'||u.name)=any(c.services)
   or to_jsonb(c)->>'review_person'=u.name or to_jsonb(c)->>'investment_person'=u.name))
$$;

create or replace function public.payment_followup_portal(p_staff_id uuid,p_summary_only boolean default false)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; totals jsonb;
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 select jsonb_build_object('unpaid',count(*), 'overdue',count(*) filter(where due_on<today),
  'attention',count(*) filter(where due_on<=today+3 or next_reminder_on<=today or promised_on<today)) into totals
 from payment_followups r where payment_followup_client_access(p_staff_id,r.client_id) and status not in ('paid','cancelled');
 if p_summary_only then return jsonb_build_object('today',today,'summary',totals); end if;
 return jsonb_build_object('today',today,'summary',totals,
  'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'tax_code',c.tax_code,
   'contact_name',c.contact_name,'contact_phone',c.contact_phone,'archived',c.archived_at is not null) order by c.name)
   from clients c where payment_followup_client_access(p_staff_id,c.id)),'[]'::jsonb),
  'records',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('client_name',c.name,'tax_code',c.tax_code,
   'client_archived',c.archived_at is not null) order by r.due_on,r.created_at)
   from payment_followups r join clients c on c.id=r.client_id where payment_followup_client_access(p_staff_id,r.client_id)),'[]'::jsonb));
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
   or not payment_followup_client_access(p_staff_id,(event_row.snapshot->>'client_id')::uuid)
   then raise exception 'Yêu cầu không hợp lệ hoặc ngoài phạm vi phụ trách.'; end if;
  return event_row.snapshot;
 end if;
 select * into r from payment_followups where id=rid for update;
 if found then
  if not payment_followup_client_access(p_staff_id,r.client_id) then raise exception 'Khách hàng ngoài phạm vi phụ trách.'; end if;
  if (p_record->>'version')::integer is distinct from r.version then raise exception 'Khoản đóng vừa được người khác cập nhật. Hãy làm mới danh sách rồi thử lại.'; end if;
  old_row:=r;
 else
  if p_action<>'save' or coalesce((p_record->>'version')::integer,0)<>0 then raise exception 'Không tìm thấy khoản đóng.'; end if;
  cid:=(p_record->>'client_id')::uuid;
  if not payment_followup_client_access(p_staff_id,cid) then raise exception 'Khách hàng ngoài phạm vi phụ trách.'; end if;
  if exists(select 1 from clients where id=cid and archived_at is not null) then raise exception 'Khách hàng đã lưu trữ.'; end if;
  r.id:=rid; r.client_id:=cid; r.created_by:=p_staff_id; r.created_at:=now();
  r.status:='pending'; r.notification_count:=0; r.version:=0; r.payment_reference:='';
 end if;
 if p_action='save' then
  if r.status in ('paid','cancelled') then raise exception 'Mở lại theo dõi trước khi sửa thông tin.'; end if;
  if nullif(p_record->>'client_id','')::uuid is distinct from r.client_id then raise exception 'Không thể đổi khách hàng của khoản đã tạo.'; end if;
  r.kind:=p_record->>'kind'; r.period:=regexp_replace(trim(p_record->>'period'),'\s+',' ','g');
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
   if r.status<>'promised' then r.status:='notified'; end if;
   r.last_notified_at:=now(); r.notification_count:=r.notification_count+1;
   r.next_reminder_on:=(p_record->>'next_reminder_on')::date;
  elsif p_action='promise' then
   r.status:='promised'; r.promised_on:=(p_record->>'promised_on')::date;
   r.next_reminder_on:=(p_record->>'next_reminder_on')::date;
   if r.promised_on is null or r.promised_on<today then raise exception 'Ngày khách hẹn phải từ hôm nay.'; end if;
  elsif p_action='paid' then
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
  r.status:='pending'; r.paid_on:=null; r.payment_reference:=''; r.promised_on:=null;
  r.next_reminder_on:=(p_record->>'next_reminder_on')::date;
 end if;
 if p_action in ('notify','promise','reopen') and (r.next_reminder_on is null or r.next_reminder_on<today) then raise exception 'Ngày nhắc tiếp theo phải từ hôm nay.'; end if;
 r.version:=r.version+1; r.updated_by:=p_staff_id; r.updated_at:=now();
 if old_row.id is null then
  begin
   insert into payment_followups select r.*;
  exception when unique_violation then raise exception 'Đã có khoản cho khách, loại và kỳ này. Hãy kiểm tra cả mục Đã đóng / Ngừng theo dõi.'; end;
 else
  begin
   update payment_followups set kind=r.kind,period=r.period,amount=r.amount,due_on=r.due_on,next_reminder_on=r.next_reminder_on,
    status=r.status,promised_on=r.promised_on,paid_on=r.paid_on,payment_reference=r.payment_reference,
    last_notified_at=r.last_notified_at,notification_count=r.notification_count,notes=r.notes,
    version=r.version,updated_by=r.updated_by,updated_at=r.updated_at where id=r.id;
  exception when unique_violation then raise exception 'Đã có khoản cho khách, loại và kỳ này.'; end;
 end if;
 insert into payment_followup_events(id,followup_id,actor_id,actor_name,action,note,snapshot)
 values(p_request_id,r.id,p_staff_id,actor,p_action,note_text,to_jsonb(r));
 return to_jsonb(r);
end $$;

create or replace function public.payment_followup_history(p_staff_id uuid,p_followup_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from payment_followups r where r.id=p_followup_id and payment_followup_client_access(p_staff_id,r.client_id)) then raise exception 'Không tìm thấy khoản đóng trong phạm vi phụ trách.'; end if;
 return coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc,e.id)
  from payment_followup_events e where e.followup_id=p_followup_id),'[]'::jsonb);
end $$;

revoke all on function public.payment_followup_client_access(uuid,uuid) from public,anon,authenticated;
revoke all on function public.payment_followup_portal(uuid,boolean) from public;
revoke all on function public.save_payment_followup(uuid,uuid,text,jsonb) from public;
revoke all on function public.payment_followup_history(uuid,uuid) from public;
grant execute on function public.payment_followup_portal(uuid,boolean),public.save_payment_followup(uuid,uuid,text,jsonb),public.payment_followup_history(uuid,uuid) to anon,authenticated;
notify pgrst, 'reload schema';
commit;
