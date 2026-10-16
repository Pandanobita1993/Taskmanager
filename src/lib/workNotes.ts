const PREFIX = 'ANAN_NOTE_V1:';

export interface NoteImage {
  id: string;
  source: string;
  name: string;
}
export interface WorkNote { text: string; images: NoteImage[] }

export function isNoteImageSource(source: unknown): source is string {
  return typeof source === 'string' && (
    /^storage:public\/[a-zA-Z0-9._-]+$/.test(source)
    || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(source)
  );
}

export function readWorkNote(value?: string | null): WorkNote {
  if (value?.startsWith(PREFIX)) {
    try {
      const note = JSON.parse(value.slice(PREFIX.length));
      if (typeof note.text === 'string' && Array.isArray(note.images)) {
        return { text: note.text, images: note.images.filter((image: NoteImage) => image && typeof image.id === 'string' && typeof image.name === 'string' && isNoteImageSource(image.source)) };
      }
    } catch { /* Ghi chú cũ không đúng định dạng vẫn được giữ dưới dạng chữ. */ }
  }
  return { text: value || '', images: [] };
}

export function writeWorkNote(note: WorkNote): string {
  return note.images.length ? PREFIX + JSON.stringify(note) : note.text;
}

export function appendWorkNote(value: string, text: string, separator = ' | '): string {
  const note = readWorkNote(value);
  return writeWorkNote({ ...note, text: [note.text.trim(), text.trim()].filter(Boolean).join(separator) });
}

export function prependWorkNote(value: string, text: string): string {
  const note = readWorkNote(value);
  return writeWorkNote({ ...note, text: [text.trim(), note.text.trim()].filter(Boolean).join(' — ') });
}

export function workNoteSummary(value?: string | null): string {
  const note = readWorkNote(value);
  return [note.text, note.images.length ? `[${note.images.length} ảnh ghi chú]` : ''].filter(Boolean).join(' ');
}

export function hasWorkNote(value: string): boolean {
  const note = readWorkNote(value);
  return !!note.text.trim() || note.images.length > 0;
}
