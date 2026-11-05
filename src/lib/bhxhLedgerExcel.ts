import * as XLSX from 'xlsx-js-style';
import type { BhxhPayment } from './bhxhLedger';
import { bhxhMonthLabel } from './bhxhLedger';
import { bhxhUnitKindLabel } from './bhxhUnits';
import { recurringDateLabel } from './recurringTasks';
import { saveFileToPreferredDirectory } from './fileStorage';

export async function exportBhxhPaymentsExcel(
  payments: BhxhPayment[],
  clientName?: string,
  taxCode?: string,
  unitCode?: string,
  monthFilter?: string
): Promise<{ fileName: string; savedToFolder: boolean; savedPath?: string }> {
  const wb = XLSX.utils.book_new();

  const title = `BẢNG KÊ QUÁ TRÌNH NỘP TIỀN BHXH - ${unitCode || clientName || 'TẤT CẢ ĐƠN VỊ'}`.toUpperCase();
  const periodText = monthFilter ? `Tháng nộp: ${bhxhMonthLabel(monthFilter)}` : 'Toàn bộ thời gian';

  const rows: (string | number)[][] = [
    ['CÔNG TY TNHH DỊCH VỤ KẾ TOÁN AN AN - HỆ THỐNG TASKFLOW'],
    [title],
    [`Kỳ đối soát: ${periodText} | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
    []
  ];

  const headers = [
    'STT',
    'Tên khách hàng',
    'Mã số thuế',
    'Mã đơn vị',
    'Nhóm đối tượng',
    'Ngày thực nộp',
    'Tháng tính nộp',
    'Số tiền nộp (VNĐ)',
    'Mã chứng từ / GD',
    'Người ghi nhận',
    'Trạng thái',
    'Ghi chú'
  ];
  rows.push(headers);

  let totalAmount = 0;
  payments.forEach((p, index) => {
    if (!p.is_void) totalAmount += Number(p.amount || 0);
    rows.push([
      index + 1,
      p.client_name || clientName || '',
      taxCode || '',
      p.unit_code || unitCode || '',
      bhxhUnitKindLabel(p.unit_kind),
      recurringDateLabel(p.paid_on),
      bhxhMonthLabel(p.paid_on),
      Number(p.amount || 0),
      p.reference || '',
      p.reporter_name || '',
      p.is_void ? `Đã hủy: ${p.void_reason || ''}` : 'Hợp lệ',
      p.notes || ''
    ]);
  });

  // Total row
  rows.push([
    '',
    'TỔNG CỘNG TIỀN ĐÃ NỘP HỢP LỆ',
    '',
    '',
    '',
    '',
    '',
    totalAmount,
    '',
    '',
    '',
    ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 34 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 30 }
  ];

  const borderThin = {
    top: { style: 'thin', color: { rgb: 'D0D5DD' } },
    bottom: { style: 'thin', color: { rgb: 'D0D5DD' } },
    left: { style: 'thin', color: { rgb: 'D0D5DD' } },
    right: { style: 'thin', color: { rgb: 'D0D5DD' } }
  };

  const headerStyle = {
    fill: { fgColor: { rgb: '065F46' } },
    font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderThin
  };

  const cellStyle = {
    font: { name: 'Times New Roman', sz: 11 },
    alignment: { vertical: 'center' },
    border: borderThin
  };

  const cellStyleCenter = {
    ...cellStyle,
    alignment: { horizontal: 'center', vertical: 'center' }
  };

  const cellStyleMoney = {
    ...cellStyle,
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0'
  };

  const totalStyle = {
    fill: { fgColor: { rgb: 'ECFDF5' } },
    font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '065F46' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: borderThin,
    numFmt: '#,##0'
  };

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:L1');

  if (ws['A1']) ws['A1'].s = { font: { name: 'Times New Roman', sz: 10, italic: true, color: { rgb: '4B5563' } } };
  if (ws['A2']) ws['A2'].s = { font: { name: 'Times New Roman', sz: 14, bold: true, color: { rgb: '065F46' } } };
  if (ws['A3']) ws['A3'].s = { font: { name: 'Times New Roman', sz: 10, italic: true } };

  // Headers (row index 4)
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 4, c });
    if (ws[addr]) ws[addr].s = headerStyle;
  }

  // Data rows
  for (let r = 5; r < range.e.r; r++) {
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { v: '', t: 's' };
      if (c === 0 || c === 5 || c === 6 || c === 10) {
        ws[addr].s = cellStyleCenter;
      } else if (c === 7) {
        ws[addr].s = cellStyleMoney;
      } else {
        ws[addr].s = cellStyle;
      }
    }
  }

  // Total row (last row)
  const lastRowIdx = range.e.r;
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: lastRowIdx, c });
    if (!ws[addr]) ws[addr] = { v: '', t: 's' };
    ws[addr].s = c === 7 ? totalStyle : { ...totalStyle, alignment: { horizontal: 'center', vertical: 'center' } };
  }

  XLSX.utils.book_append_sheet(wb, ws, 'QuaTrinhDong');

  const safeUnit = (unitCode || 'TatCa').replace(/[\\/:*?"<>|]/g, '_');
  const safeMonth = (monthFilter || 'ToanBo').replace(/[\\/:*?"<>|]/g, '_');
  const fileName = `QuaTrinhDong_BHXH_${safeUnit}_${safeMonth}.xlsx`;

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

  let savedToFolder = false;
  let savedPath: string | undefined;
  try {
    const res = await saveFileToPreferredDirectory(
      fileName,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      {
        taxCode,
        companyName: clientName,
        unitCode
      }
    );
    savedToFolder = res.success;
    savedPath = res.relativePath;
  } catch {
    savedToFolder = false;
  }

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);

  return { fileName, savedToFolder, savedPath };
}
