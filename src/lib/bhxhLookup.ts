export const BHXH_LOOKUP_SOURCE = 'https://baohiemxahoi.gov.vn/tracuu/pages/don-vi-tham-gia-bhxh.aspx';
export interface LookupQuery { MaBHXH: string; MaSoThue: string; MaDonVi: string; TenDonVi: string }
export interface LookupTable { headers: string[]; rows: string[][] }
export interface LookupResult { tables: LookupTable[]; message: string; pages: number[]; page: number; checkedAt: string }
export interface LookupResponse {
  session?: string; captcha?: string;
  result?: LookupResult; error?: string;
  viaExtension?: boolean;
}

export function parseLookupResultBrowser(html: string, page = 1): LookupResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
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
      reject(new Error('Quá thời gian phản hồi từ tiện ích mở rộng.'));
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
