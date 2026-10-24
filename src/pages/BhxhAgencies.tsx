import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Pencil, Plus, RefreshCw, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { readCachedProfile } from '../lib/profile';
import { asciiUpper, COMMUNE_TYPES, provinceName, VIETNAM_BANKS, VIETNAM_PROVINCES } from '../lib/bhxhAgencies';
import type { AgencyPortal, BhxhAgency, ClientReceiver } from '../lib/bhxhAgencies';
import type { BhxhClient } from '../lib/bhxhLedger';

const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100';
const button = 'rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50';
const defaultMemo = 'BHXH 103 00 {{ma_don_vi}} {{ma_co_quan}} DONG BHXH {{ky}}';
export default function BhxhAgencies({ clients }: { clients: BhxhClient[] }) {
  const [profile] = useState(readCachedProfile);
  const [data, setData] = useState<AgencyPortal | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<(BhxhAgency & { requestId: string }) | null>(null);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [province, setProvince] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [receiver, setReceiver] = useState<ClientReceiver & { requestId: string }>({ client_id: '', agency_id: '', account_id: '', version: 0, requestId: crypto.randomUUID() });
  const busy = useRef(false);
  const fetching = useRef(false);
  const load = useCallback(async () => {
    if (!profile.id || fetching.current) return;
    fetching.current = true; setLoading(true);
    try {
      const result = await supabase.rpc('bhxh_agency_portal', { p_staff_id: profile.id });
      if (result.error) throw result.error;
      setData(result.data); setError('');
      return result.data as AgencyPortal;
    } catch (cause: any) {
      setError(cause.code === 'PGRST202' ? 'Cần chạy toàn bộ file supabase-bhxh-agencies-migration.sql để bật danh mục cơ sở BHXH.' : cause.message || 'Chưa tải được danh mục.');
    } finally { fetching.current = false; setLoading(false); }
  }, [profile.id]);
  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const refresh = () => { if (!document.hidden && !busy.current) void load(); };
    window.addEventListener('focus', refresh);
    return () => { window.clearTimeout(initial); window.removeEventListener('focus', refresh); };
  }, [load]);
  useEffect(() => {
    if (!form) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy.current) setForm(null); };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, [form]);
  async function refreshDirectory() {
    const latest = await load();
    if (!latest || !receiver.client_id) return;
    const row = latest.receivers.find(item => item.client_id === receiver.client_id);
    setReceiver({ client_id: receiver.client_id, agency_id: row?.agency_id || '', account_id: row?.account_id || '', version: row?.version || 0, requestId: crypto.randomUUID() });
  }
  function edit(row?: BhxhAgency) {
    setFormError('');
    setForm({ ...(row || { id: crypto.randomUUID(), version: 0, name: '', agency_code: '', address: '', phone: '', province_code: '', memo_template: defaultMemo, notes: '', is_active: true, accounts: [], areas: [] }), requestId: crypto.randomUUID() });
  }
  function update(patch: Partial<BhxhAgency>) { setForm(previous => previous ? { ...previous, ...patch, requestId: crypto.randomUUID() } : null); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!form || busy.current) return;
    busy.current = true; setSaving(true); setFormError('');
    try {
      const { requestId, ...record } = form;
      const result = await supabase.rpc('save_bhxh_directory', { p_staff_id: profile.id, p_request_id: requestId, p_entity: 'agency', p_record: record });
      if (result.error) throw result.error;
      setForm(null); setMessage('Đã lưu cơ sở BHXH. Thông tin ở lời nhắc cũ được giữ nguyên để đối chiếu.');
      window.dispatchEvent(new Event('taskflow-bhxh-directory-changed')); await load();
    } catch (cause: any) { setFormError(cause.message || 'Chưa lưu được cơ sở.'); }
    finally { busy.current = false; setSaving(false); }
  }
  function chooseClient(client_id: string) {
    const existing = data?.receivers.find(row => row.client_id === client_id);
    setReceiver({ client_id, agency_id: existing?.agency_id || '', account_id: existing?.account_id || '', version: existing?.version || 0, requestId: crypto.randomUUID() });
  }
  async function saveReceiver(event: FormEvent) {
    event.preventDefault(); if (!receiver.client_id || busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try {
      const { requestId, ...record } = receiver;
      const result = await supabase.rpc('save_bhxh_directory', { p_staff_id: profile.id, p_request_id: requestId, p_entity: 'receiver', p_record: record });
      if (result.error) throw result.error;
      setReceiver({ ...result.data, requestId: crypto.randomUUID() }); setMessage('Đã lưu cơ sở và tài khoản mặc định của khách. Mỗi lệnh nhắc vẫn có thể chọn tài khoản khác.');
      window.dispatchEvent(new Event('taskflow-bhxh-directory-changed')); await load();
    } catch (cause: any) { setError(cause.message || 'Chưa lưu được cấu hình khách.'); }
    finally { busy.current = false; setSaving(false); }
  }
  const activeAgencies = data?.agencies.filter(row => row.is_active) || [];
  const receiverAgency = activeAgencies.find(row => row.id === receiver.agency_id);
  const visible = (data?.agencies || []).filter(row => (showInactive || row.is_active) && (!province || row.province_code === province)
    && `${row.name} ${row.agency_code} ${row.areas.map(area => `${area.kind} ${area.name}`).join(' ')}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-xl flex gap-2 items-center"><Building2 size={22} /> Cơ sở BHXH</h2><p className="text-sm text-gray-500 mt-1">Thông tin liên hệ, tài khoản nhận và từng địa bàn quản lý.</p></div><div className="flex gap-2"><button className={button} disabled={loading || saving} onClick={() => void refreshDirectory()}><RefreshCw size={16} className="inline mr-1" /> Làm mới danh mục</button><button className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm disabled:opacity-50" disabled={!data} onClick={() => edit()}><Plus size={16} className="inline mr-1" /> Thêm cơ sở BHXH</button></div></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    <form onSubmit={saveReceiver} aria-label="Cơ sở mặc định của khách" className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
      <h3 className="font-semibold text-blue-900">Cơ sở quản lý và tài khoản mặc định của khách</h3>
      <p className="text-xs text-blue-900">Chọn cơ sở theo hồ sơ thực tế. Địa bàn được lưu riêng để dùng cho chức năng tìm cơ sở theo địa chỉ / TK3 sau này.</p>
      <fieldset disabled={saving || !data} className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm">Khách BHXH<select aria-label="Khách gắn cơ sở" required value={receiver.client_id} onChange={event => chooseClient(event.target.value)} className={input}><option value="">Chọn khách</option>{clients.filter(row => !row.archived && row.participating !== false).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label className="text-sm">Cơ sở<select aria-label="Cơ sở mặc định" value={receiver.agency_id || ''} onChange={event => setReceiver(previous => ({ ...previous, agency_id: event.target.value, account_id: '', requestId: crypto.randomUUID() }))} className={input}><option value="">Chưa gắn / bỏ mặc định</option>{activeAgencies.map(row => <option key={row.id} value={row.id}>{row.name} · {row.agency_code}</option>)}</select></label>
        <label className="text-sm">Tài khoản<select aria-label="Tài khoản mặc định" required={!!receiver.agency_id} value={receiver.account_id || ''} onChange={event => setReceiver(previous => ({ ...previous, account_id: event.target.value, requestId: crypto.randomUUID() }))} className={input}><option value="">Chọn tài khoản</option>{receiverAgency?.accounts.map(row => <option key={row.id} value={row.id}>{VIETNAM_BANKS.find(bank => bank.bin === row.bank_bin)?.shortName} · {row.account_no}</option>)}</select></label>
      </fieldset>
      {receiver.agency_id && !receiverAgency && <p className="text-xs text-amber-800">Cơ sở mặc định cũ đã ngừng sử dụng; chọn lại trước khi tạo lệnh nhắc.</p>}
      <button disabled={saving || !data || !receiver.client_id} className={`${button} bg-white`}>{saving ? 'Đang lưu…' : 'Lưu mặc định cho khách'}</button>
    </form>
    <div className="flex flex-wrap gap-3"><input aria-label="Tìm cơ sở hoặc địa bàn" placeholder="Tìm tên, mã cơ sở hoặc địa bàn…" value={search} onChange={event => setSearch(event.target.value)} className={`${input} flex-1 min-w-48`} /><select aria-label="Lọc tỉnh cơ sở" value={province} onChange={event => setProvince(event.target.value)} className={`${input} sm:w-64`}><option value="">Tất cả tỉnh / thành phố</option>{VIETNAM_PROVINCES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></div>
    <label className="text-xs text-gray-600 flex items-center gap-2"><input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} /> Hiện cơ sở ngừng sử dụng</label>
    {loading && !data ? <p className="text-sm text-gray-500">Đang tải cơ sở BHXH…</p> : data && !visible.length ? <p className="rounded-xl border p-6 text-sm text-gray-500">Chưa có cơ sở phù hợp. Thêm cơ sở để thiết lập thông tin đóng tiền.</p> : visible.map(row => <article key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold text-gray-800">{row.name}{!row.is_active && <span className="text-xs text-gray-500 ml-2">Ngừng sử dụng</span>}</h3><p className="text-xs text-gray-500 mt-1">Mã cơ sở {row.agency_code} · {provinceName(row.province_code)}</p></div><button className={button} onClick={() => edit(row)}><Pencil size={14} className="inline mr-1" /> Sửa cơ sở</button></div>
      <p className="text-sm text-gray-600">{row.address} · Điện thoại: {row.phone}</p>
      <div className="space-y-2">{row.accounts.map(account => <p key={account.id} className="rounded-lg bg-gray-50 p-3 text-sm break-words"><strong>{VIETNAM_BANKS.find(bank => bank.bin === account.bank_bin)?.shortName}</strong> · {account.account_no}<span className="block text-xs mt-1">{account.account_name}{account.branch && ` · ${account.branch}`}</span></p>)}</div>
      <div className="flex flex-wrap gap-2">{row.areas.map(area => <span key={area.id} className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800">{area.kind} {area.name}{area.commune_code && ` · ${area.commune_code}`}</span>)}</div>
      {row.notes && <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{row.notes}</p>}
    </article>)}
    {form && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3"><section role="dialog" aria-modal="true" aria-labelledby="agency-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 space-y-4">
      <header className="flex justify-between gap-3"><h2 id="agency-title" className="font-bold text-lg">{form.version ? 'Sửa cơ sở BHXH' : 'Thêm cơ sở BHXH'}</h2><button disabled={saving} aria-label="Đóng cơ sở" onClick={() => setForm(null)}><X size={20} /></button></header>
      <form onSubmit={save} className="space-y-4"><fieldset disabled={saving} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Tên cơ sở *<input required maxLength={300} value={form.name} onChange={event => update({ name: event.target.value })} className={input} /></label><label className="text-sm">Mã cơ sở BHXH *<input required maxLength={20} pattern="[A-Za-z0-9]{2,20}" value={form.agency_code} onChange={event => update({ agency_code: event.target.value.toUpperCase() })} className={input} /><span className="text-xs text-gray-500">Giữ cả số 0 ở đầu mã.</span></label></div>
        <label className="block text-sm">Địa chỉ *<input required maxLength={1000} value={form.address} onChange={event => update({ address: event.target.value })} className={input} /></label>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Số điện thoại chính *<input required type="tel" maxLength={25} value={form.phone} onChange={event => update({ phone: event.target.value })} className={input} /></label><label className="text-sm">Tỉnh / thành phố *<select required value={form.province_code} onChange={event => update({ province_code: event.target.value })} className={input}><option value="">Chọn tỉnh / thành phố</option>{VIETNAM_PROVINCES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label></div>
        <section className="space-y-3"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Tài khoản nhận tiền</h3><button type="button" disabled={form.accounts.length >= 30} className={button} onClick={() => update({ accounts: [...form.accounts, { id: crypto.randomUUID(), bank_bin: '', account_no: '', account_name: asciiUpper(form.name), branch: '' }] })}>Thêm tài khoản</button></div><p className="text-xs text-gray-500">Danh sách tên và mã ngân hàng từ VietQR, cập nhật 24/10/2026. Nhập số tài khoản liền dãy số, giữ số 0 đầu.</p>
          {form.accounts.map((account, index) => <div key={account.id} className="rounded-lg border p-3 space-y-3"><div className="flex justify-between"><strong className="text-sm">Tài khoản {index + 1}</strong><button type="button" className="text-xs text-red-700" onClick={() => update({ accounts: form.accounts.filter(row => row.id !== account.id) })}>Bỏ tài khoản {index + 1}</button></div><div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Ngân hàng {index + 1} *<select required value={account.bank_bin} onChange={event => update({ accounts: form.accounts.map(row => row.id === account.id ? { ...row, bank_bin: event.target.value } : row) })} className={input}><option value="">Chọn ngân hàng</option>{VIETNAM_BANKS.map(bank => <option key={bank.bin} value={bank.bin}>{bank.shortName} — {bank.name}</option>)}</select></label><label className="text-sm">Số tài khoản {index + 1} *<input required inputMode="numeric" pattern="[0-9]{6,34}" maxLength={34} value={account.account_no} onChange={event => update({ accounts: form.accounts.map(row => row.id === account.id ? { ...row, account_no: event.target.value } : row) })} className={input} /></label></div><label className="block text-sm">Tên tài khoản nhận {index + 1} *<input required maxLength={150} value={account.account_name} onChange={event => update({ accounts: form.accounts.map(row => row.id === account.id ? { ...row, account_name: asciiUpper(event.target.value) } : row) })} className={input} /></label><label className="block text-sm">Chi nhánh {index + 1}<input maxLength={300} value={account.branch} onChange={event => update({ accounts: form.accounts.map(row => row.id === account.id ? { ...row, branch: event.target.value } : row) })} className={input} /></label></div>)}
        </section>
        <section className="space-y-3"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Địa bàn quản lý</h3><button type="button" disabled={form.areas.length >= 1000} className={button} onClick={() => update({ areas: [...form.areas, { id: crypto.randomUUID(), kind: 'Xã', name: '', commune_code: '' }] })}>Thêm địa bàn</button></div>
          {form.areas.map((area, index) => <div key={area.id} className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border p-3"><label className="text-sm">Loại địa bàn {index + 1}<select value={area.kind} onChange={event => update({ areas: form.areas.map(row => row.id === area.id ? { ...row, kind: event.target.value } : row) })} className={input}>{COMMUNE_TYPES.map(kind => <option key={kind}>{kind}</option>)}</select></label><label className="text-sm">Tên địa bàn {index + 1} *<input required maxLength={150} value={area.name} onChange={event => update({ areas: form.areas.map(row => row.id === area.id ? { ...row, name: event.target.value } : row) })} className={input} /></label><label className="text-sm">Mã địa bàn {index + 1} (nếu có)<input pattern="[0-9]{5}" maxLength={5} value={area.commune_code} onChange={event => update({ areas: form.areas.map(row => row.id === area.id ? { ...row, commune_code: event.target.value } : row) })} className={input} /></label><button type="button" className="text-xs text-red-700 self-end py-2" onClick={() => update({ areas: form.areas.filter(row => row.id !== area.id) })}>Bỏ địa bàn {index + 1}</button></div>)}
        </section>
        <label className="block text-sm">Mẫu cú pháp chuyển khoản *<textarea required rows={2} maxLength={500} value={form.memo_template} onChange={event => update({ memo_template: event.target.value })} className={input} /><span className="text-xs text-gray-500">Biến: {'{{ma_don_vi}}, {{ma_co_quan}}, {{ky}}, {{thang}}, {{nam}}'}. Cho sửa cú pháp tại từng lệnh nhắc.</span></label>
        <label className="block text-sm">Ghi chú / số liên hệ khác<textarea rows={3} maxLength={5000} value={form.notes} onChange={event => update({ notes: event.target.value })} className={input} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={event => update({ is_active: event.target.checked })} /> Đang sử dụng</label>
      </fieldset>{formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}<footer className="flex justify-end gap-2"><button disabled={saving} type="button" className={button} onClick={() => setForm(null)}>Hủy</button><button disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">{saving ? 'Đang lưu…' : 'Lưu cơ sở'}</button></footer></form>
    </section></div>}
  </div>;
}
