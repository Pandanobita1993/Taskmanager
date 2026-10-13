import * as XLSX from 'xlsx-js-style';
import type { ReportSettings } from './adminTypes';
import { buildProfessionalReportSheet, formatDateVN } from '../../lib/reportExcelHelper';

export { formatDateVN };

export const exportManagerExcel = (
  selectedUsers: string[],
  users: any[],
  tasks: any[],
  reportSettings: ReportSettings
) => {
  if (selectedUsers.length === 0) {
    alert('Vui lòng chọn ít nhất 1 nhân viên để xuất báo cáo');
    return;
  }
  
  const wb = XLSX.utils.book_new();
  let hasData = false;

  selectedUsers.forEach(userId => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const userTasks = tasks.filter(t => t.user_id === user.id || t.user_id === user.name);
    if (userTasks.length > 0) {
      hasData = true;
      const { ws } = buildProfessionalReportSheet(
        userTasks, 
        user.name, 
        reportSettings, 
        '(Kỳ báo cáo: Báo cáo tổng hợp quản lý)'
      );
      const sheetName = user.name.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  });

  if (!hasData) {
    alert('Các nhân viên được chọn không có dữ liệu công việc nào!');
    return;
  }
  
  XLSX.writeFile(wb, `BaoCao_QuanLy_${new Date().toISOString().split('T')[0]}.xlsx`);
};
