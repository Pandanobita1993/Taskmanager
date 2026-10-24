export const BHXH_UNIT_KINDS = [
  ['employees', 'Người lao động'], ['legal_representative', 'Đại diện pháp luật'], ['foreign_workers', 'Người nước ngoài'],
] as const;
export type BhxhUnitKind = typeof BHXH_UNIT_KINDS[number][0];
export interface BhxhUnit {
  id: string; client_id: string; kind: BhxhUnitKind | null; code: string; is_active: boolean; version: number;
  has_activity?: boolean; notes?: string;
}
export const bhxhUnitKindLabel = (kind: string | null | undefined) => BHXH_UNIT_KINDS.find(([key]) => key === kind)?.[1] || 'Chờ phân loại';
export const bhxhUnitLabel = (unit: Pick<BhxhUnit, 'kind' | 'code'>) => `${bhxhUnitKindLabel(unit.kind)} · ${unit.code || 'Chưa có mã'}`;
export function selectableBhxhUnits(units: BhxhUnit[] = []) { return units.filter(unit => unit.is_active && unit.code); }
export function soleBhxhUnit(units: BhxhUnit[] = []) { const active = selectableBhxhUnits(units); return active.length === 1 ? active[0] : null; }
// A retired code may later be reused. Only an explicit selection or a unique
// match can identify which independent ledger a C12 document belongs to.
export function matchBhxhImport(units: BhxhUnit[] = [], code: string | null, preferredId = '') {
  if (!code) return null;
  const matches = units.filter(unit => unit.code.trim().toUpperCase() === code.trim().toUpperCase());
  return matches.find(unit => unit.id === preferredId) || (matches.length === 1 ? matches[0] : null);
}
