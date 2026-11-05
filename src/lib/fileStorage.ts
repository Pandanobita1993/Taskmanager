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

export interface TargetFolderSpec {
  taxCode?: string;
  companyName?: string;
  unitCode?: string;
  subFolders?: string[];
}

export interface SaveFileResult {
  success: boolean;
  relativePath?: string;
}

function sanitizeFolderName(name: string): string {
  return (name || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function normalizeKey(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

async function resolveCustomerDirectory(
  rootDir: DirectoryHandle & { values?: () => AsyncIterable<FileSystemHandle> },
  taxCode?: string,
  companyName?: string
): Promise<{ handle: DirectoryHandle; folderName: string }> {
  const cleanTax = (taxCode || '').trim();
  const cleanTaxKey = cleanTax.replace(/[^0-9A-Za-z]/g, '').toLowerCase();
  const cleanCompanyKey = normalizeKey(companyName || '');

  // 1. Try to find an existing directory that matches
  if (typeof rootDir.values === 'function') {
    for await (const entry of rootDir.values()) {
      if (entry.kind !== 'directory') continue;
      const entryName = entry.name;
      const entryKey = normalizeKey(entryName);

      // Match by Tax Code (e.g. folder starts with or contains tax code)
      if (cleanTaxKey && cleanTaxKey.length >= 8) {
        const entryDigits = entryName.replace(/[^0-9A-Za-z]/g, '').toLowerCase();
        if (
          entryDigits.includes(cleanTaxKey) ||
          (cleanTaxKey.length >= 10 && entryDigits.includes(cleanTaxKey.slice(0, 10)))
        ) {
          return { handle: entry as DirectoryHandle, folderName: entryName };
        }
      }

      // Match by company name key if both have significant characters
      if (cleanCompanyKey.length >= 6 && entryKey.length >= 6) {
        if (entryKey.includes(cleanCompanyKey) || cleanCompanyKey.includes(entryKey)) {
          return { handle: entry as DirectoryHandle, folderName: entryName };
        }
      }
    }
  }

  // 2. If no existing folder matches, create new folder following: [MST]-[Tên khách hàng]
  const safeCompany = sanitizeFolderName(companyName || 'KhachHang');
  const safeTax = sanitizeFolderName(cleanTax);
  const newFolderName = safeTax ? `${safeTax}-${safeCompany}`.slice(0, 90) : safeCompany;
  const createdHandle = await rootDir.getDirectoryHandle(newFolderName, { create: true });
  return { handle: createdHandle as DirectoryHandle, folderName: newFolderName };
}

async function resolveUnitDirectory(
  customerDir: DirectoryHandle & { values?: () => AsyncIterable<FileSystemHandle> },
  unitCode: string
): Promise<{ handle: DirectoryHandle; folderName: string }> {
  const cleanUnit = sanitizeFolderName(unitCode);
  const cleanUnitKey = cleanUnit.toLowerCase();

  if (typeof customerDir.values === 'function') {
    for await (const entry of customerDir.values()) {
      if (entry.kind !== 'directory') continue;
      if (entry.name.trim().toLowerCase() === cleanUnitKey) {
        return { handle: entry as DirectoryHandle, folderName: entry.name };
      }
    }
  }

  const createdHandle = await customerDir.getDirectoryHandle(cleanUnit, { create: true });
  return { handle: createdHandle as DirectoryHandle, folderName: cleanUnit };
}

export async function saveFileToPreferredDirectory(
  fileName: string,
  data: BlobPart,
  mimeType: string,
  destination?: TargetFolderSpec | string[]
): Promise<SaveFileResult> {
  const handle = await readHandle();
  if (!handle) return { success: false };

  let permission = await handle.queryPermission?.({ mode: 'readwrite' });
  if (permission !== 'granted') {
    permission = await handle.requestPermission?.({ mode: 'readwrite' });
  }
  if (permission !== 'granted') return { success: false };

  let targetDir: DirectoryHandle = handle;
  const pathSegments: string[] = [];

  try {
    if (Array.isArray(destination)) {
      for (const seg of destination) {
        const clean = sanitizeFolderName(seg);
        if (!clean) continue;
        targetDir = (await targetDir.getDirectoryHandle(clean, { create: true })) as DirectoryHandle;
        pathSegments.push(clean);
      }
    } else if (destination && (destination.taxCode || destination.companyName || destination.unitCode || destination.subFolders)) {
      if (destination.taxCode || destination.companyName) {
        const cust = await resolveCustomerDirectory(
          targetDir as DirectoryHandle & { values?: () => AsyncIterable<FileSystemHandle> },
          destination.taxCode,
          destination.companyName
        );
        targetDir = cust.handle;
        pathSegments.push(cust.folderName);
      }

      if (destination.unitCode) {
        const unit = await resolveUnitDirectory(
          targetDir as DirectoryHandle & { values?: () => AsyncIterable<FileSystemHandle> },
          destination.unitCode
        );
        targetDir = unit.handle;
        pathSegments.push(unit.folderName);
      }

      if (destination.subFolders && destination.subFolders.length > 0) {
        for (const sub of destination.subFolders) {
          const clean = sanitizeFolderName(sub);
          if (!clean) continue;
          targetDir = (await targetDir.getDirectoryHandle(clean, { create: true })) as DirectoryHandle;
          pathSegments.push(clean);
        }
      }
    }

    const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob([data], { type: mimeType }));
    await writable.close();

    const relativePath = pathSegments.length > 0 ? `${pathSegments.join('/')}/${fileName}` : fileName;
    return { success: true, relativePath };
  } catch (err) {
    console.error('saveFileToPreferredDirectory error:', err);
    return { success: false };
  }
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
    if (typeof dir.values !== 'function' || depth > 4) return;
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
      } else if (entry.kind === 'directory' && depth < 4) {
        const subDir = entry as DirectoryHandle & { values?: () => AsyncIterable<FileSystemHandle> };
        await scanDir(subDir, prefix ? `${prefix}/${entry.name}` : entry.name, depth + 1);
      }
    }
  }

  await scanDir(iterHandle, '', 0);
  return entries.sort((a, b) => b.lastModified - a.lastModified);
}

