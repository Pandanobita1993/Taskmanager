import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { parseFragment } from 'parse5';
import type { DefaultTreeAdapterTypes as Tree } from 'parse5';
import type { LookupQuery, LookupResponse, LookupResult } from '../src/lib/bhxhLookup.ts';
import { fetchBhxh } from './bhxhTransport.ts';

const ORIGIN = 'https://baohiemxahoi.gov.vn';
const SOURCE = '/tracuu/pages/don-vi-tham-gia-bhxh.aspx';
const DIRECTORY = '/UserControls/Publishing/TraCuuDonViThamGia/';
const MAX_RESPONSE = 2_000_000;
const TTL = 20 * 60 * 1000;
interface Session { cookies: Record<string, string>; expires: number; query?: LookupQuery; pages?: number[] }
type RequestBody = Record<string, unknown>;
class LookupError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

function elements(node: Tree.Node, tag?: string): Tree.Element[] {
  const children = 'childNodes' in node ? node.childNodes.flatMap(child => elements(child, tag)) : [];
  return 'tagName' in node && (!tag || node.tagName === tag) ? [node, ...children] : children;
}
const attribute = (node: Tree.Element, name: string) => node.attrs.find(attr => attr.name === name)?.value || '';
function text(node: Tree.Node): string {
  if (node.nodeName === '#text') return (node as Tree.TextNode).value;
  if (['script', 'style', 'template', 'noscript'].includes(node.nodeName)) return '';
  return 'childNodes' in node ? node.childNodes.map(text).join(' ') : '';
}
const cleanText = (node: Tree.Node) => text(node).replace(/\s+/g, ' ').trim();
const plain = (html: string) => cleanText(parseFragment(html));
export function parseLookupResult(html: string, page = 1): LookupResult {
  const root = parseFragment(html);
  // Extract text only. No upstream HTML, scripts, links or event handlers reach React.
  const tables = elements(root, 'table').filter(table => !elements(table, 'table').some(other => other !== table)).map(table => {
    const rows = elements(table, 'tr').map(row => row.childNodes.filter((node): node is Tree.Element =>
      'tagName' in node && ['td', 'th'].includes(node.tagName)).map(cleanText)).filter(row => row.some(Boolean));
    const headerRow = elements(table, 'tr').find(row => elements(row, 'th').length > 0);
    const headers = headerRow ? elements(headerRow).filter(node => ['th', 'td'].includes(node.tagName)).map(cleanText) : rows[0] || [];
    return { headers, rows: headerRow ? rows.filter(row => row.join('\0') !== headers.join('\0')) : rows.slice(1) };
  }).filter(table => table.headers.length > 1);
  const pages = [...new Set(elements(root).flatMap(node => {
    const call = attribute(node, 'onclick') || attribute(node, 'href');
    const match = call.match(/CallNextPageAjaxTraCuuDVTG\s*\(\s*['"]?(\d+)['"]?\s*\)/);
    return match && Number(match[1]) > 0 && Number(match[1]) <= 10000 ? [Number(match[1])] : [];
  }))].sort((a, b) => a - b);
  const message = tables.length ? '' : plain(html);
  if (!tables.length && !/không (?:có|tìm thấy)|chưa có|0 kết quả/i.test(message)) {
    throw new LookupError('Cổng BHXH trả về nội dung chưa nhận diện được. Vui lòng mở trang nguồn để kiểm tra.', 502);
  }
  return { tables, message: message || '', pages, page, checkedAt: new Date().toISOString() };
}
function sessionKey(secret: string) {
  if (secret.length < 32) throw new LookupError('API tra cứu chưa được cấu hình khóa phiên BHXH_LOOKUP_SESSION_SECRET trên máy chủ.', 503);
  return createHash('sha256').update(secret).digest();
}
function seal(session: Session, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(session)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}
function unseal(token: unknown, key: Buffer): Session {
  try {
    if (typeof token !== 'string' || token.length > 20000) throw Error();
    const data = Buffer.from(token, 'base64url');
    const cipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
    cipher.setAuthTag(data.subarray(12, 28));
    const session = JSON.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString()) as Session;
    if (session.expires < Date.now()) throw Error();
    return session;
  } catch { throw new LookupError('Phiên tra cứu đã hết hạn. Bấm “Tải lại công cụ” để lấy mã xác nhận mới.', 410); }
}
async function readResponse(response: Response): Promise<Buffer> {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_RESPONSE) { await reader.cancel(); throw new LookupError('Phản hồi từ cổng BHXH quá lớn. Hãy thu hẹp thông tin tìm kiếm.', 502); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
function field(body: RequestBody, name: string, max: number, required = false) {
  const value = body[name] ?? '';
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new LookupError(`Thông tin ${name} chưa hợp lệ.`);
  return value.trim();
}
export async function runBhxhLookup(body: RequestBody, options: { secret: string; fetch?: typeof fetch }): Promise<{ status: number; data: LookupResponse }> {
  let session: Session | undefined; let key: Buffer | undefined;
  try {
    key = sessionKey(options.secret);
    const action = field(body, 'action', 20, true);
    if (!['init', 'captcha', 'search', 'page'].includes(action)) throw new LookupError('Thao tác tra cứu không hợp lệ.');
    session = action === 'init' ? { cookies: {}, expires: Date.now() + TTL } : unseal(body.session, key);
    const active = session;
    const deadline = AbortSignal.timeout(20000);
    async function upstream(path: string, fields?: Record<string, string>) {
      const response = await (options.fetch || fetchBhxh)(ORIGIN + path, {
        method: fields ? 'POST' : 'GET', redirect: 'error', signal: deadline,
        headers: { Referer: ORIGIN + SOURCE, 'User-Agent': 'TaskFlow-BHXH-Lookup/1.0',
          ...(Object.keys(active.cookies).length ? { Cookie: Object.entries(active.cookies).map(([name, value]) => `${name}=${value}`).join('; ') } : {}),
          ...(fields ? { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' } : {}),
        }, ...(fields ? { body: new URLSearchParams(fields) } : {}),
      });
      for (const cookie of response.headers.getSetCookie()) {
        const match = cookie.match(/^([^=;\s]+)=([^;\r\n]*)/);
        if (match) active.cookies[match[1]] = match[2];
      }
      if (!response.ok) { await response.body?.cancel(); throw new LookupError('Cổng BHXH đang không phản hồi. Vui lòng thử lại sau.', 502); }
      const bytes = await readResponse(response);
      return { bytes, type: response.headers.get('content-type') || '' };
    }
    async function captcha() {
      const { bytes, type } = await upstream(`/UserControls/CaptchaImageHandler.ashx?t=${Date.now()}`);
      const mime = type.split(';')[0].toLowerCase();
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(mime) || !bytes.length) throw new LookupError('Chưa lấy được ảnh mã xác nhận từ BHXH. Vui lòng tải lại công cụ.', 502);
      return `data:${mime};base64,${bytes.toString('base64')}`;
    }
    function jsonError(raw: string): { Title?: string; Error?: boolean } | null {
      try { return JSON.parse(raw); } catch { return null; }
    }
    const result: LookupResponse = {};
    if (action === 'init') {
      // The image handler issues ASP.NET, load-balancer and firewall cookies
      // itself; the HTML page is not needed to create a lookup session.
      result.captcha = await captcha();
    } else if (action === 'captcha') {
      result.captcha = await captcha();
    } else {
      let query: LookupQuery; let page = 1;
      if (action === 'page') {
        page = Number(body.page);
        if (!session.query || !Number.isInteger(page) || !session.pages?.includes(page)) throw new LookupError('Trang kết quả không hợp lệ. Vui lòng tra cứu lại.');
        query = session.query;
      } else {
        query = { MaBHXH: field(body, 'MaBHXH', 5, true), MaSoThue: field(body, 'MaSoThue', 14, true), MaDonVi: '', TenDonVi: '' };
        if (!/^\d{5}$/.test(query.MaBHXH)) throw new LookupError('Mã cơ sở BHXH phải gồm 5 chữ số, giữ cả số 0 ở đầu.');
        if (!/^(?:\d{10}|\d{12}|\d{13}|\d{10}-\d{3})$/.test(query.MaSoThue)) throw new LookupError('Mã số thuế phải có 10, 12 hoặc 13 chữ số (có thể có dấu gạch nối chi nhánh).');
        if (!/^[a-z\d]{5}$/i.test(field(body, 'tokenRecaptch', 5, true))) throw new LookupError('Nhập 5 ký tự trong ảnh mã xác nhận.');
        delete session.query; delete session.pages;
      }
      const response = await upstream(DIRECTORY + 'pListDonViThamGia.aspx', action === 'page'
        ? { ...query, docheck: '1', page: String(page) }
        : { ...query, tokenRecaptch: field(body, 'tokenRecaptch', 5, true) });
      const raw = response.bytes.toString('utf8');
      const error = jsonError(raw);
      if (error?.Error) throw new LookupError(plain(error.Title || 'Cổng BHXH chưa thực hiện được yêu cầu.'));
      result.result = parseLookupResult(raw, page);
      session.query = query; session.pages = [...new Set([1, ...result.result.pages])];
    }
    return { status: 200, data: { ...result, session: seal(session, key) } };
  } catch (error) {
    const networkError = error as { code?: string; cause?: { code?: string }; name?: string };
    const diagnostic = networkError.cause?.code || networkError.code || networkError.name || '';
    const connectionCode = /^[A-Z_0-9]{1,80}$/.test(diagnostic) ? ` (mã lỗi: ${diagnostic})` : '';
    return { status: error instanceof LookupError ? error.status : 502, data: {
      error: error instanceof LookupError ? error.message : `Kết nối tới cổng BHXH bị gián đoạn hoặc quá thời gian${connectionCode}. Vui lòng thử lại.`,
      ...(session && key ? { session: seal(session, key) } : {}),
    } };
  }
}
