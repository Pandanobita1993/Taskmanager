import { c12TextLines, c12TotalColumnBoundary, parseC12Lines } from './c12Parser';
import type { PdfTextItem } from './c12Parser';

// Loaded only after choosing a file. No file upload or remote OCR/API call.
export async function readC12Pdf(file: File) {
  if (!/\.pdf$/i.test(file.name) || file.size > 10 * 1024 * 1024) throw new Error('Chọn file PDF C12 tối đa 10 MB.');
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 12) throw new Error('File có hơn 12 trang. Hãy tách riêng C12 của một khách / kỳ.');
    const lines: string[] = [];
    let columnBoundary: number | null = null;
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      if (content.items.length > 50000) throw new Error('Trang PDF quá lớn, vui lòng nhập thủ công.');
      const items = content.items.filter((item): item is typeof item & PdfTextItem => 'str' in item);
      columnBoundary = c12TotalColumnBoundary(items) ?? columnBoundary;
      lines.push(...c12TextLines(items, columnBoundary));
      page.cleanup();
    }
    if (lines.join('').trim().length < 50) throw new Error('PDF này là bản scan / ảnh, chưa có lớp chữ. Bồ nhập thủ công giúp mình; chưa cần dùng OCR trả phí.');
    return parseC12Lines(lines);
  } finally { await task.destroy(); }
}
