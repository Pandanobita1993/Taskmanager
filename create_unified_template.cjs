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
  const stylesEntry = entries.find(e => e.fileName === 'xl/styles.xml');

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

  // 14 Cột Chuẩn Hóa
  const headers = [
    'STT',
    'TÊN CÔNG TY / KHÁCH HÀNG',
    'NGHIỆP VỤ',
    'CÔNG VIỆC CỤ THỂ',
    'MÃ HỒ SƠ / CƠ QUAN TIẾP NHẬN',
    'KẾT QUẢ / ĐÃ LÀM',
    'CHƯA LÀM ĐƯỢC / VƯỚNG MẮC',
    'TIẾN ĐỘ NHẬP LIỆU MISA',
    'PHÍ DVKT / VAT',
    'CÔNG NỢ',
    'NGÀY NỘP BC / NỘP HS',
    'CHỨNG TỪ BÀN GIAO CHO CTY',
    'GHI CHÚ',
    'ĐÁNH GIÁ LÃNH ĐẠO'
  ];

  // Chiều rộng cột
  const colWidths = [
    { min: 1, max: 1, width: 6.5 },   // STT
    { min: 2, max: 2, width: 36 },    // Tên công ty
    { min: 3, max: 3, width: 14 },    // Nghiệp vụ
    { min: 4, max: 4, width: 40 },    // Công việc cụ thể
    { min: 5, max: 5, width: 22 },    // Mã HS / Cơ quan tiếp nhận
    { min: 6, max: 6, width: 30 },    // Kết quả / Đã làm
    { min: 7, max: 7, width: 28 },    // Chưa làm được / Vướng mắc
    { min: 8, max: 8, width: 32 },    // Tiến độ MISA
    { min: 9, max: 9, width: 16 },    // Phí DVKT
    { min: 10, max: 10, width: 22 },  // Công nợ
    { min: 11, max: 11, width: 16 },  // Ngày nộp BC / HS
    { min: 12, max: 12, width: 26 },  // Chứng từ bàn giao
    { min: 13, max: 13, width: 25 },  // Ghi chú
    { min: 14, max: 14, width: 20 },  // Đánh giá lãnh đạo
  ];

  const colsXml = '<cols>' + colWidths.map(c => `<col min="${c.min}" max="${c.max}" width="${c.width}" style="4" customWidth="1"/>`).join('') + '<col min="15" max="16384" width="12" style="4"/></cols>';
  sheet1Xml = sheet1Xml.replace(/<cols>.*?<\/cols>/s, colsXml);

  // Cập nhật Header dòng 8 với màu xanh lá mạ / xanh chuối chuẩn (style 11 hoặc 12)
  // Các cột: A đến N (14 cột)
  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  
  // Dòng 8: Header
  let headerRowXml = '<row r="8" spans="1:14" ht="35" x14ac:dyDescent="0.25">';
  colLetters.forEach((col, i) => {
    const sIdx = addString(headers[i]);
    headerRowXml += `<c r="${col}8" s="11" t="s"><v>${sIdx}</v></c>`;
  });
  headerRowXml += '</row>';

  // Dữ liệu mẫu phong phú đại diện cho cả 3 mảng: Kế toán, BHXH, GPKD và MISA
  const sampleData = [
    // 1. Khách hàng Kế toán + MISA
    {
      stt: 1,
      client: 'CÔNG TY TNHH SAS VINA\n(MST: 1101873394)',
      role: 'Kế toán thuế',
      content: '- Nộp tờ khai thuế GTGT và TNCN Q3/2026\n- Nhập liệu hóa đơn đầu vào, đầu ra\n- Nhập sổ phụ ngân hàng',
      dossier: 'CQT Tỉnh Long An',
      result: '- Cơ quan thuế đã chấp nhận tờ khai Q3\n- Đã nhập xong HĐ đầu vào T7, T8',
      pending: '- Chưa gửi sao kê ngân hàng T9',
      misa: 'Mua vào: Đến T8\nBán ra: Đến T8\nSổ phụ: Đến T7\nIn chứng từ: Đến T6',
      fee: '8.500.000 đ/quý',
      debt: 'Đã thanh toán hết Q2/2026\nĐã gửi ĐNTT Q3',
      subDate: '10/10/2026',
      handover: 'Tờ khai thuế GTGT Q3',
      note: 'Hẹn thanh toán phí ngày 15/10',
      eval: ''
    },
    // 2. Khách hàng BHXH
    {
      stt: 2,
      client: 'CÔNG TY CỔ PHẦN VŨ MẠNH\n(MST: 0315891234)',
      role: 'Bảo hiểm XH',
      content: '- Điều chỉnh mức đóng BHXH cho Hoàng Thị Hồng Loan từ 7.000.000 lên 7.500.000 đ\n- Báo tăng lao động mới Nguyễn Như Mão',
      dossier: 'Mã HS: 157866/2024/07405\nMã HS: 43492/2025/07405',
      result: '- Hồ sơ điều chỉnh lương: ĐÃ ĐƯỢC DUYỆT\n- Hồ sơ báo tăng: ĐÃ ĐƯỢC DUYỆT',
      pending: 'Không',
      misa: 'Bảng lương: Hết T9\nC12: Đã đối chiếu khớp T9',
      fee: '500.000 đ/tháng',
      debt: 'Đã thu xong T09/2026',
      subDate: '08/10/2026',
      handover: 'Thông báo kết quả đóng BHXH (Mẫu C12)',
      note: 'Hồ sơ duyệt nhanh trong 2 ngày',
      eval: ''
    },
    // 3. Khách hàng GPKD / Pháp lý
    {
      stt: 3,
      client: 'CÔNG TY TNHH TM KHÁNH AN VN\n(MST: 0317823456)',
      role: 'Hồ sơ GPKD',
      content: 'Đăng ký thành lập địa điểm kinh doanh mới tại Cần Thơ',
      dossier: 'Sở KH&ĐT Cần Thơ\n(Mã HS: ĐKKD-88219)',
      result: 'Hồ sơ hợp lệ, đã có kết quả chấp thuận',
      pending: 'Chờ nhận Giấy chứng nhận bản gốc',
      misa: 'Chưa phát sinh',
      fee: '1.500.000 đ (Phí setup)',
      debt: 'Đã thu cọc 50%',
      subDate: '05/10/2026',
      handover: 'Giấy chứng nhận ĐĐKD bản gốc',
      note: 'Dự kiến trả kết quả ngày 12/10',
      eval: ''
    },
    // 4. Khách hàng Kế toán trọn gói + BHXH
    {
      stt: 4,
      client: 'CÔNG TY TNHH THỜI TRANG DENNY\n(MST: 1801239876)',
      role: 'KT + BHXH',
      content: '- Khai thuế GTGT Q3\n- Báo giảm thai sản cho nhân viên Nguyễn Cẩm Giang\n- Nhập liệu sổ phụ ngân hàng 2024',
      dossier: 'BHXH Cần Thơ\n(Mã HS: 115218/2025)',
      result: '- Đã nộp tờ khai thuế GTGT\n- Hồ sơ thai sản ĐÃ DUYỆT',
      pending: 'Chờ khách bổ sung sao kê tài khoản USD',
      misa: 'Mua vào: Hết T9\nBán ra: Hết T9\nSổ phụ: Hết T8\nBảng lương: Hết T9',
      fee: '3.000.000 đ/tháng',
      debt: 'Đã gửi ĐNTT tháng 9',
      subDate: '10/10/2026',
      handover: 'Sổ phụ ngân hàng + Bảng lương',
      note: 'Khách hẹn thanh toán cuối tuần',
      eval: ''
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
    const idxMisa = addString(item.misa);
    const idxFee = addString(item.fee);
    const idxDebt = addString(item.debt);
    const idxSubDate = addString(item.subDate);
    const idxHandover = addString(item.handover);
    const idxNote = addString(item.note);
    const idxEval = addString(item.eval);

    let row = `<row r="${rowNum}" spans="1:14" ht="45" x14ac:dyDescent="0.25">`;
    row += `<c r="A${rowNum}" s="4"><v>${idxStt}</v></c>`;
    row += `<c r="B${rowNum}" s="5" t="s"><v>${idxClient}</v></c>`;
    row += `<c r="C${rowNum}" s="4" t="s"><v>${idxRole}</v></c>`;
    row += `<c r="D${rowNum}" s="5" t="s"><v>${idxContent}</v></c>`;
    row += `<c r="E${rowNum}" s="5" t="s"><v>${idxDossier}</v></c>`;
    row += `<c r="F${rowNum}" s="5" t="s"><v>${idxResult}</v></c>`;
    row += `<c r="G${rowNum}" s="5" t="s"><v>${idxPending}</v></c>`;
    row += `<c r="H${rowNum}" s="5" t="s"><v>${idxMisa}</v></c>`;
    row += `<c r="I${rowNum}" s="4" t="s"><v>${idxFee}</v></c>`;
    row += `<c r="J${rowNum}" s="5" t="s"><v>${idxDebt}</v></c>`;
    row += `<c r="K${rowNum}" s="4" t="s"><v>${idxSubDate}</v></c>`;
    row += `<c r="L${rowNum}" s="5" t="s"><v>${idxHandover}</v></c>`;
    row += `<c r="M${rowNum}" s="5" t="s"><v>${idxNote}</v></c>`;
    row += `<c r="N${rowNum}" s="5" t="s"><v>${idxEval}</v></c>`;
    row += `</row>`;
    rowsXml.push(row);

    currentRow++;
  });

  // Tái tạo lại sheetData
  // Dòng 1-7 giữ nguyên phần thông tin công ty và nhân sự
  const sheetDataMatch = sheet1Xml.match(/<sheetData>(.*?)<\/sheetData>/s);
  const origSheetData = sheetDataMatch[1];
  
  // Lấy các dòng từ row 1 đến 7
  const r7End = origSheetData.indexOf('</row>', origSheetData.indexOf('<row r="7"')) + 6;
  const headerSection = origSheetData.substring(0, r7End);

  const newSheetData = '<sheetData>' + headerSection + headerRowXml + rowsXml.join('') + '</sheetData>';
  sheet1Xml = sheet1Xml.replace(/<sheetData>.*?<\/sheetData>/s, newSheetData);

  // Cập nhật merges (tiêu đề A1:D1, E1:N1... và tiêu đề báo cáo A5:N5)
  const merges = [
    'A1:D1', 'A2:D2',
    'E1:N1', 'E2:N2', 'E3:N3',
    'A5:N5', 'A6:D6', 'A7:D7'
  ];
  const mergesXml = `<mergeCells count="${merges.length}">` + merges.map(m => `<mergeCell ref="${m}"/>`).join('') + `</mergeCells>`;
  sheet1Xml = sheet1Xml.replace(/<mergeCells count="[^"]*">.*?<\/mergeCells>/s, mergesXml);

  // Cập nhật dimension
  sheet1Xml = sheet1Xml.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:N${currentRow - 1}"/>`);

  // Cập nhật Shared Strings
  const newSsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${stringList.length}" uniqueCount="${stringList.length}">` +
    stringList.map(s => `<si><t>${String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</t></si>`).join('') +
    `</sst>`;

  sharedStringsEntry.uncompressedData = Buffer.from(newSsXml, 'utf8');
  sheet1Entry.uncompressedData = Buffer.from(sheet1Xml, 'utf8');

  const finalZip = buildZip(entries);

  // Ghi file mẫu tổng hợp
  fs.writeFileSync('D:\\Taskmanager\\MAU_TONG_HOP_BAO_CAO_CONG_VIEC.xlsx', finalZip);
  fs.writeFileSync('H:\\My Drive\\task-manager-app\\MAU_TONG_HOP_BAO_CAO_CONG_VIEC.xlsx', finalZip);

  console.log('UNIFIED TEMPLATE CREATED SUCCESSFULLY!');
}

run();
