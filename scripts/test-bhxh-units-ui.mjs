// Isolated PostgreSQL + browser. All external network requests are blocked.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(path.join(os.tmpdir(),'anan-recurrence-qa','package.json'));
const {PGlite}=require('@electric-sql/pglite');
const {chromium,expect:baseExpect}=require('@playwright/test');
const expect=baseExpect.configure({timeout:20000});
const jsQR=require('jsqr');
const db=new PGlite();
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
await db.exec(`create role anon; create role authenticated;
create table app_users(id uuid primary key default gen_random_uuid(),name text,is_active boolean default true);
create table clients(id uuid primary key default gen_random_uuid(),name text,tax_code text,contact_name text,contact_phone text,
services text[] default '{BHXH}',accounting_person text,insurance_person text,ins_code text,archived_at timestamptz);
create schema storage;create table storage.objects(bucket_id text,name text,metadata jsonb);
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
for(const name of ['payment-followups','bhxh-ledger','bhxh-shared-payments','bhxh-agencies']) await db.exec(await fs.readFile(new URL(`../supabase-${name}-migration.sql`,import.meta.url),'utf8'));
const staff=await scalar("insert into app_users(name) values('Nhân viên kiểm thử') returning id");
const client=await scalar("insert into clients(name,tax_code,insurance_person,ins_code) values('Khách BHXH mẫu','QA01','Nhân viên kiểm thử','QA1234A') returning id");
const today=await scalar("select ((now() at time zone 'Asia/Ho_Chi_Minh')::date)::text");
const month=today.slice(0,7);
await db.exec(await fs.readFile(new URL('../supabase-bhxh-units-migration.sql',import.meta.url),'utf8'));
const legacy=(await scalar('select bhxh_ledger_portal($1)',[staff])).clients[0].units[0];
const savePeriod=(uid,charges)=>scalar("select save_bhxh_ledger($1,$2,'period','save',$3::jsonb)",[staff,crypto.randomUUID(),JSON.stringify({id:crypto.randomUUID(),version:0,client_id:client,unit_id:uid,period_on:month+'-01',opening_override:'100',opening_reason:'Khởi tạo QA',charges:String(charges)})]);
const browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright','chromium-1228','chrome-win64','chrome.exe')});
const origin=process.env.QA_APP_ORIGIN||'http://127.0.0.1:5187';
const output=path.join(os.tmpdir(),'anan-recurrence-qa','bhxh-units-ui');await fs.mkdir(output,{recursive:true});
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
 await context.addInitScript(profile=>localStorage.setItem('task_manager_profile',JSON.stringify(profile)),{id:staff,fullName:'Nhân viên kiểm thử',department:'BHXH',office:'Cần Thơ',additionalRoles:[],isSetupComplete:true});
 let loseResponse=false, missingDirectory=false;const calls=[];
 await context.route('**/rest/v1/**',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1);
  try{
   const p=route.request().postDataJSON()||{};let result;
   if(name==='bhxh_units_portal') result=await scalar('select bhxh_units_portal($1)',[p.p_staff_id]);
   else if(name==='save_bhxh_unit') result=await scalar('select save_bhxh_unit($1,$2,$3::jsonb)',[p.p_staff_id,p.p_request_id,JSON.stringify(p.p_record)]);
   else if(name==='save_bhxh_ledger') result=await scalar('select save_bhxh_ledger($1,$2,$3,$4,$5::jsonb)',[p.p_staff_id,p.p_request_id,p.p_entity,p.p_action,JSON.stringify(p.p_record)]);
   else if(name==='bhxh_ledger_portal') result=await scalar('select bhxh_ledger_portal($1)',[p.p_staff_id]);
   else if(name==='bhxh_agency_portal') {
    if(missingDirectory)return route.fulfill({status:404,json:{code:'PGRST202',message:'Missing directory'}});
    result=await scalar('select bhxh_agency_portal($1)',[p.p_staff_id]);
   }else if(name==='save_bhxh_directory'){
    calls.push(p);result=await scalar('select save_bhxh_directory($1,$2,$3,$4::jsonb)',[p.p_staff_id,p.p_request_id,p.p_entity,JSON.stringify(p.p_record)]);
    if(loseResponse){loseResponse=false;return route.fulfill({status:500,json:{message:'QA mất phản hồi sau khi lưu'}});}
   }else if(name==='bhxh_followup_portal') result=await scalar('select bhxh_followup_portal($1)',[p.p_staff_id]);
   else if(name==='save_payment_followup') result=await scalar('select save_payment_followup($1,$2,$3,$4::jsonb)',[p.p_staff_id,p.p_request_id,p.p_action,JSON.stringify(p.p_record)]);
   else if(name==='payment_followup_portal') result=await scalar('select payment_followup_portal($1)',[p.p_staff_id]);
   else if(name==='payment_followup_history') result=await scalar('select payment_followup_history($1,$2)',[p.p_staff_id,p.p_followup_id]);
   else if(name==='app_users') result={id:staff,name:'Nhân viên kiểm thử',office:'Cần Thơ'};
   else throw Error(`Unexpected RPC ${name}`);
   await route.fulfill({json:result});
  }catch(error){await route.fulfill({status:400,json:{message:error.message}});}
 });
 const external=[];await context.route(url=>url.origin!==origin&&!url.pathname.includes('/rest/v1/'),route=>{external.push(new URL(route.request().url()).hostname);return route.abort();});
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${origin}/insurance?tab=units&client=${client}`);
 await expect(page.locator('article')).toContainText('Chờ phân loại · QA1234A');
 await page.getByRole('button',{name:'Phân loại / bổ sung mã'}).click();let dialog=page.getByRole('dialog');
 await dialog.getByLabel('Nhóm mã *').selectOption('employees');
 await dialog.getByRole('button',{name:'Lưu mã đơn vị',exact:true}).click();await expect(dialog).toHaveCount(0);
 for(const [kind,code] of [['legal_representative','LEGAL123'],['foreign_workers','FOREIGN123']]) {
  await page.getByRole('button',{name:'Thêm mã đơn vị',exact:true}).click();dialog=page.getByRole('dialog');
  await dialog.getByLabel('Nhóm mã *').selectOption(kind);await dialog.getByLabel('Mã đơn vị *',{exact:true}).fill(code);
  await dialog.getByRole('button',{name:'Lưu mã đơn vị',exact:true}).click();await expect(dialog).toHaveCount(0);
 }
 await expect(page.getByRole('button',{name:'Thêm mã đơn vị',exact:true})).toBeDisabled();
 const units=(await scalar('select bhxh_ledger_portal($1)',[staff])).clients[0].units;
 const employee=units.find(u=>u.kind==='employees'),legal=units.find(u=>u.kind==='legal_representative'),foreign=units.find(u=>u.kind==='foreign_workers');
 assert.equal(employee.id,legacy.id);
 await savePeriod(employee.id,400);await savePeriod(legal.id,700);await savePeriod(foreign.id,900);
 const account={id:crypto.randomUUID(),bank_bin:'970436',account_no:'00123456789',account_name:'BHXH CO SO MAU',branch:''};
 const second={...account,id:crypto.randomUUID(),account_no:'00987654321'};
 const agency=await scalar("select save_bhxh_directory($1,$2,'agency',$3::jsonb)",[staff,crypto.randomUUID(),JSON.stringify({id:crypto.randomUUID(),version:0,name:'BHXH cơ sở mẫu',agency_code:'00123',address:'Địa chỉ QA',phone:'0281234567',province_code:'79',memo_template:'BHXH 103 00 {{ma_don_vi}} {{ma_co_quan}} DONG BHXH {{ky}}',accounts:[account,second],areas:[],is_active:true})]);
 for(const [unit,acct] of [[employee,account],[legal,second]]) await scalar("select save_bhxh_directory($1,$2,'receiver',$3::jsonb)",[staff,crypto.randomUUID(),JSON.stringify({client_id:client,unit_id:unit.id,version:0,agency_id:agency.id,account_id:acct.id})]);
 await page.screenshot({path:path.join(output,'units-desktop.png'),fullPage:true});
 await page.goto(`${origin}/insurance?tab=c12&client=${client}&unit=${legal.id}`);
 await expect(page.locator('article')).toHaveCount(1);await expect(page.locator('article')).toContainText('Đại diện pháp luật · LEGAL123');
 await page.getByRole('button',{name:'Cập nhật C12'}).click();dialog=page.getByRole('dialog');
 await expect(dialog.getByLabel('Mã đơn vị BHXH',{exact:true})).toHaveValue(legal.id);await expect(dialog.getByLabel('Mã đơn vị BHXH',{exact:true})).toBeDisabled();
 await expect(dialog.getByLabel('Phát sinh trong kỳ *')).toHaveValue('700');await dialog.getByRole('button',{name:'Hủy',exact:true}).click();
 const pdfLines=['C12-TS',`Thang ${month.slice(5)} nam ${month.slice(0,4)}`,'Ma don vi: FOREIGN123','THONG BAO KET QUA DONG BAO HIEM XA HOI'];
 const stream=pdfLines.map((line,index)=>`BT /F1 12 Tf 50 ${780-index*25} Td (${line}) Tj ET`).join('\n');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let pdf='%PDF-1.4\n';const offsets=[0];for(const [index,obj] of objects.entries()){offsets.push(Buffer.byteLength(pdf));pdf+=`${index+1} 0 obj\n${obj}\nendobj\n`;}
 const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 await page.getByLabel('Chọn C12 PDF').setInputFiles({name:'foreign-c12.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)});dialog=page.getByRole('dialog');
 await expect(dialog.getByRole('heading',{name:'Kiểm tra số liệu từ C12'})).toBeVisible({timeout:60000});
 await expect(dialog.getByLabel('Mã đơn vị BHXH',{exact:true})).toHaveValue(foreign.id);await expect(dialog.getByLabel('Mã đơn vị BHXH',{exact:true})).toBeDisabled();
 await expect(dialog.getByLabel('Phát sinh trong kỳ *')).toHaveValue('900');await dialog.getByRole('button',{name:'Hủy',exact:true}).click();
 await page.getByRole('button',{name:'Nhắc khách kỳ này'}).click();dialog=page.getByRole('dialog');
 await expect(dialog.getByLabel('Mã đơn vị nhắc đóng')).toHaveValue(legal.id);await expect(dialog.getByLabel('Số tiền cần đóng (đồng)')).toHaveValue('700');
 await expect(dialog.getByLabel('Tài khoản nhận',{exact:true})).toHaveValue(second.id);
 await expect(dialog.getByLabel('Cú pháp chuyển khoản',{exact:true})).toHaveValue(new RegExp('LEGAL123'));
 await dialog.getByRole('checkbox',{name:'Tạo QR tài khoản + số tiền; tôi sẽ gửi kèm cú pháp để khách dán vào nội dung.'}).check();await dialog.getByRole('button',{name:'Tạo QR thanh toán',exact:true}).click();
 const image=dialog.getByRole('img',{name:'QR và thông tin đóng BHXH'});await expect(image).toBeVisible();
 const pixels=await image.evaluate(async img=>{await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const c=canvas.getContext('2d');c.drawImage(img,0,0);const d=c.getImageData(0,0,canvas.width,Math.min(560,canvas.height));return {data:[...d.data],width:d.width,height:d.height};});
 const qr=jsQR(Uint8ClampedArray.from(pixels.data),pixels.width,pixels.height);assert.ok(qr?.data.includes(second.account_no));assert.ok(qr.data.includes('700'));
 await dialog.getByLabel('Hạn đóng *',{exact:true}).fill(today);await dialog.getByRole('button',{name:'Lưu theo dõi',exact:true}).click();await expect(dialog).toHaveCount(0);
 const saved=(await scalar('select bhxh_followup_portal($1)',[staff])).records[0];assert.equal(saved.unit_id,legal.id);assert.equal(saved.transfer_details.unit_code,'LEGAL123');
 await page.goto(`${origin}/insurance?tab=reminders&client=${client}`);
 await page.getByRole('button',{name:'Thêm khoản theo dõi',exact:true}).click();dialog=page.getByRole('dialog');
 await expect(dialog.getByLabel('Mã đơn vị nhắc đóng')).toHaveValue('');await expect(dialog.getByLabel('Số tiền cần đóng (đồng)')).toHaveValue('');
 await dialog.getByLabel('Mã đơn vị nhắc đóng').selectOption(employee.id);
 await expect(dialog.getByLabel('Số tiền cần đóng (đồng)')).toHaveValue('400');await expect(dialog.getByLabel('Tài khoản nhận',{exact:true})).toHaveValue(account.id);
 await dialog.getByLabel('Số tiền cần đóng (đồng)').fill('450');await dialog.getByLabel('Mã đơn vị nhắc đóng').selectOption(foreign.id);
 await expect(dialog.getByLabel('Số tiền cần đóng (đồng)')).toHaveValue('900');await expect(dialog.getByLabel('Cơ sở nhận tiền',{exact:true})).toHaveValue('');
 await dialog.getByRole('button',{name:'Hủy',exact:true}).click();
 await page.goto(`${origin}/insurance?tab=payments&client=${client}`);
 const overview=page.getByRole('region',{name:'Khách đang dùng dịch vụ BHXH'});
 await expect(overview).toContainText('2.300 đ');await expect(overview.getByRole('button',{name:'Ghi tiền nộp'})).toHaveCount(3);
 await overview.locator('tr').filter({hasText:'Đại diện pháp luật · LEGAL123'}).getByRole('button',{name:'Ghi tiền nộp'}).click();dialog=page.getByRole('dialog');
 await expect(dialog.getByLabel('Mã đơn vị BHXH',{exact:true})).toHaveValue(legal.id);await expect(dialog.getByLabel('Số tiền nộp *')).toHaveValue('800');
 await dialog.getByLabel('Mã đơn vị BHXH',{exact:true}).selectOption(foreign.id);await expect(dialog.getByLabel('Số tiền nộp *')).toHaveValue('1000');
 await dialog.getByRole('button',{name:'Hủy',exact:true}).click();
 await page.screenshot({path:path.join(output,'payments-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.goto(`${origin}/insurance?tab=units&client=${client}`);await expect(page.locator('article')).toBeVisible();
 await page.screenshot({path:path.join(output,'units-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('PASS: UI classifies legacy without moving data, creates three codes, scoped C12, code-specific reminders/defaults/QR, payment suggestions, totals, desktop/mobile. Screenshots:',output);
} finally { await browser.close();await db.close(); }
