// Isolated PostgreSQL; optional --ui exercises the same RPCs in Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(path.join(os.tmpdir(), 'anan-recurrence-qa', 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
const sqlFile = name => fs.readFile(new URL(`../supabase-${name}-migration.sql`, import.meta.url), 'utf8');
const request = () => crypto.randomUUID();
const snapshot = () => scalar(`select jsonb_build_object(
 'units',(select jsonb_agg(to_jsonb(t) order by id) from bhxh_client_units t),
 'periods',(select jsonb_agg(to_jsonb(t) order by id) from bhxh_periods t),
 'payments',(select jsonb_agg(to_jsonb(t) order by id) from bhxh_payments t),
 'agencies',(select jsonb_agg(to_jsonb(t) order by id) from bhxh_agencies t),
 'receivers',(select jsonb_agg(to_jsonb(t) order by unit_id) from bhxh_client_receivers t),
 'unit_events',(select jsonb_agg(to_jsonb(t) order by request_id) from bhxh_unit_events t),
 'ledger_events',(select jsonb_agg(to_jsonb(t) order by request_id) from bhxh_ledger_events t),
 'directory_events',(select jsonb_agg(to_jsonb(t) order by request_id) from bhxh_directory_events t))`);
try {
 await db.exec(`create role anon; create role authenticated;
 create table app_users(id uuid primary key default gen_random_uuid(),name text,department text,roles text[] default '{}',is_active boolean default true);
 create table clients(id uuid primary key default gen_random_uuid(),name text,tax_code text,contact_name text,contact_phone text,
 services text[] default '{}',accounting_person text,insurance_person text,ins_code text,archived_at timestamptz);
 create schema storage;create table storage.objects(bucket_id text,name text,metadata jsonb);
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
 for (const name of ['payment-followups', 'bhxh-ledger', 'bhxh-shared-payments', 'bhxh-agencies']) await db.exec(await sqlFile(name));
 const owner = await scalar("insert into app_users(name,department) values('Người được phân công','BHXH') returning id");
 const manager = await scalar("insert into app_users(name,department) values('Đồng nghiệp BHXH','BHXH') returning id");
 const secondary = await scalar("insert into app_users(name,department,roles) values('Kiêm nhiệm BHXH','Kế toán','{bhxh}') returning id");
 const outsider = await scalar("insert into app_users(name,department) values('Kế toán QA','Kế toán') returning id");
 const inactive = await scalar("insert into app_users(name,department,is_active) values('BHXH đã ngừng','BHXH',false) returning id");
 const legacy = await scalar("insert into clients(name,tax_code,services,insurance_person,ins_code) values('Khách có sổ cũ','QA01','{BHXH}','Người được phân công','OLD123') returning id");
 const client = await scalar("insert into clients(name,tax_code,services,insurance_person) values('Khách BHXH dùng chung','QA02','{BHXH}','Người được phân công') returning id");
 const tax = await scalar("insert into clients(name,tax_code,services,accounting_person) values('Khách thuế riêng','QA03','{Kế toán}','Kế toán QA') returning id");
 const today = await scalar("select ((now() at time zone 'Asia/Ho_Chi_Minh')::date)::text");
 const month = today.slice(0, 7);
 const ledger = (who, entity, record, action = 'save', req = request()) => scalar('select save_bhxh_ledger($1,$2,$3,$4,$5::jsonb)', [who, req, entity, action, JSON.stringify(record)]);
 const unit = (who, record, req = request()) => scalar('select save_bhxh_unit($1,$2,$3::jsonb)', [who, req, JSON.stringify(record)]);
 const directory = (who, entity, record, req = request()) => scalar('select save_bhxh_directory($1,$2,$3,$4::jsonb)', [who, req, entity, JSON.stringify(record)]);
 const periodRecord = { id: request(), client_id: legacy, version: 0, period_on: `${month}-01`, opening_override: '25', opening_reason: 'Số đầu kỳ cũ', charges: '100' };
 await ledger(owner, 'period', periodRecord);
 await db.exec(await sqlFile('bhxh-units'));
 const oldFollowup = await scalar("select pg_get_functiondef('save_payment_followup(uuid,uuid,text,jsonb)'::regprocedure)");
 const before = await snapshot();
 const migration = await sqlFile('bhxh-staff-permissions');
 await db.exec(migration); await db.exec(migration);
 assert.deepEqual(await snapshot(), before, 'Installing/rerunning permissions preserves every financial record and audit event');
 assert.equal(await scalar("select pg_get_functiondef('save_payment_followup(uuid,uuid,text,jsonb)'::regprocedure)"), oldFollowup, 'Tax and reminder write logic stays unchanged');
 for (const [who, allowed] of [[owner, true], [manager, true], [secondary, true], [outsider, false], [inactive, false]]) {
  assert.equal(await scalar('select bhxh_staff_can_manage($1)', [who]), allowed);
  if (who === inactive) continue;
  const portal = await scalar('select bhxh_units_portal($1)', [who]);
  assert.equal(portal.can_manage_bhxh, allowed);
  assert.equal(portal.clients.find(c => c.id === client).can_edit_units, allowed, 'Permission is independent of per-client assignment');
  assert.equal((await scalar('select bhxh_ledger_portal($1)', [who])).can_manage_bhxh, allowed);
  assert.equal((await scalar('select bhxh_agency_portal($1)', [who])).can_manage_bhxh, allowed);
 }
 assert.equal(await scalar("select has_function_privilege('anon','bhxh_staff_can_manage(uuid)','EXECUTE')"), false);
 const createdRequest = request();
 const newUnit = { id: request(), client_id: client, kind: 'employees', code: 'SHARED123', is_active: true, version: 0 };
 let savedUnit = await unit(manager, newUnit, createdRequest);
 assert.equal((await unit(manager, newUnit, createdRequest)).id, savedUnit.id, 'Retry protection is preserved');
 savedUnit = await unit(secondary, { ...savedUnit, notes: 'Đồng nghiệp kiêm nhiệm cập nhật' });
 await assert.rejects(unit(manager, { ...savedUnit, version: 1 }), /vừa được cập nhật/);
 const legacyUnit = (await scalar('select bhxh_units_portal($1)', [secondary])).clients.find(c => c.id === legacy).units[0];
 await unit(secondary, { ...legacyUnit, kind: 'employees' });
 const period = await ledger(manager, 'period', { id: request(), client_id: client, unit_id: savedUnit.id, version: 0, period_on: `${month}-01`, charges: '700', opening_override: '100', opening_reason: 'Khởi tạo QA' });
 const proof = 'public/bhxh/qa/shared-permissions.png';
 await db.query("insert into storage.objects values('task-proofs',$1,'{\"mimetype\":\"image/png\",\"size\":100}')", [proof]);
 let paid = await ledger(secondary, 'payment', { id: request(), client_id: client, unit_id: savedUnit.id, version: 0, paid_on: today, amount: '50', proof_file: proof });
 const balance = async () => (await scalar('select bhxh_ledger_portal($1)', [manager])).periods.find(p => p.id === period.id).closing_balance;
 assert.equal(await balance(), 750);
 paid = await ledger(manager, 'payment', { ...paid, event_note: 'Đối chiếu chung' }, 'void');
 assert.equal(await balance(), 800);
 paid = await ledger(secondary, 'payment', { ...paid, event_note: 'Đã kiểm tra' }, 'restore');
 assert.equal(await balance(), 750);
 const agencyRecord = { id: request(), version: 0, name: 'Cơ sở BHXH QA', agency_code: '00123', address: 'Địa chỉ QA', phone: '0281234567', province_code: '79', memo_template: 'BHXH 103 00 {{ma_don_vi}} {{ma_co_quan}} DONG BHXH {{ky}}', is_active: true, notes: '', accounts: [], areas: [] };
 let agency = await directory(manager, 'agency', agencyRecord);
 const account = { id: request(), bank_bin: '970436', account_no: '00123456789', account_name: 'BHXH CO SO QA', branch: '' };
 agency = await directory(secondary, 'agency', { ...agency, accounts: [account] });
 const receiver = { client_id: client, unit_id: savedUnit.id, agency_id: agency.id, account_id: account.id, version: 0 };
 await directory(secondary, 'receiver', receiver);
 const beforeDenials = await snapshot();
 for (const who of [outsider, inactive]) {
  for (const action of [
   () => unit(who, { ...savedUnit, notes: 'Không được sửa' }),
   () => ledger(who, 'period', { ...period, charges: '999' }),
   () => ledger(who, 'payment', { ...paid, amount: '999' }),
   () => ledger(who, 'payment', { ...paid, event_note: 'Không được hủy' }, 'void'),
   () => directory(who, 'agency', { ...agency, notes: 'Không được sửa' }),
   () => directory(who, 'receiver', { ...receiver, version: 1 })
  ]) await assert.rejects(action(), /nghiệp vụ BHXH|nhân viên đang hoạt động/);
 }
 assert.deepEqual(await snapshot(), beforeDenials, 'Rejected writes create no records or events');
 await db.query("update app_users set department='Kế toán' where id=$1", [manager]);
 await assert.rejects(unit(manager, newUnit, createdRequest), /nghiệp vụ BHXH/, 'Revocation is checked before idempotent replay');
 await db.query("update app_users set department='BHXH' where id=$1", [manager]);
 const taxRecord = { id: request(), client_id: tax, kind: 'thue_gtgt', version: 0, period: 'Tháng 10/2026', amount: '100', due_on: today, next_reminder_on: today };
 const follow = who => scalar("select save_payment_followup($1,$2,'save',$3::jsonb)", [who, request(), JSON.stringify(taxRecord)]);
 await assert.rejects(follow(manager), /phạm vi/);
 assert.equal((await follow(outsider)).kind, 'thue_gtgt', 'Accountants retain their assigned tax workflow');
 assert.equal(await scalar('select insurance_person from clients where id=$1', [client]), 'Người được phân công', 'Shared writes never reassign the client');
 const beforeRerun = await snapshot(); await db.exec(migration);
 assert.deepEqual(await snapshot(), beforeRerun);
 console.log('PASS: primary/additional BHXH roles manage unassigned clients; C12/payment/directory/unit writes, audit, retry, revocation, read-only staff and tax isolation; migration reruns preserve data.');

 if (process.argv.includes('--ui')) {
  const { chromium, expect: baseExpect } = require('@playwright/test');
  const expect = baseExpect.configure({ timeout: 15000 });
  const origin = process.env.QA_APP_ORIGIN || 'http://127.0.0.1:5187';
  const browser = await chromium.launch({ headless: true, executablePath: process.env.QA_CHROMIUM_PATH || path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1228', 'chrome-win64', 'chrome.exe') });
  const output = path.join(os.tmpdir(), 'anan-recurrence-qa', 'bhxh-staff-permissions-ui'); await fs.mkdir(output, { recursive: true });
  const proofBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=', 'base64');
  try {
   for (const who of [manager, secondary, outsider]) {
    const person = (await db.query('select * from app_users where id=$1', [who])).rows[0];
    const allowed = who !== outsider;
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    // Deliberately stale BHXH cache for the accountant: only server permissions count.
    await context.addInitScript(p => localStorage.setItem('task_manager_profile', JSON.stringify(p)), { id: who, fullName: person.name, department: 'BHXH', office: 'Cần Thơ', additionalRoles: ['bhxh'], isSetupComplete: true });
    const errors = []; const external = [];
    await context.route('**/rest/v1/**', async route => {
     try {
      const name = new URL(route.request().url()).pathname.split('/').at(-1), p = route.request().postDataJSON() || {};
      const queries = {
       bhxh_units_portal: ['select bhxh_units_portal($1)', [p.p_staff_id]],
       bhxh_ledger_portal: ['select bhxh_ledger_portal($1)', [p.p_staff_id]],
       bhxh_agency_portal: ['select bhxh_agency_portal($1)', [p.p_staff_id]],
       save_bhxh_unit: ['select save_bhxh_unit($1,$2,$3::jsonb)', [p.p_staff_id,p.p_request_id,JSON.stringify(p.p_record)]],
       save_bhxh_ledger: ['select save_bhxh_ledger($1,$2,$3,$4,$5::jsonb)', [p.p_staff_id,p.p_request_id,p.p_entity,p.p_action,JSON.stringify(p.p_record)]],
       save_bhxh_directory: ['select save_bhxh_directory($1,$2,$3,$4::jsonb)', [p.p_staff_id,p.p_request_id,p.p_entity,JSON.stringify(p.p_record)]]
      };
      if (name === 'app_users') return route.fulfill({ json: { ...person, office: 'Cần Thơ' } });
      if (!queries[name]) throw Error('Unexpected RPC '+name);
      return route.fulfill({ json: await scalar(...queries[name]) });
     } catch (e) { return route.fulfill({ status: 400, json: { message: e.message } }); }
    });
    await context.route('**/storage/v1/**', async route => {
     const name = decodeURIComponent(new URL(route.request().url()).pathname.split('/object/task-proofs/')[1]);
     await db.query("insert into storage.objects values('task-proofs',$1,$2::jsonb)", [name, JSON.stringify({ mimetype: 'image/png', size: proofBytes.length })]);
     return route.fulfill({ json: { Key: `task-proofs/${name}`, Id: request() } });
    });
    await context.route(url => url.origin !== origin && !url.pathname.includes('/rest/v1/') && !url.pathname.includes('/storage/v1/'), route => { external.push(new URL(route.request().url()).hostname); return route.abort(); });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${origin}/insurance?tab=units&client=${client}`);
    const add = page.getByRole('button', { name: 'Thêm mã đơn vị', exact: true });
    if (allowed) await expect(add).toBeEnabled(); else await expect(add).toHaveCount(0);
    if (who === manager) {
     await page.screenshot({ path: path.join(output,'shared-unit-desktop.png'), fullPage: true });
     await add.click(); const form = page.getByRole('dialog');
     await form.getByLabel('Nhóm mã *').selectOption('legal_representative');
     await form.getByLabel('Mã đơn vị *', { exact: true }).fill('SHAREDLEGAL');
     await form.getByRole('button', { name: 'Lưu mã đơn vị', exact: true }).click(); await expect(form).toHaveCount(0);
    }
    await page.goto(`${origin}/insurance?tab=c12&client=${client}&unit=${savedUnit.id}`);
    const createPeriod = page.getByRole('button', { name: 'Thêm kỳ C12', exact: true });
    if (allowed) await expect(createPeriod).toBeEnabled(); else await expect(createPeriod).toBeDisabled();
    if (who === manager) {
     await page.getByRole('button', { name: 'Cập nhật C12', exact: true }).click(); const form = page.getByRole('dialog');
     await form.getByLabel('Phát sinh trong kỳ *').fill('800');
     await form.getByRole('button', { name: 'Lưu kỳ C12', exact: true }).click(); await expect(form).toHaveCount(0);
     await expect(page.locator('article')).toContainText('850 đ');
    }
    await page.goto(`${origin}/insurance?tab=payments&client=${client}&unit=${savedUnit.id}`);
    const addPayment = page.getByRole('button', { name: 'Ghi nhận tiền nộp', exact: true });
    if (allowed) await expect(addPayment).toBeEnabled(); else await expect(addPayment).toBeDisabled();
    if (who === manager) {
     await addPayment.click(); const form = page.getByRole('dialog');
     await form.getByLabel('Số tiền nộp *').fill('25');
     await form.getByLabel('Ảnh bằng chứng đóng tiền', { exact: true }).setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: proofBytes });
     await expect(form.getByRole('button', { name: 'Xem ảnh đã đính kèm' })).toBeVisible();
     await form.getByRole('button', { name: 'Lưu lần nộp', exact: true }).click(); await expect(form).toHaveCount(0);
     assert.equal(await balance(), 825);
    }
    await page.goto(`${origin}/insurance?tab=agencies&client=${client}`);
    const addAgency = page.getByRole('button', { name: 'Thêm cơ sở BHXH', exact: true });
    if (allowed) await expect(addAgency).toBeEnabled(); else await expect(addAgency).toBeDisabled();
    if (who === manager) {
     await page.getByRole('button', { name: 'Sửa cơ sở', exact: true }).click(); const form = page.getByRole('dialog');
     await form.getByLabel('Ghi chú / số liên hệ khác').fill('Đồng nghiệp BHXH cập nhật dùng chung');
     await form.getByRole('button', { name: 'Lưu cơ sở', exact: true }).click(); await expect(form).toHaveCount(0);
     await page.setViewportSize({ width: 390, height: 844 });
     await page.goto(`${origin}/insurance?tab=units&client=${client}`);
     await expect(page.getByRole('button', { name: 'Thêm mã đơn vị', exact: true })).toBeEnabled();
     await page.screenshot({ path: path.join(output,'shared-unit-mobile.png'), fullPage: true, animations: 'disabled' });
    }
    assert.deepEqual(errors, []); assert.deepEqual(external, []); await context.close();
   }
   console.log('PASS: UI lets BHXH and additional-role colleagues manage other staff clients; unit creation, C12/payment/agency writes, read-only controls and mobile. Screenshots:', output);
  } finally { await browser.close(); }
 }
} finally { await db.close(); }
