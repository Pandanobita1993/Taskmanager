import * as XLSX from 'xlsx-js-style';
import type { ReportSettings } from './adminTypes';
import { buildProfessionalReportSheet, formatDateVN } from '../../lib/reportExcelHelper';
import { localDateKey } from '../../lib/date';
import { saveFileToPreferredDirectory } from '../../lib/fileStorage';
import { getOffice } from '../../lib/offices';
import { loadDebtReportSource } from '../../lib/debtReportSource';
import { buildDebtReportSheet } from '../../lib/debtReportExcel';

export { formatDateVN };

export const exportManagerExcel = async (
  selectedUsers: string[],
  users: any[],
  tasks: any[],
  reportSettings: ReportSettings
) => {
  if (selectedUsers.length === 0) {
    alert('Vui lòng chọn ít nhất 1 nhân viên để xuất báo cáo');
    return;
  }
  
  try {
    const selectedStaff = users.filter(user => selectedUsers.includes(user.id));
    if (!selectedStaff.length) throw new Error('Không xác định được nhân viên đã chọn.');
    const source = await loadDebtReportSource(selectedStaff.map(user => user.id));
    const selectedTasks = tasks.filter(task => selectedStaff.some(user => task.user_id === user.id || task.user_id === user.name));
    const debtSheet = buildDebtReportSheet(source, selectedTasks, selectedStaff.map(user => user.name).join(', '),
      reportSettings, '(Kỳ báo cáo: Báo cáo tổng hợp quản lý — toàn bộ thời gian)');
    const wb = XLSX.utils.book_new();

    selectedUsers.forEach(userId => {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const userTasks = tasks.filter(t => t.user_id === user.id || t.user_id === user.name);
      if (userTasks.length > 0) {
        const { ws } = buildProfessionalReportSheet(
          userTasks,
          user.name,
          { ...reportSettings, office_name: getOffice(user.office) },
          '(Kỳ báo cáo: Báo cáo tổng hợp quản lý)'
        );
        const baseName = user.name.replace(/[\\/?*[\]:]/g, ' ').substring(0, 31) || 'NhanVien';
        let sheetName = baseName;
        let suffix = 2;
        while (sheetName.toLowerCase() === 'ghinhancongno' || wb.SheetNames.some(name => name.toLowerCase() === sheetName.toLowerCase())) {
          const tail = ` (${suffix++})`;
          sheetName = baseName.substring(0, 31 - tail.length) + tail;
        }
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    });

    XLSX.utils.book_append_sheet(wb, debtSheet.ws, 'GhiNhanCongNo');

    const fileName = `BaoCao_QuanLy_${localDateKey()}.xlsx`;
    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const saved = await saveFileToPreferredDirectory(fileName, bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').catch(() => false);
    if (!saved) XLSX.writeFile(wb, fileName);
    if (source.warning) alert(source.warning);
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Chưa xuất được báo cáo. Vui lòng thử lại.');
  }
};
