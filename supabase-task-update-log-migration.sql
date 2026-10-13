-- TaskFlow task editing and audit history
-- Run after supabase-no-login-migration.sql.

begin;

alter table public.tasks
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.task_update_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  changed_by_id text,
  changed_by_name text not null default 'Hệ thống',
  action text not null default 'Cập nhật công việc',
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists task_update_logs_task_id_created_at_idx
  on public.task_update_logs(task_id, created_at desc);

alter table public.task_update_logs enable row level security;
revoke insert, update, delete on public.task_update_logs from anon, authenticated;
grant select on public.task_update_logs to anon, authenticated;

drop policy if exists "Device profiles can read task update logs" on public.task_update_logs;
create policy "Device profiles can read task update logs"
  on public.task_update_logs for select to anon, authenticated
  using (true);

create or replace function public.log_task_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tracked_fields text[] := array[
    'content', 'contact_person', 'info_provided', 'info_pending', 'notes',
    'dossier_code', 'dossier_progress', 'is_urgent', 'status',
    'resolution_note', 'completed_at', 'proof_file', 'proof_image'
  ];
  field_name text;
  before_row jsonb := to_jsonb(old);
  after_row jsonb := to_jsonb(new);
  changed_fields jsonb := '{}'::jsonb;
begin
  foreach field_name in array tracked_fields loop
    if before_row -> field_name is distinct from after_row -> field_name then
      if field_name in ('proof_file', 'proof_image') then
        changed_fields := changed_fields || jsonb_build_object(
          field_name,
          jsonb_build_object(
            'old', to_jsonb(coalesce(before_row ->> field_name, '') <> ''),
            'new', to_jsonb(coalesce(after_row ->> field_name, '') <> '')
          )
        );
      else
        changed_fields := changed_fields || jsonb_build_object(
          field_name,
          jsonb_build_object(
            'old', before_row -> field_name,
            'new', after_row -> field_name
          )
        );
      end if;
    end if;
  end loop;

  if changed_fields <> '{}'::jsonb then
    insert into public.task_update_logs(
      task_id,
      changed_by_id,
      changed_by_name,
      action,
      changes
    ) values (
      new.id,
      nullif(current_setting('taskflow.changed_by_id', true), ''),
      coalesce(nullif(current_setting('taskflow.changed_by_name', true), ''), 'Hệ thống'),
      coalesce(nullif(current_setting('taskflow.action', true), ''), 'Cập nhật công việc'),
      changed_fields
    );
  end if;

  return new;
end;
$$;

drop trigger if exists task_update_audit on public.tasks;
create trigger task_update_audit
  after update on public.tasks
  for each row execute function public.log_task_update();

create or replace function public.update_task_with_log(
  p_task_id uuid,
  p_changes jsonb,
  p_changed_by_id text,
  p_changed_by_name text,
  p_action text
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_task public.tasks%rowtype;
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'Dữ liệu cập nhật không hợp lệ';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_changes) as requested(field_name)
    where requested.field_name <> all(array[
      'content', 'contact_person', 'info_provided', 'info_pending', 'notes',
      'dossier_code', 'dossier_progress', 'is_urgent', 'status',
      'resolution_note', 'completed_at', 'proof_file', 'proof_image'
    ])
  ) then
    raise exception 'Có trường dữ liệu không được phép cập nhật';
  end if;

  if p_changes ? 'status'
     and (p_changes ->> 'status') not in ('received', 'in_progress', 'completed', 'failed') then
    raise exception 'Trạng thái công việc không hợp lệ';
  end if;

  perform set_config('taskflow.changed_by_id', coalesce(p_changed_by_id, ''), true);
  perform set_config('taskflow.changed_by_name', coalesce(nullif(trim(p_changed_by_name), ''), 'Hệ thống'), true);
  perform set_config('taskflow.action', coalesce(nullif(trim(p_action), ''), 'Cập nhật công việc'), true);

  update public.tasks
  set
    content = case when p_changes ? 'content' then p_changes ->> 'content' else content end,
    contact_person = case when p_changes ? 'contact_person' then p_changes ->> 'contact_person' else contact_person end,
    info_provided = case when p_changes ? 'info_provided' then p_changes ->> 'info_provided' else info_provided end,
    info_pending = case when p_changes ? 'info_pending' then p_changes ->> 'info_pending' else info_pending end,
    notes = case when p_changes ? 'notes' then p_changes ->> 'notes' else notes end,
    dossier_code = case when p_changes ? 'dossier_code' then nullif(trim(p_changes ->> 'dossier_code'), '') else dossier_code end,
    dossier_progress = case when p_changes ? 'dossier_progress' then nullif(trim(p_changes ->> 'dossier_progress'), '') else dossier_progress end,
    is_urgent = case when p_changes ? 'is_urgent' then coalesce((p_changes ->> 'is_urgent')::boolean, false) else is_urgent end,
    status = case when p_changes ? 'status' then p_changes ->> 'status' else status end,
    resolution_note = case when p_changes ? 'resolution_note' then p_changes ->> 'resolution_note' else resolution_note end,
    completed_at = case when p_changes ? 'completed_at' then (p_changes ->> 'completed_at')::timestamptz else completed_at end,
    proof_file = case when p_changes ? 'proof_file' then p_changes ->> 'proof_file' else proof_file end,
    proof_image = case when p_changes ? 'proof_image' then p_changes ->> 'proof_image' else proof_image end,
    updated_at = now()
  where id = p_task_id
  returning * into updated_task;

  if updated_task.id is null then
    raise exception 'Không tìm thấy công việc';
  end if;

  return updated_task;
end;
$$;

revoke all on function public.update_task_with_log(uuid, jsonb, text, text, text) from public;
grant execute on function public.update_task_with_log(uuid, jsonb, text, text, text) to anon, authenticated;

commit;
