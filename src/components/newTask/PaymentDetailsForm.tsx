import React from 'react';
import { Check, Upload } from 'lucide-react';

interface PaymentDetailsFormProps {
  paymentReason: string;
  setPaymentReason: (val: string) => void;
  customPaymentReason: string;
  setCustomPaymentReason: (val: string) => void;
  availableMonths: string[];
  paidMonths: string[];
  toggleMonth: (month: string) => void;
  proofBase64: string;
  proofFileName: string;
  onPasteImage: (e: React.ClipboardEvent) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PaymentDetailsForm: React.FC<PaymentDetailsFormProps> = ({
  paymentReason,
  setPaymentReason,
  customPaymentReason,
  setCustomPaymentReason,
  availableMonths,
  paidMonths,
  toggleMonth,
  proofBase64,
  proofFileName,
  onPasteImage,
  onFileInputChange
}) => {
  return (
    <div className="space-y-6 pt-2">
      <h2 className="text-base font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
        <Check size={18} className="text-green-600" />
        3. Chi tiết khoản thanh toán của khách
      </h2>
      
      {/* Chọn nội dung thu phí */}
      <div className="bg-green-50/60 p-4 rounded-xl border border-green-200 space-y-3">
        <label className="block text-sm font-semibold text-green-900 mb-1">
          Nội dung thu phí dịch vụ *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            'Phí dịch vụ kế toán',
            'Phí dịch vụ bảo hiểm xã hội',
            'Phí setup',
            'Phí dịch vụ kế toán + BHXH',
            'Khác'
          ].map(option => (
            <label key={option} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition text-sm ${paymentReason === option ? 'bg-white border-green-600 font-semibold text-green-900 shadow-xs ring-1 ring-green-500' : 'bg-white/70 border-gray-200 text-gray-700 hover:bg-white'}`}>
              <input 
                type="radio" 
                name="paymentReason" 
                value={option}
                checked={paymentReason === option}
                onChange={() => setPaymentReason(option)}
                className="text-green-600 focus:ring-green-500"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>

        {paymentReason === 'Khác' && (
          <div className="pt-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Nhập nội dung thu cụ thể *</label>
            <input 
              required={paymentReason === 'Khác'}
              type="text" 
              value={customPaymentReason} 
              onChange={e => setCustomPaymentReason(e.target.value)} 
              placeholder="VD: Phí làm lại sổ sách các năm trước..." 
              className="w-full px-3 py-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Thanh toán cho các tháng *</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {availableMonths.map(month => (
            <label key={month} className={`flex items-center justify-center py-2 px-1 text-xs border rounded-lg cursor-pointer transition-colors ${paidMonths.includes(month) ? 'bg-green-100 border-green-500 text-green-800 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              <input 
                type="checkbox" 
                className="hidden"
                checked={paidMonths.includes(month)}
                onChange={() => toggleMonth(month)}
              />
              {month}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Ảnh bằng chứng (UNC, Tin nhắn Zalo...)</label>
        <div 
          onPaste={onPasteImage}
          className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center justify-center bg-gray-50 focus:outline-none focus:border-green-500"
          tabIndex={0}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mb-1">
              <Upload size={24} />
            </div>

            <div className="text-center">
              <p className="text-sm font-bold text-gray-800">
                📋 Nhấn <kbd className="px-2 py-0.5 bg-gray-200 border border-gray-300 rounded font-mono text-xs text-gray-800">Ctrl + V</kbd> để dán ảnh trực tiếp
              </p>
              <p className="text-xs text-gray-500 mt-1">
                (Chụp màn hình bằng <kbd className="px-1 py-0.5 bg-gray-100 border rounded text-[10px]">Win + Shift + S</kbd> rồi nhấn Ctrl + V)
              </p>
            </div>

            <label className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition">
              <Upload size={14} />
              Chọn file ảnh từ máy
              <input 
                type="file" 
                accept="image/*" 
                onChange={onFileInputChange}
                className="hidden"
              />
            </label>
          </div>

          {proofBase64 && (
            <div className="mt-4 border border-green-300 rounded-lg p-2 bg-white flex flex-col items-center">
              <p className="text-xs font-mono font-bold text-green-700 mb-1">
                Tên file đã lưu: {proofFileName}
              </p>
              <img src={proofBase64} alt="Bằng chứng thanh toán" className="max-h-48 object-contain rounded border" />
            </div>
          )}
        </div>
      </div>

      <div className="bg-green-50 text-green-700 p-3 rounded-lg border border-green-200 text-xs flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        Hệ thống sẽ tự động đánh dấu <strong>Hoàn thành</strong> cho khoản phí này và lưu vào công nợ.
      </div>
    </div>
  );
};
