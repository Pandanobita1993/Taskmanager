import type { BhxhUnit, BhxhUnitKind } from './bhxhUnits';
export interface BhxhClient { id: string; name: string; tax_code: string; ins_code: string | null; archived: boolean; participating?: boolean; units?: BhxhUnit[] }
export interface BhxhPeriod {
  unit_id?: string; unit_code?: string; unit_kind?: BhxhUnitKind | null;
  id: string; client_id: string; client_name: string; tax_code: string; period_on: string;
  opening_override: number | null; opening_reason: string; opening_balance: number | null;
  opening_source: 'manual' | 'previous' | 'missing'; charges: number | null; paid_total: number;
  payment_count: number; closing_balance: number | null; notes: string; source_filename: string; version: number;
  // A current-month draft has no recorded charges yet. Saved periods always have charges.
  is_current_draft?: boolean;
}
export interface BhxhPayment {
  unit_id?: string; unit_code?: string; unit_kind?: BhxhUnitKind | null;
  id: string; client_id: string; client_name: string; paid_on: string; amount: number; reference: string;
  notes: string; is_void: boolean; void_reason: string; version: number;
  proof_file?: string; reporter_name?: string;
}
export interface BhxhPortal { can_manage_bhxh?: boolean; today: string; clients: BhxhClient[]; periods: BhxhPeriod[]; payments: BhxhPayment[] }
export interface BhxhEvent {
  request_id: string; entity_type: 'period' | 'payment'; action: 'save' | 'void' | 'restore';
  actor_name: string; created_at: string; note: string; snapshot: Record<string, any>;
}
export const bhxhMoney = (value: number | null) => value == null ? 'Thiếu thông tin' : `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
export const bhxhMonthLabel = (value: string) => `${value.slice(5, 7)}/${value.slice(0, 4)}`;
export function missingCurrentBhxhC12(portal: BhxhPortal) {
  const current = portal.today.slice(0, 7);
  const updated = new Set(portal.periods
    .filter(row => row.period_on.slice(0, 7) === current && row.charges != null && !row.is_current_draft)
    .map(row => `${row.client_id}:${row.unit_id || ''}`));
  return portal.clients.filter(client => !client.archived && client.participating !== false)
    .flatMap(client => (client.units || [])
      .filter(unit => unit.is_active && unit.code.trim() && !updated.has(`${client.id}:${unit.id}`))
      .map(unit => ({ client_id: client.id, client_name: client.name, unit_id: unit.id })));
}
export function bhxhReminderMonth(value: string) {
  const match = value.trim().match(/^(?:Tháng\s+)?(0?[1-9]|1[0-2])\s*\/\s*(\d{4})$/i);
  return match ? `${match[2]}-${match[1].padStart(2, '0')}` : /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : '';
}
export function bhxhSuggestedAmount(periods: BhxhPeriod[], clientId: string, month: string, unitId = '') {
  const row = periods.find(period => period.client_id === clientId && (period.unit_id || '') === unitId && period.period_on.slice(0, 7) === month.slice(0, 7));
  const amount = row?.closing_balance;
  // Unknown input never silently becomes zero; credits are not an amount to collect.
  return amount == null ? '' : String(Math.max(amount, 0));
}
export function previousBhxhMonth(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])(?:-01)?$/.test(value)) return '';
  const date = new Date(`${value.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 10);
}
export function previewBhxhPeriod(periods: BhxhPeriod[], payments: BhxhPayment[], clientId: string, month: string, override: string, charges: string, unitId = '') {
  if (!previousBhxhMonth(month)) return { opening: null, paid: 0, closing: null };
  const previous = periods.find(row => row.client_id === clientId && (row.unit_id || '') === unitId && row.period_on === previousBhxhMonth(month));
  const opening = override === '' ? previous?.closing_balance ?? null : /^-?\d{1,15}$/.test(override) ? Number(override) : null;
  const paid = payments.filter(row => row.client_id === clientId && (row.unit_id || '') === unitId && !row.is_void && row.paid_on.slice(0, 7) === month.slice(0, 7)).reduce((sum, row) => sum + row.amount, 0);
  return { opening, paid, closing: opening == null || !/^-?\d{1,15}$/.test(charges) ? null : opening + Number(charges) - paid };
}

// Offer the current month only after its immediate predecessor exists. Do not
// write guessed zero charges to the ledger or create historical/future months.
export function withCurrentBhxhDrafts(portal: BhxhPortal): BhxhPeriod[] {
  const current = `${portal.today.slice(0, 7)}-01`;
  const previous = previousBhxhMonth(current);
  if (!previous) return [...portal.periods];
  const currentClients = new Set(portal.periods.filter(row => row.period_on === current).map(row => `${row.client_id}:${row.unit_id || ''}`));
  const clients = new Map(portal.clients.map(client => [client.id, client]));
  const added: BhxhPeriod[] = [];
  for (const prior of portal.periods) {
    const client = clients.get(prior.client_id);
    if (prior.period_on !== previous || currentClients.has(`${prior.client_id}:${prior.unit_id || ''}`) || !client || client.archived || client.participating === false || (prior.unit_id && !client.units?.some(u => u.id === prior.unit_id && u.is_active && u.code))) continue;
    const paid = portal.payments.filter(row => row.client_id === prior.client_id && (row.unit_id || '') === (prior.unit_id || '') && !row.is_void && row.paid_on.slice(0, 7) === current.slice(0, 7));
    added.push({
      id: `current-draft:${prior.client_id}:${prior.unit_id || ''}:${current}`, client_id: prior.client_id,
      unit_id: prior.unit_id, unit_code: prior.unit_code, unit_kind: prior.unit_kind, client_name: client.name, tax_code: client.tax_code, period_on: current,
      opening_override: null, opening_reason: '', opening_balance: prior.closing_balance,
      opening_source: prior.closing_balance == null ? 'missing' : 'previous', charges: null,
      paid_total: paid.reduce((sum, row) => sum + row.amount, 0), payment_count: paid.length,
      closing_balance: null, notes: '', source_filename: '', version: 0, is_current_draft: true,
    });
    currentClients.add(`${prior.client_id}:${prior.unit_id || ''}`);
  }
  return [...portal.periods, ...added].sort((a, b) => b.period_on.localeCompare(a.period_on) || a.client_name.localeCompare(b.client_name, 'vi'));
}
