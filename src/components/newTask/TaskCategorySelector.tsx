import React from 'react';
import { Sparkles } from 'lucide-react';

interface TaskCategorySelectorProps {
  taskCategory: 'main' | 'support';
  setTaskCategory: (val: 'main' | 'support') => void;
  supportedUserId: string;
  setSupportedUserId: (val: string) => void;
  users: any[];
  currentUserName?: string;
  onResetSelectedClient: () => void;
}

export const TaskCategorySelector: React.FC<TaskCategorySelectorProps> = ({
  taskCategory,
  setTaskCategory,
  supportedUserId,
  setSupportedUserId,
  users,
  currentUserName,
  onResetSelectedClient
}) => {
  return (
    <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/80 space-y-3">
      <label className="block text-sm font-semibold text-gray-700">Tính chất phân công:</label>
      <div className="flex flex-wrap gap-3">
        <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border text-sm font-medium transition ${taskCategory === 'main' ? 'bg-white border-blue-500 text-blue-700 shadow-xs ring-1 ring-blue-400' : 'bg-white/80 border-gray-200 text-gray-600 hover:border-gray-300'}`}>
          <input 
            type="radio" 
            name="taskCategory" 
            value="main" 
            checked={taskCategory === 'main'} 
            onChange={() => { setTaskCategory('main'); onResetSelectedClient(); }} 
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
            onChange={() => { setTaskCategory('support'); onResetSelectedClient(); }} 
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
            onChange={e => { setSupportedUserId(e.target.value); onResetSelectedClient(); }}
            className="w-full px-3 py-2 border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 bg-white text-sm"
          >
            <option value="">-- Chọn nhân viên được hỗ trợ --</option>
            {users.filter(u => u.name !== currentUserName).map(u => (
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
  );
};
