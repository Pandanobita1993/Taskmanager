import * as XLSX from 'xlsx-js-style';
import type { ReportSettings } from './adminTypes';
import { buildProfessionalReportSheet, formatDateVN } from '../../lib/reportExcelHelper';
import { localDateKey } from '../../lib/date';
import { saveFileToPreferredDirectory } from '../../lib/fileStorage';
import { getOffice } from '../../lib/offices';

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
        { ...reportSettings, office_name: getOffice(user.office) },
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
  
  const fileName = `BaoCao_QuanLy_${localDateKey()}.xlsx`;
  const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  void saveFileToPreferredDirectory(fileName, bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    .then((saved) => { if (!saved) XLSX.writeFile(wb, fileName); })
    .catch(() => XLSX.writeFile(wb, fileName));
};
