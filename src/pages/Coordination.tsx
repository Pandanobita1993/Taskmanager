import ClientSelect from '../components/ClientSelect';
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Bell, Plus, RefreshCw, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { readCachedProfile } from '../lib/profile';

const STATUS: Record<string, string> = { submitted: 'Chờ quản lý kiểm tra', in_review: 'Đang kiểm tra', needs_changes: 'Cần bổ sung', approved: 'Đã duyệt' };
const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
const day = (value?: string) => value ? new Date(value.length === 10 ? value + 'T00:00:00+07:00' : value).toLocaleDateString('vi-VN') : '—';
const emptyForm = { id: '', client_id: '', title: '', details: '', period: '', due_date: '', report_url: '' };
function safeUrl(value: string) { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } }

export default function Coordination() {
  const [profile] = useState(readCachedProfile);
  const [data, setData] = useState<any>(null);
  const [reported, setReported] = useState<any[]>([]);
  const [tab, setTab] = useState<'requests' | 'debt'>('requests');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!profile.id) { setError('Vui lòng thiết lập hồ sơ nhân viên trước.'); setLoading(false); return; }
    try {
      const { data: result, error: rpcError } = await supabase.rpc('staff_management_portal', { p_staff_id: profile.id });
      if (rpcError) throw rpcError;
      setData(result);
      const ids = result.clients.map((c: any) => c.id);
      if (ids.length) {
        const { data: payments, error: paymentError } = await supabase.from('tasks').select('id,client_id,content,paid_months,created_at').eq('type', 'payment').in('client_id', ids).order('created_at', { ascending: false });
        if (paymentError) throw paymentError;
        setReported(payments || []);
      } else setReported([]);
      setError('');
    } catch (cause: any) { setError(cause.code === 'PGRST202' ? 'Phần điều hành chưa được thiết lập trong cơ sở dữ liệu. Vui lòng báo quản trị.' : cause.message || 'Không thể tải dữ liệu.'); }
    finally { setLoading(false); }
  }, [profile.id]);
  useEffect(() => { void load(); const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 60000); return () => window.clearInterval(timer); }, [load]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!form || saving) return;
    setSaving(true); setError('');
    try {
      const { error: saveError } = await supabase.rpc('staff_submit_review', { p_staff_id: profile.id, p_request: form });
      if (saveError) throw saveError;
      setForm(null); setMessage('Đã gửi yêu cầu cho quản lý số liệu và cập nhật sang giao diện giám đốc.'); await load();
    } catch (cause: any) { setError(cause.message || 'Không thể gửi yêu cầu.'); }
    finally { setSaving(false); }
  };
  const update = (key: keyof typeof emptyForm, value: string) => setForm(current => current && ({ ...current, [key]: value }));
  const clientName = (id: string) => data?.clients.find((c: any) => c.id === id)?.name || 'Khách hàng';
  const needsChanges = data?.requests.filter((r: any) => r.status === 'needs_changes').length || 0;
  const card = 'bg-white rounded-xl border border-gray-200 p-5 shadow-sm';
  const field = 'w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm';
  return <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
    <div className="flex flex-wrap justify-between gap-3 items-center"><div><h1 className="text-2xl font-bold text-gray-800">Công nợ & yêu cầu xét duyệt</h1><p className="text-sm text-gray-500 mt-1">Theo dõi xác nhận thanh toán và gửi số liệu để quản lý kiểm tra.</p></div><button onClick={() => void load()} className="inline-flex gap-2 items-center bg-white border rounded-lg px-3 py-2 text-sm"><RefreshCw size={16} /> Làm mới</button></div>
    <div className="flex flex-wrap gap-2"><button onClick={() => setTab('requests')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'requests' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Yêu cầu xét duyệt {needsChanges > 0 && `· ${needsChanges} cần bổ sung`}</button><button onClick={() => setTab('debt')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'debt' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Công nợ & xác nhận của sếp</button></div>
    {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</p>}
    {message && <p role="status" className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm">{message}</p>}
    {loading ? <p className="text-sm text-gray-500">Đang tải…</p> : data && <>
      {tab === 'requests' ? <>
        {needsChanges > 0 && <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 flex gap-2 text-sm"><Bell size={18} /> Bạn có {needsChanges} yêu cầu cần bổ sung theo nhận xét của quản lý.</div>}
        <div className="flex justify-end"><button onClick={() => { setError(''); setForm({ ...emptyForm }); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Plus size={16} /> Gửi yêu cầu kiểm tra số liệu</button></div>
        {!data.requests.length && <div className={`${card} text-center text-gray-500 text-sm`}>Bạn chưa gửi yêu cầu kiểm tra số liệu nào.</div>}
        {data.requests.map((r: any) => <article key={r.id} className={`${card} space-y-3`}><div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-bold text-gray-800">{r.title}</h2><p className="text-xs text-gray-500 mt-1">{clientName(r.client_id)} · {r.period || 'Chưa ghi kỳ'} · Bản {r.revision}</p></div><span className={`text-xs font-semibold rounded-full px-3 py-1 h-fit ${r.status === 'approved' ? 'bg-green-50 text-green-700' : r.status === 'needs_changes' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>{STATUS[r.status]}</span></div><p className="text-sm whitespace-pre-wrap text-gray-700">{r.details}</p><p className="text-xs text-gray-500">Văn phòng {r.office} · Gửi ngày {day(r.created_at)} · Hạn kiểm tra {day(r.due_date)}</p>{safeUrl(r.report_url) && <a href={safeUrl(r.report_url)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 underline">Mở tài liệu đã gửi ↗</a>}{r.reviewer_note && <div className="bg-amber-50 p-3 border-l-4 border-amber-300 text-sm whitespace-pre-wrap"><strong>{r.reviewer_name}: </strong>{r.reviewer_note}</div>}{r.status === 'needs_changes' && <button onClick={() => { setError(''); setForm({ id: r.id, client_id: r.client_id, title: r.title, details: r.details, period: r.period, due_date: r.due_date || '', report_url: r.report_url }); }} className="text-sm font-semibold text-blue-700 border border-blue-200 rounded-lg px-3 py-2">Bổ sung & gửi lại</button>}<details className="text-xs text-gray-500"><summary className="cursor-pointer">Lịch sử xét duyệt</summary><ul className="mt-2 space-y-2">{data.history.filter((h: any) => h.request_id === r.id).map((h: any) => <li key={h.id}>{day(h.created_at)} · {h.actor_name} · {STATUS[h.action] || h.action} · Bản {h.revision}{h.snapshot?.reviewer_note && <p className="mt-1 whitespace-pre-wrap">{h.snapshot.reviewer_note}</p>}</li>)}</ul></details></article>)}
      </> : <>
        <p className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">Khách báo đã chuyển tiền chưa được tính là đã thu. Chỉ số tiền thực nhận được sếp xác nhận mới giảm công nợ. Khách hàng chưa nhập công nợ được ghi rõ, không mặc định là đã thanh toán đủ.</p>
        <div className="grid md:grid-cols-2 gap-4">{data.clients.map((c: any) => { const debts = data.receivables.filter((r: any) => r.client_id === c.id); const remaining = debts.reduce((sum: number, r: any) => sum + Math.max(0, Number(r.amount) - Number(r.paid)), 0); const payments = data.payments.filter((p: any) => !p.is_void && debts.some((r: any) => r.id === p.receivable_id)); const reports = reported.filter(t => t.client_id === c.id); return <article key={c.id} className={`${card} space-y-3`}><h2 className="text-sm font-bold text-gray-800">{c.name}</h2><p className="text-xs text-gray-500">MST {c.tax_code}</p><p className={`text-lg font-bold ${remaining > 0 ? 'text-rose-700' : 'text-green-700'}`}>{debts.length ? `Còn thiếu: ${money(remaining)}` : 'Chưa nhập công nợ'}</p>{debts.map((r: any) => <div key={r.id} className="text-xs border-t pt-2 flex justify-between gap-2"><span>{r.description}<small className="block text-gray-500">Hạn {day(r.due_date)}</small></span><strong>{money(Math.max(0, Number(r.amount) - Number(r.paid)))}</strong></div>)}{payments.length > 0 && <details className="text-xs text-gray-600"><summary className="cursor-pointer font-semibold">Tiền sếp đã xác nhận ({payments.length})</summary><ul className="mt-2 space-y-2">{payments.map((p: any) => <li key={p.id}>{day(p.payment_date)} · <strong>{money(Number(p.amount))}</strong> · {p.confirmed_by}{p.note && <p className="whitespace-pre-wrap mt-1">{p.note}</p>}</li>)}</ul></details>}{reports.map(t => { const pc = data.payment_checks.find((x: any) => x.task_id === t.id); return <div key={t.id} className="text-xs border-t pt-2 space-y-1"><p className="font-medium">{t.content}</p><p className={pc?.status === 'confirmed' ? 'text-green-700' : 'text-amber-700'}>{pc ? pc.status === 'confirmed' ? 'Sếp đã xác nhận nhận tiền' : 'Sếp chưa ghi nhận tiền' : 'Chờ sếp xác nhận thanh toán'}</p>{pc && <p className="text-gray-500">{pc.checked_by} · {pc.note || 'Không có ghi chú'}</p>}</div>; })}</article>; })}</div>
      </>}
    </>}
    {form && <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"><section role="dialog" aria-modal="true" aria-labelledby="request-form-title" className="bg-white rounded-xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-4"><h2 id="request-form-title" className="font-bold text-lg">{form.id ? 'Bổ sung & gửi lại yêu cầu' : 'Gửi yêu cầu kiểm tra số liệu'}</h2><button disabled={saving} aria-label="Đóng yêu cầu" onClick={() => setForm(null)}><X size={20} /></button></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium">Khách hàng *<ClientSelect disabled={!!form.id} required value={form.client_id} onChange={event => update('client_id', event.target.value)} className={field}><option value="">Chọn khách hàng</option>{data.clients.map((c: any) => <option key={c.id} value={c.id} data-search={c.tax_code}>{c.name}</option>)}</ClientSelect></label><label className="block text-sm font-medium">Tên yêu cầu *<input required value={form.title} onChange={event => update('title', event.target.value)} placeholder="VD: Kiểm tra số liệu thuế GTGT quý III" className={field} /></label><div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm font-medium">Kỳ báo cáo<input value={form.period} onChange={event => update('period', event.target.value)} placeholder="VD: Quý III/2026" className={field} /></label><label className="block text-sm font-medium">Hạn cần kiểm tra<input type="date" value={form.due_date} onChange={event => update('due_date', event.target.value)} className={field} /></label></div><label className="block text-sm font-medium">Nội dung cần kiểm tra<textarea rows={4} value={form.details} onChange={event => update('details', event.target.value)} className={field} /></label><label className="block text-sm font-medium">Link tài liệu / bảng số liệu<input type="url" pattern="https://.*" value={form.report_url} onChange={event => update('report_url', event.target.value)} placeholder="https://… (Drive, Sheets hoặc tài liệu đã chia sẻ)" className={field} /></label><p className="text-xs text-gray-500">Gửi đến quản lý số liệu văn phòng {profile.office || 'Cần Thơ'}. Giám đốc cũng theo dõi được tiến độ yêu cầu. Nhớ cấp quyền xem tài liệu cho người kiểm tra.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button disabled={saving} type="button" onClick={() => setForm(null)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Hủy</button><button disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? 'Đang gửi…' : 'Gửi quản lý kiểm tra'}</button></div></form></section></div>}
  </div>;
}
