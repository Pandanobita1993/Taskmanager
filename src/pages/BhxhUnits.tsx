import ClientSelect from '../components/ClientSelect';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { readCachedProfile } from '../lib/profile';
import { BHXH_UNIT_KINDS, bhxhUnitLabel } from '../lib/bhxhUnits';
import type { BhxhUnit } from '../lib/bhxhUnits';

type Client = { id: string; name: string; tax_code: string; archived: boolean; participating: boolean; can_edit_units: boolean; units: BhxhUnit[] };
const field = 'mt-1 w-full rounded-lg border bg-white p-2 text-sm disabled:bg-gray-100';
const button = 'rounded-lg border px-3 py-2 text-sm disabled:opacity-50';
export default function BhxhUnits({ onChanged }: { onChanged: () => void }) {
  const [params, setParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<(BhxhUnit & { requestId: string }) | null>(null);
  const [formError, setFormError] = useState('');
  const busy = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    const result = await supabase.rpc('bhxh_units_portal', { p_staff_id: readCachedProfile().id });
    if (result.error) setError(result.error.code === 'PGRST202' ? 'Chạy toàn bộ file supabase-bhxh-units-migration.sql trong Supabase để bật tối đa 3 mã mỗi khách.' : result.error.message);
    else { setClients(result.data.clients); setError(''); }
    setLoading(false);
  }, []);
  useEffect(() => { const initial = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(initial); }, [load]);
  useEffect(() => {
    if (!form) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy.current) setForm(null); };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, [form]);
  function edit(client: Client, unit?: BhxhUnit) {
    setFormError('');
    setForm({ ...(unit || { id: crypto.randomUUID(), client_id: client.id, kind: null, code: '', is_active: true, version: 0, notes: '' }), requestId: crypto.randomUUID() });
  }
  function update(patch: Partial<BhxhUnit>) { setForm(previous => previous ? { ...previous, ...patch, requestId: crypto.randomUUID() } : null); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!form || busy.current) return;
    busy.current = true; setSaving(true); setFormError('');
    const { requestId, ...record } = form;
    try {
      const result = await supabase.rpc('save_bhxh_unit', { p_staff_id: readCachedProfile().id, p_request_id: requestId, p_record: record });
      if (result.error) throw result.error;
      setForm(null); setMessage('Đã lưu mã đơn vị. C12, tiền nộp và lời nhắc tiếp tục gắn với đúng mã.');
      await load(); onChanged();
    } catch (cause: any) { setFormError(cause.message || 'Chưa lưu được mã.'); }
    finally { busy.current = false; setSaving(false); }
  }
  const selected = params.get('client') || '';
  const visible = clients.filter(client => (!selected || client.id === selected) && `${client.name} ${client.tax_code} ${client.units.map(unit => unit.code).join(' ')}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const formClient = clients.find(client => client.id === form?.client_id);
  return <section className="space-y-4">
    <div className="flex justify-between gap-3"><h2 className="text-xl font-bold">Mã đơn vị BHXH</h2><button className={button} disabled={loading} onClick={() => void load()}>Làm mới mã đơn vị</button></div>
    <p className="rounded-lg bg-blue-50 p-4 text-sm text-blue-950">Mỗi khách tối đa 3 mã đang sử dụng: người lao động, đại diện pháp luật và người nước ngoài. Mỗi mã có C12, tiền nộp, lời nhắc và tài khoản nhận mặc định riêng. Mã cũ giữ ở “Chờ phân loại”; chọn nhóm khi đã đối chiếu hồ sơ.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{message && <p role="status" className="text-sm text-green-800">{message}</p>}
    <div className="flex flex-wrap gap-3"><label className="flex-1 text-sm">Khách hàng<ClientSelect className={field} value={selected} onChange={event => setParams(previous => { const next = new URLSearchParams(previous); next.delete('unit'); if (event.target.value) next.set('client', event.target.value); else next.delete('client'); return next; })}><option value="">Tất cả khách BHXH</option>{clients.map(client => <option key={client.id} value={client.id} data-search={client.tax_code}>{client.name}</option>)}</ClientSelect></label><label className="flex-1 text-sm">Tìm tên / MST / mã đơn vị<input className={field} value={search} onChange={event => setSearch(event.target.value)} /></label></div>
    {loading ? <p className="text-sm text-gray-500">Đang tải mã đơn vị…</p> : visible.map(client => <article key={client.id} className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{client.name}</h3><p className="text-xs text-gray-500">MST {client.tax_code} · {client.units.filter(unit => unit.is_active).length}/3 mã đang dùng{client.archived && ' · Khách lưu trữ'}</p></div>{client.can_edit_units && !client.archived && client.participating && <button className={button} disabled={client.units.filter(unit => unit.is_active).length >= 3} onClick={() => edit(client)}>Thêm mã đơn vị</button>}</div>
      {!client.can_edit_units && <p className="text-xs text-gray-500">Nhân viên phụ trách BHXH của khách cập nhật và phân loại mã.</p>}
      {!client.units.length && <p className="text-sm text-amber-800">Chưa thiết lập mã. Thêm mã để ghi C12, tiền nộp và nhắc khách.</p>}
      {client.units.map(unit => <div key={unit.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div><p className={`text-sm font-semibold ${unit.is_active ? '' : 'text-gray-500'}`}>{bhxhUnitLabel(unit)}{!unit.is_active && ' · Ngừng sử dụng'}</p>{unit.notes && <p className="text-xs text-gray-500 whitespace-pre-wrap mt-1">{unit.notes}</p>}</div><div className="flex gap-2"><button className={button} onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.set('tab', 'c12'); next.set('client', client.id); next.set('unit', unit.id); return next; })}>Xem sổ mã này</button>{client.can_edit_units && <button className={button} onClick={() => edit(client, unit)}>{unit.kind ? 'Sửa mã' : 'Phân loại / bổ sung mã'}</button>}</div></div>)}
    </article>)}
    {form && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3"><section role="dialog" aria-modal="true" aria-labelledby="bhxh-unit-title" className="max-h-[92vh] overflow-y-auto w-full max-w-xl rounded-xl bg-white p-5 space-y-4"><h2 id="bhxh-unit-title" className="font-bold text-lg">{form.version ? 'Cập nhật mã đơn vị' : 'Thêm mã đơn vị'} · {formClient?.name}</h2><form onSubmit={save} className="space-y-4"><fieldset disabled={saving} className="space-y-4">
      <label className="block text-sm">Nhóm mã *<select required={!form.version} disabled={!!formClient?.units.find(unit => unit.id === form.id)?.kind && !!form.has_activity} value={form.kind || ''} onChange={event => update({ kind: (event.target.value || null) as BhxhUnit['kind'] })} className={field}><option value="">{form.version ? 'Chờ phân loại' : 'Chọn nhóm'}</option>{BHXH_UNIT_KINDS.map(([kind, label]) => <option key={kind} value={kind} disabled={form.is_active && formClient?.units.some(unit => unit.id !== form.id && unit.is_active && unit.kind === kind)}>{label}</option>)}</select></label>
      <label className="block text-sm">Mã đơn vị *<input required={!!form.code || !form.version} disabled={!!form.has_activity && !!formClient?.units.find(unit => unit.id === form.id)?.code} maxLength={30} pattern="[A-Za-z0-9]{2,30}" value={form.code} onChange={event => update({ code: event.target.value.toUpperCase() })} className={field} /></label>
      {form.has_activity && <p className="text-xs text-amber-900">Mã đã có dữ liệu: giữ số mã và toàn bộ công nợ. Mã cũ chờ phân loại được chọn nhóm một lần; nếu được cấp mã khác, ngừng mã cũ rồi thêm mã mới.</p>}
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={event => update({ is_active: event.target.checked })} /> Đang sử dụng</label>
      <label className="block text-sm">Ghi chú / lý do ngừng hoặc khôi phục<textarea maxLength={5000} rows={3} value={form.notes || ''} onChange={event => update({ notes: event.target.value })} className={field} /></label>
    </fieldset>{formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}<div className="flex justify-end gap-3"><button type="button" className={button} disabled={saving} onClick={() => setForm(null)}>Hủy</button><button className={`${button} bg-emerald-600 text-white`} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu mã đơn vị'}</button></div></form></section></div>}
  </section>;
}
