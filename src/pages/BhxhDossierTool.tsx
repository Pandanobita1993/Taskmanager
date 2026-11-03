import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Building2,
  Check,
  Copy,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FolderSearch,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  X
} from 'lucide-react';
import ClientSelect from '../components/ClientSelect';
import { supabase } from '../lib/supabase';
import { readCachedProfile } from '../lib/profile';
import type { BhxhClient } from '../lib/bhxhLedger';
import type { AgencyPortal } from '../lib/bhxhAgencies';
import { bhxhUnitKindLabel } from '../lib/bhxhUnits';
import type { BhxhUnitKind } from '../lib/bhxhUnits';
import {
  calculateEmployeeContribution,
  exportMonthlyBhxhReportExcel,
  exportTk3TsExcel,
  exportTk3TsWordDoc,
  parseDossierFromExcelFile
} from '../lib/bhxhDossierExcel';
import type {
  BhxhDossierEmployee,
  BhxhUnitDossier,
  DossierTargetKind
} from '../lib/bhxhDossierExcel';
import {
  listExcelFilesInPreferredDirectory,
  readTextFileFromPreferredDirectory,
  saveFileToPreferredDirectory
} from '../lib/fileStorage';
import type { LocalExcelFileEntry } from '../lib/fileStorage';
import type { BhytUnitProfile } from './BhxhBhytTool';

const DOSSIER_STORAGE_KEY = 'taskflow_bhxh_dossiers_v1';
const DOSSIER_DB_FILENAME = 'taskflow-bhxh-dossiers.json';
const BHYT_STORAGE_KEY = 'taskflow_bhxh_bhyt_profiles_v1';

const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50';

interface UnitChoice {
  key: string;
  clientId: string;
  clientName: string;
  taxCode: string;
  unitId: string;
  unitCode: string;
  unitKind: DossierTargetKind;
  displayLabel: string;
}

const TARGET_KIND_OPTIONS: { value: DossierTargetKind; label: string; desc: string }[] = [
  {
    value: 'employees',
    label: 'Người lao động Việt Nam (32% = NLĐ 10.5% + Công ty 21.5%)',
    desc: 'BHXH 25.5%, BHYT 4.5%, BHTN 2%'
  },
  {
    value: 'legal_representative',
    label: 'Đại diện pháp luật / Chủ DN (29.5% = Công ty đóng 29.5%)',
    desc: 'HT&TT 22%, BHYT 4.5%, ÔĐ-TS 3% (Không đóng BHTN)'
  },
  {
    value: 'foreign_workers',
    label: 'Người nước ngoài / Không đóng BHTN (30% = NLĐ 9.5% + Công ty 20.5%)',
    desc: 'BHXH 25.5%, BHYT 4.5% (Không đóng BHTN)'
  }
];

function createEmptyEmployee(): BhxhDossierEmployee {
  return {
    id: crypto.randomUUID(),
    fullName: '',
    gender: 'Nam',
    bhxhCode: '',
    dob: '',
    baseSalary: 5310000,
    allowance: 0,
    position: 'Nhân viên',
    contractNo: '',
    contractDate: '',
    cccd: '',
    cccdDate: '',
    address: '',
    phone: '',
    hospital: '',
    changeMonth: '',
    decreaseDate: '',
    decreaseDoc: '',
    householdHeadName: '',
    householdHeadCccd: '',
    householdHeadDob: '',
    householdHeadAddress: '',
    active: true,
    note: ''
  };
}

function loadLocalDossiers(): Record<string, BhxhUnitDossier> {
  try {
    const raw = localStorage.getItem(DOSSIER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, BhxhUnitDossier>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalDossiers(data: Record<string, BhxhUnitDossier>) {
  try {
    const serialized = JSON.stringify(data, null, 2);
    localStorage.setItem(DOSSIER_STORAGE_KEY, serialized);
    void saveFileToPreferredDirectory(DOSSIER_DB_FILENAME, serialized, 'application/json').catch(() => {});
  } catch {
    // Ignore storage error
  }
}

const fmtMoney = (val: number) => new Intl.NumberFormat('vi-VN').format(Math.round(val || 0));

export default function BhxhDossierTool({
  clients,
  initialClientId = ''
}: {
  clients: BhxhClient[];
  initialClientId?: string;
}) {
  const [dossiers, setDossiers] = useState<Record<string, BhxhUnitDossier>>(loadLocalDossiers);
  const [agencyPortal, setAgencyPortal] = useState<AgencyPortal | null>(null);
  const [selectedKey, setSelectedKey] = useState('');
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [showTk3Panel, setShowTk3Panel] = useState(true);
  const [editingEmp, setEditingEmp] = useState<BhxhDossierEmployee | null>(null);
  const [folderFiles, setFolderFiles] = useState<LocalExcelFileEntry[] | null>(null);
  const [scanningFolder, setScanningFolder] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedSyntax, setCopiedSyntax] = useState(false);

  const fileUploadRef = useRef<HTMLInputElement>(null);
  const initialSelectedRef = useRef(false);

  // Load BHXH agencies directory so we can auto-fill Tên cơ sở BHXH & Mã cơ sở (08008, 07918...)
  useEffect(() => {
    const staffId = readCachedProfile().id;
    if (!staffId) return;
    void supabase
      .rpc('bhxh_agency_portal', { p_staff_id: staffId })
      .then((res) => {
        if (!res.error && res.data) {
          setAgencyPortal(res.data as AgencyPortal);
        }
      });
  }, []);

  // Also check if D:\Taskmanager has a saved taskflow-bhxh-dossiers.json on mount
  useEffect(() => {
    void readTextFileFromPreferredDirectory(DOSSIER_DB_FILENAME).then((text) => {
      if (!text) return;
      try {
        const fromDisk = JSON.parse(text) as Record<string, BhxhUnitDossier>;
        if (fromDisk && typeof fromDisk === 'object') {
          setDossiers((prev) => {
            const merged = { ...fromDisk, ...prev };
            localStorage.setItem(DOSSIER_STORAGE_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      } catch {
        // Ignore invalid JSON
      }
    });
  }, []);

  const unitChoices = useMemo<UnitChoice[]>(() => {
    const activeClients = clients.filter((c) => !c.archived && c.participating !== false);
    const list: UnitChoice[] = [];
    for (const client of activeClients) {
      const units = (client.units || []).filter((u) => u.is_active && u.code.trim());
      if (units.length > 0) {
        for (const u of units) {
          const code = u.code.trim().toUpperCase();
          const kind: DossierTargetKind = (u.kind as BhxhUnitKind) || 'employees';
          list.push({
            key: `${client.id}:${u.id}`,
            clientId: client.id,
            clientName: client.name,
            taxCode: client.tax_code || '',
            unitId: u.id,
            unitCode: code,
            unitKind: kind,
            displayLabel: `${client.name} · ${code} (${bhxhUnitKindLabel(u.kind)})`
          });
        }
      } else {
        const fallbackCode = (client.ins_code || '').trim().toUpperCase();
        list.push({
          key: `${client.id}:default`,
          clientId: client.id,
          clientName: client.name,
          taxCode: client.tax_code || '',
          unitId: '',
          unitCode: fallbackCode,
          unitKind: 'employees',
          displayLabel: `${client.name}${fallbackCode ? ` · ${fallbackCode}` : ' · Khách mới / Chưa có mã ĐV'}`
        });
      }
    }
    return list;
  }, [clients]);

  useEffect(() => {
    if (initialSelectedRef.current || !unitChoices.length) return;
    initialSelectedRef.current = true;
    const matchClient = initialClientId
      ? unitChoices.find((u) => u.clientId === initialClientId)
      : undefined;
    const target = matchClient || unitChoices[0];
    if (target) setSelectedKey(target.key);
  }, [unitChoices, initialClientId]);

  const selectedUnit = useMemo(
    () => unitChoices.find((u) => u.key === selectedKey) || null,
    [unitChoices, selectedKey]
  );

  const currentDossier = useMemo<BhxhUnitDossier>(() => {
    if (selectedUnit && dossiers[selectedUnit.key]) {
      return dossiers[selectedUnit.key];
    }
    // Look up default agency from agencyPortal if linked
    let defaultAgencyName = 'BHXH CƠ SỞ HẬU NGHĨA';
    let defaultAgencyCode = '08008';
    if (selectedUnit && agencyPortal) {
      const rec =
        agencyPortal.receivers.find(
          (r) => r.client_id === selectedUnit.clientId && r.unit_id === selectedUnit.unitId
        ) || agencyPortal.receivers.find((r) => r.client_id === selectedUnit.clientId);
      if (rec?.agency_id) {
        const ag = agencyPortal.agencies.find((a) => a.id === rec.agency_id);
        if (ag) {
          defaultAgencyName = ag.name;
          defaultAgencyCode = ag.agency_code || defaultAgencyCode;
        }
      }
    }
    return {
      key: selectedUnit?.key || 'custom',
      clientId: selectedUnit?.clientId || '',
      companyName: selectedUnit?.clientName || '',
      taxCode: selectedUnit?.taxCode || '',
      unitCode: selectedUnit?.unitCode || '',
      targetKind: selectedUnit?.unitKind || 'employees',
      agencyName: defaultAgencyName,
      agencyCode: defaultAgencyCode,
      contractNote: 'Báo tăng lao động theo hợp đồng lao động',
      businessAddress: '',
      contactAddress: '',
      email: '',
      phone: '',
      legalRepName: '',
      legalRepCccd: '',
      unitType: 'Công ty TNHH',
      businessField: '',
      participantCategory: 'Người lao động',
      paymentMethod: 'Hằng tháng',
      changeRequestContent: 'Đăng ký tham gia BHXH, BHYT, BHTN lần đầu',
      signLocation: 'Cần Thơ',
      signDate: new Date().toISOString().slice(0, 10),
      employees: [],
      updatedAt: new Date().toISOString()
    };
  }, [selectedUnit, dossiers, agencyPortal]);

  function updateDossier(patch: Partial<BhxhUnitDossier>) {
    const key = currentDossier.key;
    const next: BhxhUnitDossier = {
      ...currentDossier,
      ...patch,
      key,
      updatedAt: new Date().toISOString()
    };
    setDossiers((prev) => {
      const updated = { ...prev, [key]: next };
      saveLocalDossiers(updated);
      return updated;
    });
  }

  function saveEmployeeModal() {
    if (!editingEmp) return;
    if (!editingEmp.fullName.trim()) {
      setErrorMsg('Vui lòng nhập Họ và tên người lao động.');
      return;
    }
    const cleanEmp: BhxhDossierEmployee = {
      ...editingEmp,
      fullName: editingEmp.fullName.trim(),
      bhxhCode: editingEmp.bhxhCode.trim().toUpperCase(),
      baseSalary: Math.max(0, Number(editingEmp.baseSalary) || 0),
      allowance: Math.max(0, Number(editingEmp.allowance) || 0)
    };
    const exists = currentDossier.employees.some((e) => e.id === cleanEmp.id);
    const nextEmployees = exists
      ? currentDossier.employees.map((e) => (e.id === cleanEmp.id ? cleanEmp : e))
      : [...currentDossier.employees, cleanEmp];
    updateDossier({ employees: nextEmployees });
    setEditingEmp(null);
    setErrorMsg('');
    setStatusMsg(`✓ Đã lưu nhân sự "${cleanEmp.fullName}" vào đơn vị ${currentDossier.companyName || currentDossier.unitCode}.`);
  }

  function removeEmployee(empId: string) {
    const nextEmployees = currentDossier.employees.filter((e) => e.id !== empId);
    updateDossier({ employees: nextEmployees });
    setStatusMsg('Đã xóa nhân sự khỏi danh sách của đơn vị.');
  }

  function toggleEmployeeActive(empId: string) {
    const nextEmployees = currentDossier.employees.map((e) =>
      e.id === empId ? { ...e, active: !e.active } : e
    );
    updateDossier({ employees: nextEmployees });
  }

  function assignEmployeeToBhytWatchlist(emp: BhxhDossierEmployee) {
    if (!selectedUnit) {
      setErrorMsg('Hãy chọn công ty / mã đơn vị trước khi gán người lao động đại diện.');
      return;
    }
    if (!emp.bhxhCode.trim() || !emp.fullName.trim() || !emp.dob.trim()) {
      setErrorMsg('Nhân sự này cần có đủ Mã số sổ BHXH, Họ tên và Ngày/năm sinh để gán sang công cụ kiểm tra thẻ BHYT.');
      return;
    }
    try {
      const raw = localStorage.getItem(BHYT_STORAGE_KEY);
      const profiles: Record<string, BhytUnitProfile> = raw ? JSON.parse(raw) : {};
      const existing = profiles[selectedUnit.key];
      profiles[selectedUnit.key] = {
        key: selectedUnit.key,
        unitCode: currentDossier.unitCode,
        clientName: currentDossier.companyName,
        txtMaThe: emp.bhxhCode.trim().toUpperCase(),
        txtHoTen: emp.fullName.trim(),
        txtNgaySinh: emp.dob.trim(),
        note: `Từ DS BHXH (${emp.position || 'Đang làm'})`,
        updatedAt: new Date().toISOString(),
        lastResult: existing?.lastResult
      };
      localStorage.setItem(BHYT_STORAGE_KEY, JSON.stringify(profiles));
      setErrorMsg('');
      setStatusMsg(
        `✓ Đã gán "${emp.fullName}" (${emp.bhxhCode}) làm NLĐ đại diện kiểm tra hạn thẻ BHYT cho đơn vị ${currentDossier.unitCode || currentDossier.companyName}!`
      );
    } catch {
      setErrorMsg('Không lưu được vào bộ nhớ BHYT.');
    }
  }

  async function handleScanConnectedDirectory() {
    setScanningFolder(true);
    setErrorMsg('');
    try {
      const files = await listExcelFilesInPreferredDirectory();
      setFolderFiles(files);
      if (!files.length) {
        setStatusMsg(
          'Chưa tìm thấy file Excel (.xlsx, .xls, .csv) nào trong thư mục lưu trữ đã kết nối, hoặc bồ chưa bấm chọn thư mục ở góc phải trên màn hình.'
        );
      } else {
        setStatusMsg(`Tìm thấy ${files.length} file Excel/CSV trong thư mục lưu trữ trên máy. Bấm "Nạp dữ liệu" ở file tương ứng để đọc tự động!`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không quét được thư mục trên máy.');
    } finally {
      setScanningFolder(false);
    }
  }

  async function importFromFileObject(file: File) {
    setErrorMsg('');
    try {
      const parsed = await parseDossierFromExcelFile(file);
      if (!parsed.employees.length && !parsed.companyName && !parsed.agencyName) {
        setErrorMsg(`File "${file.name}" không có dòng nhân sự nào theo mẫu báo cáo BHXH.`);
        return;
      }
      updateDossier({
        companyName: currentDossier.companyName || parsed.companyName || '',
        agencyName: parsed.agencyName || currentDossier.agencyName,
        agencyCode: parsed.agencyCode || currentDossier.agencyCode,
        targetKind: parsed.targetKind || currentDossier.targetKind,
        employees: parsed.employees.length > 0 ? parsed.employees : currentDossier.employees
      });
      setStatusMsg(
        `✓ Đã đọc tự động ${parsed.employees.length} nhân sự từ file "${file.name}" vào đơn vị ${currentDossier.companyName || parsed.companyName || ''}!`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không đọc được file Excel này.');
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await importFromFileObject(file);
    if (fileUploadRef.current) fileUploadRef.current.value = '';
  }

  async function handleExportMonthlyExcel() {
    setErrorMsg('');
    try {
      const { fileName, savedToFolder } = await exportMonthlyBhxhReportExcel(currentDossier, reportMonth);
      setStatusMsg(
        savedToFolder
          ? `✓ Đã xuất file "${fileName}" (gồm 2 Sheet: Báo cáo tiền đóng + Thông tin báo tăng giảm) và tự động lưu vào thư mục trên máy!`
          : `✓ Đã xuất và tải xuống file "${fileName}" để gửi khách!`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi xuất file Excel báo cáo BHXH.');
    }
  }

  async function handleExportTk3Excel() {
    setErrorMsg('');
    try {
      const { fileName, savedToFolder } = await exportTk3TsExcel(currentDossier);
      setStatusMsg(
        savedToFolder
          ? `✓ Đã xuất Mẫu TK3-TS Excel "${fileName}" (QĐ 366/QĐ-BHXH) và lưu trực tiếp vào thư mục trên máy!`
          : `✓ Đã xuất và tải xuống Mẫu TK3-TS Excel "${fileName}" (QĐ 366/QĐ-BHXH)!`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi xuất Mẫu TK3-TS Excel.');
    }
  }

  async function handleExportTk3Word() {
    setErrorMsg('');
    try {
      const { fileName, savedToFolder } = await exportTk3TsWordDoc(currentDossier);
      setStatusMsg(
        savedToFolder
          ? `✓ Đã xuất Mẫu TK3-TS Word "${fileName}" (QĐ 366/QĐ-BHXH) và lưu trực tiếp vào thư mục trên máy!`
          : `✓ Đã xuất và tải xuống Mẫu TK3-TS Word "${fileName}" (QĐ 366/QĐ-BHXH) để gửi khách ký nộp BHXH Cơ sở!`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi xuất Mẫu TK3-TS Word.');
    }
  }

  const activeTotals = useMemo(() => {
    const activeList = currentDossier.employees.filter((e) => e.active);
    return activeList.reduce(
      (acc, emp) => {
        const c = calculateEmployeeContribution(emp, currentDossier.targetKind);
        acc.count += 1;
        acc.salary += c.salary;
        acc.empTotal += c.empTotal;
        acc.compTotal += c.compTotal;
        acc.grandTotal += c.grandTotal;
        return acc;
      },
      { count: 0, salary: 0, empTotal: 0, compTotal: 0, grandTotal: 0 }
    );
  }, [currentDossier.employees, currentDossier.targetKind]);

  const paymentSyntax = `+BHXH+103+00+${currentDossier.unitCode || '……...'}+${currentDossier.agencyCode || '08008'}+ĐÓNG BHXH+`;
  const firstTimeSyntax = `+BHXH+103+00+${(currentDossier.companyName || '[TÊN CÔNG TY]').toUpperCase()}+${currentDossier.agencyCode || '07918'}+ĐÓNG BHXH+`;

  function copyText(txt: string) {
    void navigator.clipboard?.writeText(txt);
    setCopiedSyntax(true);
    window.setTimeout(() => setCopiedSyntax(false), 1800);
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            Hồ sơ & Báo cáo tình hình tham gia BHXH (3 đối tượng & Mẫu TK3-TS)
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Quản lý danh sách lao động trực tiếp trên App, tự động đọc từ thư mục máy và xuất ngay file Excel Báo cáo tiền đóng hằng tháng (32% / 29.5% / 30%) hoặc Mẫu TK3-TS gửi khách.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileUploadRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={(e) => void handleFileUpload(e)}
          />
          <button
            type="button"
            onClick={() => void handleScanConnectedDirectory()}
            disabled={scanningFolder}
            className={button}
          >
            <FolderSearch size={16} className="text-emerald-600" />
            {scanningFolder ? 'Đang quét thư mục máy…' : 'Quét file Excel trong thư mục máy'}
          </button>
          <button type="button" onClick={() => fileUploadRef.current?.click()} className={button}>
            <Upload size={16} /> Nạp từ file Excel/CSV có sẵn
          </button>
        </div>
      </header>

      {statusMsg && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Danh sách file Excel quét được trực tiếp từ thư mục D:\Taskmanager */}
      {folderFiles && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-950">
              Các file Excel/CSV tìm thấy trong thư mục lưu trữ trên máy ({folderFiles.length} file)
            </h3>
            <button
              type="button"
              onClick={() => setFolderFiles(null)}
              className="text-xs text-blue-800 underline"
            >
              Ẩn danh sách
            </button>
          </div>
          {folderFiles.length === 0 ? (
            <p className="text-xs text-blue-900">
              Không có file Excel nào trong thư mục gốc. Bồ có thể bấm nút &ldquo;Nạp từ file Excel/CSV có sẵn&rdquo; để chọn file từ bất kỳ thư mục nào trên máy.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto divide-y divide-blue-100 rounded-lg border bg-white">
              {folderFiles.map((entry) => (
                <div key={entry.path} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                  <div>
                    <span className="font-semibold text-gray-800">{entry.path}</span>
                    <span className="ml-2 text-gray-400">
                      Cập nhật: {new Date(entry.lastModified).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const f = await entry.getFile();
                      await importFromFileObject(f);
                    }}
                    className="rounded-md bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700"
                  >
                    Đọc dữ liệu vào đơn vị đang chọn
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Thiết lập Đơn vị & Đối tượng đóng BHXH */}
      <section className="rounded-xl border bg-white p-4 sm:p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium sm:col-span-2">
            Chọn Công ty / Mã đơn vị BHXH
            <ClientSelect
              aria-label="Chọn đơn vị lập báo cáo BHXH"
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className={input}
            >
              <option value="">-- Nhập thông tin công ty mới (chưa có trong danh sách) --</option>
              {unitChoices.map((u) => {
                const count = dossiers[u.key]?.employees?.filter((e) => e.active).length || 0;
                return (
                  <option key={u.key} value={u.key} data-search={`${u.taxCode} ${u.unitCode}`}>
                    {u.displayLabel} {count > 0 ? `— [${count} NLĐ]` : ''}
                  </option>
                );
              })}
            </ClientSelect>
          </label>
          <label className="block text-sm font-medium">
            Kỳ báo cáo (Tháng/Năm)
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className={input}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-medium lg:col-span-2">
            Tên công ty hiển thị trên báo cáo & TK3-TS *
            <input
              value={currentDossier.companyName}
              onChange={(e) => updateDossier({ companyName: e.target.value })}
              placeholder="VD: CÔNG TY TNHH ABC"
              className={input}
            />
          </label>
          <label className="block text-sm font-medium">
            Mã đơn vị BHXH
            <input
              value={currentDossier.unitCode}
              onChange={(e) => updateDossier({ unitCode: e.target.value.toUpperCase() })}
              placeholder="Để trống nếu đóng lần đầu cấp mã"
              className={input}
            />
          </label>
          <label className="block text-sm font-medium">
            Mã số thuế
            <input
              value={currentDossier.taxCode}
              onChange={(e) => updateDossier({ taxCode: e.target.value })}
              placeholder="VD: 1801821715"
              className={input}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            Nhóm đối tượng & Tỷ lệ đóng BHXH *
            <select
              value={currentDossier.targetKind}
              onChange={(e) => updateDossier({ targetKind: e.target.value as DossierTargetKind })}
              className={input}
            >
              {TARGET_KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Tên Cơ sở BHXH quản lý (in trên tiêu đề)
            <input
              value={currentDossier.agencyName}
              onChange={(e) => updateDossier({ agencyName: e.target.value })}
              placeholder="VD: BHXH CƠ SỞ HẬU NGHĨA"
              className={input}
            />
          </label>
          <label className="block text-sm font-medium">
            Mã Cơ sở BHXH (5 số trong cú pháp nộp tiền)
            <input
              value={currentDossier.agencyCode}
              maxLength={5}
              onChange={(e) => updateDossier({ agencyCode: e.target.value })}
              placeholder="VD: 08008 hoặc 07918"
              className={input}
            />
          </label>
        </div>

        {/* Form nhập Mẫu TK3-TS (Ban hành kèm theo QĐ số 366/QĐ-BHXH ngày 29/04/2026) */}
        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowTk3Panel((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800 hover:underline"
          >
            <Building2 size={16} />
            {showTk3Panel
              ? '▼ Thu gọn Form nhập Mẫu TK3-TS (QĐ số 366/QĐ-BHXH ngày 29/04/2026 — Mục [01] đến [14])'
              : '▶ Mở Form nhập Mẫu TK3-TS (QĐ số 366/QĐ-BHXH ngày 29/04/2026 — Mục [01] đến [14])'}
          </button>

          {showTk3Panel && (
            <div className="mt-3 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                <div>
                  <p className="text-xs font-bold uppercase text-emerald-950">
                    TỜ KHAI ĐƠN VỊ ĐĂNG KÝ, ĐIỀU CHỈNH THÔNG TIN THAM GIA BHXH, BHYT — MẪU TK3-TS
                  </p>
                  <p className="text-[11px] italic text-gray-600">
                    (Ban hành kèm theo QĐ số 366/QĐ-BHXH ngày 29/04/2026 của BHXH Việt Nam)
                  </p>
                </div>
                <span className="text-xs font-medium text-emerald-800">
                  Mã đơn vị: <strong>{currentDossier.unitCode || '…………………..'}</strong>
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-medium sm:col-span-2">
                  [01]. Tên đơn vị
                  <input
                    value={currentDossier.companyName}
                    onChange={(e) => updateDossier({ companyName: e.target.value })}
                    placeholder="Tên công ty / đơn vị..."
                    className={input}
                  />
                </label>
                <label className="block text-xs font-medium">
                  [02]. Mã số thuế
                  <input
                    value={currentDossier.taxCode}
                    onChange={(e) => updateDossier({ taxCode: e.target.value })}
                    placeholder="Mã số thuế..."
                    className={input}
                  />
                </label>

                <label className="block text-xs font-medium sm:col-span-3">
                  [03]. Địa chỉ trụ sở chính
                  <input
                    value={currentDossier.businessAddress}
                    onChange={(e) => updateDossier({ businessAddress: e.target.value })}
                    placeholder="Nhập địa chỉ trụ sở chính trên GPKD..."
                    className={input}
                  />
                </label>

                <label className="block text-xs font-medium sm:col-span-3">
                  [04]. Địa chỉ liên hệ (để trống nếu giống địa chỉ trụ sở chính)
                  <input
                    value={currentDossier.contactAddress}
                    onChange={(e) => updateDossier({ contactAddress: e.target.value })}
                    placeholder="Nhập địa chỉ liên hệ..."
                    className={input}
                  />
                </label>

                <label className="block text-xs font-medium sm:col-span-2">
                  [05]. Địa chỉ thư điện tử (Email)
                  <input
                    value={currentDossier.email}
                    onChange={(e) => updateDossier({ email: e.target.value })}
                    placeholder="VD: ketoan@congty.vn"
                    className={input}
                  />
                </label>
                <label className="block text-xs font-medium">
                  [06]. Số điện thoại liên hệ
                  <input
                    value={currentDossier.phone}
                    onChange={(e) => updateDossier({ phone: e.target.value })}
                    placeholder="VD: 0909..."
                    className={input}
                  />
                </label>

                <label className="block text-xs font-medium sm:col-span-2">
                  [07]. Người đại diện (Họ và tên người đại diện pháp luật)
                  <input
                    value={currentDossier.legalRepName}
                    onChange={(e) => updateDossier({ legalRepName: e.target.value })}
                    placeholder="Họ và tên Giám đốc / Người đại diện..."
                    className={input}
                  />
                </label>
                <label className="block text-xs font-medium">
                  [08]. Số định danh cá nhân (CCCD của Người đại diện)
                  <input
                    value={currentDossier.legalRepCccd}
                    onChange={(e) => updateDossier({ legalRepCccd: e.target.value })}
                    placeholder="12 chữ số CCCD..."
                    className={input}
                  />
                </label>

                <label className="block text-xs font-medium">
                  [09]. Loại hình đơn vị
                  <input
                    value={currentDossier.unitType || ''}
                    onChange={(e) => updateDossier({ unitType: e.target.value })}
                    placeholder="VD: Công ty TNHH / Công ty Cổ phần..."
                    className={input}
                  />
                </label>
                <label className="block text-xs font-medium">
                  [10]. Ngành kinh tế
                  <input
                    value={currentDossier.businessField || ''}
                    onChange={(e) => updateDossier({ businessField: e.target.value })}
                    placeholder="VD: Thương mại dịch vụ / Xây dựng..."
                    className={input}
                  />
                </label>
                <label className="block text-xs font-medium">
                  [11]. Đối tượng tham gia
                  <input
                    value={currentDossier.participantCategory || ''}
                    onChange={(e) => updateDossier({ participantCategory: e.target.value })}
                    placeholder="VD: Người lao động / Người quản lý DN..."
                    className={input}
                  />
                </label>

                <div className="block text-xs font-medium sm:col-span-3">
                  <span>[12]. Phương thức đóng khác:</span>
                  <div className="mt-1.5 flex flex-wrap gap-6 rounded-lg border bg-white px-3 py-2">
                    {(['Hằng tháng', '03 tháng', '06 tháng'] as const).map((method) => (
                      <label key={method} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="tk3-payment-method"
                          checked={(currentDossier.paymentMethod || 'Hằng tháng') === method}
                          onChange={() => updateDossier({ paymentMethod: method })}
                        />
                        <span>{method}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className="block text-xs font-medium sm:col-span-3">
                  [13]. Đăng ký tham gia tại cơ quan BHXH
                  <input
                    value={currentDossier.agencyName}
                    onChange={(e) => updateDossier({ agencyName: e.target.value })}
                    placeholder="VD: Bảo hiểm xã hội Cơ sở Hậu Nghĩa / BHXH TP. Cần Thơ..."
                    className={input}
                  />
                </label>

                <label className="block text-xs font-medium sm:col-span-3">
                  [14]. Nội dung thay đổi, yêu cầu
                  <textarea
                    rows={2}
                    value={currentDossier.changeRequestContent || ''}
                    onChange={(e) => updateDossier({ changeRequestContent: e.target.value })}
                    placeholder="VD: Đăng ký tham gia BHXH, BHYT, BHTN lần đầu cho đơn vị (hoặc nội dung điều chỉnh thông tin...)"
                    className={input}
                  />
                </label>

                <label className="block text-xs font-medium sm:col-span-2">
                  Địa danh ký tờ khai (in ở góc phải dưới)
                  <input
                    value={currentDossier.signLocation || 'Cần Thơ'}
                    onChange={(e) => updateDossier({ signLocation: e.target.value })}
                    placeholder="VD: Cần Thơ"
                    className={input}
                  />
                </label>
                <label className="block text-xs font-medium">
                  Ngày ký tờ khai
                  <input
                    type="date"
                    value={currentDossier.signDate || new Date().toISOString().slice(0, 10)}
                    onChange={(e) => updateDossier({ signDate: e.target.value })}
                    className={input}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Thanh nút Xuất File Gửi Khách */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleExportMonthlyExcel()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <FileSpreadsheet size={17} />
              Xuất Excel Báo cáo BHXH tháng {reportMonth.slice(5, 7)}/{reportMonth.slice(0, 4)} (Gửi khách)
            </button>
            <button
              type="button"
              onClick={() => void handleExportTk3Word()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <FileText size={17} />
              Xuất Mẫu TK3-TS Word (.doc) chuẩn QĐ 366
            </button>
            <button
              type="button"
              onClick={() => void handleExportTk3Excel()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600 bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              <FileSpreadsheet size={17} />
              Xuất Mẫu TK3-TS Excel (.xlsx)
            </button>
          </div>
          <span className="text-xs text-gray-500">
            Tự động lưu vào thư mục máy (<code>D:\Taskmanager</code>) & tải xuống trình duyệt.
          </span>
        </div>
      </section>

      {/* Thống kê tổng hợp tiền đóng BHXH trong tháng & Cú pháp chuyển khoản */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-gray-500">Số lao động tham gia</p>
          <p className="mt-1 text-lg font-bold text-gray-800">{activeTotals.count} người</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-gray-500">Tổng quỹ lương BHXH</p>
          <p className="mt-1 text-lg font-bold text-gray-800">{fmtMoney(activeTotals.salary)} đ</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-gray-500">
            NLĐ đóng (
            {currentDossier.targetKind === 'legal_representative'
              ? '0%'
              : currentDossier.targetKind === 'foreign_workers'
                ? '9.5%'
                : '10.5%'}
            )
          </p>
          <p className="mt-1 text-lg font-bold text-blue-700">{fmtMoney(activeTotals.empTotal)} đ</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-gray-500">
            Công ty đóng (
            {currentDossier.targetKind === 'legal_representative'
              ? '29.5%'
              : currentDossier.targetKind === 'foreign_workers'
                ? '20.5%'
                : '21.5%'}
            )
          </p>
          <p className="mt-1 text-lg font-bold text-amber-700">{fmtMoney(activeTotals.compTotal)} đ</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium text-emerald-900">
            Tổng phải nộp (
            {currentDossier.targetKind === 'legal_representative'
              ? '29.5%'
              : currentDossier.targetKind === 'foreign_workers'
                ? '30%'
                : '32%'}
            )
          </p>
          <p className="mt-1 text-lg font-bold text-emerald-700">{fmtMoney(activeTotals.grandTotal)} đ</p>
        </div>
      </div>

      {/* Cú pháp đóng tiền */}
      <div className="rounded-xl border bg-white p-3.5 text-xs space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-gray-700">Cú pháp đóng tiền định kỳ: </span>
            <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-emerald-800">{paymentSyntax}</code>
          </div>
          <button
            type="button"
            onClick={() => copyText(paymentSyntax)}
            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-50"
          >
            {copiedSyntax ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            {copiedSyntax ? 'Đã chép' : 'Chép cú pháp'}
          </button>
        </div>
        <div className="text-gray-500">
          <span className="font-medium">Đóng BHXH lần đầu để cấp mã: </span>
          <code className="rounded bg-gray-50 px-1.5 py-0.5 font-mono">{firstTimeSyntax}</code>
        </div>
      </div>

      {/* Bảng danh sách Người lao động của Đơn vị */}
      <section className="rounded-xl border bg-white p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Users size={18} className="text-emerald-600" />
              Danh sách lao động của đơn vị ({currentDossier.employees.length} người)
            </h3>
            <p className="text-xs text-gray-500">
              Thêm/sửa trực tiếp trên bảng hoặc nạp từ file Excel. Bấm biểu tượng thẻ 💳 để gán nhân sự sang công cụ Kiểm tra hạn thẻ BHYT.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingEmp(createEmptyEmployee())}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus size={16} /> Thêm người lao động
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="border-b px-2.5 py-2">TT</th>
                <th className="border-b px-2.5 py-2">Đóng</th>
                <th className="border-b px-3 py-2">Họ & Tên</th>
                <th className="border-b px-2.5 py-2">Mã số BHXH</th>
                <th className="border-b px-2.5 py-2">Ngày sinh</th>
                <th className="border-b px-2.5 py-2 text-right">Lương đóng</th>
                <th className="border-b px-2.5 py-2 text-right">NLĐ đóng</th>
                <th className="border-b px-2.5 py-2 text-right">Công ty đóng</th>
                <th className="border-b px-2.5 py-2 text-right">Tổng cộng</th>
                <th className="border-b px-2.5 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {currentDossier.employees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-sm text-gray-500">
                    Chưa có danh sách người lao động cho đơn vị này. Bấm <strong>&ldquo;Thêm người lao động&rdquo;</strong> hoặc <strong>&ldquo;Nạp từ file Excel/CSV có sẵn&rdquo;</strong> để bắt đầu.
                  </td>
                </tr>
              ) : (
                currentDossier.employees.map((emp, idx) => {
                  const calc = calculateEmployeeContribution(emp, currentDossier.targetKind);
                  return (
                    <tr
                      key={emp.id}
                      className={`border-b last:border-0 ${emp.active ? 'hover:bg-gray-50' : 'bg-gray-50/70 opacity-60'}`}
                    >
                      <td className="px-2.5 py-2 text-xs text-gray-500">{idx + 1}</td>
                      <td className="px-2.5 py-2">
                        <input
                          type="checkbox"
                          checked={emp.active}
                          onChange={() => toggleEmployeeActive(emp.id)}
                          title="Đang đóng trong tháng"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-gray-800">{emp.fullName}</div>
                        <div className="text-xs text-gray-500">
                          {emp.gender || '—'} · {emp.position || 'Chưa rõ chức vụ'}
                          {emp.changeMonth ? ` · Tăng/giảm: ${emp.changeMonth}` : ''}
                        </div>
                      </td>
                      <td className="px-2.5 py-2 font-mono text-xs">{emp.bhxhCode || 'Chưa có sổ'}</td>
                      <td className="px-2.5 py-2 text-xs">{emp.dob || '—'}</td>
                      <td className="px-2.5 py-2 text-right font-medium">{fmtMoney(calc.salary)}</td>
                      <td className="px-2.5 py-2 text-right text-blue-700">{fmtMoney(calc.empTotal)}</td>
                      <td className="px-2.5 py-2 text-right text-amber-700">{fmtMoney(calc.compTotal)}</td>
                      <td className="px-2.5 py-2 text-right font-bold text-emerald-700">
                        {fmtMoney(calc.grandTotal)}
                      </td>
                      <td className="px-2.5 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => assignEmployeeToBhytWatchlist(emp)}
                            title="Gán nhân sự này làm NLĐ đại diện kiểm tra hạn thẻ BHYT"
                            className="rounded border p-1.5 text-emerald-700 hover:bg-emerald-50"
                          >
                            <CreditCard size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingEmp({ ...emp })}
                            title="Sửa thông tin chi tiết (CCCD, HĐLĐ, Nơi ở, Chủ hộ...)"
                            className="rounded border p-1.5 text-gray-700 hover:bg-gray-100"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeEmployee(emp.id)}
                            title="Xóa nhân sự"
                            className="rounded border p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal thêm / sửa chi tiết người lao động (bao gồm thông tin báo tăng/giảm & chủ hộ gia đình) */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3">
          <section
            role="dialog"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 space-y-4"
          >
            <header className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">
                Thông tin chi tiết Người lao động · {currentDossier.companyName || 'Đơn vị'}
              </h3>
              <button type="button" onClick={() => setEditingEmp(null)} className="text-gray-500 hover:text-gray-800">
                <X size={20} />
              </button>
            </header>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs font-medium sm:col-span-2">
                Họ & Tên người lao động *
                <input
                  value={editingEmp.fullName}
                  onChange={(e) => setEditingEmp({ ...editingEmp, fullName: e.target.value })}
                  placeholder="VD: Nguyễn Văn A"
                  className={input}
                />
              </label>
              <label className="block text-xs font-medium">
                Giới tính
                <select
                  value={editingEmp.gender}
                  onChange={(e) => setEditingEmp({ ...editingEmp, gender: e.target.value })}
                  className={input}
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </label>

              <label className="block text-xs font-medium">
                Mã số sổ BHXH (10 số)
                <input
                  value={editingEmp.bhxhCode}
                  onChange={(e) => setEditingEmp({ ...editingEmp, bhxhCode: e.target.value })}
                  placeholder="Để trống nếu chưa có sổ"
                  className={input}
                />
              </label>
              <label className="block text-xs font-medium">
                Ngày/tháng/năm sinh
                <input
                  value={editingEmp.dob}
                  onChange={(e) => setEditingEmp({ ...editingEmp, dob: e.target.value })}
                  placeholder="VD: 15/05/1993"
                  className={input}
                />
              </label>
              <label className="block text-xs font-medium">
                Chức vụ - Phòng ban
                <input
                  value={editingEmp.position}
                  onChange={(e) => setEditingEmp({ ...editingEmp, position: e.target.value })}
                  placeholder="VD: Nhân viên kinh doanh / Giám đốc"
                  className={input}
                />
              </label>

              <label className="block text-xs font-medium">
                Lương cơ bản (đồng) *
                <input
                  type="number"
                  value={editingEmp.baseSalary}
                  onChange={(e) => setEditingEmp({ ...editingEmp, baseSalary: Number(e.target.value) || 0 })}
                  className={input}
                />
              </label>
              <label className="block text-xs font-medium">
                Phụ cấp lương (đồng)
                <input
                  type="number"
                  value={editingEmp.allowance}
                  onChange={(e) => setEditingEmp({ ...editingEmp, allowance: Number(e.target.value) || 0 })}
                  className={input}
                />
              </label>
              <label className="block text-xs font-medium">
                Tổng lương tham gia BHXH
                <input
                  readOnly
                  value={fmtMoney((Number(editingEmp.baseSalary) || 0) + (Number(editingEmp.allowance) || 0))}
                  className={`${input} bg-gray-50 font-semibold`}
                />
              </label>

              <label className="block text-xs font-medium">
                Số CCCD / ĐDCN
                <input
                  value={editingEmp.cccd}
                  onChange={(e) => setEditingEmp({ ...editingEmp, cccd: e.target.value })}
                  className={input}
                />
              </label>
              <label className="block text-xs font-medium">
                Ngày cấp CCCD
                <input
                  value={editingEmp.cccdDate}
                  onChange={(e) => setEditingEmp({ ...editingEmp, cccdDate: e.target.value })}
                  placeholder="DD/MM/YYYY"
                  className={input}
                />
              </label>
              <label className="block text-xs font-medium">
                Số điện thoại NLĐ
                <input
                  value={editingEmp.phone}
                  onChange={(e) => setEditingEmp({ ...editingEmp, phone: e.target.value })}
                  className={input}
                />
              </label>

              <label className="block text-xs font-medium sm:col-span-2">
                Nơi ở hiện tại
                <input
                  value={editingEmp.address}
                  onChange={(e) => setEditingEmp({ ...editingEmp, address: e.target.value })}
                  className={input}
                />
              </label>
              <label className="block text-xs font-medium">
                Bệnh viện KCB lần đầu
                <input
                  value={editingEmp.hospital}
                  onChange={(e) => setEditingEmp({ ...editingEmp, hospital: e.target.value })}
                  placeholder="Tên BV đăng ký KCB"
                  className={input}
                />
              </label>

              <label className="block text-xs font-medium">
                Số Hợp đồng lao động (HĐLĐ)
                <input
                  value={editingEmp.contractNo}
                  onChange={(e) => setEditingEmp({ ...editingEmp, contractNo: e.target.value })}
                  placeholder="VD: 01.26/HĐLĐ"
                  className={input}
                />
              </label>
              <label className="block text-xs font-medium">
                Ngày ký HĐLĐ
                <input
                  value={editingEmp.contractDate}
                  onChange={(e) => setEditingEmp({ ...editingEmp, contractDate: e.target.value })}
                  placeholder="VD: 02/01/2026"
                  className={input}
                />
              </label>
              <label className="block text-xs font-medium">
                Tăng / giảm từ tháng
                <input
                  value={editingEmp.changeMonth}
                  onChange={(e) => setEditingEmp({ ...editingEmp, changeMonth: e.target.value })}
                  placeholder="VD: Tăng T11/2026"
                  className={input}
                />
              </label>
            </div>

            <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700">
                Trường hợp NLĐ chưa có số sổ BHXH (Thông tin chủ hộ gia đình) & Báo giảm:
              </p>
              <div className="grid gap-3 sm:grid-cols-4">
                <label className="block text-xs">
                  Họ tên Chủ hộ
                  <input
                    value={editingEmp.householdHeadName}
                    onChange={(e) => setEditingEmp({ ...editingEmp, householdHeadName: e.target.value })}
                    className={input}
                  />
                </label>
                <label className="block text-xs">
                  CCCD Chủ hộ
                  <input
                    value={editingEmp.householdHeadCccd}
                    onChange={(e) => setEditingEmp({ ...editingEmp, householdHeadCccd: e.target.value })}
                    className={input}
                  />
                </label>
                <label className="block text-xs">
                  Ngày sinh Chủ hộ
                  <input
                    value={editingEmp.householdHeadDob}
                    onChange={(e) => setEditingEmp({ ...editingEmp, householdHeadDob: e.target.value })}
                    className={input}
                  />
                </label>
                <label className="block text-xs">
                  Địa chỉ hộ khẩu
                  <input
                    value={editingEmp.householdHeadAddress}
                    onChange={(e) => setEditingEmp({ ...editingEmp, householdHeadAddress: e.target.value })}
                    className={input}
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 pt-1">
                <label className="block text-xs">
                  Ngày báo giảm BH
                  <input
                    value={editingEmp.decreaseDate}
                    onChange={(e) => setEditingEmp({ ...editingEmp, decreaseDate: e.target.value })}
                    className={input}
                  />
                </label>
                <label className="block text-xs">
                  Văn bản báo giảm (QĐ nghỉ việc)
                  <input
                    value={editingEmp.decreaseDoc}
                    onChange={(e) => setEditingEmp({ ...editingEmp, decreaseDoc: e.target.value })}
                    className={input}
                  />
                </label>
                <label className="block text-xs">
                  Ghi chú trên bảng báo cáo
                  <input
                    value={editingEmp.note}
                    onChange={(e) => setEditingEmp({ ...editingEmp, note: e.target.value })}
                    className={input}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingEmp(null)} className={button}>
                Hủy
              </button>
              <button
                type="button"
                onClick={saveEmployeeModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Save size={15} /> Lưu thông tin nhân sự
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
