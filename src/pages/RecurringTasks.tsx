import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Plus, Pencil, Pause, Play, RefreshCw, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { readCachedProfile } from '../lib/profile';
import { nextRecurringDate, recurringDateLabel, recurringScheduleLabel, renderRecurringContent, vietnamToday, WEEK_DAYS, RECURRING_DOMAINS } from '../lib/recurringTasks';
import type { RecurringSchedule } from '../lib/recurringTasks';

interface RecurringForm extends RecurringSchedule {
  id: string; request_id: string; content: string; notes: string; action_type: string; client_ids: string[];
}

export default function RecurringTasks() {
  const [profile] = useState(readCachedProfile);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<RecurringForm | null>(null);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const today = data?.today || vietnamToday();

  const load = useCallback(async () => {
    if (!profile.id) { setError('Hãy thiết lập hồ sơ nhân viên trước.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const synced = await supabase.rpc('sync_my_recurring_tasks', { p_staff_id: profile.id });
      if (synced.error) throw synced.error;
      const result = await supabase.rpc('recurring_tasks_portal', { p_staff_id: profile.id });
      if (result.error) throw result.error;
      setData(result.data);
      if (synced.data?.failed_count) setError('Có lịch chưa tạo được việc. Xem thông báo tại từng lịch bên dưới.');
    } catch (err: any) {
      setError(err.code === 'PGRST202' ? 'Tính năng đang chờ cài phần lịch tự động ở Supabase. Vui lòng liên hệ người quản trị.' : err.message || 'Không tải được lịch. Vui lòng thử lại.');
    } finally { setLoading(false); }
  }, [profile.id]);
  useEffect(() => { void load(); }, [load]);

  function newForm() {
    setSearch(''); setFormError(''); setMessage('');
    setForm({ id: '', request_id: crypto.randomUUID(), client_ids: [], action_type: 'bhxh',
      content: 'Nhắc khách đóng phí BHXH tháng {{thang}}/{{nam}}', notes: '', frequency: 'monthly', month_day: 5, week_day: 1, start_on: today, end_on: '' });
  }
  function edit(row: any) {
    setSearch(''); setFormError(''); setMessage('');
    setForm({ id: row.id, request_id: row.request_id, client_ids: [row.client_id], action_type: row.action_type,
      content: row.content, notes: row.notes, frequency: row.frequency, month_day: row.month_day || 5, week_day: row.week_day || 1, start_on: row.start_on, end_on: row.end_on || '' });
  }
  function update(patch: Partial<RecurringForm>) {
    setForm(previous => previous ? { ...previous, ...patch, request_id: previous.id ? previous.request_id : crypto.randomUUID() } : null);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form || saving) return;
    setFormError('');
    if (!form.client_ids.length) return setFormError('Chọn ít nhất một khách hàng.');
    if (!form.content.trim()) return setFormError('Nhập nội dung công việc.');
    if (!nextRecurringDate(form, today) && !form.id) return setFormError('Chưa có ngày tạo việc trong khoảng bắt đầu / kết thúc đã chọn.');
    setSaving(true);
    try {
      const { data: result, error: saveError } = await supabase.rpc('save_recurring_tasks', {
        p_staff_id: profile.id, p_client_ids: form.client_ids,
        p_template: { ...form, client_ids: undefined, month_day: form.frequency === 'monthly' ? form.month_day : null, week_day: form.frequency === 'weekly' ? form.week_day : null },
      });
      if (saveError) throw saveError;
      setForm(null);
      setMessage(`Đã lưu lịch cho ${result.ids.length} khách hàng.${result.generation?.created_count ? ` Đã tạo ${result.generation.created_count} công việc đến lịch.` : ''}`);
      await load();
    } catch (err: any) { setFormError(err.message || 'Chưa lưu được lịch. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  }
  async function toggle(row: any) {
    if (saving) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await supabase.rpc('set_recurring_task_active', { p_staff_id: profile.id, p_template_id: row.id, p_active: !row.is_active });
      if (result.error) throw result.error;
      setMessage(row.is_active ? 'Đã tạm dừng lịch. Các công việc đã tạo vẫn được giữ lại.' : 'Đã tiếp tục lịch từ hôm nay; không tạo bù các kỳ đã tạm dừng.');
      await load();
    } catch (err: any) { setError(err.message || 'Chưa cập nhật được lịch.'); }
    finally { setSaving(false); }
  }

  const clients = data?.clients || [];
  const visibleClients = clients.filter((c: any) => `${c.name} ${c.tax_code}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const templates = [...(data?.templates || [])].sort((a: any, b: any) => b.created_at.localeCompare(a.created_at) || a.client_name.localeCompare(b.client_name, 'vi') || a.id.localeCompare(b.id));
  const visible = templates.filter((row: any) => filter === 'all' || (filter === 'active' ? row.is_active : !row.is_active));
  const existing = form?.id ? templates.find((row: any) => row.id === form.id) : null;
  const sameSchedule = existing && form && existing.frequency === form.frequency && existing.start_on === form.start_on
    && (form.frequency !== 'monthly' || existing.month_day === form.month_day)
    && (form.frequency !== 'weekly' || existing.week_day === form.week_day);
  const next = form ? sameSchedule ? (!form.end_on || existing.next_run_on <= form.end_on ? existing.next_run_on : null) : nextRecurringDate(form, today) : null;
  const field = 'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white';
  return <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><CalendarClock className="text-blue-600" /> Công việc định kỳ</h1><p className="text-sm text-gray-500 mt-1">Thiết lập một lần, tự có việc cần làm khi đến lịch cho từng khách hàng.</p></div>
      <div className="flex gap-2"><button disabled={loading || saving} onClick={() => void load()} className="bg-white border rounded-lg px-3 py-2 text-sm flex items-center gap-2 disabled:opacity-50"><RefreshCw size={16} /> Làm mới</button><button disabled={!data || saving} onClick={newForm} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><Plus size={17} /> Tạo lịch định kỳ</button></div>
    </div>
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 space-y-1"><p>Ví dụ: chọn ngày 5 hằng tháng → mỗi khách được chọn sẽ có một việc nhắc đóng phí BHXH riêng trên <Link to="/" className="underline font-semibold">Bảng điều khiển</Link>.</p><p>Lịch tính theo giờ Việt Nam. Mỗi kỳ tạo một việc; hoàn thành việc kỳ này không làm mất lịch kỳ sau.</p></div>
    {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</p>}
    {message && <p role="status" className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-sm">{message}</p>}
    {data && !data.scheduler_ready && <p role="alert" className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-sm">Lịch chạy nền chưa được bật ở Supabase. Hiện hệ thống chỉ kiểm tra lịch khi bạn mở web; hãy liên hệ người quản trị để bật tự động.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-gray-600">{profile.fullName} · {templates.length} lịch đã thiết lập</p><label className="text-sm">Hiển thị <select value={filter} onChange={e => setFilter(e.target.value)} className="border rounded-lg px-2 py-1.5 ml-2 bg-white"><option value="all">Tất cả lịch</option><option value="active">Đang bật</option><option value="paused">Đã tạm dừng</option></select></label></div>
    {loading ? <p className="text-gray-500 text-sm">Đang kiểm tra lịch…</p> : data && !visible.length ? <div className="bg-white border rounded-xl p-8 text-center text-gray-500">Chưa có lịch trong danh sách này.</div> : visible.map((row: any) => {
      const ended = row.end_on && row.next_run_on > row.end_on;
      const status = row.client_archived ? 'Khách đã lưu trữ' : ended ? 'Đã kết thúc' : row.is_active ? 'Đang bật' : 'Tạm dừng';
      return <article key={row.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
        <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-bold text-gray-800">{row.client_name}</h2><p className="text-xs text-blue-700 font-semibold mt-1">{recurringScheduleLabel(row)} · {RECURRING_DOMAINS.find(([key]) => key === row.action_type)?.[1]}</p></div><span className={`rounded-full px-3 py-1 h-fit text-xs font-semibold ${status === 'Đang bật' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{status}</span></div>
        <p className="text-sm whitespace-pre-wrap text-gray-800">{row.content}</p>
        {row.notes && <p className="text-xs text-gray-500 whitespace-pre-wrap">Ghi chú: {row.notes}</p>}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500"><span>Từ {recurringDateLabel(row.start_on)}{row.end_on ? ` đến ${recurringDateLabel(row.end_on)}` : ' · Không giới hạn ngày kết thúc'}</span><span>Đã tạo {row.generated_count} việc</span><span>Lần tạo tiếp: {row.is_active && !ended && !row.client_archived ? recurringDateLabel(row.next_run_on) : '—'}</span></div>
        {row.last_error && <p role="alert" className="text-xs text-red-700 bg-red-50 p-2 rounded-lg">{row.last_error}</p>}
        <div className="flex flex-wrap gap-2 justify-end"><button disabled={saving || row.client_archived} onClick={() => edit(row)} className="border rounded-lg px-3 py-2 text-xs font-semibold text-blue-700 flex gap-1.5 items-center disabled:opacity-50"><Pencil size={14} /> Chỉnh sửa lịch</button><button disabled={saving || (!row.is_active && (ended || row.client_archived))} onClick={() => void toggle(row)} className="border rounded-lg px-3 py-2 text-xs font-semibold flex gap-1.5 items-center disabled:opacity-50">{row.is_active ? <Pause size={14} /> : <Play size={14} />}{row.is_active ? 'Tạm dừng' : 'Tiếp tục'}</button></div>
      </article>;
    })}
    {form && <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-3 sm:p-5"><section role="dialog" aria-modal="true" aria-labelledby="recurring-form-title" className="bg-white rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6">
      <div className="flex justify-between items-center gap-2 mb-4"><h2 id="recurring-form-title" className="font-bold text-lg">{form.id ? 'Chỉnh sửa lịch định kỳ' : 'Tạo lịch công việc định kỳ'}</h2><button disabled={saving} type="button" aria-label="Đóng thiết lập lịch" onClick={() => setForm(null)}><X size={20} /></button></div>
      <form onSubmit={submit} className="space-y-4"><fieldset disabled={saving} className="space-y-4">
        {form.id ? <p className="bg-gray-50 p-3 rounded-lg text-sm font-semibold">{templates.find((row: any) => row.id === form.id)?.client_name}</p> : <fieldset className="space-y-2"><legend className="text-sm font-semibold">Khách hàng áp dụng *</legend><input aria-label="Tìm khách để tạo lịch" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên khách hoặc mã số thuế" className={field} /><div className="flex flex-wrap gap-3 text-xs"><button type="button" onClick={() => update({ client_ids: [...new Set([...form.client_ids, ...visibleClients.map((c: any) => c.id)])] })} className="text-blue-700 font-semibold">Chọn tất cả đang hiển thị</button><button type="button" onClick={() => update({ client_ids: [] })} className="text-gray-500">Bỏ chọn</button><span className="ml-auto text-gray-600">Đã chọn {form.client_ids.length} khách</span></div><div className="max-h-44 overflow-y-auto border rounded-lg divide-y">{visibleClients.map((client: any) => <label key={client.id} className="flex items-start gap-2 px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"><input type="checkbox" checked={form.client_ids.includes(client.id)} onChange={e => update({ client_ids: e.target.checked ? [...form.client_ids, client.id] : form.client_ids.filter(id => id !== client.id) })} className="mt-1" /><span>{client.name}<small className="block text-gray-500">MST {client.tax_code}</small></span></label>)}{!visibleClients.length && <p className="p-3 text-xs text-gray-500">Không có khách hàng phù hợp trong phạm vi phụ trách.</p>}</div></fieldset>}
        <label className="block text-sm font-medium">Nghiệp vụ<select value={form.action_type} onChange={e => update({ action_type: e.target.value })} className={field}>{RECURRING_DOMAINS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="block text-sm font-medium">Nội dung công việc *<textarea required maxLength={2000} rows={3} value={form.content} onChange={e => update({ content: e.target.value })} className={field} /></label>
        <p className="text-xs text-gray-500">Dùng {'{{thang}}'}, {'{{nam}}'}, {'{{ngay}}'} để tự điền tháng, năm và ngày của từng kỳ.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="block text-sm font-medium">Lặp lại<select value={form.frequency} onChange={e => update({ frequency: e.target.value as RecurringSchedule['frequency'] })} className={field}><option value="monthly">Hằng tháng</option><option value="weekly">Hằng tuần</option><option value="daily">Hằng ngày</option></select></label>{form.frequency === 'monthly' && <label className="block text-sm font-medium">Ngày trong tháng<input required type="number" min={1} max={31} value={form.month_day} onChange={e => update({ month_day: Number(e.target.value) })} className={field} /></label>}{form.frequency === 'weekly' && <label className="block text-sm font-medium">Thứ trong tuần<select value={form.week_day} onChange={e => update({ week_day: Number(e.target.value) })} className={field}>{WEEK_DAYS.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label>}</div>
        {form.frequency === 'monthly' && <p className="text-xs text-gray-500">Tháng không có ngày 29, 30 hoặc 31 sẽ tạo việc vào ngày cuối tháng.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="block text-sm font-medium">Bắt đầu từ ngày<input required type="date" min={form.id ? undefined : today} value={form.start_on} onChange={e => update({ start_on: e.target.value })} className={field} /></label><label className="block text-sm font-medium">Kết thúc ngày (không bắt buộc)<input type="date" min={form.start_on} value={form.end_on} onChange={e => update({ end_on: e.target.value })} className={field} /></label></div>
        <label className="block text-sm font-medium">Ghi chú mẫu (không bắt buộc)<textarea rows={2} maxLength={5000} value={form.notes} onChange={e => update({ notes: e.target.value })} className={field} /></label>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-900 space-y-1"><p className="font-semibold">{existing && !existing.is_active ? 'Lịch đang tạm dừng' : form.id ? 'Kỳ tiếp theo theo thiết lập' : 'Lần tạo đầu tiên'}: {next ? recurringDateLabel(next) : 'Không có kỳ trong khoảng ngày đã chọn'}</p>{next && <p className="whitespace-pre-wrap">{renderRecurringContent(form.content, next)}</p>}<p className="text-xs">Mỗi khách một việc mới ở trạng thái Tiếp nhận. Sửa lịch chỉ áp dụng cho việc tạo sau này.{existing && !existing.is_active && ' Bấm Tiếp tục sau khi lưu để bật lại lịch.'}</p></div>
      </fieldset>{formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}<div className="flex justify-end gap-3"><button disabled={saving} type="button" onClick={() => setForm(null)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Hủy</button><button disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? 'Đang lưu…' : form.id ? 'Lưu thay đổi' : `Lưu lịch cho ${form.client_ids.length} khách`}</button></div></form>
    </section></div>}
  </div>;
}
