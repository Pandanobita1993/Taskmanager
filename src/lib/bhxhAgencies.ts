import catalogue from './vietnamBanks.json' with { type: 'json' };

export const VIETNAM_PROVINCES = [
  ['01', 'Thành phố Hà Nội'], ['04', 'Tỉnh Cao Bằng'], ['08', 'Tỉnh Tuyên Quang'], ['11', 'Tỉnh Điện Biên'],
  ['12', 'Tỉnh Lai Châu'], ['14', 'Tỉnh Sơn La'], ['15', 'Tỉnh Lào Cai'], ['19', 'Tỉnh Thái Nguyên'],
  ['20', 'Tỉnh Lạng Sơn'], ['22', 'Tỉnh Quảng Ninh'], ['24', 'Tỉnh Bắc Ninh'], ['25', 'Tỉnh Phú Thọ'],
  ['31', 'Thành phố Hải Phòng'], ['33', 'Tỉnh Hưng Yên'], ['37', 'Tỉnh Ninh Bình'], ['38', 'Tỉnh Thanh Hóa'],
  ['40', 'Tỉnh Nghệ An'], ['42', 'Tỉnh Hà Tĩnh'], ['44', 'Tỉnh Quảng Trị'], ['46', 'Thành phố Huế'],
  ['48', 'Thành phố Đà Nẵng'], ['51', 'Tỉnh Quảng Ngãi'], ['52', 'Tỉnh Gia Lai'], ['56', 'Tỉnh Khánh Hòa'],
  ['66', 'Tỉnh Đắk Lắk'], ['68', 'Tỉnh Lâm Đồng'], ['75', 'Tỉnh Đồng Nai'], ['79', 'Thành phố Hồ Chí Minh'],
  ['80', 'Tỉnh Tây Ninh'], ['82', 'Tỉnh Đồng Tháp'], ['86', 'Tỉnh Vĩnh Long'], ['91', 'Tỉnh An Giang'],
  ['92', 'Thành phố Cần Thơ'], ['96', 'Tỉnh Cà Mau'],
] as const;
export const COMMUNE_TYPES = ['Xã', 'Phường', 'Thị trấn', 'Đặc khu'] as const;
export const VIETNAM_BANKS = catalogue.banks;
export interface AgencyAccount { id: string; bank_bin: string; account_no: string; account_name: string; branch: string }
export interface AgencyArea { id: string; kind: string; name: string; commune_code: string }
export interface BhxhAgency {
  id: string; name: string; address: string; phone: string; province_code: string; agency_code: string;
  memo_template: string; notes: string; is_active: boolean; version: number;
  accounts: AgencyAccount[]; areas: AgencyArea[];
}
export interface ClientReceiver { unit_id?: string; client_id: string; agency_id: string | null; account_id: string | null; version: number }
export interface AgencyPortal { agencies: BhxhAgency[]; receivers: ClientReceiver[] }
export interface ReceiverForm {
  receiver_agency_id: string; receiver_account_id: string; receiver_version: number; transfer_memo: string; receiver_touched: boolean; transfer_memo_manual: boolean;
}
export const emptyReceiver: ReceiverForm = { receiver_agency_id: '', receiver_account_id: '', receiver_version: 0, transfer_memo: '', receiver_touched: false, transfer_memo_manual: false };
export interface TransferDetails {
  unit_id?: string; unit_kind?: string | null;
  agency_id: string; agency_name: string; agency_version: number; agency_code: string; unit_code: string; account_id: string;
  bank_bin: string; bank_name: string; bank_short_name: string; account_no: string; account_name: string; branch: string;
  memo: string;
}
export const provinceName = (code: string) => VIETNAM_PROVINCES.find(([id]) => id === code)?.[1] || code;
export function renderTransferMemo(template: string, unitCode: string, agencyCode: string, period: string) {
  const match = period.trim().match(/^(?:Tháng\s+)?(0?[1-9]|1[0-2])\s*[/-]\s*(\d{4})$/i);
  const iso = /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
  const monthlyPeriod = match ? `${match[1].padStart(2, '0')}-${match[2]}` : iso ? `${period.slice(5, 7)}-${period.slice(0, 4)}` : period;
  const values: Record<string, string> = { ma_don_vi: unitCode.trim(), ma_co_quan: agencyCode, ky: monthlyPeriod,
    thang: match?.[1] || (iso ? period.slice(5, 7) : ''), nam: match?.[2] || (iso ? period.slice(0, 4) : '') };
  const missing = new Set<string>();
  const memo = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (raw, key) => {
    if (!(key in values) || !values[key]) { missing.add(key); return raw; }
    return values[key];
  });
  return { memo, missing: [...missing] };
}
export const asciiUpper = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'D').toUpperCase();
export function transferSnapshot(agency: BhxhAgency, account: AgencyAccount, memo: string, unitCode: string): TransferDetails {
  const bank = VIETNAM_BANKS.find(row => row.bin === account.bank_bin);
  return { agency_id: agency.id, agency_name: agency.name, agency_version: agency.version, agency_code: agency.agency_code, unit_code: unitCode, account_id: account.id,
    bank_bin: account.bank_bin, bank_name: bank?.name || '', bank_short_name: bank?.shortName || '',
    account_no: account.account_no, account_name: account.account_name, branch: account.branch, memo };
}
export function transferMessage(client: string, period: string, amount: number | null, details: TransferDetails) {
  return [`Kính gửi ${client},`, `Mã đơn vị: ${details.unit_code}`,
    `Số tiền cần đóng: ${amount == null ? 'Chưa xác định' : new Intl.NumberFormat('vi-VN').format(amount) + ' đồng'}`,
    `Đóng cho kỳ: ${period}`, `Cú pháp: ${details.memo}`, `Tên tài khoản nhận: ${details.account_name}`, `Số tài khoản: ${details.account_no}`,
    `Ngân hàng: ${details.bank_name}${details.branch ? ' — ' + details.branch : ''}`,
    'Sau khi đóng, vui lòng gửi lại ảnh chứng từ để đối chiếu.'].join('\n');
}
