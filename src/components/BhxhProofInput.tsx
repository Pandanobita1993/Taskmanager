import { useEffect, useRef, useState } from 'react';
import { uploadTaskProof } from '../lib/proofStorage';
import { TaskProofViewer } from './tasks/TaskProofViewer';

export default function BhxhProofInput({ value, onChange, onBusy }: {
  value: string; onChange: (path: string) => void; onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState(false);
  const mounted = useRef(true);
  const uploading = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function attach(file?: File) {
    if (!file || uploading.current) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setError('Chọn ảnh PNG, JPEG hoặc WebP.');
    if (!file.size || file.size > 5 * 1024 * 1024) return setError('Ảnh phải lớn hơn 0 và tối đa 5 MB.');
    uploading.current = true; setBusy(true); onBusy(true); onChange('');
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      const path = await uploadTaskProof(file, 'bhxh');
      if (mounted.current) onChange(path);
    } catch (cause: any) {
      if (mounted.current) setError(`Chưa tải được ảnh bằng chứng. ${cause.message || 'Hãy thử lại.'}`);
    } finally {
      uploading.current = false;
      if (mounted.current) { setBusy(false); onBusy(false); }
    }
  }
  return <div className="space-y-2 rounded-lg border border-gray-200 p-3" tabIndex={0} onPaste={event => {
    const image = Array.from(event.clipboardData.items).find(item => item.kind === 'file' && item.type.startsWith('image/'));
    if (image) { event.preventDefault(); void attach(image.getAsFile() || undefined); }
  }}>
    <label className="block text-sm font-medium">Ảnh bằng chứng đóng tiền *
      <input aria-label="Ảnh bằng chứng đóng tiền" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="mt-2 block w-full text-sm" onChange={event => { void attach(event.target.files?.[0]); event.target.value = ''; }} />
    </label>
    <p className="text-xs text-gray-500">Chọn ảnh hoặc bấm vào khung này rồi dán ảnh (Ctrl+V). PNG, JPEG, WebP, tối đa 5 MB.</p>
    {busy ? <p role="status" className="text-sm text-blue-700">Đang tải ảnh bằng chứng…</p> : value ? <button type="button" className="text-sm text-emerald-700 underline" onClick={() => setView(true)}>Xem ảnh đã đính kèm</button> : <p className="text-xs text-amber-800">Cần đính kèm ảnh trước khi lưu.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {view && <TaskProofViewer task={{ proof_file: value }} onClose={() => setView(false)} title="Bằng chứng đóng BHXH" imageAlt="Ảnh bằng chứng đóng BHXH" />}
  </div>;
}
