import type { UserProfile } from './profile';

type StaffIdentity = Pick<UserProfile, 'id' | 'fullName'>;
const names = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });

export function clientOrderKey(profile: StaffIdentity) {
  return `task_manager_client_order:${encodeURIComponent(profile.id || profile.fullName)}`;
}

export function readClientOrder(profile: StaffIdentity): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(clientOrderKey(profile)) || '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [];
  } catch {
    return [];
  }
}

export function orderClients<T extends { id: string; name: string }>(clients: T[], order: string[]): T[] {
  const positions = new Map<string, number>();
  order.forEach((id, index) => { if (!positions.has(id)) positions.set(id, index); });
  return [...clients].sort((a, b) => {
    const rankA = positions.get(a.id) ?? Infinity;
    const rankB = positions.get(b.id) ?? Infinity;
    if (rankA !== rankB) return rankA < rankB ? -1 : 1;
    return names.compare(a.name, b.name) || a.id.localeCompare(b.id);
  });
}

export function saveClientOrder(profile: StaffIdentity, visibleIds: string[], previousOrder: string[]): string[] {
  // Giữ các mã đang tạm ẩn / chuyển phân công để không mất lựa chọn khi xuất hiện lại.
  const order = visibleIds.length ? [...new Set([...visibleIds, ...previousOrder])] : [];
  localStorage.setItem(clientOrderKey(profile), JSON.stringify(order));
  return order;
}

export function moveClient(order: string[], id: string, destination: number): string[] {
  const index = order.indexOf(id);
  if (index === -1) return order;
  const next = [...order];
  next.splice(index, 1);
  next.splice(Math.max(0, Math.min(next.length, destination)), 0, id);
  return next;
}
