import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import handler from '../api/bhxh-lookup.ts';
import { parseLookupResult, runBhxhLookup } from '../server/bhxhLookup.ts';

const secret = 'isolated-bhxh-lookup-test-secret-32-characters';
const query = { MaBHXH: '09200', MaSoThue: '1801821715', MaDonVi: '', TenDonVi: '' };
const calls = [];
let failSearch = false, badPage = false, brokenCaptcha = false;
const fakeFetch = async (url, options) => {
  const path = new URL(url).pathname;
  const fields = Object.fromEntries(options.body || []);
  calls.push({ path, fields, options });
  assert.equal(new URL(url).origin, 'https://baohiemxahoi.gov.vn');
  assert.equal(options.redirect, 'error');
  if (path.endsWith('don-vi-tham-gia-bhxh.aspx')) return new Response('<html>Tra cứu BHXH</html>', { headers: { 'set-cookie': 'TS01test=firewall; Path=/' } });
  if (path.endsWith('CaptchaImageHandler.ashx')) {
    assert.match(options.headers.Cookie, /TS01test=firewall/);
    return new Response(brokenCaptcha ? '<html>error</html>' : Buffer.from([137, 80, 78, 71]), { headers: { 'content-type': brokenCaptcha ? 'text/html' : 'image/png', 'set-cookie': 'ASP.NET_SessionId=session-A; Path=/' } });
  }
  assert.match(options.headers.Cookie, /ASP.NET_SessionId=session-A/);
  assert.ok(path.endsWith('pListDonViThamGia.aspx'));
  if (failSearch) return Response.json({ Error: true, Title: 'Mã xác nhận không hợp lệ.' });
  if (badPage) return new Response('<html><title>Request rejected</title></html>');
  return new Response(`<table><tr><th>Mã đơn vị</th><th>Tên đơn vị</th></tr><tr><td>AB1234</td><td>Công ty &amp; An An<img src="https://example.invalid/track" onerror="alert(1)"></td></tr></table><a href="javascript:CallNextPageAjaxTraCuuDVTG(2)">2</a><script>alert(1)</script>`);
};
const run = body => runBhxhLookup(body, { secret, fetch: fakeFetch });
assert.equal(parseLookupResult('<p>Không tìm thấy dữ liệu</p>').message, 'Không tìm thấy dữ liệu');
assert.throws(() => parseLookupResult('<h1>Access denied</h1>'));
const initialized = await run({ action: 'init' });
assert.equal(initialized.status, 200);
assert.ok(!('provinces' in initialized.data));
assert.match(initialized.data.captcha, /^data:image\/png;base64,/);
assert.ok(!initialized.data.session.includes('session-A'));
let session = initialized.data.session;
let before = calls.length;
assert.equal((await run({ action: 'page', page: 2, session })).status, 400);
assert.equal((await run({ action: 'search', ...query, MaSoThue: 'x', tokenRecaptch: 'ABCDE', session })).status, 400);
assert.equal((await run({ action: 'search', ...query, MaSoThue: '', tokenRecaptch: 'ABCDE', session })).status, 400);
assert.equal((await run({ action: 'search', ...query, tokenRecaptch: '', session })).status, 400);
assert.equal((await run({ action: 'search', ...query, MaBHXH: '9200', tokenRecaptch: 'ABCDE', session })).status, 400);
assert.equal((await run({ action: 'agencies', province: 'https://other.invalid', session })).status, 400);
assert.equal(calls.length, before);
const found = await run({ action: 'search', ...query, MaDonVi: 'ignored', TenDonVi: 'ignored', tokenRecaptch: 'ABCDE', session, docheck: '1', url: 'https://other.invalid' });
assert.equal(found.status, 200);
assert.deepEqual(calls.at(-1).fields, { ...query, tokenRecaptch: 'ABCDE' });
assert.deepEqual(found.data.result.tables[0], { headers: ['Mã đơn vị', 'Tên đơn vị'], rows: [['AB1234', 'Công ty & An An']] });
assert.deepEqual(found.data.result.pages, [2]);
assert.ok(!JSON.stringify(found.data.result).includes('alert(1)'));
session = found.data.session;
const refreshed = await run({ action: 'captcha', session }); session = refreshed.data.session;
const next = await run({ action: 'page', page: 2, session });
assert.equal(next.data.result.page, 2);
assert.deepEqual(calls.at(-1).fields, { ...query, docheck: '1', page: '2' });
assert.equal((await run({ action: 'page', page: 9999, session })).status, 400);
const otherSession = (await run({ action: 'init' })).data.session;
assert.equal((await run({ action: 'page', page: 2, session: otherSession })).status, 400);
const tampered = session.slice(0, 20) + (session[20] === 'a' ? 'b' : 'a') + session.slice(21);
assert.equal((await run({ action: 'search', ...query, tokenRecaptch: 'ABCDE', session: tampered })).status, 410);
const originalNow = Date.now;
try { Date.now = () => originalNow() + 21 * 60 * 1000; assert.equal((await run({ action: 'captcha', session })).status, 410); }
finally { Date.now = originalNow; }
failSearch = true;
const failed = await run({ action: 'search', ...query, tokenRecaptch: 'WRONG', session });
assert.equal(failed.status, 400); assert.match(failed.data.error, /Mã xác nhận/);
assert.equal((await run({ action: 'page', page: 2, session: failed.data.session })).status, 400);
failSearch = false; badPage = true;
assert.equal((await run({ action: 'search', ...query, tokenRecaptch: 'ABCDE', session })).status, 502);
badPage = false; brokenCaptcha = true;
assert.equal((await run({ action: 'init' })).status, 502); brokenCaptcha = false;
assert.equal((await runBhxhLookup({ action: 'init' }, { secret: '' })).status, 503);
assert.equal((await runBhxhLookup({ action: 'init' }, { secret, fetch: async () => { throw Error('upstream details must not leak'); } })).status, 502);
assert.equal((await runBhxhLookup({ action: 'init' }, { secret, fetch: async () => new Response('x'.repeat(2_000_001)) })).status, 502);

// Exercise the real HTTP adapter without reaching BHXH or any app database.
const server = createServer((req, res) => void handler(req, res, secret));
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const url = `http://127.0.0.1:${server.address().port}/api/bhxh-lookup`;
  assert.equal((await fetch(url)).status, 405);
  assert.equal((await fetch(url, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })).status, 415);
  assert.equal((await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' }, body: '{}' })).status, 403);
  assert.equal((await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ x: 'x'.repeat(25000) }) })).status, 413);
  const invalid = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'unknown' }) });
  assert.equal(invalid.status, 400); assert.equal(invalid.headers.get('cache-control'), 'no-store, private');
} finally { server.close(); }
console.log('PASS: BHXH exact form payload, per-session cookies, encrypted isolated/expiring sessions, human CAPTCHA, pagination, text-only HTML parsing, errors/limits and HTTP adapter.');
