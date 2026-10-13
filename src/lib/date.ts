import { format } from 'date-fns';

export const localDateKey = (date = new Date()) => format(date, 'yyyy-MM-dd');
