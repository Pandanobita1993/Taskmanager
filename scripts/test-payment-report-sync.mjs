import assert from 'node:assert/strict';
import {
  buildReminderTaskDetails,
  isSameDayReminderTask,
  syncReminderToWorkReport,
} from '../src/lib/paymentReportSync.ts';

// 1. Test buildReminderTaskDetails for BHXH save & notify
const bhxhSave = buildReminderTaskDetails({
  action: 'save',
  kind: 'bhxh',
  period: 'Tháng 11/2026',
  amount: '12500000',
  dueOn: '2026-11-30',
  notes: 'Khách đóng qua VietinBank',
  eventNote: '',
  unitCode: 'TZ0123A',
});
assert.equal(bhxhSave.actionType, 'bhxh');
assert.equal(bhxhSave.kindLabel, 'BHXH');
assert.equal(bhxhSave.content, 'Thông báo nhắc khách đóng BHXH · Tháng 11/2026 · Mã ĐV: TZ0123A · 12.500.000 đ');
assert.match(bhxhSave.notes, /Tự động ghi nhận từ mục Nhắc khách đóng BHXH/);
assert.match(bhxhSave.resolutionNote, /Đã tạo thông báo nhắc khách đóng tiền · Hạn đóng: 30\/11\/2026/);

const bhxhNotify = buildReminderTaskDetails({
  action: 'notify',
  kind: 'bhxh',
  period: 'Tháng 11/2026',
  amount: '12500000',
  dueOn: '2026-11-30',
  notes: '',
  eventNote: 'Đã nhắn Zalo kèm QR',
  unitCode: 'TZ0123A',
  notificationCount: 2,
});
assert.equal(bhxhNotify.content, 'Nhắc khách đóng BHXH (lần 2) · Tháng 11/2026 · Mã ĐV: TZ0123A · 12.500.000 đ');
assert.equal(bhxhNotify.resolutionNote, 'Đã nhắn Zalo kèm QR · Hạn đóng: 30/11/2026');

// 2. Test Tax reminder
const taxSave = buildReminderTaskDetails({
  action: 'save',
  kind: 'thue_gtgt',
  period: 'Quý 4/2026',
  amount: '',
  dueOn: '2027-01-30',
  notes: '',
  eventNote: '',
});
assert.equal(taxSave.actionType, 'ke_toan');
assert.equal(taxSave.content, 'Thông báo nhắc khách đóng Thuế GTGT · Quý 4/2026');

// 3. Test isSameDayReminderTask matching & isolation
assert.equal(isSameDayReminderTask(bhxhSave.content, 'Tháng 11/2026', 'BHXH', 'TZ0123A'), true);
assert.equal(isSameDayReminderTask(bhxhSave.content, 'Tháng 11/2026', 'BHXH', 'TZ9999B'), false);
assert.equal(isSameDayReminderTask(bhxhSave.content, 'Tháng 10/2026', 'BHXH', 'TZ0123A'), false);
assert.equal(isSameDayReminderTask(taxSave.content, 'Quý 4/2026', 'Thuế GTGT'), true);
assert.equal(isSameDayReminderTask('Kê khai thuế tháng 11/2026', 'Tháng 11/2026', 'Thuế GTGT'), false);

// 4. Test syncReminderToWorkReport end-to-end with mock DB (create -> same-day dedupe update -> new day create)
function createMockDb() {
  const rows = [];
  let seq = 1;
  return {
    rows,
    from(table) {
      assert.equal(table, 'tasks');
      return {
        select() {
          const filters = {};
          const chain = {
            eq(k, v) { filters[k] = v; return chain; },
            in(k, v) { filters[`in:${k}`] = v; return chain; },
            async limit() {
              const matched = rows.filter(r =>
                (!filters.client_id || r.client_id === filters.client_id)
                && (!filters.intake_date || r.intake_date === filters.intake_date)
                && (!filters.action_type || r.action_type === filters.action_type)
                && (!filters['in:user_id'] || filters['in:user_id'].includes(r.user_id))
              );
              return { data: matched, error: null };
            },
          };
          return chain;
        },
        update(patch) {
          return {
            async eq(k, v) {
              assert.equal(k, 'id');
              const target = rows.find(r => r.id === v);
              assert.ok(target);
              Object.assign(target, patch);
              return { error: null };
            },
          };
        },
        async insert(items) {
          for (const item of items) {
            rows.push({ id: `task-${seq++}`, ...item });
          }
          return { error: null };
        },
      };
    },
  };
}

const db = createMockDb();
const baseForm = {
  id: 'followup-1',
  client_id: 'client-1',
  kind: 'bhxh',
  period: 'Tháng 11/2026',
  amount: '12500000',
  due_on: '2026-11-30',
  notes: 'Gửi QR cho kế toán trưởng',
  event_note: '',
};

const res1 = await syncReminderToWorkReport({
  staffId: 'staff-1',
  staffName: 'Ngô Minh Tiến',
  action: 'save',
  form: baseForm,
  client: { contact_name: 'Chị Lan', contact_phone: '0909123456' },
  unitCode: 'TZ0123A',
  today: '2026-11-11',
}, db);

assert.deepEqual(res1, { synced: true, mode: 'created' });
assert.equal(db.rows.length, 1);
assert.equal(db.rows[0].status, 'completed');
assert.equal(db.rows[0].type, 'normal');
assert.equal(db.rows[0].action_type, 'bhxh');
assert.equal(db.rows[0].intake_date, '2026-11-11');
assert.equal(db.rows[0].contact_person, 'Chị Lan');

// Calling notify on the SAME day should update instead of creating a duplicate
const res2 = await syncReminderToWorkReport({
  staffId: 'staff-1',
  staffName: 'Ngô Minh Tiến',
  action: 'notify',
  form: { ...baseForm, event_note: 'Đã nhắn Zalo' },
  client: { contact_name: 'Chị Lan', contact_phone: '0909123456' },
  unitCode: 'TZ0123A',
  today: '2026-11-11',
  notificationCount: 1,
}, db);

assert.deepEqual(res2, { synced: true, mode: 'updated' });
assert.equal(db.rows.length, 1);
assert.match(db.rows[0].content, /Nhắc khách đóng BHXH \(lần 1\)/);
assert.match(db.rows[0].resolution_note, /Đã nhắn Zalo/);

// Calling notify on a DIFFERENT day creates a new work report record for that day
const res3 = await syncReminderToWorkReport({
  staffId: 'staff-1',
  staffName: 'Ngô Minh Tiến',
  action: 'notify',
  form: { ...baseForm, event_note: 'Nhắc lại lần 2' },
  client: { contact_name: 'Chị Lan', contact_phone: '0909123456' },
  unitCode: 'TZ0123A',
  today: '2026-11-14',
  notificationCount: 2,
}, db);

assert.deepEqual(res3, { synced: true, mode: 'created' });
assert.equal(db.rows.length, 2);
assert.equal(db.rows[1].intake_date, '2026-11-14');

console.log('✓ Tất cả kiểm thử đồng bộ nhắc khách đóng BHXH/Thuế vào báo cáo công việc đều thành công!');
