import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { createProofUrl } from '../../lib/proofStorage';

interface TaskProofViewerProps {
  task: { proof_image?: string; proof_file?: string };
  onClose: () => void;
  title?: string;
  imageAlt?: string;
}

export function TaskProofViewer({ task, onClose, title = 'Ảnh chứng minh công việc', imageAlt = 'Ảnh chứng minh hoàn thành công việc' }: TaskProofViewerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setSource('');
    const load = async () => {
      try {
        const url = task.proof_image || (task.proof_file ? await createProofUrl(task.proof_file) : '');
        if (cancelled) return;
        if (!url) throw new Error('Không tìm thấy ảnh bằng chứng hoặc không thể tải ảnh.');
        setSource(url);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Không thể tải ảnh bằng chứng.');
        setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [task, attempt]);

  return (
    <dialog ref={dialog} aria-labelledby="proof-viewer-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-5xl max-h-[90vh] rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/70">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b">
        <h2 id="proof-viewer-title" className="font-bold text-gray-800">{title}</h2>
        <button type="button" autoFocus aria-label="Đóng ảnh" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100"><X size={20} /></button>
      </div>
      <div className="bg-gray-100 p-3 min-h-40 flex flex-col items-center justify-center gap-3">
        {loading && <p role="status" className="text-sm text-gray-600">Đang tải ảnh...</p>}
        {error ? (
          <div className="text-center p-6 space-y-3">
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={() => setAttempt(value => value + 1)} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm">Thử lại</button>
          </div>
        ) : source && (
          <img key={source} src={source} alt={imageAlt}
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError('Không thể tải ảnh. Vui lòng thử lại hoặc kiểm tra kết nối mạng.'); }}
            className="max-w-full max-h-[72vh] object-contain rounded" />
        )}
      </div>
    </dialog>
  );
}
