export interface RecurringSchedule {
  frequency: 'monthly' | 'weekly' | 'daily';
  month_day: number;
  week_day: number;
  start_on: string;
  end_on: string;
}

export const WEEK_DAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
export const RECURRING_DOMAINS = [
  ['ke_toan', 'Kế toán'], ['bhxh', 'BHXH'], ['nop_ho_so', 'GPKD / Setup'],
  ['ra_soat', 'Rà soát'], ['dau_tu', 'Đầu tư'], ['khac', 'Khác'],
] as const;

export function vietnamToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}

export const recurringDateLabel = (value?: string) => value ? value.slice(0, 10).split('-').reverse().join('/') : '—';

// Preview only. The database is authoritative for dates and duplicate prevention.
export function nextRecurringDate(schedule: RecurringSchedule, today: string) {
  const from = schedule.start_on > today ? schedule.start_on : today;
  const date = new Date(`${from}T00:00:00Z`);
  if (!from || Number.isNaN(date.getTime())) return null;
  if (schedule.frequency === 'weekly') {
    if (!Number.isInteger(schedule.week_day) || schedule.week_day < 1 || schedule.week_day > 7) return null;
    date.setUTCDate(date.getUTCDate() + (schedule.week_day - (date.getUTCDay() || 7) + 7) % 7);
  } else if (schedule.frequency === 'monthly') {
    if (!Number.isInteger(schedule.month_day) || schedule.month_day < 1 || schedule.month_day > 31) return null;
    const candidate = (year: number, month: number) => new Date(Date.UTC(year, month, Math.min(schedule.month_day, new Date(Date.UTC(year, month + 1, 0)).getUTCDate())));
    let next = candidate(date.getUTCFullYear(), date.getUTCMonth());
    if (next < date) next = candidate(date.getUTCFullYear(), date.getUTCMonth() + 1);
    return !schedule.end_on || next.toISOString().slice(0, 10) <= schedule.end_on ? next.toISOString().slice(0, 10) : null;
  } else if (schedule.frequency !== 'daily') return null;
  const day = date.toISOString().slice(0, 10);
  return !schedule.end_on || day <= schedule.end_on ? day : null;
}

export function recurringScheduleLabel(schedule: RecurringSchedule) {
  return schedule.frequency === 'monthly' ? `Ngày ${schedule.month_day} hằng tháng`
    : schedule.frequency === 'weekly' ? `${WEEK_DAYS[schedule.week_day - 1]} hằng tuần` : 'Hằng ngày';
}

export function renderRecurringContent(content: string, day: string) {
  const [year, month] = day.split('-');
  return content.replaceAll('{{thang}}', month).replaceAll('{{nam}}', year).replaceAll('{{ngay}}', recurringDateLabel(day));
}
