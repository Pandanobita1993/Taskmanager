-- TaskFlow device-profile mode (no email login)
-- Run after supabase-security-migration.sql to restore the original device setup flow.

begin;

create extension if not exists pgcrypto;

drop trigger if exists on_auth_user_created on auth.users;

create table if not exists public.app_secrets (
  key text primary key,
  salt text not null,
  secret_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

insert into public.app_secrets(key, salt, secret_hash)
values (
  'admin_password',
  '2c2a4316ac6cf65d31507b949fbaa4e0',
  '3c41b04c473f082cafe32c9b419f40cca740c8016ed126fa404d72a73b253d83'
)
on conflict (key) do nothing;

create or replace function public.verify_admin_password(candidate text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.app_secrets
    where key = 'admin_password'
      and secret_hash = encode(digest(salt || candidate, 'sha256'), 'hex')
  );
$$;

revoke all on function public.verify_admin_password(text) from public;
grant execute on function public.verify_admin_password(text) to anon, authenticated;

-- The app intentionally identifies staff by a profile locked in localStorage.
-- These policies restore access without an email session.
drop policy if exists "Authenticated users can read active clients" on public.clients;
drop policy if exists "Authenticated users can add clients" on public.clients;
drop policy if exists "Assigned users can update clients" on public.clients;
drop policy if exists "Admins can archive clients" on public.clients;
drop policy if exists "Users can read assigned tasks" on public.tasks;
drop policy if exists "Users can create their tasks" on public.tasks;
drop policy if exists "Users can update assigned tasks" on public.tasks;
drop policy if exists "Admins can delete tasks" on public.tasks;
drop policy if exists "Authenticated users can read staff" on public.app_users;
drop policy if exists "Users can update own profile" on public.app_users;
drop policy if exists "Admins can add staff" on public.app_users;
drop policy if exists "Admins can delete staff" on public.app_users;
drop policy if exists "Authenticated users can read report settings" on public.report_settings;
drop policy if exists "Admins can manage report settings" on public.report_settings;

drop policy if exists "Device profiles can manage clients" on public.clients;
create policy "Device profiles can manage clients"
  on public.clients for all to anon, authenticated
  using (true) with check (true);

drop policy if exists "Device profiles can manage tasks" on public.tasks;
create policy "Device profiles can manage tasks"
  on public.tasks for all to anon, authenticated
  using (true) with check (true);

drop policy if exists "Device profiles can manage staff" on public.app_users;
create policy "Device profiles can manage staff"
  on public.app_users for all to anon, authenticated
  using (true) with check (true);

drop policy if exists "Device profiles can manage report settings" on public.report_settings;
create policy "Device profiles can manage report settings"
  on public.report_settings for all to anon, authenticated
  using (true) with check (true);

drop policy if exists "Users can read own proofs" on storage.objects;
drop policy if exists "Users can upload own proofs" on storage.objects;
drop policy if exists "Users can update own proofs" on storage.objects;
drop policy if exists "Users can delete own proofs" on storage.objects;

drop policy if exists "Device profiles can read proofs" on storage.objects;
create policy "Device profiles can read proofs"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'task-proofs');

drop policy if exists "Device profiles can upload proofs" on storage.objects;
create policy "Device profiles can upload proofs"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'task-proofs' and (storage.foldername(name))[1] = 'public');

commit;
