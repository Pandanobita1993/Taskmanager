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

function buildCleanWorkbook() {
  const newEntries = [];

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;
  newEntries.push({ fileName: '[Content_Types].xml', uncompressedData: Buffer.from(contentTypesXml, 'utf8') });

  // 2. _rels/.rels
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  newEntries.push({ fileName: '_rels/.rels', uncompressedData: Buffer.from(rootRels, 'utf8') });

  // 3. xl/workbook.xml
  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="BaoCaoCongViec" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
  newEntries.push({ fileName: 'xl/workbook.xml', uncompressedData: Buffer.from(wbXml, 'utf8') });

  // 4. xl/_rels/workbook.xml.rels
  const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;
  newEntries.push({ fileName: 'xl/_rels/workbook.xml.rels', uncompressedData: Buffer.from(wbRelsXml, 'utf8') });

  // 5. xl/styles.xml - CHUẨN ĐỈNH CAO:
  // - Font 0: Times New Roman 13pt thường
  // - Font 1: Times New Roman 13pt Đậm (Bold)
  // - Font 2: Times New Roman 20pt Đậm (Tiêu đề lớn)
  // - Font 3: Times New Roman 13pt Đậm Nghiêng
  // - Font 4: Times New Roman 12pt Nghiêng
  // - Fill 2: Xanh lá cây chuẩn FF00B050
  // - Border 1: Khung kẻ mỏng (Thin border 4 cạnh)
  // - cellXfs:
  //   s=0: default
  //   s=1: Header Công ty (Bold Left, không viền)
  //   s=2: Header Quốc hiệu (Bold Center, không viền)
  //   s=3: Tiêu ngữ thường (Center, không viền)
  //   s=4: Tiêu đề lớn BÁO CÁO (20pt Bold Center)
  //   s=5: Kỳ báo cáo (Bold Nghiêng Center)
  //   s=6: Nhân sự phụ trách (Bold Left)
  //   s=7: Ngày xuất / Văn phòng (Regular Center/Right)
  //   s=10: TIÊU ĐỀ CỘT BẢNG (Bold, Fill FF00B050, Center, Thin Border, WrapText)
  //   s=11: Data Center có viền (STT, Nghiệp vụ, Ngày nộp)
  //   s=12: Data Left có viền + WrapText (Tên cty, Công việc, Kết quả, Vướng mắc, Ghi chú, Chứng từ giấy)
  //   s=13: Data Right có viền (Phí DVKT, Công nợ)
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="5">
    <font><sz val="13"/><name val="Times New Roman"/><family val="1"/></font>
    <font><b/><sz val="13"/><name val="Times New Roman"/><family val="1"/></font>
    <font><b/><sz val="20"/><color rgb="FF002060"/><name val="Times New Roman"/><family val="1"/></font>
    <font><b/><i/><sz val="13"/><color rgb="FF002060"/><name val="Times New Roman"/><family val="1"/></font>
    <font><i/><sz val="12"/><color rgb="FF595959"/><name val="Times New Roman"/><family val="1"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF00B050"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FF000000"/></left>
      <right style="thin"><color rgb="FF000000"/></right>
      <top style="thin"><color rgb="FF000000"/></top>
      <bottom style="thin"><color rgb="FF000000"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="14">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
  newEntries.push({ fileName: 'xl/styles.xml', uncompressedData: Buffer.from(stylesXml, 'utf8') });

  // 6. Xử lý Shared Strings & Sheet Data
  const stringList = [];
  function addS(s) {
    let idx = stringList.indexOf(s);
    if (idx === -1) {
      idx = stringList.length;
      stringList.push(s);
    }
    return idx;
  }

  // Tiêu đề 12 cột chuẩn
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

  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  // Cột widths chuẩn tuyệt đối
  const colWidths = [
    { min: 1, max: 1, width: 6.5 },   // A: STT
    { min: 2, max: 2, width: 36 },    // B: Tên công ty
    { min: 3, max: 3, width: 18 },    // C: Nghiệp vụ
    { min: 4, max: 4, width: 45 },    // D: Công việc cụ thể
    { min: 5, max: 5, width: 24 },    // E: Mã HS / Cơ quan tiếp nhận
    { min: 6, max: 6, width: 32 },    // F: Kết quả / Đã làm
    { min: 7, max: 7, width: 28 },    // G: Vướng mắc
    { min: 8, max: 8, width: 17 },    // H: Phí DVKT / VAT
    { min: 9, max: 9, width: 22 },    // I: Công nợ
    { min: 10, max: 10, width: 16 },  // J: Ngày nộp
    { min: 11, max: 11, width: 26 },  // K: Chứng từ bản giấy
    { min: 12, max: 12, width: 28 },  // L: Ghi chú
  ];

  const colsXml = '<cols>' + colWidths.map(c => `<col min="${c.min}" max="${c.max}" width="${c.width}" customWidth="1"/>`).join('') + '</cols>';

  // Build Sheet Rows
  const rows = [];

  // Row 1: Thông tin công ty & Quốc hiệu
  const idxCty = addS('CÔNG TY TNHH DỊCH VỤ KẾ TOÁN AN AN');
  const idxQh = addS('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
  rows.push(`<row r="1" ht="24" customHeight="1">
    <c r="A1" s="1" t="s"><v>${idxCty}</v></c><c r="B1" s="1"/><c r="C1" s="1"/><c r="D1" s="1"/>
    <c r="E1" s="2" t="s"><v>${idxQh}</v></c><c r="F1" s="2"/><c r="G1" s="2"/><c r="H1" s="2"/><c r="I1" s="2"/><c r="J1" s="2"/><c r="K1" s="2"/><c r="L1" s="2"/>
  </row>`);

  // Row 2: Địa chỉ & Tiêu ngữ
  const idxDc = addS('Địa chỉ: 319, Ấp Mới 2, Xã Mỹ Hạnh, Tỉnh Tây Ninh');
  const idxTn = addS('Độc lập - Tự do - Hạnh phúc');
  rows.push(`<row r="2" ht="22" customHeight="1">
    <c r="A2" s="8" t="s"><v>${idxDc}</v></c><c r="B2" s="8"/><c r="C2" s="8"/><c r="D2" s="8"/>
    <c r="E2" s="3" t="s"><v>${idxTn}</v></c><c r="F2" s="3"/><c r="G2" s="3"/><c r="H2" s="3"/><c r="I2" s="3"/><c r="J2" s="3"/><c r="K2" s="3"/><c r="L2" s="3"/>
  </row>`);

  // Row 3: Dấu gạch tiêu ngữ
  const idxGach = addS('---***---');
  rows.push(`<row r="3" ht="18" customHeight="1">
    <c r="A3" s="0"/><c r="B3" s="0"/><c r="C3" s="0"/><c r="D3" s="0"/>
    <c r="E3" s="3" t="s"><v>${idxGach}</v></c><c r="F3" s="3"/><c r="G3" s="3"/><c r="H3" s="3"/><c r="I3" s="3"/><c r="J3" s="3"/><c r="K3" s="3"/><c r="L3" s="3"/>
  </row>`);

  // Row 4: Trống
  rows.push(`<row r="4" ht="14" customHeight="1"/>`);

  // Row 5: TIÊU ĐỀ LỚN
  const idxTd = addS('BÁO CÁO KẾT QUẢ CÔNG VIỆC');
  rows.push(`<row r="5" ht="32" customHeight="1">
    <c r="A5" s="4" t="s"><v>${idxTd}</v></c><c r="B5" s="4"/><c r="C5" s="4"/><c r="D5" s="4"/><c r="E5" s="4"/><c r="F5" s="4"/><c r="G5" s="4"/><c r="H5" s="4"/><c r="I5" s="4"/><c r="J5" s="4"/><c r="K5" s="4"/><c r="L5" s="4"/>
  </row>`);

  // Row 6: KỲ BÁO CÁO
  const idxKy = addS('(Kỳ báo cáo: Từ ngày 01/10/2026 đến ngày 10/10/2026)');
  rows.push(`<row r="6" ht="20" customHeight="1">
    <c r="A6" s="5" t="s"><v>${idxKy}</v></c><c r="B6" s="5"/><c r="C6" s="5"/><c r="D6" s="5"/><c r="E6" s="5"/><c r="F6" s="5"/><c r="G6" s="5"/><c r="H6" s="5"/><c r="I6" s="5"/><c r="J6" s="5"/><c r="K6" s="5"/><c r="L6" s="5"/>
  </row>`);

  // Row 7: NHÂN SỰ & VĂN PHÒNG
  const idxNs = addS('Nhân sự phụ trách: NGÔ MINH TIẾN');
  const idxVp = addS('Bộ phận công tác: Văn phòng Cần Thơ');
  rows.push(`<row r="7" ht="22" customHeight="1">
    <c r="A7" s="6" t="s"><v>${idxNs}</v></c><c r="B7" s="6"/><c r="C7" s="6"/><c r="D7" s="6"/>
    <c r="E7" s="0"/><c r="F7" s="0"/><c r="G7" s="0"/><c r="H7" s="0"/>
    <c r="I7" s="8" t="s"><v>${idxVp}</v></c><c r="J7" s="8"/><c r="K7" s="8"/><c r="L7" s="8"/>
  </row>`);

  // Row 8: DÒNG TIÊU ĐỀ BẢNG (XANH LÁ FF00B050 + BORDER + BOLD + WRAPTEXT)
  let r8 = '<row r="8" ht="36" customHeight="1">';
  colLetters.forEach((col, i) => {
    const sIdx = addS(headers[i]);
    r8 += `<c r="${col}8" s="10" t="s"><v>${sIdx}</v></c>`;
  });
  r8 += '</row>';
  rows.push(r8);

  // DỮ LIỆU THỰC TẾ ĐẠI DIỆN 3 NGHIỆP VỤ: KẾ TOÁN, BẢO HIỂM XÃ HỘI, SETUP
  const sampleData = [
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

  let curR = 9;
  sampleData.forEach(d => {
    const s1 = d.stt;
    const s2 = addS(d.client);
    const s3 = addS(d.role);
    const s4 = addS(d.content);
    const s5 = addS(d.dossier);
    const s6 = addS(d.result);
    const s7 = addS(d.pending);
    const s8 = addS(d.fee);
    const s9 = addS(d.debt);
    const s10 = addS(d.subDate);
    const s11 = addS(d.paper);
    const s12 = addS(d.note);

    let rowXml = `<row r="${curR}" ht="62" customHeight="1">`;
    rowXml += `<c r="A${curR}" s="11"><v>${s1}</v></c>`;
    rowXml += `<c r="B${curR}" s="12" t="s"><v>${s2}</v></c>`;
    rowXml += `<c r="C${curR}" s="11" t="s"><v>${s3}</v></c>`;
    rowXml += `<c r="D${curR}" s="12" t="s"><v>${s4}</v></c>`;
    rowXml += `<c r="E${curR}" s="12" t="s"><v>${s5}</v></c>`;
    rowXml += `<c r="F${curR}" s="12" t="s"><v>${s6}</v></c>`;
    rowXml += `<c r="G${curR}" s="12" t="s"><v>${s7}</v></c>`;
    rowXml += `<c r="H${curR}" s="13" t="s"><v>${s8}</v></c>`;
    rowXml += `<c r="I${curR}" s="12" t="s"><v>${s9}</v></c>`;
    rowXml += `<c r="J${curR}" s="11" t="s"><v>${s10}</v></c>`;
    rowXml += `<c r="K${curR}" s="12" t="s"><v>${s11}</v></c>`;
    rowXml += `<c r="L${curR}" s="12" t="s"><v>${s12}</v></c>`;
    rowXml += `</row>`;
    rows.push(rowXml);
    curR++;
  });

  // Merges
  const merges = [
    'A1:D1', 'E1:L1',
    'A2:D2', 'E2:L2',
    'E3:L3',
    'A5:L5',
    'A6:L6',
    'A7:D7', 'I7:L7'
  ];
  const mergesXml = `<mergeCells count="${merges.length}">` + merges.map(m => `<mergeCell ref="${m}"/>`).join('') + `</mergeCells>`;

  // 7. Hoàn thiện sheet1.xml
  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0" showGridLines="1"/>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="16.5"/>
  ${colsXml}
  <sheetData>
    ${rows.join('\n')}
  </sheetData>
  ${mergesXml}
  <pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
  newEntries.push({ fileName: 'xl/worksheets/sheet1.xml', uncompressedData: Buffer.from(sheet1Xml, 'utf8') });

  // 8. xl/sharedStrings.xml
  const sstXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${stringList.length}" uniqueCount="${stringList.length}">
  ${stringList.map(s => `<si><t>${String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</t></si>`).join('\n')}
</sst>`;
  newEntries.push({ fileName: 'xl/sharedStrings.xml', uncompressedData: Buffer.from(sstXml, 'utf8') });

  const finalZip = buildZip(newEntries);

  fs.writeFileSync('D:\\Taskmanager\\MAU_TONG_HOP_BAO_CAO_CONG_VIEC.xlsx', finalZip);
  fs.writeFileSync('H:\\My Drive\\task-manager-app\\MAU_TONG_HOP_BAO_CAO_CONG_VIEC.xlsx', finalZip);

  console.log('CLEAN BEAUTIFUL UNIFIED WORKBOOK GENERATED PERFECTLY!');
}

buildCleanWorkbook();
