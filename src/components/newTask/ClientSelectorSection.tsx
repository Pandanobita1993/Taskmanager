import React from 'react';
import { Building2, Plus, Search } from 'lucide-react';

interface ClientSelectorSectionProps {
  clients: any[];
  filteredClients: any[];
  selectedClientId: string;
  clientSearch: string;
  loadingClients: boolean;
  showQuickAddClient: boolean;
  newClientName: string;
  newClientTax: string;
  onSelectClient: (clientId: string) => void;
  onClientSearchChange: (val: string) => void;
  onToggleQuickAdd: () => void;
  onNewClientNameChange: (val: string) => void;
  onNewClientTaxChange: (val: string) => void;
  onQuickAddSubmit: (e: React.FormEvent) => void;
}

export const ClientSelectorSection: React.FC<ClientSelectorSectionProps> = ({
  filteredClients,
  selectedClientId,
  clientSearch,
  loadingClients,
  showQuickAddClient,
  newClientName,
  newClientTax,
  onSelectClient,
  onClientSearchChange,
  onToggleQuickAdd,
  onNewClientNameChange,
  onNewClientTaxChange,
  onQuickAddSubmit
}) => {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex justify-between items-center border-b pb-2">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <Building2 size={18} className="text-blue-600" />
          2. Thông tin Doanh nghiệp / Khách hàng
        </h2>
        <button 
          type="button" 
          onClick={onToggleQuickAdd}
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
              onChange={e => onNewClientNameChange(e.target.value)} 
              className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
            />
            <input 
              type="text" 
              placeholder="Mã số thuế..." 
              value={newClientTax} 
              onChange={e => onNewClientTaxChange(e.target.value)} 
              className="sm:w-1/3 px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
            />
            <button 
              type="button" 
              onClick={onQuickAddSubmit} 
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
            onChange={e => onClientSearchChange(e.target.value)}
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
              onClick={() => onClientSearchChange('')} 
              className="underline text-xs font-semibold"
            >
              Xóa tìm kiếm
            </button>
          </div>
        ) : (
          <select 
            required 
            value={selectedClientId} 
            onChange={e => onSelectClient(e.target.value)}
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
  );
};
