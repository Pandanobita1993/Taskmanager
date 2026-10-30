import { constants } from 'node:crypto';
import { request } from 'node:https';
import { Readable } from 'node:stream';

const ORIGIN = 'https://baohiemxahoi.gov.vn';

// Some BHXH load balancers require the legacy initial TLS handshake. Retry only
// handshake errors or connections reset by the load balancer, for this origin,
// without disabling certificate or hostname verification. Certificate failures
// remain failures. All upstream operations are read-only lookups.
export async function fetchBhxh(url: string, init: RequestInit, dependencies: { fetch?: typeof fetch; request?: typeof request } = {}): Promise<Response> {
  if (new URL(url).origin !== ORIGIN) throw new Error('Unsupported BHXH origin');
  try { return await (dependencies.fetch || fetch)(url, init); }
  catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    if (!['ERR_SSL_UNSAFE_LEGACY_RENEGOTIATION_DISABLED', 'ECONNRESET'].includes(cause?.code || '') || init.signal?.aborted) throw error;
  }
  const sendRequest = (attempt = 0): Promise<Response> => {
    return new Promise((resolve, reject) => {
      const req = (dependencies.request || request)(url, {
        method: init.method || 'GET', signal: init.signal || undefined,
        family: 4,
        headers: { ...Object.fromEntries(new Headers(init.headers)), 'accept-encoding': 'identity' },
        secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT,
        // The legacy portal negotiates TLS 1.2. Do not offer TLS 1.3 to the
        // incompatible load balancer, and never allow obsolete TLS 1.0/1.1.
        minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2',
        ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:AES128-GCM-SHA256:AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!MD5:!PSK:!RC4',
        rejectUnauthorized: true,
      }, incoming => {
        const headers = new Headers();
        for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
          headers.append(incoming.rawHeaders[index], incoming.rawHeaders[index + 1]);
        }
        const status = incoming.statusCode || 502;
        // Match fetch's redirect:error policy; never forward cookies elsewhere.
        if (status >= 300 && status < 400) {
          incoming.destroy(); reject(new Error('Unexpected BHXH redirect')); return;
        }
        resolve(new Response(Readable.toWeb(incoming) as ConstructorParameters<typeof Response>[0], { status, headers }));
      });
      req.on('error', error => {
        const code = (error as { code?: string }).code || '';
        // Automatically retry transient connection resets and timeouts up to 2 times
        if (['ECONNRESET', 'ETIMEDOUT', 'EPIPE'].includes(code) && attempt < 2 && !init.signal?.aborted) {
          setTimeout(() => sendRequest(attempt + 1).then(resolve, reject), 350 * (attempt + 1));
          return;
        }
        reject(error);
      });
      req.end(init.body instanceof URLSearchParams ? init.body.toString() : undefined);
    });
  };
  return sendRequest();
}
