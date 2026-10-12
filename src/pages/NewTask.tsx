import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Upload, Camera, Check, Eye, 
  Calculator, Shield, Settings2, FileText, Sparkles, AlertCircle, Building2, Search, FileSearch, Landmark
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from './Settings';

type BusinessDomain = 'ke_toan' | 'bhxh' | 'setup' | 'ra_soat' | 'dau_tu';

export default function NewTask() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  
  // State phân loại chính: Việc bình thường vs Thu phí
  const [taskType, setTaskType] = useState<'normal' | 'payment'>('normal');
  const [taskCategory, setTaskCategory] = useState<'main' | 'support'>('main');
  const [supportedUserId, setSupportedUserId] = useState('');
  
  // 3 Nghiệp vụ cốt lõi
  const [businessDomain, setBusinessDomain] = useState<BusinessDomain>('ke_toan');

  // Khách hàng & Tìm kiếm nhanh
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [content, setContent] = useState('');
  const [infoProvided, setInfoProvided] = useState('');
  const [infoPending, setInfoPending] = useState('');
  const [notes, setNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  // Trường chuyên biệt theo nghiệp vụ thực tế
  const [dossierCode, setDossierCode] = useState(''); // Mã hồ sơ điện tử (BHXH hoặc Setup)
  const [authorityAgency, setAuthorityAgency] = useState(''); // Cơ quan sở tại (Sở KH&ĐT / Thuế / BHXH các tỉnh)
  const [paperDossier, setPaperDossier] = useState(''); // Hồ sơ / chứng từ bản giấy bàn giao

  // State chuyên biệt khi chọn công việc Nhập liệu (Kế toán & Rà soát)
  const [selectedTaskCategory, setSelectedTaskCategory] = useState<string>('');
  const [inputWhat, setInputWhat] = useState<string>(''); // Nhập gì (Hóa đơn mua vào, bán ra, sổ phụ...)
  const [inputPeriod, setInputPeriod] = useState<string>(''); // Nhập đến đâu / Kỳ nhập liệu (Đến tháng 3/2026, hết quý 1...)

  // Quick Add Client for GPKD / Setup
  const [showQuickAddClient, setShowQuickAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientTax, setNewClientTax] = useState('');

  // Payment specific states
  const [paidMonths, setPaidMonths] = useState<string[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofBase64, setProofBase64] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');
  const [paymentReason, setPaymentReason] = useState<string>('Phí dịch vụ kế toán');
  const [customPaymentReason, setCustomPaymentReason] = useState<string>('');

  // Danh sách các gợi ý công việc nhanh theo từng mảng
  const quickAccountingTasks = [
    'Khai thuế GTGT & TNCN quý',
    'Nhập hóa đơn đầu vào / đầu ra',
    'Nhập sổ phụ ngân hàng & đối chiếu',
    'Lập bảng tính lương & trích nộp bảo hiểm',
    'Lập Báo cáo tài chính & Quyết toán thuế TNDN, TNCN',
    'In và đóng tập chứng từ kế toán',
    'Giải trình kiểm tra thuế / hoàn thuế'
  ];

  const quickBhxhTasks = [
    'Báo tăng lao động tham gia BHXH, BHYT, BHTN',
    'Báo giảm lao động (chấm dứt hợp đồng lao động)',
    'Điều chỉnh mức đóng BHXH / chức danh nghề',
    'Giải quyết chế độ Ốm đau / Thai sản / Dưỡng sức',
    'Cấp mới / Đổi thẻ BHYT / Chốt sổ BHXH',
    'Cấp mã đơn vị BHXH mới thành lập'
  ];

  const quickSetupTasks = [
    'Đăng ký thành lập Doanh nghiệp mới (GPKD)',
    'Thay đổi nội dung Đăng ký kinh doanh (ĐKKD)',
    'Thành lập Địa điểm kinh doanh / Chi nhánh / VPĐD',
    'Mua mới / Gia hạn Chữ ký số (CKS)',
    'Mua mới / Khởi tạo mẫu Hóa đơn điện tử (HĐĐT)',
    'Đăng ký tài khoản Thuế điện tử (eTax) & Nộp thuế ban đầu',
    'Đăng ký Hộ kinh doanh cá thể'
  ];

  const quickRaSoatTasks = [
    'Rà soát hồ sơ sổ sách kế toán các năm cũ',
    'Rà soát đối chiếu hóa đơn GTGT đầu vào / đầu ra',
    'Rà soát tờ khai thuế và BCTC các năm',
    'Rà soát số liệu công nợ, ngân hàng và kho',
    'Rà soát hồ sơ lao động, tiền lương và BHXH',
    'Kiểm tra rủi ro thuế & hoàn thiện chứng từ trước thanh kiểm tra'
  ];

  const quickDauTuTasks = [
    'Đăng ký cấp mới Giấy chứng nhận đăng ký đầu tư (IRC)',
    'Điều chỉnh Giấy chứng nhận đăng ký đầu tư (Thay đổi vốn, tiến độ, địa điểm)',
    'Gia hạn thời hạn hoạt động của dự án đầu tư',
    'Thủ tục góp vốn, mua cổ phần, phần vốn góp của nhà đầu tư nước ngoài',
    'Báo cáo định kỳ tình hình thực hiện dự án đầu tư trực tuyến',
    'Chấm dứt hoạt động dự án đầu tư'
  ];

  const quickAgencies = [
    'Sở KH&ĐT Cần Thơ',
    'Sở KH&ĐT TP.HCM',
    'Sở KH&ĐT Hậu Giang',
    'Sở KH&ĐT Vĩnh Long',
    'Sở KH&ĐT Tây Ninh',
    'Ban Quản lý các Khu công nghiệp & Chế xuất (KCN)',
    'Chi cục Thuế khu vực / TP',
    'Cơ quan BHXH Cần Thơ'
  ];

  // Hàm tạo tên file
  const generateFileName = (selectedTaxCode?: string, selectedMonths?: string[]) => {
    const today = new Date().toISOString().split('T')[0];
    const tax = selectedTaxCode || 'MST';
    const monthsStr = (selectedMonths && selectedMonths.length > 0) 
      ? selectedMonths.map(m => m.replace(/\s+/g, '').replace(/\//g, '-')).join('_')
      : 'ThangPhi';
    return `${today}-${tax}-${monthsStr}.png`;
  };

  // File change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, selectedClientTax?: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofBase64(reader.result as string);
        const fileName = generateFileName(selectedClientTax, paidMonths);
        setProofFileName(fileName);
      };
      reader.readAsDataURL(file);
    }
  };

  // Months generation for Payment
  const generateMonths = () => {
    const months = [];
    const currentYear = new Date().getFullYear();
    for (let i = 1; i <= 12; i++) {
      months.push(`Tháng ${i}/${currentYear}`);
    }
    return months;
  };
  const availableMonths = generateMonths();

  useEffect(() => {
    const p = localStorage.getItem('task_manager_profile');
    if (p) {
      const parsed = JSON.parse(p);
      setProfile(parsed);
      // Tự động chọn tab nghiệp vụ mặc định theo phòng ban người dùng
      if (parsed.department === 'BHXH') {
        setBusinessDomain('bhxh');
      } else {
        setBusinessDomain('ke_toan');
      }
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const clientObj = clients.find(c => c.id === selectedClientId);
              const fileName = generateFileName(clientObj?.tax_code, paidMonths);
              setProofBase64(reader.result as string);
              setProofFileName(fileName);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [clients, selectedClientId, paidMonths]);

  const fetchInitialData = async () => {
    try {
      const [clientsRes, usersRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('app_users').select('*').order('name')
      ]);
      if (clientsRes.data) setClients(clientsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
    } catch(err) {
      console.error(err);
    } finally {
      setLoadingClients(false);
    }
  };

  const supportedUser = users.find(u => u.id === supportedUserId || u.name === supportedUserId);

  // Lọc khách hàng:
  // Chỉ hiển thị đúng khách hàng có sử dụng dịch vụ tương ứng với nghiệp vụ được chọn:
  // - Kế toán: dịch vụ 'Kế toán', do nhân viên (hoặc người được hỗ trợ) phụ trách
  // - BHXH: dịch vụ 'BHXH', do nhân viên (hoặc người được hỗ trợ) phụ trách
  // - Rà soát: dịch vụ 'Rà soát' (hoặc 'Kế toán' nếu kiêm nhiệm), do người phụ trách Rà soát/Kế toán
  // - Setup: dịch vụ 'Setup' (hoặc khách hàng thuộc văn phòng nếu kiêm nhiệm gpkd)
  // - Đầu tư: dịch vụ 'Đầu tư', do nhân sự có quyền kiêm nhiệm đầu tư phụ trách
  const baseClientList = clients.filter(c => {
    const services: string[] = c.services || [];

    // Kiểm tra dịch vụ của khách hàng theo nghiệp vụ đang chọn
    if (businessDomain === 'ke_toan') {
      if (!services.includes('Kế toán')) return false;
      if (taskCategory === 'support') {
        return supportedUser ? c.accounting_person === supportedUser.name : false;
      }
      return profile ? c.accounting_person === profile.fullName : true;
    }

    if (businessDomain === 'bhxh') {
      if (!services.includes('BHXH')) return false;
      if (taskCategory === 'support') {
        return supportedUser ? c.insurance_person === supportedUser.name : false;
      }
      return profile ? c.insurance_person === profile.fullName : true;
    }

    if (businessDomain === 'ra_soat') {
      const hasReviewService = services.includes('Rà soát') || services.includes('Kế toán');
      if (!hasReviewService) return false;
      if (taskCategory === 'support') {
        return supportedUser ? (c.review_person === supportedUser.name || c.accounting_person === supportedUser.name) : false;
      }
      return profile ? (c.review_person === profile.fullName || c.accounting_person === profile.fullName) : true;
    }

    if (businessDomain === 'dau_tu') {
      if (!services.includes('Đầu tư')) return false;
      if (taskCategory === 'support') {
        return supportedUser ? c.investment_person === supportedUser.name : false;
      }
      return profile ? c.investment_person === profile.fullName : true;
    }

    if (businessDomain === 'setup') {
      // Đối với setup/GPKD thành lập mới, cho phép chọn các công ty có dịch vụ Setup hoặc toàn bộ nếu có quyền GPKD
      const isSetupClient = services.includes('Setup') || services.includes('GPKD');
      const hasGpkdRole = profile?.additionalRoles?.includes('gpkd');
      if (hasGpkdRole) return true;
      if (isSetupClient) return true;
      if (taskCategory === 'support') {
        return supportedUser ? (c.accounting_person === supportedUser.name || c.insurance_person === supportedUser.name) : false;
      }
      return profile ? (c.accounting_person === profile.fullName || c.insurance_person === profile.fullName) : true;
    }

    return true;
  });

  // Tìm kiếm theo từ khóa tên hoặc MST
  const filteredClients = baseClientList.filter(c => {
    if (!clientSearch.trim()) return true;
    const term = clientSearch.toLowerCase();
    return c.name?.toLowerCase().includes(term) || c.tax_code?.toLowerCase().includes(term);
  });

  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientTax) return;
    
    try {
      let clientServices = ['Kế toán'];
      if (businessDomain === 'bhxh') clientServices = ['BHXH'];
      else if (businessDomain === 'ra_soat') clientServices = ['Rà soát'];
      else if (businessDomain === 'dau_tu') clientServices = ['Đầu tư'];
      else if (businessDomain === 'setup') clientServices = ['Setup', 'Kế toán'];

      const newClient = {
        name: newClientName,
        tax_code: newClientTax,
        services: clientServices,
        accounting_person: (businessDomain === 'bhxh' || businessDomain === 'dau_tu') ? null : profile?.fullName,
        insurance_person: businessDomain === 'bhxh' ? profile?.fullName : null,
        review_person: businessDomain === 'ra_soat' ? profile?.fullName : null,
        investment_person: businessDomain === 'dau_tu' ? profile?.fullName : null,
      };

      const { data, error } = await supabase.from('clients').insert([newClient]).select();
      if (error) throw error;
      
      if (data && data[0]) {
        setClients(prev => [...prev, data[0]]);
        setSelectedClientId(data[0].id);
      }
      
      setShowQuickAddClient(false);
      setNewClientName('');
      setNewClientTax('');
      alert("Đã tạo nhanh khách hàng thành công!");
    } catch(err) {
      console.error(err);
      alert('Lỗi tạo khách hàng nhanh');
    }
  };

  const toggleMonth = (month: string) => {
    setPaidMonths(prev => 
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  // Helper chèn gợi ý vào ô nội dung
  const handleSelectQuickTask = (taskText: string) => {
    if (!content) {
      setContent(taskText);
    } else if (!content.includes(taskText)) {
      setContent(prev => `${prev}\n• ${taskText}`);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert("Vui lòng chọn khách hàng!");
      return;
    }

    try {
      const actualPaymentReason = paymentReason === 'Khác' ? customPaymentReason : paymentReason;
      
      // Ánh xạ action_type chuẩn hóa
      let resolvedActionType = 'ke_toan';
      if (businessDomain === 'bhxh') resolvedActionType = 'bhxh';
      else if (businessDomain === 'setup') resolvedActionType = 'nop_ho_so';
      else if (businessDomain === 'ra_soat') resolvedActionType = 'ra_soat';
      else if (businessDomain === 'dau_tu') resolvedActionType = 'dau_tu';

      // Xây dựng nội dung chi tiết
      let finalContent = content;
      if (taskType === 'payment') {
        finalContent = `Thu phí: ${actualPaymentReason} (${paidMonths.join(', ')})`;
      } else if ((businessDomain === 'ke_toan' || businessDomain === 'ra_soat') && selectedTaskCategory === 'nhap_lieu') {
        finalContent = `Nhập liệu: ${inputWhat.trim()} - Đến: ${inputPeriod.trim()}`;
      }

      // Xây dựng phần ghi chú tổng hợp (kèm cơ quan sở tại, chứng từ giấy nếu có)
      const noteParts: string[] = [];
      if (notes.trim()) noteParts.push(notes.trim());
      if (authorityAgency.trim()) noteParts.push(`Cơ quan sở tại: ${authorityAgency.trim()}`);
      if (paperDossier.trim()) noteParts.push(`Chứng từ giấy: ${paperDossier.trim()}`);
      const combinedNotes = noteParts.join(' | ');

      const newTask = {
        type: taskType,
        client_id: selectedClientId,
        user_id: profile?.id || profile?.fullName,
        status: taskType === 'payment' ? 'completed' : 'received',
        task_category: taskCategory,
        supported_user_id: taskCategory === 'support' ? (supportedUser?.id || supportedUserId) : null,
        supported_user_name: taskCategory === 'support' ? (supportedUser?.name || supportedUserId) : null,
        action_type: resolvedActionType,
        
        contact_person: contactPerson.trim() || 'Sếp giao',
        content: finalContent,
        info_provided: infoProvided,
        info_pending: infoPending,
        notes: combinedNotes,
        is_urgent: isUrgent,
        dossier_code: dossierCode.trim() || null,

        payment_reason: taskType === 'payment' ? actualPaymentReason : null,
        paid_months: taskType === 'payment' ? paidMonths : null,
        proof_file: proofFileName || (proofFile ? proofFile.name : null),
        proof_image: proofBase64 || null,
        completed_at: taskType === 'payment' ? new Date().toISOString() : null
      };

      const { error } = await supabase.from('tasks').insert([newTask]);
      if (error) throw error;

      alert("Đã ghi nhận công việc thành công!");
      navigate('/');
    } catch(err) {
      console.error(err);
      alert('Lỗi ghi nhận công việc');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tiếp nhận công việc mới</h1>
          <p className="text-sm text-gray-500">Chuẩn hóa theo 3 mảng nghiệp vụ: Kế toán, Bảo hiểm xã hội và Setup ban đầu</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* TAB 1: PHÂN LOẠI CÔNG VIỆC VS THANH TOÁN */}
        <div className="flex border-b border-gray-100">
          <button 
            className={`flex-1 py-4 font-semibold text-center transition-colors flex items-center justify-center gap-2 ${taskType === 'normal' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setTaskType('normal')}
          >
            <FileText size={18} />
            Tiếp nhận công việc chuyên môn
          </button>
          <button 
            className={`flex-1 py-4 font-semibold text-center transition-colors flex items-center justify-center gap-2 ${taskType === 'payment' ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setTaskType('payment')}
          >
            <Check size={18} />
            Khách trả phí dịch vụ (UNC / Chuyển khoản)
          </button>
        </div>

        <form onSubmit={handleSaveTask} className="p-6 sm:p-8 space-y-6">
          
          {/* LỰA CHỌN: TÍNH CHẤT NHIỆM VỤ (CHÍNH VS HỖ TRỢ) */}
          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/80 space-y-3">
            <label className="block text-sm font-semibold text-gray-700">Tính chất phân công:</label>
            <div className="flex flex-wrap gap-3">
              <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border text-sm font-medium transition ${taskCategory === 'main' ? 'bg-white border-blue-500 text-blue-700 shadow-xs ring-1 ring-blue-400' : 'bg-white/80 border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                <input 
                  type="radio" 
                  name="taskCategory" 
                  value="main" 
                  checked={taskCategory === 'main'} 
                  onChange={() => { setTaskCategory('main'); setSelectedClientId(''); }} 
                  className="text-blue-600"
                />
                <span>Nhiệm vụ chính / Kiêm nhiệm của tôi</span>
              </label>

              <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border text-sm font-medium transition ${taskCategory === 'support' ? 'bg-white border-purple-500 text-purple-700 shadow-xs ring-1 ring-purple-400' : 'bg-white/80 border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                <input 
                  type="radio" 
                  name="taskCategory" 
                  value="support" 
                  checked={taskCategory === 'support'} 
                  onChange={() => { setTaskCategory('support'); setSelectedClientId(''); }} 
                  className="text-purple-600"
                />
                <span>Hỗ trợ nhân sự khác trong văn phòng</span>
              </label>
            </div>

            {/* Nếu là Hỗ trợ, chọn Người được hỗ trợ */}
            {taskCategory === 'support' && (
              <div className="pt-3 border-t border-gray-200/70">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn nhân sự bạn đang hỗ trợ *</label>
                <select 
                  required={taskCategory === 'support'}
                  value={supportedUserId} 
                  onChange={e => { setSupportedUserId(e.target.value); setSelectedClientId(''); }}
                  className="w-full px-3 py-2 border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 bg-white text-sm"
                >
                  <option value="">-- Chọn nhân viên được hỗ trợ --</option>
                  {users.filter(u => u.name !== profile?.fullName).map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.department})</option>
                  ))}
                </select>
                {supportedUserId && (
                  <p className="text-xs text-purple-700 mt-1.5 flex items-center gap-1">
                    <Sparkles size={13} />
                    Danh sách khách hàng bên dưới đang được lọc theo các công ty do <strong>{supportedUserId}</strong> phụ trách.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 1. CHỌN 3 NGHIỆP VỤ CHUẨN HÓA (Kế toán | BHXH | Setup) */}
          {taskType === 'normal' && (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-800">
                1. Chọn mảng nghiệp vụ tiếp nhận *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <button
                  type="button"
                  onClick={() => { setBusinessDomain('ke_toan'); setSelectedClientId(''); }}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                    businessDomain === 'ke_toan' 
                      ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/30 text-blue-900 shadow-xs' 
                      : 'bg-white border-gray-200 text-gray-700 hover:border-blue-200 hover:bg-blue-50/30'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${businessDomain === 'ke_toan' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Calculator size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Kế toán thuế</div>
                    <div className="text-xs text-gray-500 mt-0.5">Thuế, hóa đơn, BCTC, MISA</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setBusinessDomain('bhxh'); setSelectedClientId(''); }}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                    businessDomain === 'bhxh' 
                      ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-900 shadow-xs' 
                      : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-200 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${businessDomain === 'bhxh' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Shield size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Bảo hiểm xã hội</div>
                    <div className="text-xs text-gray-500 mt-0.5">Báo tăng, giảm, mã hồ sơ</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setBusinessDomain('setup'); setSelectedClientId(''); }}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                    businessDomain === 'setup' 
                      ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/30 text-amber-900 shadow-xs' 
                      : 'bg-white border-gray-200 text-gray-700 hover:border-amber-200 hover:bg-amber-50/30'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${businessDomain === 'setup' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Settings2 size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Setup & GPKD</div>
                    <div className="text-xs text-gray-500 mt-0.5">GPKD, CKS, HĐĐT, ĐKKD</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setBusinessDomain('ra_soat'); setSelectedClientId(''); }}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                    businessDomain === 'ra_soat' 
                      ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/30 text-indigo-900 shadow-xs' 
                      : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/30'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${businessDomain === 'ra_soat' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <FileSearch size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Rà soát</div>
                    <div className="text-xs text-gray-500 mt-0.5">Sổ sách cũ, đối chiếu số liệu</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setBusinessDomain('dau_tu'); setSelectedClientId(''); }}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                    businessDomain === 'dau_tu' 
                      ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/30 text-rose-900 shadow-xs' 
                      : 'bg-white border-gray-200 text-gray-700 hover:border-rose-200 hover:bg-rose-50/30'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${businessDomain === 'dau_tu' ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Landmark size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Đăng ký đầu tư</div>
                    <div className="text-xs text-gray-500 mt-0.5">Dự án đầu tư, IRC, vốn ngoại</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 2. CHỌN KHÁCH HÀNG & TÌM KIẾM NHANH */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" />
                2. Thông tin Doanh nghiệp / Khách hàng
              </h2>
              <button 
                type="button" 
                onClick={() => setShowQuickAddClient(!showQuickAddClient)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <Plus size={14} /> Thêm nhanh Cty mới
              </button>
            </div>

            {/* Khung thêm nhanh Cty */}
            {showQuickAddClient && (
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3 animate-in fade-in">
                <h4 className="font-bold text-blue-900 text-xs uppercase">Tạo nhanh khách hàng mới vào hệ thống</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    placeholder="Tên doanh nghiệp đầy đủ..." 
                    value={newClientName} 
                    onChange={e => setNewClientName(e.target.value)} 
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                  <input 
                    type="text" 
                    placeholder="Mã số thuế..." 
                    value={newClientTax} 
                    onChange={e => setNewClientTax(e.target.value)} 
                    className="sm:w-1/3 px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                  <button 
                    type="button" 
                    onClick={handleQuickAddClient} 
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 whitespace-nowrap"
                  >
                    Lưu nhanh
                  </button>
                </div>
              </div>
            )}

            {/* Ô tìm kiếm & Dropdown chọn */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Gõ tìm kiếm nhanh tên công ty hoặc Mã số thuế..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white outline-none focus:border-blue-500"
                />
              </div>

              {loadingClients ? (
                <div className="p-3 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-sm">
                  Đang tải danh sách khách hàng...
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-sm flex items-center justify-between">
                  <span>Không tìm thấy khách hàng có dịch vụ này theo phân quyền của bạn.</span>
                  <button 
                    type="button" 
                    onClick={() => { setClientSearch(''); }} 
                    className="underline text-xs font-semibold"
                  >
                    Xóa tìm kiếm
                  </button>
                </div>
              ) : (
                <select 
                  required 
                  value={selectedClientId} 
                  onChange={e => {
                    const cId = e.target.value;
                    setSelectedClientId(cId);
                    const clientObj = clients.find(c => c.id === cId);
                    if (clientObj) {
                      const hasKetoan = clientObj.services?.includes('Kế toán');
                      const hasBHXH = clientObj.services?.includes('BHXH');
                      if (hasKetoan && hasBHXH) {
                        setPaymentReason('Phí dịch vụ kế toán + BHXH');
                      } else if (hasBHXH) {
                        setPaymentReason('Phí dịch vụ bảo hiểm xã hội');
                      } else if (hasKetoan) {
                        setPaymentReason('Phí dịch vụ kế toán');
                      }
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                >
                  <option value="">-- Chọn khách hàng ({filteredClients.length} công ty khả dụng) --</option>
                  {filteredClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (MST: {c.tax_code})</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 3. CHI TIẾT CÔNG VIỆC CHUYÊN MÔN */}
          {taskType === 'normal' && (
            <div className="space-y-4 pt-2">
              <div className="border-b pb-2 flex justify-between items-center">
                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  3. Chi tiết công việc
                </h2>
                <label className="flex items-center gap-2 cursor-pointer bg-red-50 text-red-700 px-3 py-1 rounded-lg border border-red-200 text-xs font-bold hover:bg-red-100 transition">
                  <input 
                    type="checkbox" 
                    checked={isUrgent}
                    onChange={e => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded" 
                  />
                  <span>Đánh dấu việc GẤP!</span>
                </label>
              </div>

              {/* Lựa chọn loại công việc (Đặc biệt cho Kế toán & Rà soát: có lựa chọn Nhập liệu) */}
              {(businessDomain === 'ke_toan' || businessDomain === 'ra_soat') && (
                <div className="flex gap-2 p-1.5 bg-gray-100 rounded-xl max-w-md">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTaskCategory('');
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
                      selectedTaskCategory !== 'nhap_lieu'
                        ? 'bg-white text-gray-800 shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Công việc thông thường
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTaskCategory('nhap_lieu');
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                      selectedTaskCategory === 'nhap_lieu'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <span>⚡ Nhập liệu</span>
                  </button>
                </div>
              )}

              {/* Giao diện khi chọn Nhập liệu (Kế toán & Rà soát) */}
              {(businessDomain === 'ke_toan' || businessDomain === 'ra_soat') && selectedTaskCategory === 'nhap_lieu' ? (
                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-4 animate-in fade-in">
                  <div className="font-semibold text-sm text-blue-900 flex items-center gap-2">
                    <Calculator size={16} className="text-blue-600" />
                    Chi tiết công việc Nhập liệu:
                  </div>

                  {/* Nhập gì */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700">
                      1. Nhập gì? (chọn nhanh hoặc nhập cụ thể) *
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Hóa đơn mua vào', 'Hóa đơn bán ra', 'Sổ phụ ngân hàng', 'Bảng lương', 'Toàn bộ chứng từ phát sinh'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (!inputWhat) {
                              setInputWhat(tag);
                            } else if (!inputWhat.includes(tag)) {
                              setInputWhat(prev => `${prev}, ${tag}`);
                            }
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-md text-xs font-medium transition"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="VD: Hóa đơn mua vào, Sổ phụ ngân hàng Vietcombank..."
                      value={inputWhat}
                      onChange={e => setInputWhat(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Nhập đến đâu */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700">
                      2. Nhập đến đâu? (Kỳ / mốc thời gian hoàn thành) *
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Hết tháng 1/2026', 'Hết tháng 2/2026', 'Hết tháng 3/2026', 'Hết Quý 1/2026', 'Hết Quý 2/2026', 'Đến hết năm trước'].map(period => (
                        <button
                          key={period}
                          type="button"
                          onClick={() => setInputPeriod(period)}
                          className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-md text-xs font-medium transition"
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="VD: Hết tháng 2/2026, Quý 1/2026, Đến ngày 15/04..."
                      value={inputPeriod}
                      onChange={e => setInputPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* Gợi ý công việc nhanh theo Nghiệp vụ đang chọn */}
                  <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-200/70 space-y-2">
                    <div className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      <Sparkles size={14} className="text-amber-500" />
                      Gợi ý công việc thực tế phổ biến (Nhấn để chèn nhanh):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(businessDomain === 'ke_toan' 
                        ? ['Nhập liệu chứng từ hóa đơn', ...quickAccountingTasks]
                        : (businessDomain === 'bhxh' 
                            ? quickBhxhTasks 
                            : (businessDomain === 'setup' 
                                ? quickSetupTasks 
                                : (businessDomain === 'ra_soat' ? ['Nhập liệu rà soát sổ sách', ...quickRaSoatTasks] : quickDauTuTasks)))
                      ).map(taskText => (
                        <button
                          key={taskText}
                          type="button"
                          onClick={() => {
                            if (taskText.includes('Nhập liệu')) {
                              setSelectedTaskCategory('nhap_lieu');
                            } else {
                              handleSelectQuickTask(taskText);
                            }
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-gray-200 rounded-md text-xs font-medium text-gray-700 transition"
                        >
                          + {taskText}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nội dung công việc chính */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Nội dung công việc thực tế *
                    </label>
                    <textarea 
                      required 
                      value={content} 
                      onChange={e => setContent(e.target.value)} 
                      rows={3} 
                      placeholder="Ghi rõ nội dung việc tiếp nhận, yêu cầu của khách hàng..."
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </>
              )}

              {/* Các trường chuyên biệt: Mã hồ sơ & Cơ quan sở tại & Chứng từ giấy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(businessDomain === 'bhxh' || businessDomain === 'setup' || businessDomain === 'dau_tu') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Mã hồ sơ điện tử {businessDomain === 'bhxh' ? '(BHXH)' : (businessDomain === 'dau_tu' ? '(Dự án đầu tư / IRC)' : '(GPKD / Thuế)')}
                    </label>
                    <input 
                      type="text" 
                      value={dossierCode}
                      onChange={e => setDossierCode(e.target.value)}
                      placeholder="VD: 12345/2026/07101 (để tra cứu kết quả)" 
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm font-mono bg-blue-50/20" 
                    />
                  </div>
                )}

                {(businessDomain === 'setup' || businessDomain === 'dau_tu') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Cơ quan sở tại xử lý
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={authorityAgency}
                        onChange={e => setAuthorityAgency(e.target.value)}
                        placeholder="VD: Sở KH&ĐT Cần Thơ / BQL Khu công nghiệp..." 
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm" 
                      />
                      <select 
                        onChange={e => { if (e.target.value) setAuthorityAgency(e.target.value); }} 
                        className="px-2 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-700"
                      >
                        <option value="">Gợi ý</option>
                        {quickAgencies.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Chứng từ bản giấy bàn giao (nếu có)
                  </label>
                  <input 
                    type="text" 
                    value={paperDossier}
                    onChange={e => setPaperDossier(e.target.value)}
                    placeholder="VD: Nhận 1 bộ tờ khai có đóng dấu, Sổ phụ giấy..." 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Người liên hệ giao việc
                  </label>
                  <input 
                    type="text" 
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="Để trống mặc định là 'Sếp giao'" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm" 
                  />
                </div>
              </div>

              {/* Thông tin được cấp & Chờ bổ sung */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Thông tin đã được khách cung cấp</label>
                  <textarea 
                    value={infoProvided} 
                    onChange={e => setInfoProvided(e.target.value)} 
                    rows={2} 
                    placeholder="VD: Đã nhận CCCD, Hóa đơn mua vào quý 1..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Thông tin / chứng từ chờ bổ sung thêm</label>
                  <textarea 
                    value={infoPending} 
                    onChange={e => setInfoPending(e.target.value)} 
                    rows={2} 
                    placeholder="VD: Đang chờ khách gửi sao kê tháng 3..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú lưu ý thêm</label>
                <input 
                  type="text" 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Ghi chú khác nếu có..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm" 
                />
              </div>
            </div>
          )}

          {/* 4. THANH TOÁN PHÍ DỊCH VỤ */}
          {taskType === 'payment' && (
            <div className="space-y-6 pt-2">
              <h2 className="text-base font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                <Check size={18} className="text-green-600" />
                3. Chi tiết khoản thanh toán của khách
              </h2>
              
              {/* Chọn nội dung thu phí */}
              <div className="bg-green-50/60 p-4 rounded-xl border border-green-200 space-y-3">
                <label className="block text-sm font-semibold text-green-900 mb-1">
                  Nội dung thu phí dịch vụ *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    'Phí dịch vụ kế toán',
                    'Phí dịch vụ bảo hiểm xã hội',
                    'Phí setup',
                    'Phí dịch vụ kế toán + BHXH',
                    'Khác'
                  ].map(option => (
                    <label key={option} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition text-sm ${paymentReason === option ? 'bg-white border-green-600 font-semibold text-green-900 shadow-xs ring-1 ring-green-500' : 'bg-white/70 border-gray-200 text-gray-700 hover:bg-white'}`}>
                      <input 
                        type="radio" 
                        name="paymentReason" 
                        value={option}
                        checked={paymentReason === option}
                        onChange={() => setPaymentReason(option)}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>

                {paymentReason === 'Khác' && (
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nhập nội dung thu cụ thể *</label>
                    <input 
                      required={paymentReason === 'Khác'}
                      type="text" 
                      value={customPaymentReason} 
                      onChange={e => setCustomPaymentReason(e.target.value)} 
                      placeholder="VD: Phí làm lại sổ sách các năm trước..." 
                      className="w-full px-3 py-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Thanh toán cho các tháng *</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {availableMonths.map(month => (
                    <label key={month} className={`flex items-center justify-center py-2 px-1 text-xs border rounded-lg cursor-pointer transition-colors ${paidMonths.includes(month) ? 'bg-green-100 border-green-500 text-green-800 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={paidMonths.includes(month)}
                        onChange={() => toggleMonth(month)}
                      />
                      {month}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ảnh bằng chứng (UNC, Tin nhắn Zalo...)</label>
                <div 
                  onPaste={(e) => {
                    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
                    if (item) {
                      const file = item.getAsFile();
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const clientObj = clients.find(c => c.id === selectedClientId);
                          const fileName = generateFileName(clientObj?.tax_code, paidMonths);
                          setProofBase64(reader.result as string);
                          setProofFileName(fileName);
                        };
                        reader.readAsDataURL(file);
                      }
                    }
                  }}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center justify-center bg-gray-50 focus:outline-none focus:border-green-500"
                  tabIndex={0}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mb-1">
                      <Upload size={24} />
                    </div>

                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-800">
                        📋 Nhấn <kbd className="px-2 py-0.5 bg-gray-200 border border-gray-300 rounded font-mono text-xs text-gray-800">Ctrl + V</kbd> để dán ảnh trực tiếp
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        (Chụp màn hình bằng <kbd className="px-1 py-0.5 bg-gray-100 border rounded text-[10px]">Win + Shift + S</kbd> rồi nhấn Ctrl + V)
                      </p>
                    </div>

                    <label className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition">
                      <Upload size={14} />
                      Chọn file ảnh từ máy
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e => {
                          const clientObj = clients.find(c => c.id === selectedClientId);
                          handleFileChange(e, clientObj?.tax_code);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {proofBase64 && (
                    <div className="mt-4 border border-green-300 rounded-lg p-2 bg-white flex flex-col items-center">
                      <p className="text-xs font-mono font-bold text-green-700 mb-1">
                        Tên file đã lưu: {proofFileName}
                      </p>
                      <img src={proofBase64} alt="Bằng chứng thanh toán" className="max-h-48 object-contain rounded border" />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-green-50 text-green-700 p-3 rounded-lg border border-green-200 text-xs flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Hệ thống sẽ tự động đánh dấu <strong>Hoàn thành</strong> cho khoản phí này và lưu vào công nợ.
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className={`px-8 py-2.5 rounded-lg font-bold text-white flex items-center gap-2 shadow-sm transition ${taskType === 'normal' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              <Save size={18} />
              Lưu & Xác nhận tiếp nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
