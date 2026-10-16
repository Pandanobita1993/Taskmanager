import { useEffect, useId, useRef, useState } from 'react';
import type { ClipboardEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { createProofUrl, fileToDataUrl, uploadTaskProofSafe } from '../lib/proofStorage';
import { readWorkNote, writeWorkNote } from '../lib/workNotes';
import type { NoteImage } from '../lib/workNotes';
import { TaskProofViewer } from './tasks/TaskProofViewer';

function NoteImages({ images, onRemove, disabled }: { images: NoteImage[]; onRemove?: (id: string) => void; disabled?: boolean }) {
  const [viewing, setViewing] = useState<NoteImage | null>(null);
  return <>
    <div className="flex flex-wrap gap-3 mt-2">
      {images.map(image => <NoteThumbnail key={image.id} image={image} onOpen={() => setViewing(image)} onRemove={onRemove ? () => onRemove(image.id) : undefined} disabled={disabled} />)}
    </div>
    {viewing && <TaskProofViewer title="Ảnh ghi chú" imageAlt="Ảnh ghi chú công việc" task={viewing.source.startsWith('storage:') ? { proof_file: viewing.source.slice(8) } : { proof_image: viewing.source }} onClose={() => setViewing(null)} />}
  </>;
}

function NoteThumbnail({ image, onOpen, onRemove, disabled }: { image: NoteImage; onOpen: () => void; onRemove?: () => void; disabled?: boolean }) {
  const [source, setSource] = useState(image.source.startsWith('data:') ? image.source : '');
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    if (image.source.startsWith('storage:')) void createProofUrl(image.source.slice(8)).then(url => { if (active) { setSource(url); setError(!url); } });
    return () => { active = false; };
  }, [image.source]);
  return <div className="relative w-28 rounded-lg border border-gray-200 bg-gray-50 p-1">
    <button type="button" aria-label={`Xem ảnh ghi chú ${image.name}`} onClick={onOpen} className="w-full h-20 rounded overflow-hidden flex items-center justify-center text-[10px] text-gray-500 hover:ring-2 hover:ring-blue-300">
      {error ? <span>Bấm để tải lại ảnh</span> : source ? <img src={source} alt={image.name} onError={() => setError(true)} className="w-full h-full object-cover" /> : <span>Đang tải ảnh…</span>}
    </button>
    <p className="truncate text-[10px] text-gray-500 mt-1 px-1" title={image.name}>{image.name}</p>
    {onRemove && <button disabled={disabled} type="button" onClick={onRemove} aria-label={`Xóa ảnh ghi chú ${image.name}`} className="absolute -right-2 -top-2 rounded-full bg-white border border-gray-300 p-1 shadow-sm text-gray-600 hover:bg-red-50 hover:text-red-700"><X size={13} /></button>}
  </div>;
}

export function WorkNoteView({ value, className = '' }: { value?: string | null; className?: string }) {
  const note = readWorkNote(value);
  if (!note.text && !note.images.length) return null;
  return <div className={className}>
    {note.text && <p className="whitespace-pre-wrap break-words">{note.text}</p>}
    {note.images.length > 0 && <NoteImages images={note.images} />}
  </div>;
}

async function prepareNoteImage(file: File): Promise<File> {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Vui lòng chọn ảnh JPG, PNG, WebP hoặc GIF.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Mỗi ảnh ghi chú tối đa 10 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Không thể xử lý ảnh.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Không thể xử lý ảnh.')), 'image/jpeg', 0.85));
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } finally { URL.revokeObjectURL(url); }
}

interface WorkNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}

export function WorkNoteEditor({ value, onChange, label, placeholder = 'Gõ nội dung hoặc dán ảnh bằng Ctrl + V…', required = false, disabled = false, onBusyChange }: WorkNoteEditorProps) {
  const id = useId();
  const latest = useRef(value); latest.current = value;
  const active = useRef(true);
  const processing = useRef(false);
  const busyCallback = useRef(onBusyChange); busyCallback.current = onBusyChange;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const note = readWorkNote(value);
  useEffect(() => { active.current = true; return () => { active.current = false; busyCallback.current?.(false); }; }, []);
  const change = (next: string) => { latest.current = next; onChange(next); };
  const addImages = async (files: File[]) => {
    if (disabled) return;
    if (processing.current) { setError('Ảnh trước đang được xử lý. Bạn đợi một chút rồi dán thêm nhé.'); return; }
    if (readWorkNote(latest.current).images.length + files.length > 5) { setError('Mỗi ghi chú tối đa 5 ảnh. Bạn có thể xóa ảnh trước khi thêm.'); return; }
    processing.current = true; setBusy(true); busyCallback.current?.(true); setError('');
    try {
      for (const file of files) {
        const ready = await prepareNoteImage(file);
        if (!active.current) break;
        const path = await uploadTaskProofSafe(ready);
        const source = path ? `storage:${path}` : await fileToDataUrl(ready);
        if (!active.current) break;
        const current = readWorkNote(latest.current);
        change(writeWorkNote({ ...current, images: [...current.images, { id: crypto.randomUUID(), source, name: file.name || 'Ảnh đã dán' }] }));
      }
    } catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : 'Không thể đọc ảnh. Vui lòng thử lại.'); }
    finally { processing.current = false; if (active.current) { setBusy(false); busyCallback.current?.(false); } }
  };
  const paste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.items).filter(item => item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => !!file);
    if (files.length) { event.preventDefault(); event.stopPropagation(); void addImages(files); }
  };
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-semibold text-gray-700">{label}</label>
    <textarea id={id} value={note.text} disabled={disabled} required={required && note.images.length === 0} rows={3} onPaste={paste}
      onChange={event => change(writeWorkNote({ ...readWorkNote(latest.current), text: event.target.value }))}
      placeholder={placeholder} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-normal outline-none focus:ring-2 focus:ring-blue-500" />
    <div className="flex flex-wrap gap-3 items-center">
      <label className={`inline-flex gap-1.5 items-center px-3 py-1.5 rounded-lg border text-xs font-semibold text-blue-700 ${disabled || busy ? 'opacity-50' : 'cursor-pointer hover:bg-blue-50'}`}>
        <ImagePlus size={15} /> Thêm ảnh ghi chú
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple disabled={disabled || busy} className="sr-only"
          onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; if (files.length) void addImages(files); }} />
      </label>
      <span className="text-[11px] text-gray-500">Ctrl + V để dán ảnh · tối đa 5 ảnh</span>
    </div>
    {busy && <p role="status" className="text-xs text-blue-700">Đang thêm ảnh ghi chú…</p>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {note.images.length > 0 && <NoteImages images={note.images} disabled={disabled || busy} onRemove={imageId => { const current = readWorkNote(latest.current); change(writeWorkNote({ ...current, images: current.images.filter(image => image.id !== imageId) })); setError(''); }} />}
  </div>;
}
