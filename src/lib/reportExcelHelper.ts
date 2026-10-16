import { workNoteSummary } from './workNotes';
import * as XLSX from 'xlsx-js-style';
import { localDateKey } from './date';

export interface ReportSettingsType {
  header_text?: string;
  company_name?: string;
  address?: string;
  office_name?: string;
}

export const formatDateVN = (dateStr?: string) => {
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

export const ACTION_TYPE_LABELS: Record<string, string> = {
  'ke_toan': 'Kế toán',
  'bhxh': 'BHXH',
  'nop_ho_so': 'Setup / GPKD',
  'setup': 'Setup / GPKD',
  'ra_soat': 'Rà soát',
  'dau_tu': 'Đầu tư (IRC)',
  'ho_tro': 'Hỗ trợ',
  'khac': 'Khác'
};

export const STATUS_LABELS: Record<string, string> = {
  'completed': 'Đã hoàn thành',
  'in_progress': 'Đang xử lý',
  'received': 'Tiếp nhận',
  'failed': 'Thất bại'
};

// Thứ tự ưu tiên sắp xếp loại nghiệp vụ trong từng công ty
const DOMAIN_ORDER: Record<string, number> = {
  'ke_toan': 1,
  'bhxh': 2,
  'nop_ho_so': 3,
  'setup': 3,
  'ra_soat': 4,
  'dau_tu': 5,
  'ho_tro': 6,
  'khac': 7
};

// Kiểu viền bảng thanh lịch
const thinBorder = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } }
};

export const buildProfessionalReportSheet = (
  userTasks: any[],
  userName: string,
  settings: ReportSettingsType | null | undefined,
  periodText?: string
) => {
  // 1. Nhóm công việc theo Khách hàng
  const groupedByClient: { [clientName: string]: any[] } = {};
  userTasks.forEach(t => {
    const cName = t.clients?.name || 'Khác';
    if (!groupedByClient[cName]) groupedByClient[cName] = [];
    groupedByClient[cName].push(t);
  });

  const companyName = (settings?.company_name || 'CÔNG TY TNHH DỊCH VỤ KẾ TOÁN AN AN').toUpperCase();
  const rawAddress = settings?.address || '319, Ấp Mới 2, Xã Mỹ Hạnh, Tỉnh Tây Ninh';
  const companyAddress = rawAddress.startsWith('Địa chỉ') ? rawAddress : `Địa chỉ: ${rawAddress}`;
  const rawOffice = settings?.office_name || 'Văn phòng: Cần Thơ';
  const officeName = rawOffice.startsWith('Văn phòng') ? rawOffice : `Văn phòng: ${rawOffice}`;
  const todayStr = formatDateVN(localDateKey());
  const displayPeriod = periodText || '(Kỳ báo cáo: Báo cáo tổng hợp quản lý)';

  const rows: any[][] = [];
  const merges: any[] = [];

  // Dòng 0 (Row 1): Tên công ty (trái) & Quốc hiệu (phải)
  rows.push([companyName, null, null, null, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', null, null, null, null, null]);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });
  merges.push({ s: { r: 0, c: 4 }, e: { r: 0, c: 9 } });

  // Dòng 1 (Row 2): Địa chỉ công ty & Tiêu ngữ
  rows.push([companyAddress, null, null, null, 'Độc lập - Tự do - Hạnh phúc', null, null, null, null, null]);
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 3 } });
  merges.push({ s: { r: 1, c: 4 }, e: { r: 1, c: 9 } });

  // Dòng 2 (Row 3): Dấu gạch tiêu ngữ
  rows.push([null, null, null, null, '---***---', null, null, null, null, null]);
  merges.push({ s: { r: 2, c: 4 }, e: { r: 2, c: 9 } });

  // Dòng 3 (Row 4): TIÊU ĐỀ BÁO CÁO TO RÕ
  rows.push(['BÁO CÁO KẾT QUẢ CÔNG VIỆC', null, null, null, null, null, null, null, null, null]);
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 9 } });

  // Dòng 4 (Row 5): KỲ BÁO CÁO
  rows.push([displayPeriod, null, null, null, null, null, null, null, null, null]);
  merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: 9 } });

  // Dòng 5 (Row 6): Dòng trống
  rows.push([]);

  // Dòng 6 (Row 7): Nhân sự phụ trách (trái) & Văn phòng (phải)
  rows.push([`Nhân sự phụ trách: ${userName.toUpperCase()}`, null, null, null, null, null, null, null, officeName, null]);
  merges.push({ s: { r: 6, c: 0 }, e: { r: 6, c: 3 } });
  merges.push({ s: { r: 6, c: 8 }, e: { r: 6, c: 9 } });

  // Dòng 7 (Row 8): Ngày xuất báo cáo
  rows.push([`Ngày xuất báo cáo: ${todayStr}`, null, null, null, null, null, null, null, null, null]);
  merges.push({ s: { r: 7, c: 0 }, e: { r: 7, c: 3 } });

  // Dòng 8 (Row 9): Dòng trống
  rows.push([]);

  // Dòng 9 (Row 10): HEADER BẢNG DỮ LIỆU
  const headerRowIdx = 9;
  rows.push([
    'STT',
    'Tên khách hàng / Đơn vị',
    'Người liên hệ',
    'Nội dung công việc',
    'Nghiệp vụ',
    'Ngày tiếp nhận',
    'Ngày hoàn thành',
    'Tiến độ / Trạng thái',
    'Mã hồ sơ',
    'Ghi chú / Lưu ý'
  ]);

  let stt = 1;
  let currentRow = 10;
  const dataStartRowIdx = 10;

  // Duyệt qua từng công ty
  Object.keys(groupedByClient).sort().forEach(cName => {
    const cTasks = groupedByClient[cName];
    
    // Sắp xếp các công việc trong công ty theo loại nghiệp vụ (Kế toán -> BHXH -> GPKD -> Rà soát -> ...)
    cTasks.sort((a, b) => {
      const orderA = DOMAIN_ORDER[a.action_type] || 99;
      const orderB = DOMAIN_ORDER[b.action_type] || 99;
      if (orderA !== orderB) return orderA - orderB;
      // Nếu cùng nghiệp vụ, sắp xếp theo ngày tiếp nhận
      const dateA = a.intake_date || a.created_at || '';
      const dateB = b.intake_date || b.created_at || '';
      return dateA.localeCompare(dateB);
    });

    const startClientRow = currentRow;

    // Gom nhóm liên tiếp theo loại nghiệp vụ (Action Type) để merge riêng cột Nghiệp vụ (cột 4)
    let domainStartRow = currentRow;
    let currentDomain = cTasks[0]?.action_type || '';

    cTasks.forEach((t, idx) => {
      // Xác định người liên hệ
      let rawContact = t.contact_person?.trim();
      if (!rawContact || rawContact === 'Sếp giao') {
        const clientContact = t.clients?.contact_name?.trim();
        const clientPhone = t.clients?.contact_phone?.trim();
        if (clientContact && clientPhone) {
          rawContact = `${clientContact} (${clientPhone})`;
        } else if (clientContact) {
          rawContact = clientContact;
        } else if (clientPhone) {
          rawContact = `Liên hệ: ${clientPhone}`;
        } else {
          rawContact = 'Người liên hệ cty';
        }
      }

      const roleLabel = ACTION_TYPE_LABELS[t.action_type] || t.action_type || 'Kế toán';
      const intakeDate = formatDateVN(t.intake_date || t.created_at?.split('T')[0]);
      const completeDate = t.status === 'completed' 
        ? formatDateVN(t.completed_at?.split('T')[0]) 
        : (formatDateVN(t.deadline) || '');
      const statusText = STATUS_LABELS[t.status] || (t.info_pending ? `Đang chờ: ${t.info_pending}` : 'Đang xử lý');
      const dossierCode = t.dossier_code || '';
      const notes = workNoteSummary(t.resolution_note || t.notes || '');

      rows.push([
        stt,
        cName,
        rawContact,
        t.content,
        roleLabel,
        intakeDate,
        completeDate,
        statusText,
        dossierCode,
        notes
      ]);

      // Kiểm tra chuyển đổi sang nhóm nghiệp vụ tiếp theo hoặc việc cuối cùng của cty
      const nextTask = cTasks[idx + 1];
      if (!nextTask || nextTask.action_type !== currentDomain) {
        // Merge ô cột Nghiệp vụ (Cột index 4) cho nhóm nghiệp vụ này nếu có từ 2 việc trở lên
        if (currentRow > domainStartRow) {
          merges.push({ s: { r: domainStartRow, c: 4 }, e: { r: currentRow, c: 4 } });
        }
        if (nextTask) {
          domainStartRow = currentRow + 1;
          currentDomain = nextTask.action_type;
        }
      }

      currentRow++;
    });

    // Merge STT (cột 0) và Tên khách hàng (cột 1) cho cả công ty nếu công ty có nhiều công việc
    if (cTasks.length > 1) {
      merges.push({ s: { r: startClientRow, c: 0 }, e: { r: currentRow - 1, c: 0 } });
      merges.push({ s: { r: startClientRow, c: 1 }, e: { r: currentRow - 1, c: 1 } });
    }

    stt++;
  });

  const dataEndRowIdx = currentRow - 1;

  // Dòng kết thúc bảng & Khối ký tên
  rows.push([]);
  const signDateRow = currentRow + 1;
  rows.push([null, null, null, null, null, null, null, 'Ngày ..... tháng ..... năm 20....', null, null]);
  merges.push({ s: { r: signDateRow, c: 7 }, e: { r: signDateRow, c: 9 } });

  const roleSignRow = signDateRow + 1;
  rows.push([null, 'NGƯỜI LẬP BÁO CÁO', null, null, null, null, null, 'QUẢN LÝ / GIÁM ĐỐC DUYỆT', null, null]);
  merges.push({ s: { r: roleSignRow, c: 1 }, e: { r: roleSignRow, c: 2 } });
  merges.push({ s: { r: roleSignRow, c: 7 }, e: { r: roleSignRow, c: 9 } });

  const noteSignRow = roleSignRow + 1;
  rows.push([null, '(Ký, ghi rõ họ tên)', null, null, null, null, null, '(Ký, đóng dấu)', null, null]);
  merges.push({ s: { r: noteSignRow, c: 1 }, e: { r: noteSignRow, c: 2 } });
  merges.push({ s: { r: noteSignRow, c: 7 }, e: { r: noteSignRow, c: 9 } });

  // Để trống khoảng cách chữ ký
  rows.push([]);
  rows.push([]);

  const nameSignRow = noteSignRow + 3;
  rows.push([null, userName.toUpperCase(), null, null, null, null, null, null, null, null]);
  merges.push({ s: { r: nameSignRow, c: 1 }, e: { r: nameSignRow, c: 2 } });

  // Chuyển sang Sheet
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = merges;

  // Chiều rộng cột
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 38 }, // Tên KH
    { wch: 24 }, // Người liên hệ
    { wch: 46 }, // Nội dung công việc
    { wch: 18 }, // Nghiệp vụ
    { wch: 15 }, // Tiếp nhận
    { wch: 16 }, // Hoàn thành
    { wch: 22 }, // Trạng thái
    { wch: 20 }, // Mã HS
    { wch: 40 }, // Ghi chú
  ];

  // Chiều cao dòng (hpt: points)
  const rowHeights: { [key: number]: number } = {
    0: 24, // Tên cty & Quốc hiệu
    1: 20, // Địa chỉ & Tiêu ngữ
    2: 18, // Gạch tiêu ngữ
    3: 32, // TIÊU ĐỀ BÁO CÁO
    4: 20, // KỲ BÁO CÁO
    6: 22, // Nhân sự & Văn phòng
    7: 20, // Ngày xuất báo cáo
    9: 28, // Header bảng
  };

  const wsRows: any[] = [];
  for (let r = 0; r <= nameSignRow + 1; r++) {
    if (rowHeights[r]) {
      wsRows.push({ hpt: rowHeights[r] });
    } else if (r >= dataStartRowIdx && r <= dataEndRowIdx) {
      wsRows.push({ hpt: 24 }); // Dòng dữ liệu cao thoáng, đẹp mắt
    } else {
      wsRows.push({ hpt: 18 });
    }
  }
  ws['!rows'] = wsRows;

  // --- TRANG TRÍ ĐỊNH DẠNG (STYLING) TỪNG Ô BẰNG XLSX-JS-STYLE ---
  // Duyệt và áp dụng font, màu sắc, viền và căn lề cho tất cả các ô trong bảng tính
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:J40');

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      let cell = ws[cellRef];
      if (!cell) {
        // Tạo ô trống để áp dụng viền/màu nếu nằm trong vùng bảng dữ liệu hoặc header
        if (R >= headerRowIdx && R <= dataEndRowIdx) {
          cell = { t: 's', v: '' };
          ws[cellRef] = cell;
        } else {
          continue;
        }
      }

      // 1. Dòng 0: Tên cty & Quốc hiệu
      if (R === 0) {
        if (C === 0) {
          cell.s = {
            font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '1E3A8A' } },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        } else if (C === 4) {
          cell.s = {
            font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }
      // 2. Dòng 1: Địa chỉ & Tiêu ngữ
      else if (R === 1) {
        if (C === 0) {
          cell.s = {
            font: { name: 'Times New Roman', sz: 10, italic: true, color: { rgb: '475569' } },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        } else if (C === 4) {
          cell.s = {
            font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }
      // 3. Dòng 2: Dấu gạch tiêu ngữ
      else if (R === 2 && C === 4) {
        cell.s = {
          font: { name: 'Times New Roman', sz: 10, bold: true, color: { rgb: '000000' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      // 4. Dòng 3: Tiêu đề báo cáo to rõ (Màu xanh navy sang trọng)
      else if (R === 3 && C === 0) {
        cell.s = {
          font: { name: 'Times New Roman', sz: 16, bold: true, color: { rgb: '1E3A8A' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      // 5. Dòng 4: Kỳ báo cáo
      else if (R === 4 && C === 0) {
        cell.s = {
          font: { name: 'Times New Roman', sz: 11, italic: true, color: { rgb: '334155' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      // 6. Dòng 6: Nhân sự phụ trách & Văn phòng
      else if (R === 6) {
        if (C === 0) {
          cell.s = {
            font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '0F172A' } },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        } else if (C === 8) {
          cell.s = {
            font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '1E3A8A' } },
            alignment: { horizontal: 'right', vertical: 'center' }
          };
        }
      }
      // 7. Dòng 7: Ngày xuất báo cáo
      else if (R === 7 && C === 0) {
        cell.s = {
          font: { name: 'Times New Roman', sz: 10, italic: true, color: { rgb: '64748B' } },
          alignment: { horizontal: 'left', vertical: 'center' }
        };
      }
      // 8. Dòng 9: HEADER BẢNG DỮ LIỆU (Nền xanh navy 1E3A8A, chữ trắng in hoa đậm, căn giữa)
      else if (R === headerRowIdx) {
        cell.s = {
          font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E3A8A' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: {
            top: { style: 'medium', color: { rgb: '0F172A' } },
            bottom: { style: 'medium', color: { rgb: '0F172A' } },
            left: { style: 'thin', color: { rgb: '3B82F6' } },
            right: { style: 'thin', color: { rgb: '3B82F6' } }
          }
        };
      }
      // 9. CÁC DÒNG DỮ LIỆU (Zebra striping chẵn/lẻ nhẹ nhàng)
      else if (R >= dataStartRowIdx && R <= dataEndRowIdx) {
        const isEven = (R - dataStartRowIdx) % 2 === 0;
        const rowBg = isEven ? 'FFFFFF' : 'F8FAFC'; // Màu nền xen kẽ thanh lịch
        
        // Căn lề từng cột:
        // Cột 0 (STT): căn giữa
        // Cột 1 (Tên KH): căn trái đậm
        // Cột 2 (Người liên hệ): căn trái
        // Cột 3 (Nội dung): căn trái, wrapText
        // Cột 4 (Nghiệp vụ): căn giữa đậm
        // Cột 5 (Ngày nhận), Cột 6 (Ngày xong): căn giữa
        // Cột 7 (Trạng thái): căn giữa
        // Cột 8 (Mã hồ sơ): căn giữa, font mono
        // Cột 9 (Ghi chú): căn trái
        let hAlign: 'center' | 'left' | 'right' = 'left';
        let isBold = false;
        let fontColor = '0F172A';

        if (C === 0 || C === 5 || C === 6 || C === 7 || C === 8) {
          hAlign = 'center';
        } else if (C === 4) {
          hAlign = 'center';
          isBold = true;
          fontColor = '1E3A8A'; // Nghiệp vụ nổi bật màu xanh
        } else if (C === 1) {
          isBold = true;
        }

        cell.s = {
          font: { name: 'Times New Roman', sz: 11, bold: isBold, color: { rgb: fontColor } },
          fill: { fgColor: { rgb: rowBg } },
          alignment: { horizontal: hAlign, vertical: 'center', wrapText: true },
          border: thinBorder
        };
      }
      // 10. Khối chữ ký cuối bảng
      else if (R === signDateRow && C === 7) {
        cell.s = {
          font: { name: 'Times New Roman', sz: 11, italic: true, color: { rgb: '334155' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      } else if (R === roleSignRow) {
        cell.s = {
          font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '0F172A' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      } else if (R === noteSignRow) {
        cell.s = {
          font: { name: 'Times New Roman', sz: 10, italic: true, color: { rgb: '64748B' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      } else if (R === nameSignRow && C === 1) {
        cell.s = {
          font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '1E3A8A' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
    }
  }

  return { ws, rows, merges };
};
