export interface DebtReportSource {
  available: boolean;
  warning?: string;
  loadedAt: string;
  clients: any[];
  receivables: any[];
  payments: any[];
  payment_checks: any[];
}

export interface DebtReportOptions { startDate?: string; endDate?: string }

export const verificationLabels = {
  pending: 'Chưa xác minh',
  confirmed: 'Đã xác minh nhận tiền',
  not_received: 'Đã xác minh chưa nhận tiền',
  voided: 'Đã hủy xác nhận',
  unavailable: 'Chưa tải được dữ liệu xác minh',
};

interface DebtReportDetail {
  id: string; clientId: string; clientName: string; recordedAt: string; content: string;
  status: keyof typeof verificationLabels; verification: string; confirmedAmount: number | null;
  paymentDates: string[]; checkedAt: string; checkedBy: string; note: string;
}

function amount(value: unknown): number {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) throw new Error('Có khoản công nợ thiếu số tiền hợp lệ. Vui lòng kiểm tra dữ liệu trước khi xuất.');
  return Number(value);
}

function inPeriod(value: string, options: DebtReportOptions) {
  const day = value?.slice(0, 10);
  return !!day && (!options.startDate || day >= options.startDate) && (!options.endDate || day <= options.endDate);
}

export function buildDebtReportModel(source: DebtReportSource, tasks: any[], options: DebtReportOptions = {}) {
  const visibleClients = new Set(source.clients.map(client => client.id));
  const clients = new Map(source.clients.map(client => [client.id, client]));
  tasks.forEach(task => {
    if (task.client_id && !clients.has(task.client_id)) clients.set(task.client_id, { id: task.client_id, name: task.clients?.name || 'Khách hàng chưa xác định', tax_code: task.clients?.tax_code || '' });
  });
  const debts = source.available ? source.receivables.filter(row => !row.is_void) : [];
  const payments = source.available ? source.payments : [];
  const checks = new Map((source.available ? source.payment_checks : []).map(check => [check.task_id, check]));
  const paymentTasks = tasks.filter(task => task.type === 'payment' && inPeriod(task.intake_date || task.created_at, options));
  const clientIds = new Set([...tasks.map(task => task.client_id).filter(Boolean), ...debts.map(debt => debt.client_id)]);
  const detail: DebtReportDetail[] = paymentTasks.map(task => {
    const check = source.available ? checks.get(task.id) : null;
    const received = payments.filter(payment => payment.task_id === task.id && !payment.is_void);
    const status: keyof typeof verificationLabels = !source.available || !visibleClients.has(task.client_id) ? 'unavailable' : check?.status === 'confirmed' ? 'confirmed' : check?.status === 'not_received' ? 'not_received' : 'pending';
    return {
      id: `task:${task.id}`, clientId: task.client_id, clientName: clients.get(task.client_id)?.name || task.clients?.name || 'Khách hàng chưa xác định',
      recordedAt: task.intake_date || task.created_at, content: [task.content || task.payment_reason || 'Nhân viên báo thu', ...(task.paid_months || [])].filter(Boolean).join('\n'),
      status, verification: verificationLabels[status],
      confirmedAmount: status === 'confirmed' && received.length ? received.reduce((sum, payment) => sum + amount(payment.amount), 0) : null,
      paymentDates: [...new Set(received.map(payment => payment.payment_date).filter(Boolean))] as string[],
      checkedAt: check?.checked_at || '', checkedBy: check?.checked_by || '',
      note: [check?.note || '', status === 'confirmed' && !received.length ? 'Chưa có số tiền thực nhận được phân bổ.' : ''].filter(Boolean).join('\n'),
    };
  });
  payments.filter(payment => !payment.task_id && inPeriod(payment.payment_date, options)).forEach(payment => {
    const debt = source.receivables.find(row => row.id === payment.receivable_id);
    if (!debt) return;
    clientIds.add(debt.client_id);
    detail.push({
      id: `payment:${payment.id}`, clientId: debt.client_id, clientName: clients.get(debt.client_id)?.name || 'Khách hàng chưa xác định',
      recordedAt: payment.payment_date, content: `Sếp ghi nhận trực tiếp\n${debt.description || ''}`,
      status: payment.is_void ? 'voided' : 'confirmed', verification: verificationLabels[payment.is_void ? 'voided' : 'confirmed'],
      confirmedAmount: payment.is_void ? null : amount(payment.amount), paymentDates: [payment.payment_date],
      checkedAt: payment.created_at, checkedBy: payment.confirmed_by, note: payment.note || '',
    });
  });
  detail.sort((a, b) => (a.recordedAt || '').localeCompare(b.recordedAt || '') || a.id.localeCompare(b.id));

  const summary = [...clientIds].map(clientId => {
    const client = clients.get(clientId);
    const available = source.available && visibleClients.has(clientId);
    const items = debts.filter(debt => debt.client_id === clientId);
    const known = available && items.length > 0;
    const due = known ? items.reduce((sum, debt) => sum + amount(debt.amount), 0) : null;
    const paid = known ? items.reduce((sum, debt) => sum + (debt.paid == null ? payments.filter(p => p.receivable_id === debt.id && !p.is_void).reduce((total, p) => total + amount(p.amount), 0) : amount(debt.paid)), 0) : null;
    const clientDetail = detail.filter(row => row.clientId === clientId);
    const confirmations = [
      ...payments.filter(payment => !payment.is_void && items.some(debt => debt.id === payment.receivable_id))
        .map(payment => ({ checkedAt: payment.created_at, checkedBy: payment.confirmed_by })),
      ...[...checks.values()].filter(check => tasks.some(task => task.id === check.task_id && task.client_id === clientId))
        .map(check => ({ checkedAt: check.checked_at, checkedBy: check.checked_by })),
    ];
    const latest = confirmations.filter(row => row.checkedAt).sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0];
    return {
      clientId, name: client?.name || 'Khách hàng chưa xác định', taxCode: client?.tax_code || '', due, paid,
      remaining: known ? Math.max(0, due! - paid!) : null,
      pending: available ? clientDetail.filter(row => row.status === 'pending').length : null,
      status: !source.available ? 'Chưa tải được dữ liệu công nợ' : !available ? 'Không có dữ liệu công nợ trong phạm vi hiện tại' : !known ? 'Chưa nhập công nợ' : due! - paid! > 0 ? 'Còn phải thu' : 'Đã thu đủ khoản đã nhập',
      checkedAt: latest?.checkedAt || '', checkedBy: latest?.checkedBy || '',
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'vi') || a.clientId.localeCompare(b.clientId));
  return { summary, detail, available: source.available, warning: source.warning, loadedAt: source.loadedAt };
}
