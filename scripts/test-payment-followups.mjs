// Isolated PostgreSQL checks; no production connection or writes.
// Reuses the QA runtime installed for test:recurring (see README).
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { paymentFollowupUrgency, addFollowupDays } from '../src/lib/paymentFollowups.ts';
const qaRequire = createRequire(path.join(os.tmpdir(), 'anan-recurrence-qa', 'package.json'));
const { PGlite } = qaRequire('@electric-sql/pglite');
const db = new PGlite();
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
const scalar = async (sql, args = []) => Object.values((await rows(sql, args))[0])[0];
await db.exec(`create role anon; create role authenticated;
 create table app_users(id uuid primary key default gen_random_uuid(),name text,is_active boolean default true);
 create table clients(id uuid primary key default gen_random_uuid(),name text,tax_code text,contact_name text,contact_phone text,
  services text[] default '{}',accounting_person text,insurance_person text,archived_at timestamptz);
 create table tasks(id uuid primary key default gen_random_uuid());`);
const migration = await fs.readFile(new URL('../supabase-payment-followups-migration.sql', import.meta.url), 'utf8');
await db.exec(migration);
await db.exec(migration);
const staff = await scalar("insert into app_users(name) values('QA A') returning id");
const colleague = await scalar("insert into app_users(name) values('QA B') returning id");
const client = await scalar("insert into clients(name,tax_code,accounting_person,insurance_person) values('A','QA01','QA A','QA B') returning id");
const outsider = await scalar("insert into clients(name,tax_code,insurance_person) values('B','QA02','QA B') returning id");
const reviewer = await scalar("insert into clients(name,tax_code,services) values('C','QA03',ARRAY['Rà soát:QA A']) returning id");
const portal = (user = staff, summaryOnly = false) => scalar('select payment_followup_portal($1,$2)', [user, summaryOnly]);
const save = (action, record, user = staff, requestId = crypto.randomUUID()) => scalar('select save_payment_followup($1,$2,$3,$4::jsonb)', [user, requestId, action, JSON.stringify(record)]);
const history = (id, user = staff) => scalar('select payment_followup_history($1,$2)', [user,id]);
const today = (await portal()).today;
const tomorrow = addFollowupDays(today,1);
const yesterday = addFollowupDays(today,-1);
const base = { id: crypto.randomUUID(), version: 0, client_id: client, kind: 'bhxh', period: 'Tháng 10/2026',
 amount: '4500000', due_on: tomorrow, next_reminder_on: today, notes: 'Chờ khách', event_note: 'Khởi tạo' };
const request = crypto.randomUUID();
let r = await save('save', base, staff, request);
assert.equal(r.status, 'pending'); assert.equal(r.amount, 4500000);
assert.equal((await save('save', base, staff, request)).id, r.id, 'A network retry cannot create a second obligation');
assert.equal((await history(r.id)).length, 1);
await assert.rejects(save('save', { ...base,id: crypto.randomUUID(),period: '  THÁNG   10/2026 ' }), /Đã có khoản/);
await assert.rejects(save('save', { ...base,id: crypto.randomUUID(),client_id: outsider }), /phạm vi/);
for (const amount of ['-1','0.2','NaN','Infinity','1000000000000000']) {
 await assert.rejects(save('save', { ...base,id: crypto.randomUUID(),period: amount,amount }), /Số tiền/);
}
for (const patch of [{kind: 'unknown'}, {period: ''}, {due_on: null}, {next_reminder_on: null}, {notes: 'x'.repeat(5001)}]) {
 await assert.rejects(save('save', { ...base,id: crypto.randomUUID(),...patch }), /Kiểm tra/);
}
assert.equal((await portal()).records.length, 1);
assert.ok((await portal()).clients.some(c => c.id === reviewer), 'Review assignments are recognized');
assert.ok(!(await portal()).clients.some(c => c.id === outsider));
assert.equal((await portal()).summary.attention, 1);
assert.equal((await portal(staff,true)).records, undefined, 'Dashboard query omits full records');
const old = r;
r = await save('notify', { ...r,next_reminder_on: tomorrow,event_note: 'Nhắn Zalo' });
assert.equal(r.status, 'notified'); assert.equal(r.notification_count, 1); assert.ok(r.last_notified_at);
assert.equal((await portal()).summary.unpaid, 1, 'Notifying never completes a payment');
await assert.rejects(save('notify', { ...old,next_reminder_on: tomorrow }), /vừa được người khác/);
r = await save('promise', { ...r,promised_on: tomorrow,next_reminder_on: tomorrow }, colleague);
assert.equal(r.status, 'promised');
const notifyRequest = crypto.randomUUID();
const notifyPayload = { ...r,next_reminder_on: tomorrow,event_note: 'Nhắc lại' };
r = await save('notify', notifyPayload, staff, notifyRequest);
await save('notify', notifyPayload, staff, notifyRequest);
assert.equal((await portal()).records[0].notification_count, 2, 'Retrying the same notification does not increment twice');
assert.equal(r.status, 'promised', 'A reminder preserves the recorded promise');
assert.equal(r.promised_on, tomorrow);
await assert.rejects(save('promise', { ...r,promised_on: yesterday,next_reminder_on: tomorrow }), /Ngày khách hẹn/);
await assert.rejects(save('notify', { ...r,next_reminder_on: yesterday }), /Ngày nhắc/);
await assert.rejects(save('paid', { ...r,paid_on: tomorrow }), /ngày đã đóng/);
await assert.rejects(save('cancel', { ...r,event_note: '' }), /lý do/);
r = await save('paid', { ...r,paid_on: today,payment_reference: 'GD123',event_note: 'Đã kiểm tra' });
assert.equal(r.status, 'paid'); assert.equal(r.next_reminder_on, null);
assert.equal((await portal()).summary.attention, 0); assert.equal((await portal()).summary.unpaid, 0);
await assert.rejects(save('notify', { ...r,next_reminder_on: tomorrow }), /đã kết thúc/);
await assert.rejects(save('save', { ...r,amount: '999' }), /Mở lại/);
const paidHistory = await history(r.id);
assert.ok(paidHistory.some(event => event.actor_id === colleague && event.action === 'promise'));
assert.equal(paidHistory[0].snapshot.payment_reference, 'GD123');
await assert.rejects(history(r.id, crypto.randomUUID()), /phạm vi/);
r = await save('reopen', { ...r,next_reminder_on: today,event_note: 'Cần kiểm tra lại' });
assert.equal(r.status, 'pending'); assert.equal(r.paid_on, null); assert.equal(r.payment_reference, '');
assert.ok((await history(r.id)).some(e => e.snapshot.payment_reference === 'GD123'), 'Reopening preserves the old confirmation in history');
r = await save('save', { ...r,due_on: yesterday,next_reminder_on: tomorrow });
assert.equal((await portal()).summary.overdue, 1, 'Future reminder never hides an overdue obligation');
r = await save('cancel', { ...r,event_note: 'Kỳ nhập nhầm' });
assert.equal(r.status, 'cancelled'); assert.equal((await portal()).summary.attention, 0);
await assert.rejects(save('save', { ...base,id: crypto.randomUUID() }), /Đã có khoản/);

// Unknown amount and zero are different. Each tax type has its own record for the same period.
const unknown = await save('save', { ...base,id: crypto.randomUUID(),kind: 'thue_gtgt',amount: null,due_on: addFollowupDays(today,20),next_reminder_on: tomorrow });
assert.equal(unknown.amount, null);
const zero = await save('save', { ...base,id: crypto.randomUUID(),kind: 'thue_tncn',amount: '0',due_on: addFollowupDays(today,20),next_reminder_on: tomorrow });
assert.equal(zero.amount, 0);
await db.query('update clients set archived_at=now() where id=$1', [client]);
assert.equal((await portal()).records.length, 3, 'Archiving a client keeps its obligations visible');
await assert.rejects(save('save', { ...base,id: crypto.randomUUID(),period: 'Tháng 11/2026' }), /lưu trữ/);
await save('paid', { ...unknown,paid_on: today }, colleague); // Existing records can still be resolved.
// Dashboard and list use the same date rules, including a missed promise before the actual deadline.
for (const patch of [
 { due_on: addFollowupDays(today,20),next_reminder_on: tomorrow,promised_on: yesterday,status: 'promised' },
 { due_on: addFollowupDays(today,3),next_reminder_on: tomorrow,promised_on: null,status: 'notified' },
 { due_on: addFollowupDays(today,4),next_reminder_on: tomorrow,promised_on: null,status: 'notified' },
 { due_on: addFollowupDays(today,20),next_reminder_on: today,promised_on: null,status: 'notified' },
]) {
 await db.query('update payment_followups set due_on=$2,next_reminder_on=$3,promised_on=$4,status=$5 where id=$1', [zero.id,patch.due_on,patch.next_reminder_on,patch.promised_on,patch.status]);
 const snapshot = await portal();
 assert.equal(snapshot.summary.attention,snapshot.records.filter(row => paymentFollowupUrgency(row,today)).length,'SQL dashboard agrees with list attention rules');
}
await db.query('update app_users set is_active=false where id=$1', [staff]);
await assert.rejects(portal(), /nhân viên/);
await assert.rejects(save('notify', { ...zero,next_reminder_on: tomorrow }), /nhân viên/);
assert.equal(await scalar('select count(*)::int from tasks'), 0, 'Tracking never creates receipts, tasks, or debt changes');
for (const table of ['payment_followups','payment_followup_events']) {
 for (const permission of ['SELECT','INSERT','UPDATE','DELETE']) assert.equal(await scalar('select has_table_privilege($1,$2,$3)', ['anon',table,permission]), false);
}
assert.equal(await scalar("select has_function_privilege('anon','payment_followup_client_access(uuid,uuid)','EXECUTE')"), false);
assert.equal(await scalar("select has_function_privilege('anon','save_payment_followup(uuid,uuid,text,jsonb)','EXECUTE')"), true);

const future = addFollowupDays(today,20);
const row = { status: 'notified',due_on: future,next_reminder_on: future,promised_on: null };
assert.equal(paymentFollowupUrgency(row,today), null);
assert.equal(paymentFollowupUrgency({ ...row,next_reminder_on: today },today), 'reminder');
assert.equal(paymentFollowupUrgency({ ...row,promised_on: yesterday },today), 'promise_missed');
assert.equal(paymentFollowupUrgency({ ...row,due_on: yesterday },today), 'overdue');
assert.equal(paymentFollowupUrgency({ ...row,due_on: addFollowupDays(today,3) },today), 'due_soon');
assert.equal(paymentFollowupUrgency({ ...row,due_on: addFollowupDays(today,4) },today), null);
assert.equal(paymentFollowupUrgency({ ...row,status: 'paid',due_on: yesterday,next_reminder_on: today },today), null);
assert.equal(paymentFollowupUrgency({ ...row,status: 'cancelled',due_on: yesterday },today), null);
assert.equal(addFollowupDays('2026-12-31',1), '2027-01-01');
await db.close();
console.log('Payment follow-ups: SQL lifecycle, staff scope, retry safety, history, validation, permissions, and reminder dates passed.');
