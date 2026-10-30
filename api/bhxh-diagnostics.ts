import { lookup } from 'node:dns/promises';
import { connect } from 'node:tls';
import { constants } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  const addresses = await lookup('baohiemxahoi.gov.vn', { all: true });
  const result = await new Promise(resolve => {
    const socket = connect({ host: 'baohiemxahoi.gov.vn', port: 443, servername: 'baohiemxahoi.gov.vn',
      secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT, rejectUnauthorized: true,
      minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2', ALPNProtocols: ['http/1.1'] });
    let connected = false, secured = false;
    const timer = setTimeout(() => { socket.destroy(); resolve({ connected, secured, error: 'timeout' }); }, 12000);
    socket.on('connect', () => { connected = true; });
    socket.on('secureConnect', () => { secured = true; clearTimeout(timer); resolve({ connected, secured, authorized: socket.authorized, protocol: socket.getProtocol(), remote: socket.remoteAddress }); socket.end(); });
    socket.on('error', (error: NodeJS.ErrnoException) => { clearTimeout(timer); resolve({ connected, secured, code: error.code, reason: error.message }); });
  });
  res.end(JSON.stringify({ addresses, result }));
}
