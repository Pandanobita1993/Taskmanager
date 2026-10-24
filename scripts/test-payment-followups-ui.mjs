// npm install --prefix "$env:TEMP/anan-recurrence-qa" --no-audit --no-fund @electric-sql/pglite @playwright/test
// Tax lifecycle regression; BHXH has its own UI suite.
// Start npm run dev -- --host 127.0.0.1 --port 5173 first. All Supabase calls are intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const qaRequire = createRequire(path.join(os.tmpdir(),'anan-recurrence-qa','package.json'));
const { PGlite } = qaRequire('@electric-sql/pglite');
const { chromium, expect } = qaRequire('@playwright/test');
const appOrigin=process.env.QA_APP_ORIGIN||'http://127.0.0.1:5173';
const db = new PGlite();
const scalar = async (sql,args=[]) => Object.values((await db.query(sql,args)).rows[0])[0];
await db.exec(`create role anon; create role authenticated;
 create table app_users(id uuid primary key default gen_random_uuid(),name text,is_active boolean default true);
 create table clients(id uuid primary key default gen_random_uuid(),name text,tax_code text,contact_name text,contact_phone text,
 services text[] default '{}',accounting_person text,insurance_person text,archived_at timestamptz);`);
await db.exec(await fs.readFile(new URL('../supabase-payment-followups-migration.sql',import.meta.url),'utf8'));
await db.exec(`create schema storage;create table storage.objects(bucket_id text,name text,metadata jsonb);create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
for(const name of ['bhxh-ledger','bhxh-shared-payments','bhxh-agencies','bhxh-units']) await db.exec(await fs.readFile(new URL(`../supabase-${name}-migration.sql`,import.meta.url),'utf8'));
const staff = await scalar("insert into app_users(name) values('Nhân viên QA') returning id");
const client = await scalar("insert into clients(name,tax_code,accounting_person,contact_name,contact_phone) values('Công ty Minh An','0312345678','Nhân viên QA','Chị An','0901234567') returning id");
const today = await scalar("select ((now() at time zone 'Asia/Ho_Chi_Minh')::date)::text");
const output = path.join(os.tmpdir(),'anan-recurrence-qa','payment-followups-ui');
await fs.mkdir(output,{recursive:true});
const browser = await chromium.launch({ headless: true,executablePath: process.env.QA_CHROMIUM_PATH || path.join(process.env.LOCALAPPDATA,'ms-playwright','chromium-1228','chrome-win64','chrome.exe') });
try {
 const context = await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(profile => localStorage.setItem('task_manager_profile',JSON.stringify(profile)), {
  id:staff,fullName:'Nhân viên QA',department:'Kế toán',office:'Cần Thơ',additionalRoles:[],isSetupComplete:true,
 });
 let missingMigration = false;
 let failSave = false;
 let loseResponse = false;
 const calls = [];
 await context.route('**/rest/v1/**',async route => {
  const url = new URL(route.request().url());
  const name = url.pathname.split('/').at(-1);
  let result;
  try {
   const p = route.request().postDataJSON() || {};
   if (name === 'payment_followup_portal') {
    if (missingMigration) return route.fulfill({status:404,json:{code:'PGRST202',message:'Missing function'}});
    result = await scalar('select payment_followup_portal($1,$2)',[p.p_staff_id,p.p_summary_only || false]);
   } else if (name === 'bhxh_ledger_portal') {
    const legacy = await scalar('select payment_followup_portal($1,false)',[p.p_staff_id]);
    result = {today:legacy.today,clients:legacy.clients,periods:[],payments:[]};
   } else if (name === 'save_payment_followup') {
    calls.push(p);
    if (failSave) return route.fulfill({status:500,json:{message:'QA: chưa lưu được, hãy thử lại'}});
    result = await scalar('select save_payment_followup($1,$2,$3,$4::jsonb)',[p.p_staff_id,p.p_request_id,p.p_action,JSON.stringify(p.p_record)]);
    if (loseResponse) { loseResponse=false; return route.fulfill({status:500,json:{message:'QA: mất phản hồi sau khi đã lưu'}}); }
   } else if (name === 'payment_followup_history') result = await scalar('select payment_followup_history($1,$2)',[p.p_staff_id,p.p_followup_id]);
   else if (name === 'bhxh_followup_portal') result = {today,clients:[],records:[],summary:{unpaid:0,attention:0,overdue:0}};
   else if (name === 'app_users') result = {id:staff,name:'Nhân viên QA',office:'Cần Thơ',is_active:true};
   else if (name === 'sync_my_recurring_tasks') result = {created_count:0,failed_count:0};
   else if (name === 'tasks') result = [];
   else throw new Error(`Unexpected API request: ${name}`);
   await route.fulfill({json:result});
  } catch (error) { await route.fulfill({status:400,json:{message:error.message}}); }
 });
 // Any external network request outside the intercepted REST path is blocked.
 await context.route(url => url.hostname !== '127.0.0.1' && !url.pathname.includes('/rest/v1/'),route => route.abort());
 const page = await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${appOrigin}/tax-followups?client=${client}`);
 await page.getByRole('button',{name:'Thêm khoản theo dõi'}).click();
 let dialog=page.getByRole('dialog');
 await expect(dialog.getByLabel('Khách hàng *')).toHaveValue(client);
 await dialog.getByLabel('Kỳ cần đóng *').fill('Tháng 10/2026');
 await dialog.getByLabel('Số tiền cần đóng (đồng)').fill('4500000');
 await dialog.getByLabel('Hạn đóng *').fill(today);
 failSave=true;
 await dialog.getByRole('button',{name:'Lưu theo dõi'}).click();
 await expect(dialog.getByRole('alert')).toContainText('chưa lưu được');
 await expect(dialog.getByLabel('Số tiền cần đóng (đồng)')).toHaveValue('4500000');
 failSave=false;
 await dialog.getByRole('button',{name:'Lưu theo dõi'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 let card=page.locator('article').filter({hasText:'Công ty Minh An'});
 await expect(card).toContainText('Chưa báo khách');
 await card.getByRole('button',{name:'Đã báo / nhắc khách'}).click();
 dialog=page.getByRole('dialog');
 await dialog.getByLabel('Ghi chú lần cập nhật').fill('Đã nhắn Zalo');
 loseResponse=true;
 await dialog.getByRole('button',{name:'Lưu theo dõi'}).click();
 await expect(dialog.getByRole('alert')).toContainText('mất phản hồi');
 await dialog.getByRole('button',{name:'Lưu theo dõi'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(card).toContainText('Đã báo · chờ đóng');
 await expect(card).toContainText('1 lần');
 const notified=calls.filter(call=>call.p_action==='notify');
 assert.equal(notified.length,2); assert.equal(notified[0].p_request_id,notified[1].p_request_id);
 await card.getByRole('button',{name:'Khách hẹn đóng',exact:true}).click();
 dialog=page.getByRole('dialog');
 await dialog.getByLabel('Khách hẹn đóng ngày *').fill(today);
 await dialog.getByRole('button',{name:'Lưu theo dõi'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(card).toContainText('Khách hẹn đóng');
 await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await expect.poll(async()=>{ const rect=await page.locator('aside').boundingBox(); return Math.round(rect.x+rect.width); }).toBeLessThanOrEqual(0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No mobile horizontal overflow');
 await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
 await card.screenshot({path:path.join(output,'mobile-record.png')});
 await card.getByRole('button',{name:'Xác nhận đã đóng',exact:true}).click();
 dialog=page.getByRole('dialog');
 await dialog.getByLabel('Mã chứng từ / thông tin xác nhận').fill('GD-001');
 await dialog.getByRole('button',{name:'Xác nhận đã đóng',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.locator('article')).toHaveCount(0);
 await page.getByLabel('Trạng thái',{exact:true}).selectOption('paid');
 card=page.locator('article').filter({hasText:'Công ty Minh An'});
 await expect(card).toContainText('GD-001');
 await card.getByRole('button',{name:'Lịch sử',exact:true}).click();
 dialog=page.getByRole('dialog');
 await expect(dialog).toContainText('Đã nhắn Zalo');
 await expect(dialog).toContainText('GD-001');
 await dialog.getByRole('button',{name:'Đóng lịch sử'}).click();
 await card.getByRole('button',{name:'Mở lại theo dõi'}).click();
 dialog=page.getByRole('dialog');
 await dialog.getByLabel('Lý do *').fill('Khách gửi nhầm chứng từ');
 await dialog.getByRole('button',{name:'Lưu theo dõi'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.goto(`${appOrigin}/`);
 await expect(page.getByRole('link').filter({hasText:'1 khoản cần kiểm tra / nhắc khách'})).toBeVisible();
 await page.getByRole('link').filter({hasText:'1 khoản cần kiểm tra / nhắc khách'}).click();
 await expect(page).toHaveURL(/filter=attention/);
 await expect(page.locator('article')).toHaveCount(1);
 missingMigration=true;
 await page.getByRole('button',{name:'Làm mới'}).click();
 await expect(page.getByRole('alert')).toContainText('supabase-payment-followups-migration.sql');
 await page.reload();
 await expect(page.getByRole('button',{name:'Thêm khoản theo dõi'})).toBeDisabled();
 assert.deepEqual(errors,[],'No uncaught browser errors');
 console.log(`Payment follow-ups UI: add, save failure, network retry, notify, promise, paid, history, reopen, dashboard, mobile, missing migration passed. Screenshots: ${output}`);
} finally { await browser.close(); await db.close(); }
