import { supabase } from './supabase';
import type { DebtReportSource } from './debtReportData';

export async function loadDebtReportSource(staffIds: string[]): Promise<DebtReportSource> {
  const source: DebtReportSource = { available: true, loadedAt: new Date().toISOString(), clients: [], receivables: [], payments: [], payment_checks: [] };
  const ids = [...new Set(staffIds.filter(Boolean))];
  if (!ids.length) throw new Error('Không xác định được nhân sự để lấy dữ liệu công nợ.');
  const results = await Promise.all(ids.map(id => supabase.rpc('staff_management_portal', { p_staff_id: id })));
  if (results.some(result => result.error)) {
    source.available = false;
    source.warning = results.some(result => result.error?.code === 'PGRST202')
      ? 'Phần công nợ chưa được thiết lập. Chưa thể xác định số dư và trạng thái sếp xác minh.'
      : 'Không tải đủ dữ liệu công nợ. Số tiền và trạng thái xác minh được để trống để tránh hiểu nhầm.';
    return source;
  }
  for (const key of ['clients', 'receivables', 'payments', 'payment_checks'] as const) {
    const records = new Map<string, any>();
    results.forEach(result => {
      if (!Array.isArray(result.data?.[key])) throw new Error('Dữ liệu công nợ trả về chưa đầy đủ. Vui lòng thử xuất lại.');
      result.data[key].forEach((row: any) => records.set(key === 'payment_checks' ? row.task_id : row.id, row));
    });
    source[key] = [...records.values()];
  }
  source.loadedAt = new Date().toISOString();
  return source;
}
