// Install the isolated SQL test runtime first:
// npm install --prefix "$env:TEMP/anan-recurrence-qa" --no-audit --no-fund @electric-sql/pglite
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { nextRecurringDate, vietnamToday, renderRecurringContent } from '../src/lib/recurringTasks.ts';
const isolatedRequire = createRequire(path.join(os.tmpdir(), 'anan-recurrence-qa', 'package.json'));
const { PGlite } = isolatedRequire('@electric-sql/pglite');
const db = new PGlite();
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
const scalar = async (sql, args = []) => Object.values((await rows(sql, args))[0])[0];
await db.exec(`create role anon; create role authenticated;
 create table app_users(id uuid primary key default gen_random_uuid(),name text,is_active boolean default true);
 create table clients(id uuid primary key default gen_random_uuid(),name text,tax_code text,contact_name text,contact_phone text,
  services text[] default '{}',accounting_person text,insurance_person text,archived_at timestamptz);
 create table tasks(id uuid primary key default gen_random_uuid(),type text not null,client_id uuid references clients(id),user_id text,
  contact_person text,content text,notes text,is_urgent boolean default false,status text,task_category text,action_type text);
`);
const migration = await fs.readFile(new URL('../supabase-recurring-tasks-migration.sql', import.meta.url), 'utf8');
const core = migration.split('-- CRON INSTALL:')[0] + '\ncommit;';
await db.exec(core);
await db.exec(core); // Rerunning the installation must preserve existing data and constraints.

const cases = [
 ['monthly',31,1,'2024-02-01','2024-02-29'], ['monthly',31,1,'2025-02-01','2025-02-28'],
 ['monthly',31,1,'2025-02-28','2025-02-28'], ['monthly',31,1,'2025-03-01','2025-03-31'],
 ['monthly',5,1,'2026-10-17','2026-11-05'], ['monthly',5,1,'2026-12-06','2027-01-05'],
 ['weekly',5,7,'2026-10-17','2026-10-18'], ['weekly',5,1,'2026-10-19','2026-10-19'],
 ['daily',5,1,'2026-10-17','2026-10-17'],
];
for (const [frequency, month_day, week_day, start_on, expected] of cases) {
 const actual = await scalar('select recurring_next_date($1,$2,$3,$4)::text', [frequency, month_day, week_day, start_on]);
 assert.equal(actual, expected);
 assert.equal(nextRecurringDate({ frequency, month_day, week_day, start_on, end_on: '' }, start_on), expected, 'UI preview agrees with actual SQL');
}
assert.equal(vietnamToday(new Date('2026-10-16T18:00:00Z')), '2026-10-17');
assert.equal(renderRecurringContent('BHXH {{thang}}/{{nam}} · {{ngay}}', '2026-11-05'), 'BHXH 11/2026 · 05/11/2026');
await assert.rejects(scalar("select recurring_next_date('monthly',32,null,'2026-01-01')"), /không hợp lệ/);

const staff = await scalar("insert into app_users(name) values('QA A') returning id");
const other = await scalar("insert into app_users(name) values('QA B') returning id");
const a = await scalar("insert into clients(name,tax_code,insurance_person) values('A','QA01','QA A') returning id");
const b = await scalar("insert into clients(name,tax_code,insurance_person) values('B','QA02','QA A') returning id");
const outsider = await scalar("insert into clients(name,tax_code,insurance_person) values('C','QA03','QA B') returning id");
const year = new Date().getUTCFullYear() + 2;
const jan = `${year}-01-05`; const feb = `${year}-02-05`; const march = `${year}-03-05`;
const template = { request_id: crypto.randomUUID(), frequency: 'monthly', month_day: 5, week_day: null,
 start_on: `${year}-01-01`, end_on: `${year}-03-31`, content: 'Nhắc BHXH {{thang}}/{{nam}}', notes: 'Gọi khách', action_type: 'bhxh' };
const save = (user, form, clients) => scalar('select save_recurring_tasks($1,$2::jsonb,$3::uuid[])', [user, JSON.stringify(form), clients]);
const first = await save(staff, template, [a,b]);
assert.equal(first.ids.length, 2);
assert.equal(first.generation.created_count, 0, 'No jobs before first due date');
await save(staff, template, [a,b]);
assert.equal(await scalar('select count(*)::int from recurring_task_templates'), 2, 'A retried request cannot duplicate templates');
await assert.rejects(save(staff, { ...template, request_id: crypto.randomUUID() }, [a,outsider]), /phạm vi/);
assert.equal(await scalar('select count(*)::int from recurring_task_templates'), 2, 'Bulk save rolls back fully if one customer is outside scope');
const otherRule = await save(other, { ...template, request_id: crypto.randomUUID() }, [outsider]);
assert.equal((await scalar('select generate_recurring_tasks($1,$2)', [jan,staff])).created_count, 2);
assert.equal(await scalar('select count(*)::int from tasks'), 2, 'Staff sync does not generate another employee jobs');
const generated = await rows('select * from tasks order by client_id');
assert.ok(generated.every(t => t.type === 'normal' && t.status === 'received' && t.user_id === staff && t.content === `Nhắc BHXH 01/${year}`));
assert.ok(generated.every(t => t.intake_date.toISOString().slice(0,10) === jan));
assert.equal((await scalar('select generate_recurring_tasks($1,$2)', [jan,staff])).created_count, 0, 'Second invocation creates no duplicates');

await db.query("update tasks set status='completed' where id=$1", [generated[0].id]);
await scalar('select set_recurring_task_active($1,$2,false)', [staff, first.ids[1]]);
assert.equal((await scalar('select generate_recurring_tasks($1,$2)', [feb,staff])).created_count, 1, 'Paused rule does not generate; completed prior task does not suppress next month');
await save(staff, { ...template, id:first.ids[0], content:'Nội dung mới {{thang}}/{{nam}}' }, [a]);
assert.equal(await scalar('select content from tasks where id=$1', [generated[0].id]), `Nhắc BHXH 01/${year}`, 'Editing template never rewrites existing work');
await scalar('select generate_recurring_tasks($1,$2)', [march,staff]);
assert.equal((await scalar('select generate_recurring_tasks($1,$2)', [`${year}-05-05`,staff])).created_count, 0, 'End date prevents later occurrences');

await db.query('delete from tasks where id=$1', [generated[0].id]);
await db.query('update recurring_task_templates set next_run_on=$2 where id=$1', [first.ids[0],jan]);
assert.equal((await scalar('select generate_recurring_tasks($1,$2)', [jan,staff])).created_count, 0, 'Deleting an old job does not regenerate the same occurrence');
assert.equal(await scalar('select count(*)::int from recurring_task_occurrences where template_id=$1', [first.ids[0]]), 3);

await db.query('update clients set archived_at=now() where id=$1', [outsider]);
assert.equal((await scalar('select generate_recurring_tasks($1,$2)', [jan,other])).created_count, 0, 'Archived customer never receives a new job');
await db.query('update clients set archived_at=null where id=$1', [outsider]);
await db.query('update app_users set is_active=false where id=$1', [other]);
assert.equal((await scalar('select generate_recurring_tasks($1,$2)', [jan,other])).created_count, 0, 'Inactive employee never receives new jobs');
await assert.rejects(scalar('select set_recurring_task_active($1,$2,true)', [staff,otherRule.ids[0]]), /Không tìm thấy/);

const today = vietnamToday();
const paused = await save(staff, { ...template, request_id:crypto.randomUUID(), frequency:'daily', month_day:null, start_on:today, end_on:null }, [a]);
await scalar('select set_recurring_task_active($1,$2,false)', [staff,paused.ids[0]]);
await db.query("update recurring_task_templates set next_run_on=$2::date-10 where id=$1", [paused.ids[0],today]);
await scalar('select set_recurring_task_active($1,$2,true)', [staff,paused.ids[0]]);
assert.equal(await scalar('select count(*)::int from recurring_task_occurrences where template_id=$1', [paused.ids[0]]), 1, 'Resuming skips paused dates and does not duplicate today');

const portal = await scalar('select recurring_tasks_portal($1)', [staff]);
assert.equal(portal.scheduler_ready, false);
assert.ok(portal.templates.every(t => t.staff_id === staff));
assert.ok(!portal.clients.some(c => c.id === outsider));
assert.equal(await scalar("select has_function_privilege('anon','public.generate_recurring_tasks(date,uuid)','EXECUTE')"), false, 'Browser cannot generate for all staff or choose a future date');
assert.equal(await scalar("select has_table_privilege('anon','public.recurring_task_templates','INSERT')"), false, 'Templates writable only through validated RPC');

const failureStaff = await scalar("insert into app_users(name) values('QA FAILURE') returning id");
const failA = await scalar("insert into clients(name,tax_code,insurance_person) values('FAIL A','QAF1','QA FAILURE') returning id");
const failB = await scalar("insert into clients(name,tax_code,insurance_person) values('FAIL B','QAF2','QA FAILURE') returning id");
await save(failureStaff, { ...template, request_id:crypto.randomUUID(),end_on:jan }, [failA,failB]);
await db.query("update recurring_task_templates set content='QA_FAIL' where staff_id=$1 and client_id=$2", [failureStaff,failA]);
await db.exec(`create function qa_fail_task() returns trigger language plpgsql as $$begin
 if new.content='QA_FAIL' then raise exception 'QA intentional insertion failure'; end if; return new; end$$;
 create trigger qa_task_failure before insert on tasks for each row execute function qa_fail_task();`);
const failureResult = await scalar('select generate_recurring_tasks($1,$2)', [jan,failureStaff]);
assert.equal(failureResult.created_count, 1);
assert.equal(failureResult.failed_count, 1, 'One invalid template must not block other employees or customers');
assert.equal(await scalar('select count(*)::int from recurring_task_occurrences o join recurring_task_templates r on r.id=o.template_id where r.client_id=$1', [failA]), 0, 'A failed insertion rolls back its reservation');
await db.exec('drop trigger qa_task_failure on tasks;');
assert.equal((await scalar('select generate_recurring_tasks($1,$2)', [jan,failureStaff])).created_count, 1, 'Retry safely recovers only the failed occurrence');

const catchup = await save(failureStaff, { ...template,request_id:crypto.randomUUID(),frequency:'daily',month_day:null,start_on:`${year}-01-01`,end_on:`${year}-05-31` }, [failA]);
const through = `${year}-05-15`;
assert.equal((await scalar('select generate_recurring_tasks($1,$2)', [through,failureStaff])).created_count, 100);
const daysDue = await scalar('select $1::date-$2::date+1', [through,`${year}-01-01`]);
assert.equal((await scalar('select generate_recurring_tasks($1,$2)', [through,failureStaff])).created_count, daysDue-100);
assert.equal(await scalar('select count(*)::int from recurring_task_occurrences where template_id=$1',[catchup.ids[0]]), daysDue, 'Downtime catch-up stays bounded and creates each missed day once');
await db.close();
console.log('Passed real PostgreSQL tests: monthly/weekly/daily dates, leap years, scoped batch save, retries, generation, completion, pause/resume, immutable history, deleted-task deduplication, end date, archive/inactive staff, function privileges, per-rule failure recovery and bounded catch-up.');
