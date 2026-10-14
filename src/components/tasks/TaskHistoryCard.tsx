import { Building2, CalendarDays, Check, Eye, FileText, Pencil, X } from 'lucide-react';

interface TaskHistoryCardProps {
  task: any;
  onEdit: () => void;
  onOpenProof: () => void;
}

export function TaskHistoryCard({ task, onEdit, onOpenProof }: TaskHistoryCardProps) {
  const handledDate = task.completed_at || task.created_at;
  const hasProof = Boolean(task.proof_image || task.proof_file?.includes('/'));

  return (
    <article className="min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs text-gray-500 mb-2">
              <CalendarDays size={14} />
              {new Date(handledDate).toLocaleDateString('vi-VN')}
            </p>
            <h3 className="font-bold text-gray-900 leading-snug break-words flex items-start gap-2">
              <Building2 size={17} className="text-blue-600 mt-0.5 shrink-0" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{task.clients?.name || 'Công việc nội bộ'}</span>
            </h3>
          </div>
          {task.status === 'completed' ? (
            <span className="shrink-0 inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
              <Check size={13} /> Hoàn thành
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full text-xs font-semibold">
              <X size={13} /> Thất bại
            </span>
          )}
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
          <p className="text-[11px] uppercase tracking-wide font-bold text-gray-500 mb-1 flex items-center gap-1.5"><FileText size={13} /> Nội dung</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{task.content || '-'}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${task.task_category === 'support' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
            {task.task_category === 'support' ? `Hỗ trợ ${task.supported_user_name || 'đồng nghiệp'}` : 'Nhiệm vụ chính'}
          </span>
          {task.dossier_code && (
            <span className="max-w-full [overflow-wrap:anywhere] px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Mã HS: {task.dossier_code}
            </span>
          )}
        </div>

        {task.resolution_note && (
          <div className="text-sm text-gray-600 border-l-4 border-amber-300 pl-3 py-1 whitespace-pre-wrap [overflow-wrap:anywhere]">
            <span className="font-semibold text-gray-700">Kết quả / ghi chú: </span>{task.resolution_note}
          </div>
        )}
      </div>

      <div className="mt-auto px-4 sm:px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap justify-end gap-2">
        {hasProof && (
          <button type="button" onClick={onOpenProof} className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:bg-blue-100 bg-white px-3 py-1.5 rounded-lg border border-blue-200 font-semibold">
            <Eye size={14} /> Xem ảnh
          </button>
        )}
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 text-xs text-gray-700 hover:bg-gray-200 bg-white px-3 py-1.5 rounded-lg border border-gray-200 font-semibold">
          <Pencil size={14} /> Sửa / xem log
        </button>
      </div>
    </article>
  );
}
