export type BusinessDomain = 'ke_toan' | 'bhxh' | 'setup' | 'ra_soat' | 'dau_tu';

export const QUICK_ACCOUNTING_TASKS = [
  'Khai thuế GTGT & TNCN quý',
  'Nhập hóa đơn đầu vào / đầu ra',
  'Nhập sổ phụ ngân hàng & đối chiếu',
  'Lập bảng tính lương & trích nộp bảo hiểm',
  'Lập Báo cáo tài chính & Quyết toán thuế TNDN, TNCN',
  'In và đóng tập chứng từ kế toán',
  'Giải trình kiểm tra thuế / hoàn thuế'
];

export const QUICK_BHXH_TASKS = [
  'Báo tăng lao động tham gia BHXH, BHYT, BHTN',
  'Báo giảm lao động (chấm dứt hợp đồng lao động)',
  'Điều chỉnh mức đóng BHXH / chức danh nghề',
  'Giải quyết chế độ Ốm đau / Thai sản / Dưỡng sức',
  'Cấp mới / Đổi thẻ BHYT / Chốt sổ BHXH',
  'Cấp mã đơn vị BHXH mới thành lập'
];

export const QUICK_SETUP_TASKS = [
  'Đăng ký thành lập Doanh nghiệp mới (GPKD)',
  'Thay đổi nội dung Đăng ký kinh doanh (ĐKKD)',
  'Thành lập Địa điểm kinh doanh / Chi nhánh / VPĐD',
  'Mua mới / Gia hạn Chữ ký số (CKS)',
  'Mua mới / Khởi tạo mẫu Hóa đơn điện tử (HĐĐT)',
  'Đăng ký tài khoản Thuế điện tử (eTax) & Nộp thuế ban đầu',
  'Đăng ký Hộ kinh doanh cá thể'
];

export const QUICK_RA_SOAT_TASKS = [
  'Rà soát hồ sơ sổ sách kế toán các năm cũ',
  'Rà soát đối chiếu hóa đơn GTGT đầu vào / đầu ra',
  'Rà soát tờ khai thuế và BCTC các năm',
  'Rà soát số liệu công nợ, ngân hàng và kho',
  'Rà soát hồ sơ lao động, tiền lương và BHXH',
  'Kiểm tra rủi ro thuế & hoàn thiện chứng từ trước thanh kiểm tra'
];

export const QUICK_DAU_TU_TASKS = [
  'Đăng ký cấp mới Giấy chứng nhận đăng ký đầu tư (IRC)',
  'Điều chỉnh Giấy chứng nhận đăng ký đầu tư (Thay đổi vốn, tiến độ, địa điểm)',
  'Gia hạn thời hạn hoạt động của dự án đầu tư',
  'Thủ tục góp vốn, mua cổ phần, phần vốn góp của nhà đầu tư nước ngoài',
  'Báo cáo định kỳ tình hình thực hiện dự án đầu tư trực tuyến',
  'Chấm dứt hoạt động dự án đầu tư'
];

export const QUICK_AGENCIES = [
  'Sở KH&ĐT Cần Thơ',
  'Sở KH&ĐT TP.HCM',
  'Sở KH&ĐT Hậu Giang',
  'Sở KH&ĐT Vĩnh Long',
  'Sở KH&ĐT Tây Ninh',
  'Ban Quản lý các Khu công nghiệp & Chế xuất (KCN)',
  'Chi cục Thuế khu vực / TP',
  'Cơ quan BHXH Cần Thơ'
];

export const INTERNAL_COMPANY_CLIENT = {
  id: 'internal_an_an',
  name: 'CÔNG TY TNHH DỊCH VỤ KẾ TOÁN AN AN (Nội bộ)',
  tax_code: 'NỘI BỘ',
  contact_name: 'Nội bộ công ty',
  contact_phone: '',
  services: ['Kế toán', 'BHXH', 'Setup', 'Rà soát', 'Đầu tư']
};
