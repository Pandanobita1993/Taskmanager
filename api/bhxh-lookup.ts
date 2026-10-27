import type { IncomingMessage, ServerResponse } from 'node:http';
import { runBhxhLookup } from '../server/bhxhLookup.ts';

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse, secret = process.env.BHXH_LOOKUP_SESSION_SECRET || '') {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST'); res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Chỉ hỗ trợ POST.' })); return;
  }
  // No cross-origin proxy access; browsers send JSON only after a CORS preflight.
  if (req.headers['sec-fetch-site'] === 'cross-site') {
    res.statusCode = 403; res.end(JSON.stringify({ error: 'Hãy mở công cụ từ ứng dụng TaskFlow.' })); return;
  }
  if (!req.headers['content-type']?.includes('application/json')) {
    res.statusCode = 415; res.end(JSON.stringify({ error: 'Yêu cầu phải có định dạng JSON.' })); return;
  }
  try {
    let body = req.body;
    if (body === undefined) {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk.toString();
        if (Buffer.byteLength(raw) > 24000) { res.statusCode = 413; res.end(JSON.stringify({ error: 'Yêu cầu quá lớn.' })); return; }
      }
      body = JSON.parse(raw);
    } else if (typeof body === 'string') body = JSON.parse(body);
    if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 24000) throw Error();
    const result = await runBhxhLookup(body as Record<string, unknown>, { secret });
    res.statusCode = result.status; res.end(JSON.stringify(result.data));
  } catch {
    res.statusCode = 400; res.end(JSON.stringify({ error: 'Dữ liệu yêu cầu không hợp lệ.' }));
  }
}
