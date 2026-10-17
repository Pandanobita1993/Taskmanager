import * as XLSX from 'xlsx-js-style';
import { accountingEntryContent, accountingReportKind, reportTaskNotes, wrappedReportRowHeight } from './accountingEntryReport';
import { formatDateVN, STATUS_LABELS, type ReportSettingsType } from './reportExcelHelper';
import { localDateKey } from './date';
import { workNoteSummary } from './workNotes';

// Keep the six-column structure of the company's existing MISA report template.
export function buildMisaReportSheet(tasks: any[], userName: string, settings: ReportSettingsType | null | undefined, periodText: string) {
  const entries = tasks.filter(task => accountingReportKind(task));
  const rows: any[][] = [
    [(settings?.company_name || 'CÔNG TY TNHH DỊCH VỤ KẾ TOÁN AN AN').toUpperCase(), null, null, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'],
    [settings?.address || 'Địa chỉ: 319, Ấp Mới 2, Xã Mỹ Hạnh, Tỉnh Tây Ninh', null, null, 'Độc lập - Tự do - Hạnh phúc'],
    [null, null, null, '---***---'],
    ['BÁO CÁO NHẬP LIỆU MISA'], [periodText], [],
    [`Nhân sự / phạm vi: ${userName}`, null, null, `Văn phòng: ${settings?.office_name || 'Các nhân sự được chọn'}`],
    [`Ngày xuất báo cáo: ${formatDateVN(localDateKey())}`],
    ['Nội dung và kỳ nhập liệu theo thông tin nhân viên ghi nhận. Trạng thái thực tế được ghi riêng; không tự xem việc đang chờ là đã hoàn thành.'],
    ['STT', 'TÊN CÔNG TY / MÃ SỐ THUẾ', 'NHẬP LIỆU MISA\nNỘI DUNG VÀ KỲ GHI NHẬN', 'CHƯA NHẬP / CẦN XỬ LÝ TIẾP\nVÀ LÝ DO', 'IN CHỨNG TỪ / SỔ SÁCH', 'TRẠNG THÁI / NHÂN SỰ / GHI CHÚ'],
  ];
  const merges: XLSX.Range[] = [];
  for (const r of [0, 1, 6]) { merges.push({ s: { r, c: 0 }, e: { r, c: 2 } }, { s: { r, c: 3 }, e: { r, c: 5 } }); }
  merges.push({ s: { r: 2, c: 3 }, e: { r: 2, c: 5 } });
  for (const r of [3, 4, 7, 8]) merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
  const groups = new Map<string, any[]>();
  entries.forEach(task => {
    const key = task.client_id || `${task.clients?.name || ''}|${task.clients?.tax_code || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(task);
  });
  let number = 0;
  [...groups.values()].sort((a, b) => (a[0].clients?.name || '').localeCompare(b[0].clients?.name || '', 'vi')).forEach(group => {
    const start = rows.length;
    number++;
    group.sort((a, b) => (a.intake_date || a.created_at || '').localeCompare(b.intake_date || b.created_at || '') || String(a.id).localeCompare(String(b.id)));
    group.forEach(task => {
      const kind = accountingReportKind(task);
      const remaining = [workNoteSummary(task.info_pending || ''), task.status === 'failed' ? workNoteSummary(task.failure_reason || task.resolution_note || '') : ''].filter(Boolean);
      const meta = [
        `Trạng thái: ${STATUS_LABELS[task.status] || task.status || 'Chưa ghi nhận'}`,
        `Nhân sự: ${task.report_staff_name || userName}${task.report_office ? ` · ${task.report_office}` : ''}`,
        `Ngày tiếp nhận: ${formatDateVN(task.intake_date || task.created_at)}`,
        task.completed_at ? `Ngày hoàn thành: ${formatDateVN(task.completed_at)}` : '',
        reportTaskNotes(task),
      ].filter(Boolean).join('\n');
      rows.push([number, [task.clients?.name || 'Chưa gán khách hàng', task.clients?.tax_code ? `MST: ${task.clients.tax_code}` : ''].filter(Boolean).join('\n'),
        kind === 'entry' ? accountingEntryContent(task.content || '') : '', [...new Set(remaining)].join('\n'), kind === 'print' ? task.content : '', meta]);
    });
    if (rows.length - start > 1) for (const c of [0, 1]) merges.push({ s: { r: start, c }, e: { r: rows.length - 1, c } });
  });
  if (!entries.length) {
    rows.push(['Chưa có công việc nhập liệu MISA hoặc in chứng từ trong kỳ báo cáo đã chọn.']);
    merges.push({ s: { r: 10, c: 0 }, e: { r: 10, c: 5 } });
  }
  const end = rows.length - 1;
  rows.push([], ['NGƯỜI LẬP BÁO CÁO', null, null, 'QUẢN LÝ / GIÁM ĐỐC DUYỆT']);
  const signature = rows.length - 1;
  merges.push({ s: { r: signature, c: 0 }, e: { r: signature, c: 2 } }, { s: { r: signature, c: 3 }, e: { r: signature, c: 5 } });
  const widths = [6, 43, 57, 43, 40, 55];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = widths.map(wch => ({ wch }));
  ws['!merges'] = merges;
  ws['!rows'] = rows.map((row, r) => ({ hpt: r === 3 ? 34 : r === 9 ? 48 : r >= 10 && r <= end ? entries.length ? wrappedReportRowHeight(row, widths, 50) : 50 : r === 8 ? 32 : 24 }));
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < 6; c++) {
    const ref = XLSX.utils.encode_cell({ r, c });
    const cell = ws[ref] ||= { t: 's', v: '' };
    const body = r >= 9 && r <= end;
    cell.s = {
      font: { name: 'Times New Roman', sz: r === 3 ? 16 : 11, bold: r === 0 || r === 3 || r === 9 || r === signature || (body && c === 1), color: { rgb: r === 9 ? 'FFFFFF' : r === 3 || r === 0 ? '1E3A8A' : '0F172A' } },
      alignment: { horizontal: r === 3 || r === 4 || r === 9 || r === signature || (r <= 2 && c === 3) || (body && c === 0) ? 'center' : 'left', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: r === 9 ? '1E3A8A' : body && r % 2 ? 'F8FAFC' : 'FFFFFF' } },
      ...(body ? { border: Object.fromEntries(['top', 'bottom', 'left', 'right'].map(side => [side, { style: 'thin', color: { rgb: 'CBD5E1' } }])) } : {}),
    };
  }
  return { ws, entries };
}
