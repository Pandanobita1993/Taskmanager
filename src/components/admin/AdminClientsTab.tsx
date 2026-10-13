import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { Client } from './adminTypes';

interface AdminClientsTabProps {
  clients: Client[];
  users: any[];
  showClientForm: boolean;
  clientForm: Client;
  onOpenAddClient: () => void;
  onCloseClientForm: () => void;
  onSaveClient: (e: React.FormEvent) => void;
  onClientFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onToggleClientService: (service: string) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}

export const AdminClientsTab: React.FC<AdminClientsTabProps> = ({
  clients,
  users,
  showClientForm,
  clientForm,
  onOpenAddClient,
  onCloseClientForm,
  onSaveClient,
  onClientFormChange,
  onToggleClientService,
  onEditClient,
  onDeleteClient
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Danh sách khách hàng</h2>
        <button 
          onClick={onOpenAddClient} 
          className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={18}/> Thêm khách hàng
        </button>
      </div>
      
      {showClientForm && (
        <form onSubmit={onSaveClient} className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-1">Mã số thuế *</label>
              <input required type="text" name="tax_code" value={clientForm.tax_code} onChange={onClientFormChange} className="w-full px-3 py-2 border rounded-md"/>
            </div>
            <div>
              <label className="block text-sm mb-1">Tên khách hàng *</label>
              <input required type="text" name="name" value={clientForm.name} onChange={onClientFormChange} className="w-full px-3 py-2 border rounded-md"/>
            </div>
            <div>
              <label className="block text-sm mb-1">Người liên hệ</label>
              <input type="text" name="contact_name" value={clientForm.contact_name} onChange={onClientFormChange} className="w-full px-3 py-2 border rounded-md"/>
            </div>
            <div>
              <label className="block text-sm mb-1">Số điện thoại</label>
              <input type="text" name="contact_phone" value={clientForm.contact_phone} onChange={onClientFormChange} className="w-full px-3 py-2 border rounded-md"/>
            </div>

            {clientForm.services.includes('Kế toán') && (
              <div>
                <label className="block text-sm mb-1">Người phụ trách Kế toán</label>
                <select name="accounting_person" value={clientForm.accounting_person || ''} onChange={onClientFormChange} className="w-full px-3 py-2 border rounded-md">
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
                <select name="insurance_person" value={clientForm.insurance_person || ''} onChange={onClientFormChange} className="w-full px-3 py-2 border rounded-md">
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
                <select name="review_person" value={clientForm.review_person || ''} onChange={onClientFormChange} className="w-full px-3 py-2 border border-indigo-200 rounded-md bg-indigo-50/20">
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
                <select name="investment_person" value={clientForm.investment_person || ''} onChange={onClientFormChange} className="w-full px-3 py-2 border border-rose-200 rounded-md bg-rose-50/20">
                  <option value="">-- Trống --</option>
                  {users.filter(u => u.roles?.includes('dt')).map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.department})</option>
                  ))}
                </select>
                {users.filter(u => u.roles?.includes('dt')).length === 0 && (
                  <p className="text-xs text-rose-600 mt-1">
                    * Chưa có nhân sự nào được tích quyền kiêm nhiệm "Chứng nhận đầu tư" trong tab Nhân sự.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm mb-1 font-medium text-gray-700">Ngày tiếp nhận (Không bắt buộc)</label>
              <input 
                type="date" 
                name="intake_date" 
                value={clientForm.intake_date || ''} 
                onChange={onClientFormChange} 
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
                <input type="checkbox" checked={clientForm.services.includes('Kế toán')} onChange={()=>onToggleClientService('Kế toán')}/> Kế toán dịch vụ
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-800">
                <input type="checkbox" checked={clientForm.services.includes('BHXH')} onChange={()=>toggleClientServiceSafe('BHXH')}/> Bảo hiểm xã hội (BHXH)
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-indigo-900">
                <input type="checkbox" checked={clientForm.services.includes('Rà soát')} onChange={()=>toggleClientServiceSafe('Rà soát')}/> Rà soát sổ sách / BCTC
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-rose-900">
                <input type="checkbox" checked={clientForm.services.includes('Đầu tư')} onChange={()=>toggleClientServiceSafe('Đầu tư')}/> Giấy chứng nhận đầu tư (IRC)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCloseClientForm} className="px-4 py-2 bg-gray-200 rounded-md">Hủy</button>
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
                  <button onClick={() => onEditClient(c)} className="text-gray-400 hover:text-blue-600"><Edit2 size={18}/></button>
                  <button onClick={() => onDeleteClient(c.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  function toggleClientServiceSafe(service: string) {
    onToggleClientService(service);
  }
};
