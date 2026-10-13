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
