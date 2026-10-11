import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Calendar, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import type { UserProfile } from './Settings';

export default function Reports() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Bộ lọc thời gian kỳ báo cáo
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Ngày đầu tháng hiện tại
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    const p = localStorage.getItem('task_manager_profile');
    if (p) setProfile(JSON.parse(p));
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

  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const generateReportSheet = (userTasks: any[], userName: string) => {
    // Nhóm theo Khách hàng
    const grouped: { [clientName: string]: any[] } = {};
    userTasks.forEach(t => {
      const cName = t.clients?.name || 'Khác';
      if (!grouped[cName]) grouped[cName] = [];
      grouped[cName].push(t);
    });

    const companyName = settings?.company_name || 'CÔNG TY TNHH DỊCH VỤ KẾ TOÁN AN AN';
    const companyAddress = settings?.address ? `Địa chỉ : ${settings.address}` : 'Địa chỉ : 319, Ấp Mới 2, Xã Mỹ Hạnh, Tỉnh Tây Ninh';
    const officeName = settings?.office_name || 'Văn phòng: Cần Thơ';
    const todayStr = formatDateVN(new Date().toISOString().split('T')[0]);
    const periodStr = startDate && endDate 
      ? `(Kỳ báo cáo: ${formatDateVN(startDate)} - ${formatDateVN(endDate)})`
      : '(Kỳ báo cáo: Toàn bộ thời gian)';

    const rows: any[][] = [];
    const merges: any[] = [];

    // Row 1 (Index 0): Tên công ty bên trái, Quốc hiệu bên phải
    rows.push([companyName, null, null, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', null, null, null, null, null, null]);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } });
    merges.push({ s: { r: 0, c: 3 }, e: { r: 0, c: 9 } });

    // Row 2 (Index 1): Địa chỉ bên trái, Tiêu ngữ bên phải
    rows.push([companyAddress, null, null, 'Độc lập - Tự do - Hạnh phúc', null, null, null, null, null, null]);
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 2 } });
    merges.push({ s: { r: 1, c: 3 }, e: { r: 1, c: 9 } });

    // Row 3 (Index 2): Dấu gạch tiêu ngữ
    rows.push([null, null, null, '---***---', null, null, null, null, null, null]);
    merges.push({ s: { r: 2, c: 3 }, e: { r: 2, c: 9 } });

    // Row 4 (Index 3): TIÊU ĐỀ BÁO CÁO
    rows.push(['BÁO CÁO KẾT QUẢ CÔNG VIỆC', null, null, null, null, null, null, null, null, null]);
    merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 9 } });

    // Row 5 (Index 4): KỲ BÁO CÁO
    rows.push([periodStr, null, null, null, null, null, null, null, null, null]);
    merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: 9 } });

    // Row 6 (Index 5): Trống
    rows.push([]);

    // Row 7 (Index 6): Nhân sự phụ trách & Văn phòng
    rows.push([`Nhân sự phụ trách: ${userName.toUpperCase()}`, null, null, null, null, null, null, null, officeName, null]);
    merges.push({ s: { r: 6, c: 0 }, e: { r: 6, c: 2 } });
    merges.push({ s: { r: 6, c: 8 }, e: { r: 6, c: 9 } });

    // Row 8 (Index 7): Ngày xuất báo cáo
    rows.push([`Ngày xuất báo cáo: ${todayStr}`, null, null, null, null, null, null, null, null, null]);
    merges.push({ s: { r: 7, c: 0 }, e: { r: 7, c: 2 } });

    // Row 9 (Index 8): Trống
    rows.push([]);

    // Row 10 (Index 9): HEADER BẢNG DỮ LIỆU CHUẨN THEO FILE CỦA BẠN
    rows.push([
      'STT',
      'Tên khách hàng',
      'Người liên hệ',
      'Nội dung công việc',
      'Nghiệp vụ',
      'Ngày tiếp nhận',
      'Ngày hoàn thành',
      'Tiến độ / Trạng thái',
      'Mã hồ sơ (nếu có)',
      'Ghi chú / Lưu ý'
    ]);

    // Data rows bắt đầu từ index 10 (Row 11)
    let stt = 1;
    let currentRow = 10;

    const actionTypeLabels: { [key: string]: string } = {
      'ke_toan': 'Kế toán',
      'bhxh': 'BHXH',
      'nop_ho_so': 'Hồ sơ GPKD',
      'ho_tro': 'Hỗ trợ',
      'khac': 'Khác'
    };

    const statusLabels: { [key: string]: string } = {
      'completed': 'Đã hoàn thành',
      'in_progress': 'Đang xử lý',
      'received': 'Tiếp nhận',
      'failed': 'Thất bại'
    };

    Object.keys(grouped).sort().forEach(clientName => {
      const clientTasks = grouped[clientName];
      const startClientRow = currentRow;

      clientTasks.forEach((task) => {
        const contact = task.contact_person || task.clients?.contact_name || (task.clients?.contact_phone ? `(${task.clients.contact_phone})` : '');
        const role = actionTypeLabels[task.action_type] || task.action_type || 'Kế toán';
        const intakeDate = formatDateVN(task.intake_date || task.created_at?.split('T')[0]);
        const completeDate = task.status === 'completed' ? formatDateVN(task.completed_at?.split('T')[0]) : (formatDateVN(task.deadline) || '');
        const statusText = statusLabels[task.status] || (task.info_pending ? `Đang chờ: ${task.info_pending}` : 'Đang xử lý');
        const dossierCode = task.dossier_code || '';
        const notes = task.resolution_note || task.notes || '';

        rows.push([
          stt,
          clientName,
          contact,
          task.content,
          role,
          intakeDate,
          completeDate,
          statusText,
          dossierCode,
          notes
        ]);

        currentRow++;
      });

      // Nếu khách hàng có nhiều công việc -> Merge ô STT và Tên khách hàng theo nhóm
      if (clientTasks.length > 1) {
        merges.push({ s: { r: startClientRow, c: 0 }, e: { r: currentRow - 1, c: 0 } });
        merges.push({ s: { r: startClientRow, c: 1 }, e: { r: currentRow - 1, c: 1 } });
      }

      stt++;
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = merges;

    // Chiều rộng các cột chuẩn
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 42 }, // Tên khách hàng
      { wch: 22 }, // Người liên hệ
      { wch: 45 }, // Nội dung công việc
      { wch: 16 }, // Nghiệp vụ
      { wch: 15 }, // Ngày tiếp nhận
      { wch: 16 }, // Ngày hoàn thành
      { wch: 22 }, // Tiến độ / Trạng thái
      { wch: 18 }, // Mã hồ sơ (nếu có)
      { wch: 40 }, // Ghi chú / Lưu ý
    ];

    return ws;
  };

  const exportPersonal = () => {
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

    const ws = generateReportSheet(myTasks, profile.fullName);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoTienDo");
    
    const fileName = `BaoCao_KetQua_${profile.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
