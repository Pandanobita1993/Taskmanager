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
  const tableElements = doc.querySelectorAll('table');
  tableElements.forEach(table => {
    if (table.querySelector('table')) return;
    const trElements = Array.from(table.querySelectorAll('tr'));
    const rows = trElements.map(tr =>
      Array.from(tr.querySelectorAll('td, th')).map(cell => (cell.textContent || '').replace(/\s+/g, ' ').trim())
    ).filter(row => row.some(Boolean));
    const headerRow = trElements.find(tr => tr.querySelectorAll('th').length > 0);
    const headers = headerRow
      ? Array.from(headerRow.querySelectorAll('th, td')).map(cell => (cell.textContent || '').replace(/\s+/g, ' ').trim())
      : rows[0] || [];
    const bodyRows = headerRow ? rows.filter(r => r.join('\0') !== headers.join('\0')) : rows.slice(1);
    if (headers.length > 1) {
      tables.push({ headers, rows: bodyRows });
    }
  });
  const pages: number[] = [];
  const links = doc.querySelectorAll('a, [onclick]');
  links.forEach(el => {
    const call = el.getAttribute('onclick') || el.getAttribute('href') || '';
    const match = call.match(/CallNextPageAjaxTraCuuDVTG\s*\(\s*['"]?(\d+)['"]?\s*\)/);
    if (match && Number(match[1]) > 0 && Number(match[1]) <= 10000) {
      pages.push(Number(match[1]));
    }
  });
  const message = tables.length ? '' : (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  return {
    tables,
    message: message || '',
    pages: [...new Set(pages)].sort((a, b) => a - b),
    page,
    checkedAt: new Date().toISOString()
  };
}

export async function isBhxhExtensionAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (document.documentElement.dataset.bhxhExtensionReady === 'true') return true;
  return new Promise(resolve => {
    const id = 'ping-' + Math.random().toString(36).slice(2);
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMsg);
      resolve(false);
    }, 250);
    const onMsg = (e: MessageEvent) => {
      if (e.data?.source === 'taskflow-bhxh-ext' && (e.data?.id === id || e.data?.action === 'READY')) {
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

function callExtension<T = any>(action: string, payload?: unknown, signal?: AbortSignal): Promise<T> {
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
      if (event.data?.source === 'taskflow-bhxh-ext' && event.data?.id === id) {
        cleanup();
        if (event.data.success) {
          resolve(event.data as T);
        } else {
          reject(new Error(event.data.error || 'Lỗi xử lý từ tiện ích mở rộng'));
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
    } catch (err: any) {
      return { error: err.message || 'Lỗi tra cứu qua tiện ích mở rộng', viaExtension: true };
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
