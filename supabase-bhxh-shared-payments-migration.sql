-- Run the ENTIRE file after both payment-followups and bhxh-ledger migrations.
-- Shared BHXH service customers + mandatory uploaded image proof. Safe to rerun.
-- Existing entries/history are preserved; old entries need proof on their next edit/restore.
begin;
-- Reuse the existing proof bucket; do not change its settings if already installed.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('task-proofs','task-proofs',false,5242880,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
drop policy if exists "Device profiles can read BHXH proofs" on storage.objects;
create policy "Device profiles can read BHXH proofs" on storage.objects for select to anon,authenticated
using(bucket_id='task-proofs' and name like 'public/bhxh/%');
drop policy if exists "Device profiles can upload BHXH proofs" on storage.objects;
create policy "Device profiles can upload BHXH proofs" on storage.objects for insert to anon,authenticated
with check(bucket_id='task-proofs' and name like 'public/bhxh/%');
alter table public.bhxh_payments add column if not exists proof_file text not null default '';
alter table public.payment_followups add column if not exists proof_file text not null default '';

-- This scope is used ONLY by BHXH. Tax retains its existing assignment scope.
create or replace function public.bhxh_client_access(p_staff_id uuid,p_client_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from app_users u join clients c on c.id=p_client_id
  where u.id=p_staff_id and u.is_active and (
   'BHXH'=any(c.services)
   or exists(select 1 from bhxh_periods p where p.client_id=c.id)
   or exists(select 1 from bhxh_payments p where p.client_id=c.id)
   or exists(select 1 from payment_followups r where r.client_id=c.id and r.kind='bhxh')))
$$;
create or replace function public.payment_followup_record_access(p_staff_id uuid,p_client_id uuid,p_kind text)
returns boolean language sql stable security definer set search_path=public as $$
 select case when p_kind='bhxh' then bhxh_client_access(p_staff_id,p_client_id)
  else payment_followup_client_access(p_staff_id,p_client_id) end
$$;

-- Uploaded object must exist in the existing private proof bucket. Never accept a URL
-- or a made-up path as proof. Storage upload failure must not create a paid entry.
create or replace function public.bhxh_validate_proof(p_path text)
returns void language plpgsql stable security definer set search_path=public as $$
begin
 if coalesce(p_path,'')='' or length(p_path)>1000 or p_path not like 'public/bhxh/%'
  or not exists(select 1 from storage.objects o where o.bucket_id='task-proofs' and o.name=p_path
   and o.metadata->>'mimetype' in ('image/png','image/jpeg','image/webp')
   and case when o.metadata->>'size' ~ '^[0-9]+$'
    then (o.metadata->>'size')::numeric between 1 and 5242880 else false end)
  then raise exception 'Cần tải lên ảnh bằng chứng đóng tiền (PNG, JPEG, WebP, tối đa 5 MB) trước khi lưu.';
 end if;
end $$;


create or replace function public.bhxh_ledger_portal(p_staff_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 return jsonb_build_object('today',(now() at time zone 'Asia/Ho_Chi_Minh')::date,
  'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'tax_code',c.tax_code,'ins_code',to_jsonb(c)->>'ins_code',
   'archived',c.archived_at is not null,'participating',c.archived_at is null and coalesce('BHXH'=any(c.services),false)) order by c.name) from clients c where bhxh_client_access(p_staff_id,c.id)),'[]'::jsonb),
  'periods',coalesce((select jsonb_agg(to_jsonb(b)||jsonb_build_object('client_name',c.name,'tax_code',c.tax_code) order by b.period_on desc,c.name)
   from clients c cross join lateral bhxh_balances(c.id) b where bhxh_client_access(p_staff_id,c.id)),'[]'::jsonb),
  'payments',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('client_name',c.name,'reporter_name',(select u.name from app_users u where u.id=p.created_by)) order by p.paid_on desc,p.created_at desc)
   from bhxh_payments p join clients c on c.id=p.client_id where bhxh_client_access(p_staff_id,c.id)),'[]'::jsonb));
end $$;

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
     void_reason=pay.void_reason,proof_file=pay.proof_file,version=pay.version,updated_by=pay.updated_by,updated_at=pay.updated_at where id=rid;
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
 if not exists(select 1 from bhxh_ledger_events e where e.entity_type=p_entity and e.entity_id=p_id and bhxh_client_access(p_staff_id,e.client_id)) then
  raise exception 'Không tìm thấy lịch sử trong phạm vi phụ trách.'; end if;
 return coalesce((select jsonb_agg(to_jsonb(e)-'payload' order by e.created_at desc,e.request_id)
  from bhxh_ledger_events e where e.entity_type=p_entity and e.entity_id=p_id),'[]'::jsonb);
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
   'contact_name',c.contact_name,'contact_phone',c.contact_phone,
   'archived',c.archived_at is not null or not coalesce('BHXH'=any(c.services),false)) order by c.name)
   from clients c where bhxh_client_access(p_staff_id,c.id)),'[]'::jsonb),
  'records',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('client_name',c.name,'tax_code',c.tax_code,
   'client_archived',c.archived_at is not null) order by r.due_on,r.created_at)
   from payment_followups r join clients c on c.id=r.client_id
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
  r.proof_file:='';
  r.id:=rid; r.client_id:=cid; r.created_by:=p_staff_id; r.created_at:=now();
  r.status:='pending'; r.notification_count:=0; r.version:=0; r.payment_reference:='';
 end if;
 if p_action='save' then
  if r.status in ('paid','cancelled') then raise exception 'Mở lại theo dõi trước khi sửa thông tin.'; end if;
  if nullif(p_record->>'client_id','')::uuid is distinct from r.client_id then raise exception 'Không thể đổi khách hàng của khoản đã tạo.'; end if;
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
 if p_action in ('notify','promise','reopen') and (r.next_reminder_on is null or r.next_reminder_on<today) then raise exception 'Ngày nhắc tiếp theo phải từ hôm nay.'; end if;
 r.version:=r.version+1; r.updated_by:=p_staff_id; r.updated_at:=now();
 if old_row.id is null then
  begin
   insert into payment_followups select r.*;
  exception when unique_violation then raise exception 'Đã có khoản cho khách, loại và kỳ này. Hãy kiểm tra cả mục Đã đóng / Ngừng theo dõi.'; end;
 else
  begin
   update payment_followups set kind=r.kind,period=r.period,amount=r.amount,due_on=r.due_on,next_reminder_on=r.next_reminder_on,
    status=r.status,proof_file=r.proof_file,promised_on=r.promised_on,paid_on=r.paid_on,payment_reference=r.payment_reference,
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
 if not exists(select 1 from payment_followups r where r.id=p_followup_id and payment_followup_record_access(p_staff_id,r.client_id,r.kind)) then raise exception 'Không tìm thấy khoản đóng trong phạm vi phụ trách.'; end if;
 return coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc,e.id)
  from payment_followup_events e where e.followup_id=p_followup_id),'[]'::jsonb);
end $$;


revoke all on function public.bhxh_client_access(uuid,uuid),public.payment_followup_record_access(uuid,uuid,text),public.bhxh_validate_proof(text) from public,anon,authenticated;
revoke all on function public.bhxh_followup_portal(uuid) from public,anon,authenticated;
grant execute on function public.bhxh_followup_portal(uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;
