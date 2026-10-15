export interface ReportSettings {
  id?: string;
  header_text: string;
  company_name: string;
  address: string;
  office_name: string;
}

export interface Client {
  id: string;
  tax_code: string;
  name: string;
  contact_name: string;
  contact_phone: string;
  accounting_person: string;
  insurance_person: string;
  review_person?: string;
  investment_person?: string;
  services: string[]; 
  intake_date?: string;
  accounting_fee?: number;
  insurance_fee?: number;
  fee_effective_month?: string;
}

export interface UserFormData {
  id: string;
  name: string;
  department: string;
  office: string;
  roles: string[];
}

export const defaultReportSettings: ReportSettings = {
  header_text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc',
  company_name: '',
  address: '',
  office_name: ''
};

export const defaultClientForm: Client = {
  id: '',
  tax_code: '',
  name: '',
  contact_name: '',
  contact_phone: '',
  accounting_person: '',
  insurance_person: '',
  review_person: '',
  investment_person: '',
  services: ['Kế toán'],
  intake_date: '',
  accounting_fee: 0,
  insurance_fee: 0,
  fee_effective_month: ''
};
