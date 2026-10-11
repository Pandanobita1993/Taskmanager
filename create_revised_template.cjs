const fs = require('fs');
const zlib = require('zlib');

function parseZip(buffer) {
  let offset = 0;
  const entries = [];
  while (offset < buffer.length - 4) {
    const sig = buffer.readUInt32LE(offset);
    if (sig === 0x04034b50) {
      const compMethod = buffer.readUInt16LE(offset + 8);
      const modTime = buffer.readUInt16LE(offset + 10);
      const modDate = buffer.readUInt16LE(offset + 12);
      const crc32 = buffer.readUInt32LE(offset + 14);
      const compSize = buffer.readUInt32LE(offset + 18);
      const uncompSize = buffer.readUInt32LE(offset + 22);
      const fileNameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const fileName = buffer.toString('utf8', offset + 30, offset + 30 + fileNameLen);
      const dataStart = offset + 30 + fileNameLen + extraLen;
      const dataEnd = dataStart + compSize;
      const compressedData = buffer.slice(dataStart, dataEnd);
      
      let uncompressedData = null;
      if (compMethod === 0) uncompressedData = compressedData;
      else if (compMethod === 8) {
        try { uncompressedData = zlib.inflateRawSync(compressedData); } catch(e){}
      }
      entries.push({ fileName, compMethod, modTime, modDate, crc32, uncompressedData });
      offset = dataEnd;
    } else {
      offset++;
    }
  }
  return entries;
}

function crc32Table() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  return table;
}
const CRC_TABLE = crc32Table();
function calculateCRC32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function buildZip(entries) {
  const fileRecords = [];
  const centralDirRecords = [];
  let offset = 0;

  entries.forEach(e => {
    const fileNameBuf = Buffer.from(e.fileName, 'utf8');
    const compData = zlib.deflateRawSync(e.uncompressedData);
    const crc = calculateCRC32(e.uncompressedData);
    const uncompSize = e.uncompressedData.length;
    const compSize = compData.length;

    const localHdr = Buffer.alloc(30 + fileNameBuf.length);
    localHdr.writeUInt32LE(0x04034b50, 0);
    localHdr.writeUInt16LE(20, 4);
    localHdr.writeUInt16LE(0, 6);
    localHdr.writeUInt16LE(8, 8);
    localHdr.writeUInt16LE(0, 10);
    localHdr.writeUInt16LE(0, 12);
    localHdr.writeUInt32LE(crc, 14);
    localHdr.writeUInt32LE(compSize, 18);
    localHdr.writeUInt32LE(uncompSize, 22);
    localHdr.writeUInt16LE(fileNameBuf.length, 26);
    localHdr.writeUInt16LE(0, 28);
    fileNameBuf.copy(localHdr, 30);

    const record = Buffer.concat([localHdr, compData]);
    fileRecords.push(record);

    const cdHdr = Buffer.alloc(46 + fileNameBuf.length);
    cdHdr.writeUInt32LE(0x02014b50, 0);
    cdHdr.writeUInt16LE(20, 4);
    cdHdr.writeUInt16LE(20, 6);
    cdHdr.writeUInt16LE(0, 8);
    cdHdr.writeUInt16LE(8, 10);
    cdHdr.writeUInt16LE(0, 12);
    cdHdr.writeUInt16LE(0, 14);
    cdHdr.writeUInt32LE(crc, 16);
    cdHdr.writeUInt32LE(compSize, 20);
    cdHdr.writeUInt32LE(uncompSize, 24);
    cdHdr.writeUInt16LE(fileNameBuf.length, 28);
    cdHdr.writeUInt16LE(0, 30);
    cdHdr.writeUInt16LE(0, 32);
    cdHdr.writeUInt16LE(0, 34);
    cdHdr.writeUInt16LE(0, 36);
    cdHdr.writeUInt32LE(0, 38);
    cdHdr.writeUInt32LE(offset, 42);
    fileNameBuf.copy(cdHdr, 46);

    centralDirRecords.push(cdHdr);
    offset += record.length;
  });

  const cdStart = offset;
  const allCd = Buffer.concat(centralDirRecords);
  const cdSize = allCd.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...fileRecords, allCd, eocd]);
}

function run() {
  const templateBuf = fs.readFileSync('D:\\Taskmanager\\MAU_1_BAO_CAO_CONG_VIEC_KE_TOAN.xlsx');
  const entries = parseZip(templateBuf);

  const sharedStringsEntry = entries.find(e => e.fileName === 'xl/sharedStrings.xml');
  const sheet1Entry = entries.find(e => e.fileName === 'xl/worksheets/sheet1.xml');

  let sharedStringsXml = sharedStringsEntry.uncompressedData.toString('utf8');
  let sheet1Xml = sheet1Entry.uncompressedData.toString('utf8');

  const stringList = [];
  const siRegex = /<si>(.*?)<\/si>/gs;
  let match;
  while ((match = siRegex.exec(sharedStringsXml)) !== null) {
    const tMatch = /<t[^>]*>(.*?)<\/t>/s.exec(match[1]);
    stringList.push(tMatch ? tMatch[1] : '');
  }

  function addString(str) {
    let idx = stringList.indexOf(str);
    if (idx === -1) {
      idx = stringList.length;
      stringList.push(str);
    }
    return idx;
  }

  // 12 CỘT CHUẨN MỚI SAU KHI ĐIỀU CHỈNH THEO YÊU CẦU:
  // 1. STT
  // 2. TÊN CÔNG TY / KHÁCH HÀNG
  // 3. NGHIỆP VỤ (Kế toán / Bảo hiểm xã hội / Setup)
  // 4. CÔNG VIỆC CỤ THỂ (Gồm cả nội dung nhập liệu MISA)
  // 5. MÃ HỒ SƠ / CƠ QUAN TIẾP NHẬN
  // 6. KẾT QUẢ / ĐÃ LÀM
  // 7. CHƯA LÀM ĐƯỢC / VƯỚNG MẮC
  // 8. PHÍ DVKT / VAT
  // 9. CÔNG NỢ
  // 10. NGÀY NỘP BC / NỘP HS
  // 11. CHỨNG TỪ BẢN GIẤY (NẾU CÓ)
  // 12. GHI CHÚ
  const headers = [
    'STT',
    'TÊN CÔNG TY / KHÁCH HÀNG',
    'NGHIỆP VỤ',
    'CÔNG VIỆC CỤ THỂ',
    'MÃ HỒ SƠ / CƠ QUAN TIẾP NHẬN',
    'KẾT QUẢ / ĐÃ LÀM',
    'CHƯA LÀM ĐƯỢC / VƯỚNG MẮC',
    'PHÍ DVKT / VAT',
    'CÔNG NỢ',
    'NGÀY NỘP BC / NỘP HS',
    'CHỨNG TỪ BẢN GIẤY (NẾU CÓ)',
    'GHI CHÚ'
  ];

  // Chiều rộng 12 cột (A đến L)
  const colWidths = [
    { min: 1, max: 1, width: 6.5 },   // A: STT
    { min: 2, max: 2, width: 36 },    // B: Tên công ty
    { min: 3, max: 3, width: 18 },    // C: Nghiệp vụ (Kế toán / Bảo hiểm xã hội / Setup)
    { min: 4, max: 4, width: 44 },    // D: Công việc cụ thể
    { min: 5, max: 5, width: 24 },    // E: Mã HS / Nơi tiếp nhận
    { min: 6, max: 6, width: 30 },    // F: Kết quả / Đã làm
    { min: 7, max: 7, width: 28 },    // G: Chưa làm được / Vướng mắc
    { min: 8, max: 8, width: 16 },    // H: Phí DVKT / VAT
    { min: 9, max: 9, width: 22 },    // I: Công nợ
    { min: 10, max: 10, width: 16 },  // J: Ngày nộp BC / HS
    { min: 11, max: 11, width: 26 },  // K: Chứng từ bản giấy (nếu có)
    { min: 12, max: 12, width: 28 },  // L: Ghi chú
  ];

  const colsXml = '<cols>' + colWidths.map(c => `<col min="${c.min}" max="${c.max}" width="${c.width}" style="4" customWidth="1"/>`).join('') + '<col min="13" max="16384" width="12" style="4"/></cols>';
  sheet1Xml = sheet1Xml.replace(/<cols>.*?<\/cols>/s, colsXml);

  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  
  // Dòng 8: Header với màu xanh lá mạ chuẩn của văn phòng
  let headerRowXml = '<row r="8" spans="1:12" ht="35" x14ac:dyDescent="0.25">';
  colLetters.forEach((col, i) => {
    const sIdx = addString(headers[i]);
    headerRowXml += `<c r="${col}8" s="11" t="s"><v>${sIdx}</v></c>`;
  });
  headerRowXml += '</row>';

  // Dữ liệu mẫu thực tế áp dụng đúng 3 nhóm: Kế toán, Bảo hiểm xã hội, Setup
  const sampleData = [
    // 1. Kế toán (gồm tiến độ MISA đưa trực tiếp vào nội dung việc)
    {
      stt: 1,
      client: 'CÔNG TY TNHH SAS VINA\n(MST: 1101873394)',
      role: 'Kế toán',
      content: '- Nộp tờ khai thuế GTGT và TNCN Q3/2026\n- Nhập liệu MISA:\n  + Mua vào: Đến T8\n  + Bán ra: Đến T8\n  + Sổ phụ ngân hàng: Đến T7\n  + Đã in chứng từ đến T6',
      dossier: 'CQT Tỉnh Long An',
      result: '- Cơ quan thuế đã chấp nhận tờ khai Q3\n- Đã nhập xong HĐ đầu vào T7, T8',
      pending: '- Chưa gửi sao kê ngân hàng T9',
      fee: '8.500.000 đ/quý',
      debt: 'Đã thanh toán hết Q2/2026\nĐã gửi ĐNTT Q3',
      subDate: '10/10/2026',
      paper: 'Tờ khai thuế GTGT Q3 (bản ký đóng dấu)',
      note: 'Hẹn thanh toán phí ngày 15/10'
    },
    // 2. Bảo hiểm xã hội
    {
      stt: 2,
      client: 'CÔNG TY CỔ PHẦN VŨ MẠNH\n(MST: 0315891234)',
      role: 'Bảo hiểm xã hội',
      content: '- Điều chỉnh mức đóng BHXH cho Hoàng Thị Hồng Loan từ 7.000.000 lên 7.500.000 đ\n- Báo tăng tháng 10/2026 cho nhân viên Nguyễn Như Mão',
      dossier: 'Mã HS: 157866/2024/07405\nMã HS: 43492/2025/07405',
      result: '- Hồ sơ điều chỉnh lương: ĐÃ ĐƯỢC DUYỆT\n- Hồ sơ báo tăng: ĐÃ ĐƯỢC DUYỆT',
      pending: 'Không',
      fee: '500.000 đ/tháng',
      debt: 'Đã thu xong T09/2026',
      subDate: '08/10/2026',
      paper: 'Thông báo kết quả đóng BHXH Mẫu C12',
      note: 'Đã gửi file C12 cho công ty lưu'
    },
    // 3. Setup (Hồ sơ GPKD, mua chữ ký số, hóa đơn điện tử)
    {
      stt: 3,
      client: 'CÔNG TY TNHH TM KHÁNH AN VN\n(MST: 0317823456)',
      role: 'Setup',
      content: '- Đăng ký thành lập địa điểm kinh doanh mới\n- Đăng ký gia hạn Chữ ký số FastCA 3 năm\n- Mua gói 500 số Hóa đơn điện tử MISA meInvoice',
      dossier: 'Sở KH&ĐT Cần Thơ\n(Mã HS: ĐKKD-88219)',
      result: '- Hồ sơ GPKD: ĐÃ CHẤP THUẬN\n- Đã kích hoạt token Chữ ký số\n- Đã bàn giao thông tin tài khoản HĐĐT',
      pending: 'Chờ nhận Giấy chứng nhận bản gốc tại Sở',
      fee: '2.500.000 đ\n(GPKD: 1.5tr + CKS/HĐĐT: 1tr)',
      debt: 'Đã thu cọc 1.500.000 đ\nCòn lại 1.000.000 đ',
      subDate: '05/10/2026',
      paper: 'Giấy chứng nhận ĐĐKD bản gốc + Hợp đồng CKS',
      note: 'Dự kiến trả Giấy phép bản gốc ngày 12/10'
    },
    // 4. Khách hàng sử dụng cả Kế toán + Bảo hiểm xã hội
    {
      stt: 4,
      client: 'CÔNG TY TNHH THỜI TRANG DENNY\n(MST: 1801239876)',
      role: 'Kế toán',
      content: '- Khai thuế GTGT Q3\n- Báo giảm thai sản T10 cho Nguyễn Cẩm Giang\n- Nhập liệu MISA: Mua vào hết T9, bán ra hết T9, sổ phụ hết T8',
      dossier: 'BHXH Cần Thơ\n(Mã HS: 115218/2025)',
      result: '- Đã nộp tờ khai thuế GTGT\n- Hồ sơ thai sản ĐÃ ĐƯỢC DUYỆT',
      pending: 'Chờ khách bổ sung sao kê tài khoản USD',
      fee: '3.000.000 đ/tháng\n(Phí KT + BHXH)',
      debt: 'Đã gửi ĐNTT tháng 9',
      subDate: '10/10/2026',
      paper: 'Sổ phụ ngân hàng + Bảng lương T9',
      note: 'Khách hẹn chuyển khoản phí vào ngày 12/10'
    }
  ];

  let rowsXml = [];
  let currentRow = 9;

  sampleData.forEach((item) => {
    const rowNum = currentRow;
    const idxStt = item.stt;
    const idxClient = addString(item.client);
    const idxRole = addString(item.role);
    const idxContent = addString(item.content);
    const idxDossier = addString(item.dossier);
    const idxResult = addString(item.result);
    const idxPending = addString(item.pending);
    const idxFee = addString(item.fee);
    const idxDebt = addString(item.debt);
    const idxSubDate = addString(item.subDate);
    const idxPaper = addString(item.paper);
    const idxNote = addString(item.note);

    let row = `<row r="${rowNum}" spans="1:12" ht="52" x14ac:dyDescent="0.25">`;
    row += `<c r="A${rowNum}" s="4"><v>${idxStt}</v></c>`;
    row += `<c r="B${rowNum}" s="5" t="s"><v>${idxClient}</v></c>`;
    row += `<c r="C${rowNum}" s="4" t="s"><v>${idxRole}</v></c>`;
    row += `<c r="D${rowNum}" s="5" t="s"><v>${idxContent}</v></c>`;
    row += `<c r="E${rowNum}" s="5" t="s"><v>${idxDossier}</v></c>`;
    row += `<c r="F${rowNum}" s="5" t="s"><v>${idxResult}</v></c>`;
    row += `<c r="G${rowNum}" s="5" t="s"><v>${idxPending}</v></c>`;
    row += `<c r="H${rowNum}" s="4" t="s"><v>${idxFee}</v></c>`;
    row += `<c r="I${rowNum}" s="5" t="s"><v>${idxDebt}</v></c>`;
    row += `<c r="J${rowNum}" s="4" t="s"><v>${idxSubDate}</v></c>`;
    row += `<c r="K${rowNum}" s="5" t="s"><v>${idxPaper}</v></c>`;
    row += `<c r="L${rowNum}" s="5" t="s"><v>${idxNote}</v></c>`;
    row += `</row>`;
    rowsXml.push(row);

    currentRow++;
  });

  const sheetDataMatch = sheet1Xml.match(/<sheetData>(.*?)<\/sheetData>/s);
  const origSheetData = sheetDataMatch[1];
  
  const r7End = origSheetData.indexOf('</row>', origSheetData.indexOf('<row r="7"')) + 6;
  const headerSection = origSheetData.substring(0, r7End);

  const newSheetData = '<sheetData>' + headerSection + headerRowXml + rowsXml.join('') + '</sheetData>';
  sheet1Xml = sheet1Xml.replace(/<sheetData>.*?<\/sheetData>/s, newSheetData);

  // Merges chuẩn 12 cột (A đến L)
  const merges = [
    'A1:C1', 'A2:C2',
    'D1:L1', 'D2:L2', 'D3:L3',
    'A5:L5', 'A6:D6', 'A7:D7'
  ];
  const mergesXml = `<mergeCells count="${merges.length}">` + merges.map(m => `<mergeCell ref="${m}"/>`).join('') + `</mergeCells>`;
  sheet1Xml = sheet1Xml.replace(/<mergeCells count="[^"]*">.*?<\/mergeCells>/s, mergesXml);

  sheet1Xml = sheet1Xml.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:L${currentRow - 1}"/>`);

  const newSsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${stringList.length}" uniqueCount="${stringList.length}">` +
    stringList.map(s => `<si><t>${String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</t></si>`).join('') +
    `</sst>`;

  sharedStringsEntry.uncompressedData = Buffer.from(newSsXml, 'utf8');
  sheet1Entry.uncompressedData = Buffer.from(sheet1Xml, 'utf8');

  const finalZip = buildZip(entries);

  fs.writeFileSync('D:\\Taskmanager\\MAU_TONG_HOP_BAO_CAO_CONG_VIEC.xlsx', finalZip);
  fs.writeFileSync('H:\\My Drive\\task-manager-app\\MAU_TONG_HOP_BAO_CAO_CONG_VIEC.xlsx', finalZip);

  console.log('REVISED UNIFIED TEMPLATE CREATED PERFECTLY!');
}

run();
