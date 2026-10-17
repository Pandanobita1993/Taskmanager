import { supabase } from './supabase';

// Fetch at export time, scoped to selected staff. Pagination prevents older tasks disappearing after 1,000 records.
export async function loadReportTasks(staff: { id?: string; name: string }[]) {
  const identities = [...new Set(staff.flatMap(user => [user.id, user.name]).filter((value): value is string => !!value))];
  if (!identities.length) throw new Error('Không xác định được nhân sự xuất báo cáo.');
  const tasks = new Map<string, any>();
  const size = 500;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await supabase.from('tasks')
      .select('*, clients(name, contact_name, contact_phone, tax_code)')
      .in('user_id', identities).order('created_at', { ascending: true }).order('id', { ascending: true })
      .range(offset, offset + size - 1);
    if (error) throw new Error(`Không tải đủ công việc để xuất báo cáo: ${error.message}`);
    if (!data) throw new Error('Không nhận được dữ liệu công việc. Vui lòng xuất lại báo cáo.');
    data.forEach(task => tasks.set(task.id, task));
    if (data.length < size) break;
  }
  return [...tasks.values()];
}
