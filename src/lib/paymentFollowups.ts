export const PAYMENT_KINDS = [
  ['bhxh', 'BHXH'], ['thue_gtgt', 'Thuế GTGT'], ['thue_tncn', 'Thuế TNCN'],
  ['thue_tndn', 'Thuế TNDN'], ['thue_khac', 'Thuế khác'],
] as const;
export type PaymentKind = typeof PAYMENT_KINDS[number][0];
export type PaymentStatus = 'pending' | 'notified' | 'promised' | 'paid' | 'cancelled';
export type PaymentAction = 'save' | 'notify' | 'promise' | 'paid' | 'reopen' | 'cancel';
export const PAYMENT_STATUSES: Record<PaymentStatus, string> = {
  pending: 'Chưa báo khách', notified: 'Đã báo · chờ đóng', promised: 'Khách hẹn đóng', paid: 'Đã đóng', cancelled: 'Ngừng theo dõi',
};
export interface FollowupClient { id: string; name: string; tax_code: string; contact_name: string | null; contact_phone: string | null; archived: boolean }
export interface PaymentFollowup {
  id: string; client_id: string; kind: PaymentKind; period: string; amount: number | null;
  due_on: string; next_reminder_on: string | null; status: PaymentStatus;
  promised_on: string | null; paid_on: string | null; payment_reference: string;
  last_notified_at: string | null; notification_count: number; notes: string; version: number;
  proof_file?: string; client_name: string; tax_code: string; client_archived: boolean;
}
export interface FollowupPortal {
  today: string; clients: FollowupClient[]; records: PaymentFollowup[];
  summary: { unpaid: number; attention: number; overdue: number };
}
export interface FollowupEvent {
  id: string; action: PaymentAction; actor_name: string; note: string; created_at: string;
  snapshot: PaymentFollowup;
}
export function addFollowupDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function paymentFollowupUrgency(row: Pick<PaymentFollowup, 'status' | 'due_on' | 'promised_on' | 'next_reminder_on'>, today: string) {
  if (row.status === 'paid' || row.status === 'cancelled') return null;
  if (row.due_on < today) return 'overdue';
  if (row.promised_on && row.promised_on < today) return 'promise_missed';
  if (row.next_reminder_on && row.next_reminder_on <= today) return 'reminder';
  if (row.due_on <= addFollowupDays(today, 3)) return 'due_soon';
  return null;
}
export const FOLLOWUP_URGENCY_LABELS = {
  overdue: 'Quá hạn đóng', promise_missed: 'Đã qua ngày khách hẹn', reminder: 'Đến ngày nhắc lại', due_soon: 'Đến hạn trong 3 ngày',
};
export const followupKindLabel = (kind: PaymentKind) => PAYMENT_KINDS.find(([key]) => key === kind)?.[1] || kind;
export const followupAmountLabel = (amount: number | null) => amount === null ? 'Chưa xác định số tiền' : `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
export const FOLLOWUP_ACTION_LABELS: Record<PaymentAction, string> = {
  save: 'Lưu thông tin khoản đóng', notify: 'Đã báo / nhắc khách', promise: 'Ghi nhận khách hẹn đóng',
  paid: 'Xác nhận đã đóng', reopen: 'Mở lại theo dõi', cancel: 'Ngừng theo dõi',
};
