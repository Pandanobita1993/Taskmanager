export function matchesClientSearch(text: string, query: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
  const haystack = normalize(text);
  return normalize(query).split(/\s+/).filter(Boolean).every(word => haystack.includes(word));
}
