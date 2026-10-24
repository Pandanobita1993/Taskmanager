// Isolated SQL, balances and parser checks. No production connection.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { parseC12Lines, parseC12Money, c12TextLines } from '../src/lib/c12Parser.ts';
import { previousBhxhMonth, previewBhxhPeriod, withCurrentBhxhDrafts } from '../src/lib/bhxhLedger.ts';
const require = createRequire(path.join(os.tmpdir(),'anan-recurrence-qa','package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const scalar = async (sql,args=[]) => Object.values((await db.query(sql,args)).rows[0])[0];
await db.exec(`create role anon; create role authenticated;
create table app_users(id uuid primary key default gen_random_uuid(),name text,is_active boolean default true);
create table clients(id uuid primary key default gen_random_uuid(),name text,tax_code text,contact_name text,contact_phone text,
 services text[] default '{}',accounting_person text,insurance_person text,ins_code text,archived_at timestamptz);`);
await db.exec(await fs.readFile(new URL('../supabase-payment-followups-migration.sql',import.meta.url),'utf8'));
const migration = await fs.readFile(new URL('../supabase-bhxh-ledger-migration.sql',import.meta.url),'utf8');
await db.exec(migration); await db.exec(migration);
const staff = await scalar("insert into app_users(name) values('BHXH QA') returning id");
const colleague = await scalar("insert into app_users(name) values('Colleague') returning id");
const client = await scalar("insert into clients(name,tax_code,insurance_person,accounting_person,ins_code) values('QA Client','QA01','BHXH QA','Colleague','QA1234A') returning id");
const outsider = await scalar("insert into clients(name,insurance_person) values('Other','Other') returning id");
const save = (entity,record,action='save',who=staff,request=crypto.randomUUID()) => scalar('select save_bhxh_ledger($1,$2,$3,$4,$5::jsonb)',[who,request,entity,action,JSON.stringify(record)]);
const portal = (who=staff) => scalar('select bhxh_ledger_portal($1)',[who]);
const history = (entity,id,who=staff) => scalar('select bhxh_ledger_history($1,$2,$3)',[who,entity,id]);
const period = (month,charges,override=null) => ({id:crypto.randomUUID(),version:0,client_id:client,period_on:`2025-${month}-01`,charges:String(charges),opening_override:override==null?null:String(override),opening_reason:override==null?'':'Đối chiếu C12',notes:'',source_filename:''});
const balance = async month => (await portal()).periods.find(row=>row.period_on===`2025-${month}-01`);
let jan=await save('period',period('01',100));
assert.equal((await balance('01')).opening_balance,null);
assert.equal((await balance('01')).closing_balance,null,'Unknown opening is never silently zero');
let feb=await save('period',period('02',50));
assert.equal((await balance('02')).closing_balance,null,'Unknown propagates to the next month');
jan=await save('period',{...jan,charges:'100',opening_override:'20',opening_reason:'Số đầu đã đối chiếu'});
assert.equal((await balance('02')).opening_balance,120); assert.equal((await balance('02')).closing_balance,170);
const payment = {id:crypto.randomUUID(),version:0,client_id:client,paid_on:'2025-01-20',amount:'30',reference:'TX01',notes:'Nộp bù'};
const request=crypto.randomUUID();
let paid=await save('payment',payment,'save',staff,request);
await save('payment',payment,'save',staff,request);
assert.equal((await portal()).payments.length,1,'Retry does not duplicate a payment');
assert.equal((await balance('01')).paid_total,30);
assert.equal((await balance('02')).opening_balance,90,'A backdated payment recalculates adjacent months');
assert.equal((await balance('02')).closing_balance,140);
await assert.rejects(save('payment',{...payment,amount:'31'},'save',staff,request),/Mã yêu cầu/);
const partial=await save('payment',{...payment,id:crypto.randomUUID(),reference:'TX02',amount:'40',paid_on:'2025-02-15'});
assert.equal((await balance('02')).paid_total,40);
assert.equal((await balance('02')).closing_balance,100,'Actual payments are summed by actual month');
paid=await save('payment',{...paid,paid_on:'2025-02-01'});
assert.equal((await balance('01')).paid_total,0);
assert.equal((await balance('02')).paid_total,70,'Changing payment date moves its month');
paid=await save('payment',{...paid,event_note:'Chứng từ nhập nhầm'},'void');
assert.equal((await balance('02')).paid_total,40);
paid=await save('payment',{...paid,event_note:'Đã kiểm tra đúng'},'restore',colleague);
assert.equal((await balance('02')).paid_total,70);
await assert.rejects(save('payment',{...partial,id:crypto.randomUUID(),version:0,reference:' tx01 '}),/Đã có/);
await assert.rejects(save('payment',{...payment,id:crypto.randomUUID(),reference:'',amount:'0'}),/Kiểm tra/);
await assert.rejects(save('payment',{...payment,id:crypto.randomUUID(),reference:'',paid_on:'2200-01-01'}),/Kiểm tra/);
for(const amount of ['0.2','NaN','Infinity','1000000000000000']) await assert.rejects(save('payment',{...payment,id:crypto.randomUUID(),amount}),/đồng nguyên/);
let march=await save('period',period('03',10,500));
jan=await save('period',{...jan,charges:'200'});
assert.equal((await balance('02')).closing_balance,200);
assert.equal((await balance('03')).opening_balance,500,'Manual opening is a checkpoint');
assert.equal((await balance('03')).closing_balance,510);
march=await save('period',{...march,opening_override:null,opening_reason:'',charges:'10'});
assert.equal((await balance('03')).opening_balance,200,'Auto restores carry-forward');
let may=await save('period',period('05',30));
assert.equal((await balance('05')).opening_balance,null,'May cannot inherit March across missing April');
let april=await save('period',period('04',-50));
assert.equal((await balance('05')).opening_balance,160,'Adding missing month reconnects the chain');
const stale=april;
april=await save('period',{...april,charges:'-250'});
assert.equal((await balance('05')).opening_balance,-40,'Credits stay negative');
assert.equal((await balance('05')).closing_balance,-10);
await assert.rejects(save('period',{...stale,charges:'10'}),/vừa được người khác/);
await assert.rejects(save('period',period('05',20)),/Đã có kỳ/);
await assert.rejects(save('period',{...period('06',20),opening_override:'0',opening_reason:''}),/Kiểm tra/);
await assert.rejects(save('period',{...period('06',20),paid_total:100}),/không nhập/);
await assert.rejects(save('period',{...period('06',20),client_id:outsider}),/phạm vi/);
await assert.rejects(save('period',{...may,period_on:'2025-06-01'}),/Không thể đổi kỳ/);
assert.ok((await history('payment',paid.id)).some(row=>row.actor_name==='Colleague'));
await assert.rejects(history('payment',paid.id,crypto.randomUUID()),/phạm vi/);
const snapshot=await portal();
const draftPortal={...snapshot,today:'2025-06-15'};
const originalSnapshot=JSON.stringify(draftPortal);
const generated=withCurrentBhxhDrafts(draftPortal);
const current=generated.find(row=>row.client_id===client&&row.period_on==='2025-06-01');
assert.equal(current.opening_balance,-10,'The current month carries the prior closing, including a credit');
assert.equal(current.charges,null,'Unknown current charges must not become zero');
assert.equal(current.closing_balance,null,'No fabricated closing before charges are entered');
assert.equal(current.is_current_draft,true);
assert.equal(current.version,0);
assert.equal(JSON.stringify(draftPortal),originalSnapshot,'Generating a draft never mutates or writes source data');
assert.equal(withCurrentBhxhDrafts({...draftPortal,periods:generated}).filter(row=>row.period_on==='2025-06-01').length,1,'Refreshes do not duplicate a current-month draft');
assert.equal(withCurrentBhxhDrafts({...draftPortal,today:'2025-07-01'}).some(row=>row.is_current_draft),false,'A missing June cannot be skipped by copying May into July');
assert.equal(withCurrentBhxhDrafts({...draftPortal,clients:draftPortal.clients.map(c=>({...c,archived:true}))}).some(row=>row.is_current_draft),false,'Archived customers do not get new draft periods');
const priorRow=draftPortal.periods.find(row=>row.id===may.id);
for(const closing of [0,100,null]) {
 const view=withCurrentBhxhDrafts({...draftPortal,periods:[{...priorRow,closing_balance:closing}]});
 const row=view.find(row=>row.is_current_draft);
 assert.equal(row.opening_balance,closing,'Zero, a debt, and missing opening remain distinct');
 assert.equal(row.opening_source,closing===null?'missing':'previous');
}
const existingCurrent={...priorRow,id:crypto.randomUUID(),period_on:'2025-06-01',charges:0,closing_balance:0};
const existingView=withCurrentBhxhDrafts({...draftPortal,periods:[...draftPortal.periods,existingCurrent]});
assert.equal(existingView.filter(row=>row.period_on==='2025-06-01').length,1);
assert.equal(existingView.find(row=>row.id===existingCurrent.id).charges,0,'A saved current period is never overwritten');
const paidDraft=withCurrentBhxhDrafts({...draftPortal,payments:[
 {...partial,id:crypto.randomUUID(),paid_on:'2025-06-05',amount:20,is_void:false},
 {...partial,id:crypto.randomUUID(),paid_on:'2025-06-06',amount:30,is_void:false},
 {...partial,id:crypto.randomUUID(),paid_on:'2025-06-07',amount:90,is_void:true},
 {...partial,id:crypto.randomUUID(),paid_on:'2025-05-31',amount:80,is_void:false},
]}).find(row=>row.is_current_draft);
assert.equal(paidDraft.paid_total,50);assert.equal(paidDraft.payment_count,2);
assert.equal(withCurrentBhxhDrafts({...draftPortal,today:'2026-01-01',periods:[{...priorRow,period_on:'2025-12-01'}]}).find(row=>row.is_current_draft).period_on,'2026-01-01','Year rollover uses the immediately previous calendar month');
const preview=previewBhxhPeriod(snapshot.periods,snapshot.payments,client,'2025-05-01','','30');
assert.equal(preview.closing,snapshot.periods.find(row=>row.id===may.id).closing_balance,'UI preview agrees with SQL');
assert.equal(previousBhxhMonth('2026-01-01'),'2025-12-01');
assert.equal(previousBhxhMonth(''),'');
assert.equal(previewBhxhPeriod([],[],client,'','','').closing,null,'Clearing month input does not crash the form');
await db.query('update clients set archived_at=now() where id=$1',[client]);
assert.equal((await portal()).periods.length,5,'Archived clients retain ledger');
await assert.rejects(save('period',period('06',10)),/lưu trữ/);
await db.query('update app_users set is_active=false where id=$1',[staff]);
await assert.rejects(portal(),/nhân viên/);
for(const table of ['bhxh_periods','bhxh_payments','bhxh_ledger_events']) for(const permission of ['SELECT','INSERT','UPDATE','DELETE']) {
 assert.equal(await scalar('select has_table_privilege($1,$2,$3)',['anon',table,permission]),false);
}
assert.equal(await scalar("select has_function_privilege('anon','bhxh_balances(uuid)','EXECUTE')"),false);
const draft=parseC12Lines(['Mẫu C12-TS','Tháng 11 năm 2025','Mã đơn vị: QA1234A',
 'A Kỳ trước mang sang 100 200 300 400 500 1,500',
 'B Phát sinh trong kỳ 10 20 30 40 50 150',
 'C Số tiền đã nộp trong kỳ','Đ Chuyển kỳ sau 110 220 330 440 550 1,650']);
assert.equal(draft.opening,1500); assert.equal(draft.charges,150); assert.equal(draft.reportedPaid,null);
assert.equal(draft.reportedClosing,1650); assert.equal(draft.unitCode,'QA1234A'); assert.equal(draft.period,'2025-11');
assert.equal(parseC12Money('(1.234.567)'),-1234567); assert.equal(parseC12Money('1,234,567'),1234567);
assert.equal(parseC12Money('12.34'),null); assert.equal(parseC12Money('0'),0);
assert.throws(()=>parseC12Lines(['hello']),/Không nhận diện/);
assert.throws(()=>parseC12Lines(['C12-TS','Tháng 1 năm 2026','Tháng 2 năm 2026']),/nhiều kỳ/);
const headerAndSignature=['Mẫu C12-TS','Tháng 08 năm 2026',
 'a) Kết quả đơn vị đã đóng đến hết tháng 03 năm 2025',
 'Địa danh, ngày 02 tháng 09 năm 2026'];
assert.equal(parseC12Lines(headerAndSignature).period,'2026-08','A signing month or historical coverage month is not a second reporting period');
assert.equal(parseC12Lines([...headerAndSignature,'Tháng 08 năm 2026']).period,'2026-08','Repeated headers for the same month are accepted');
assert.equal(parseC12Lines(['Mẫu C12-TS','Địa danh, ngày 02 tháng 09 năm 2026']).period,null,'A footer date cannot substitute for a missing reporting period');
assert.equal(parseC12Lines(['C12-TS','Kỳ báo cáo: Tháng 8 năm 2026']).period,'2026-08');
assert.throws(()=>parseC12Lines(['C12-TS','Mã đơn vị: QA1234A','Mã đơn vị: QA4321B']),/nhiều mã/);
assert.deepEqual(c12TextLines([{str:'Total',transform:[1,0,0,1,30,200]},{str:'B',transform:[1,0,0,1,10,200]}]),['B Total']);
const missingTotal=c12TextLines([{str:'B Phát sinh trong kỳ',transform:[1,0,0,1,10,200]},
 {str:'12,345',transform:[1,0,0,1,300,200],width:40}],500);
assert.equal(parseC12Lines(['C12-TS',...missingTotal]).charges,null,'Missing total column cannot become the last fund value');
await db.close();
console.log('BHXH ledger: carry-forward, missing months, actual payments, corrections, retries, permissions, audit and C12 parsing passed.');
