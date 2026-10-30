import { constants } from 'node:crypto';
import { request } from 'node:https';
import { Readable } from 'node:stream';

const ORIGIN = 'https://baohiemxahoi.gov.vn';

// Some BHXH load balancers require the legacy initial TLS handshake. Retry only
// this specific handshake error, for this origin, without disabling certificate
// or hostname verification. Other network/TLS failures remain failures.
export async function fetchBhxh(url: string, init: RequestInit, dependencies: { fetch?: typeof fetch; request?: typeof request } = {}): Promise<Response> {
  if (new URL(url).origin !== ORIGIN) throw new Error('Unsupported BHXH origin');
  try { return await (dependencies.fetch || fetch)(url, init); }
  catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    if (cause?.code !== 'ERR_SSL_UNSAFE_LEGACY_RENEGOTIATION_DISABLED' || init.signal?.aborted) throw error;
  }
  return new Promise((resolve, reject) => {
    const req = (dependencies.request || request)(url, {
      method: init.method || 'GET', signal: init.signal || undefined,
      headers: { ...Object.fromEntries(new Headers(init.headers)), 'accept-encoding': 'identity' },
      secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT,
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
    req.on('error', reject);
    req.end(init.body instanceof URLSearchParams ? init.body.toString() : undefined);
  });
}
