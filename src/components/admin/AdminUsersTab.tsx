import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { UserFormData } from './adminTypes';

interface AdminUsersTabProps {
  users: any[];
  showUserForm: boolean;
  userForm: UserFormData;
  setUserForm: React.Dispatch<React.SetStateAction<UserFormData>>;
  onOpenAddUser: () => void;
  onCloseUserForm: () => void;
  onSaveUser: (e: React.FormEvent) => void;
  onToggleUserRole: (role: string) => void;
  onEditUser: (user: any) => void;
  onDeleteUser: (id: string) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  showUserForm,
  userForm,
  setUserForm,
  onOpenAddUser,
  onCloseUserForm,
  onSaveUser,
  onToggleUserRole,
  onEditUser,
  onDeleteUser
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Danh sách nhân sự</h2>
        <button 
          onClick={onOpenAddUser} 
          className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={18}/> Thêm nhân sự
        </button>
      </div>

      {showUserForm && (
        <form onSubmit={onSaveUser} className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
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
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={userForm.roles.includes('ketoan')} onChange={()=>onToggleUserRole('ketoan')}/> Kiêm Kế toán
                </label>
              )}
              {userForm.department !== 'BHXH' && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={userForm.roles.includes('bhxh')} onChange={()=>onToggleUserRole('bhxh')}/> Kiêm BHXH
                </label>
              )}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={userForm.roles.includes('gpkd')} onChange={()=>onToggleUserRole('gpkd')}/> Hồ sơ GPKD
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={userForm.roles.includes('dt')} onChange={()=>onToggleUserRole('dt')}/> Chứng nhận đầu tư
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={userForm.roles.includes('khac')} onChange={()=>onToggleUserRole('khac')}/> Việc khác
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCloseUserForm} className="px-4 py-2 bg-gray-200 rounded-md">Hủy</button>
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
                    {u.roles?.map((r: string) => (
                      <span key={r} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">
                        {r === 'gpkd' ? 'Hồ sơ GPKD' : r === 'dt' ? 'Đầu tư' : r === 'bhxh' ? 'Kiêm BHXH' : r === 'ketoan' ? 'Kiêm Kế toán' : 'Khác'}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 flex gap-2">
                  <button onClick={() => onEditUser(u)} className="text-gray-400 hover:text-blue-600"><Edit2 size={18}/></button>
                  <button onClick={() => onDeleteUser(u.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
