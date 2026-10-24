// NAPAS account-transfer TLV. See docs/bhxh-payment-directory.md for specifications.
function field(id: string, value: string) {
  if (value.length > 99 || !/^[\x20-\x7e]*$/.test(value)) throw new Error('Trường QR phải dùng ký tự không dấu và đúng giới hạn độ dài.');
  return id + String(value.length).padStart(2, '0') + value;
}
export function qrCrc(value: string) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(value)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
export function memoFitsQr(memo: string) { return /^[\x20-\x7e]{1,25}$/.test(memo); }
export function buildVietQr(bankBin: string, accountNo: string, amount: string, memo: string) {
  if (!/^\d{6}$/.test(bankBin) || !/^[A-Za-z0-9]{1,19}$/.test(accountNo)) throw new Error('QR cần mã BIN 6 số và số tài khoản 1–19 ký tự chữ / số.');
  if (!/^[1-9]\d{0,12}$/.test(amount)) throw new Error('Số tiền QR phải lớn hơn 0 và tối đa 13 chữ số.');
  if (memo && !memoFitsQr(memo)) throw new Error('Nội dung vượt giới hạn QR. Hãy dùng QR tài khoản / số tiền và sao chép nguyên nội dung riêng.');
  const beneficiary = field('00', bankBin) + field('01', accountNo);
  const merchant = field('00', 'A000000727') + field('01', beneficiary) + field('02', 'QRIBFTTA');
  const payload = field('00', '01') + field('01', '12') + field('38', merchant) + field('53', '704') + field('54', amount)
    + field('58', 'VN') + (memo ? field('62', field('08', memo)) : '') + '6304';
  return payload + qrCrc(payload);
}
