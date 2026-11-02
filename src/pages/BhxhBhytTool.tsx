import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Play,
  RefreshCw,
  Save,
  Search,
  Upload,
  AlertTriangle,
  HelpCircle,
  UserCheck
} from 'lucide-react';
import ClientSelect from '../components/ClientSelect';
import {
  BHXH_BHYT_LOOKUP_SOURCE,
  bhxhLookupRequest
} from '../lib/bhxhLookup';
import type {
  BhytLookupQuery,
  BhytLookupResult,
  BhytValidityStatus,
  LookupResponse
} from '../lib/bhxhLookup';
import type { BhxhClient } from '../lib/bhxhLedger';
import { bhxhUnitKindLabel } from '../lib/bhxhUnits';
import { saveFileToPreferredDirectory } from '../lib/fileStorage';

const STORAGE_KEY = 'taskflow_bhxh_bhyt_profiles_v1';
const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50';

export interface BhytUnitProfile {
  key: string;
  unitCode: string;
  clientName: string;
  txtMaThe: string;
  txtHoTen: string;
  txtNgaySinh: string;
  note: string;
  updatedAt: string;
  lastResult?: BhytLookupResult;
}

interface WatchUnitItem {
  key: string;
  clientId: string;
  clientName: string;
  taxCode: string;
  unitId: string;
  unitCode: string;
  unitKindLabel: string;
  displayLabel: string;
}

type QueueFilter = 'configured' | 'unchecked_month' | 'attention' | 'all';

function loadStoredProfiles(): Record<string, BhytUnitProfile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, BhytUnitProfile>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveStoredProfiles(profiles: Record<string, BhytUnitProfile>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // Ignore storage quota errors
  }
}

function findProfileForUnit(profiles: Record<string, BhytUnitProfile>, item: WatchUnitItem): BhytUnitProfile | undefined {
  if (profiles[item.key]) return profiles[item.key];
  if (item.unitCode) {
    const byCode = Object.values(profiles).find(
      (p) => p.unitCode && p.unitCode.trim().toUpperCase() === item.unitCode.trim().toUpperCase()
    );
    if (byCode) return byCode;
  }
  return undefined;
}

function isConfigured(profile?: BhytUnitProfile): boolean {
  return Boolean(profile?.txtMaThe.trim() && profile?.txtHoTen.trim() && profile?.txtNgaySinh.trim());
}

function isCheckedThisMonth(profile?: BhytUnitProfile): boolean {
  if (!profile?.lastResult?.checkedAt) return false;
  const currentYm = new Date().toISOString().slice(0, 7);
  return profile.lastResult.checkedAt.slice(0, 7) === currentYm;
}

function statusBadge(status?: BhytValidityStatus) {
  if (status === 'valid') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        <CheckCircle2 size={13} /> Còn giá trị
      </span>
    );
  }
  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
        <AlertTriangle size={13} /> Hết hạn / Ngừng
      </span>
    );
  }
  if (status === 'not_found') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        <HelpCircle size={13} /> Không tìm thấy / Sai TT
      </span>
    );
  }
  if (status === 'checked') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
        Đã kiểm tra
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
      Chưa kiểm tra
    </span>
  );
}

export default function BhxhBhytTool({
  clients,
  initialClientId = '',
  usingExtension,
  onUsingExtension
}: {
  clients: BhxhClient[];
  initialClientId?: string;
  usingExtension: boolean;
  onUsingExtension: () => void;
}) {
  const [profiles, setProfiles] = useState<Record<string, BhytUnitProfile>>(loadStoredProfiles);
  const [selectedKey, setSelectedKey] = useState('');
  const [query, setQuery] = useState<BhytLookupQuery>({ txtMaThe: '', txtHoTen: '', txtNgaySinh: '' });
  const [note, setNote] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [lastCheckedUnit, setLastCheckedUnit] = useState<{ label: string; query: BhytLookupQuery; result: BhytLookupResult } | null>(null);

  const session = useRef('');
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  const captchaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialSelectionApplied = useRef(false);

  const unitItems = useMemo<WatchUnitItem[]>(() => {
    const activeClients = clients.filter((c) => !c.archived && c.participating !== false);
    const items: WatchUnitItem[] = [];
    for (const client of activeClients) {
      const activeUnits = (client.units || []).filter((u) => u.is_active && u.code.trim());
      if (activeUnits.length > 0) {
        for (const unit of activeUnits) {
          const code = unit.code.trim().toUpperCase();
          const kindLabel = bhxhUnitKindLabel(unit.kind);
          items.push({
            key: `${client.id}:${unit.id}`,
            clientId: client.id,
            clientName: client.name,
            taxCode: client.tax_code || '',
            unitId: unit.id,
            unitCode: code,
            unitKindLabel: kindLabel,
            displayLabel: `${client.name} · ${code} (${kindLabel})`
          });
        }
      } else {
        const fallbackCode = (client.ins_code || '').trim().toUpperCase();
        items.push({
          key: `${client.id}:default`,
          clientId: client.id,
          clientName: client.name,
          taxCode: client.tax_code || '',
          unitId: '',
          unitCode: fallbackCode,
          unitKindLabel: fallbackCode ? 'Mã mặc định' : 'Chưa gắn mã ĐV',
          displayLabel: `${client.name}${fallbackCode ? ` · ${fallbackCode}` : ' · Chưa gắn mã ĐV'}`
        });
      }
    }
    return items;
  }, [clients]);

  const filteredItems = useMemo(() => {
    const keyword = searchFilter.trim().toLocaleLowerCase('vi');
    return unitItems.filter((item) => {
      const prof = findProfileForUnit(profiles, item);
      if (queueFilter === 'configured' && !isConfigured(prof)) return false;
      if (queueFilter === 'unchecked_month' && (!isConfigured(prof) || isCheckedThisMonth(prof))) return false;
      if (queueFilter === 'attention') {
        const st = prof?.lastResult?.status;
        if (st !== 'expired' && st !== 'not_found') return false;
      }
      if (!keyword) return true;
      const hay = `${item.clientName} ${item.taxCode} ${item.unitCode} ${prof?.txtHoTen || ''} ${prof?.txtMaThe || ''}`.toLocaleLowerCase('vi');
      return hay.includes(keyword);
    });
  }, [unitItems, profiles, queueFilter, searchFilter]);

  const configuredUnits = useMemo(
    () => unitItems.filter((item) => isConfigured(findProfileForUnit(profiles, item))),
    [unitItems, profiles]
  );

  const selectedUnit = useMemo(
    () => unitItems.find((item) => item.key === selectedKey) || null,
    [unitItems, selectedKey]
  );

  function selectUnit(key: string, focusCaptcha = false) {
    setSelectedKey(key);
    setError('');
    const item = unitItems.find((u) => u.key === key);
    if (!item) {
      setQuery({ txtMaThe: '', txtHoTen: '', txtNgaySinh: '' });
      setNote('');
      return;
    }
    const prof = findProfileForUnit(profiles, item);
    setQuery({
      txtMaThe: prof?.txtMaThe || '',
      txtHoTen: prof?.txtHoTen || '',
      txtNgaySinh: prof?.txtNgaySinh || ''
    });
    setNote(prof?.note || '');
    if (focusCaptcha) {
      window.setTimeout(() => captchaInputRef.current?.focus(), 30);
    }
  }

  useEffect(() => {
    if (initialSelectionApplied.current || !unitItems.length) return;
    initialSelectionApplied.current = true;
    const byInitialClient = initialClientId
      ? unitItems.find((u) => u.clientId === initialClientId)
      : undefined;
    const firstConfigured = unitItems.find((u) => isConfigured(findProfileForUnit(profiles, u)));
    const target = byInitialClient || firstConfigured || unitItems[0];
    if (target) {
      selectUnit(target.key);
    }
  }, [unitItems, initialClientId, profiles]);

  async function request(payload: Record<string, unknown>, signal: AbortSignal) {
    const response = await bhxhLookupRequest({ ...payload, session: session.current }, signal);
    if (response.viaExtension) onUsingExtension();
    if (response.session) {
      session.current = response.session;
      setReady(true);
    }
    return response;
  }

  async function perform(work: (signal: AbortSignal) => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    const active = new AbortController();
    controller.current = active;
    try {
      await work(active.signal);
    } catch (cause) {
      if (!active.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Chưa thực hiện được tra cứu hạn thẻ BHYT.');
      }
    } finally {
      running.current = false;
      if (!active.signal.aborted) setBusy(false);
    }
  }

  function accept(response: LookupResponse) {
    if (response.error) throw new Error(response.error);
    return response;
  }

  async function refreshCaptcha(signal: AbortSignal) {
    setCaptcha('');
    setCode('');
    const response = accept(await request({ action: 'captcha' }, signal));
    setCaptcha(response.captcha || '');
  }

  async function initialize(signal: AbortSignal) {
    setCaptcha('');
    setCode('');
    session.current = '';
    setReady(false);
    const response = accept(await request({ action: 'init' }, signal));
    setCaptcha(response.captcha || '');
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void perform(initialize), 0);
    return () => {
      window.clearTimeout(timer);
      controller.current?.abort();
    };
  }, []);

  function persistUnitProfile(
    unit: WatchUnitItem,
    nextQuery: BhytLookupQuery,
    nextNote: string,
    nextResult?: BhytLookupResult
  ) {
    setProfiles((prev) => {
      const existing = findProfileForUnit(prev, unit);
      const updated: Record<string, BhytUnitProfile> = {
        ...prev,
        [unit.key]: {
          key: unit.key,
          unitCode: unit.unitCode,
          clientName: unit.clientName,
          txtMaThe: nextQuery.txtMaThe.trim().toUpperCase(),
          txtHoTen: nextQuery.txtHoTen.trim(),
          txtNgaySinh: nextQuery.txtNgaySinh.trim(),
          note: nextNote.trim(),
          updatedAt: new Date().toISOString(),
          lastResult: nextResult ?? existing?.lastResult
        }
      };
      saveStoredProfiles(updated);
      return updated;
    });
  }

  function handleSaveRepresentative() {
    if (!selectedUnit) {
      setError('Vui lòng chọn một công ty / mã đơn vị trước khi lưu thông tin người lao động.');
      return;
    }
    if (!query.txtMaThe.trim() || !query.txtHoTen.trim() || !query.txtNgaySinh.trim()) {
      setError('Nhập đủ Mã số BHXH/Mã thẻ BHYT, Họ tên và Ngày/năm sinh để lưu thông tin người lao động đại diện.');
      return;
    }
    persistUnitProfile(selectedUnit, query, note);
    setError('');
    setStatusMessage(`Đã lưu thông tin NLĐ đại diện (${query.txtHoTen.trim()}) cho ${selectedUnit.displayLabel}.`);
    window.setTimeout(() => captchaInputRef.current?.focus(), 30);
  }

  function moveStep(delta: number) {
    const pool = filteredItems.length > 0 ? filteredItems : unitItems;
    if (!pool.length) return;
    const currentIndex = pool.findIndex((item) => item.key === selectedKey);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + delta + pool.length) % pool.length;
    selectUnit(pool[nextIndex].key, true);
  }

  function startSequentialRun() {
    const unchecked = unitItems.filter((item) => {
      const prof = findProfileForUnit(profiles, item);
      return isConfigured(prof) && !isCheckedThisMonth(prof);
    });
    const targetPool = unchecked.length > 0 ? unchecked : configuredUnits;
    if (!targetPool.length) {
      setError('Chưa có mã đơn vị nào được thiết lập thông tin người lao động đại diện. Hãy chọn đơn vị và nhập Mã số BHXH, Họ tên, Ngày/năm sinh trước.');
      return;
    }
    setAutoAdvance(true);
    selectUnit(targetPool[0].key, true);
    setStatusMessage(
      `Đang bắt đầu kiểm tra tuần tự (${targetPool.length} mã đơn vị). Chỉ cần gõ 5 ký tự mã xác nhận rồi nhấn Enter!`
    );
  }

  async function submitLookup(event: FormEvent) {
    event.preventDefault();
    const cleanMaThe = query.txtMaThe.trim().toUpperCase();
    const cleanHoTen = query.txtHoTen.trim();
    const cleanNgaySinh = query.txtNgaySinh.trim();
    const cleanCode = code.trim();

    if (!/^[A-Z0-9]{10,15}$/.test(cleanMaThe)) {
      setError('Nhập Mã số BHXH (10 chữ số) hoặc Mã thẻ BHYT (15 ký tự).');
      return;
    }
    if (!cleanHoTen) {
      setError('Nhập Họ và tên người lao động.');
      return;
    }
    if (!/^(?:\d{4}|\d{2}\/\d{2}\/\d{4})$/.test(cleanNgaySinh)) {
      setError('Nhập Ngày sinh (DD/MM/YYYY, ví dụ 15/05/1993) hoặc Năm sinh (4 chữ số, ví dụ 1993).');
      return;
    }
    if (!/^[A-Za-z0-9]{5}$/.test(cleanCode)) {
      setError('Nhập đủ 5 ký tự trong ảnh mã xác nhận.');
      return;
    }

    const activeUnit = selectedUnit;
    const cleanQuery: BhytLookupQuery = {
      txtMaThe: cleanMaThe,
      txtHoTen: cleanHoTen,
      txtNgaySinh: cleanNgaySinh
    };

    if (activeUnit) {
      persistUnitProfile(activeUnit, cleanQuery, note);
    }

    await perform(async (signal) => {
      setStatusMessage('');
      const response = await request(
        {
          action: 'bhyt_search',
          ...cleanQuery,
          tokenRecaptch: cleanCode
        },
        signal
      );

      if (response.bhytResult) {
        const bhytResult = response.bhytResult;
        setLastCheckedUnit({
          label: activeUnit ? activeUnit.displayLabel : `${cleanHoTen} (${cleanMaThe})`,
          query: cleanQuery,
          result: bhytResult
        });
        if (activeUnit) {
          persistUnitProfile(activeUnit, cleanQuery, note, bhytResult);
        }

        if (autoAdvance && activeUnit) {
          const queuePool = filteredItems.filter((item) =>
            item.key === activeUnit.key || isConfigured(findProfileForUnit(profiles, item))
          );
          const idx = queuePool.findIndex((item) => item.key === activeUnit.key);
          if (idx >= 0 && idx + 1 < queuePool.length) {
            const nextUnit = queuePool[idx + 1];
            selectUnit(nextUnit.key, false);
            setStatusMessage(
              `✓ Đã lưu kết quả của "${activeUnit.displayLabel}". Tự động chuyển sang (${idx + 2}/${queuePool.length}): "${nextUnit.displayLabel}" — Nhập mã xác nhận mới rồi bấm Enter.`
            );
          } else if (queuePool.length > 0) {
            setStatusMessage(
              `🎉 Đã hoàn thành kiểm tra đơn vị cuối cùng trong danh sách (${queuePool.length}/${queuePool.length}): "${activeUnit.displayLabel}"!`
            );
          }
        } else if (activeUnit) {
          setStatusMessage(`✓ Đã cập nhật kết quả hạn thẻ BHYT cho "${activeUnit.displayLabel}".`);
        }
      }

      try {
        await refreshCaptcha(signal);
      } catch (cause) {
        if (response.error) {
          throw new Error(`${response.error} Chưa tải được mã mới; hãy tải lại công cụ.`);
        }
        throw cause;
      }

      window.setTimeout(() => captchaInputRef.current?.focus(), 40);
      accept(response);
    });
  }

  async function handleExportProfiles() {
    const payload = JSON.stringify(profiles, null, 2);
    const filename = `taskflow-bhyt-watchlist-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const savedToDir = await saveFileToPreferredDirectory(filename, payload, 'application/json');
      if (savedToDir) {
        setStatusMessage(`Đã lưu file cấu hình "${filename}" trực tiếp vào thư mục lưu trữ đã kết nối.`);
        return;
      }
    } catch {
      // Fallback to browser download
    }
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage(`Đã tải xuống file sao lưu "${filename}".`);
  }

  async function handleImportProfiles(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, BhytUnitProfile>;
      if (!parsed || typeof parsed !== 'object') throw new Error('File cấu hình không hợp lệ.');
      const merged = { ...profiles, ...parsed };
      setProfiles(merged);
      saveStoredProfiles(merged);
      if (selectedUnit) {
        const prof = findProfileForUnit(merged, selectedUnit);
        if (prof) {
          setQuery({ txtMaThe: prof.txtMaThe, txtHoTen: prof.txtHoTen, txtNgaySinh: prof.txtNgaySinh });
          setNote(prof.note || '');
        }
      }
      setStatusMessage(`Đã nhập thành công ${Object.keys(parsed).length} cấu hình người lao động đại diện.`);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đọc được file cấu hình JSON.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const validCount = unitItems.filter((u) => findProfileForUnit(profiles, u)?.lastResult?.status === 'valid').length;
  const expiredOrErrorCount = unitItems.filter((u) => {
    const st = findProfileForUnit(profiles, u)?.lastResult?.status;
    return st === 'expired' || st === 'not_found';
  }).length;
  const checkedThisMonthCount = unitItems.filter((u) => isCheckedThisMonth(findProfileForUnit(profiles, u))).length;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800">Kiểm tra hạn thẻ BHYT theo Mã đơn vị</h2>
            {usingExtension && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                ✓ Tiện ích mở rộng
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Mỗi mã đơn vị gắn 1 người lao động đại diện còn đang làm việc. Tự động điền thông tin và nhảy sang đơn vị kế tiếp sau mỗi lần nhập CAPTCHA.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startSequentialRun}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Play size={15} /> Chạy tuần tự ({configuredUnits.length} mã đã gán NLĐ)
          </button>
          <a href={BHXH_BHYT_LOOKUP_SOURCE} target="_blank" rel="noopener noreferrer" className={button}>
            <ExternalLink size={16} /> Mở trang nguồn BHYT
          </a>
        </div>
      </header>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-gray-500">Đã gán NLĐ đại diện</p>
          <p className="mt-1 text-lg font-bold text-gray-800">
            {configuredUnits.length} / {unitItems.length} <span className="text-xs font-normal text-gray-500">mã ĐV</span>
          </p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-gray-500">Đã kiểm tra tháng này</p>
          <p className="mt-1 text-lg font-bold text-blue-700">
            {checkedThisMonthCount} / {configuredUnits.length} <span className="text-xs font-normal text-gray-500">mã ĐV</span>
          </p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-gray-500">Thẻ còn giá trị</p>
          <p className="mt-1 text-lg font-bold text-emerald-700">{validCount} đơn vị</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-gray-500">Hết hạn / Cần kiểm tra lại</p>
          <p className={`mt-1 text-lg font-bold ${expiredOrErrorCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>
            {expiredOrErrorCount} đơn vị
          </p>
        </div>
      </div>

      {statusMessage && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
          {statusMessage}
        </div>
      )}

      {/* Form tra cứu & tự động nạp thông tin NLĐ */}
      <form onSubmit={submitLookup} className="space-y-4 rounded-xl border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <label className="flex items-center gap-2 text-sm font-medium text-emerald-900 cursor-pointer">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Tự động chuyển sang mã đơn vị kế tiếp sau khi tra cứu thành công (chế độ gõ CAPTCHA + Enter liên hoàn)
          </label>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => moveStep(-1)} disabled={busy || !unitItems.length} className={button} title="Đơn vị trước">
              <ChevronLeft size={15} /> Đơn vị trước
            </button>
            <button type="button" onClick={() => moveStep(1)} disabled={busy || !unitItems.length} className={button} title="Bỏ qua, qua đơn vị kế">
              Qua đơn vị kế <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <fieldset disabled={busy} className="space-y-4">
          {unitItems.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium sm:col-span-2">
                Chọn Công ty / Mã đơn vị BHXH (tự động điền thông tin NLĐ đại diện)
                <ClientSelect
                  aria-label="Chọn đơn vị kiểm tra hạn thẻ BHYT"
                  value={selectedKey}
                  onChange={(e) => selectUnit(e.target.value, true)}
                  className={input}
                >
                  <option value="">-- Nhập lẻ không gắn đơn vị --</option>
                  {unitItems.map((item) => {
                    const prof = findProfileForUnit(profiles, item);
                    const tag = isConfigured(prof)
                      ? `✓ NLĐ: ${prof!.txtHoTen} (${prof!.txtMaThe})`
                      : 'Chưa gán NLĐ';
                    return (
                      <option key={item.key} value={item.key} data-search={`${item.taxCode} ${item.unitCode} ${prof?.txtHoTen || ''}`}>
                        {item.displayLabel} — [{tag}]
                      </option>
                    );
                  })}
                </ClientSelect>
              </label>
              <label className="block text-sm font-medium">
                Ghi chú NLĐ đại diện (tháng/phòng ban)
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Đang làm T11/2026"
                  className={input}
                />
              </label>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium">
              Mã số BHXH / Mã thẻ BHYT *
              <input
                required
                value={query.txtMaThe}
                maxLength={15}
                onChange={(e) => setQuery((prev) => ({ ...prev, txtMaThe: e.target.value.toUpperCase() }))}
                placeholder="VD: 7912345678 hoặc DN479..."
                className={input}
              />
            </label>
            <label className="block text-sm font-medium">
              Họ và tên NLĐ đại diện *
              <input
                required
                value={query.txtHoTen}
                maxLength={120}
                onChange={(e) => setQuery((prev) => ({ ...prev, txtHoTen: e.target.value }))}
                placeholder="VD: Nguyễn Văn A"
                className={input}
              />
            </label>
            <label className="block text-sm font-medium">
              Ngày sinh hoặc Năm sinh *
              <input
                required
                value={query.txtNgaySinh}
                maxLength={10}
                onChange={(e) => setQuery((prev) => ({ ...prev, txtNgaySinh: e.target.value }))}
                placeholder="VD: 15/05/1993 hoặc 1993"
                className={input}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-end gap-3">
              <label className="block text-sm font-medium">
                Mã xác nhận * (gõ 5 ký tự + nhấn Enter)
                <input
                  ref={captchaInputRef}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={5}
                  minLength={5}
                  pattern="[A-Za-z0-9]{5}"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="5 ký tự"
                  className={`${input} max-w-48 font-semibold tracking-wider`}
                />
              </label>
              {captcha ? (
                <img
                  src={captcha}
                  alt="Mã xác nhận tra cứu BHYT"
                  className="h-12 max-w-48 rounded border bg-white object-contain"
                />
              ) : (
                <span className="text-sm text-gray-500">
                  {busy ? 'Đang tải mã xác nhận…' : 'Chưa có ảnh mã xác nhận'}
                </span>
              )}
              <button
                type="button"
                onClick={() => void perform(refreshCaptcha)}
                disabled={busy || !ready}
                className={button}
              >
                <RefreshCw size={15} /> Đổi mã
              </button>
            </div>

            {selectedUnit && (
              <button
                type="button"
                onClick={handleSaveRepresentative}
                disabled={busy}
                className={`${button} text-emerald-800 border-emerald-300 hover:bg-emerald-50`}
              >
                <Save size={15} /> Lưu thông tin NLĐ cho đơn vị này
              </button>
            )}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || !captcha}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Search size={16} />
              {busy
                ? 'Đang kiểm tra…'
                : autoAdvance && selectedUnit
                  ? 'Tra cứu & Qua đơn vị kế (Enter)'
                  : 'Tra cứu hạn thẻ'}
            </button>
            <button type="button" onClick={() => void perform(initialize)} disabled={busy} className={button}>
              <RefreshCw size={16} /> Tải lại công cụ
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Mẹo: Khi bấm <strong>Tra cứu</strong>, thông tin NLĐ của đơn vị đang chọn sẽ tự động được lưu lại cho tháng sau.
          </p>
        </div>

        {error && (
          <div role="alert" className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{error}</span>
              <a
                href={BHXH_BHYT_LOOKUP_SOURCE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium underline hover:text-red-900"
              >
                <ExternalLink size={14} /> Mở trang nguồn BHYT
              </a>
            </div>
          </div>
        )}
      </form>

      {/* Kết quả của đơn vị vừa kiểm tra xong */}
      {lastCheckedUnit && (
        <section
          aria-label="Kết quả kiểm tra hạn thẻ BHYT"
          className="space-y-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-800">
                Kết quả vừa tra cứu: {lastCheckedUnit.label}
              </h3>
              <p className="text-xs text-gray-500">
                NLĐ: <strong>{lastCheckedUnit.query.txtHoTen}</strong> · Mã BHXH/Thẻ:{' '}
                <strong>{lastCheckedUnit.query.txtMaThe}</strong> · Ngày/năm sinh:{' '}
                <strong>{lastCheckedUnit.query.txtNgaySinh}</strong> · Lúc{' '}
                {new Date(lastCheckedUnit.result.checkedAt).toLocaleString('vi-VN', {
                  timeZone: 'Asia/Ho_Chi_Minh'
                })}
              </p>
            </div>
            {statusBadge(lastCheckedUnit.result.status)}
          </div>

          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800 space-y-1.5">
            {lastCheckedUnit.result.lines.map((line, idx) => (
              <p key={idx} className="leading-relaxed">
                {line}
              </p>
            ))}
          </div>

          {lastCheckedUnit.result.tables.map((table, index) => (
            <div key={index} className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {table.headers.map((header, column) => (
                      <th key={column} scope="col" className="border-b px-3 py-2 whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b last:border-0">
                      {row.map((cell, column) => (
                        <td key={column} className="min-w-28 px-3 py-2 align-top whitespace-pre-wrap break-words">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}

      {/* Bảng danh sách Mã đơn vị & Người lao động đại diện */}
      <section className="space-y-3 rounded-xl border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <UserCheck size={18} className="text-emerald-600" />
              Danh sách Mã đơn vị & Người lao động đại diện ({filteredItems.length} đơn vị)
            </h3>
            <p className="text-xs text-gray-500">
              Bấm vào bất kỳ dòng nào để nạp nhanh thông tin người lao động của đơn vị đó lên khung tra cứu phía trên.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => void handleImportProfiles(e)}
            />
            <button type="button" onClick={() => void handleExportProfiles()} className={button}>
              <Download size={15} /> Sao lưu file (.json)
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className={button}>
              <Upload size={15} /> Nhập từ file (.json)
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-gray-600">
            Lọc danh sách đơn vị
            <select
              value={queueFilter}
              onChange={(e) => setQueueFilter(e.target.value as QueueFilter)}
              className={input}
            >
              <option value="all">Tất cả mã đơn vị ({unitItems.length})</option>
              <option value="configured">Đã gán NLĐ đại diện ({configuredUnits.length})</option>
              <option value="unchecked_month">
                Đã gán NLĐ nhưng chưa kiểm tra tháng này ({configuredUnits.length - checkedThisMonthCount})
              </option>
              <option value="attention">Hết hạn / Không tìm thấy ({expiredOrErrorCount})</option>
            </select>
          </label>
          <label className="block text-xs text-gray-600">
            Tìm theo tên công ty, MST, mã đơn vị hoặc tên NLĐ
            <input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Gõ tên công ty, mã ĐV, tên NLĐ..."
              className={input}
            />
          </label>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="border-b px-3 py-2">Công ty & Mã đơn vị</th>
                <th className="border-b px-3 py-2">NLĐ đại diện (Mã BHXH · Họ tên · Năm sinh)</th>
                <th className="border-b px-3 py-2">Trạng thái hạn thẻ gần nhất</th>
                <th className="border-b px-3 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-sm text-gray-500">
                    Không có đơn vị nào trong bộ lọc này.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const prof = findProfileForUnit(profiles, item);
                  const active = item.key === selectedKey;
                  const configured = isConfigured(prof);
                  return (
                    <tr
                      key={item.key}
                      onClick={() => selectUnit(item.key, true)}
                      className={`cursor-pointer border-b last:border-0 transition-colors ${
                        active ? 'bg-emerald-50/80' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-semibold text-gray-800">{item.clientName}</div>
                        <div className="text-xs text-emerald-800">
                          {item.unitCode || 'Chưa có mã ĐV'} · {item.unitKindLabel} · MST {item.taxCode}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        {configured ? (
                          <div>
                            <div className="font-medium text-gray-800">
                              {prof!.txtHoTen}{' '}
                              <span className="text-xs font-normal text-gray-500">({prof!.txtNgaySinh})</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              Mã số: <strong>{prof!.txtMaThe}</strong>
                              {prof!.note ? ` · ${prof!.note}` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs italic text-amber-700">
                            Chưa thiết lập NLĐ đại diện (Bấm chọn để nhập)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex flex-col items-start gap-1">
                          {statusBadge(prof?.lastResult?.status)}
                          {prof?.lastResult && (
                            <>
                              <p className="text-xs text-gray-700 line-clamp-2 max-w-md">
                                {prof.lastResult.summary}
                              </p>
                              <span className="text-[11px] text-gray-400">
                                KT lúc:{' '}
                                {new Date(prof.lastResult.checkedAt).toLocaleString('vi-VN', {
                                  timeZone: 'Asia/Ho_Chi_Minh'
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectUnit(item.key, true);
                          }}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                            active
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {active ? 'Đang chọn' : configured ? 'Chọn tra cứu' : 'Thiết lập NLĐ'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
