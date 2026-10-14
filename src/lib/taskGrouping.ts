export interface ClientTaskGroup {
  clientId: string;
  clientName: string;
  taxCode: string;
  tasks: any[];
  hasUrgent: boolean;
  completedCount: number;
  failedCount: number;
}

export function groupTasksByClient(taskList: any[]): ClientTaskGroup[] {
  const map = new Map<string, ClientTaskGroup>();

  taskList.forEach((task) => {
    const clientId = task.client_id || task.clients?.id || 'internal_or_unknown';
    const clientName = task.clients?.name || 'Công việc nội bộ / Chưa gán khách';
    const taxCode = task.clients?.tax_code || '';

    if (!map.has(clientId)) {
      map.set(clientId, {
        clientId,
        clientName,
        taxCode,
        tasks: [],
        hasUrgent: false,
        completedCount: 0,
        failedCount: 0,
      });
    }

    const group = map.get(clientId)!;
    group.tasks.push(task);
    if (task.is_urgent) group.hasUrgent = true;
    if (task.status === 'completed') group.completedCount += 1;
    if (task.status === 'failed') group.failedCount += 1;
  });

  return Array.from(map.values()).sort((a, b) => {
    // Khách có việc gấp được ưu tiên hiển thị trước
    if (a.hasUrgent && !b.hasUrgent) return -1;
    if (!a.hasUrgent && b.hasUrgent) return 1;
    return a.clientName.localeCompare(b.clientName, 'vi');
  });
}
