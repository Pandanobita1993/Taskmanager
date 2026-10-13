import React, { useState, useEffect } from 'react';
import { Users, FileSpreadsheet, Building2, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ReportSettings, Client, UserFormData } from '../components/admin/adminTypes';
import { defaultReportSettings, defaultClientForm } from '../components/admin/adminTypes';
import { AdminOverviewTab } from '../components/admin/AdminOverviewTab';
import { AdminReportsTab } from '../components/admin/AdminReportsTab';
import { AdminClientsTab } from '../components/admin/AdminClientsTab';
import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { exportManagerExcel } from '../components/admin/adminExcelExport';
import { loadCurrentProfile } from '../lib/profile';

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
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
    loadCurrentProfile()
      .then((profile) => {
        setIsAuthorized(Boolean(profile.isAdmin));
        if (profile.isAdmin) return fetchData();
      })
      .catch(() => setIsAuthorized(false));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, clientsRes, reportRes, tasksRes] = await Promise.all([
        supabase.from('app_users').select('*').eq('is_active', true).order('name'),
        supabase.from('clients').select('*').is('archived_at', null).order('created_at', { ascending: false }),
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
    if (window.confirm("Lưu trữ khách hàng này? Lịch sử công việc vẫn được giữ nguyên.")) {
      const { error } = await supabase.from('clients').update({ archived_at: new Date().toISOString() }).eq('id', id);
      if (error) return alert(`Không thể lưu trữ khách hàng: ${error.message}`);
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
    if (window.confirm("Vô hiệu hóa nhân viên này? Lịch sử công việc vẫn được giữ nguyên.")) {
      const { error } = await supabase.from('app_users').update({ is_active: false }).eq('id', id);
      if (error) return alert(`Không thể vô hiệu hóa nhân viên: ${error.message}`);
      fetchData();
    }
  };

  if (isAuthorized === null) {
    return <div className="p-10 text-center text-gray-500">Đang kiểm tra quyền quản trị...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="p-10 max-w-lg mx-auto text-center">
        <ShieldAlert size={44} className="mx-auto text-amber-600 mb-3" />
        <h1 className="text-xl font-bold text-gray-900">Không có quyền quản trị</h1>
        <p className="text-gray-500 mt-2">Tài khoản hiện tại không được phép truy cập dữ liệu quản lý.</p>
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
