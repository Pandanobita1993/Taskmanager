import React from 'react';
import { Calculator, Shield, Settings2, FileSearch, Landmark, Wrench } from 'lucide-react';
import type { BusinessDomain } from './newTaskConstants';

interface BusinessDomainSelectorProps {
  businessDomain: BusinessDomain;
  onChangeDomain: (domain: BusinessDomain) => void;
}

export const BusinessDomainSelector: React.FC<BusinessDomainSelectorProps> = ({
  businessDomain,
  onChangeDomain
}) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-gray-800">
        1. Chọn mảng nghiệp vụ tiếp nhận *
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onChangeDomain('ke_toan')}
          className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
            businessDomain === 'ke_toan' 
              ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/30 text-blue-900 shadow-xs' 
              : 'bg-white border-gray-200 text-gray-700 hover:border-blue-200 hover:bg-blue-50/30'
          }`}
        >
          <div className={`p-2 rounded-lg ${businessDomain === 'ke_toan' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <Calculator size={20} />
          </div>
          <div>
            <div className="font-bold text-sm">Kế toán thuế</div>
            <div className="text-xs text-gray-500 mt-0.5">Thuế, hóa đơn, BCTC, MISA</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChangeDomain('bhxh')}
          className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
            businessDomain === 'bhxh' 
              ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-900 shadow-xs' 
              : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-200 hover:bg-emerald-50/30'
          }`}
        >
          <div className={`p-2 rounded-lg ${businessDomain === 'bhxh' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <Shield size={20} />
          </div>
          <div>
            <div className="font-bold text-sm">Bảo hiểm xã hội</div>
            <div className="text-xs text-gray-500 mt-0.5">Báo tăng, giảm, mã hồ sơ</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChangeDomain('setup')}
          className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
            businessDomain === 'setup' 
              ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/30 text-amber-900 shadow-xs' 
              : 'bg-white border-gray-200 text-gray-700 hover:border-amber-200 hover:bg-amber-50/30'
          }`}
        >
          <div className={`p-2 rounded-lg ${businessDomain === 'setup' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <Settings2 size={20} />
          </div>
          <div>
            <div className="font-bold text-sm">Setup & GPKD</div>
            <div className="text-xs text-gray-500 mt-0.5">GPKD, CKS, HĐĐT, ĐKKD</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChangeDomain('ra_soat')}
          className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
            businessDomain === 'ra_soat' 
              ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/30 text-indigo-900 shadow-xs' 
              : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/30'
          }`}
        >
          <div className={`p-2 rounded-lg ${businessDomain === 'ra_soat' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <FileSearch size={20} />
          </div>
          <div>
            <div className="font-bold text-sm">Rà soát</div>
            <div className="text-xs text-gray-500 mt-0.5">Sổ sách cũ, đối chiếu số liệu</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChangeDomain('dau_tu')}
          className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
            businessDomain === 'dau_tu' 
              ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/30 text-rose-900 shadow-xs' 
              : 'bg-white border-gray-200 text-gray-700 hover:border-rose-200 hover:bg-rose-50/30'
          }`}
        >
          <div className={`p-2 rounded-lg ${businessDomain === 'dau_tu' ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <Landmark size={20} />
          </div>
          <div>
            <div className="font-bold text-sm">Đăng ký đầu tư</div>
            <div className="text-xs text-gray-500 mt-0.5">Dự án đầu tư, IRC, vốn ngoại</div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChangeDomain('khac')}
          className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${businessDomain === 'khac' ? 'bg-slate-50 border-slate-500 ring-2 ring-slate-500/30 text-slate-900 shadow-xs' : 'bg-white border-gray-200 text-gray-700 hover:border-slate-300 hover:bg-slate-50'}`}
        >
          <div className={`p-2 rounded-lg ${businessDomain === 'khac' ? 'bg-slate-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <Wrench size={20} />
          </div>
          <div>
            <div className="font-bold text-sm">Khác</div>
            <div className="text-xs text-gray-500 mt-0.5">Thiết bị, công việc nội bộ khác</div>
          </div>
        </button>
      </div>
    </div>
  );
};
