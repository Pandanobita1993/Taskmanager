import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Calendar, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx-js-style';
import type { UserProfile } from './Settings';
import { buildProfessionalReportSheet, formatDateVN } from '../lib/reportExcelHelper';
import { loadCurrentProfile } from '../lib/profile';
import { localDateKey } from '../lib/date';
import { saveFileToPreferredDirectory } from '../lib/fileStorage';

export default function Reports() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Bộ lọc thời gian kỳ báo cáo
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Ngày đầu tháng hiện tại
    return localDateKey(d);
  });
  const [endDate, setEndDate] = useState(() => {
    return localDateKey();
  });

  useEffect(() => {
    loadCurrentProfile().then(setProfile).catch(console.error);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, settingsRes] = await Promise.all([
        supabase.from('tasks').select(`*, clients(name, contact_name, contact_phone, tax_code)`).order('created_at', { ascending: false }),
        supabase.from('report_settings').select('*').limit(1)
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (settingsRes.data && settingsRes.data.length > 0) setSettings(settingsRes.data[0]);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportPersonal = async () => {
    if (!profile) return alert('Chưa thiết lập hồ sơ cá nhân');
    
    // Lọc công việc của người này
    let myTasks = tasks.filter(t => t.user_id === profile.id || t.user_id === profile.fullName);

    // Lọc theo khoảng ngày nếu được chọn
    if (startDate) {
      myTasks = myTasks.filter(t => {
        const taskDate = (t.intake_date || t.created_at || '').split('T')[0];
        return taskDate >= startDate;
      });
    }
    if (endDate) {
      myTasks = myTasks.filter(t => {
        const taskDate = (t.intake_date || t.created_at || '').split('T')[0];
        return taskDate <= endDate;
      });
    }
    
    if (myTasks.length === 0) {
      return alert('Không có công việc nào trong khoảng thời gian đã chọn!');
    }

    const periodStr = startDate && endDate 
      ? `(Kỳ báo cáo: Từ ${formatDateVN(startDate)} Đến ${formatDateVN(endDate)})`
      : '(Kỳ báo cáo: Toàn bộ thời gian)';

    const { ws } = buildProfessionalReportSheet(myTasks, profile.fullName, settings, periodStr);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoCongViec");
    
    const fileName = `BaoCao_KetQua_${profile.fullName.replace(/\s+/g, '_')}_${localDateKey()}.xlsx`;
    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const saved = await saveFileToPreferredDirectory(fileName, bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').catch(() => false);
    if (!saved) XLSX.writeFile(wb, fileName);
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="bg-white/60 backdrop-blur-md p-5 rounded-xl border border-white/40 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Xuất báo cáo kết quả công việc</h1>
        <p className="text-gray-600 mt-1 text-sm font-medium">
          Xuất danh sách công việc cá nhân ra định dạng Excel chuẩn của Công ty TNHH DV Kế toán An An.
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/60 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-2xs">
            <Download size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Thông tin xuất báo cáo cá nhân</h2>
            <p className="text-xs text-gray-500">
              Nhân sự phụ trách: <strong className="text-blue-700 font-semibold">{profile?.fullName || 'Chưa thiết lập'}</strong>
              {profile?.department && ` - Bộ phận: ${profile.department}`}
            </p>
          </div>
        </div>

        {/* Bộ lọc khoảng ngày */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Calendar size={16} className="text-blue-600" />
            Chọn kỳ báo cáo (Khoảng thời gian tiếp nhận công việc):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-500 block mb-1">Từ ngày:</span>
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
            <div>
              <span className="text-xs text-gray-500 block mb-1">Đến ngày:</span>
              <input 
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Mặc định đang chọn từ đầu tháng đến ngày hôm nay. Bạn có thể chọn bất kỳ mốc thời gian nào để xuất.
          </p>
        </div>

        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2 text-xs text-gray-600">
          <p className="font-semibold text-blue-800 text-sm flex items-center gap-1.5">
            <Filter size={15} />
            Đặc điểm biểu mẫu chuẩn:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Đầy đủ tiêu ngữ Quốc hiệu, Thông tin Công ty và Văn phòng Cần Thơ.</li>
            <li>Gom nhóm các đầu việc theo từng khách hàng và tự động gộp (merge) ô STT, Tên khách hàng.</li>
            <li>Đầy đủ 10 cột nghiệp vụ, ngày tiếp nhận, ngày hoàn thành, tiến độ, mã hồ sơ và ghi chú.</li>
          </ul>
        </div>

        <button 
          onClick={exportPersonal}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-sm cursor-pointer text-sm"
        >
          <FileSpreadsheet size={20} />
          Tải file Excel báo cáo kết quả công việc
        </button>
      </div>
    </div>
  );
}
