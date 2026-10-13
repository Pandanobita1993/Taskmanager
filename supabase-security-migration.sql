-- TaskFlow production security migration
-- Run once in Supabase SQL Editor before deploying the matching frontend.

begin;

alter table public.app_users
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null,
  add column if not exists email text,
  add column if not exists is_admin boolean not null default false,
  add column if not exists is_active boolean not null default true;

alter table public.clients
  add column if not exists archived_at timestamptz;

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_supported_user_id_idx on public.tasks(supported_user_id);
create index if not exists tasks_client_id_idx on public.tasks(client_id);
create index if not exists clients_archived_at_idx on public.clients(archived_at);
create unique index if not exists app_users_email_unique_idx
  on public.app_users(lower(email)) where email is not null;

create or replace function public.prevent_duplicate_active_tax_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.clients
    where lower(trim(tax_code)) = lower(trim(new.tax_code))
      and archived_at is null
      and id <> coalesce(new.id, gen_random_uuid())
  ) then
    raise exception 'Mã số thuế đã tồn tại trong danh sách khách hàng';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_duplicate_active_tax_code on public.clients;
create trigger prevent_duplicate_active_tax_code
  before insert or update of tax_code, archived_at on public.clients
  for each row execute procedure public.prevent_duplicate_active_tax_code();

-- Preserve task history when a client is archived or removed.
alter table public.tasks drop constraint if exists tasks_client_id_fkey;
alter table public.tasks
  add constraint tasks_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete restrict;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.app_users
  where auth_user_id = auth.uid() and is_active = true
  limit 1;
$$;

create or replace function public.current_app_user_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select name from public.app_users
  where auth_user_id = auth.uid() and is_active = true
  limit 1;
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select is_admin from public.app_users
    where auth_user_id = auth.uid() and is_active = true
    limit 1
  ), false);
$$;

revoke all on function public.current_app_user_id() from public;
revoke all on function public.current_app_user_name() from public;
revoke all on function public.is_app_admin() from public;
grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.current_app_user_name() to authenticated;
grant execute on function public.is_app_admin() to authenticated;

-- Link a new Supabase Auth account to an existing employee with the same name,
-- or create a new employee profile. The first registered account becomes admin.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_name text;
  existing_profile_id uuid;
  make_admin boolean;
begin
  requested_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  if requested_name is null then
    requested_name := split_part(coalesce(new.email, 'Người dùng'), '@', 1);
  end if;

  select not exists(select 1 from public.app_users where is_admin = true)
    into make_admin;

  select id into existing_profile_id
  from public.app_users
  where auth_user_id is null and lower(name) = lower(requested_name)
  order by created_at
  limit 1;

  if existing_profile_id is not null then
    update public.app_users
    set auth_user_id = new.id,
        email = new.email,
        is_admin = is_admin or make_admin,
        is_active = true
    where id = existing_profile_id;
  else
    raise exception 'Không tìm thấy nhân sự phù hợp. Quản trị viên cần tạo nhân sự trước khi đăng ký.';
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

alter table public.clients enable row level security;
alter table public.tasks enable row level security;
alter table public.app_users enable row level security;
alter table public.report_settings enable row level security;

drop policy if exists "Cho phép truy cập tự do clients" on public.clients;
drop policy if exists "Cho phép truy cập tự do tasks" on public.tasks;
drop policy if exists "Cho phép truy cập tự do app_users" on public.app_users;
drop policy if exists "Cho phép truy cập tự do report_settings" on public.report_settings;

drop policy if exists "Authenticated users can read active clients" on public.clients;
create policy "Authenticated users can read active clients"
  on public.clients for select to authenticated
  using (archived_at is null or public.is_app_admin());

drop policy if exists "Authenticated users can add clients" on public.clients;
create policy "Authenticated users can add clients"
  on public.clients for insert to authenticated
  with check (public.current_app_user_id() is not null);

drop policy if exists "Assigned users can update clients" on public.clients;
create policy "Assigned users can update clients"
  on public.clients for update to authenticated
  using (
    public.is_app_admin()
    or accounting_person = public.current_app_user_name()
    or insurance_person = public.current_app_user_name()
    or exists (
      select 1 from unnest(coalesce(services, '{}')) service
      where service in (
        'Rà soát:' || public.current_app_user_name(),
        'Đầu tư:' || public.current_app_user_name()
      )
    )
  )
  with check (archived_at is null or public.is_app_admin());

drop policy if exists "Admins can archive clients" on public.clients;

drop policy if exists "Users can read assigned tasks" on public.tasks;
create policy "Users can read assigned tasks"
  on public.tasks for select to authenticated
  using (
    public.is_app_admin()
    or user_id in (public.current_app_user_id()::text, public.current_app_user_name())
    or supported_user_id in (public.current_app_user_id()::text, public.current_app_user_name())
  );

drop policy if exists "Users can create their tasks" on public.tasks;
create policy "Users can create their tasks"
  on public.tasks for insert to authenticated
  with check (
    user_id in (public.current_app_user_id()::text, public.current_app_user_name())
    or public.is_app_admin()
  );

drop policy if exists "Users can update assigned tasks" on public.tasks;
create policy "Users can update assigned tasks"
  on public.tasks for update to authenticated
  using (
    public.is_app_admin()
    or user_id in (public.current_app_user_id()::text, public.current_app_user_name())
    or supported_user_id in (public.current_app_user_id()::text, public.current_app_user_name())
  )
  with check (
    public.is_app_admin()
    or user_id in (public.current_app_user_id()::text, public.current_app_user_name())
    or supported_user_id in (public.current_app_user_id()::text, public.current_app_user_name())
  );

drop policy if exists "Admins can delete tasks" on public.tasks;
create policy "Admins can delete tasks"
  on public.tasks for delete to authenticated
  using (public.is_app_admin());

drop policy if exists "Authenticated users can read staff" on public.app_users;
create policy "Authenticated users can read staff"
  on public.app_users for select to authenticated
  using (is_active = true or public.is_app_admin());

drop policy if exists "Users can update own profile" on public.app_users;
create policy "Users can update own profile"
  on public.app_users for update to authenticated
  using (auth_user_id = auth.uid() or public.is_app_admin())
  with check (auth_user_id = auth.uid() or public.is_app_admin());

drop policy if exists "Admins can add staff" on public.app_users;
create policy "Admins can add staff"
  on public.app_users for insert to authenticated
  with check (public.is_app_admin());

drop policy if exists "Admins can delete staff" on public.app_users;
create policy "Admins can delete staff"
  on public.app_users for delete to authenticated
  using (public.is_app_admin() and auth_user_id is null);

drop policy if exists "Authenticated users can read report settings" on public.report_settings;
create policy "Authenticated users can read report settings"
  on public.report_settings for select to authenticated
  using (true);

drop policy if exists "Admins can manage report settings" on public.report_settings;
create policy "Admins can manage report settings"
  on public.report_settings for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-proofs',
  'task-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own proofs" on storage.objects;
create policy "Users can read own proofs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'task-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_app_admin()
      or exists (select 1 from public.tasks where proof_file = name)
    )
  );

drop policy if exists "Users can upload own proofs" on storage.objects;
create policy "Users can upload own proofs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own proofs" on storage.objects;
create policy "Users can update own proofs"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'task-proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_app_admin())
  );

drop policy if exists "Users can delete own proofs" on storage.objects;
create policy "Users can delete own proofs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'task-proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_app_admin())
  );

commit;
