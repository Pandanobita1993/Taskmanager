import { workNoteSummary } from './workNotes';

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

export function accountingReportKind(task: any): 'entry' | 'print' | null {
  if (task.type === 'payment' || !['ke_toan', 'ra_soat', 'misa', 'nhap_lieu', ''].includes(task.action_type || '')) return null;
  const content = normalized(task.content || '');
  if (['misa', 'nhap_lieu'].includes(task.action_type) || /^nhap\s+lieu\b/.test(content)
    || /^(nhap|hach toan)\b[\s\S]*\bmisa\b/.test(content) || /^misa\s*[:-]?\s*(nhap|hach toan)\b/.test(content)) return 'entry';
  if (/^in\b[\s\S]*\b(chung tu|hoa don|so sach|so ke toan|so)\b/.test(content)) return 'print';
  return null;
}

export function accountingEntryContent(content: string) {
  // The existing form stores both the document type and entered period in content.
  return content.replace(/^Nhập\s+liệu\s*:\s*/i, '').replace(/\s+-\s*Đến\s*:\s*/i, '\nKỳ / mốc ghi nhận: ');
}

export function reportTaskNotes(task: any) {
  return [...new Set([workNoteSummary(task.notes || ''), workNoteSummary(task.resolution_note || '')].filter(Boolean))].join('\n');
}

export function wrappedReportRowHeight(row: any[], widths: number[], minimum = 28) {
  const lines = Math.max(1, ...row.map((value, column) => String(value ?? '').split('\n')
    .reduce((count, line) => count + Math.max(1, Math.ceil(line.length / Math.max(8, widths[column] - 4))), 0)));
  return Math.min(409, Math.max(minimum, lines * 15 + 12));
}
