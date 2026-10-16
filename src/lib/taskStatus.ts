export function statusAfterFiling(status: string, dossierCode?: string | null): string {
  return status === 'received' && dossierCode?.trim() ? 'in_progress' : status;
}
