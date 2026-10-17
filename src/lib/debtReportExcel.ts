import * as XLSX from 'xlsx-js-style';
import { buildDebtReportModel, type DebtReportOptions, type DebtReportSource } from './debtReportData';
import { formatDateVN, type ReportSettingsType } from './reportExcelHelper';

const MONEY = '#,##0 "đ"';
const border = Object.fromEntries(['top', 'bottom', 'left', 'right'].map(side => [side, { style: 'thin', color: { rgb: 'CBD5E1' } }]));

// Store dates as Excel numbers, using the Vietnam calendar day for timestamps.
function excelDate(value?: string) {
  if (!value) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const day = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
  const [year, month, date] = day.split('-').map(Number);
  const serial = Date.UTC(year, month - 1, date) / 86400000 + 25569;
  if (!Number.isFinite(serial)) throw new Error('Có ngày xác minh không hợp lệ. Vui lòng kiểm tra dữ liệu.');
  return { t: 'n', v: serial, z: 'dd/mm/yyyy' };
}

export function buildDebtReportSheet(source: DebtReportSource, tasks: any[], userName: string,
  settings: ReportSettingsType | null | undefined, periodText: string, options: DebtReportOptions = {}) {
  const model = buildDebtReportModel(source, tasks, options);
  const rows: any[][] = [];
  const merges: XLSX.Range[] = [];
  const fullRows = new Set<number>();
  const headerRows = new Set<number>();
  const sectionRows = new Set<number>();
  const addFull = (text: string) => {
    const r = rows.length;
    rows.push([text]);
    merges.push({ s: { r, c: 0 }, e: { r, c: 9 } });
    fullRows.add(r);
    return r;
  };
  addFull((settings?.company_name || 'CÔNG TY TNHH DỊCH VỤ KẾ TOÁN AN AN').toUpperCase());
  addFull('GHI NHẬN CÔNG NỢ KHÁCH HÀNG');
  addFull(`Nhân sự / phạm vi: ${userName}${settings?.office_name ? ` — ${settings.office_name}` : ''}`);
  addFull(periodText);
  addFull(`Công nợ tại thời điểm xuất: ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(model.loadedAt))}`);
  addFull('Số dư là số hiện tại; chi tiết báo thu theo kỳ báo cáo. Chỉ tiền thực nhận được sếp xác nhận mới giảm công nợ.');
  const warningRow = addFull(model.warning || 'Ô tiền trống: chưa nhập công nợ hoặc chưa có số tiền được xác minh. Không đồng nghĩa khách đã hết nợ.');
  rows.push([]);
  sectionRows.add(addFull('I. TỔNG HỢP CÔNG NỢ HIỆN TẠI'));
  headerRows.add(rows.length);
  rows.push(['STT', 'Khách hàng', 'Mã số thuế', 'Phải thu\nđã nhập', 'Thực nhận\nđã xác minh', 'Còn phải thu', 'Báo thu trong kỳ\nchờ xác minh', 'Tình trạng công nợ', 'Ngày xác minh\ngần nhất', 'Người xác minh']);
  const summaryStart = rows.length;
  model.summary.forEach((client, index) => {
    const r = rows.length + 1;
    rows.push([index + 1, client.name, client.taxCode, client.due, client.paid,
      client.remaining === null ? null : { t: 'n', f: `MAX(0,D${r}-E${r})`, v: client.remaining },
      client.pending, client.status, excelDate(client.checkedAt), client.checkedBy]);
  });
  const summaryEnd = rows.length - 1;
  if (!model.summary.length) addFull(model.available ? 'Chưa có khách hàng hoặc khoản công nợ trong phạm vi báo cáo.' : 'Chưa tải được dữ liệu công nợ.');
  const totalRow = rows.length;
  const known = model.summary.some(client => client.due !== null);
  const totalCell = (column: string, value: number, hasValue: boolean) => hasValue
    ? { t: 'n', f: `SUM(${column}${summaryStart + 1}:${column}${summaryEnd + 1})`, v: value } : null;
  rows.push(['TỔNG CỘNG', null, null,
    totalCell('D', model.summary.reduce((sum, row) => sum + (row.due ?? 0), 0), known),
    totalCell('E', model.summary.reduce((sum, row) => sum + (row.paid ?? 0), 0), known),
    totalCell('F', model.summary.reduce((sum, row) => sum + (row.remaining ?? 0), 0), known),
    totalCell('G', model.summary.reduce((sum, row) => sum + (row.pending ?? 0), 0), model.available && model.summary.length > 0),
    'Các khoản đã nhập', null, null]);
  merges.push({ s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 2 } });
  addFull('Tổng tiền chỉ gồm khách có công nợ đã nhập. Khách chưa nhập công nợ cần được bổ sung số dư.');
  rows.push([]);
  sectionRows.add(addFull('II. CHI TIẾT BÁO THU VÀ XÁC MINH CỦA SẾP'));
  headerRows.add(rows.length);
  rows.push(['STT', 'Khách hàng', 'Ngày ghi nhận', 'Nội dung / kỳ thanh toán', 'Trạng thái sếp xác minh', 'Số tiền thực nhận\nđã xác minh', 'Ngày nhận tiền', 'Ngày xác minh', 'Người xác minh', 'Phản hồi / ghi chú']);
  const detailStart = rows.length;
  model.detail.forEach((item, index) => rows.push([index + 1, item.clientName, excelDate(item.recordedAt), item.content,
    item.verification, item.confirmedAmount, item.paymentDates.length === 1 ? excelDate(item.paymentDates[0]) : item.paymentDates.map(formatDateVN).join('\n'),
    excelDate(item.checkedAt), item.checkedBy, item.note]));
  const detailEnd = rows.length - 1;
  if (!model.detail.length) addFull(model.available ? 'Không có báo thu hoặc khoản sếp ghi nhận trực tiếp trong kỳ.' : 'Chưa tải được dữ liệu xác minh.');

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const widths = [7, 38, 18, 32, 27, 24, 22, 30, 24, 38];
  ws['!cols'] = widths.map(wch => ({ wch }));
  ws['!merges'] = merges;
  ws['!rows'] = rows.map((row, r) => {
    const lines = Math.max(1, ...row.map((value, c) => String(value?.v ?? value ?? '').split('\n')
      .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / (fullRows.has(r) ? 200 : widths[c] - 3))), 0)));
    return { hpt: r === 1 ? 32 : headerRows.has(r) ? 48 : sectionRows.has(r) ? 28 : Math.max(22, lines * 15 + 10) };
  });
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < 10; c++) {
    const ref = XLSX.utils.encode_cell({ r, c });
    const cell = ws[ref] ||= { t: 's', v: '' };
    const summary = r >= summaryStart && r <= summaryEnd;
    const detail = r >= detailStart && r <= detailEnd;
    const table = summary || detail || headerRows.has(r) || r === totalRow;
    const heading = headerRows.has(r) || sectionRows.has(r);
    const money = (summary || r === totalRow) ? [3, 4, 5].includes(c) : detail && c === 5;
    let color = heading ? 'FFFFFF' : '0F172A';
    let bg = heading ? '1E3A8A' : r === totalRow ? 'DBEAFE' : table && r % 2 ? 'F8FAFC' : 'FFFFFF';
    if (detail && c === 4) {
      const status = model.detail[r - detailStart].status;
      color = status === 'confirmed' ? '166534' : status === 'not_received' ? '991B1B' : '92400E';
      bg = status === 'confirmed' ? 'DCFCE7' : status === 'not_received' ? 'FEE2E2' : 'FEF3C7';
    }
    if (summary && c === 7 && model.summary[r - summaryStart].remaining) color = '991B1B';
    if (r === warningRow) { color = '92400E'; bg = 'FFFBEB'; }
    cell.s = {
      font: { name: 'Times New Roman', sz: r === 1 ? 16 : 11, bold: heading || r <= 1 || r === totalRow || (table && c === 1), color: { rgb: color } },
      fill: { fgColor: { rgb: bg } },
      alignment: { horizontal: heading || r === 1 ? 'center' : money ? 'right' : table && (c === 0 || cell.z === 'dd/mm/yyyy') ? 'center' : 'left', vertical: 'center', wrapText: true },
      ...(table ? { border } : {}),
    };
    if (money && cell.t === 'n') cell.z = MONEY;
  }
  return { ws, model };
}
