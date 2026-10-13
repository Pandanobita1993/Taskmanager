import React from 'react';
import { FileText, Sparkles, Calculator } from 'lucide-react';
import type { BusinessDomain } from './newTaskConstants';
import {
  QUICK_ACCOUNTING_TASKS,
  QUICK_BHXH_TASKS,
  QUICK_SETUP_TASKS,
  QUICK_RA_SOAT_TASKS,
  QUICK_DAU_TU_TASKS,
  QUICK_AGENCIES
} from './newTaskConstants';

interface TaskDetailsFormProps {
  businessDomain: BusinessDomain;
  isUrgent: boolean;
  setIsUrgent: (val: boolean) => void;
  selectedTaskCategory: string;
  setSelectedTaskCategory: (val: string) => void;
  inputWhat: string;
  setInputWhat: React.Dispatch<React.SetStateAction<string>>;
  inputPeriod: string;
  setInputPeriod: (val: string) => void;
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  dossierCode: string;
  setDossierCode: (val: string) => void;
  authorityAgency: string;
  setAuthorityAgency: (val: string) => void;
  paperDossier: string;
  setPaperDossier: (val: string) => void;
  contactPerson: string;
  setContactPerson: (val: string) => void;
  infoProvided: string;
  setInfoProvided: (val: string) => void;
  infoPending: string;
  setInfoPending: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
}

export const TaskDetailsForm: React.FC<TaskDetailsFormProps> = ({
  businessDomain,
  isUrgent,
  setIsUrgent,
  selectedTaskCategory,
  setSelectedTaskCategory,
  inputWhat,
  setInputWhat,
  inputPeriod,
  setInputPeriod,
  content,
  setContent,
  dossierCode,
  setDossierCode,
  authorityAgency,
  setAuthorityAgency,
  paperDossier,
  setPaperDossier,
  contactPerson,
  setContactPerson,
  infoProvided,
  setInfoProvided,
  infoPending,
  setInfoPending,
  notes,
  setNotes
}) => {
  const handleSelectQuickTask = (taskText: string) => {
    if (!content) {
      setContent(taskText);
    } else if (!content.includes(taskText)) {
      setContent(prev => `${prev}\n• ${taskText}`);
    }
  };

  const currentQuickTasks = (
    businessDomain === 'ke_toan' 
      ? ['Nhập liệu chứng từ hóa đơn', ...QUICK_ACCOUNTING_TASKS]
      : (businessDomain === 'bhxh' 
          ? QUICK_BHXH_TASKS 
          : (businessDomain === 'setup' 
              ? QUICK_SETUP_TASKS 
              : (businessDomain === 'ra_soat' ? ['Nhập liệu rà soát sổ sách', ...QUICK_RA_SOAT_TASKS] : QUICK_DAU_TU_TASKS)))
  );

  return (
    <div className="space-y-4 pt-2">
      <div className="border-b pb-2 flex justify-between items-center">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <FileText size={18} className="text-blue-600" />
          3. Chi tiết công việc
        </h2>
        <label className="flex items-center gap-2 cursor-pointer bg-red-50 text-red-700 px-3 py-1 rounded-lg border border-red-200 text-xs font-bold hover:bg-red-100 transition">
          <input 
            type="checkbox" 
            checked={isUrgent}
            onChange={e => setIsUrgent(e.target.checked)}
            className="w-4 h-4 text-red-600 rounded" 
          />
          <span>Đánh dấu việc GẤP!</span>
        </label>
      </div>

      {/* Lựa chọn loại công việc (Đặc biệt cho Kế toán & Rà soát: có lựa chọn Nhập liệu) */}
      {(businessDomain === 'ke_toan' || businessDomain === 'ra_soat') && (
        <div className="flex gap-2 p-1.5 bg-gray-100 rounded-xl max-w-md">
          <button
            type="button"
            onClick={() => setSelectedTaskCategory('')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
              selectedTaskCategory !== 'nhap_lieu'
                ? 'bg-white text-gray-800 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Công việc thông thường
          </button>
          <button
            type="button"
            onClick={() => setSelectedTaskCategory('nhap_lieu')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
              selectedTaskCategory === 'nhap_lieu'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>⚡ Nhập liệu</span>
          </button>
        </div>
      )}

      {/* Giao diện khi chọn Nhập liệu (Kế toán & Rà soát) */}
      {(businessDomain === 'ke_toan' || businessDomain === 'ra_soat') && selectedTaskCategory === 'nhap_lieu' ? (
        <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-4 animate-in fade-in">
          <div className="font-semibold text-sm text-blue-900 flex items-center gap-2">
            <Calculator size={16} className="text-blue-600" />
            Chi tiết công việc Nhập liệu:
          </div>

          {/* Nhập gì */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">
              1. Nhập gì? (chọn nhanh hoặc nhập cụ thể) *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['Hóa đơn mua vào', 'Hóa đơn bán ra', 'Sổ phụ ngân hàng', 'Bảng lương', 'Toàn bộ chứng từ phát sinh'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (!inputWhat) {
                      setInputWhat(tag);
                    } else if (!inputWhat.includes(tag)) {
                      setInputWhat(prev => `${prev}, ${tag}`);
                    }
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-md text-xs font-medium transition"
                >
                  + {tag}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              placeholder="VD: Hóa đơn mua vào, Sổ phụ ngân hàng Vietcombank..."
              value={inputWhat}
              onChange={e => setInputWhat(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Nhập đến đâu */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">
              2. Nhập đến đâu? (Kỳ / mốc thời gian hoàn thành) *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['Hết tháng 1/2026', 'Hết tháng 2/2026', 'Hết tháng 3/2026', 'Hết Quý 1/2026', 'Hết Quý 2/2026', 'Đến hết năm trước'].map(period => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setInputPeriod(period)}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-md text-xs font-medium transition"
                >
                  {period}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              placeholder="VD: Hết tháng 2/2026, Quý 1/2026, Đến ngày 15/04..."
              value={inputPeriod}
              onChange={e => setInputPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      ) : (
        <>
          {/* Gợi ý công việc nhanh theo Nghiệp vụ đang chọn */}
          <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-200/70 space-y-2">
            <div className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <Sparkles size={14} className="text-amber-500" />
              Gợi ý công việc thực tế phổ biến (Nhấn để chèn nhanh):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentQuickTasks.map(taskText => (
                <button
                  key={taskText}
                  type="button"
                  onClick={() => {
                    if (taskText.includes('Nhập liệu')) {
                      setSelectedTaskCategory('nhap_lieu');
                    } else {
                      handleSelectQuickTask(taskText);
                    }
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-gray-200 rounded-md text-xs font-medium text-gray-700 transition"
                >
                  + {taskText}
                </button>
              ))}
            </div>
          </div>

          {/* Nội dung công việc chính */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nội dung công việc thực tế *
            </label>
            <textarea 
              required 
              value={content} 
              onChange={e => setContent(e.target.value)} 
              rows={3} 
              placeholder="Ghi rõ nội dung việc tiếp nhận, yêu cầu của khách hàng..."
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </>
      )}

      {/* Các trường chuyên biệt: Mã hồ sơ & Cơ quan sở tại & Chứng từ giấy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(businessDomain === 'bhxh' || businessDomain === 'setup' || businessDomain === 'dau_tu') && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Mã hồ sơ điện tử {businessDomain === 'bhxh' ? '(BHXH)' : (businessDomain === 'dau_tu' ? '(Dự án đầu tư / IRC)' : '(GPKD / Thuế)')}
            </label>
            <input 
              type="text" 
              value={dossierCode}
              onChange={e => setDossierCode(e.target.value)}
              placeholder="VD: 12345/2026/07101 (để tra cứu kết quả)" 
              className="w-full px-3 py-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm font-mono bg-blue-50/20" 
            />
          </div>
        )}

        {(businessDomain === 'setup' || businessDomain === 'dau_tu') && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Cơ quan sở tại xử lý
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={authorityAgency}
                onChange={e => setAuthorityAgency(e.target.value)}
                placeholder="VD: Sở KH&ĐT Cần Thơ / BQL Khu công nghiệp..." 
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm" 
              />
              <select 
                onChange={e => { if (e.target.value) setAuthorityAgency(e.target.value); }} 
                className="px-2 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-700"
              >
                <option value="">Gợi ý</option>
                {QUICK_AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Chứng từ bản giấy bàn giao (nếu có)
          </label>
          <input 
            type="text" 
            value={paperDossier}
            onChange={e => setPaperDossier(e.target.value)}
            placeholder="VD: Nhận 1 bộ tờ khai có đóng dấu, Sổ phụ giấy..." 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Người liên hệ giao việc
          </label>
          <input 
            type="text" 
            value={contactPerson}
            onChange={e => setContactPerson(e.target.value)}
            placeholder="Để trống mặc định theo người liên hệ bên công ty" 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm" 
          />
        </div>
      </div>

      {/* Thông tin được cấp & Chờ bổ sung */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Thông tin đã được khách cung cấp</label>
          <textarea 
            value={infoProvided} 
            onChange={e => setInfoProvided(e.target.value)} 
            rows={2} 
            placeholder="VD: Đã nhận CCCD, Hóa đơn mua vào quý 1..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Thông tin / chứng từ chờ bổ sung thêm</label>
          <textarea 
            value={infoPending} 
            onChange={e => setInfoPending(e.target.value)} 
            rows={2} 
            placeholder="VD: Đang chờ khách gửi sao kê tháng 3..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú lưu ý thêm</label>
        <input 
          type="text" 
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
          placeholder="Ghi chú khác nếu có..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm" 
        />
      </div>
    </div>
  );
};
