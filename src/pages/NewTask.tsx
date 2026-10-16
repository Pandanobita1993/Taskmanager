import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Check, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/profile';
import type { BusinessDomain } from '../components/newTask/newTaskConstants';
import { INTERNAL_COMPANY_CLIENT } from '../components/newTask/newTaskConstants';
import { BusinessDomainSelector } from '../components/newTask/BusinessDomainSelector';
import { ClientSelectorSection } from '../components/newTask/ClientSelectorSection';
import { TaskDetailsForm } from '../components/newTask/TaskDetailsForm';
import { PaymentDetailsForm } from '../components/newTask/PaymentDetailsForm';
import { TaskCategorySelector } from '../components/newTask/TaskCategorySelector';
import { readCachedProfile } from '../lib/profile';
import { localDateKey } from '../lib/date';
import { uploadTaskProofSafe, fileToDataUrl } from '../lib/proofStorage';

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

  const isOtherTask = taskType === 'normal' && businessDomain === 'khac';

  // Hàm tạo tên file
  const generateFileName = (selectedTaxCode?: string, selectedMonths?: string[]) => {
    const today = localDateKey();
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
      setProofFile(file);
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

  const location = useLocation();

  useEffect(() => {
    const parsed = readCachedProfile();
    setProfile(parsed);
    // Tự động chọn tab nghiệp vụ mặc định theo phòng ban người dùng
    if (parsed.department === 'BHXH') {
      setBusinessDomain('bhxh');
    } else {
      setBusinessDomain('ke_toan');
    }

    // Nếu chuyển từ chức năng làm lại hồ sơ thất bại
    const retryData = (location.state as any)?.retryTask;
    if (retryData) {
      if (retryData.client_id) setSelectedClientId(retryData.client_id);
      if (retryData.content) setContent(retryData.content);
      if (retryData.contact_person) setContactPerson(retryData.contact_person);
      if (retryData.task_category) setTaskCategory(retryData.task_category);
      if (retryData.supported_user_id) setSupportedUserId(retryData.supported_user_id);
      if (retryData.info_provided) setInfoProvided(retryData.info_provided);
      if (retryData.info_pending) setInfoPending(retryData.info_pending);
      if (retryData.is_urgent !== undefined) setIsUrgent(retryData.is_urgent);
      if (retryData.dossier_code) setDossierCode(retryData.dossier_code);
      if (retryData.notes) setNotes(retryData.notes);

      // Phục hồi businessDomain từ action_type
      if (retryData.action_type === 'bhxh') setBusinessDomain('bhxh');
      else if (retryData.action_type === 'nop_ho_so' || retryData.action_type === 'setup') setBusinessDomain('setup');
      else if (retryData.action_type === 'ra_soat') setBusinessDomain('ra_soat');
      else if (retryData.action_type === 'khac') setBusinessDomain('khac');
      else if (retryData.action_type === 'dau_tu') setBusinessDomain('dau_tu');
      else if (retryData.action_type === 'ke_toan') setBusinessDomain('ke_toan');
    }

    fetchInitialData();
  }, [location.state]);

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setProofFile(file);
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
        supabase.from('clients').select('*').is('archived_at', null).order('name'),
        supabase.from('app_users').select('*').eq('is_active', true).order('name')
      ]);
      if (clientsRes.data) {
        const formattedClients = clientsRes.data.map((c: any) => {
          let review_person = c.review_person || '';
          let investment_person = c.investment_person || '';
          const cleanedServices: string[] = [];

          (c.services || []).forEach((s: string) => {
            if (s.startsWith('Rà soát:')) {
              review_person = s.replace('Rà soát:', '');
              cleanedServices.push('Rà soát');
            } else if (s.startsWith('Đầu tư:')) {
              investment_person = s.replace('Đầu tư:', '');
              cleanedServices.push('Đầu tư');
            } else {
              cleanedServices.push(s);
            }
          });

          return {
            ...c,
            services: Array.from(new Set(cleanedServices)),
            review_person,
            investment_person
          };
        });
        // Đảm bảo CÔNG TY TNHH DỊCH VỤ KẾ TOÁN AN AN (Nội bộ) luôn có trong danh sách
        const hasInternalAnAn = formattedClients.some((c: any) => c.name?.includes('AN AN') && c.tax_code === 'NỘI BỘ');
        const finalClients = hasInternalAnAn ? formattedClients : [INTERNAL_COMPANY_CLIENT, ...formattedClients];
        setClients(finalClients);
      }
      if (usersRes.data) setUsers(usersRes.data);
    } catch(err) {
      console.error(err);
    } finally {
      setLoadingClients(false);
    }
  };

  const supportedUser = users.find(u => u.id === supportedUserId || u.name === supportedUserId);

  // Lọc khách hàng:
  // CHỈ hiển thị đúng khách hàng có sử dụng dịch vụ tương ứng với nghiệp vụ được chọn:
  // Riêng công ty nội bộ AN AN luôn hiển thị để làm việc lặt vặt nội bộ
  const baseClientList = clients.filter(c => {
    if (c.id === INTERNAL_COMPANY_CLIENT.id || (c.name?.includes('AN AN') && c.tax_code === 'NỘI BỘ')) {
      return true;
    }
    const services: string[] = c.services || [];

    // 1. Kiểm tra nghiệp vụ Kế toán
    if (businessDomain === 'ke_toan') {
      if (!services.includes('Kế toán')) return false;
      if (taskCategory === 'support') {
        return supportedUser ? c.accounting_person === supportedUser.name : false;
      }
      return profile ? c.accounting_person === profile.fullName : true;
    }

    // 2. Kiểm tra nghiệp vụ BHXH: Chỉ hiện khách hàng có dịch vụ BHXH
    if (businessDomain === 'bhxh') {
      if (!services.includes('BHXH')) return false;
      if (taskCategory === 'support') {
        return supportedUser ? c.insurance_person === supportedUser.name : false;
      }
      return profile ? c.insurance_person === profile.fullName : true;
    }

    // 3. Kiểm tra nghiệp vụ Rà soát
    if (businessDomain === 'ra_soat') {
      const hasReviewService = services.includes('Rà soát') || services.includes('Kế toán');
      if (!hasReviewService) return false;
      if (taskCategory === 'support') {
        return supportedUser ? (c.review_person === supportedUser.name || c.accounting_person === supportedUser.name) : false;
      }
      return profile ? (c.review_person === profile.fullName || c.accounting_person === profile.fullName) : true;
    }

    // 4. Kiểm tra nghiệp vụ Đầu tư
    if (businessDomain === 'dau_tu') {
      if (!services.includes('Đầu tư')) return false;
      if (taskCategory === 'support') {
        return supportedUser ? c.investment_person === supportedUser.name : false;
      }
      return profile ? c.investment_person === profile.fullName : true;
    }

    // 5. Kiểm tra nghiệp vụ Setup
    if (businessDomain === 'setup') {
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
      else if (businessDomain === 'ra_soat') clientServices = [profile?.fullName ? `Rà soát:${profile.fullName}` : 'Rà soát'];
      else if (businessDomain === 'dau_tu') clientServices = [profile?.fullName ? `Đầu tư:${profile.fullName}` : 'Đầu tư'];
      else if (businessDomain === 'setup') clientServices = ['Setup', 'Kế toán'];

      const newClient = {
        name: newClientName.trim(),
        tax_code: newClientTax.trim(),
        services: clientServices,
        accounting_person: (businessDomain === 'bhxh' || businessDomain === 'dau_tu') ? null : profile?.fullName,
        insurance_person: businessDomain === 'bhxh' ? profile?.fullName : null,
      };

      const { data, error } = await supabase.from('clients').insert([newClient]).select();
      if (error) throw error;
      
      if (data && data[0]) {
        fetchInitialData();
        setSelectedClientId(data[0].id);
      }
      
      setShowQuickAddClient(false);
      setNewClientName('');
      setNewClientTax('');
      alert("Đã tạo nhanh khách hàng thành công!");
    } catch(err: any) {
      console.error(err);
      alert('Lỗi tạo khách hàng nhanh: ' + (err?.message || JSON.stringify(err)));
    }
  };

  const toggleMonth = (month: string) => {
    setPaidMonths(prev => 
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOtherTask && !selectedClientId) {
      alert("Vui lòng chọn khách hàng!");
      return;
    }

    if (isOtherTask && !content.trim()) {
      alert('Vui lòng nhập nội dung công việc!');
      return;
    }

    try {
      let taskClientId = selectedClientId;
      if (isOtherTask) {
        const { data: internalClient, error: lookupError } = await supabase.from('clients').select('id').eq('tax_code', 'NỘI BỘ').is('archived_at', null).ilike('name', '%AN AN%').limit(1).maybeSingle();
        if (lookupError) throw lookupError;
        if (internalClient) {
          taskClientId = internalClient.id;
        } else {
          const { id: _placeholderId, ...internalClientData } = INTERNAL_COMPANY_CLIENT;
          const { data, error } = await supabase.from('clients').insert([{ ...internalClientData, name: 'CÔNG TY TNHH DỊCH VỤ KẾ TOÁN AN AN' }]).select().single();
          if (error) throw error;
          taskClientId = data.id;
          setClients(prev => [...prev, data]);
        }
      }
      const actualPaymentReason = paymentReason === 'Khác' ? customPaymentReason : paymentReason;
      
      // Ánh xạ action_type chuẩn hóa
      let resolvedActionType = 'ke_toan';
      if (businessDomain === 'bhxh') resolvedActionType = 'bhxh';
      else if (businessDomain === 'setup') resolvedActionType = 'nop_ho_so';
      else if (businessDomain === 'ra_soat') resolvedActionType = 'ra_soat';
      else if (businessDomain === 'dau_tu') resolvedActionType = 'dau_tu';
      else if (businessDomain === 'khac') resolvedActionType = 'khac';

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

      const selectedClientObj = clients.find(c => c.id === selectedClientId);
      const fallbackContact = selectedClientObj?.contact_name?.trim() 
        || (selectedClientObj?.contact_phone ? `Liên hệ (${selectedClientObj.contact_phone})` : '')
        || 'Người liên hệ cty';
      const resolvedContactPerson = contactPerson.trim() || fallbackContact;
      let proofPath: string | null = null;
      let proofImagePayload: string | null = proofBase64 || null;
      if (proofFile && !isOtherTask) {
        proofPath = await uploadTaskProofSafe(proofFile);
        if (!proofPath && !proofImagePayload) {
          proofImagePayload = await fileToDataUrl(proofFile);
        }
      }

      const newTask = {
        type: taskType,
        client_id: taskClientId,
        user_id: profile?.id || profile?.fullName,
        status: taskType === 'payment' ? 'completed' : 'received',
        task_category: isOtherTask ? 'main' : taskCategory,
        supported_user_id: !isOtherTask && taskCategory === 'support' ? (supportedUser?.id || supportedUserId) : null,
        supported_user_name: !isOtherTask && taskCategory === 'support' ? (supportedUser?.name || supportedUserId) : null,
        action_type: resolvedActionType,
        
        contact_person: isOtherTask ? '' : resolvedContactPerson,
        content: isOtherTask ? content.trim() : finalContent,
        info_provided: isOtherTask ? '' : infoProvided,
        info_pending: isOtherTask ? '' : infoPending,
        notes: isOtherTask ? '' : combinedNotes,
        is_urgent: isOtherTask ? false : isUrgent,
        dossier_code: isOtherTask ? null : dossierCode.trim() || null,

        payment_reason: taskType === 'payment' ? actualPaymentReason : null,
        paid_months: taskType === 'payment' ? paidMonths : null,
        proof_file: proofPath,
        proof_image: isOtherTask ? null : proofImagePayload,
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

  const handleSelectClient = (cId: string) => {
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
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tiếp nhận công việc mới</h1>
          <p className="text-sm text-gray-500">Chuẩn hóa theo các mảng nghiệp vụ: Kế toán, BHXH, Setup, Rà soát, Đầu tư & Công việc nội bộ</p>
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
          {!isOtherTask && <TaskCategorySelector
            taskCategory={taskCategory}
            setTaskCategory={setTaskCategory}
            supportedUserId={supportedUserId}
            setSupportedUserId={setSupportedUserId}
            users={users}
            currentUserName={profile?.fullName}
            onResetSelectedClient={() => setSelectedClientId('')}
          />}

          {/* 1. CHỌN 3 NGHIỆP VỤ CHUẨN HÓA (Kế toán | BHXH | Setup | Rà soát | Đầu tư) */}
          {taskType === 'normal' && (
            <BusinessDomainSelector
              businessDomain={businessDomain}
              onChangeDomain={(d) => { setBusinessDomain(d); setSelectedClientId(''); }}
            />
          )}

          {/* 2. CHỌN KHÁCH HÀNG & TÌM KIẾM NHANH */}
          {isOtherTask ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">CÔNG TY TNHH DỊCH VỤ KẾ TOÁN AN AN</p>
              <div>
                <label htmlFor="other-task-content" className="block text-sm font-semibold text-gray-700 mb-1">Nội dung công việc *</label>
                <textarea id="other-task-content" required value={content} onChange={e => setContent(e.target.value)} rows={4}
                  placeholder="VD: Kiểm tra máy in, mua thiết bị văn phòng..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
          ) : <ClientSelectorSection
            clients={clients}
            filteredClients={filteredClients}
            selectedClientId={selectedClientId}
            clientSearch={clientSearch}
            loadingClients={loadingClients}
            showQuickAddClient={showQuickAddClient}
            newClientName={newClientName}
            newClientTax={newClientTax}
            onSelectClient={handleSelectClient}
            onClientSearchChange={setClientSearch}
            onToggleQuickAdd={() => setShowQuickAddClient(!showQuickAddClient)}
            onNewClientNameChange={setNewClientName}
            onNewClientTaxChange={setNewClientTax}
            onQuickAddSubmit={handleQuickAddClient}
          />}

          {/* 3. CHI TIẾT CÔNG VIỆC CHUYÊN MÔN */}
          {taskType === 'normal' && !isOtherTask && (
            <TaskDetailsForm
              businessDomain={businessDomain}
              isUrgent={isUrgent}
              setIsUrgent={setIsUrgent}
              selectedTaskCategory={selectedTaskCategory}
              setSelectedTaskCategory={setSelectedTaskCategory}
              inputWhat={inputWhat}
              setInputWhat={setInputWhat}
              inputPeriod={inputPeriod}
              setInputPeriod={setInputPeriod}
              content={content}
              setContent={setContent}
              dossierCode={dossierCode}
              setDossierCode={setDossierCode}
              authorityAgency={authorityAgency}
              setAuthorityAgency={setAuthorityAgency}
              paperDossier={paperDossier}
              setPaperDossier={setPaperDossier}
              contactPerson={contactPerson}
              setContactPerson={setContactPerson}
              infoProvided={infoProvided}
              setInfoProvided={setInfoProvided}
              infoPending={infoPending}
              setInfoPending={setInfoPending}
              notes={notes}
              setNotes={setNotes}
            />
          )}

          {/* 4. THANH TOÁN PHÍ DỊCH VỤ */}
          {taskType === 'payment' && (
            <PaymentDetailsForm
              paymentReason={paymentReason}
              setPaymentReason={setPaymentReason}
              customPaymentReason={customPaymentReason}
              setCustomPaymentReason={setCustomPaymentReason}
              availableMonths={availableMonths}
              paidMonths={paidMonths}
              toggleMonth={toggleMonth}
              proofBase64={proofBase64}
              proofFileName={proofFileName}
              onPasteImage={(e) => {
                const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
                if (item) {
                  const file = item.getAsFile();
                  if (file) {
                    setProofFile(file);
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
              onFileInputChange={(e) => {
                const clientObj = clients.find(c => c.id === selectedClientId);
                handleFileChange(e, clientObj?.tax_code);
              }}
            />
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
