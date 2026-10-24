import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { readCachedProfile } from '../lib/profile';
import { renderTransferMemo, transferSnapshot, VIETNAM_BANKS } from '../lib/bhxhAgencies';
import type { AgencyPortal, TransferDetails, ReceiverForm } from '../lib/bhxhAgencies';
import BhxhTransferInfo from './BhxhTransferInfo';

export default function BhxhReceiverFields({ clientId, clientName, unitCode, period, amount, value, onChange, onReady }: {
  clientId: string; clientName: string; unitCode: string; period: string; amount: string; value: ReceiverForm; onChange: (patch: Partial<ReceiverForm>) => void; onReady: () => void;
}) {
  const [data, setData] = useState<AgencyPortal | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const result = await supabase.rpc('bhxh_agency_portal', { p_staff_id: readCachedProfile().id });
        if (!alive) return;
        if (result.error) setError(result.error.code === 'PGRST202' ? 'Danh mục đang chờ cài file supabase-bhxh-agencies-migration.sql. Bạn vẫn có thể lưu lời nhắc chưa kèm thông tin nhận tiền.' : 'Chưa tải được danh mục cơ sở. Thử đóng và mở lại biểu mẫu.');
        else setData(result.data);
      } catch { if (alive) setError('Chưa tải được danh mục cơ sở. Thử đóng và mở lại biểu mẫu.'); }
      finally { if (alive) onReady(); }
    };
    void load(); return () => { alive = false; };
  }, [onReady]);
  useEffect(() => {
    if (!data || value.receiver_touched || value.receiver_agency_id || !clientId) return;
    const preferred = data.receivers.find(row => row.client_id === clientId);
    const agency = data.agencies.find(row => row.id === preferred?.agency_id && row.is_active);
    const account = agency?.accounts.find(row => row.id === preferred?.account_id);
    if (!agency || !account) return;
    onChange({ receiver_agency_id: agency.id, receiver_account_id: account.id, receiver_version: agency.version,
      transfer_memo: renderTransferMemo(agency.memo_template, unitCode, agency.agency_code, period).memo });
  }, [data, clientId, unitCode, period, value.receiver_touched, value.receiver_agency_id, onChange]);
  const agency = data?.agencies.find(row => row.id === value.receiver_agency_id && row.is_active);
  const account = agency?.accounts.find(row => row.id === value.receiver_account_id);
  useEffect(() => {
    if (!agency || value.transfer_memo_manual) return;
    const memo = renderTransferMemo(agency.memo_template, unitCode, agency.agency_code, period).memo;
    if (memo !== value.transfer_memo) onChange({ transfer_memo: memo });
  }, [agency, unitCode, period, value.transfer_memo, value.transfer_memo_manual, onChange]);
  const details: TransferDetails | null = agency && account && unitCode && value.transfer_memo.trim() && !value.transfer_memo.includes('{{')
    ? transferSnapshot(agency, account, value.transfer_memo, unitCode) : null;
  function chooseAgency(id: string) {
    const selected = data?.agencies.find(row => row.id === id);
    onChange({ receiver_agency_id: id, receiver_account_id: '', receiver_version: selected?.version || 0, receiver_touched: true,
      transfer_memo: selected ? renderTransferMemo(selected.memo_template, unitCode, selected.agency_code, period).memo : '', transfer_memo_manual: false });
  }
  return <section aria-label="Chọn cơ sở nhận tiền" className="space-y-3 rounded-lg border border-gray-200 p-3">
    <h3 className="font-semibold text-sm">Thông tin nhận tiền của cơ sở BHXH</h3>
    {error && <p className="text-xs text-amber-900">{error}</p>}
    <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Cơ sở nhận tiền<select aria-label="Cơ sở nhận tiền" value={value.receiver_agency_id} disabled={!data} onChange={event => chooseAgency(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"><option value="">Chưa kèm thông tin nhận tiền</option>{data?.agencies.filter(row => row.is_active).map(row => <option key={row.id} value={row.id}>{row.name} · {row.agency_code}</option>)}</select></label><label className="text-sm">Tài khoản nhận<select aria-label="Tài khoản nhận" required={!!value.receiver_agency_id} value={value.receiver_account_id} onChange={event => onChange({ receiver_account_id: event.target.value, receiver_touched: true })} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"><option value="">Chọn tài khoản</option>{agency?.accounts.map(row => <option key={row.id} value={row.id}>{VIETNAM_BANKS.find(bank => bank.bin === row.bank_bin)?.shortName} · {row.account_no}</option>)}</select></label></div>
    {value.receiver_agency_id && !agency && data && <p className="text-xs text-amber-900">Cơ sở cũ đã ngừng sử dụng. Chọn lại cơ sở hoặc bỏ thông tin nhận tiền.</p>}
    {agency && <><label className="block text-sm">Cú pháp chuyển khoản *<textarea aria-label="Cú pháp chuyển khoản" required maxLength={500} rows={3} value={value.transfer_memo} onChange={event => onChange({ transfer_memo: event.target.value, receiver_touched: true, transfer_memo_manual: true })} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm" /></label><button type="button" className="text-xs text-blue-700 underline" onClick={() => onChange({ transfer_memo: renderTransferMemo(agency.memo_template, unitCode, agency.agency_code, period).memo, receiver_version: agency.version, receiver_touched: true, transfer_memo_manual: false })}>Điền lại theo mã đơn vị và kỳ đang chọn</button></>}
    {agency && value.receiver_version !== agency.version && <p className="text-xs text-amber-900">Thông tin cơ sở đã thay đổi từ lần nhắc trước. Kiểm tra tài khoản rồi bấm “Điền lại theo mã đơn vị và kỳ đang chọn” để cập nhật trước khi lưu.</p>}
    {!!value.receiver_agency_id && !unitCode && <p className="text-xs text-amber-900">Khách chưa có mã đơn vị BHXH. Cập nhật mã trong hồ sơ khách trước khi kèm thông tin nhận tiền.</p>}
    {details && <BhxhTransferInfo key={`${clientId}:${clientName}:${agency?.id}:${agency?.version}:${account?.id}:${period}:${amount}:${value.transfer_memo}`} client={clientName} period={period} amount={/^\d{1,15}$/.test(amount) ? Number(amount) : null} details={details} />}
    <p className="text-xs text-gray-500">Thiết lập cơ sở và tài khoản mặc định ở tab Cơ sở BHXH. Lời nhắc sẽ giữ thông tin nhận tiền tại lúc lưu.</p>
  </section>;
}
