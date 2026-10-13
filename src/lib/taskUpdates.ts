import { supabase } from './supabase';
import type { UserProfile } from './profile';

export interface TaskUpdateLog {
  id: string;
  task_id: string;
  changed_by_id?: string | null;
  changed_by_name: string;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  created_at: string;
}

export const TASK_FIELD_LABELS: Record<string, string> = {
  content: 'Nội dung công việc',
  contact_person: 'Người liên hệ',
  info_provided: 'Thông tin đã cung cấp',
  info_pending: 'Thông tin còn thiếu',
  notes: 'Ghi chú',
  dossier_code: 'Mã hồ sơ điện tử',
  dossier_progress: 'Tiến độ hồ sơ',
  is_urgent: 'Đánh dấu việc gấp',
  status: 'Trạng thái',
  resolution_note: 'Kết quả / lý do',
  completed_at: 'Thời điểm hoàn thành',
  proof_file: 'Ảnh bằng chứng',
  proof_image: 'Ảnh bằng chứng cũ',
};

export async function updateTaskWithLog(
  taskId: string,
  changes: Record<string, unknown>,
  profile: UserProfile | null,
  action: string,
) {
  const { data, error } = await supabase.rpc('update_task_with_log', {
    p_task_id: taskId,
    p_changes: changes,
    p_changed_by_id: profile?.id || null,
    p_changed_by_name: profile?.fullName || 'Hệ thống',
    p_action: action,
  });

  if (error) throw error;
  return data;
}

export async function fetchTaskUpdateLogs(taskId: string): Promise<TaskUpdateLog[]> {
  const { data, error } = await supabase
    .from('task_update_logs')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as TaskUpdateLog[];
}
