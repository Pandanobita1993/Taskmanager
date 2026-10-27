import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ExternalLink, RefreshCw, Search } from 'lucide-react';
import ClientSelect from '../components/ClientSelect';
import { BHXH_LOOKUP_SOURCE, bhxhLookupRequest } from '../lib/bhxhLookup';
import type { LookupQuery, LookupResponse, LookupResult } from '../lib/bhxhLookup';
import type { BhxhClient } from '../lib/bhxhLedger';

const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50';
const emptyQuery: LookupQuery = { MaBHXH: '', MaSoThue: '', MaDonVi: '', TenDonVi: '' };

export default function BhxhTools({ clients, initialClientId = '' }: { clients: BhxhClient[]; initialClientId?: string }) {
  const [clientId, setClientId] = useState('');
  const [query, setQuery] = useState<LookupQuery>(emptyQuery);
  const [captcha, setCaptcha] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [searched, setSearched] = useState<LookupQuery | null>(null);
  const session = useRef('');
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  const initialClientApplied = useRef(false);

  useEffect(() => {
    const client = clients.find(item => item.id === initialClientId);
    if (client && !initialClientApplied.current) {
      initialClientApplied.current = true;
      setClientId(client.id); setQuery(previous => ({ ...previous, MaSoThue: client.tax_code || '' }));
    }
  }, [clients, initialClientId]);

  async function request(payload: Record<string, unknown>, signal: AbortSignal) {
    const response = await bhxhLookupRequest({ ...payload, session: session.current }, signal);
    if (response.session) { session.current = response.session; setReady(true); }
    return response;
  }
  async function perform(work: (signal: AbortSignal) => Promise<void>) {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    const active = new AbortController(); controller.current = active;
    try { await work(active.signal); }
    catch (cause) { if (!active.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa thực hiện được tra cứu.'); }
    finally { running.current = false; if (!active.signal.aborted) setBusy(false); }
  }
  function accept(response: LookupResponse) {
    if (response.error) throw new Error(response.error);
    return response;
  }
  async function refreshCaptcha(signal: AbortSignal) {
    setCaptcha(''); setCode('');
    const response = accept(await request({ action: 'captcha' }, signal));
    setCaptcha(response.captcha || '');
  }
  async function initialize(signal: AbortSignal) {
    setCaptcha(''); setCode(''); setResult(null); setSearched(null);
    session.current = ''; setReady(false);
    const response = accept(await request({ action: 'init' }, signal));
    setCaptcha(response.captcha || '');
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void perform(initialize), 0);
    return () => { window.clearTimeout(timer); controller.current?.abort(); };
  }, []);

  function update(patch: Partial<LookupQuery>) {
    setQuery(previous => ({ ...previous, ...patch })); setResult(null); setSearched(null);
  }
  function chooseClient(value: string) {
    setClientId(value);
    const client = clients.find(item => item.id === value);
    update({ MaSoThue: client?.tax_code || '', MaDonVi: '', TenDonVi: '' });
  }
  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.MaSoThue.trim() || !/^\d{5}$/.test(query.MaBHXH.trim())) {
      setError('Nhập mã số thuế và mã cơ sở BHXH gồm 5 chữ số.'); return;
    }
    await perform(async signal => {
      setResult(null); setSearched(null);
      const response = await request({ action: 'search', ...query, tokenRecaptch: code.trim() }, signal);
      if (response.result) { setResult(response.result); setSearched({ ...query }); }
      // The official form also replaces its CAPTCHA after every search, including errors.
      try { await refreshCaptcha(signal); }
      catch (cause) {
        if (response.error) throw new Error(`${response.error} Chưa tải được mã mới; hãy tải lại công cụ.`);
        throw cause;
      }
      accept(response);
    });
  }
  function page(number: number) {
    void perform(async signal => {
      const response = accept(await request({ action: 'page', page: number }, signal));
      setResult(response.result || null);
    });
  }

  return <section className="space-y-4" aria-labelledby="bhxh-lookup-title">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="bhxh-lookup-title" className="text-lg font-bold text-gray-800">Tra cứu đơn vị tham gia BHXH</h2>
        <p className="mt-1 text-sm text-gray-600">Tra cứu thông tin đơn vị bằng mã số thuế và mã cơ sở BHXH quản lý.</p></div>
      <a href={BHXH_LOOKUP_SOURCE} target="_blank" rel="noopener noreferrer" className={button}><ExternalLink size={16} /> Mở trang nguồn</a>
    </header>
    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-950">Nhập MST, mã cơ sở BHXH và mã xác nhận trong ảnh rồi bấm Tra cứu.</div>
    <form onSubmit={search} className="space-y-4 rounded-xl border bg-white p-4 sm:p-5">
      <fieldset disabled={busy} className="space-y-4">
        {clients.length > 0 && <label className="block text-sm font-medium">Điền từ khách hàng
          <ClientSelect aria-label="Khách hàng tra cứu BHXH" value={clientId} onChange={event => chooseClient(event.target.value)} className={input}>
            <option value="">Nhập thông tin riêng</option>{clients.map(client => <option key={client.id} value={client.id} data-search={client.tax_code}>{client.name} · {client.tax_code || 'Chưa có MST'}</option>)}
          </ClientSelect></label>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Mã số thuế *<input required value={query.MaSoThue} inputMode="numeric" maxLength={14} pattern="[0-9]{10}([0-9]{2,3}|-[0-9]{3})?" onChange={event => update({ MaSoThue: event.target.value })} placeholder="VD: 1801821715" className={input} /></label>
          <label className="block text-sm font-medium">Mã cơ sở BHXH *<input required value={query.MaBHXH} inputMode="numeric" maxLength={5} minLength={5} pattern="[0-9]{5}" onChange={event => update({ MaBHXH: event.target.value })} placeholder="VD: 09200" className={input} /></label>
        </div>
        <p className="text-xs text-gray-500">Mã cơ sở gồm 5 chữ số, giữ cả số 0 ở đầu; đây là mã cơ quan quản lý, khác với mã đơn vị của doanh nghiệp.</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm font-medium">Mã xác nhận *<input required value={code} onChange={event => setCode(event.target.value)} maxLength={5} minLength={5} pattern="[A-Za-z0-9]{5}" autoComplete="off" spellCheck={false} className={`${input} max-w-44`} /></label>
          {captcha ? <img src={captcha} alt="Mã xác nhận tra cứu BHXH" className="h-12 max-w-48 rounded border bg-white object-contain" /> : <span className="text-sm text-gray-500">{busy ? 'Đang tải mã xác nhận…' : 'Chưa có ảnh mã xác nhận'}</span>}
          <button type="button" onClick={() => void perform(refreshCaptcha)} disabled={busy || !ready} className={button}><RefreshCw size={15} /> Đổi mã</button>
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || !captcha || !query.MaBHXH} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Search size={16} /> {busy ? 'Đang kết nối…' : 'Tra cứu'}</button>
        <button type="button" onClick={() => void perform(initialize)} disabled={busy} className={button}><RefreshCw size={16} /> Tải lại công cụ</button>
      </div>
      {busy && <p role="status" className="text-sm text-gray-500">Đang lấy dữ liệu từ cổng BHXH…</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </form>
    {result && <section aria-label="Kết quả tra cứu BHXH" aria-busy={busy} className="min-w-0 space-y-3 rounded-xl border bg-white p-4">
      <h3 className="font-semibold">Kết quả tra cứu · Trang {result.page}</h3>
      <p className="text-xs text-gray-500">MST: {searched?.MaSoThue} · Mã cơ sở: {searched?.MaBHXH} · Lúc {new Date(result.checkedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      {result.message && <p role="status" className="text-sm text-gray-700">{result.message}</p>}
      {result.tables.map((table, index) => <div key={index} className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr>{table.headers.map((header, column) => <th key={column} scope="col" className="border-b px-3 py-2 whitespace-nowrap">{header}</th>)}</tr></thead><tbody>{table.rows.length ? table.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b last:border-0">{row.map((cell, column) => <td key={column} className="min-w-28 px-3 py-2 align-top whitespace-pre-wrap break-words">{cell}</td>)}</tr>) : <tr><td colSpan={table.headers.length} className="p-3 text-gray-500">Không tìm thấy đơn vị phù hợp.</td></tr>}</tbody></table></div>)}
      {result.pages.length > 0 && <nav aria-label="Trang kết quả BHXH" className="flex flex-wrap gap-2">{[...new Set([1, result.page, ...result.pages])].sort((a, b) => a - b).map(number => <button key={number} type="button" disabled={busy || result.page === number} aria-current={result.page === number ? 'page' : undefined} onClick={() => page(number)} className={`${button} ${result.page === number ? 'bg-emerald-50 text-emerald-800' : ''}`}>Trang {number}</button>)}</nav>}
      <p className="text-xs text-gray-500">Nguồn: <a href={BHXH_LOOKUP_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">Cổng thông tin điện tử BHXH Việt Nam</a>.</p>
    </section>}
  </section>;
}
