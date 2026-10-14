import { supabase } from './supabase';

const BUCKET = 'task-proofs';

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
}

export async function uploadTaskProof(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Bằng chứng phải là file ảnh');
  if (file.size > 5 * 1024 * 1024) throw new Error('Ảnh bằng chứng không được vượt quá 5 MB');

  const path = `public/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function uploadTaskProofSafe(file: File): Promise<string | null> {
  try {
    return await uploadTaskProof(file);
  } catch (err) {
    console.warn('Supabase storage upload failed, fallback to inline base64:', err);
    return null;
  }
}

export async function createProofUrl(path: string): Promise<string> {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error) throw error;
    return data.signedUrl;
  } catch (err) {
    console.warn('Failed to create signed proof url:', err);
    return '';
  }
}

export function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, encoded] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);base64/)?.[1] || 'image/png';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], fileName, { type: mime });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
