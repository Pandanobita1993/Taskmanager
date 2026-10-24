import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { buildVietQr, memoFitsQr, qrCrc } from '../src/lib/vietQr.ts';
import { renderTransferMemo } from '../src/lib/bhxhAgencies.ts';
const require = createRequire(path.join(os.tmpdir(), 'anan-recurrence-qa', 'package.json'));
const QRCode = require('qrcode');
const jsQR = require('jsqr');
function fields(text) {
  const result = {};
  for (let i = 0; i < text.length;) {
    const id = text.slice(i, i + 2), length = Number(text.slice(i + 2, i + 4));
    assert.ok(Number.isInteger(length) && i + 4 + length <= text.length);
    result[id] = text.slice(i + 4, i + 4 + length); i += 4 + length;
  }
  return result;
}
const memo = renderTransferMemo('BHXH 103 00 {{ma_don_vi}} {{ma_co_quan}} DONG BHXH {{ky}}', 'QA1234A', '00123', 'Tháng 10/2026').memo;
assert.equal(memo, 'BHXH 103 00 QA1234A 00123 DONG BHXH 10 2026');
for (const text of [memo, 'A'.repeat(95)]) {
  assert.ok(memoFitsQr(text));
  const payload = buildVietQr('970415', '00123456789', '1200000', text);
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  const scale = 8, margin = 4, width = (qr.modules.size + margin * 2) * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  for (let y = 0; y < qr.modules.size; y++) for (let x = 0; x < qr.modules.size; x++) if (qr.modules.get(y, x)) {
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const i = (((y + margin) * scale + dy) * width + (x + margin) * scale + dx) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
    }
  }
  const decoded = jsQR(pixels, width, width);
  assert.ok(decoded, 'QR image must decode independently');
  const outer = fields(decoded.data), receiver = fields(fields(outer['38'])['01']);
  assert.equal(receiver['00'], '970415'); assert.equal(receiver['01'], '00123456789');
  assert.equal(outer['54'], '1200000'); assert.equal(fields(outer['62'])['08'], text);
  assert.equal(outer['63'], qrCrc(decoded.data.slice(0, -4)));
}
assert.equal(memoFitsQr('A'.repeat(96)), false);
assert.throws(() => buildVietQr('970415', '00123456789', '1200000', 'A'.repeat(96)), /vượt giới hạn/);
assert.equal(memoFitsQr('Đóng BHXH'), false);
console.log('PASS: independently decoded full BHXH memo and 95-character boundary, bank, account, amount, CRC, rejected overflow.');
