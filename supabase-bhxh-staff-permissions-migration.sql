-- Run the ENTIRE file after supabase-bhxh-units-migration.sql.
-- BHXH department OR the additional role 'bhxh' can manage all BHXH clients.
-- Changes permissions/functions only; preserves assignments, balances and audit history.
begin;

create or replace function public.bhxh_staff_can_manage(p_staff_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from app_users u where u.id=p_staff_id and u.is_active
  and (u.department='BHXH' or 'bhxh'=any(coalesce(u.roles,'{}'::text[]))))
$$;
revoke all on function public.bhxh_staff_can_manage(uuid) from public,anon,authenticated;

create or replace function public.bhxh_units_portal(p_staff_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 return jsonb_build_object('can_manage_bhxh',bhxh_staff_can_manage(p_staff_id),'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'tax_code',c.tax_code,
  'archived',c.archived_at is not null,'participating',coalesce('BHXH'=any(c.services),false),
  'can_edit_units',bhxh_staff_can_manage(p_staff_id),'units',bhxh_units_json(c.id)) order by c.name)
  from clients c where bhxh_client_access(p_staff_id,c.id)),'[]'::jsonb));
end $$;

create or replace function public.bhxh_ledger_portal(p_staff_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 return jsonb_build_object('can_manage_bhxh',bhxh_staff_can_manage(p_staff_id),'today',(now() at time zone 'Asia/Ho_Chi_Minh')::date,
  'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'tax_code',c.tax_code,'ins_code',to_jsonb(c)->>'ins_code',
   'units',bhxh_units_json(c.id),'archived',c.archived_at is not null,'participating',c.archived_at is null and coalesce('BHXH'=any(c.services),false)) order by c.name) from clients c where bhxh_client_access(p_staff_id,c.id)),'[]'::jsonb),
  'periods',coalesce((select jsonb_agg(to_jsonb(b)||jsonb_build_object('client_name',c.name,'tax_code',c.tax_code,'unit_kind',u.kind,'unit_code',coalesce(nullif(b.unit_code,''),u.code)) order by b.period_on desc,c.name)
   from clients c join bhxh_client_units u on u.client_id=c.id cross join lateral bhxh_unit_balances(u.id) b where bhxh_client_access(p_staff_id,c.id)),'[]'::jsonb),
  'payments',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('client_name',c.name,'unit_kind',u.kind,'unit_code',coalesce(nullif(p.unit_code,''),u.code),'reporter_name',(select u.name from app_users u where u.id=p.created_by)) order by p.paid_on desc,p.created_at desc)
   from bhxh_payments p join bhxh_client_units u on u.id=p.unit_id join clients c on c.id=p.client_id where bhxh_client_access(p_staff_id,c.id)),'[]'::jsonb));
end $$;

create or replace function public.bhxh_agency_portal(p_staff_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from app_users where id=p_staff_id and is_active) then raise exception 'Không xác định được nhân viên đang hoạt động.'; end if;
 return jsonb_build_object('can_manage_bhxh',bhxh_staff_can_manage(p_staff_id),
  'agencies',coalesce((select jsonb_agg(to_jsonb(a) order by a.is_active desc,a.name) from bhxh_agencies a),'[]'::jsonb),
  'receivers',coalesce((select jsonb_agg(to_jsonb(r)) from bhxh_client_receivers r where bhxh_client_access(p_staff_id,r.client_id)),'[]'::jsonb));
end $$;

-- Keep the installed validation, locking, retry protection and audit code intact.
-- Refuse to patch an unexpected function body, rather than replacing unknown code.
do $patch$
declare
 signature text; definition text; target regprocedure;
 actor_check text := 'if actor is null then raise exception ''Không xác định được nhân viên đang hoạt động.''; end if;';
 permission_check text := 'if not bhxh_staff_can_manage(p_staff_id) then raise exception ''Cần nghiệp vụ BHXH hoặc kiêm nhiệm BHXH để cập nhật dữ liệu BHXH.''; end if;';
 assignment_check text := 'if not exists(select 1 from clients where id=cid and insurance_person=actor) then raise exception ''Chỉ nhân viên phụ trách BHXH của khách được cập nhật mã đơn vị.''; end if;';
 client_check text := 'if not bhxh_client_access(p_staff_id,cid) then raise exception ''Khách hàng ngoài phạm vi BHXH.''; end if;';
begin
 foreach signature in array array[
  'public.save_bhxh_unit(uuid,uuid,jsonb)',
  'public.save_bhxh_ledger(uuid,uuid,text,text,jsonb)',
  'public.save_bhxh_directory(uuid,uuid,text,jsonb)'
 ] loop
  target := to_regprocedure(signature);
  if target is null then raise exception 'Thiếu hàm %. Chạy migration mã đơn vị trước.',signature; end if;
  definition := pg_get_functiondef(target);
  if strpos(definition,permission_check)=0 then
   if strpos(definition,actor_check)=0 then raise exception 'Cấu trúc hàm % khác dự kiến; chưa thay đổi quyền.',signature; end if;
   definition := replace(definition,actor_check,actor_check||E'\n '||permission_check);
  end if;
  if signature='public.save_bhxh_unit(uuid,uuid,jsonb)' then
   if strpos(definition,assignment_check)>0 then
    definition := replace(definition,assignment_check,client_check);
   elsif strpos(definition,client_check)=0 then
    raise exception 'Cấu trúc quyền mã đơn vị khác dự kiến; chưa thay đổi quyền.';
   end if;
  end if;
  execute definition;
 end loop;
end $patch$;

revoke all on function public.bhxh_units_portal(uuid),public.bhxh_ledger_portal(uuid),public.bhxh_agency_portal(uuid) from public;
grant execute on function public.bhxh_units_portal(uuid),public.bhxh_ledger_portal(uuid),public.bhxh_agency_portal(uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;
