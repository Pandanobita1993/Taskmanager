import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BellRing, CheckCircle2, History, Pencil, Plus, RefreshCw, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { readCachedProfile } from '../lib/profile';
import { recurringDateLabel, vietnamToday } from '../lib/recurringTasks';
import {
  addFollowupDays, PAYMENT_KINDS, PAYMENT_STATUSES, FOLLOWUP_ACTION_LABELS, FOLLOWUP_URGENCY_LABELS,
  followupAmountLabel, followupKindLabel, paymentFollowupUrgency,
} from '../lib/paymentFollowups';
import type { FollowupEvent, FollowupPortal, PaymentAction, PaymentFollowup, PaymentKind } from '../lib/paymentFollowups';

interface FollowupForm {
  id: string; version: number; client_id: string; kind: PaymentKind; period: string; amount: string;
  due_on: string; next_reminder_on: string; promised_on: string; paid_on: string;
  payment_reference: string; notes: string; event_note: string;
}
interface Editor { action: PaymentAction; form: FollowupForm; requestId: string; existing: boolean }
const field = 'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 hover:bg-gray-50';
const errorMessage = (error: { code?: string; message?: string }) => error.code === 'PGRST202'
  ? 'Tính năng đang chờ cài đặt dữ liệu BHXH & thuế ở Supabase. Vui lòng báo quản trị chạy file supabase-payment-followups-migration.sql.'
  : error.message || 'Không thực hiện được. Vui lòng thử lại.';

export default function PaymentFollowups({ scope = 'all', embedded = false }: { scope?: 'all' | 'bhxh' | 'tax'; embedded?: boolean }) {
  const [profile] = useState(readCachedProfile);
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<FollowupPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [historyRow, setHistoryRow] = useState<PaymentFollowup | null>(null);
  const [history, setHistory] = useState<FollowupEvent[] | null>(null);
  const [historyError, setHistoryError] = useState('');
  const historyRequest = useRef(0);
  const fetching = useRef(false);
  const reloadQueued = useRef(false);
  const submitting = useRef(false);
  const today = data?.today || vietnamToday();
  const filter = params.get('filter') || 'open';
  const clientId = params.get('client') || '';
  const allowedKinds = PAYMENT_KINDS.filter(([key]) => scope === 'all' || (scope === 'bhxh' ? key === 'bhxh' : key !== 'bhxh'));
  const Heading = embedded ? 'h2' : 'h1';
  const setFilter = (value: string) => setParams(previous => { const next = new URLSearchParams(previous); next.set('filter', value); return next; });
  const load = useCallback(async (quiet = false) => {
    if (!profile.id) { setError('Hãy thiết lập hồ sơ nhân viên trước.'); setLoading(false); return; }
    if (fetching.current) { reloadQueued.current = true; return; }
    fetching.current = true;
    if (!quiet) setLoading(true);
    try {
      do {
        reloadQueued.current = false;
        const result = await supabase.rpc('payment_followup_portal', { p_staff_id: profile.id });
        if (result.error) throw result.error;
        setData(result.data); setError('');
      } while (reloadQueued.current);
    } catch (cause: any) { setError(errorMessage(cause)); }
    finally { fetching.current = false; setLoading(false); }
  }, [profile.id]);
  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const refresh = () => { if (!document.hidden) void load(true); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);
  useEffect(() => {
    if (!editor && !historyRow) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !submitting.current) { setEditor(null); setHistoryRow(null); historyRequest.current++; } };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [editor, historyRow]);

  function selectClient(value: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (value) next.set('client', value); else next.delete('client');
      return next;
    });
  }

  function openEditor(action: PaymentAction, row?: PaymentFollowup) {
    setFormError(''); setMessage('');
    setEditor({ action, requestId: crypto.randomUUID(), existing: !!row, form: {
      id: row?.id || crypto.randomUUID(), version: row?.version || 0,
      client_id: row?.client_id || (data?.clients.some(c => c.id === clientId && !c.archived) ? clientId : ''),
      kind: row?.kind || (scope === 'tax' ? 'thue_gtgt' : 'bhxh'), period: row?.period || `Tháng ${today.slice(5, 7)}/${today.slice(0, 4)}`,
      amount: row?.amount == null ? '' : String(row.amount), due_on: row?.due_on || '',
      next_reminder_on: action === 'save' ? row?.next_reminder_on || today : action === 'reopen' ? today : addFollowupDays(today, 3),
      promised_on: today, paid_on: today, payment_reference: '', notes: row?.notes || '', event_note: '',
    } });
  }
  function update(patch: Partial<FollowupForm>) {
    // A changed payload is a new request; an unchanged retry keeps its original ID.
    setEditor(previous => previous ? { ...previous, requestId: crypto.randomUUID(), form: { ...previous.form, ...patch } } : null);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!editor || submitting.current || !profile.id) return;
    const { form, action, requestId } = editor;
    setFormError('');
    if (action === 'save' && (!form.client_id || !form.period.trim() || !form.due_on || !form.next_reminder_on)) return setFormError('Điền khách hàng, kỳ, hạn đóng và ngày nhắc.');
    if (action === 'save' && form.amount !== '' && (!/^\d{1,15}$/.test(form.amount))) return setFormError('Số tiền là đồng nguyên, không âm, tối đa 15 chữ số; để trống nếu chưa rõ.');
    if ((action === 'cancel' || action === 'reopen') && !form.event_note.trim()) return setFormError('Nhập lý do để lưu vào lịch sử.');
    submitting.current = true; setSaving(true);
    try {
      const result = await supabase.rpc('save_payment_followup', {
        p_staff_id: profile.id, p_request_id: requestId, p_action: action,
        p_record: { ...form, amount: form.amount === '' ? null : form.amount },
      });
      if (result.error) throw result.error;
      setEditor(null);
      setMessage(action === 'paid' ? 'Đã xác nhận khách đã đóng. Khoản này được lưu vào lịch sử và dừng nhắc.'
        : action === 'notify' ? 'Đã lưu lần nhắc khách và ngày nhắc tiếp theo. Khoản đóng vẫn được theo dõi.' : 'Đã lưu cập nhật.');
      window.dispatchEvent(new Event('taskflow-payment-followups-changed'));
      await load(true);
    } catch (cause: any) { setFormError(errorMessage(cause)); }
    finally { submitting.current = false; setSaving(false); }
  }
  async function openHistory(row: PaymentFollowup) {
    setHistoryRow(row); setHistory(null); setHistoryError('');
    const request = ++historyRequest.current;
    try {
      const result = await supabase.rpc('payment_followup_history', { p_staff_id: profile.id, p_followup_id: row.id });
      if (result.error) throw result.error;
      if (request === historyRequest.current) setHistory(result.data);
    } catch (cause: any) { if (request === historyRequest.current) setHistoryError(errorMessage(cause)); }
  }

  const records = (data?.records || []).filter(row => scope === 'all' || (scope === 'bhxh' ? row.kind === 'bhxh' : row.kind !== 'bhxh'));
  const scoped = records.filter(row => (!clientId || row.client_id === clientId) && (kind === 'all' || row.kind === kind)
    && `${row.client_name} ${row.tax_code} ${row.period}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const isOpen = (row: PaymentFollowup) => row.status !== 'paid' && row.status !== 'cancelled';
  const visible = scoped.filter(row => filter === 'all' || (filter === 'open' ? isOpen(row) : filter === 'attention'
    ? !!paymentFollowupUrgency(row, today) : filter === 'overdue' ? isOpen(row) && row.due_on < today : row.status === filter))
    .sort((a, b) => Number(!!paymentFollowupUrgency(b, today)) - Number(!!paymentFollowupUrgency(a, today)) || a.due_on.localeCompare(b.due_on) || a.client_name.localeCompare(b.client_name, 'vi'));
  const counts = {
    open: scoped.filter(isOpen).length,
    attention: scoped.filter(row => paymentFollowupUrgency(row, today)).length,
    overdue: scoped.filter(row => isOpen(row) && row.due_on < today).length,
    paid: scoped.filter(row => row.status === 'paid').length,
  };
  const form = editor?.form;
  const formClient = data?.clients.find(c => c.id === form?.client_id);
  const terminal = editor?.action === 'paid' || editor?.action === 'cancel';
  return <div className={`${embedded ? '' : 'p-3 sm:p-6 max-w-6xl mx-auto'} space-y-5`}>
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div><Heading className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BellRing className="text-blue-600" /> {scope === 'bhxh' ? 'Nhắc khách đóng BHXH' : scope === 'tax' ? 'Theo dõi thuế' : 'BHXH & thuế'}</Heading><p className="text-sm text-gray-500 mt-1">Báo khách → theo dõi lời hẹn → nhắc lại → xác nhận đã đóng.</p></div>
      <div className="flex gap-2"><button disabled={loading} onClick={() => void load()} className={button}><RefreshCw size={16} /> Làm mới</button><button disabled={!data} onClick={() => openEditor('save')} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"><Plus size={17} /> Thêm khoản theo dõi</button></div>
    </div>
    <p className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">{scope === 'bhxh' ? 'Nhật ký nhắc khách, độc lập với sổ công nợ C12. Xác nhận “Đã đóng” ở đây không tạo số tiền nộp; hãy ghi số thực nộp tại Quá trình đóng.' : 'Theo dõi khoản khách phải đóng thuế cho cơ quan. Bạn tự nhập kỳ và hạn đóng theo hồ sơ thực tế. Nhắc việc hiển thị trong ứng dụng; thao tác “Đã báo” ghi nhận lần bạn liên hệ khách.'}</p>
    {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</p>}
    {message && <p role="status" className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-sm">{message}</p>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{([
      ['open', 'Còn chờ đóng', 'text-gray-800'], ['attention', 'Cần kiểm tra / nhắc', 'text-amber-700'],
      ['overdue', 'Quá hạn đóng', 'text-red-700'], ['paid', 'Đã đóng', 'text-green-700'],
    ] as const).map(([key, label, color]) => <button key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={`text-left p-4 rounded-xl bg-white border shadow-sm ${filter === key ? 'border-blue-500 ring-1 ring-blue-300' : 'border-gray-200'}`}><span className="block text-xs text-gray-500">{label}</span><strong className={`block text-2xl mt-1 ${color}`}>{data ? counts[key] : '—'}</strong></button>)}</div>
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3">
      <label className="flex-1 min-w-44 text-xs text-gray-600">Tìm khách / kỳ<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tên khách, MST, tháng / quý…" className={field} /></label>
      <label className="text-xs text-gray-600 flex-1 min-w-44">Khách hàng<select value={clientId} onChange={event => selectClient(event.target.value)} className={field}><option value="">Tất cả khách phụ trách</option>{data?.clients.map(client => <option key={client.id} value={client.id}>{client.name}{client.archived ? ' (đã lưu trữ)' : ''}</option>)}</select></label>
      <label className="text-xs text-gray-600">Khoản đóng<select value={kind} onChange={event => setKind(event.target.value)} className={field}><option value="all">Tất cả loại</option>{allowedKinds.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-xs text-gray-600">Trạng thái<select aria-label="Trạng thái" value={filter} onChange={event => setFilter(event.target.value)} className={field}><option value="open">Còn chờ đóng</option><option value="attention">Cần kiểm tra / nhắc</option><option value="overdue">Quá hạn đóng</option><option value="pending">Chưa báo khách</option><option value="notified">Đã báo · chờ đóng</option><option value="promised">Khách hẹn đóng</option><option value="paid">Đã đóng</option><option value="cancelled">Ngừng theo dõi</option><option value="all">Tất cả</option></select></label>
    </div>
    <p className="text-xs text-gray-500">{visible.length} khoản trong bộ lọc · Ngày {recurringDateLabel(today)} (giờ Việt Nam). Khoản đến hạn trong 3 ngày luôn hiện ở mục cần kiểm tra.</p>
    {loading && !data ? <p className="text-sm text-gray-500">Đang tải khoản theo dõi…</p> : data && !visible.length ? <div className="bg-white border rounded-xl p-10 text-center text-gray-500 text-sm">Chưa có khoản phù hợp. Thêm khoản theo dõi cho khách hoặc đổi bộ lọc.</div> : visible.map(row => {
      const urgency = paymentFollowupUrgency(row, today);
      const contact = data?.clients.find(c => c.id === row.client_id);
      return <article key={row.id} className={`bg-white rounded-xl border p-4 sm:p-5 space-y-3 shadow-sm ${urgency === 'overdue' ? 'border-red-300' : urgency ? 'border-amber-300' : 'border-gray-200'}`}>
        <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-bold text-gray-800 break-words">{row.client_name}</h2><p className="text-xs text-gray-500 mt-1">MST {row.tax_code}{row.client_archived && ' · Khách đã lưu trữ'}</p></div><div className="flex flex-wrap gap-2 items-start"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${row.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{PAYMENT_STATUSES[row.status]}</span>{urgency && <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${urgency === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{FOLLOWUP_URGENCY_LABELS[urgency]}</span>}</div></div>
        <div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold text-blue-800">{followupKindLabel(row.kind)} · {row.period}</p><p className="text-sm font-semibold text-gray-800">{followupAmountLabel(row.amount)}</p></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3"><p>Hạn đóng: <strong className={urgency === 'overdue' ? 'text-red-700' : ''}>{recurringDateLabel(row.due_on)}</strong></p><p>Nhắc tiếp: <strong>{recurringDateLabel(row.next_reminder_on || undefined)}</strong></p><p>Khách hẹn: <strong>{recurringDateLabel(row.promised_on || undefined)}</strong></p><p>{row.status === 'paid' ? <>Ngày đã đóng: <strong>{recurringDateLabel(row.paid_on || undefined)}</strong></> : <>Đã báo / nhắc: <strong>{row.notification_count} lần</strong>{row.last_notified_at && ` · ${new Date(row.last_notified_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`}</>}</p></div>
        {(contact?.contact_name || contact?.contact_phone) && <p className="text-xs text-gray-500">Liên hệ: {[contact.contact_name, contact.contact_phone].filter(Boolean).join(' · ')}</p>}
        {row.notes && <p className="whitespace-pre-wrap text-sm text-gray-600 break-words">{row.notes}</p>}
        {row.payment_reference && <p className="text-xs text-green-800 break-words">Chứng từ / tham chiếu: {row.payment_reference}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-3"><button onClick={() => void openHistory(row)} className={button}><History size={14} /> Lịch sử</button>{isOpen(row) ? <>
          <button onClick={() => openEditor('save', row)} className={button}><Pencil size={14} /> Sửa</button>
          <button onClick={() => openEditor('cancel', row)} className={`${button} text-gray-500`}>Ngừng theo dõi</button>
          <button onClick={() => openEditor('notify', row)} className={`${button} text-blue-700 border-blue-200`}><BellRing size={14} /> Đã báo / nhắc khách</button>
          <button onClick={() => openEditor('promise', row)} className={`${button} text-amber-800 border-amber-200`}>Khách hẹn đóng</button>
          <button onClick={() => openEditor('paid', row)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700"><CheckCircle2 size={14} /> Xác nhận đã đóng</button>
        </> : <button onClick={() => openEditor('reopen', row)} className={`${button} text-blue-700`}>Mở lại theo dõi</button>}</div>
      </article>;
    })}
    {editor && form && <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-3"><section role="dialog" aria-modal="true" aria-labelledby="followup-form-title" className="bg-white rounded-xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6">
      <div className="flex justify-between items-center gap-2 mb-4"><h2 id="followup-form-title" className="font-bold text-lg">{editor.action === 'save' ? editor.existing ? 'Sửa khoản theo dõi' : 'Thêm khoản theo dõi' : FOLLOWUP_ACTION_LABELS[editor.action]}</h2><button disabled={saving} aria-label="Đóng biểu mẫu" onClick={() => setEditor(null)}><X size={20} /></button></div>
      <form onSubmit={submit} className="space-y-4"><fieldset disabled={saving} className="space-y-4">
        {editor.action === 'save' ? <>
          <label className="block text-sm font-medium">Khách hàng *<select required disabled={editor.existing} value={form.client_id} onChange={event => update({ client_id: event.target.value })} className={field}><option value="">Chọn khách hàng</option>{data?.clients.filter(client => !client.archived || client.id === form.client_id).map(client => <option key={client.id} value={client.id}>{client.name} · {client.tax_code}</option>)}</select></label>
          <div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm font-medium">Loại khoản đóng *<select value={form.kind} onChange={event => update({ kind: event.target.value as PaymentKind })} className={field}>{allowedKinds.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="block text-sm font-medium">Kỳ cần đóng *<input required maxLength={100} value={form.period} onChange={event => update({ period: event.target.value })} placeholder="Tháng 10/2026 hoặc Quý 4/2026" className={field} /></label></div>
          <label className="block text-sm font-medium">Số tiền cần đóng (đồng)<input inputMode="numeric" pattern="[0-9]{1,15}" maxLength={15} value={form.amount} onChange={event => update({ amount: event.target.value })} placeholder="Để trống nếu chưa xác định" className={field} /></label>
          <label className="block text-sm font-medium">Hạn đóng *<input required type="date" value={form.due_on} onChange={event => update({ due_on: event.target.value })} className={field} /></label>
        </> : <p className="bg-gray-50 rounded-lg p-3 text-sm"><strong>{formClient?.name}</strong><br />{followupKindLabel(form.kind)} · {form.period}<br />Hạn đóng: {recurringDateLabel(form.due_on)}</p>}
        {!terminal && <label className="block text-sm font-medium">{editor.action === 'save' ? 'Ngày cần nhắc / kiểm tra *' : 'Ngày nhắc tiếp theo *'}<input required type="date" min={editor.action === 'save' ? undefined : today} value={form.next_reminder_on} onChange={event => update({ next_reminder_on: event.target.value })} className={field} /></label>}
        {editor.action === 'notify' && <p className="bg-blue-50 p-3 rounded-lg text-xs text-blue-900">Ghi nhận bạn đã liên hệ khách và đặt lần kiểm tra tiếp. Hệ thống tiếp tục nhắc cho đến khi xác nhận đã đóng hoặc ngừng theo dõi.</p>}
        {editor.action === 'promise' && <label className="block text-sm font-medium">Khách hẹn đóng ngày *<input required type="date" min={today} value={form.promised_on} onChange={event => update({ promised_on: event.target.value, next_reminder_on: event.target.value })} className={field} /></label>}
        {editor.action === 'paid' && <><label className="block text-sm font-medium">Ngày thực tế đã đóng *<input required type="date" max={today} value={form.paid_on} onChange={event => update({ paid_on: event.target.value })} className={field} /></label><label className="block text-sm font-medium">Mã chứng từ / thông tin xác nhận<input maxLength={500} value={form.payment_reference} onChange={event => update({ payment_reference: event.target.value })} placeholder="VD: mã giao dịch, khách gửi xác nhận…" className={field} /></label><p className="text-xs text-green-800 bg-green-50 p-3 rounded-lg">Xác nhận đã đóng sẽ dừng nhắc khoản này. Chỉ lưu khi đã kiểm tra được kết quả đóng của khách.</p></>}
        {editor.action === 'save' && <label className="block text-sm font-medium">Ghi chú khoản đóng<textarea rows={3} maxLength={5000} value={form.notes} onChange={event => update({ notes: event.target.value })} className={field} /></label>}
        <label className="block text-sm font-medium">{editor.action === 'cancel' || editor.action === 'reopen' ? 'Lý do *' : 'Ghi chú lần cập nhật'}<textarea required={editor.action === 'cancel' || editor.action === 'reopen'} rows={2} maxLength={5000} value={form.event_note} onChange={event => update({ event_note: event.target.value })} placeholder="VD: đã nhắn Zalo, khách báo sẽ chuyển ngày…" className={field} /></label>
      </fieldset>{formError && <p role="alert" className="text-sm text-red-700 whitespace-pre-wrap">{formError}</p>}<div className="flex justify-end gap-3"><button disabled={saving} type="button" onClick={() => setEditor(null)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Hủy</button><button disabled={saving} className={`px-4 py-2 text-white rounded-lg text-sm font-semibold disabled:opacity-50 ${editor.action === 'paid' ? 'bg-green-600' : 'bg-blue-600'}`}>{saving ? 'Đang lưu…' : editor.action === 'paid' ? 'Xác nhận đã đóng' : 'Lưu theo dõi'}</button></div></form>
    </section></div>}
    {historyRow && <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-3"><section role="dialog" aria-modal="true" aria-labelledby="followup-history-title" className="bg-white rounded-xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 space-y-4"><div className="flex justify-between gap-2"><h2 id="followup-history-title" className="font-bold text-lg">Lịch sử theo dõi</h2><button aria-label="Đóng lịch sử" onClick={() => { setHistoryRow(null); historyRequest.current++; }}><X size={20} /></button></div><p className="text-sm text-gray-600">{historyRow.client_name} · {followupKindLabel(historyRow.kind)} · {historyRow.period}</p>
      {historyError ? <p role="alert" className="text-red-700 text-sm">{historyError}</p> : history === null ? <p className="text-sm text-gray-500">Đang tải lịch sử…</p> : history.map(event => <article key={event.id} className="border-l-2 border-blue-200 pl-4 space-y-1"><h3 className="text-sm font-semibold text-gray-800">{FOLLOWUP_ACTION_LABELS[event.action]}</h3><p className="text-xs text-gray-500">{event.actor_name} · {new Date(event.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p><p className="text-xs text-gray-600">{followupKindLabel(event.snapshot.kind)} · {event.snapshot.period} · {followupAmountLabel(event.snapshot.amount)}<br />Hạn {recurringDateLabel(event.snapshot.due_on)} · {PAYMENT_STATUSES[event.snapshot.status]}{event.snapshot.next_reminder_on && ` · Nhắc ${recurringDateLabel(event.snapshot.next_reminder_on)}`}{event.snapshot.promised_on && ` · Hẹn ${recurringDateLabel(event.snapshot.promised_on)}`}{event.snapshot.paid_on && ` · Đã đóng ${recurringDateLabel(event.snapshot.paid_on)}`}</p>{event.snapshot.payment_reference && <p className="text-xs text-green-800 break-words">Chứng từ: {event.snapshot.payment_reference}</p>}{event.note && <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{event.note}</p>}{event.action === 'save' && event.snapshot.notes && <p className="text-xs text-gray-500 whitespace-pre-wrap break-words">{event.snapshot.notes}</p>}</article>)}
    </section></div>}
  </div>;
}
