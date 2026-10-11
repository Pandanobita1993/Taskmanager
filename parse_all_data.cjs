const fs = require('fs');
const zlib = require('zlib');
const XLSX = require('xlsx');

// 1. Đọc và phân tích 2 file nguồn
const wb1 = XLSX.readFile('D:\\Taskmanager\\2026.10.11 - BAO CAO CONG VIEC VP CAN THO.xlsx');
const wb2 = XLSX.readFile('D:\\Taskmanager\\2026.10.11 - BC NHẬP LIỆU MISA VP CẦN THƠ.xlsx');

// Gom dữ liệu MISA theo [nhân viên] và [tên công ty chuẩn hóa]
const misaMap = {}; // key: employeeName_normalizedClientName -> text
wb2.SheetNames.forEach(sheetName => {
  const ws = wb2.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const cleanEmp = sheetName.trim().toUpperCase();

  let curClient = '';
  let curMisaLines = [];

  for (let r = 7; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;
    const clientCell = row[1];
    const misaCell = row[2];
    const reasonCell = row[3];
    const printCell = row[4];

    if (clientCell && String(clientCell).trim()) {
      if (curClient && curMisaLines.length > 0) {
        const key = cleanEmp + '_' + curClient.toLowerCase().replace(/[^a-z0-9]/g, '');
        misaMap[key] = curMisaLines.join('\n');
      }
      curClient = String(clientCell).trim();
      curMisaLines = [];
    }

    let lineParts = [];
    if (misaCell && String(misaCell).trim()) lineParts.push(String(misaCell).trim());
    if (reasonCell && String(reasonCell).trim()) lineParts.push('Vướng: ' + String(reasonCell).trim());
    if (printCell && String(printCell).trim()) lineParts.push('In: ' + String(printCell).trim());

    if (lineParts.length > 0) {
      curMisaLines.push(lineParts.join(' | '));
    }
  }

  if (curClient && curMisaLines.length > 0) {
    const key = cleanEmp + '_' + curClient.toLowerCase().replace(/[^a-z0-9]/g, '');
    misaMap[key] = curMisaLines.join('\n');
  }
});

console.log('MISA map entries:', Object.keys(misaMap).length);

// Danh sách các Sheet nhân viên trong File 1 cần trích xuất
const EMP_SHEETS = [
  { sheet: 'CHỊ NGÂN', name: 'Đỗ Kim Ngân', roleDefault: 'Kế toán' },
  { sheet: 'MAI', name: 'Tô Thị Ngọc Mai', roleDefault: 'Kế toán' },
  { sheet: 'LÊ', name: 'Nguyễn Thị Bạch Lê', roleDefault: 'Kế toán' },
  { sheet: 'THƯ', name: 'Trần Thị Minh Thư', roleDefault: 'Kế toán' },
  { sheet: 'THẢO', name: 'Lê Huỳnh Thảo', roleDefault: 'Kế toán' },
  { sheet: 'HIỀN', name: 'Lâm Diệu Hiền', roleDefault: 'Kế toán' },
  { sheet: 'NHUNG', name: 'Lê Thị Cẩm Nhung', roleDefault: 'Kế toán' },
  { sheet: 'SANG TUYỀN', name: 'Bùi Thị Sang Tuyền', roleDefault: 'Kế toán' },
  { sheet: 'YẾN', name: 'Cao Sơn Hoàng Yến', roleDefault: 'Kế toán' },
  { sheet: 'TUYẾT MAI', name: 'Hồ Thị Tuyết Mai', roleDefault: 'Kế toán' },
  { sheet: 'HÂN', name: 'Trần Võ Ngọc Hân', roleDefault: 'Kế toán' },
  { sheet: 'PHÚC BAO CAO ĐKGP', name: 'Bùi Vĩnh Phúc', roleDefault: 'Setup' },
  { sheet: 'TRĂM', name: 'Lê Thị Minh Trăm', roleDefault: 'Kế toán' },
  { sheet: 'ĐẠT', name: 'Nguyễn Thành Đạt', roleDefault: 'Kế toán' },
  { sheet: 'ĐA NA', name: 'Bùi Thị Đa Na', roleDefault: 'Kế toán' },
  { sheet: 'HÀ', name: 'Nguyễn Thị Ngọc Hà', roleDefault: 'Kế toán' },
  { sheet: 'BÍCH TRÂM', name: 'Nguyễn Trần Bích Trâm', roleDefault: 'Kế toán' },
  { sheet: 'TRINH', name: 'Lê Thị Tú Trinh', roleDefault: 'Bảo hiểm xã hội' }
];

const allEmployeeRecords = []; // Lưu danh sách phẳng cho từng nhân viên và tổng hợp
const clientAggregatedMap = {}; // Key: normalizedClientName -> List of tasks with employee info

EMP_SHEETS.forEach(emp => {
  const ws = wb1.Sheets[emp.sheet];
  if (!ws) return;
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const empSheetRecords = [];

  let curClient = '';
  let startRow = 8;
  if (emp.sheet === 'TRINH') startRow = 8;

  for (let r = startRow; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;

    // Kiểm tra hàng trắng
    const hasData = row.some(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (!hasData) continue;

    const sttCell = row[0];
    const clientCell = row[1];
    const workCell = row[2];

    if (clientCell && String(clientCell).trim()) {
      curClient = String(clientCell).trim();
    }

    if (!curClient) continue;
    if (curClient.toLowerCase().startsWith('ghi chú') || curClient.toLowerCase().startsWith('tổng')) continue;

    let role = emp.roleDefault;
    let work = workCell ? String(workCell).trim() : '';
    let dossier = '';
    let result = '';
    let pending = '';
    let fee = '';
    let debt = '';
    let subDate = '';
    let paper = '';
    let note = '';

    if (emp.roleDefault === 'Bảo hiểm xã hội') {
      // Sheet TRINH: Cột 2: Việc, Cột 3: MS Hồ sơ, Cột 4: Duyệt, Cột 5: Kết quả
      dossier = row[3] ? ('MS HS: ' + String(row[3]).trim()) : '';
      const isApproved = row[4];
      const resVal = row[5] ? String(row[5]).trim() : '';
      result = isApproved === true || isApproved === 'true' || isApproved === 1 ? 'ĐÃ DUYỆT' : (resVal || 'Đang xử lý');
      if (resVal && !result.includes(resVal)) result += ` (${resVal})`;
    } else if (emp.roleDefault === 'Setup') {
      // Sheet PHUC: Cột 2: Việc, Cột 3: Sở tại, Cột 4: Hồ sơ gồm, Cột 5: Tiến độ, Cột 6: Trạng thái, Cột 7: Ngày nộp, Cột 8: Ngày tra KQ, Cột 9: Vướng mắc, Cột 10: Ghi chú
      dossier = row[3] ? String(row[3]).trim() : '';
      paper = row[4] ? String(row[4]).trim() : '';
      result = (row[5] ? String(row[5]).trim() : '') + (row[6] ? ' - ' + String(row[6]).trim() : '');
      if (row[7]) subDate = String(row[7]).trim();
      pending = row[9] ? String(row[9]).trim() : '';
      note = row[10] ? String(row[10]).trim() : '';
    } else {
      // Kế toán
      // Cột 3: KẾT QUẢ, Cột 4: CHƯA LÀM ĐƯỢC, Cột 5: PHÍ DVKT, Cột 6: CÔNG NỢ, Cột 7: NGÀY NỘP BC, Cột 8: VƯỚNG MẮC, Cột 9: CHỨNG TỪ GÌ CẦN BC, Cột 10: NGÀY GIAO CHỨNG TỪ, Cột 11: GHI CHÚ
      result = row[3] ? String(row[3]).trim() : '';
      pending = row[4] ? String(row[4]).trim() : '';
      fee = row[5] ? String(row[5]).trim() : '';
      debt = row[6] ? String(row[6]).trim() : '';
      subDate = row[7] ? String(row[7]).trim() : '';
      const hardIssue = row[8] ? String(row[8]).trim() : '';
      if (hardIssue) pending = (pending ? pending + '\n' : '') + 'Khó khăn: ' + hardIssue;
      paper = row[9] ? String(row[9]).trim() : '';
      note = row[11] ? String(row[11]).trim() : '';

      // Tự động ghép MISA vào nếu có
      const normKey = emp.sheet.trim().toUpperCase().replace('CHỊ ', '').replace('SANG ', '') + '_' + curClient.toLowerCase().replace(/[^a-z0-9]/g, '');
      const misaDetail = misaMap[normKey] || misaMap[emp.sheet.trim().toUpperCase() + '_' + curClient.toLowerCase().replace(/[^a-z0-9]/g, '')];
      if (misaDetail) {
        work = (work ? work + '\n' : '') + '[Tiến độ MISA]: ' + misaDetail;
      }
    }

    if (!work && !result && !pending) continue;

    const record = {
      empName: emp.name,
      client: curClient,
      role,
      work: work || '(Đang thực hiện công việc cho khách hàng)',
      dossier,
      result: result || 'Đang xử lý',
      pending,
      fee,
      debt,
      subDate,
      paper,
      note
    };

    empSheetRecords.push(record);

    // Ghép vào Tổng hợp theo khách hàng
    const clientKey = curClient.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!clientAggregatedMap[clientKey]) {
      clientAggregatedMap[clientKey] = {
        clientName: curClient,
        tasks: []
      };
    }
    clientAggregatedMap[clientKey].tasks.push(record);
  }

  allEmployeeRecords.push({
    sheetTitle: emp.name.toUpperCase().substring(0, 31),
    empName: emp.name,
    records: empSheetRecords
  });

  console.log(`Employee: ${emp.name} -> ${empSheetRecords.length} tasks`);
});

console.log('Total unique clients in summary:', Object.keys(clientAggregatedMap).length);

module.exports = {
  allEmployeeRecords,
  clientAggregatedMap
};
