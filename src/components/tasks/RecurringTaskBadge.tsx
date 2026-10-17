import { CalendarClock } from 'lucide-react';
import { recurringDateLabel } from '../../lib/recurringTasks';

export function RecurringTaskBadge({ task }: { task: any }) {
  if (!task.recurring_template_id) return null;
  return <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-800"><CalendarClock size={12} /> Định kỳ · {recurringDateLabel(task.recurring_for)}</span>;
}
