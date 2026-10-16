import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, ClipboardList, Save, X } from 'lucide-react';
import type { UserProfile } from '../../lib/profile';
import {
  fetchTaskUpdateLogs,
  TASK_FIELD_LABELS,
  updateTaskWithLog,
} from '../../lib/taskUpdates';
import type { TaskUpdateLog } from '../../lib/taskUpdates';
import { WorkNoteEditor } from '../WorkNote';
import { workNoteSummary } from '../../lib/workNotes';
import { statusAfterFiling } from '../../lib/taskStatus';

interface TaskEditModalProps {
  task: any;
  profile: UserProfile | null;
  onClose: () => void;
  onSaved: () => void;
}

interface TaskEditForm {
  content: string;
  contact_person: string;
  info_provided: string;
  info_pending: string;
  notes: string;
  dossier_code: string;
  dossier_progress: string;
  is_urgent: boolean;
  status: string;
}

const formFromTask = (task: any): TaskEditForm => ({
  content: task.content || '',
  contact_person: task.contact_person || '',
  info_provided: task.info_provided || '',
  info_pending: task.info_pending || '',
  notes: task.notes || '',
  dossier_code: task.dossier_code || '',
  dossier_progress: task.dossier_progress || '',
  is_urgent: Boolean(task.is_urgent),
  status: task.status || 'received',
});

const statusLabels: Record<string, string> = {
  received: 'Đã tiếp nhận',
  in_progress: 'Đang xử lý',
  completed: 'Hoàn thành',
  failed: 'Thất bại',
};

function displayLogValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === '') return 'Trống';
  if (field === 'notes' || field === 'resolution_note' || field === 'dossier_progress') return workNoteSummary(String(value));
  if (field === 'is_urgent') return value ? 'Có' : 'Không';
  if (field === 'status') return statusLabels[String(value)] || String(value);
  if (field === 'completed_at') return new Date(String(value)).toLocaleString('vi-VN');
  if (field === 'proof_file' || field === 'proof_image') return value ? 'Có ảnh' : 'Không có ảnh';
  return String(value);
}

export function TaskEditModal({ task, profile, onClose, onSaved }: TaskEditModalProps) {
  const [noteBusy, setNoteBusy] = useState(false);
  const [progressBusy, setProgressBusy] = useState(false);
  const [form, setForm] = useState<TaskEditForm>(() => formFromTask(task));
  const [baseline, setBaseline] = useState<TaskEditForm>(() => formFromTask(task));
  const [logs, setLogs] = useState<TaskUpdateLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      setLogs(await fetchTaskUpdateLogs(task.id));
    } catch (loadError) {
      console.error(loadError);
      setError('Không thể tải nhật ký cập nhật.');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [task.id]);

  const changes = useMemo(() => {
    const nextChanges: Record<string, unknown> = {};
    const normalized = { ...form, status: statusAfterFiling(form.status, form.dossier_code) };
    (Object.keys(normalized) as Array<keyof TaskEditForm>).forEach((field) => {
      if (normalized[field] !== baseline[field]) nextChanges[field] = normalized[field];
    });
    return nextChanges;
  }, [baseline, form]);

  const updateField = <K extends keyof TaskEditForm>(field: K, value: TaskEditForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
    setMessage('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (noteBusy || progressBusy) return;
    if (!form.content.trim()) {
      setError('Nội dung công việc không được để trống.');
      return;
    }
    if (Object.keys(changes).length === 0) {
      setError('Chưa có nội dung nào thay đổi.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateTaskWithLog(task.id, changes, profile, 'Cập nhật / bổ sung nội dung');
      const savedForm = { ...form, status: statusAfterFiling(form.status, form.dossier_code) };
      setForm(savedForm);
      setBaseline(savedForm);
      setMessage('Đã lưu thay đổi và ghi vào nhật ký hệ thống.');
      await loadLogs();
      onSaved();
    } catch (saveError) {
      console.error(saveError);
      setError('Không thể cập nhật công việc. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b flex items-start justify-between gap-4 bg-white">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Cập nhật công việc</h3>
            <p className="text-xs text-gray-500 mt-1">
              {task.clients?.name || 'Công việc nội bộ'} · {statusLabels[task.status] || task.status}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid lg:grid-cols-[1.25fr_0.75fr]">
          <form onSubmit={save} className="p-5 space-y-4 border-b lg:border-b-0 lg:border-r">
            <label className="block text-sm font-semibold text-gray-700">
              Nội dung công việc *
              <textarea rows={3} value={form.content} onChange={(event) => updateField('content', event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg font-normal outline-none focus:ring-2 focus:ring-blue-500" required />
            </label>

            <div className="grid sm:grid-cols-3 gap-3">
              <label className="block text-sm font-semibold text-gray-700">
                Người liên hệ
                <input value={form.contact_person} onChange={(event) => updateField('contact_person', event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg font-normal outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Mã hồ sơ điện tử
                <input value={form.dossier_code} onChange={(event) => updateField('dossier_code', event.target.value)} placeholder="Để trống nếu chưa có" className="mt-1 w-full px-3 py-2 border rounded-lg font-normal outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Trạng thái
                <select 
                  value={form.status} 
                  onChange={(event) => updateField('status', event.target.value)} 
                  className="mt-1 w-full px-3 py-2 border rounded-lg font-normal outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  <option value="received">Đã tiếp nhận</option>
                  <option value="in_progress">Đang xử lý</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="failed">Thất bại</option>
                </select>
              </label>
            </div>

            <label className="block text-sm font-semibold text-gray-700">
              Thông tin khách đã cung cấp
              <textarea rows={2} value={form.info_provided} onChange={(event) => updateField('info_provided', event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg font-normal outline-none focus:ring-2 focus:ring-blue-500" />
            </label>

            <label className="block text-sm font-semibold text-gray-700">
              Thông tin / chứng từ còn thiếu
              <textarea rows={2} value={form.info_pending} onChange={(event) => updateField('info_pending', event.target.value)} className="mt-1 w-full px-3 py-2 border border-amber-300 rounded-lg font-normal outline-none focus:ring-2 focus:ring-amber-500" />
            </label>

            <WorkNoteEditor label="Tiến độ hồ sơ" value={form.dossier_progress} onChange={value => updateField('dossier_progress', value)} onBusyChange={setProgressBusy} disabled={saving} />
            <WorkNoteEditor label="Ghi chú" value={form.notes} onChange={value => updateField('notes', value)} onBusyChange={setNoteBusy} disabled={saving} />

            <label className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 cursor-pointer">
              <input type="checkbox" checked={form.is_urgent} onChange={(event) => updateField('is_urgent', event.target.checked)} className="w-4 h-4" />
              Đánh dấu công việc gấp
            </label>

            {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2"><AlertCircle size={17} className="shrink-0" /> {error}</p>}
            {message && <p role="status" className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{message}</p>}

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Đóng</button>
              <button type="submit" disabled={saving || noteBusy || progressBusy || Object.keys(changes).length === 0} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2">
                <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu cập nhật'}
              </button>
            </div>
          </form>

          <aside className="p-5 bg-gray-50/70">
            <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><ClipboardList size={18} className="text-blue-600" /> Nhật ký cập nhật</h4>
            {loadingLogs ? (
              <p className="text-sm text-gray-500">Đang tải nhật ký...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-500 bg-white border rounded-lg p-4">Chưa có lần cập nhật nào.</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="bg-white border rounded-xl p-3 text-xs shadow-xs">
                    <div className="flex justify-between gap-2 mb-2">
                      <div><p className="font-bold text-gray-800">{log.action}</p><p className="text-blue-700 font-medium mt-0.5">{log.changed_by_name}</p></div>
                      <time className="text-gray-400 text-right shrink-0">{new Date(log.created_at).toLocaleString('vi-VN')}</time>
                    </div>
                    <div className="space-y-2 border-t pt-2">
                      {Object.entries(log.changes || {}).map(([field, change]) => (
                        <div key={field}>
                          <p className="font-semibold text-gray-600">{TASK_FIELD_LABELS[field] || field}</p>
                          <p className="text-gray-500 break-words"><span className="line-through decoration-red-400">{displayLogValue(field, change.old)}</span> → <span className="text-emerald-700 font-medium">{displayLogValue(field, change.new)}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
