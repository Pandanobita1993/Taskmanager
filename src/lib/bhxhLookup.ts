export const BHXH_LOOKUP_SOURCE = 'https://baohiemxahoi.gov.vn/tracuu/pages/don-vi-tham-gia-bhxh.aspx';
export const BHXH_BHYT_LOOKUP_SOURCE = 'https://baohiemxahoi.gov.vn/tracuu/Pages/tra-cuu-thoi-han-su-dung-the-bhyt.aspx';

export interface LookupQuery { MaBHXH: string; MaSoThue: string; MaDonVi: string; TenDonVi: string }
export interface BhytLookupQuery { txtMaThe: string; txtHoTen: string; txtNgaySinh: string }
export interface LookupTable { headers: string[]; rows: string[][] }
export interface LookupResult { tables: LookupTable[]; message: string; pages: number[]; page: number; checkedAt: string }
export type BhytValidityStatus = 'valid' | 'expired' | 'not_found' | 'checked';
export interface BhytLookupResult {
  status: BhytValidityStatus;
  summary: string;
  lines: string[];
  tables: LookupTable[];
  checkedAt: string;
}
export interface LookupResponse {
  session?: string; captcha?: string;
  result?: LookupResult; bhytResult?: BhytLookupResult; error?: string;
  viaExtension?: boolean;
}

export function classifyBhytResult(fullText: string, rawLines: string[], tables: LookupTable[]): BhytLookupResult {
  const cleanFull = fullText.replace(/\s+/g, ' ').trim();
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const item of rawLines) {
    const cleaned = item.replace(/\s+/g, ' ').trim();
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      lines.push(cleaned);
    }
  }
  if (!lines.length && cleanFull) {
    lines.push(cleanFull);
  }
  if (!tables.length && !cleanFull) {
    throw new Error('Cổng BHXH trả về nội dung chưa nhận diện được. Vui lòng mở trang nguồn để kiểm tra.');
  }

  let status: BhytValidityStatus = 'checked';
  const combined = [...lines, cleanFull].join(' · ');

  if (/không\s*(?:có|tìm\s*thấy|tồn\s*tại|khớp|hợp\s*lệ)|chưa\s*có\s*(?:dữ\s*liệu|thông\s*tin)|sai\s*thông\s*tin/i.test(combined)) {
    status = 'not_found';
  } else if (/hết\s*(?:hạn|giá\s*trị\s*sử\s*dụng)|không\s*còn\s*giá\s*trị/i.test(combined)) {
    status = 'expired';
  } else if (/còn\s*(?:hạn|giá\s*trị\s*sử\s*dụng)|giá\s*trị\s*sử\s*dụng|thời\s*điểm\s*đủ\s*5\s*năm/i.test(combined)) {
    status = 'valid';
    const endDateMatch = combined.match(/đến\s*ngày\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    if (endDateMatch) {
      const day = Number(endDateMatch[1]);
      const month = Number(endDateMatch[2]);
      const year = Number(endDateMatch[3]);
      const endUtc = Date.UTC(year, month - 1, day, 23, 59, 59);
      if (endUtc < Date.now()) {
        status = 'expired';
      }
    }
  }

  const keyChunks = lines.filter((line) =>
    /giá\s*trị\s*sử\s*dụng|thời\s*hạn|còn\s*giá\s*trị|hết\s*giá\s*trị|không\s*tìm\s*thấy|mã\s*thẻ|nơi\s*đk\s*kcb/i.test(line)
  );
  const summary = (keyChunks.length ? keyChunks.join(' · ') : lines.slice(0, 3).join(' · ') || cleanFull).slice(0, 260);

  return {
    status,
    summary,
    lines,
    tables,
    checkedAt: new Date().toISOString()
  };
}

function extractBrowserTables(doc: Document): LookupTable[] {
  const tables: LookupTable[] = [];
  const tableElements: Element[] = Array.from(doc.querySelectorAll('table'));
  tableElements.forEach((table: Element) => {
    if (table.querySelector('table')) return;
    const trElements: Element[] = Array.from(table.querySelectorAll('tr'));
    const rows: string[][] = trElements.map((tr: Element) =>
      Array.from(tr.querySelectorAll('td, th')).map((cell: Element) => (cell.textContent || '').replace(/\s+/g, ' ').trim())
    ).filter((row: string[]) => row.some(Boolean));
    const headerRow = trElements.find((tr: Element) => tr.querySelectorAll('th').length > 0);
    const headers: string[] = headerRow
      ? Array.from(headerRow.querySelectorAll('th, td')).map((cell: Element) => (cell.textContent || '').replace(/\s+/g, ' ').trim())
      : rows[0] || [];
    const bodyRows = headerRow ? rows.filter((r: string[]) => r.join('\0') !== headers.join('\0')) : rows.slice(1);
    if (headers.length > 1) {
      tables.push({ headers, rows: bodyRows });
    }
  });
  return tables;
}

export function parseLookupResultBrowser(html: string, page = 1): LookupResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = extractBrowserTables(doc);
  const pages: number[] = [];
  const links: Element[] = Array.from(doc.querySelectorAll('a, [onclick]'));
  links.forEach((el: Element) => {
    const call = el.getAttribute('onclick') || el.getAttribute('href') || '';
    const match = call.match(/CallNextPageAjaxTraCuuDVTG\s*\(\s*['"]?(\d+)['"]?\s*\)/);
    if (match && Number(match[1]) > 0 && Number(match[1]) <= 10000) {
      pages.push(Number(match[1]));
    }
  });
  const message = tables.length ? '' : (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
  if (!tables.length && !/không (?:có|tìm thấy)|chưa có|0 kết quả/i.test(message)) {
    throw new Error('Cổng BHXH trả về nội dung chưa nhận diện được. Vui lòng mở trang nguồn để kiểm tra.');
  }
  return {
    tables,
    message: message || '',
    pages: [...new Set(pages)].sort((a, b) => a - b),
    page,
    checkedAt: new Date().toISOString()
  };
}

export function parseBhytLookupResultBrowser(html: string): BhytLookupResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, template, noscript').forEach((el: Element) => el.remove());
  const tables = extractBrowserTables(doc);
  const blockElements: Element[] = Array.from(doc.querySelectorAll('tr, p, li, div'));
  const rawLines: string[] = [];
  blockElements.forEach((el: Element) => {
    if (el.tagName.toLowerCase() === 'div' && el.querySelector('div, p, table, tr, ul')) return;
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (txt) rawLines.push(txt);
  });
  const fullText = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
  return classifyBhytResult(fullText, rawLines, tables);
}

export async function isBhxhExtensionAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (document.documentElement.dataset.bhxhExtensionReady === 'true') return true;
  return new Promise(resolve => {
    const id = 'ping-' + Math.random().toString(36).slice(2);
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMsg);
      resolve(false);
    }, 80);
    const onMsg = (e: MessageEvent) => {
      const data = e.data as { source?: string; id?: string; action?: string } | undefined;
      if (data?.source === 'taskflow-bhxh-ext' && (data.id === id || data.action === 'READY')) {
        clearTimeout(timer);
        window.removeEventListener('message', onMsg);
        document.documentElement.dataset.bhxhExtensionReady = 'true';
        resolve(true);
      }
    };
    window.addEventListener('message', onMsg);
    window.postMessage({ source: 'taskflow-bhxh-app', id, action: 'PING' }, '*');
  });
}

function callExtension<T>(action: string, payload?: unknown, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Yêu cầu đã bị hủy'));
      return;
    }
    const id = 'req-' + Math.random().toString(36).slice(2);
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Quá thời gian phản hồi từ tiện ích mở rộng (nếu vừa cập nhật, hãy bấm Tải lại tiện ích trong chrome://extensions).'));
    }, 25000);

    const onAbort = () => {
      cleanup();
      reject(new Error('Yêu cầu đã bị hủy'));
    };

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('message', onMsg);
      signal?.removeEventListener('abort', onAbort);
    };

    const onMsg = (event: MessageEvent) => {
      const data = event.data as ({ source?: string; id?: string; success?: boolean; error?: string } & T) | undefined;
      if (data?.source === 'taskflow-bhxh-ext' && data.id === id) {
        cleanup();
        if (data.success) {
          resolve(data);
        } else {
          reject(new Error(data.error || 'Lỗi xử lý từ tiện ích mở rộng'));
        }
      }
    };

    signal?.addEventListener('abort', onAbort);
    window.addEventListener('message', onMsg);
    window.postMessage({ source: 'taskflow-bhxh-app', id, action, payload }, '*');
  });
}

export async function bhxhLookupRequest(payload: Record<string, unknown>, signal?: AbortSignal): Promise<LookupResponse> {
  const hasExt = await isBhxhExtensionAvailable();

  if (hasExt) {
    try {
      const action = payload.action;
      if (action === 'init' || action === 'captcha') {
        const res = await callExtension<{ captcha: string }>('CAPTCHA', undefined, signal);
        return { captcha: res.captcha, viaExtension: true, session: 'ext-active' };
      }
      if (action === 'search' || action === 'page') {
        const extAction = action === 'page' ? 'PAGE' : 'SEARCH';
        const res = await callExtension<{ html: string }>(extAction, payload, signal);
        const pageNum = Number(payload.page) || 1;
        const result = parseLookupResultBrowser(res.html, pageNum);
        return { result, viaExtension: true, session: 'ext-active' };
      }
      if (action === 'bhyt_search') {
        const res = await callExtension<{ html: string }>('BHYT_SEARCH', payload, signal);
        const bhytResult = parseBhytLookupResultBrowser(res.html);
        return { bhytResult, viaExtension: true, session: 'ext-active' };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi tra cứu qua tiện ích mở rộng';
      return { error: message, viaExtension: true };
    }
  }

  // Fallback to serverless API
  const response = await fetch('/api/bhxh-lookup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal,
  });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('API tra cứu chưa hoạt động. Hãy chạy app bằng npm run dev hoặc triển khai cả thư mục api lên Vercel.');
  }
  const data = await response.json() as LookupResponse;
  if (!response.ok && !data.error) throw new Error('Chưa kết nối được cổng BHXH. Vui lòng thử lại.');
  return data;
}
