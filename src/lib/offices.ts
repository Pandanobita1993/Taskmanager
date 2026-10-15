export const OFFICES = ['Cần Thơ', 'Long An'] as const;
export type Office = typeof OFFICES[number];
export const DEFAULT_OFFICE: Office = 'Cần Thơ';

export function getOffice(value?: string | null): Office {
  return value === 'Long An' ? 'Long An' : DEFAULT_OFFICE;
}
