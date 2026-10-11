import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Upload, Camera, Scissors, Check, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from './Settings';

interface Client {
  id: string;
  name: string;
  taxCode: string;
  contactName: string;
  contactPhone: string;
  services: string[];
}

export default function NewTask() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  
  // State for the new task form
  const [taskType, setTaskType] = useState<'normal' | 'payment'>('normal');
  const [taskCategory, setTaskCategory] = useState<'main' | 'support'>('main');
  const [supportedUserId, setSupportedUserId] = useState('');
  const [actionType, setActionType] = useState<'normal' | 'nop_ho_so'>('normal');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [content, setContent] = useState('');
  const [infoProvided, setInfoProvided] = useState('');
  const [infoPending, setInfoPending] = useState('');
  const [notes, setNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  
  // Payment specific states
  const [paidMonths, setPaidMonths] = useState<string[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofBase64, setProofBase64] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');
  const [paymentReason, setPaymentReason] = useState<string>('Phí dịch vụ kế toán');
  const [customPaymentReason, setCustomPaymentReason] = useState<string>('');

  // Hàm tạo tên file theo quy tắc: [Ngày tải lên]-[MST khách hàng]-[Tháng đóng phí]
  const generateFileName = (selectedTaxCode?: string, selectedMonths?: string[]) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const tax = selectedTaxCode || 'MST';
    const monthsStr = (selectedMonths && selectedMonths.length > 0) 
      ? selectedMonths.map(m => m.replace(/\s+/g, '').replace(/\//g, '-')).join('_')
      : 'ThangPhi';
    return `${today}-${tax}-${monthsStr}.png`;
  };

  // Tính năng chụp màn hình làm việc
  const captureScreen = async (selectedClientTax?: string) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false
      });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop(); // Tắt stream chia sẻ

      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      context?.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
      const dataUrl = canvas.toDataURL('image/png');

      const fileName = generateFileName(selectedClientTax, paidMonths);
      setProofBase64(dataUrl);
      setProofFileName(fileName);
    } catch (err) {
      console.warn("Người dùng hủy hoặc trình duyệt không hỗ trợ getDisplayMedia", err);
    }
  };

  // Xử lý khi chọn file từ máy
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

  // Quick Add Client for GPKD
  const [showQuickAddClient, setShowQuickAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientTax, setNewClientTax] = useState('');

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
    if (p) setProfile(JSON.parse(p));
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Chỉ bắt sự kiện paste nếu có ảnh trong clipboard
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

  // Tìm thông tin người được hỗ trợ
  const supportedUser = users.find(u => u.id === supportedUserId || u.name === supportedUserId);

  // Lọc khách hàng:
  // Nếu là nhiệm vụ chính: lọc theo người đang đăng nhập
  // Nếu là hỗ trợ: lọc theo người được chọn để hỗ trợ
  const filteredClients = clients.filter(c => {
    if (taskCategory === 'support') {
      if (!supportedUser) return false;
      return c.accounting_person === supportedUser.name || c.insurance_person === supportedUser.name;
    }
    if (!profile) return false;
    return c.accounting_person === profile.fullName || c.insurance_person === profile.fullName;
  });

  const canAddClient = profile?.additionalRoles?.includes('gpkd');

  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientTax) return;
    
    try {
      const newClient = {
        name: newClientName,
        tax_code: newClientTax,
        services: [profile?.department || 'Kế toán'],
        accounting_person: profile?.department === 'Kế toán' ? profile?.fullName : null,
        insurance_person: profile?.department === 'BHXH' ? profile?.fullName : null,
      };

      const { data, error } = await supabase.from('clients').insert([newClient]).select();
      if (error) throw error;
      
      if (data && data[0]) {
        setClients([...clients, data[0]]);
        setSelectedClientId(data[0].id);
      }
      
      setShowQuickAddClient(false);
      setNewClientName('');
      setNewClientTax('');
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

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert("Vui lòng chọn khách hàng!");
      return;
    }

    try {
      const actualPaymentReason = paymentReason === 'Khác' ? customPaymentReason : paymentReason;
      
      const newTask = {
        type: taskType,
        client_id: selectedClientId,
        user_id: profile?.id || profile?.fullName,
        status: taskType === 'payment' ? 'completed' : 'received',
        task_category: taskCategory,
        supported_user_id: taskCategory === 'support' ? (supportedUser?.id || supportedUserId) : null,
        supported_user_name: taskCategory === 'support' ? (supportedUser?.name || supportedUserId) : null,
        action_type: actionType,
        
        contact_person: contactPerson || 'Sếp giao',
        content: taskType === 'payment' ? `Thu phí: ${actualPaymentReason} (${paidMonths.join(', ')})` : content,
        info_provided: infoProvided,
        info_pending: infoPending,
        notes,
        is_urgent: isUrgent,

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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Tiếp nhận công việc mới</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        <div className="flex border-b border-gray-100">
          <button 
            className={`flex-1 py-4 font-semibold text-center transition-colors ${taskType === 'normal' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setTaskType('normal')}
          >
            Việc bình thường
          </button>
          <button 
            className={`flex-1 py-4 font-semibold text-center transition-colors ${taskType === 'payment' ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setTaskType('payment')}
          >
            Khách trả phí dịch vụ
          </button>
        </div>

        <form onSubmit={handleSaveTask} className="p-8 space-y-6">
          
          {/* Lựa chọn loại nhiệm vụ: Chính vs Hỗ trợ */}
          <div className="bg-gray-50/80 p-4 rounded-lg border border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phân loại tính chất công việc:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-md border border-gray-200 text-sm font-medium hover:border-blue-500">
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
                <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-md border border-gray-200 text-sm font-medium hover:border-blue-500">
                  <input 
                    type="radio" 
                    name="taskCategory" 
                    value="support" 
                    checked={taskCategory === 'support'} 
                    onChange={() => { setTaskCategory('support'); setSelectedClientId(''); }} 
                    className="text-blue-600"
                  />
                  <span>Hỗ trợ nhân viên khác</span>
                </label>
              </div>
            </div>

            {/* Nếu là Hỗ trợ, chọn Người được hỗ trợ */}
            {taskCategory === 'support' && (
              <div className="pt-2 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn người bạn đang hỗ trợ *</label>
                <select 
                  required={taskCategory === 'support'}
                  value={supportedUserId} 
                  onChange={e => { setSupportedUserId(e.target.value); setSelectedClientId(''); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">-- Chọn nhân viên được hỗ trợ --</option>
                  {users.filter(u => u.name !== profile?.fullName).map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.department})</option>
                  ))}
                </select>
                {supportedUserId && (
                  <p className="text-xs text-blue-600 mt-1">
                    Danh sách khách hàng bên dưới sẽ tự động lấy các công ty do <strong>{supportedUserId}</strong> phụ trách.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b pb-2">1. Thông tin Khách hàng</h2>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chọn khách hàng {taskCategory === 'support' ? `(Của ${supportedUserId || 'người được hỗ trợ'})` : ''} *
                </label>
                {loadingClients ? (
                  <div className="p-3 bg-gray-50 text-gray-600 border border-gray-200 rounded-md text-sm">
                    Đang tải danh sách...
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="p-3 bg-orange-50 text-orange-700 border border-orange-200 rounded-md text-sm">
                    {taskCategory === 'support' 
                      ? (!supportedUserId ? 'Vui lòng chọn người được hỗ trợ ở phía trên trước.' : `${supportedUserId} chưa được phân công khách hàng nào.`)
                      : 'Bạn chưa được phân công phụ trách khách hàng nào. Vui lòng nhờ Admin phân công trong trang Quản lý.'}
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md outline-none focus:border-blue-500"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {filteredClients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (MST: {c.tax_code})</option>
                    ))}
                  </select>
                )}
              </div>
              {canAddClient && taskCategory === 'main' && (
                <button 
                  type="button" 
                  onClick={() => setShowQuickAddClient(!showQuickAddClient)}
                  className="px-4 py-2 border border-blue-300 text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 font-medium whitespace-nowrap"
                >
                  + Thêm nhanh (GPKD)
                </button>
              )}
            </div>

            {/* Khung thêm nhanh Cty */}
            {showQuickAddClient && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-md space-y-3">
                <h4 className="font-semibold text-blue-800 text-sm">Tạo nhanh khách hàng mới</h4>
                <div className="flex gap-3">
                  <input type="text" placeholder="Tên khách hàng mới..." value={newClientName} onChange={e => setNewClientName(e.target.value)} className="flex-1 px-3 py-1.5 border border-blue-200 rounded text-sm outline-none" />
                  <input type="text" placeholder="Mã số thuế..." value={newClientTax} onChange={e => setNewClientTax(e.target.value)} className="w-1/3 px-3 py-1.5 border border-blue-200 rounded text-sm outline-none" />
                  <button type="button" onClick={handleQuickAddClient} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium">Lưu nhanh</button>
                </div>
              </div>
            )}
          </div>

          {taskType === 'normal' && (
            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-2">2. Chi tiết công việc</h2>
              
              <div className="mb-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hình thức công việc:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-md border border-gray-200 text-sm hover:border-blue-500">
                    <input 
                      type="radio" 
                      name="actionType" 
                      value="normal" 
                      checked={actionType === 'normal'} 
                      onChange={() => setActionType('normal')} 
                      className="text-blue-600"
                    />
                    <span>Xử lý thông thường</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-md border border-gray-200 text-sm hover:border-blue-500">
                    <input 
                      type="radio" 
                      name="actionType" 
                      value="nop_ho_so" 
                      checked={actionType === 'nop_ho_so'} 
                      onChange={() => setActionType('nop_ho_so')} 
                      className="text-blue-600"
                    />
                    <span>Nộp hồ sơ (Sẽ yêu cầu nhập Mã hồ sơ khi hoàn thành)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người liên hệ giao việc</label>
                  <input 
                    type="text" 
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="Để trống mặc định là Sếp giao" 
                    className="w-full px-4 py-2 border border-gray-300 rounded-md outline-none focus:border-blue-500" 
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer bg-red-50 text-red-700 px-4 py-2 rounded-md border border-red-200 w-full md:w-auto">
                    <input 
                      type="checkbox" 
                      checked={isUrgent}
                      onChange={e => setIsUrgent(e.target.checked)}
                      className="w-5 h-5 text-red-600" 
                    />
                    <span className="font-bold">Đánh dấu việc GẤP!</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung công việc *</label>
                <textarea required value={content} onChange={e => setContent(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-md outline-none focus:border-blue-500"></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thông tin được cung cấp</label>
                  <textarea value={infoProvided} onChange={e => setInfoProvided(e.target.value)} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-md outline-none focus:border-blue-500"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thông tin chờ cung cấp thêm</label>
                  <textarea value={infoPending} onChange={e => setInfoPending(e.target.value)} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-md outline-none focus:border-blue-500"></textarea>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú thêm</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md outline-none focus:border-blue-500" />
              </div>
            </div>
          )}

          {taskType === 'payment' && (
            <div className="space-y-6 pt-4">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-2">2. Thông tin Thanh toán</h2>
              {/* Chọn nội dung thu phí */}
              <div className="bg-green-50/60 p-4 rounded-lg border border-green-200 space-y-3">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Thanh toán cho các tháng *</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {availableMonths.map(month => (
                    <label key={month} className={`flex items-center justify-center py-2 px-1 text-sm border rounded cursor-pointer transition-colors ${paidMonths.includes(month) ? 'bg-green-100 border-green-500 text-green-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh bằng chứng (UNC, Tin nhắn Zalo...)</label>
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
                  className="border-2 border-dashed border-gray-300 rounded-lg p-5 flex flex-col items-center justify-center bg-gray-50 focus:outline-none focus:border-green-500"
                  tabIndex={0}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-green-100 text-green-700 rounded-full flex items-center justify-center mb-1">
                      <Upload size={28} />
                    </div>

                    <div className="text-center">
                      <p className="text-base font-bold text-gray-800">
                        📋 Nhấn <kbd className="px-2 py-1 bg-gray-200 border border-gray-300 rounded font-mono text-sm text-gray-800">Ctrl + V</kbd> để dán ảnh trực tiếp
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        (Sau khi bạn chụp màn hình bằng <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-[11px]">Win + Shift + S</kbd> hoặc Copy ảnh bất kỳ, chỉ cần bấm vào trang này rồi nhấn Ctrl + V)
                      </p>
                    </div>

                    <div className="flex items-center gap-2 my-1">
                      <span className="h-px w-16 bg-gray-300"></span>
                      <span className="text-xs text-gray-400 font-medium">HOẶC</span>
                      <span className="h-px w-16 bg-gray-300"></span>
                    </div>

                    <label className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition">
                      <Upload size={16} />
                      Chọn file ảnh từ máy tính
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
                      <p className="text-xs font-mono font-bold text-green-700 mb-2">
                        Tên file đã lưu: {proofFileName}
                      </p>
                      <img src={proofBase64} alt="Bằng chứng thanh toán" className="max-h-48 object-contain rounded border" />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-green-50 text-green-700 p-4 rounded-md border border-green-200 text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Hệ thống sẽ tự động đánh dấu <strong>Hoàn thành</strong> cho các khoản thanh toán này và ghi nhận vào công nợ.
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button 
              type="submit" 
              className={`px-8 py-3 rounded-md font-bold text-white flex items-center gap-2 shadow-sm transition ${taskType === 'normal' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              <Save size={20} />
              Lưu & Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
