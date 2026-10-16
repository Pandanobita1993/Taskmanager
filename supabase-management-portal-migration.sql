-- AN AN: website điều hành riêng, dùng chung dữ liệu với ứng dụng nhân viên.
-- Chạy toàn bộ trong Supabase SQL Editor. Không thay đổi quyền dùng thử của website nhân viên.
begin;
create extension if not exists pgcrypto;

create table if not exists public.management_accounts (
 id uuid primary key default gen_random_uuid(), username text not null unique,
 name text not null, password_hash text not null, role text not null check(role in ('director','manager')),
 office text check(office in ('Cần Thơ','Long An')), staff_id uuid references public.app_users(id),
 is_active boolean not null default true, created_at timestamptz not null default now(),
 check(role <> 'manager' or (office is not null and staff_id is not null))
);
create table if not exists public.management_sessions (
 token_hash text primary key, account_id uuid references public.management_accounts(id) on delete cascade,
 name text not null, role text not null, office text, staff_id uuid,
 expires_at timestamptz not null default now()+interval '8 hours'
);
create table if not exists public.management_login_attempts (
 username text primary key, failures integer not null default 0, last_attempt timestamptz not null default now()
);
create table if not exists public.customer_receivables (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id),
 office text not null check(office in ('Cần Thơ','Long An')), description text not null,
 period text, due_date date not null, amount numeric(16,2) not null check(amount>0),
 is_void boolean not null default false, created_by text not null, created_at timestamptz not null default now()
);
create table if not exists public.customer_payments (
 id uuid primary key default gen_random_uuid(), receivable_id uuid not null references public.customer_receivables(id),
 task_id uuid references public.tasks(id), mutation_key uuid unique, amount numeric(16,2) not null check(amount>0),
 payment_date date not null, note text not null default '', confirmed_by text not null,
 is_void boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.payment_checks (
 task_id uuid primary key references public.tasks(id), status text not null check(status in ('confirmed','not_received')),
 note text not null default '', checked_by text not null, checked_at timestamptz not null default now()
);
create table if not exists public.review_requests (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id),
 submitted_by uuid not null references public.app_users(id), office text not null,
 title text not null, details text not null default '', period text not null default '', report_url text not null default '', due_date date,
 status text not null default 'submitted' check(status in ('submitted','in_review','needs_changes','approved')),
 revision integer not null default 1, reviewer_name text, reviewer_note text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), reviewed_at timestamptz
);
create table if not exists public.review_request_history (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.review_requests(id),
 revision integer not null, action text not null, actor_name text not null,
 snapshot jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.management_audit (
 id uuid primary key default gen_random_uuid(), actor_name text not null, action text not null,
 entity_id uuid, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index if not exists customer_receivables_office_idx on public.customer_receivables(office, client_id);
create index if not exists customer_payments_receivable_idx on public.customer_payments(receivable_id);
create index if not exists review_requests_office_idx on public.review_requests(office, status);

-- Các bảng mới chỉ được truy cập qua RPC có kiểm tra quyền.
do $$ declare t text; begin
 foreach t in array array['management_accounts','management_sessions','management_login_attempts','customer_receivables','customer_payments','payment_checks','review_requests','review_request_history','management_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;

create or replace function public.management_identity(p_token text)
returns public.management_sessions language plpgsql security definer set search_path=public,extensions as $$
declare s public.management_sessions;
begin
 select ms.* into s from management_sessions ms left join management_accounts a on a.id=ms.account_id
 where ms.token_hash=encode(digest(p_token,'sha256'),'hex') and ms.expires_at>now()
 and ((ms.role='admin' and ms.account_id is null) or (a.is_active and a.role=ms.role and a.office is not distinct from ms.office));
 if not found then raise exception 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' using errcode='28000'; end if;
 return s;
end $$;

create or replace function public.management_login(p_username text,p_password text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare a management_accounts; v_token text; v_name text; v_role text; v_office text; v_staff uuid; v_user text:=lower(trim(p_username)); attempts management_login_attempts;
begin
 select * into attempts from management_login_attempts where username=v_user;
 if attempts.failures>=8 and attempts.last_attempt>now()-interval '10 minutes' then
 return jsonb_build_object('error','Bạn đã thử quá nhiều lần. Vui lòng đợi 10 phút.'); end if;
 if v_user='admin' and verify_admin_password(p_password) then v_name:='Quản trị hệ thống'; v_role:='admin';
 else
 select * into a from management_accounts where username=v_user and is_active;
 if a.id is null or a.password_hash<>crypt(p_password,a.password_hash) then
 insert into management_login_attempts(username,failures) values(v_user,1)
 on conflict(username) do update set failures=case when management_login_attempts.last_attempt<now()-interval '10 minutes' then 1 else management_login_attempts.failures+1 end,last_attempt=now();
 return jsonb_build_object('error','Tên đăng nhập hoặc mật khẩu không đúng.'); end if;
 v_name:=a.name;v_role:=a.role;v_office:=a.office;v_staff:=a.staff_id;
 end if;
 delete from management_login_attempts where username=v_user;
 delete from management_sessions where expires_at<now();
 v_token:=encode(gen_random_bytes(32),'hex');
 insert into management_sessions(token_hash,account_id,name,role,office,staff_id) values(encode(digest(v_token,'sha256'),'hex'),a.id,v_name,v_role,v_office,v_staff);
 return jsonb_build_object('token',v_token,'name',v_name,'role',v_role,'office',v_office,'expires_at',now()+interval '8 hours');
end $$;
create or replace function public.management_logout(p_token text) returns void language sql security definer set search_path=public,extensions as $$
 delete from management_sessions where token_hash=encode(digest(p_token,'sha256'),'hex');
$$;

create or replace function public.management_save_account(p_token text,p_account jsonb) returns uuid
language plpgsql security definer set search_path=public,extensions as $$
declare s management_sessions:=management_identity(p_token); aid uuid; username_value text:=lower(trim(p_account->>'username')); password_value text:=p_account->>'password';
begin
 if s.role<>'admin' then raise exception 'Chỉ quản trị hệ thống được quản lý tài khoản.'; end if;
 if username_value='admin' or username_value !~ '^[a-z0-9_.-]{3,60}$' then raise exception 'Tên đăng nhập cần 3–60 ký tự a–z, số, dấu chấm, gạch dưới hoặc gạch ngang.'; end if;
 if nullif(trim(p_account->>'name'),'') is null then raise exception 'Vui lòng nhập tên người dùng.'; end if;
 aid:=nullif(p_account->>'id','')::uuid;
 if (aid is null or coalesce(password_value,'')<>'') and length(coalesce(password_value,''))<10 then raise exception 'Mật khẩu cần ít nhất 10 ký tự.'; end if;
 if p_account->>'role'='manager' and not exists(select 1 from app_users where id=(p_account->>'staff_id')::uuid and is_active and office=p_account->>'office') then raise exception 'Nhân sự quản lý cần thuộc đúng văn phòng đã chọn.'; end if;
 if aid is null then
 insert into management_accounts(username,name,password_hash,role,office,staff_id) values(username_value,trim(p_account->>'name'),crypt(password_value,gen_salt('bf')),p_account->>'role',nullif(p_account->>'office',''),nullif(p_account->>'staff_id','')::uuid) returning id into aid;
 else
 update management_accounts set username=username_value,name=trim(p_account->>'name'),role=p_account->>'role',office=nullif(p_account->>'office',''),staff_id=nullif(p_account->>'staff_id','')::uuid,
 is_active=coalesce((p_account->>'is_active')::boolean,true),password_hash=case when coalesce(password_value,'')<>'' then crypt(password_value,gen_salt('bf')) else password_hash end where id=aid;
 if not found then raise exception 'Không tìm thấy tài khoản.'; end if;
 delete from management_sessions where account_id=aid;
 end if;
 insert into management_audit(actor_name,action,entity_id,details) values(s.name,'Cập nhật tài khoản',aid,jsonb_build_object('username',username_value,'role',p_account->>'role'));
 return aid;
end $$;

-- Phạm vi khách hàng: theo nhân sự phụ trách hoặc công việc đã giao.
create or replace function public.staff_client_access(p_staff_id uuid,p_client_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from clients c join app_users u on u.id=p_staff_id and u.is_active
 where c.id=p_client_id and c.archived_at is null and
 (c.accounting_person=u.name or c.insurance_person=u.name or ('Rà soát:'||u.name)=any(c.services) or ('Đầu tư:'||u.name)=any(c.services)
 or exists(select 1 from tasks t where t.client_id=c.id and t.user_id in(u.id::text,u.name))));
$$;

create or replace function public.staff_management_portal(p_staff_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên.'; end if;
 return jsonb_build_object(
 'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'tax_code',c.tax_code) order by c.name) from clients c where staff_client_access(p_staff_id,c.id)),'[]'::jsonb),
 'receivables',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('paid',coalesce((select sum(p.amount) from customer_payments p where p.receivable_id=r.id and not p.is_void),0))) from customer_receivables r where not r.is_void and staff_client_access(p_staff_id,r.client_id)),'[]'::jsonb),
 'payments',coalesce((select jsonb_agg(to_jsonb(p)) from customer_payments p join customer_receivables r on r.id=p.receivable_id where staff_client_access(p_staff_id,r.client_id)),'[]'::jsonb),
 'payment_checks',coalesce((select jsonb_agg(to_jsonb(pc)) from payment_checks pc join tasks t on t.id=pc.task_id where staff_client_access(p_staff_id,t.client_id)),'[]'::jsonb),
 'requests',coalesce((select jsonb_agg(to_jsonb(r) order by r.updated_at desc) from review_requests r where r.submitted_by=p_staff_id),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.created_at desc) from review_request_history h join review_requests r on r.id=h.request_id where r.submitted_by=p_staff_id),'[]'::jsonb));
end $$;

create or replace function public.staff_submit_review(p_staff_id uuid,p_request jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare u app_users; r review_requests; rid uuid:=nullif(p_request->>'id','')::uuid; cid uuid:=(p_request->>'client_id')::uuid; link text:=trim(coalesce(p_request->>'report_url',''));
begin
 select * into u from app_users where id=p_staff_id and is_active;
 if u.id is null or not staff_client_access(p_staff_id,cid) then raise exception 'Bạn chưa được phân công khách hàng này.'; end if;
 if nullif(trim(p_request->>'title'),'') is null then raise exception 'Vui lòng nhập tên yêu cầu.'; end if;
 if link<>'' and link !~ '^https://' then raise exception 'Link tài liệu phải bắt đầu bằng https://'; end if;
 if rid is null then
 insert into review_requests(client_id,submitted_by,office,title,details,period,report_url,due_date) values(cid,u.id,coalesce(u.office,'Cần Thơ'),trim(p_request->>'title'),coalesce(p_request->>'details',''),coalesce(p_request->>'period',''),link,nullif(p_request->>'due_date','')::date) returning * into r;
 else
 select * into r from review_requests where id=rid for update;
 if not found or r.submitted_by<>u.id or r.status<>'needs_changes' then raise exception 'Chỉ gửi lại yêu cầu của bạn đang cần bổ sung.'; end if;
 update review_requests set title=trim(p_request->>'title'),details=coalesce(p_request->>'details',''),period=coalesce(p_request->>'period',''),report_url=link,due_date=nullif(p_request->>'due_date','')::date,
 status='submitted',revision=revision+1,reviewer_name=null,reviewer_note='',reviewed_at=null,updated_at=now() where id=rid returning * into r;
 end if;
 insert into review_request_history(request_id,revision,action,actor_name,snapshot) values(r.id,r.revision,'Nhân viên gửi yêu cầu',u.name,to_jsonb(r));
 return r.id;
end $$;

create or replace function public.management_review_action(p_token text,p_id uuid,p_status text,p_revision integer,p_note text default '') returns void
language plpgsql security definer set search_path=public,extensions as $$
declare s management_sessions:=management_identity(p_token); r review_requests;
begin
 select * into r from review_requests where id=p_id for update;
 if not found then raise exception 'Không tìm thấy yêu cầu.'; end if;
 if s.role not in('admin','manager') or (s.role='manager' and s.office<>r.office) then raise exception 'Bạn không có quyền xét duyệt yêu cầu này.'; end if;
 if s.staff_id=r.submitted_by then raise exception 'Người gửi không được tự duyệt yêu cầu của mình.'; end if;
 if r.revision<>p_revision then raise exception 'Bản báo cáo đã được cập nhật. Vui lòng tải lại trước khi duyệt.'; end if;
 if r.status not in('submitted','in_review') or p_status not in('in_review','needs_changes','approved') then raise exception 'Trạng thái yêu cầu đã thay đổi. Vui lòng tải lại.'; end if;
 if p_status='needs_changes' and nullif(trim(p_note),'') is null then raise exception 'Vui lòng ghi nội dung cần bổ sung.'; end if;
 update review_requests set status=p_status,reviewer_name=s.name,reviewer_note=trim(p_note),updated_at=now(),reviewed_at=case when p_status in('approved','needs_changes') then now() else null end where id=p_id returning * into r;
 insert into review_request_history(request_id,revision,action,actor_name,snapshot) values(r.id,r.revision,p_status,s.name,to_jsonb(r));
end $$;

create or replace function public.management_add_receivable(p_token text,p_item jsonb) returns uuid
language plpgsql security definer set search_path=public,extensions as $$
declare s management_sessions:=management_identity(p_token); rid uuid;
begin
 if s.role not in('admin','director') then raise exception 'Chỉ sếp hoặc quản trị được thiết lập công nợ.'; end if;
 if nullif(trim(p_item->>'description'),'') is null then raise exception 'Vui lòng nhập nội dung khoản phải thu.'; end if;
 insert into customer_receivables(client_id,office,description,period,due_date,amount,created_by) values((p_item->>'client_id')::uuid,p_item->>'office',trim(p_item->>'description'),nullif(p_item->>'period',''),(p_item->>'due_date')::date,(p_item->>'amount')::numeric,s.name) returning id into rid;
 insert into management_audit(actor_name,action,entity_id,details) values(s.name,'Thêm khoản phải thu',rid,p_item);
 return rid;
end $$;

create or replace function public.management_record_payment(p_token text,p_item jsonb) returns uuid
language plpgsql security definer set search_path=public,extensions as $$
declare s management_sessions:=management_identity(p_token); r customer_receivables; rid uuid:=(p_item->>'receivable_id')::uuid; amt numeric:=(p_item->>'amount')::numeric; paid numeric; pid uuid; tid uuid:=nullif(p_item->>'task_id','')::uuid;
begin
 if s.role not in('admin','director') then raise exception 'Chỉ sếp hoặc quản trị được xác nhận thanh toán.'; end if;
 select * into r from customer_receivables where id=rid and not is_void for update;
 if not found then raise exception 'Không tìm thấy khoản phải thu.'; end if;
 if nullif(p_item->>'mutation_key','') is null then raise exception 'Thiếu mã giao dịch. Vui lòng mở lại biểu mẫu.'; end if;
 select id into pid from customer_payments where mutation_key=(p_item->>'mutation_key')::uuid;
 if found then return pid; end if;
 if amt is null or amt<=0 then raise exception 'Số tiền thực nhận phải lớn hơn 0.'; end if;
 if (p_item->>'payment_date')::date>(now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Ngày nhận tiền không được nằm trong tương lai.'; end if;
 select coalesce(sum(amount),0) into paid from customer_payments where receivable_id=rid and not is_void;
 if amt>r.amount-paid then raise exception 'Số tiền vượt quá công nợ còn lại của khoản này.'; end if;
 if tid is not null then
 perform 1 from tasks where id=tid and type='payment' and client_id=r.client_id for update;
 if not found then raise exception 'Khoản nhân viên báo thu không khớp khách hàng.'; end if;
 if exists(select 1 from payment_checks where task_id=tid and status='confirmed') then raise exception 'Khoản báo thu này đã được xác nhận. Vui lòng tải lại.'; end if;
 end if;
 insert into customer_payments(receivable_id,task_id,mutation_key,amount,payment_date,note,confirmed_by) values(rid,tid,(p_item->>'mutation_key')::uuid,amt,(p_item->>'payment_date')::date,coalesce(p_item->>'note',''),s.name) returning id into pid;
 if tid is not null then insert into payment_checks(task_id,status,note,checked_by) values(tid,'confirmed',coalesce(p_item->>'note',''),s.name) on conflict(task_id) do update set status='confirmed',note=excluded.note,checked_by=s.name,checked_at=now(); end if;
 insert into management_audit(actor_name,action,entity_id,details) values(s.name,'Xác nhận thực nhận tiền',pid,p_item);
 return pid;
end $$;

create or replace function public.management_payment_not_received(p_token text,p_task_id uuid,p_note text) returns void
language plpgsql security definer set search_path=public,extensions as $$
declare s management_sessions:=management_identity(p_token);
begin
 if s.role not in('admin','director') then raise exception 'Chỉ sếp hoặc quản trị được xác nhận thanh toán.'; end if;
 if nullif(trim(p_note),'') is null then raise exception 'Vui lòng ghi nội dung phản hồi cho nhân viên.'; end if;
 perform 1 from tasks where id=p_task_id and type='payment' for update;
 if not found then raise exception 'Không tìm thấy khoản nhân viên báo thu.'; end if;
 if exists(select 1 from customer_payments where task_id=p_task_id and not is_void) then raise exception 'Khoản này đã ghi nhận tiền. Cần hủy xác nhận trước khi đánh dấu chưa nhận.'; end if;
 insert into payment_checks(task_id,status,note,checked_by) values(p_task_id,'not_received',trim(p_note),s.name)
 on conflict(task_id) do update set status='not_received',note=excluded.note,checked_by=s.name,checked_at=now();
 insert into management_audit(actor_name,action,entity_id,details) values(s.name,'Chưa xác nhận nhận tiền',p_task_id,jsonb_build_object('note',p_note));
end $$;
create or replace function public.management_void_entry(p_token text,p_id uuid,p_kind text,p_reason text) returns void
language plpgsql security definer set search_path=public,extensions as $$
declare s management_sessions:=management_identity(p_token); tid uuid;
begin
 if s.role not in('admin','director') then raise exception 'Bạn không có quyền điều chỉnh công nợ.'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'Vui lòng ghi lý do điều chỉnh.'; end if;
 if p_kind='payment' then
 select p.task_id into tid from customer_payments p join customer_receivables r on r.id=p.receivable_id where p.id=p_id and not p.is_void for update of r,p;
 if not found then raise exception 'Khoản thu đã thay đổi. Vui lòng tải lại.'; end if;
 update customer_payments set is_void=true where id=p_id;
 if tid is not null then delete from payment_checks where task_id=tid; end if;
 elsif p_kind='receivable' then
 perform 1 from customer_receivables where id=p_id and not is_void for update;
 if not found then raise exception 'Khoản phải thu đã thay đổi. Vui lòng tải lại.'; end if;
 if exists(select 1 from customer_payments where receivable_id=p_id and not is_void) then raise exception 'Cần hủy xác nhận các khoản thu trước khi điều chỉnh khoản phải thu.'; end if;
 update customer_receivables set is_void=true where id=p_id;
 else raise exception 'Loại điều chỉnh không hợp lệ.';
 end if;
 insert into management_audit(actor_name,action,entity_id,details) values(s.name,'Hủy xác nhận / khoản phải thu',p_id,jsonb_build_object('kind',p_kind,'reason',p_reason));
end $$;

create or replace function public.management_dashboard(p_token text) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare s management_sessions:=management_identity(p_token);
begin
 return jsonb_build_object(
 'identity',jsonb_build_object('name',s.name,'role',s.role,'office',s.office),
 'staff',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'office',coalesce(u.office,'Cần Thơ'),'department',u.department)) from app_users u where u.is_active and(s.role<>'manager' or u.office=s.office)),'[]'::jsonb),
 'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'tax_code',c.tax_code,'accounting_person',c.accounting_person,'insurance_person',c.insurance_person)) from clients c where c.archived_at is null and(s.role<>'manager' or exists(select 1 from app_users u where u.is_active and u.office=s.office and staff_client_access(u.id,c.id)))),'[]'::jsonb),
 'receivables',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('paid',coalesce((select sum(p.amount) from customer_payments p where p.receivable_id=r.id and not p.is_void),0))) from customer_receivables r where s.role<>'manager' or r.office=s.office),'[]'::jsonb),
 'payments',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from customer_payments p join customer_receivables r on r.id=p.receivable_id where s.role<>'manager' or r.office=s.office),'[]'::jsonb),
 'payment_checks',coalesce((select jsonb_agg(to_jsonb(pc)) from payment_checks pc join tasks t on t.id=pc.task_id where s.role<>'manager' or exists(select 1 from app_users u where u.is_active and u.office=s.office and staff_client_access(u.id,t.client_id))),'[]'::jsonb),
 'reported_payments',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'client_id',t.client_id,'content',t.content,'paid_months',t.paid_months,'created_at',t.created_at,'user_id',t.user_id,'proof_file',t.proof_file,'proof_image',t.proof_image) order by t.created_at desc) from tasks t where t.type='payment' and(s.role<>'manager' or exists(select 1 from app_users u where u.office=s.office and t.user_id in(u.id::text,u.name)))),'[]'::jsonb),
 'requests',coalesce((select jsonb_agg(to_jsonb(r) order by r.updated_at desc) from review_requests r where s.role<>'manager' or r.office=s.office),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.created_at desc) from review_request_history h join review_requests r on r.id=h.request_id where s.role<>'manager' or r.office=s.office),'[]'::jsonb),
 'tasks',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'client_id',t.client_id,'content',t.content,'user_id',t.user_id,'status',t.status,'created_at',t.created_at,'is_urgent',t.is_urgent)) from tasks t where t.type<>'payment' and(s.role<>'manager' or exists(select 1 from app_users u where u.office=s.office and t.user_id in(u.id::text,u.name)))),'[]'::jsonb),
 'accounts',case when s.role='admin' then coalesce((select jsonb_agg(to_jsonb(a)-'password_hash' order by a.created_at) from management_accounts a),'[]'::jsonb) else '[]'::jsonb end,
 'audit',case when s.role in('admin','director') then coalesce((select jsonb_agg(to_jsonb(x)) from(select * from management_audit order by created_at desc limit 100)x),'[]'::jsonb) else '[]'::jsonb end);
end $$;

-- Xóa quyền execute mặc định; chỉ cấp API được dùng bởi hai giao diện.
do $$ declare f record; begin
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and (proname like 'management_%' or proname in('staff_client_access','staff_management_portal','staff_submit_review')) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
end $$;
grant execute on function public.management_login(text,text),public.management_logout(text),public.management_save_account(text,jsonb),public.management_dashboard(text),public.management_add_receivable(text,jsonb),public.management_record_payment(text,jsonb),public.management_payment_not_received(text,uuid,text),public.management_void_entry(text,uuid,text,text),public.management_review_action(text,uuid,text,integer,text),public.staff_management_portal(uuid),public.staff_submit_review(uuid,jsonb) to anon,authenticated;
commit;
