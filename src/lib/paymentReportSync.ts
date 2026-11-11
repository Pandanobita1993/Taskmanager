import { followupAmountLabel, followupKindLabel } from './paymentFollowups.ts';
import type { PaymentAction, PaymentKind } from './paymentFollowups.ts';
import { recurringDateLabel } from './recurringTasks.ts';

export interface ReminderReportPayload {
  staffId: string;
  staffName: string;
  action: PaymentAction;
  form: {
    id: string;
    client_id: string;
    kind: PaymentKind;
    period: string;
    amount: string;
    due_on: string;
    notes: string;
    event_note: string;
  };
  client?: {
    contact_name?: string | null;
    contact_phone?: string | null;
  } | null;
  unitCode?: string;
  today: string;
  notificationCount?: number;
}

export interface BuildReminderTaskInput {
  action: PaymentAction;
  kind: PaymentKind;
  period: string;
  amount: string;
  dueOn: string;
  notes: string;
  eventNote: string;
  unitCode?: string;
  notificationCount?: number;
}

export function buildReminderTaskDetails({
  action,
  kind,
  period,
  amount,
  dueOn,
  notes,
  eventNote,
  unitCode,
  notificationCount = 0,
}: BuildReminderTaskInput) {
  const actionType = kind === 'bhxh' ? 'bhxh' : 'ke_toan';
  const kindLabel = followupKindLabel(kind);
  const cleanPeriod = period.trim();
  const parsedAmount = amount !== '' && /^\d{1,15}$/.test(amount) ? Number(amount) : null;
  const amountLabel = parsedAmount !== null ? followupAmountLabel(parsedAmount) : '';

  const prefix = action === 'notify'
    ? `Nhắc khách đóng ${kindLabel}${notificationCount > 0 ? ` (lần ${notificationCount})` : ''}`
    : `Thông báo nhắc khách đóng ${kindLabel}`;

  const contentParts = [prefix, cleanPeriod];
  if (unitCode) contentParts.push(`Mã ĐV: ${unitCode}`);
  if (amountLabel) contentParts.push(amountLabel);

  const taskNotes = [
    `Tự động ghi nhận từ mục ${kind === 'bhxh' ? 'Nhắc khách đóng BHXH' : 'Theo dõi thuế'}`,
    notes.trim(),
  ].filter(Boolean).join(' | ');

  const defaultResult = action === 'notify'
    ? 'Đã báo / nhắc khách đóng tiền'
    : 'Đã tạo thông báo nhắc khách đóng tiền';
  const resolutionNote = [
    eventNote.trim() || defaultResult,
    dueOn ? `Hạn đóng: ${recurringDateLabel(dueOn)}` : '',
  ].filter(Boolean).join(' · ');

  return {
    actionType,
    kindLabel,
    content: contentParts.join(' · '),
    notes: taskNotes,
    resolutionNote,
  };
}

export function isSameDayReminderTask(
  taskContent: string | null | undefined,
  period: string,
  kindLabel: string,
  unitCode?: string,
) {
  const normalizedContent = String(taskContent || '').toLowerCase();
  const periodNorm = period.trim().toLowerCase();
  if (!periodNorm) return false;
  const isReminder = normalizedContent.startsWith('thông báo nhắc khách đóng')
    || normalizedContent.startsWith('nhắc khách đóng');
  if (!isReminder || !normalizedContent.includes(periodNorm)) return false;
  if (unitCode) return normalizedContent.includes(unitCode.toLowerCase());
  return normalizedContent.includes(kindLabel.toLowerCase());
}

export async function syncReminderToWorkReport(
  payload: ReminderReportPayload,
  db: any,
): Promise<{ synced: boolean; mode: 'created' | 'updated' }> {
  const {
    staffId,
    staffName,
    action,
    form,
    client,
    unitCode,
    today,
    notificationCount = 0,
  } = payload;

  const details = buildReminderTaskDetails({
    action,
    kind: form.kind,
    period: form.period,
    amount: form.amount,
    dueOn: form.due_on,
    notes: form.notes,
    eventNote: form.event_note,
    unitCode,
    notificationCount,
  });

  const userIds = [staffId, staffName].filter(Boolean);
  const nowIso = new Date().toISOString();

  const { data: existingToday, error: lookupError } = await db
    .from('tasks')
    .select('id, content')
    .eq('client_id', form.client_id)
    .eq('intake_date', today)
    .eq('action_type', details.actionType)
    .in('user_id', userIds)
    .limit(30);

  const matched = !lookupError && Array.isArray(existingToday)
    ? existingToday.find((row: any) => isSameDayReminderTask(row.content, form.period, details.kindLabel, unitCode))
    : null;

  if (matched?.id) {
    const { error: updateError } = await db
      .from('tasks')
      .update({
        content: details.content,
        notes: details.notes,
        resolution_note: details.resolutionNote,
        status: 'completed',
        completed_at: nowIso,
      })
      .eq('id', matched.id);
    if (updateError) throw updateError;
    return { synced: true, mode: 'updated' };
  }

  const contactPerson =
    client?.contact_name?.trim()
    || (client?.contact_phone ? `Liên hệ (${client.contact_phone})` : '')
    || 'Người liên hệ cty';

  const { error: insertError } = await db.from('tasks').insert([{
    type: 'normal',
    client_id: form.client_id,
    user_id: staffId || staffName,
    status: 'completed',
    task_category: 'main',
    action_type: details.actionType,
    contact_person: contactPerson,
    content: details.content,
    notes: details.notes,
    resolution_note: details.resolutionNote,
    intake_date: today,
    completed_at: nowIso,
  }]);

  if (insertError) throw insertError;
  return { synced: true, mode: 'created' };
}
