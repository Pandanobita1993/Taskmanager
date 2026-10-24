-- Run the ENTIRE file after supabase-bhxh-shared-payments-migration.sql.
-- Agency directory, bank/province catalogues, customer defaults and recipient snapshots.
-- Existing financial entries are preserved. Safe to rerun, no external API keys.
begin;
create table if not exists public.bhxh_banks (
 bin text primary key check(bin ~ '^[0-9]{6}$'), code text not null, name text not null, short_name text not null
);
create table if not exists public.bhxh_provinces(code text primary key, name text not null);
-- Bank snapshot: https://api.vietqr.io/v2/banks, 2026-10-24. Provinces: QD 19/2025/QD-TTg.
insert into public.bhxh_banks(bin,code,name,short_name) values
('970415','ICB','Ngân hàng TMCP Công thương Việt Nam','VietinBank'),
('970436','VCB','Ngân hàng TMCP Ngoại Thương Việt Nam','Vietcombank'),
('970418','BIDV','Ngân hàng TMCP Đầu tư và Phát triển Việt Nam','BIDV'),
('970405','VBA','Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam','Agribank'),
('970448','OCB','Ngân hàng TMCP Phương Đông','OCB'),
('970422','MB','Ngân hàng TMCP Quân đội','MBBank'),
('970407','TCB','Ngân hàng TMCP Kỹ thương Việt Nam','Techcombank'),
('970416','ACB','Ngân hàng TMCP Á Châu','ACB'),
('970432','VPB','Ngân hàng TMCP Việt Nam Thịnh Vượng','VPBank'),
('970423','TPB','Ngân hàng TMCP Tiên Phong','TPBank'),
('970403','STB','Ngân hàng TMCP Sài Gòn Tài Lộc','Sacombank'),
('970437','HDB','Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh','HDBank'),
('970454','VCCB','Ngân hàng TMCP Bản Việt','VietCapitalBank'),
('970429','SCB','Ngân hàng TMCP Sài Gòn','SCB'),
('970441','VIB','Ngân hàng TMCP Quốc tế Việt Nam','VIB'),
('970443','SHB','Ngân hàng TMCP Sài Gòn - Hà Nội','SHB'),
('970431','EIB','Ngân hàng TMCP Xuất Nhập khẩu Việt Nam','Eximbank'),
('970426','MSB','Ngân hàng TMCP Hàng Hải','MSB'),
('546034','CAKE','TMCP Việt Nam Thịnh Vượng - Ngân hàng số CAKE by VPBank','CAKE'),
('546035','Ubank','TMCP Việt Nam Thịnh Vượng - Ngân hàng số Ubank by VPBank','Ubank'),
('963388','TIMO','Ngân hàng số Timo by Ban Viet Bank (Timo by Ban Viet Bank)','Timo'),
('971005','VTLMONEY','Tổng Công ty Dịch vụ số Viettel - Chi nhánh tập đoàn công nghiệp viễn thông Quân Đội','ViettelMoney'),
('971011','VNPTMONEY','Trung tâm dịch vụ tài chính số VNPT- Chi nhánh Tổng công ty truyền thông (VNPT Fintech)','VNPTMoney'),
('970400','SGICB','Ngân hàng TMCP Sài Gòn Công Thương','SaigonBank'),
('970409','BAB','Ngân hàng TMCP Bắc Á','BacABank'),
('971133','PVDB','Ngân hàng số PVcomBank','PVcomBank Pay'),
('971025','momo','CTCP Dịch Vụ Di Động Trực Tuyến','MoMo'),
('970412','PVCB','Ngân hàng TMCP Đại Chúng Việt Nam','PVcomBank'),
('970414','MBV','Ngân hàng TNHH MTV Việt Nam Hiện Đại','MBV'),
('970419','NCB','Ngân hàng TMCP Quốc Dân','NCB'),
('970424','SHBVN','Ngân hàng TNHH MTV Shinhan Việt Nam','ShinhanBank'),
('970425','ABB','Ngân hàng TMCP An Bình','ABBANK'),
('970427','VAB','Ngân hàng TMCP Việt Á','VietABank'),
('970428','NAB','Ngân hàng TMCP Nam Á','NamABank'),
('970430','PGB','Ngân hàng TMCP Thịnh vượng và Phát triển','PGBank'),
('970433','VIETBANK','Ngân hàng TMCP Việt Nam Thương Tín','VietBank'),
('970438','BVB','Ngân hàng TMCP Bảo Việt','BaoVietBank'),
('970440','SEAB','Ngân hàng TMCP Đông Nam Á','SeABank'),
('970446','COOPBANK','Ngân hàng Hợp tác xã Việt Nam','COOPBANK'),
('970449','LPB','Ngân hàng TMCP Lộc Phát Việt Nam','LPBank'),
('970452','KLB','Ngân hàng TMCP Kiên Long','KienLongBank'),
('668888','KBank','Ngân hàng Đại chúng TNHH Kasikornbank','KBank'),
('970466','KEBHANAHCM','Ngân hàng KEB Hana – Chi nhánh Thành phố Hồ Chí Minh','KEBHanaHCM'),
('970467','KEBHANAHN','Ngân hàng KEB Hana – Chi nhánh Hà Nội','KEBHANAHN'),
('977777','MAFC','Công ty Tài chính TNHH MTV Mirae Asset (Việt Nam) ','MAFC'),
('999888','VBSP','Ngân hàng Chính sách Xã hội','VBSP'),
('963668','BNP HN','Ngân hàng BNP Paribas – Chi nhánh Hà Nội','BNP HN'),
('555666','BIDC','Ngân hàng Đầu Tư Và Phát Triển Campuchia - Chi nhánh Hà Nội','BIDC'),
('963666','BNP HCM','Ngân hàng BNP Paribas – Chi nhánh Thành phố Hồ Chí Minh','BNP HCM'),
('971101','ZALOPAY','Ví điện tử ZaloPay','ZaloPay'),
('963688','BOCHK','Ngân hàng Bank of China (Hong Kong) Limited – Chi nhánh Hồ Chí Minh','BOCHK'),
('970465','BSP','Ngân hàng SinoPac - Chi nhánh Thành phố Hồ Chí Minh','BSP'),
('168999','CUBHCM','Ngân hàng Cathay United Bank – Chi nhánh Hồ Chí Minh','CUBHCM'),
('963686','ESUN','Ngân hàng Thương mại TNHH E.SUN – Chi nhánh Đồng Nai (ESUNBANK)','ESUN'),
('963669','ICBC','Ngân hàng Công thương Trung Quốc – Chi nhánh thành phố Hà Nội','ICBC'),
('971032','MVAS','Trung tâm Dịch vụ số Mobifone – Chi nhánh Tổng Công ty viễn thông Mobifone','MVAS'),
('963326','TNEX','TNEX by MSB','TNEX'),
('458761','HSBC','Ngân hàng TNHH MTV HSBC (Việt Nam)','HSBC'),
('970442','HLBVN','Ngân hàng TNHH MTV Hong Leong Việt Nam','HongLeong'),
('970455','IBK - HN','Ngân hàng Công nghiệp Hàn Quốc - Chi nhánh Hà Nội','IBKHN'),
('970456','IBK - HCM','Ngân hàng Công nghiệp Hàn Quốc - Chi nhánh TP. Hồ Chí Minh','IBKHCM'),
('970434','IVB','Ngân hàng TNHH Indovina','IndovinaBank'),
('970406','Vikki','Ngân hàng TNHH Một thành viên số Vikki','Vikki'),
('801011','NHB HN','Ngân hàng Nonghyup - Chi nhánh Hà Nội','Nonghyup'),
('796500','DBS','DBS Bank Ltd - Chi nhánh Thành phố Hồ Chí Minh','DBSBank'),
('970439','PBVN','Ngân hàng TNHH MTV Public Việt Nam','PublicBank'),
('970410','SCVN','Ngân hàng TNHH MTV Standard Chartered Bank Việt Nam','StandardChartered'),
('533948','CITIBANK','Ngân hàng Citibank, N.A. - Chi nhánh Hà Nội','Citibank'),
('422589','CIMB','Ngân hàng TNHH MTV CIMB Việt Nam','CIMB'),
('970458','UOB','Ngân hàng United Overseas - Chi nhánh TP. Hồ Chí Minh','UnitedOverseas'),
('970444','CBB','Ngân hàng Thương mại trách nhiệm hữu hạn một thành viên Ngoại thương Công nghệ số (Vietcombank Neo Limited)','CBBank'),
('970408','GPB','Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu','GPBank'),
('970421','VRB','Ngân hàng Liên doanh Việt - Nga','VRB'),
('970457','WVN','Ngân hàng TNHH MTV Woori Việt Nam','Woori'),
('970462','KBHN','Ngân hàng Kookmin - Chi nhánh Hà Nội','KookminHN'),
('970463','KBHCM','Ngân hàng Kookmin - Chi nhánh Thành phố Hồ Chí Minh','KookminHCM')
on conflict(bin) do update set code=excluded.code,name=excluded.name,short_name=excluded.short_name;
insert into public.bhxh_provinces(code,name) values
('01','Thành phố Hà Nội'),
('04','Tỉnh Cao Bằng'),
('08','Tỉnh Tuyên Quang'),
('11','Tỉnh Điện Biên'),
('12','Tỉnh Lai Châu'),
('14','Tỉnh Sơn La'),
('15','Tỉnh Lào Cai'),
('19','Tỉnh Thái Nguyên'),
('20','Tỉnh Lạng Sơn'),
('22','Tỉnh Quảng Ninh'),
('24','Tỉnh Bắc Ninh'),
('25','Tỉnh Phú Thọ'),
('31','Thành phố Hải Phòng'),
('33','Tỉnh Hưng Yên'),
('37','Tỉnh Ninh Bình'),
('38','Tỉnh Thanh Hóa'),
('40','Tỉnh Nghệ An'),
('42','Tỉnh Hà Tĩnh'),
('44','Tỉnh Quảng Trị'),
('46','Thành phố Huế'),
('48','Thành phố Đà Nẵng'),
('51','Tỉnh Quảng Ngãi'),
('52','Tỉnh Gia Lai'),
('56','Tỉnh Khánh Hòa'),
('66','Tỉnh Đắk Lắk'),
('68','Tỉnh Lâm Đồng'),
('75','Tỉnh Đồng Nai'),
('79','Thành phố Hồ Chí Minh'),
('80','Tỉnh Tây Ninh'),
('82','Tỉnh Đồng Tháp'),
('86','Tỉnh Vĩnh Long'),
('91','Tỉnh An Giang'),
('92','Thành phố Cần Thơ'),
('96','Tỉnh Cà Mau')
on conflict(code) do update set name=excluded.name;
create table if not exists public.bhxh_agencies (
 id uuid primary key, name text not null, address text not null, phone text not null,
 province_code text not null references public.bhxh_provinces(code), agency_code text not null,
 memo_template text not null default 'BHXH 103 00 {{ma_don_vi}} {{ma_co_quan}} DONG BHXH {{ky}}',
 notes text not null default '', accounts jsonb not null default '[]', areas jsonb not null default '[]',
 is_active boolean not null default true, version integer not null default 1,
 created_by uuid not null references public.app_users(id), updated_by uuid not null references public.app_users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(jsonb_typeof(accounts)='array' and jsonb_typeof(areas)='array')
);
create unique index if not exists bhxh_agency_active_code on public.bhxh_agencies(agency_code) where is_active;
create index if not exists bhxh_agencies_areas on public.bhxh_agencies using gin(areas);
create table if not exists public.bhxh_client_receivers (
 client_id uuid primary key references public.clients(id), agency_id uuid references public.bhxh_agencies(id),
 account_id uuid, version integer not null default 1, updated_by uuid not null references public.app_users(id),
 updated_at timestamptz not null default now(), check((agency_id is null)=(account_id is null))
);
create table if not exists public.bhxh_directory_events (
 request_id uuid primary key, entity text not null, entity_id uuid not null, actor_id uuid not null references public.app_users(id),
 actor_name text not null, payload jsonb not null, snapshot jsonb not null, created_at timestamptz not null default now()
);
alter table public.payment_followups add column if not exists transfer_details jsonb not null default '{}';
alter table public.bhxh_banks enable row level security;
alter table public.bhxh_provinces enable row level security;
alter table public.bhxh_agencies enable row level security;
alter table public.bhxh_client_receivers enable row level security;
alter table public.bhxh_directory_events enable row level security;
revoke all on public.bhxh_banks,public.bhxh_provinces,public.bhxh_agencies,public.bhxh_client_receivers,public.bhxh_directory_events from public,anon,authenticated;

create or replace function public.bhxh_agency_portal(p_staff_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 return jsonb_build_object('agencies',coalesce((select jsonb_agg(to_jsonb(a) order by a.is_active desc,a.name) from bhxh_agencies a),'[]'::jsonb),
  'receivers',coalesce((select jsonb_agg(to_jsonb(r)) from bhxh_client_receivers r where bhxh_client_access(p_staff_id,r.client_id)),'[]'::jsonb));
end $$;

create or replace function public.save_bhxh_directory(p_staff_id uuid,p_request_id uuid,p_entity text,p_record jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor text; rid uuid; previous_version integer; snap jsonb; a bhxh_agencies%rowtype; r bhxh_client_receivers%rowtype;
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
  select * into r from bhxh_client_receivers where client_id=rid for update;
  previous_version:=coalesce(r.version,0);
  if (p_record->>'version')::integer is distinct from previous_version then raise exception 'Cơ sở của khách vừa được cập nhật. Hãy làm mới.'; end if;
  r.client_id:=rid; r.agency_id:=nullif(p_record->>'agency_id','')::uuid; r.account_id:=nullif(p_record->>'account_id','')::uuid;
  if (r.agency_id is null)<>(r.account_id is null) then raise exception 'Chọn cả cơ sở và tài khoản.'; end if;
  if r.agency_id is not null then
   perform 1 from bhxh_agencies where id=r.agency_id and is_active and exists(select 1 from jsonb_array_elements(accounts) x where x->>'id'=r.account_id::text) for share;
   if not found then raise exception 'Cơ sở hoặc tài khoản không còn sử dụng. Hãy chọn lại.'; end if;
  end if;
  r.version:=previous_version+1; r.updated_by:=p_staff_id; r.updated_at:=now();
  insert into bhxh_client_receivers select r.* on conflict(client_id) do update set agency_id=excluded.agency_id,account_id=excluded.account_id,version=excluded.version,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  snap:=to_jsonb(r);
 end if;
 insert into bhxh_directory_events(request_id,entity,entity_id,actor_id,actor_name,payload,snapshot) values(p_request_id,p_entity,rid,p_staff_id,actor,p_record,snap);
 return snap;
exception when unique_violation then raise exception 'Mã cơ sở BHXH này đang được sử dụng. Hãy kiểm tra cơ sở đã có.';
end $$;

create or replace function public.bhxh_transfer_snapshot(p_agency_id uuid,p_account_id uuid,p_version integer,p_unit_code text,p_memo text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a bhxh_agencies%rowtype; account jsonb; bank bhxh_banks%rowtype;
begin
 select * into a from bhxh_agencies where id=p_agency_id and is_active for share;
 if not found or a.version is distinct from p_version then raise exception 'Thông tin cơ sở vừa thay đổi hoặc đã ngừng sử dụng. Hãy làm mới trước khi soạn thông tin đóng tiền.'; end if;
 select x into account from jsonb_array_elements(a.accounts) x where x->>'id'=p_account_id::text;
 if account is null then raise exception 'Tài khoản nhận không còn trong cơ sở. Hãy chọn lại.'; end if;
 if nullif(trim(p_unit_code),'') is null then raise exception 'Cập nhật mã đơn vị BHXH của khách trước khi soạn thông tin đóng tiền.'; end if;
 if length(trim(coalesce(p_memo,''))) not between 1 and 500 or p_memo like '%{{%' or p_memo like '%}}%' then raise exception 'Điền đủ cú pháp chuyển khoản, kiểm tra mã đơn vị, mã cơ sở và kỳ đóng.'; end if;
 select * into bank from bhxh_banks where bin=account->>'bank_bin';
 return jsonb_build_object('agency_id',a.id,'agency_name',a.name,'agency_version',a.version,'agency_code',a.agency_code,'account_id',p_account_id,
  'bank_bin',bank.bin,'bank_name',bank.name,'bank_short_name',bank.short_name,'account_no',account->>'account_no',
  'account_name',account->>'account_name','branch',account->>'branch','unit_code',trim(p_unit_code),'memo',trim(p_memo));
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
   'ins_code',to_jsonb(c)->>'ins_code','contact_name',c.contact_name,'contact_phone',c.contact_phone,
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
  r.proof_file:=''; r.transfer_details:='{}';
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
 if r.kind='bhxh' and p_action in ('save','notify') and p_record ? 'receiver_agency_id' then
  if nullif(p_record->>'receiver_agency_id','') is null then r.transfer_details:='{}';
  else r.transfer_details:=bhxh_transfer_snapshot((p_record->>'receiver_agency_id')::uuid,(p_record->>'receiver_account_id')::uuid,
   (p_record->>'receiver_version')::integer,(select to_jsonb(c)->>'ins_code' from clients c where c.id=r.client_id),p_record->>'transfer_memo'); end if;
 elsif r.kind<>'bhxh' then r.transfer_details:='{}'; end if;
 if p_action in ('notify','promise','reopen') and (r.next_reminder_on is null or r.next_reminder_on<today) then raise exception 'Ngày nhắc tiếp theo phải từ hôm nay.'; end if;
 r.version:=r.version+1; r.updated_by:=p_staff_id; r.updated_at:=now();
 if old_row.id is null then
  begin
   insert into payment_followups select r.*;
  exception when unique_violation then raise exception 'Đã có khoản cho khách, loại và kỳ này. Hãy kiểm tra cả mục Đã đóng / Ngừng theo dõi.'; end;
 else
  begin
   update payment_followups set kind=r.kind,period=r.period,amount=r.amount,due_on=r.due_on,next_reminder_on=r.next_reminder_on,
    status=r.status,transfer_details=r.transfer_details,proof_file=r.proof_file,promised_on=r.promised_on,paid_on=r.paid_on,payment_reference=r.payment_reference,
    last_notified_at=r.last_notified_at,notification_count=r.notification_count,notes=r.notes,
    version=r.version,updated_by=r.updated_by,updated_at=r.updated_at where id=r.id;
  exception when unique_violation then raise exception 'Đã có khoản cho khách, loại và kỳ này.'; end;
 end if;
 insert into payment_followup_events(id,followup_id,actor_id,actor_name,action,note,snapshot)
 values(p_request_id,r.id,p_staff_id,actor,p_action,note_text,to_jsonb(r));
 return to_jsonb(r);
end $$;
revoke all on function public.bhxh_transfer_snapshot(uuid,uuid,integer,text,text) from public,anon,authenticated;
revoke all on function public.bhxh_agency_portal(uuid),public.save_bhxh_directory(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bhxh_agency_portal(uuid),public.save_bhxh_directory(uuid,uuid,text,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
