const ACCOUNTING_FIELDS = [
  'invoice_link', 'invoice_user', 'invoice_pass', 'tax_user', 'tax_pass',
  'acc_software', 'acc_version', 'acc_user', 'acc_pass',
  'accounting_fee', 'insurance_fee', 'fee_effective_month',
];
const INSURANCE_FIELDS = ['ins_software', 'ins_user', 'ins_pass'];

export function clientDetailUpdates(client: Record<string, any>, staffName: string) {
  const fields = [
    ...(client.accounting_person === staffName ? ACCOUNTING_FIELDS : []),
    ...(client.insurance_person === staffName ? INSURANCE_FIELDS : []),
  ];
  return Object.fromEntries(fields
    .filter(field => Object.prototype.hasOwnProperty.call(client, field))
    .map(field => [field, client[field]]));
}
