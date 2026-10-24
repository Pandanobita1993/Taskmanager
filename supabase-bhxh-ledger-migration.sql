-- Run after supabase-payment-followups-migration.sql, as postgres. Rerunnable.
-- BHXH paid totals come only from the payment ledger, by actual payment month.
begin;
create table if not exists public.bhxh_periods (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.clients(id) on delete restrict,
 period_on date not null check (extract(day from period_on)=1 and period_on between date '1900-01-01' and date '2200-12-01'),
 opening_override numeric(16,0), opening_reason text not null default '',
 charges numeric(16,0) not null,
 notes text not null default '', source_filename text not null default '',
 created_by uuid not null references public.app_users(id) on delete restrict,
 updated_by uuid not null references public.app_users(id) on delete restrict,
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(client_id,period_on), check (opening_override is null or length(trim(opening_reason))>0)
);
create table if not exists public.bhxh_payments (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.clients(id) on delete restrict,
 paid_on date not null, amount numeric(16,0) not null check (amount>0),
 reference text not null default '', notes text not null default '',
 is_void boolean not null default false, void_reason text not null default '',
 created_by uuid not null references public.app_users(id) on delete restrict,
 updated_by uuid not null references public.app_users(id) on delete restrict,
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (not is_void or length(trim(void_reason))>0)
);
create index if not exists bhxh_payments_month on public.bhxh_payments(client_id,paid_on) where not is_void;
create unique index if not exists bhxh_payments_reference on public.bhxh_payments(client_id,lower(trim(reference))) where not is_void and trim(reference)<>'';
create table if not exists public.bhxh_ledger_events (
 request_id uuid primary key, entity_type text not null check (entity_type in ('period','payment')),
 entity_id uuid not null, client_id uuid not null references public.clients(id) on delete restrict,
 action text not null, actor_id uuid not null references public.app_users(id) on delete restrict,
 actor_name text not null, note text not null default '', snapshot jsonb not null, payload jsonb not null,
 created_at timestamptz not null default now()
);
create index if not exists bhxh_ledger_events_entity on public.bhxh_ledger_events(entity_type,entity_id,created_at desc);
alter table public.bhxh_periods enable row level security;
alter table public.bhxh_payments enable row level security;
alter table public.bhxh_ledger_events enable row level security;
revoke all on public.bhxh_periods,public.bhxh_payments,public.bhxh_ledger_events from public,anon,authenticated;

create or replace function public.bhxh_money(p_value text,p_required boolean default true)
returns numeric language plpgsql immutable set search_path=public as $$
declare n numeric;
begin
 if nullif(trim(p_value),'') is null then
  if p_required then raise exception 'Nhập số tiền, dùng 0 nếu không phát sinh.'; end if;
  return null;
 end if;
 if p_value !~ '^-?[0-9]{1,15}$' then raise exception 'Số tiền phải là đồng nguyên, tối đa 15 chữ số (có thể âm khi điều chỉnh / đóng thừa).'; end if;
 n:=p_value::numeric; return n;
end $$;

-- Derived on every read: edits/backdated payments cascade through adjacent months,
-- stopping at a gap or an explicit opening override. Missing never becomes zero.
create or replace function public.bhxh_balances(p_client_id uuid)
returns table(id uuid,client_id uuid,period_on date,opening_override numeric,opening_reason text,charges numeric,
 notes text,source_filename text,version integer,updated_at timestamptz,paid_total numeric,payment_count bigint,
 opening_balance numeric,opening_source text,closing_balance numeric)
language sql stable security definer set search_path=public as $$
 with recursive ordered as (
  select r.*,coalesce(p.total,0)::numeric as paid_total,coalesce(p.cnt,0)::bigint as payment_count,
   row_number() over(order by r.period_on) as seq
  from bhxh_periods r left join lateral (select sum(amount) total,count(*) cnt from bhxh_payments p
   where p.client_id=r.client_id and not p.is_void and p.paid_on>=r.period_on and p.paid_on<r.period_on+interval '1 month') p on true
  where r.client_id=p_client_id
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
  paid_total,payment_count,opening_balance,opening_source,closing_balance from balances
$$;

create or replace function public.bhxh_ledger_portal(p_staff_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 return jsonb_build_object('today',(now() at time zone 'Asia/Ho_Chi_Minh')::date,
  'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'tax_code',c.tax_code,'ins_code',to_jsonb(c)->>'ins_code',
   'archived',c.archived_at is not null) order by c.name) from clients c where payment_followup_client_access(p_staff_id,c.id)),'[]'::jsonb),
  'periods',coalesce((select jsonb_agg(to_jsonb(b)||jsonb_build_object('client_name',c.name,'tax_code',c.tax_code) order by b.period_on desc,c.name)
   from clients c cross join lateral bhxh_balances(c.id) b where payment_followup_client_access(p_staff_id,c.id)),'[]'::jsonb),
  'payments',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('client_name',c.name) order by p.paid_on desc,p.created_at desc)
   from bhxh_payments p join clients c on c.id=p.client_id where payment_followup_client_access(p_staff_id,c.id)),'[]'::jsonb));
end $$;

-- One validated, audited endpoint for period inputs and actual payments.
create or replace function public.save_bhxh_ledger(p_staff_id uuid,p_request_id uuid,p_entity text,p_action text,p_record jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare rid uuid:=(p_record->>'id')::uuid; cid uuid:=(p_record->>'client_id')::uuid;
 actor text; pr bhxh_periods%rowtype; pay bhxh_payments%rowtype; evt bhxh_ledger_events%rowtype;
 previous_version integer; snap jsonb; note_text text:=trim(coalesce(p_record->>'event_note',''));
 today date:=(now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
 select name into actor from app_users where id=p_staff_id and is_active;
 if actor is null then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 if p_request_id is null or rid is null or cid is null or p_entity is null or p_entity not in ('period','payment')
  or p_action is null or p_action not in ('save','void','restore') or (p_entity='period' and p_action<>'save')
  then raise exception 'Yêu cầu không hợp lệ.'; end if;
 if not payment_followup_client_access(p_staff_id,cid) then raise exception 'Khách hàng ngoài phạm vi phụ trách.'; end if;
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
  if pay.id is not null and pay.client_id<>cid then raise exception 'Không thể đổi khách hàng.'; end if;
  if pay.id is null and p_action<>'save' then raise exception 'Không tìm thấy lần nộp.'; end if;
  pay.id:=rid; pay.client_id:=cid;
  if p_action='save' then
   if pay.is_void then raise exception 'Khôi phục lần nộp trước khi sửa.'; end if;
   pay.paid_on:=(p_record->>'paid_on')::date; pay.amount:=bhxh_money(p_record->>'amount');
   pay.reference:=trim(coalesce(p_record->>'reference','')); pay.notes:=trim(coalesce(p_record->>'notes',''));
   pay.is_void:=false; pay.void_reason:='';
   if pay.paid_on is null or pay.paid_on>today or pay.paid_on<date '1900-01-01' or pay.amount<=0 or length(pay.reference)>500 or length(pay.notes)>5000 then
    raise exception 'Kiểm tra ngày thực nộp (không ở tương lai), số tiền dương và thông tin chứng từ.'; end if;
  else
   if note_text='' then raise exception 'Nhập lý do hủy / khôi phục lần nộp.'; end if;
   if (p_action='void')=pay.is_void then raise exception 'Trạng thái lần nộp đã thay đổi. Hãy làm mới.'; end if;
   pay.is_void:=(p_action='void'); pay.void_reason:=case when pay.is_void then note_text else '' end;
  end if;
 end if;
 if (p_record->>'version')::integer is distinct from previous_version then raise exception 'Dữ liệu vừa được người khác cập nhật. Hãy làm mới rồi thử lại.'; end if;
 if previous_version=0 and exists(select 1 from clients where id=cid and archived_at is not null) then raise exception 'Khách hàng đã lưu trữ, không thêm bản ghi mới.'; end if;
 begin
  if p_entity='period' then
   pr.version:=previous_version+1; pr.updated_by:=p_staff_id; pr.updated_at:=now();
   if previous_version=0 then
    pr.created_by:=p_staff_id; pr.created_at:=now(); insert into bhxh_periods select pr.*;
   else
    update bhxh_periods set opening_override=pr.opening_override,opening_reason=pr.opening_reason,charges=pr.charges,
     notes=pr.notes,source_filename=pr.source_filename,version=pr.version,updated_by=pr.updated_by,updated_at=pr.updated_at where id=rid;
   end if;
   snap:=to_jsonb(pr);
  else
   pay.version:=previous_version+1; pay.updated_by:=p_staff_id; pay.updated_at:=now();
   if previous_version=0 then
    pay.created_by:=p_staff_id; pay.created_at:=now(); insert into bhxh_payments select pay.*;
   else
    update bhxh_payments set paid_on=pay.paid_on,amount=pay.amount,reference=pay.reference,notes=pay.notes,is_void=pay.is_void,
     void_reason=pay.void_reason,version=pay.version,updated_by=pay.updated_by,updated_at=pay.updated_at where id=rid;
   end if;
   snap:=to_jsonb(pay);
  end if;
 exception when unique_violation then raise exception 'Đã có kỳ C12 hoặc mã chứng từ này cho khách hàng. Kiểm tra bản ghi cũ trước khi thêm.'; end;
 insert into bhxh_ledger_events(request_id,entity_type,entity_id,client_id,action,actor_id,actor_name,note,snapshot,payload)
 values(p_request_id,p_entity,rid,cid,p_action,p_staff_id,actor,note_text,snap,p_record);
 return snap;
end $$;

create or replace function public.bhxh_ledger_history(p_staff_id uuid,p_entity text,p_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from bhxh_ledger_events e where e.entity_type=p_entity and e.entity_id=p_id and payment_followup_client_access(p_staff_id,e.client_id)) then
  raise exception 'Không tìm thấy lịch sử trong phạm vi phụ trách.'; end if;
 return coalesce((select jsonb_agg(to_jsonb(e)-'payload' order by e.created_at desc,e.request_id)
  from bhxh_ledger_events e where e.entity_type=p_entity and e.entity_id=p_id),'[]'::jsonb);
end $$;
revoke all on function public.bhxh_money(text,boolean),public.bhxh_balances(uuid) from public,anon,authenticated;
revoke all on function public.bhxh_ledger_portal(uuid),public.save_bhxh_ledger(uuid,uuid,text,text,jsonb),public.bhxh_ledger_history(uuid,text,uuid) from public;
grant execute on function public.bhxh_ledger_portal(uuid),public.save_bhxh_ledger(uuid,uuid,text,text,jsonb),public.bhxh_ledger_history(uuid,text,uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;
