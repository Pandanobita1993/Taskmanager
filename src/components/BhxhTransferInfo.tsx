import { useState } from 'react';
import { transferMessage } from '../lib/bhxhAgencies';
import type { TransferDetails } from '../lib/bhxhAgencies';
import { buildVietQr, memoFitsQr } from '../lib/vietQr';

export default function BhxhTransferInfo({ client, period, amount, details }: {
  client: string; period: string; amount: number | null; details: TransferDetails;
}) {
  const [notice, setNotice] = useState('');
  const [qr, setQr] = useState('');
  const [working, setWorking] = useState(false);
  const [accountOnly, setAccountOnly] = useState(false);
  const message = transferMessage(client, period, amount, details);
  const qrAllowed = /^\d{6}$/.test(details.bank_bin) && /^[0-9]{6,19}$/.test(details.account_no) && amount != null && amount > 0 && amount < 1e13;
  const fullMemo = memoFitsQr(details.memo);
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice('Đã sao chép.'); }
    catch { setNotice('Chưa sao chép được. Bôi đen nội dung bên dưới để sao chép thủ công.'); }
  }
  async function generate() {
    if (!qrAllowed || (!fullMemo && !accountOnly)) return;
    setWorking(true); setNotice('');
    try {
      const { default: QRCode } = await import('qrcode');
      const payload = buildVietQr(details.bank_bin, details.account_no, String(amount), fullMemo ? details.memo : '');
      const canvas = document.createElement('canvas'); canvas.width = 1000;
      const context = canvas.getContext('2d'); if (!context) throw new Error('Trình duyệt chưa hỗ trợ tạo ảnh QR.');
      context.font = '26px Arial';
      const lines: string[] = [];
      // Keep the exact memo visible in the downloadable image, including long syntax.
      for (const raw of message.split('\n')) {
        let line = '';
        for (const word of raw.split(' ')) {
          if (line && context.measureText(`${line} ${word}`).width > 880) { lines.push(line); line = word; }
          else line += (line ? ' ' : '') + word;
        }
        lines.push(line);
      }
      canvas.height = 680 + lines.length * 40 + (fullMemo ? 0 : 100);
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, payload, { width: 520, margin: 4, errorCorrectionLevel: 'M' });
      context.drawImage(qrCanvas, 240, 20);
      context.font = 'bold 32px Arial'; context.fillStyle = '#064e3b'; context.fillText('THÔNG TIN ĐÓNG BHXH', 60, 590);
      context.font = '26px Arial'; context.fillStyle = '#111827';
      lines.forEach((line, index) => context.fillText(line, 60, 640 + index * 40));
      if (!fullMemo) {
        context.fillStyle = '#b45309'; context.font = 'bold 25px Arial';
        context.fillText('QR chỉ có tài khoản và số tiền.', 60, canvas.height - 85);
        context.fillText('Sau khi quét, dán đầy đủ cú pháp ở trên trước khi xác nhận.', 60, canvas.height - 45);
      }
      setQr(canvas.toDataURL('image/png'));
    } catch (cause: any) { setNotice(cause.message || 'Chưa tạo được QR.'); }
    finally { setWorking(false); }
  }
  return <section aria-label="Thông tin đóng tiền gửi khách" className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-3">
    <h3 className="font-semibold text-blue-950">Thông tin đóng tiền gửi khách</h3>
    <textarea aria-label="Nội dung gửi khách" readOnly value={message} rows={9} className="w-full rounded-lg border border-blue-100 bg-white p-3 text-sm text-gray-800" />
    <div className="flex flex-wrap gap-2"><button type="button" className="rounded-lg border bg-white px-3 py-2 text-sm" onClick={() => void copy(message)}>Sao chép thông tin đóng tiền</button><button type="button" className="rounded-lg border bg-white px-3 py-2 text-sm" onClick={() => void copy(details.memo)}>Sao chép cú pháp</button></div>
    {!fullMemo && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 space-y-2"><p>Cú pháp dài hơn giới hạn 25 ký tự hoặc có chữ có dấu. Cú pháp được giữ nguyên để sao chép; QR tài khoản + số tiền cần khách dán thêm nội dung sau khi quét.</p><label className="flex items-start gap-2"><input type="checkbox" checked={accountOnly} onChange={event => { setAccountOnly(event.target.checked); setQr(''); }} /> Tạo QR tài khoản + số tiền; tôi sẽ gửi kèm cú pháp để khách dán vào nội dung.</label></div>}
    <button type="button" disabled={!qrAllowed || working || (!fullMemo && !accountOnly)} className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm disabled:opacity-50" onClick={() => void generate()}>{working ? 'Đang tạo QR…' : 'Tạo QR thanh toán'}</button>
    {!qrAllowed && <p className="text-xs text-amber-900">Để tạo QR, cần số tiền dương tối đa 13 chữ số và tài khoản ngân hàng 6–19 chữ số. Thông tin đầy đủ vẫn có thể sao chép để chuyển khoản.</p>}
    {notice && <p role="status" className="text-sm text-blue-950">{notice}</p>}
    {qr && <div className="space-y-2"><img alt="QR và thông tin đóng BHXH" src={qr} className="max-w-full sm:max-w-md rounded-lg border bg-white" /><a href={qr} download={`BHXH-${details.unit_code}-${period.replace(/[^0-9A-Za-z-]/g, '-')}.png`} className="inline-block rounded-lg border bg-white px-3 py-2 text-sm">Tải ảnh QR kèm thông tin</a><p className="text-xs text-gray-600">QR tạo trên thiết bị, không gửi thông tin khách tới dịch vụ QR. Khách kiểm tra người thụ hưởng, số tiền và nội dung trên ứng dụng ngân hàng trước khi xác nhận.</p></div>}
  </section>;
}
