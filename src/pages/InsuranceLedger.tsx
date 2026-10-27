import ClientSelect from '../components/ClientSelect';
import { bhxhUnitLabel, bhxhUnitKindLabel, soleBhxhUnit, matchBhxhImport } from '../lib/bhxhUnits';
import BhxhUnits from './BhxhUnits';
import BhxhTools from './BhxhTools';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileUp, History, Pencil, Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { readCachedProfile } from '../lib/profile';
import { recurringDateLabel, vietnamToday } from '../lib/recurringTasks';
import { bhxhMoney, bhxhMonthLabel, previewBhxhPeriod, withCurrentBhxhDrafts, bhxhSuggestedAmount, missingCurrentBhxhC12 } from '../lib/bhxhLedger';
import type { BhxhEvent, BhxhPayment, BhxhPeriod, BhxhPortal } from '../lib/bhxhLedger';
import type { C12Draft } from '../lib/c12Parser';
import PaymentFollowups from './PaymentFollowups';
import BhxhAgencies from './BhxhAgencies';
import BhxhProofInput from '../components/BhxhProofInput';
import { TaskProofViewer } from '../components/tasks/TaskProofViewer';

type Form = {
  entity: 'period' | 'payment'; action: 'save' | 'void' | 'restore'; id: string; version: number; client_id: string; unit_id: string;
  period: string; charges: string; manual: boolean; opening: string; opening_reason: string;
  paid_on: string; amount: string; reference: string; notes: string; event_note: string; source_filename: string;
  requestId: string; draft: C12Draft | null; proof_file: string; amount_manual: boolean;
};
const input = 'w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white disabled:bg-gray-100';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50';
const errorText = (error: { code?: string; message?: string }) => error.code === 'PGRST202'
  ? 'Sổ C12 đang chờ cài dữ liệu. Chạy file supabase-bhxh-ledger-migration.sql trong Supabase để bật tính năng.'
  : error.message || 'Chưa thực hiện được. Vui lòng thử lại.';

export default function InsuranceLedger() {
  const [profile] = useState(readCachedProfile);
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<BhxhPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [proofBusy, setProofBusy] = useState(false);
  const [proofView, setProofView] = useState('');
  const [search, setSearch] = useState('');
  const [showVoided, setShowVoided] = useState(false);
  const [history, setHistory] = useState<{ title: string; events: BhxhEvent[] | null; error: string } | null>(null);
  const historyToken = useRef(0);
  const fetching = useRef(false);
  const queued = useRef(false);
  const busy = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const today = data?.today || vietnamToday();
  const canManageBhxh = data?.can_manage_bhxh !== false;
  const tab = ['c12', 'payments', 'reminders', 'agencies', 'units', 'tools'].includes(params.get('tab') || '') ? params.get('tab')! : 'c12';
  const clientId = params.get('client') || '';
  const unitId = params.get('unit') || '';
  const month = params.get('month') || '';
  function query(key: string, value: string) {
    setParams(previous => { const next = new URLSearchParams(previous); if (key === 'client') next.delete('unit'); if (value) next.set(key, value); else next.delete(key); return next; });
  }
  const load = useCallback(async (quiet = false) => {
    if (!profile.id) { setError('Hãy thiết lập hồ sơ nhân viên trước.'); setLoading(false); return; }
    if (fetching.current) { queued.current = true; return; }
    fetching.current = true;
    if (!quiet) setLoading(true);
    try {
      do {
        queued.current = false;
        const result = await supabase.rpc('bhxh_ledger_portal', { p_staff_id: profile.id });
        if (result.error) throw result.error;
        setData(result.data); setError('');
      } while (queued.current);
    } catch (cause: any) { setError(errorText(cause)); }
    finally { fetching.current = false; setLoading(false); }
  }, [profile.id]);
  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const refresh = () => { if (!document.hidden) void load(true); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);
  useEffect(() => {
    if (!form && !history) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('dialog[open]') && !busy.current && !proofBusy) { setForm(null); setHistory(null); historyToken.current++; } };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, [form, history, proofBusy]);
  function open(entity: Form['entity'], row?: BhxhPeriod | BhxhPayment, action: Form['action'] = 'save', imported?: { draft: C12Draft; filename: string }, paymentClient?: string, paymentUnit?: string) {
    if (!canManageBhxh) return;
    const period = row && 'period_on' in row ? row : null;
    const payment = row && 'paid_on' in row ? row : null;
    const draft = imported?.draft || null;
    const chosenClient = paymentClient || row?.client_id || clientId;
    setProofBusy(false);
    const matchingClients = draft?.unitCode ? data?.clients.filter(client => client.units?.some(unit => unit.code.trim().toUpperCase() === draft.unitCode)) || [] : [];
    const cid = chosenClient || (matchingClients.length === 1 ? matchingClients[0].id : '');
    const units = data?.clients.find(client => client.id === cid)?.units || [];
    const uid = row?.unit_id || paymentUnit || (draft ? matchBhxhImport(units, draft.unitCode, unitId)?.id || '' : (units.some(unit => unit.id === unitId && unit.is_active) ? unitId : '') || soleBhxhUnit(units)?.id || '');
    setFormError(''); setMessage('');
    setForm({ entity, action, id: period?.is_current_draft ? crypto.randomUUID() : row?.id || crypto.randomUUID(), version: row?.version || 0,
      client_id: cid, unit_id: uid,
      period: period?.period_on.slice(0, 7) || draft?.period || month || today.slice(0, 7),
      charges: draft?.charges == null ? period?.charges == null ? '' : String(period.charges) : String(draft.charges),
      manual: period?.opening_override != null, opening: period?.opening_override == null ? '' : String(period.opening_override), opening_reason: period?.opening_reason || '',
      paid_on: payment?.paid_on || today, amount: payment ? String(payment.amount) : bhxhSuggestedAmount(data?.periods || [], cid, today, uid),
      amount_manual: !!payment, proof_file: payment?.proof_file || '', reference: payment?.reference || '',
      notes: row?.notes || '', event_note: '', source_filename: imported?.filename || period?.source_filename || '',
      requestId: crypto.randomUUID(), draft,
    });
  }
  function update(patch: Partial<Form>) {
    setForm(previous => previous ? { ...previous, ...patch, requestId: crypto.randomUUID() } : null);
  }
  async function readFile(file?: File) {
    if (!file) return;
    setReading(true); setError('');
    try {
      const { readC12Pdf } = await import('../lib/readC12Pdf');
      const draft = await readC12Pdf(file);
      const matched = draft.unitCode ? data?.clients.filter(client => client.units?.some(unit => unit.code.trim().toUpperCase() === draft.unitCode)) || [] : [];
      const chosen = clientId || (matched.length === 1 ? matched[0].id : '');
      const uid = matchBhxhImport(data?.clients.find(client => client.id === chosen)?.units, draft.unitCode, unitId)?.id || '';
      const existing = data?.periods.find(row => row.client_id === chosen && row.unit_id === uid && row.period_on.slice(0, 7) === draft.period);
      open('period', existing, 'save', { draft, filename: file.name });
    } catch (cause: any) { setError(cause.message || 'Chưa đọc được C12. Vui lòng nhập thủ công.'); }
    finally { setReading(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  function chooseFormClient(value: string) {
    if (!form || form.version) return;
    const units = data?.clients.find(client => client.id === value)?.units || [];
    const uid = form.draft ? matchBhxhImport(units, form.draft.unitCode)?.id || '' : soleBhxhUnit(units)?.id || '';
    chooseFormUnit(uid, value);
  }
  function chooseFormUnit(unit: string, client = form?.client_id || '') {
    if (!form || form.version) return;
    const existing = form.entity === 'period' ? data?.periods.find(row => row.client_id === client && row.unit_id === unit && row.period_on.slice(0, 7) === form.period) : null;
    if (existing && form.draft) open('period', existing, 'save', { draft: form.draft, filename: form.source_filename });
    else update({ client_id: client, unit_id: unit, ...(form.entity === 'payment' ? { amount: bhxhSuggestedAmount(data?.periods || [], client, form.paid_on, unit), amount_manual: false } : {}) });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form || busy.current || proofBusy || !canManageBhxh) return;
    setFormError('');
    if (!form.client_id) return setFormError('Chọn khách hàng.');
    if (!form.unit_id) return setFormError('Chọn mã đơn vị BHXH.');
    const selected = data?.clients.find(client => client.id === form.client_id)?.units?.find(unit => unit.id === form.unit_id);
    if (form.draft?.unitCode && selected?.code && selected.code.trim().toUpperCase() !== form.draft.unitCode) return setFormError('Mã đơn vị trên C12 khác mã đã chọn. Hãy chọn đúng mã hoặc kiểm tra tại tab Mã đơn vị.');
    if (form.entity === 'period' && (!/^-?\d{1,15}$/.test(form.charges) || (form.manual && (!/^-?\d{1,15}$/.test(form.opening) || !form.opening_reason.trim())))) return setFormError('Nhập phát sinh bằng đồng nguyên. Nếu sửa đầu kỳ, nhập cả số tiền và lý do.');
    if (form.entity === 'payment' && form.action === 'save' && (!/^\d{1,15}$/.test(form.amount) || Number(form.amount) <= 0)) return setFormError('Tiền nộp phải là số đồng nguyên lớn hơn 0.');
    if (form.entity === 'payment' && form.action !== 'void' && !form.proof_file) return setFormError('Đính kèm ảnh bằng chứng đóng tiền trước khi lưu.');
    if (form.action !== 'save' && !form.event_note.trim()) return setFormError('Nhập lý do hủy / khôi phục.');
    busy.current = true; setSaving(true);
    const record = form.entity === 'period' ? { id: form.id, version: form.version, client_id: form.client_id, unit_id: form.unit_id,
      period_on: `${form.period}-01`, charges: form.charges, opening_override: form.manual ? form.opening : null,
      opening_reason: form.manual ? form.opening_reason : '', notes: form.notes, source_filename: form.source_filename, event_note: form.event_note,
    } : { id: form.id, version: form.version, client_id: form.client_id, unit_id: form.unit_id, paid_on: form.paid_on, amount: form.amount, reference: form.reference, proof_file: form.proof_file, notes: form.notes, event_note: form.event_note };
    try {
      const result = await supabase.rpc('save_bhxh_ledger', { p_staff_id: profile.id, p_request_id: form.requestId, p_entity: form.entity, p_action: form.action, p_record: record });
      if (result.error) throw result.error;
      setForm(null); setMessage(form.entity === 'period' ? 'Đã lưu C12. Số dư các kỳ liền sau được tính lại theo số liệu mới.' : 'Đã cập nhật quá trình đóng. Tiền nộp và số dư C12 được tính lại theo tháng thực nộp.');
      window.dispatchEvent(new Event('taskflow-bhxh-ledger-changed'));
      await load(true);
    } catch (cause: any) { setFormError(errorText(cause)); }
    finally { busy.current = false; setSaving(false); }
  }
  async function openHistory(entity: Form['entity'], row: BhxhPeriod | BhxhPayment) {
    if ('is_current_draft' in row && row.is_current_draft) return;
    const token = ++historyToken.current;
    setHistory({ title: `${row.client_name} · ${bhxhUnitKindLabel(row.unit_kind)} · ${row.unit_code || 'Chưa có mã'} · ${entity === 'period' && 'period_on' in row ? bhxhMonthLabel(row.period_on) : 'Lần nộp BHXH'}`, events: null, error: '' });
    const result = await supabase.rpc('bhxh_ledger_history', { p_staff_id: profile.id, p_entity: entity, p_id: row.id });
    if (token === historyToken.current) setHistory(previous => previous && { ...previous, events: result.error ? [] : result.data, error: result.error ? errorText(result.error) : '' });
  }
  const scope = <T extends { client_id: string; client_name: string; unit_id?: string }>(rows: T[]) => rows.filter(row => (!clientId || row.client_id === clientId) && (!unitId || row.unit_id === unitId) && row.client_name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const allPeriods = data ? withCurrentBhxhDrafts(data) : [];
  const currentDrafts = scope(allPeriods).filter(row => row.is_current_draft);
  const periods = scope(allPeriods).filter(row => !month || row.period_on.slice(0, 7) === month);
  const payments = scope(data?.payments || []).filter(row => (!month || row.paid_on.slice(0, 7) === month) && (showVoided || !row.is_void));
  const pendingC12 = data ? scope(missingCurrentBhxhC12(data)).length : 0;
  const preview = form?.entity === 'period' ? previewBhxhPeriod(data?.periods || [], data?.payments || [], form.client_id, `${form.period}-01`, form.manual ? form.opening : '', form.charges, form.unit_id) : null;
  const paymentSuggestion = form?.entity === 'payment' ? bhxhSuggestedAmount(data?.periods || [], form.client_id, form.paid_on, form.unit_id) : '';
  const participatingClients = (data?.clients || []).filter(client => !client.archived && client.participating !== false && (!unitId || client.units?.some(unit => unit.id === unitId)) && (!clientId || client.id === clientId) && client.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const overviewMonth = month || today.slice(0, 7);
  const formClient = data?.clients.find(client => client.id === form?.client_id);
  const formUnit = formClient?.units?.find(unit => unit.id === form?.unit_id);
  const unitMismatch = !!(form?.draft?.unitCode && formUnit?.code && formUnit.code.trim().toUpperCase() !== form.draft.unitCode);
  return <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-5">
    <header className="flex flex-wrap justify-between gap-3 items-start"><div><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ShieldCheck className="text-emerald-600" /> Theo dõi BHXH</h1><p className="mt-1 text-sm text-gray-500">Sổ C12 và quá trình nộp tiền theo từng mã đơn vị của khách hàng.</p></div>{!['reminders', 'agencies', 'units', 'tools'].includes(tab) && <button disabled={loading} className={button} onClick={() => void load()}><RefreshCw size={16} /> Làm mới</button>}</header>
    <nav aria-label="Phân hệ BHXH" className="flex flex-wrap gap-2">{[['c12', 'Công nợ C12'], ['payments', 'Quá trình đóng'], ['reminders', 'Nhắc khách'], ['agencies', 'Cơ sở BHXH'], ['units', 'Mã đơn vị'], ['tools', 'Công cụ']].map(([key, label]) => <button key={key} onClick={() => query('tab', key)} aria-pressed={tab === key} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === key ? 'bg-emerald-600 text-white' : 'border bg-white text-gray-600'}`}>{label}</button>)}</nav>
    {tab === 'tools' ? <BhxhTools clients={data?.clients || []} initialClientId={clientId} /> : tab === 'units' ? <BhxhUnits onChanged={() => void load(true)} /> : tab === 'agencies' ? <BhxhAgencies clients={data?.clients || []} /> : tab === 'reminders' ? error ? <p role="alert" className="text-sm text-red-700">{error}</p> : data ? <PaymentFollowups scope="bhxh" embedded bhxhPeriods={data.periods} /> : <p className="text-sm text-gray-500">Đang tải dữ liệu BHXH…</p> : <>
      {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</p>}
      {message && <p role="status" className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm">{message}</p>}
      {!canManageBhxh && <p className="text-sm text-gray-600">Hồ sơ hiện tại chỉ xem sổ BHXH. Cần nghiệp vụ BHXH hoặc kiêm nhiệm BHXH để cập nhật C12 và quá trình đóng của các khách.</p>}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-950"><strong>Cuối kỳ = Đầu kỳ + Phát sinh − Đã nộp.</strong> Tiền đã nộp được cộng từ Quá trình đóng theo tháng thực nộp. Số âm là đóng thừa. Không có số cuối của tháng liền trước thì hiển thị “Thiếu thông tin”.</div>
      {tab === 'c12' && <section aria-label="C12 tháng hiện tại chưa cập nhật" className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-sm text-gray-600">C12 tháng {bhxhMonthLabel(today)} chưa cập nhật phát sinh</p><strong className={`block text-2xl mt-1 ${pendingC12 ? 'text-amber-700' : 'text-emerald-700'}`}>{data ? `${pendingC12} C12` : '—'}</strong><p className="text-xs text-gray-500 mt-2">Mỗi mã BHXH đang dùng tính là một C12, kể cả mã chưa có số liệu tháng trước. Theo bộ lọc khách hàng và mã đơn vị; luôn thống kê tháng hiện tại.</p></section>}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-3"><label className="flex-1 min-w-44 text-xs text-gray-600">Khách hàng<ClientSelect aria-label="Lọc khách BHXH" value={clientId} onChange={event => query('client', event.target.value)} className={input}><option value="">Tất cả khách BHXH</option>{data?.clients.map(client => <option key={client.id} value={client.id} data-search={client.tax_code}>{client.name}{client.archived ? ' (lưu trữ)' : ''}</option>)}</ClientSelect></label><label className="text-xs text-gray-600">Mã đơn vị<select aria-label="Lọc mã BHXH" value={unitId} onChange={event => query('unit', event.target.value)} className={input}><option value="">Tất cả mã</option>{data?.clients.filter(client => !clientId || client.id === clientId).flatMap(client => (client.units || []).map(unit => <option key={unit.id} value={unit.id}>{!clientId ? `${client.name} · ` : ''}{bhxhUnitLabel(unit)}{!unit.is_active && ' (ngừng)'}</option>))}</select></label><label className="text-xs text-gray-600">Kỳ / tháng thực nộp<input aria-label="Lọc tháng BHXH" type="month" min="1900-01" max="2200-12" value={month} onChange={event => query('month', event.target.value)} className={input} /></label>{month && <button onClick={() => query('month', '')} className={`${button} text-xs`}>Tất cả kỳ</button>}<label className="text-xs text-gray-600 flex-1 min-w-36">Tìm tên khách<input value={search} onChange={event => setSearch(event.target.value)} className={input} /></label></div>
      {tab === 'c12' && currentDrafts.length > 0 && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-blue-900">Có <strong>{currentDrafts.length} mã</strong> sẵn sàng nhập phát sinh tháng <strong>{bhxhMonthLabel(today)}</strong>. Đầu kỳ tự lấy từ cuối tháng liền trước.</p><button className={`${button} bg-white text-blue-700`} onClick={() => query('month', today.slice(0, 7))}>Xem tháng hiện tại</button></div>}
      <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="font-bold text-gray-800">{tab === 'c12' ? 'Công nợ theo kỳ C12' : 'Các lần khách nộp BHXH'}</h2><div className="flex flex-wrap gap-2">{tab === 'c12' && <><input ref={fileInput} aria-label="Chọn C12 PDF" type="file" accept=".pdf,application/pdf" hidden onChange={event => void readFile(event.target.files?.[0])} /><button disabled={!canManageBhxh || !data || reading} onClick={() => fileInput.current?.click()} className={button}><FileUp size={16} /> {reading ? 'Đang đọc C12…' : 'Đọc C12 PDF'}</button></>}<button disabled={!canManageBhxh || !data || reading} onClick={() => open(tab === 'c12' ? 'period' : 'payment')} className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-semibold inline-flex gap-2 items-center disabled:opacity-50"><Plus size={16} />{tab === 'c12' ? 'Thêm kỳ C12' : 'Ghi nhận tiền nộp'}</button></div></div>
      {tab === 'c12' ? <>
        <p className="text-xs text-gray-500">{periods.length} kỳ · Khi sửa kỳ cũ hoặc ghi bổ sung tiền nộp, các kỳ liền sau tự cập nhật tới kỳ có đầu kỳ chỉnh riêng. Đọc PDF có lớp chữ ngay trên máy, không tải file lên hay gọi AI trả phí.</p>
        {loading && !data ? <p className="text-sm text-gray-500">Đang tải sổ C12…</p> : data && !periods.length ? <p className="p-8 bg-white border border-gray-200 rounded-xl text-center text-sm text-gray-500">Chưa có kỳ C12 trong bộ lọc. Thiết lập mã tại tab Mã đơn vị, sau đó thêm kỳ hoặc đọc file C12 để bắt đầu.</p> : periods.map(row => <article key={row.id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 space-y-3"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold text-gray-800">{row.client_name}</h3><p className="text-xs text-emerald-800 mt-1">{bhxhUnitKindLabel(row.unit_kind)} · {row.unit_code || 'Chưa có mã'}</p><p className="text-xs text-gray-500 mt-1">Kỳ {bhxhMonthLabel(row.period_on)} · MST {row.tax_code}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold h-fit ${row.is_current_draft || row.closing_balance == null ? 'bg-amber-50 text-amber-800' : row.closing_balance > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{row.is_current_draft ? 'Chờ nhập phát sinh' : row.closing_balance == null ? 'Thiếu thông tin' : row.closing_balance > 0 ? 'Còn phải đóng' : row.closing_balance < 0 ? 'Đóng thừa' : 'Đã cân đối'}</span></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50 rounded-lg p-3">{[['Đầu kỳ', row.opening_balance], ['Phát sinh trong kỳ', row.charges], ['Đã nộp trong kỳ', row.paid_total], ['Cuối kỳ', row.closing_balance]].map(([label, value]) => <div key={String(label)}><p className="text-xs text-gray-500">{label}</p><p className="font-semibold text-sm text-gray-800 mt-1 break-words">{row.is_current_draft && label === 'Phát sinh trong kỳ' ? 'Chưa nhập' : row.is_current_draft && label === 'Cuối kỳ' ? 'Chờ nhập phát sinh' : bhxhMoney(value as number | null)}</p></div>)}</div>{row.is_current_draft && <p className="text-sm text-blue-800">Kỳ tháng hiện tại đã mở sẵn. Nhập phát sinh rồi lưu để hoàn tất kỳ này.</p>}<p className="text-xs text-gray-500">Đầu kỳ: {row.opening_source === 'manual' ? `đã chỉnh riêng — ${row.opening_reason}` : row.opening_source === 'previous' ? 'tự lấy từ cuối tháng liền trước' : 'chưa có số cuối tháng liền trước'}. Tiền nộp: {row.payment_count} lần theo tháng thực nộp.</p>{row.notes && <p className="whitespace-pre-wrap text-sm text-gray-600 break-words">{row.notes}</p>}{row.source_filename && <p className="text-xs text-gray-500 break-words">Tham chiếu file: {row.source_filename}</p>}<div className="flex flex-wrap justify-end gap-2">{!row.is_current_draft && <button className={button} onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.set('tab', 'reminders'); next.set('client', row.client_id); if (row.unit_id) next.set('unit', row.unit_id); else next.delete('unit'); next.set('compose', row.period_on.slice(0, 7)); return next; })}>Nhắc khách kỳ này</button>}<button className={button} onClick={() => { setParams(previous => { const next = new URLSearchParams(previous); next.set('tab', 'payments'); next.set('client', row.client_id); if (row.unit_id) next.set('unit', row.unit_id); else next.delete('unit'); next.set('month', row.period_on.slice(0, 7)); return next; }); }}>Xem tiền đã nộp</button>{!row.is_current_draft && <button className={button} onClick={() => void openHistory('period', row)}><History size={14} /> Lịch sử</button>}<button disabled={!canManageBhxh} className={`${button} text-emerald-700`} onClick={() => open('period', row)}><Pencil size={14} /> {row.is_current_draft ? 'Nhập phát sinh' : 'Cập nhật C12'}</button></div></article>)}
      </> : <>
        <section aria-label="Khách đang dùng dịch vụ BHXH" className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-gray-800">Khách đang tham gia BHXH · {participatingClients.length} khách</h3>
          <p className="text-xs text-gray-500">Toàn bộ khách đang dùng dịch vụ BHXH, dùng chung giữa các nhân viên. Số liệu tháng {bhxhMonthLabel(`${overviewMonth}-01`)}.</p>
          <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b text-xs text-gray-500"><th className="p-2">Khách hàng</th><th className="p-2">Phát sinh</th><th className="p-2">Đã nộp</th><th className="p-2">Còn phải đóng</th><th className="p-2">Thao tác</th></tr></thead>{participatingClients.map(client => {
            const units = (client.units || []).filter(unit => (!unitId || unit.id === unitId) && (unit.is_active || allPeriods.some(row => row.unit_id === unit.id && row.period_on.slice(0, 7) === overviewMonth) || data?.payments.some(row => row.unit_id === unit.id && !row.is_void && row.paid_on.slice(0, 7) === overviewMonth)));
            const rows = units.map(unit => ({ unit, period: allPeriods.find(row => row.unit_id === unit.id && row.period_on.slice(0, 7) === overviewMonth), total: (data?.payments || []).filter(row => row.unit_id === unit.id && !row.is_void && row.paid_on.slice(0, 7) === overviewMonth).reduce((sum, row) => sum + row.amount, 0) }));
            const complete = rows.length > 0 && rows.every(row => row.period?.closing_balance != null);
            return <tbody key={client.id} className="border-b"><tr className="bg-gray-50"><td className="p-2 min-w-40 font-medium">{client.name}<span className="block text-xs text-gray-500">MST {client.tax_code} · Tổng các mã</span></td><td className="p-2 whitespace-nowrap">{rows.length && rows.every(row => row.period?.charges != null) ? bhxhMoney(rows.reduce((sum, row) => sum + (row.period?.charges || 0), 0)) : 'Chưa đủ thông tin'}</td><td className="p-2 whitespace-nowrap">{bhxhMoney(rows.reduce((sum, row) => sum + row.total, 0))}</td><td className="p-2 whitespace-nowrap">{complete ? bhxhMoney(rows.reduce((sum, row) => sum + Math.max(row.period?.closing_balance || 0, 0), 0)) : 'Thiếu thông tin'}<span className="block text-xs text-gray-500">Cộng nợ dương, không bù chéo mã</span></td><td /></tr>{rows.map(({ unit, period, total }) => <tr key={unit.id}><td className="p-2 text-xs">{bhxhUnitLabel(unit)}{!unit.is_active && ' (ngừng)'}</td><td className="p-2 whitespace-nowrap">{period?.charges == null ? 'Chưa nhập' : bhxhMoney(period.charges)}</td><td className="p-2 whitespace-nowrap">{bhxhMoney(total)}</td><td className="p-2 whitespace-nowrap">{bhxhMoney(period?.closing_balance ?? null)}</td><td className="p-2"><button className={button} disabled={!canManageBhxh || !unit.is_active || !unit.code} onClick={() => open('payment', undefined, 'save', undefined, client.id, unit.id)}>Ghi tiền nộp</button></td></tr>)}{!units.length && <tr><td colSpan={5} className="p-2 text-sm text-amber-800">Chưa có mã phù hợp. Thiết lập tại tab Mã đơn vị.</td></tr>}</tbody>;
          })}</table></div>
          {data && !participatingClients.length && <p className="text-sm text-gray-500">Chưa có khách đang dùng dịch vụ BHXH trong bộ lọc.</p>}
        </section>
        <p className="text-sm text-gray-500">Ghi từng lần nộp thực tế, kể cả nộp nhiều lần trong tháng hoặc nộp bù. Sổ C12 chỉ đọc tổng từ đây. Phí dịch vụ trả cho công ty không nằm trong sổ này.</p><label className="text-xs text-gray-600 flex gap-2 items-center"><input type="checkbox" checked={showVoided} onChange={event => setShowVoided(event.target.checked)} /> Hiện cả lần nộp đã hủy</label>
        {data && !payments.length ? <p className="p-8 bg-white border border-gray-200 rounded-xl text-center text-sm text-gray-500">Chưa có lần nộp trong bộ lọc này.</p> : payments.map(row => <article key={row.id} className={`bg-white border border-gray-200 rounded-xl p-4 space-y-3 ${row.is_void ? 'opacity-70' : ''}`}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold text-gray-800">{row.client_name}</h3><p className="text-xs text-emerald-800 mt-1">{bhxhUnitKindLabel(row.unit_kind)} · {row.unit_code || 'Chưa có mã'}</p><strong className={row.is_void ? 'line-through text-gray-500' : 'text-emerald-700'}>{bhxhMoney(row.amount)}</strong></div><p className="text-sm text-gray-600">Ngày thực nộp: {recurringDateLabel(row.paid_on)} · Tính vào tháng {bhxhMonthLabel(row.paid_on)}</p>{row.reference && <p className="text-sm text-gray-600 break-words">Chứng từ: {row.reference}</p>}{row.notes && <p className="text-sm whitespace-pre-wrap text-gray-600 break-words">{row.notes}</p>}<p className="text-xs text-gray-500">Người ghi nhận: {row.reporter_name || 'Xem lịch sử'}</p>{row.proof_file ? <button className={`${button} text-blue-700`} onClick={() => setProofView(row.proof_file!)}>Xem bằng chứng đóng tiền</button> : <p className="text-xs text-amber-800">Bản ghi cũ chưa có ảnh bằng chứng. Bổ sung khi cập nhật.</p>}{row.is_void && <p className="text-sm text-red-700">Đã hủy: {row.void_reason}</p>}<div className="flex flex-wrap justify-end gap-2"><button className={button} onClick={() => void openHistory('payment', row)}><History size={14} /> Lịch sử</button>{!row.is_void && <button disabled={!canManageBhxh} className={button} onClick={() => open('payment', row)}><Pencil size={14} /> Sửa lần nộp</button>}<button disabled={!canManageBhxh} className={`${button} ${row.is_void ? 'text-blue-700' : 'text-red-700'}`} onClick={() => open('payment', row, row.is_void ? 'restore' : 'void')}>{row.is_void ? 'Khôi phục lần nộp' : 'Hủy lần nộp'}</button></div></article>)}
      </>}
    </>}
    {form && <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-3"><section role="dialog" aria-modal="true" aria-labelledby="bhxh-form-title" className="bg-white rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4"><header className="flex justify-between gap-2"><h2 id="bhxh-form-title" className="font-bold text-lg">{form.entity === 'period' ? form.draft ? 'Kiểm tra số liệu từ C12' : 'Thông tin kỳ C12' : form.action === 'save' ? 'Ghi nhận lần nộp BHXH' : form.action === 'void' ? 'Hủy lần nộp BHXH' : 'Khôi phục lần nộp BHXH'}</h2><button disabled={saving || proofBusy} aria-label="Đóng biểu mẫu BHXH" onClick={() => setForm(null)}><X size={20} /></button></header><form onSubmit={submit} className="space-y-4"><fieldset disabled={saving || proofBusy} className="space-y-4">
      <label className="block text-sm font-medium">Khách hàng *<ClientSelect aria-label="Khách hàng BHXH" required disabled={form.version > 0} value={form.client_id} onChange={event => chooseFormClient(event.target.value)} className={input}><option value="">Chọn khách hàng</option>{data?.clients.filter(client => (!client.archived && client.participating !== false) || client.id === form.client_id).map(client => <option key={client.id} value={client.id} data-search={client.tax_code}>{client.name}</option>)}</ClientSelect></label>
      <label className="block text-sm font-medium">Mã đơn vị BHXH *<select aria-label="Mã đơn vị BHXH" required disabled={form.version > 0} value={form.unit_id} onChange={event => chooseFormUnit(event.target.value)} className={input}><option value="">Chọn mã đơn vị</option>{formClient?.units?.filter(unit => (unit.is_active && unit.code) || unit.id === form.unit_id).map(unit => <option key={unit.id} value={unit.id}>{bhxhUnitLabel(unit)}{!unit.is_active && ' (ngừng)'}</option>)}</select></label>
      {!formClient?.units?.some(unit => unit.is_active && unit.code) && <p className="text-sm text-amber-900">Thiết lập / bổ sung mã tại tab Mã đơn vị trước khi thêm số liệu.</p>}
      {form.draft && <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm space-y-2"><p className="font-semibold">Bản nháp từ {form.source_filename}</p><p>Mã đơn vị: {form.draft.unitCode || 'Chưa đọc được'} · Kỳ: {form.draft.period ? bhxhMonthLabel(form.draft.period) : 'Chưa đọc được'}</p><p>Đầu kỳ trên C12: {bhxhMoney(form.draft.opening)} · Phát sinh: {bhxhMoney(form.draft.charges)}</p><p>Đã nộp trên C12: {bhxhMoney(form.draft.reportedPaid)} · Cuối kỳ trên C12: {bhxhMoney(form.draft.reportedClosing)}</p><p className="text-xs">Kiểm tra lại với file gốc trước khi lưu. Đã nộp trên C12 chỉ để đối chiếu, không tạo lần nộp trong sổ.</p>{form.draft.warnings.map((warning, index) => <p key={index} className="text-xs text-amber-800">{warning}</p>)}{unitMismatch && <p role="alert" className="text-red-700">Mã trên C12 không trùng mã đơn vị đang chọn.</p>}{form.draft.opening !== null && <button type="button" className={button} onClick={() => update({ manual: true, opening: String(form.draft!.opening), opening_reason: `Đối chiếu đầu kỳ theo ${form.source_filename}` })}>Dùng số đầu kỳ trên C12 (chỉnh riêng)</button>}</div>}
      {form.entity === 'period' ? <>
        <label className="block text-sm font-medium">Kỳ C12 *<input required disabled={form.version > 0} type="month" min="1900-01" max="2200-12" value={form.period} onChange={event => update({ period: event.target.value })} className={input} /></label>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3"><p className="text-sm">Đầu kỳ: <strong>{bhxhMoney(preview?.opening ?? null)}</strong></p><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.manual} onChange={event => update({ manual: event.target.checked })} /> Chỉnh số dư đầu kỳ riêng cho kỳ này</label>{form.manual ? <><label className="block text-sm">Số dư đầu kỳ *<input required inputMode="text" pattern="-?[0-9]{1,15}" maxLength={16} value={form.opening} onChange={event => update({ opening: event.target.value })} className={input} /></label><label className="block text-sm">Lý do / nguồn số đầu kỳ *<input required maxLength={1000} value={form.opening_reason} onChange={event => update({ opening_reason: event.target.value })} placeholder="VD: đối chiếu số dư C12 tháng trước" className={input} /></label></> : <p className="text-xs text-gray-500">Tự lấy cuối tháng liền trước. Nếu chưa có hoặc kỳ trước thiếu thông tin, đầu kỳ và cuối kỳ để “Thiếu thông tin”.</p>}</div>
        <label className="block text-sm font-medium">Phát sinh trong kỳ *<input required inputMode="text" pattern="-?[0-9]{1,15}" maxLength={16} value={form.charges} onChange={event => update({ charges: event.target.value })} className={input} /><span className="text-xs text-gray-500">Nhập tổng dòng B trên C12; có thể cập nhật nhiều lần. Dùng 0 nếu không phát sinh.</span></label>
        <div className="grid sm:grid-cols-2 gap-3"><label className="block text-sm font-medium">Đã nộp trong kỳ (từ Quá trình đóng)<input readOnly value={bhxhMoney(preview?.paid ?? 0)} className={`${input} bg-gray-50`} /></label><label className="block text-sm font-medium">Số dư cuối kỳ (tự tính)<input readOnly value={bhxhMoney(preview?.closing ?? null)} className={`${input} bg-gray-50`} /></label></div>
        {form.draft?.reportedPaid != null && preview && form.draft.reportedPaid !== preview.paid && <p className="text-sm text-amber-900 bg-amber-50 p-3 rounded-lg">Tiền nộp trên C12 khác sổ Quá trình đóng. Kiểm tra / bổ sung các lần nộp tại tab Quá trình đóng; không nhập tổng tiền nộp vào đây.</p>}
        {form.draft?.reportedClosing != null && preview?.closing != null && form.draft.reportedClosing !== preview.closing && <p className="text-sm text-amber-900 bg-amber-50 p-3 rounded-lg">Cuối kỳ tự tính đang lệch số trên C12: {bhxhMoney(preview.closing - form.draft.reportedClosing)}. Kiểm tra đầu kỳ, phát sinh và các lần nộp trước khi lưu.</p>}
      </> : form.action === 'save' ? <><label className="block text-sm font-medium">Ngày thực nộp *<input required type="date" min="1900-01-01" max={today} value={form.paid_on} onChange={event => update({ paid_on: event.target.value, ...(!form.amount_manual ? { amount: bhxhSuggestedAmount(data?.periods || [], form.client_id, event.target.value, form.unit_id) } : {}) })} className={input} /></label><label className="block text-sm font-medium">Số tiền nộp *<input required inputMode="numeric" pattern="[0-9]{1,15}" maxLength={15} value={form.amount} onChange={event => update({ amount: event.target.value, amount_manual: true })} className={input} /></label><div className="text-xs text-gray-600">{paymentSuggestion === '' ? 'Chưa đủ dữ liệu C12 tháng thực nộp để gợi ý số cần đóng. Nhập số tiền thực tế.' : <>Còn phải đóng tháng {bhxhMonthLabel(form.paid_on)}: <strong>{bhxhMoney(Number(paymentSuggestion))}</strong> (đầu kỳ + phát sinh − đã nộp). <button type="button" className="text-blue-700 underline" onClick={() => update({ amount: paymentSuggestion, amount_manual: false })}>Dùng số gợi ý</button></>}{form.version > 0 && ' Khi sửa, giữ số tiền của lần nộp này; số còn phải đóng đã trừ lần nộp hiện tại.'}</div><label className="block text-sm font-medium">Mã chứng từ / giao dịch<input maxLength={500} value={form.reference} onChange={event => update({ reference: event.target.value })} className={input} /><span className="text-xs text-gray-500">Nếu có, nhập để tránh ghi trùng một giao dịch cho cùng khách.</span></label><p className="text-xs text-emerald-800">Tính vào tháng {bhxhMonthLabel(form.paid_on)}, kể cả khoản nộp bù nợ tháng trước. Chỉ ghi tiền khách đã thực nộp cho cơ quan BHXH.</p></> : <p className="bg-gray-50 rounded-lg p-3 text-sm">{bhxhMoney(Number(form.amount))} · Ngày nộp {recurringDateLabel(form.paid_on)}. {form.action === 'void' ? 'Hủy lần nộp sẽ loại khoản này khỏi tổng tiền đã nộp và tính lại các kỳ C12 liên quan.' : 'Khôi phục sẽ cộng lại khoản tiền vào tháng thực nộp.'}</p>}
      {form.entity === 'payment' && form.action !== 'void' && <BhxhProofInput key={form.id} value={form.proof_file} onChange={path => update({ proof_file: path })} onBusy={setProofBusy} />}
      {form.action === 'save' && <label className="block text-sm font-medium">Ghi chú<textarea rows={2} maxLength={5000} value={form.notes} onChange={event => update({ notes: event.target.value })} className={input} /></label>}
      <label className="block text-sm font-medium">{form.action === 'save' ? 'Ghi chú lần cập nhật' : 'Lý do *'}<textarea required={form.action !== 'save'} rows={2} maxLength={5000} value={form.event_note} onChange={event => update({ event_note: event.target.value })} className={input} /></label>
    </fieldset>{formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={saving || proofBusy} className={button} onClick={() => setForm(null)}>Hủy</button><button disabled={saving || proofBusy || unitMismatch || !canManageBhxh} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? 'Đang lưu…' : form.entity === 'period' ? 'Lưu kỳ C12' : form.action === 'save' ? 'Lưu lần nộp' : 'Xác nhận'}</button></div></form></section></div>}
    {history && <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-3"><section role="dialog" aria-modal="true" aria-labelledby="bhxh-history-title" className="bg-white rounded-xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 space-y-4"><header className="flex justify-between gap-2"><h2 id="bhxh-history-title" className="font-bold text-lg">Lịch sử BHXH</h2><button aria-label="Đóng lịch sử BHXH" onClick={() => { setHistory(null); historyToken.current++; }}><X size={20} /></button></header><p className="text-sm text-gray-600">{history.title}</p>{history.error ? <p role="alert" className="text-red-700 text-sm">{history.error}</p> : history.events === null ? <p className="text-sm text-gray-500">Đang tải lịch sử…</p> : history.events.map(event => <article key={event.request_id} className="border-l-2 border-emerald-200 pl-4 space-y-1"><p className="font-semibold text-sm">{event.action === 'void' ? 'Hủy lần nộp' : event.action === 'restore' ? 'Khôi phục lần nộp' : event.entity_type === 'period' ? 'Cập nhật C12' : 'Ghi nhận / sửa lần nộp'}</p><p className="text-xs text-gray-500">{event.actor_name} · {new Date(event.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p><p className="text-sm text-gray-700">{event.entity_type === 'period' ? `Kỳ ${bhxhMonthLabel(event.snapshot.period_on)} · Phát sinh ${bhxhMoney(event.snapshot.charges)} · Đầu kỳ ${event.snapshot.opening_override == null ? 'tự động' : bhxhMoney(event.snapshot.opening_override)}` : `${recurringDateLabel(event.snapshot.paid_on)} · ${bhxhMoney(event.snapshot.amount)} · ${event.snapshot.reference || 'Không có mã chứng từ'}`}</p>{event.snapshot.unit_code && <p className="text-xs text-emerald-800">Mã đơn vị: {event.snapshot.unit_code}</p>}{event.snapshot.proof_file && <button className={`${button} text-blue-700`} onClick={() => setProofView(event.snapshot.proof_file)}>Xem bằng chứng tại lần cập nhật này</button>}{event.snapshot.opening_reason && <p className="text-xs text-gray-600 break-words">Nguồn đầu kỳ: {event.snapshot.opening_reason}</p>}{event.snapshot.notes && <p className="text-xs text-gray-600 whitespace-pre-wrap break-words">{event.snapshot.notes}</p>}{event.note && <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{event.note}</p>}</article>)}</section></div>}
    {proofView && <TaskProofViewer task={{ proof_file: proofView }} onClose={() => setProofView('')} title="Bằng chứng đóng BHXH" imageAlt="Ảnh bằng chứng đóng BHXH" />}
  </div>;
}
