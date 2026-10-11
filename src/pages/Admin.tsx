import React, { useState, useEffect } from 'react';
import { Users, Lock, FileSpreadsheet, Building2, Plus, Trash2, Save, Edit2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface ReportSettings {
  id?: string;
  header_text: string;
  company_name: string;
  address: string;
  office_name: string;
}

interface Client {
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

const defaultReportSettings: ReportSettings = {
  header_text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc',
  company_name: '',
  address: '',
  office_name: ''
};

const defaultClientForm: Client = {
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

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'clients' | 'reports'>('overview');
  const [loading, setLoading] = useState(false);

  // --- Data States ---
  const [reportSettings, setReportSettings] = useState<ReportSettings>(defaultReportSettings);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Form add client
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientForm, setClientForm] = useState<Client>(defaultClientForm);

  // Form add user
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ id: '', name: '', department: 'Kế toán', roles: [] as string[] });

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, clientsRes, reportRes, tasksRes] = await Promise.all([
        supabase.from('app_users').select('*').order('name'),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('report_settings').select('*').limit(1),
        supabase.from('tasks').select(`*, clients(name, contact_name, contact_phone)`).order('created_at', { ascending: false })
      ]);
      
      if (usersRes.data) setUsers(usersRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
      if (reportRes.data && reportRes.data.length > 0) {
        setReportSettings(reportRes.data[0]);
      }
      if (tasksRes.data) setTasks(tasksRes.data);
    } catch (err) {
      console.error("Lỗi tải dữ liệu admin:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      setError('');
    } else {
      setError('Mật khẩu không chính xác!');
    }
  };

  const saveReportSettings = async () => {
    try {
      if (reportSettings.id) {
        await supabase.from('report_settings').update(reportSettings).eq('id', reportSettings.id);
      } else {
        const { data } = await supabase.from('report_settings').insert([reportSettings]).select();
        if (data && data[0]) setReportSettings(data[0]);
      }
      alert('Đã lưu cấu hình báo cáo!');
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu báo cáo');
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const generateSheetData = (userTasks: any[], userName: string) => {
    const grouped: { [clientName: string]: any[] } = {};
    userTasks.forEach(t => {
      const cName = t.clients?.name || 'Khác';
      if (!grouped[cName]) grouped[cName] = [];
      grouped[cName].push(t);
    });

    const companyName = reportSettings?.company_name || 'CÔNG TY TNHH DỊCH VỤ KẾ TOÁN AN AN';
    const companyAddress = reportSettings?.address ? `Địa chỉ : ${reportSettings.address}` : 'Địa chỉ : 319, Ấp Mới 2, Xã Mỹ Hạnh, Tỉnh Tây Ninh';
    const officeName = reportSettings?.office_name || 'Văn phòng: Cần Thơ';
    const todayStr = formatDateVN(new Date().toISOString().split('T')[0]);

    const rows: any[][] = [];
    const merges: any[] = [];

    // Row 1 (Index 0): Tên công ty bên trái, Quốc hiệu bên phải
    rows.push([companyName, null, null, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', null, null, null, null, null, null]);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } });
    merges.push({ s: { r: 0, c: 3 }, e: { r: 0, c: 9 } });

    // Row 2 (Index 1): Địa chỉ bên trái, Tiêu ngữ bên phải
    rows.push([companyAddress, null, null, 'Độc lập - Tự do - Hạnh phúc', null, null, null, null, null, null]);
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 2 } });
    merges.push({ s: { r: 1, c: 3 }, e: { r: 1, c: 9 } });

    // Row 3 (Index 2): Dấu gạch tiêu ngữ
    rows.push([null, null, null, '---***---', null, null, null, null, null, null]);
    merges.push({ s: { r: 2, c: 3 }, e: { r: 2, c: 9 } });

    // Row 4 (Index 3): TIÊU ĐỀ BÁO CÁO
    rows.push(['BÁO CÁO KẾT QUẢ CÔNG VIỆC', null, null, null, null, null, null, null, null, null]);
    merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 9 } });

    // Row 5 (Index 4): KỲ BÁO CÁO
    rows.push(['(Kỳ báo cáo: Báo cáo tổng hợp quản lý)', null, null, null, null, null, null, null, null, null]);
    merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: 9 } });

    // Row 6 (Index 5): Trống
    rows.push([]);

    // Row 7 (Index 6): Nhân sự phụ trách & Văn phòng
    rows.push([`Nhân sự phụ trách: ${userName.toUpperCase()}`, null, null, null, null, null, null, null, officeName, null]);
    merges.push({ s: { r: 6, c: 0 }, e: { r: 6, c: 2 } });
    merges.push({ s: { r: 6, c: 8 }, e: { r: 6, c: 9 } });

    // Row 8 (Index 7): Ngày xuất báo cáo
    rows.push([`Ngày xuất báo cáo: ${todayStr}`, null, null, null, null, null, null, null, null, null]);
    merges.push({ s: { r: 7, c: 0 }, e: { r: 7, c: 2 } });

    // Row 9 (Index 8): Trống
    rows.push([]);

    // Row 10 (Index 9): Header bảng dữ liệu
    rows.push([
      'STT',
      'Tên khách hàng',
      'Người liên hệ',
      'Nội dung công việc',
      'Nghiệp vụ',
      'Ngày tiếp nhận',
      'Ngày hoàn thành',
      'Tiến độ / Trạng thái',
      'Mã hồ sơ (nếu có)',
      'Ghi chú / Lưu ý'
    ]);

    let stt = 1;
    let currentRow = 10;

    const actionTypeLabels: { [key: string]: string } = {
      'ke_toan': 'Kế toán',
      'bhxh': 'BHXH',
      'nop_ho_so': 'Setup / GPKD',
      'setup': 'Setup / GPKD',
      'ra_soat': 'Rà soát',
      'dau_tu': 'Đầu tư (IRC)',
      'ho_tro': 'Hỗ trợ',
      'khac': 'Khác'
    };

    const statusLabels: { [key: string]: string } = {
      'completed': 'Đã hoàn thành',
      'in_progress': 'Đang xử lý',
      'received': 'Tiếp nhận',
      'failed': 'Thất bại'
    };

    Object.keys(grouped).sort().forEach(cName => {
      const cTasks = grouped[cName];
      const startClientRow = currentRow;

      cTasks.forEach((t) => {
        const contact = t.contact_person || t.clients?.contact_name || (t.clients?.contact_phone ? `(${t.clients.contact_phone})` : '');
        const role = actionTypeLabels[t.action_type] || t.action_type || 'Kế toán';
        const intakeDate = formatDateVN(t.intake_date || t.created_at?.split('T')[0]);
        const completeDate = t.status === 'completed' ? formatDateVN(t.completed_at?.split('T')[0]) : (formatDateVN(t.deadline) || '');
        const statusText = statusLabels[t.status] || (t.info_pending ? `Đang chờ: ${t.info_pending}` : 'Đang xử lý');
        const dossierCode = t.dossier_code || '';
        const notes = t.resolution_note || t.notes || '';

        rows.push([
          stt,
          cName,
          contact,
          t.content,
          role,
          intakeDate,
          completeDate,
          statusText,
          dossierCode,
          notes
        ]);
        currentRow++;
      });

      if (cTasks.length > 1) {
        merges.push({ s: { r: startClientRow, c: 0 }, e: { r: currentRow - 1, c: 0 } });
        merges.push({ s: { r: startClientRow, c: 1 }, e: { r: currentRow - 1, c: 1 } });
      }

      stt++;
    });

    return { rows, merges };
  };

  const exportManager = () => {
    if (selectedUsers.length === 0) return alert('Vui lòng chọn ít nhất 1 nhân viên để xuất báo cáo');
    
    const wb = XLSX.utils.book_new();
    let hasData = false;

    selectedUsers.forEach(userId => {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      const userTasks = tasks.filter(t => t.user_id === user.id || t.user_id === user.name);
      if (userTasks.length > 0) {
        hasData = true;
        const { rows, merges } = generateSheetData(userTasks, user.name);
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!merges'] = merges;
        ws['!cols'] = [
          { wch: 6 },  // STT
          { wch: 42 }, // Tên KH
          { wch: 22 }, // Người liên hệ
          { wch: 45 }, // Nội dung
          { wch: 16 }, // Nghiệp vụ
          { wch: 15 }, // Tiếp nhận
          { wch: 16 }, // Hoàn thành
          { wch: 22 }, // Trạng thái
          { wch: 18 }, // Mã HS
          { wch: 40 }, // Ghi chú
        ];
        const sheetName = user.name.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    });

    if (!hasData) return alert('Các nhân viên được chọn không có dữ liệu công việc nào!');
    
    XLSX.writeFile(wb, `BaoCao_QuanLy_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleClientFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setClientForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleClientService = (service: string) => {
    setClientForm(prev => {
      const exists = prev.services.includes(service);
      let newServices = exists ? prev.services.filter(s => s !== service) : [...prev.services, service];
      if (newServices.length === 0) newServices = [service]; // bắt buộc chọn ít nhất 1
      return { ...prev, services: newServices };
    });
  };

  const saveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim() || !clientForm.tax_code.trim()) return;
    
    try {
      const clientPayload = {
        tax_code: clientForm.tax_code.trim(),
        name: clientForm.name.trim(),
        contact_name: clientForm.contact_name,
        contact_phone: clientForm.contact_phone,
        accounting_person: clientForm.accounting_person || null,
        insurance_person: clientForm.insurance_person || null,
        review_person: clientForm.review_person || null,
        investment_person: clientForm.investment_person || null,
        services: clientForm.services,
        intake_date: clientForm.intake_date ? clientForm.intake_date : null
      };

      if (clientForm.id) {
        // Edit
        await supabase.from('clients').update(clientPayload).eq('id', clientForm.id);
      } else {
        // Add
        await supabase.from('clients').insert([clientPayload]);
      }
      setShowClientForm(false);
      setClientForm(defaultClientForm);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Lỗi lưu khách hàng');
    }
  };

  const editClient = (c: Client) => {
    setClientForm(c);
    setShowClientForm(true);
  };

  const deleteClient = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa khách hàng này?")) {
      await supabase.from('clients').delete().eq('id', id);
      fetchData();
    }
  };

  const toggleUserRole = (role: string) => {
    setUserForm(prev => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter(r => r !== role) : [...prev.roles, role]
    }));
  };

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim()) return;
    
    try {
      if (userForm.id) {
        await supabase.from('app_users').update({
          name: userForm.name,
          department: userForm.department,
          roles: userForm.roles
        }).eq('id', userForm.id);
      } else {
        const { id, ...newUser } = userForm;
        await supabase.from('app_users').insert([newUser]);
      }
      setShowUserForm(false);
      setUserForm({ id: '', name: '', department: 'Kế toán', roles: [] });
      fetchData();
    } catch(err) {
      console.error(err);
      alert('Lỗi lưu nhân sự');
    }
  };

  const editUser = (u: any) => {
    setUserForm({ id: u.id, name: u.name, department: u.department, roles: u.roles || [] });
    setShowUserForm(true);
  };

  const deleteUser = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn xóa nhân viên này?")) {
      await supabase.from('app_users').delete().eq('id', id);
      fetchData();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50/50">
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Quyền truy cập quản lý</h1>
          <p className="text-gray-500 mb-6">Vui lòng nhập mật khẩu quản trị để tiếp tục</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition mb-4 text-center text-lg tracking-widest"
              placeholder="••••••••"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition">
              Đăng nhập
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản trị hệ thống</h1>
          <p className="text-gray-500 mt-1">Quản lý nhân sự, danh sách khách hàng và thiết lập báo cáo</p>
        </div>
        <button onClick={() => { setIsAuthenticated(false); sessionStorage.removeItem('admin_auth'); }} className="text-gray-500 hover:text-red-500 px-4 py-2 border rounded-md">
          Đăng xuất
        </button>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {[
          { id: 'overview', icon: <Building2 size={18} />, label: 'Tổng quan' },
          { id: 'users', icon: <Users size={18} />, label: 'Nhân sự' },
          { id: 'clients', icon: <Building2 size={18} />, label: 'Khách hàng' },
          { id: 'reports', icon: <FileSpreadsheet size={18} />, label: 'Thiết lập báo cáo' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {loading && <div className="text-center py-10">Đang tải dữ liệu từ Supabase...</div>}
        
        {!loading && activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Users size={24}/></div>
              <div>
                <p className="text-sm text-gray-500">Tổng nhân sự</p>
                <p className="text-2xl font-bold text-gray-800">{users.length}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><Building2 size={24}/></div>
              <div>
                <p className="text-sm text-gray-500">Khách hàng</p>
                <p className="text-2xl font-bold text-gray-800">{clients.length}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'reports' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cấu hình báo cáo */}
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/60">
              <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <Save size={20} className="text-blue-600" />
                Cấu hình thông tin văn phòng
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu ngữ (Góc trên trái)</label>
                  <textarea rows={2} value={reportSettings.header_text} onChange={e => setReportSettings({...reportSettings, header_text: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên Công ty</label>
                  <input type="text" value={reportSettings.company_name} onChange={e => setReportSettings({...reportSettings, company_name: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                  <input type="text" value={reportSettings.address} onChange={e => setReportSettings({...reportSettings, address: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên Văn phòng / Chi nhánh</label>
                  <input type="text" value={reportSettings.office_name} onChange={e => setReportSettings({...reportSettings, office_name: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <button onClick={saveReportSettings} className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 mt-4 hover:bg-blue-700">
                  <Save size={18}/> Lưu cấu hình
                </button>
              </div>
            </div>

            {/* Báo cáo cấp quản lý */}
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/60 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Báo cáo cấp quản lý</h2>
                  <p className="text-xs text-gray-500">Xuất file Excel gộp nhiều sheet theo từng nhân sự</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                Chọn các nhân viên bên dưới để xuất báo cáo. Mỗi nhân viên được chọn sẽ nằm ở một Sheet riêng biệt trong cùng 1 file Excel:
              </p>
              
              <div className="flex-1 bg-gray-50/70 rounded-lg p-3 border border-gray-200 mb-4 overflow-y-auto max-h-56">
                <div className="space-y-1.5">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-md transition text-sm">
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.includes(u.id)}
                        onChange={() => toggleUserSelection(u.id)}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                      />
                      <span className="font-medium text-gray-700">{u.name}</span>
                      <span className="text-xs text-gray-500">({u.department})</span>
                    </label>
                  ))}
                  {users.length === 0 && <p className="text-gray-400 text-xs text-center py-4">Chưa có nhân viên nào</p>}
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedUsers(users.map(u => u.id))}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200"
                >
                  Chọn tất cả
                </button>
                <button 
                  onClick={() => setSelectedUsers([])}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200"
                >
                  Bỏ chọn
                </button>
              </div>

              <button 
                onClick={exportManager}
                className="w-full mt-4 bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                <FileSpreadsheet size={18} />
                Xuất Excel tổng hợp (Nhiều Sheet)
              </button>
            </div>
          </div>
        )}

        {!loading && activeTab === 'clients' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Danh sách khách hàng</h2>
              <button onClick={() => {setClientForm(defaultClientForm); setShowClientForm(true);}} className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700">
                <Plus size={18}/> Thêm khách hàng
              </button>
            </div>
            
            {showClientForm && (
              <form onSubmit={saveClient} className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><label className="block text-sm mb-1">Mã số thuế *</label><input required type="text" name="tax_code" value={clientForm.tax_code} onChange={handleClientFormChange} className="w-full px-3 py-2 border rounded-md"/></div>
                  <div><label className="block text-sm mb-1">Tên khách hàng *</label><input required type="text" name="name" value={clientForm.name} onChange={handleClientFormChange} className="w-full px-3 py-2 border rounded-md"/></div>
                  <div><label className="block text-sm mb-1">Người liên hệ</label><input type="text" name="contact_name" value={clientForm.contact_name} onChange={handleClientFormChange} className="w-full px-3 py-2 border rounded-md"/></div>
                  <div><label className="block text-sm mb-1">Số điện thoại</label><input type="text" name="contact_phone" value={clientForm.contact_phone} onChange={handleClientFormChange} className="w-full px-3 py-2 border rounded-md"/></div>
                  {clientForm.services.includes('Kế toán') && (
                    <div>
                      <label className="block text-sm mb-1">Người phụ trách Kế toán</label>
                      <select name="accounting_person" value={clientForm.accounting_person || ''} onChange={handleClientFormChange} className="w-full px-3 py-2 border rounded-md">
                        <option value="">-- Trống --</option>
                        {users.filter(u => u.department === 'Kế toán' || u.roles?.includes('ketoan')).map(u => (
                          <option key={u.id} value={u.name}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {clientForm.services.includes('BHXH') && (
                    <div>
                      <label className="block text-sm mb-1">Người phụ trách BHXH</label>
                      <select name="insurance_person" value={clientForm.insurance_person || ''} onChange={handleClientFormChange} className="w-full px-3 py-2 border rounded-md">
                        <option value="">-- Trống --</option>
                        {users.filter(u => u.department === 'BHXH' || u.roles?.includes('bhxh')).map(u => (
                          <option key={u.id} value={u.name}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {clientForm.services.includes('Rà soát') && (
                    <div>
                      <label className="block text-sm mb-1 text-indigo-900 font-medium">Người phụ trách Rà soát sổ sách</label>
                      <select name="review_person" value={clientForm.review_person || ''} onChange={handleClientFormChange} className="w-full px-3 py-2 border border-indigo-200 rounded-md bg-indigo-50/20">
                        <option value="">-- Trống --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.name}>{u.name} ({u.department})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {clientForm.services.includes('Đầu tư') && (
                    <div>
                      <label className="block text-sm mb-1 text-rose-900 font-medium">Người làm Giấy chứng nhận đầu tư (IRC)</label>
                      <select name="investment_person" value={clientForm.investment_person || ''} onChange={handleClientFormChange} className="w-full px-3 py-2 border border-rose-200 rounded-md bg-rose-50/20">
                        <option value="">-- Trống --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.name}>{u.name} ({u.department})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm mb-1 font-medium text-gray-700">Ngày tiếp nhận (Không bắt buộc)</label>
                    <input 
                      type="date" 
                      name="intake_date" 
                      value={clientForm.intake_date || ''} 
                      onChange={handleClientFormChange} 
                      className="w-full px-3 py-2 border rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Dùng để tính chính sách miễn phí 3 tháng đầu đối với khách hàng mới đăng ký GPKD (nếu có).</p>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                  <label className="block text-sm font-semibold text-blue-900 mb-1">Mảng nghiệp vụ / dịch vụ cung cấp:</label>
                  <p className="text-xs text-blue-700 mb-3">
                    Lưu ý: Bạn có thể tích chọn thêm hoặc bỏ chọn dịch vụ bất kỳ lúc nào nếu khách hàng phát sinh sau này.
                  </p>
                  <div className="flex gap-6 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-800">
                      <input type="checkbox" checked={clientForm.services.includes('Kế toán')} onChange={()=>toggleClientService('Kế toán')}/> Kế toán dịch vụ
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-800">
                      <input type="checkbox" checked={clientForm.services.includes('BHXH')} onChange={()=>toggleClientService('BHXH')}/> Bảo hiểm xã hội (BHXH)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-indigo-900">
                      <input type="checkbox" checked={clientForm.services.includes('Rà soát')} onChange={()=>toggleClientService('Rà soát')}/> Rà soát sổ sách / BCTC
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-rose-900">
                      <input type="checkbox" checked={clientForm.services.includes('Đầu tư')} onChange={()=>toggleClientService('Đầu tư')}/> Giấy chứng nhận đầu tư (IRC)
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowClientForm(false)} className="px-4 py-2 bg-gray-200 rounded-md">Hủy</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Lưu</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <th className="py-3 px-4 font-medium text-gray-600">MST</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Khách hàng</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Liên hệ</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Dịch vụ & Phụ trách</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clients.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">{c.tax_code}</td>
                      <td className="py-3 px-4 font-medium">{c.name}</td>
                      <td className="py-3 px-4">{c.contact_name} - {c.contact_phone}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {c.services?.map(s => (
                            <span 
                              key={s} 
                              className={`px-2 py-0.5 text-xs rounded-md font-medium ${
                                s === 'Rà soát' 
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                  : s === 'Đầu tư' 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                  : s === 'BHXH' 
                                  ? 'bg-emerald-50 text-emerald-700' 
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
                          {c.accounting_person && <div>• Kế toán: <strong className="text-blue-700">{c.accounting_person}</strong></div>}
                          {c.insurance_person && <div>• BHXH: <strong className="text-emerald-700">{c.insurance_person}</strong></div>}
                          {c.review_person && <div>• Rà soát: <strong className="text-indigo-700">{c.review_person}</strong></div>}
                          {c.investment_person && <div>• Đầu tư (IRC): <strong className="text-rose-700">{c.investment_person}</strong></div>}
                        </div>
                      </td>
                      <td className="py-3 px-4 flex gap-2">
                        <button onClick={() => editClient(c)} className="text-gray-400 hover:text-blue-600"><Edit2 size={18}/></button>
                        <button onClick={() => deleteClient(c.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Danh sách nhân sự</h2>
              <button onClick={() => {setUserForm({ id: '', name: '', department: 'Kế toán', roles: [] }); setShowUserForm(true);}} className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700">
                <Plus size={18}/> Thêm nhân sự
              </button>
            </div>

            {showUserForm && (
              <form onSubmit={saveUser} className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm mb-1">Họ và tên *</label>
                    <input required type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-md"/>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Phòng ban</label>
                    <select value={userForm.department} onChange={e => setUserForm({...userForm, department: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                      <option value="Kế toán">Kế toán</option>
                      <option value="BHXH">Bảo hiểm xã hội</option>
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm mb-2">Quyền hạn kiêm nhiệm thêm:</label>
                  <div className="flex gap-4 flex-wrap">
                    {userForm.department !== 'Kế toán' && (
                      <label className="flex items-center gap-2"><input type="checkbox" checked={userForm.roles.includes('ketoan')} onChange={()=>toggleUserRole('ketoan')}/> Kiêm Kế toán</label>
                    )}
                    {userForm.department !== 'BHXH' && (
                      <label className="flex items-center gap-2"><input type="checkbox" checked={userForm.roles.includes('bhxh')} onChange={()=>toggleUserRole('bhxh')}/> Kiêm BHXH</label>
                    )}
                    <label className="flex items-center gap-2"><input type="checkbox" checked={userForm.roles.includes('gpkd')} onChange={()=>toggleUserRole('gpkd')}/> Hồ sơ GPKD</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={userForm.roles.includes('dt')} onChange={()=>toggleUserRole('dt')}/> Chứng nhận đầu tư</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={userForm.roles.includes('khac')} onChange={()=>toggleUserRole('khac')}/> Việc khác</label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowUserForm(false)} className="px-4 py-2 bg-gray-200 rounded-md">Hủy</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Lưu</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <th className="py-3 px-4 font-medium text-gray-600">Họ và tên</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Phòng ban</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Quyền hạn</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{u.name}</td>
                      <td className="py-3 px-4">{u.department}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-wrap">
                          {u.roles?.map((r: string) => <span key={r} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">{r === 'gpkd' ? 'Hồ sơ GPKD' : r === 'dt' ? 'Đầu tư' : r === 'bhxh' ? 'Kiêm BHXH' : r === 'ketoan' ? 'Kiêm Kế toán' : 'Khác'}</span>)}
                        </div>
                      </td>
                      <td className="py-3 px-4 flex gap-2">
                        <button onClick={() => editUser(u)} className="text-gray-400 hover:text-blue-600"><Edit2 size={18}/></button>
                        <button onClick={() => deleteUser(u.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
