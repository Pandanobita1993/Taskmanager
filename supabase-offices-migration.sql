-- All existing staff belong to Can Tho. New staff can be assigned to Long An.
begin;

alter table public.app_users
  add column if not exists office text not null default 'Cần Thơ';

alter table public.app_users drop constraint if exists app_users_office_check;
alter table public.app_users add constraint app_users_office_check
  check (office in ('Cần Thơ', 'Long An'));

create index if not exists app_users_office_idx on public.app_users(office);

commit;
