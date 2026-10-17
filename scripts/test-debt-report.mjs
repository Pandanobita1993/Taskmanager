import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { buildDebtReportModel } from '../src/lib/debtReportData.ts';

// Exercise the app's actual formatter without a browser or a second copy of its logic.
const require = createRequire(import.meta.url);
const ts = require('typescript');
const modules = new Map();
let rpcStub;
function loadTs(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = specifier => {
    // The unrelated work-report clock is not exercised by these formatter tests.
    if (specifier === './date') return { localDateKey: () => '2026-10-17' };
    if (specifier === './supabase') return { supabase: { rpc: (...args) => rpcStub(...args) } };
    return specifier.startsWith('.') ? loadTs(path.resolve(path.dirname(file), `${specifier}.ts`)) : require(specifier);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}
const { buildDebtReportSheet } = loadTs(path.resolve(import.meta.dirname, '../src/lib/debtReportExcel.ts'));

const base = () => ({ available: true, loadedAt: '2026-10-17T05:00:00Z', clients: [
  { id: 'a', name: 'Khách A', tax_code: '00123' }, { id: 'b', name: 'Khách B' },
], receivables: [], payments: [], payment_checks: [] });
const task = (id, client = 'a', date = '2026-10-10') => ({ id, client_id: client, type: 'payment', created_at: date, status: 'completed' });
const period = { startDate: '2026-10-01', endDate: '2026-10-17' };
const source = base();
source.receivables = [{ id: 'r1', client_id: 'a', amount: 1000000, paid: 400000 }];
source.payments = [{ id: 'p1', receivable_id: 'r1', task_id: 't1', amount: 400000, payment_date: '2026-10-12', created_at: '2026-10-12', confirmed_by: 'Giám đốc' }];
source.payment_checks = [{ task_id: 't1', status: 'confirmed', checked_at: '2026-10-12', checked_by: 'Giám đốc' },
  { task_id: 't2', status: 'not_received', checked_at: '2026-10-13', checked_by: 'Giám đốc' }];
const result = buildDebtReportModel(source, [task('t1'), task('t2'), task('t3'), task('t4', 'b')], period);
assert.equal(result.summary[0].remaining, 600000, 'Chỉ thực nhận đã xác minh mới giảm nợ');
assert.equal(result.detail.find(row => row.id === 'task:t1').confirmedAmount, 400000);
assert.equal(result.detail.find(row => row.id === 'task:t2').status, 'not_received');
assert.equal(result.detail.find(row => row.id === 'task:t2').confirmedAmount, null);
assert.equal(result.detail.find(row => row.id === 'task:t3').status, 'pending', 'Hoàn thành công việc chưa chứng minh đã nhận tiền');
assert.equal(result.summary[0].pending, 1);
assert.equal(result.summary[1].due, null, 'Chưa nhập công nợ không được xem là số dư 0');
assert.equal(result.summary[1].remaining, null);
assert.equal(result.summary[1].status, 'Chưa nhập công nợ');

const manual = base();
manual.receivables = [{ id: 'r1', client_id: 'a', amount: 1000000 }];
manual.payments = [
  { id: 'p1', receivable_id: 'r1', task_id: null, amount: 300000, payment_date: '2026-10-01', created_at: '2026-10-01' },
  { id: 'p2', receivable_id: 'r1', task_id: null, amount: 200000, payment_date: '2026-10-17', created_at: '2026-10-17' },
  { id: 'p3', receivable_id: 'r1', task_id: null, amount: 100000, payment_date: '2026-09-30', created_at: '2026-09-30' },
  { id: 'p4', receivable_id: 'r1', task_id: null, amount: 900000, payment_date: '2026-10-10', created_at: '2026-10-10', is_void: true },
];
const manualResult = buildDebtReportModel(manual, [], period);
assert.equal(manualResult.detail.length, 3, 'Lọc kỳ chi tiết bao gồm cả hai ngày đầu và cuối');
assert.equal(manualResult.summary[0].paid, 600000, 'Số dư hiện tại bao gồm thực nhận trước kỳ, bỏ xác nhận đã hủy');
assert.equal(manualResult.summary[0].remaining, 400000);
assert.equal(manualResult.detail.find(row => row.id === 'payment:p4').confirmedAmount, null);
assert.equal(manualResult.summary[0].checkedAt, '2026-10-17');

const canceled = structuredClone(source);
canceled.payments[0].is_void = true;
delete canceled.receivables[0].paid;
canceled.payment_checks = [];
const canceledResult = buildDebtReportModel(canceled, [task('t1')], period);
assert.equal(canceledResult.summary[0].remaining, 1000000);
assert.equal(canceledResult.detail[0].status, 'pending');
assert.equal(canceledResult.detail[0].confirmedAmount, null);

const failed = buildDebtReportModel({ ...source, available: false }, [task('t1')], period);
assert.equal(failed.summary[0].due, null);
assert.equal(failed.detail[0].status, 'unavailable', 'Lỗi tải phải phân biệt với chưa được sếp xác minh');
assert.equal(failed.detail[0].confirmedAmount, null);

const linkedOutsidePeriod = buildDebtReportModel(source, [task('t1', 'a', '2026-09-30')], period);
assert.equal(linkedOutsidePeriod.detail.length, 0);
assert.equal(linkedOutsidePeriod.summary[0].remaining, 600000);
assert.equal(linkedOutsidePeriod.summary[0].checkedAt, '2026-10-12');
assert.equal(buildDebtReportModel(base(), [], period).summary.length, 0);
assert.throws(() => buildDebtReportModel({ ...source, receivables: [{ ...source.receivables[0], amount: null }] }, [], period), /số tiền hợp lệ/);

source.payment_checks[0].checked_at = '2026-10-12T18:05:00Z';
const formatted = buildDebtReportSheet(source, [task('t1'), task('t4', 'b')], 'QA', {}, 'Kỳ kiểm tra', period).ws;
assert.equal(formatted.C11.t, 's');
assert.equal(formatted.C11.v, '00123', 'Mã số thuế phải giữ số 0 đầu');
assert.equal(formatted.D11.t, 'n');
assert.equal(formatted.D11.v, 1000000);
assert.match(formatted.D11.z, /#,##0/);
assert.equal(formatted.F11.f, 'MAX(0,D11-E11)');
assert.equal(formatted.F11.v, 600000, 'Công thức có giá trị cache cho phần mềm xem trước');
assert.equal(formatted.F12.v, '', 'Công nợ chưa nhập để trống trong Excel');
assert.equal(formatted.F13.f, 'SUM(F11:F12)');
assert.equal(formatted.F13.v, 600000);
assert.equal(formatted.I11.t, 'n');
assert.equal(formatted.I11.v, Date.UTC(2026, 9, 13) / 86400000 + 25569, 'Ngày xác minh theo múi giờ Việt Nam');
assert.equal(formatted.I11.z, 'dd/mm/yyyy');

const { loadDebtReportSource } = loadTs(path.resolve(import.meta.dirname, '../src/lib/debtReportSource.ts'));
let calls = 0;
rpcStub = async () => { calls++; return { data: structuredClone(source) }; };
const combined = await loadDebtReportSource(['staff1', 'staff2', 'staff1']);
assert.equal(calls, 2);
assert.equal(combined.receivables.length, 1);
assert.equal(combined.payments.length, 1, 'Khách chung của hai nhân viên không được cộng tiền hai lần');
assert.equal(buildDebtReportModel(combined, [task('t1')]).summary[0].remaining, 600000);
rpcStub = async (_, args) => args.p_staff_id === 'staff1' ? { data: source } : { error: { code: 'PGRST202' } };
const partial = await loadDebtReportSource(['staff1', 'staff2']);
assert.equal(partial.available, false);
assert.equal(partial.receivables.length, 0, 'Không xuất tổng tiền thiếu dữ liệu của một nhân viên');
assert.equal(buildDebtReportModel(base(), [task('archived', 'archived-client')]).detail[0].status, 'unavailable');
console.log('Passed: receipt/verification states, unknown balance, date boundaries, voided receipt, load failure, current balance, invalid data, numeric/currency/date cells, cached formulas, shared-client deduplication and scope.');
