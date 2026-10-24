export interface C12Draft {
  period: string | null; unitCode: string | null; opening: number | null; charges: number | null;
  reportedPaid: number | null; reportedClosing: number | null; warnings: string[];
}
export interface PdfTextItem { str: string; transform: number[]; width?: number; height?: number }
const folded = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
// Only plain integers or complete thousands groups; decimals/rates are not money.
export function parseC12Money(text: string): number | null {
  const value = text.trim().replace(/\s/g, '').replace(/^\((.+)\)$/, '-$1').replace(/−/g, '-');
  if (!/^-?(?:\d{1,15}|\d{1,3}(?:,\d{3})+|\d{1,3}(?:\.\d{3})+)$/.test(value)) return null;
  const number = Number(value.replace(/[.,]/g, ''));
  return Number.isSafeInteger(number) && Math.abs(number) <= 999999999999999 ? number : null;
}
export function c12TotalColumnBoundary(items: PdfTextItem[]) {
  const header = items.find(item => folded(item.str).trim() === 'cong');
  if (!header) return null;
  const center = header.transform[4] + (header.width || 0) / 2;
  const neighbors = items.filter(item => Math.abs(item.transform[5] - header.transform[5]) < 16
    && /bhtn|bnn/.test(folded(item.str)) && item.transform[4] < header.transform[4]);
  const previous = neighbors.sort((a, b) => b.transform[4] - a.transform[4])[0];
  return previous ? (center + previous.transform[4] + (previous.width || 0) / 2) / 2 : null;
}
// Keep a missing CỘNG cell unknown rather than taking the last insurance fund.
export function c12TextLines(items: PdfTextItem[], columnBoundary: number | null = c12TotalColumnBoundary(items)) {
  const rows: { y: number; items: PdfTextItem[] }[] = [];
  for (const item of [...items].sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])) {
    if (!item.str.trim()) continue;
    let row = rows.find(row => Math.abs(row.y - item.transform[5]) <= 2);
    if (!row) { row = { y: item.transform[5], items: [] }; rows.push(row); }
    row.items.push(item);
  }
  return rows.sort((a, b) => b.y - a.y).map(row => {
    const text = row.items.sort((a, b) => a.transform[4] - b.transform[4]).map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
    if (/^(?:a\s+ky truoc mang sang|b\s+phat sinh trong ky|c\s+so tien da nop trong ky|d\s+chuyen ky sau)\b/.test(folded(text))) {
      const totalCell = columnBoundary !== null && row.items.some(item => item.transform[4] + (item.width || 0) / 2 >= columnBoundary && parseC12Money(item.str) !== null);
      if (!totalCell) return `${text} [Chưa đọc được cột CỘNG]`;
    }
    return text;
  });
}
export function parseC12Lines(lines: string[]): C12Draft {
  const text = folded(lines.join('\n'));
  const warnings: string[] = [];
  if (!/c\s*12\s*[-–]?\s*ts\b/.test(text)) throw new Error('Không nhận diện được mẫu C12-TS. Hãy chọn đúng C12 PDF có lớp chữ hoặc nhập thủ công.');
  // The reporting month is a heading. Signing dates and coverage notes elsewhere
  // in C12 also contain "tháng ... năm ...", but are not additional periods.
  const periods = lines
    .map(line => folded(line).trim().match(/^(?:ky\s+(?:bao cao|thong bao)\s*:\s*)?thang\s+(\d{1,2})\s+nam\s+(\d{4})\s*$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map(match => {
    const month = Number(match[1]); const year = Number(match[2]);
    return month >= 1 && month <= 12 && year >= 1900 && year <= 2200 ? `${year}-${String(month).padStart(2, '0')}` : null;
  }).filter(Boolean);
  const uniquePeriods = [...new Set(periods)];
  if (uniquePeriods.length > 1) throw new Error('File có nhiều kỳ C12 khác nhau. Hãy tách file theo từng kỳ trước khi đọc.');
  const codes = [...text.matchAll(/ma\s+don\s+vi\s*:\s*([a-z0-9]{4,15})\b/g)].map(match => match[1].toUpperCase());
  if (new Set(codes).size > 1) throw new Error('File có nhiều mã đơn vị khác nhau. Hãy tách theo từng khách hàng.');
  function total(label: RegExp) {
    const candidates: number[] = [];
    for (const line of lines) {
      if (!label.test(folded(line))) continue;
      const tail = line.trim().match(/(?:^|\s)(\(?[−-]?\d[\d.,]*\)?)[\s]*(?:đ|₫|dong)?$/i);
      if (tail) {
        const value = parseC12Money(tail[1]);
        if (value !== null) candidates.push(value);
      }
    }
    const unique = [...new Set(candidates)];
    if (unique.length > 1) { warnings.push('Có dòng tổng không thống nhất; cần kiểm tra số trên C12.'); return null; }
    return unique[0] ?? null;
  }
  const result: C12Draft = {
    period: uniquePeriods[0] || null, unitCode: codes[0] || null,
    opening: total(/^a\s+ky truoc mang sang\b/), charges: total(/^b\s+phat sinh trong ky\b/),
    reportedPaid: total(/^c\s+so tien da nop trong ky\b/), reportedClosing: total(/^d\s+chuyen ky sau\b/), warnings,
  };
  if (result.charges === null) warnings.push('Chưa đọc được tổng phát sinh ở dòng B. Hãy nhập theo C12.');
  if (result.opening === null) warnings.push('Chưa đọc được tổng đầu kỳ ở dòng A; không tự coi là 0.');
  if (!result.period) warnings.push('Chưa xác định được tháng C12. Hãy chọn đúng kỳ.');
  if (!result.unitCode) warnings.push('Chưa xác định được mã đơn vị. Hãy kiểm tra khách hàng.');
  return result;
}
