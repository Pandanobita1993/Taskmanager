import React, { useState } from 'react';
import { Save, Users, FileSpreadsheet } from 'lucide-react';
import type { ReportSettings } from './adminTypes';
import { OFFICES, getOffice } from '../../lib/offices';

interface AdminReportsTabProps {
  reportSettings: ReportSettings;
  setReportSettings: React.Dispatch<React.SetStateAction<ReportSettings>>;
  onSaveReportSettings: () => void;
  users: any[];
  selectedUsers: string[];
  toggleUserSelection: (userId: string) => void;
  onSelectAllUsers: (userIds: string[]) => void;
  onClearUserSelection: () => void;
  onExportManager: () => Promise<void>;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({
  reportSettings,
  setReportSettings,
  onSaveReportSettings,
  users,
  selectedUsers,
  toggleUserSelection,
  onSelectAllUsers,
  onClearUserSelection,
  onExportManager
}) => {
  const [officeFilter, setOfficeFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const visibleUsers = users.filter(user => !officeFilter || getOffice(user.office) === officeFilter);
  return (
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
            <textarea 
              rows={2} 
              value={reportSettings.header_text} 
              onChange={e => setReportSettings({...reportSettings, header_text: e.target.value})} 
              className="w-full px-3 py-2 border rounded-md" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên Công ty</label>
            <input 
              type="text" 
              value={reportSettings.company_name} 
              onChange={e => setReportSettings({...reportSettings, company_name: e.target.value})} 
              className="w-full px-3 py-2 border rounded-md" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
            <input 
              type="text" 
              value={reportSettings.address} 
              onChange={e => setReportSettings({...reportSettings, address: e.target.value})} 
              className="w-full px-3 py-2 border rounded-md" 
            />
          </div>
          <div>
            <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg p-3">Văn phòng trên báo cáo được lấy theo nhân sự: Cần Thơ hoặc Long An. Thiết lập trong mục Nhân sự.</p>
          </div>
          <button onClick={onSaveReportSettings} className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 mt-4 hover:bg-blue-700">
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
        <p className="text-xs text-gray-600 mb-3">Có thêm sheet GhiNhanCongNo tổng hợp công nợ và trạng thái sếp xác minh; khách hàng chung chỉ được tính một lần.</p>
        <p className="text-xs text-gray-600 mb-3">Sheet NhapLieuMISA tổng hợp nhập liệu kế toán/rà soát và in chứng từ, có nhân sự thực hiện và trạng thái từng việc.</p>
        
        <label className="text-sm text-gray-700 mb-3">Lọc theo văn phòng
          <select value={officeFilter} onChange={e => { setOfficeFilter(e.target.value); onClearUserSelection(); }} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white">
            <option value="">Tất cả văn phòng</option>
            {OFFICES.map(office => <option key={office} value={office}>{office}</option>)}
          </select>
        </label>
        <div className="flex-1 bg-gray-50/70 rounded-lg p-3 border border-gray-200 mb-4 overflow-y-auto max-h-56">
          <div className="space-y-1.5">
            {visibleUsers.map(u => (
              <label key={u.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-md transition text-sm">
                <input 
                  type="checkbox" 
                  checked={selectedUsers.includes(u.id)}
                  onChange={() => toggleUserSelection(u.id)}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <span className="font-medium text-gray-700">{u.name}</span>
                <span className="text-xs text-gray-500">({u.department} · {getOffice(u.office)})</span>
              </label>
            ))}
            {visibleUsers.length === 0 && <p className="text-gray-400 text-xs text-center py-4">Chưa có nhân viên nào thuộc văn phòng này</p>}
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => onSelectAllUsers(visibleUsers.map(user => user.id))}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200"
          >
            Chọn tất cả đang hiển thị
          </button>
          <button 
            onClick={onClearUserSelection}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200"
          >
            Bỏ chọn
          </button>
        </div>

        <button 
          onClick={async () => { setExporting(true); try { await onExportManager(); } finally { setExporting(false); } }}
          disabled={exporting}
          className="w-full mt-4 bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-sm text-sm disabled:opacity-60 disabled:cursor-wait"
        >
          <FileSpreadsheet size={18} />
          {exporting ? 'Đang lấy dữ liệu và xuất Excel...' : 'Xuất Excel tổng hợp (Nhiều Sheet)'}
        </button>
      </div>
    </div>
  );
};
