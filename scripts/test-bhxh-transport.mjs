import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { constants } from 'node:crypto';
import { fetchBhxh } from '../server/bhxhTransport.ts';

const url = 'https://baohiemxahoi.gov.vn/UserControls/Publishing/TraCuuDonViThamGia/pListDonViThamGia.aspx';
const form = new URLSearchParams({ MaBHXH: '09200', tokenRecaptch: 'ABCDE', MaSoThue: '1801730049' });
const legacyError = Object.assign(new Error('fetch failed'), { cause: { code: 'ERR_SSL_UNSAFE_LEGACY_RENEGOTIATION_DISABLED' } });
let calls = 0, body, options, status = 200;
const fakeRequest = (target, config, callback) => {
  assert.equal(target, url); calls++; options = config;
  const req = new EventEmitter();
  req.end = data => {
    body = data;
    queueMicrotask(() => {
      const incoming = new PassThrough();
      incoming.rawHeaders = ['Content-Type', 'text/plain', 'Set-Cookie', 'ASP.NET_SessionId=abc; Path=/', 'Set-Cookie', 'BIGipServer=xyz; Path=/'];
      incoming.statusCode = status;
      callback(incoming); incoming.end('BHXH response');
    });
  };
  return req;
};
const normal = await fetchBhxh(url, {}, { fetch: async () => new Response('normal'), request: fakeRequest });
assert.equal(await normal.text(), 'normal'); assert.equal(calls, 0);
const recovered = await fetchBhxh(url, { method: 'POST', body: form, headers: { Cookie: 'session=mine' } }, { fetch: async () => { throw legacyError; }, request: fakeRequest });
assert.equal(await recovered.text(), 'BHXH response');
assert.equal(body, form.toString());
assert.equal(options.secureOptions, constants.SSL_OP_LEGACY_SERVER_CONNECT);
assert.equal(options.rejectUnauthorized, true);
assert.equal(options.headers.cookie, 'session=mine');
assert.equal(options.headers['accept-encoding'], 'identity');
assert.equal(recovered.headers.getSetCookie().length, 2);
for (const code of ['CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID', 'ECONNRESET']) {
  const count = calls;
  const error = Object.assign(new Error(code), { cause: { code } });
  await assert.rejects(fetchBhxh(url, {}, { fetch: async () => { throw error; }, request: fakeRequest }), error);
  assert.equal(calls, count);
}
await assert.rejects(fetchBhxh('https://example.com', {}, { request: fakeRequest }));
const count = calls;
await assert.rejects(fetchBhxh(url, { signal: AbortSignal.abort() }, { fetch: async () => { throw legacyError; }, request: fakeRequest }));
assert.equal(calls, count);
status = 302;
await assert.rejects(fetchBhxh(url, {}, { fetch: async () => { throw legacyError; }, request: fakeRequest }), /redirect/);
console.log('PASS: targeted BHXH TLS recovery, verified certificates, cookie preservation, exact form body, normal TLS unchanged, no fallback on certificate errors/abort, no cross-origin or redirect forwarding.');
