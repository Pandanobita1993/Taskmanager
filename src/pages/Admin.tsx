import React, { useState, useEffect } from 'react';
import { Users, FileSpreadsheet, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ReportSettings, Client, UserFormData } from '../components/admin/adminTypes';
import { defaultReportSettings, defaultClientForm } from '../components/admin/adminTypes';
import { AdminAuth } from '../components/admin/AdminAuth';
import { AdminOverviewTab } from '../components/admin/AdminOverviewTab';
import { AdminReportsTab } from '../components/admin/AdminReportsTab';
import { AdminClientsTab } from '../components/admin/AdminClientsTab';
import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { exportManagerExcel } from '../components/admin/adminExcelExport';

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
  const [userForm, setUserForm] = useState<UserFormData>({ id: '', name: '', department: 'Kế toán', roles: [] });

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
      if (clientsRes.data) {
        // Parse người phụ trách Rà soát và Đầu tư được mã hóa trong services (VD: 'Rà soát:Tên người')
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
        setClients(formattedClients);
      }
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

  const exportManager = () => {
    exportManagerExcel(selectedUsers, users, tasks, reportSettings);
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
      // Chuẩn hóa mảng services kèm theo người phụ trách tương ứng
      const finalServices: string[] = [];
      (clientForm.services || []).forEach(s => {
        if (s === 'Rà soát') {
          finalServices.push(clientForm.review_person ? `Rà soát:${clientForm.review_person}` : 'Rà soát');
        } else if (s === 'Đầu tư') {
          finalServices.push(clientForm.investment_person ? `Đầu tư:${clientForm.investment_person}` : 'Đầu tư');
        } else {
          finalServices.push(s);
        }
      });

      // Chỉ gửi các cột thực sự tồn tại trong cơ sở dữ liệu Supabase
      const clientPayload: any = {
        tax_code: clientForm.tax_code.trim(),
        name: clientForm.name.trim(),
        contact_name: clientForm.contact_name || null,
        contact_phone: clientForm.contact_phone || null,
        accounting_person: clientForm.accounting_person || null,
        insurance_person: clientForm.insurance_person || null,
        services: finalServices,
        intake_date: clientForm.intake_date ? clientForm.intake_date : null
      };

      if (clientForm.id) {
        // Edit
        const { error } = await supabase.from('clients').update(clientPayload).eq('id', clientForm.id);
        if (error) throw error;
      } else {
        // Add
        const { error } = await supabase.from('clients').insert([clientPayload]);
        if (error) throw error;
      }
      setShowClientForm(false);
      setClientForm(defaultClientForm);
      fetchData();
      alert("Đã lưu thông tin khách hàng thành công!");
    } catch (err: any) {
      console.error("Chi tiết lỗi lưu khách hàng:", err);
      alert('Lỗi lưu khách hàng: ' + (err?.message || err?.error_description || JSON.stringify(err)));
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
      <AdminAuth
        password={password}
        setPassword={setPassword}
        error={error}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản trị hệ thống</h1>
          <p className="text-gray-500 mt-1">Quản lý nhân sự, danh sách khách hàng và thiết lập báo cáo</p>
        </div>
        <button 
          onClick={() => { setIsAuthenticated(false); sessionStorage.removeItem('admin_auth'); }} 
          className="text-gray-500 hover:text-red-500 px-4 py-2 border rounded-md"
        >
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
          <AdminOverviewTab
            userCount={users.length}
            clientCount={clients.length}
          />
        )}

        {!loading && activeTab === 'reports' && (
          <AdminReportsTab
            reportSettings={reportSettings}
            setReportSettings={setReportSettings}
            onSaveReportSettings={saveReportSettings}
            users={users}
            selectedUsers={selectedUsers}
            toggleUserSelection={toggleUserSelection}
            onSelectAllUsers={() => setSelectedUsers(users.map(u => u.id))}
            onClearUserSelection={() => setSelectedUsers([])}
            onExportManager={exportManager}
          />
        )}

        {!loading && activeTab === 'clients' && (
          <AdminClientsTab
            clients={clients}
            users={users}
            showClientForm={showClientForm}
            clientForm={clientForm}
            onOpenAddClient={() => { setClientForm(defaultClientForm); setShowClientForm(true); }}
            onCloseClientForm={() => setShowClientForm(false)}
            onSaveClient={saveClient}
            onClientFormChange={handleClientFormChange}
            onToggleClientService={toggleClientService}
            onEditClient={editClient}
            onDeleteClient={deleteClient}
          />
        )}

        {!loading && activeTab === 'users' && (
          <AdminUsersTab
            users={users}
            showUserForm={showUserForm}
            userForm={userForm}
            setUserForm={setUserForm}
            onOpenAddUser={() => { setUserForm({ id: '', name: '', department: 'Kế toán', roles: [] }); setShowUserForm(true); }}
            onCloseUserForm={() => setShowUserForm(false)}
            onSaveUser={saveUser}
            onToggleUserRole={toggleUserRole}
            onEditUser={editUser}
            onDeleteUser={deleteUser}
          />
        )}
      </div>
    </div>
  );
}
