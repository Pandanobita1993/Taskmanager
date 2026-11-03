const DB_NAME = 'taskflow-file-system';
const STORE_NAME = 'handles';
const DIRECTORY_KEY = 'reports-directory';

type DirectoryHandle = FileSystemDirectoryHandle & {
  requestPermission?: (options?: { mode: 'readwrite' }) => Promise<PermissionState>;
  queryPermission?: (options?: { mode: 'readwrite' }) => Promise<PermissionState>;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeHandle(handle: DirectoryHandle) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, DIRECTORY_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function readHandle(): Promise<DirectoryHandle | null> {
  const db = await openDatabase();
  const handle = await new Promise<DirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(DIRECTORY_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return handle;
}

export async function chooseReportsDirectory(): Promise<string> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('Trình duyệt này chưa hỗ trợ chọn thư mục. Báo cáo sẽ được tải xuống thư mục Downloads.');
  }
  const handle = await (window as Window & {
    showDirectoryPicker: () => Promise<DirectoryHandle>;
  }).showDirectoryPicker();
  await storeHandle(handle);
  return handle.name;
}

export async function saveFileToPreferredDirectory(
  fileName: string,
  data: BlobPart,
  mimeType: string,
): Promise<boolean> {
  const handle = await readHandle();
  if (!handle) return false;

  let permission = await handle.queryPermission?.({ mode: 'readwrite' });
  if (permission !== 'granted') {
    permission = await handle.requestPermission?.({ mode: 'readwrite' });
  }
  if (permission !== 'granted') return false;

  const fileHandle = await handle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(new Blob([data], { type: mimeType }));
  await writable.close();
  return true;
}

export async function getSavedDirectoryName(): Promise<string | null> {
  return (await readHandle())?.name || null;
}

export async function readTextFileFromPreferredDirectory(fileName: string): Promise<string | null> {
  try {
    const handle = await readHandle();
    if (!handle) return null;
    const permission = await handle.queryPermission?.({ mode: 'readwrite' });
    if (permission !== 'granted') return null;
    const fileHandle = await handle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

export interface LocalExcelFileEntry {
  path: string;
  name: string;
  lastModified: number;
  getFile: () => Promise<File>;
}

export async function listExcelFilesInPreferredDirectory(): Promise<LocalExcelFileEntry[]> {
  const handle = await readHandle();
  if (!handle) return [];
  let permission = await handle.queryPermission?.({ mode: 'readwrite' });
  if (permission !== 'granted') {
    permission = await handle.requestPermission?.({ mode: 'readwrite' });
  }
  if (permission !== 'granted') return [];

  const entries: LocalExcelFileEntry[] = [];
  const iterHandle = handle as DirectoryHandle & {
    values?: () => AsyncIterable<FileSystemHandle>;
  };
  if (typeof iterHandle.values !== 'function') return [];

  async function scanDir(dir: DirectoryHandle & { values?: () => AsyncIterable<FileSystemHandle> }, prefix: string, depth: number) {
    if (typeof dir.values !== 'function' || depth > 2) return;
    for await (const entry of dir.values()) {
      if (entry.kind === 'file' && /\.(xlsx|xls|csv)$/i.test(entry.name) && !entry.name.startsWith('~$')) {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        entries.push({
          path: prefix ? `${prefix}/${entry.name}` : entry.name,
          name: entry.name,
          lastModified: file.lastModified,
          getFile: () => fileHandle.getFile()
        });
      } else if (entry.kind === 'directory' && depth < 2) {
        const subDir = entry as DirectoryHandle & { values?: () => AsyncIterable<FileSystemHandle> };
        await scanDir(subDir, prefix ? `${prefix}/${entry.name}` : entry.name, depth + 1);
      }
    }
  }

  await scanDir(iterHandle, '', 0);
  return entries.sort((a, b) => b.lastModified - a.lastModified);
}

