const fs = require('fs');
const zlib = require('zlib');
const { allEmployeeRecords, clientAggregatedMap } = require('./parse_all_data.cjs');

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

function generateCompleteWorkbook() {
  const newEntries = [];

  // Danh sách các Sheet cần tạo:
  // Sheet 1: TỔNG HỢP THEO KHÁCH HÀNG (có thêm cột Người thực hiện)
  // Sheet 2 -> N: Từng nhân viên
  const sheetsDef = [
    { id: 1, name: 'TỔNG HỢP THEO KHÁCH HÀNG', isSummary: true }
  ];

  allEmployeeRecords.forEach((emp, idx) => {
    sheetsDef.push({
      id: idx + 2,
      name: emp.sheetTitle,
      empName: emp.empName,
      records: emp.records,
      isSummary: false
    });
  });

  // 1. [Content_Types].xml
  let overrideTypes = sheetsDef.map(s => `<Override PartName="/xl/worksheets/sheet${s.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n');
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${overrideTypes}
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
  const sheetsXml = sheetsDef.map(s => `<sheet name="${s.name.replace(/"/g, '')}" sheetId="${s.id}" r:id="rId${s.id}"/>`).join('\n');
  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheetsXml}
  </sheets>
</workbook>`;
  newEntries.push({ fileName: 'xl/workbook.xml', uncompressedData: Buffer.from(wbXml, 'utf8') });

  // 4. xl/_rels/workbook.xml.rels
  let wbRels = sheetsDef.map(s => `<Relationship Id="rId${s.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s.id}.xml"/>`).join('\n');
  const stylesRelId = `rId${sheetsDef.length + 1}`;
  const sstRelId = `rId${sheetsDef.length + 2}`;
  wbRels += `\n<Relationship Id="${stylesRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  wbRels += `\n<Relationship Id="${sstRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`;

  const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${wbRels}
</Relationships>`;
  newEntries.push({ fileName: 'xl/_rels/workbook.xml.rels', uncompressedData: Buffer.from(wbRelsXml, 'utf8') });

  // 5. xl/styles.xml
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

  // 6. Quản lý SharedStrings
  const stringList = [];
  function addS(s) {
    if (s === null || s === undefined) return addS('');
    const str = String(s);
    let idx = stringList.indexOf(str);
    if (idx === -1) {
      idx = stringList.length;
      stringList.push(str);
    }
    return idx;
  }

  // Tiêu đề cố định
  const idxCty = addS('CÔNG TY TNHH DỊCH VỤ KẾ TOÁN AN AN');
  const idxQh = addS('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
  const idxDc = addS('Địa chỉ: 319, Ấp Mới 2, Xã Mỹ Hạnh, Tỉnh Tây Ninh');
  const idxTn = addS('Độc lập - Tự do - Hạnh phúc');
  const idxGach = addS('---***---');
  const idxKy = addS('(Kỳ báo cáo: Tuần từ ngày 05/10/2026 đến ngày 11/10/2026)');

  // 7. Tạo từng Sheet
  sheetsDef.forEach(sheetDef => {
    const isSummary = sheetDef.isSummary;

    // Cấu trúc cột
    // Sheet tổng hợp: 13 cột (thêm cột Người thực hiện ở vị trí cột C)
    // Sheet cá nhân: 12 cột chuẩn
    const headers = isSummary ? [
      'STT',
      'TÊN CÔNG TY / KHÁCH HÀNG',
      'NGƯỜI THỰC HIỆN',
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
    ] : [
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

    const colWidths = isSummary ? [
      { min: 1, max: 1, width: 6.5 },   // STT
      { min: 2, max: 2, width: 36 },    // Tên công ty
      { min: 3, max: 3, width: 22 },    // NGƯỜI THỰC HIỆN
      { min: 4, max: 4, width: 18 },    // Nghiệp vụ
      { min: 5, max: 5, width: 45 },    // Công việc cụ thể
      { min: 6, max: 6, width: 24 },    // Mã HS
      { min: 7, max: 7, width: 32 },    // Kết quả
      { min: 8, max: 8, width: 28 },    // Vướng mắc
      { min: 9, max: 9, width: 17 },    // Phí DVKT
      { min: 10, max: 10, width: 22 },  // Công nợ
      { min: 11, max: 11, width: 16 },  // Ngày nộp
      { min: 12, max: 12, width: 26 },  // Chứng từ bản giấy
      { min: 13, max: 13, width: 28 },  // Ghi chú
    ] : [
      { min: 1, max: 1, width: 6.5 },   // STT
      { min: 2, max: 2, width: 36 },    // Tên công ty
      { min: 3, max: 3, width: 18 },    // Nghiệp vụ
      { min: 4, max: 4, width: 45 },    // Công việc cụ thể
      { min: 5, max: 5, width: 24 },    // Mã HS
      { min: 6, max: 6, width: 32 },    // Kết quả
      { min: 7, max: 7, width: 28 },    // Vướng mắc
      { min: 8, max: 8, width: 17 },    // Phí DVKT
      { min: 9, max: 9, width: 22 },    // Công nợ
      { min: 10, max: 10, width: 16 },  // Ngày nộp
      { min: 11, max: 11, width: 26 },  // Chứng từ bản giấy
      { min: 12, max: 12, width: 28 },  // Ghi chú
    ];

    const lastColLetter = isSummary ? 'M' : 'L';
    const colLetters = isSummary 
      ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']
      : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

    const colsXml = '<cols>' + colWidths.map(c => `<col min="${c.min}" max="${c.max}" width="${c.width}" customWidth="1"/>`).join('') + '</cols>';

    const sheetRows = [];

    // Header công ty
    sheetRows.push(`<row r="1" ht="24" customHeight="1">
      <c r="A1" s="1" t="s"><v>${idxCty}</v></c><c r="B1" s="1"/><c r="C1" s="1"/><c r="D1" s="1"/>
      <c r="E1" s="2" t="s"><v>${idxQh}</v></c><c r="F1" s="2"/><c r="G1" s="2"/><c r="H1" s="2"/><c r="I1" s="2"/><c r="J1" s="2"/><c r="K1" s="2"/><c r="${lastColLetter}1" s="2"/>
    </row>`);

    sheetRows.push(`<row r="2" ht="22" customHeight="1">
      <c r="A2" s="8" t="s"><v>${idxDc}</v></c><c r="B2" s="8"/><c r="C2" s="8"/><c r="D2" s="8"/>
      <c r="E2" s="3" t="s"><v>${idxTn}</v></c><c r="F2" s="3"/><c r="G2" s="3"/><c r="H2" s="3"/><c r="I2" s="3"/><c r="J2" s="3"/><c r="K2" s="3"/><c r="${lastColLetter}2" s="3"/>
    </row>`);

    sheetRows.push(`<row r="3" ht="18" customHeight="1">
      <c r="A3" s="0"/><c r="B3" s="0"/><c r="C3" s="0"/><c r="D3" s="0"/>
      <c r="E3" s="3" t="s"><v>${idxGach}</v></c><c r="F3" s="3"/><c r="G3" s="3"/><c r="H3" s="3"/><c r="I3" s="3"/><c r="J3" s="3"/><c r="K3" s="3"/><c r="${lastColLetter}3" s="3"/>
    </row>`);

    sheetRows.push(`<row r="4" ht="14" customHeight="1"/>`);

    const titleText = isSummary 
      ? 'BÁO CÁO TỔNG HỢP CÔNG VIỆC THEO KHÁCH HÀNG'
      : `BÁO CÁO KẾT QUẢ CÔNG VIỆC - ${sheetDef.empName.toUpperCase()}`;
    const idxTitle = addS(titleText);
    sheetRows.push(`<row r="5" ht="32" customHeight="1">
      <c r="A5" s="4" t="s"><v>${idxTitle}</v></c>` + colLetters.slice(1).map(c => `<c r="${c}5" s="4"/>`).join('') + `
    </row>`);

    sheetRows.push(`<row r="6" ht="20" customHeight="1">
      <c r="A6" s="5" t="s"><v>${idxKy}</v></c>` + colLetters.slice(1).map(c => `<c r="${c}6" s="5"/>`).join('') + `
    </row>`);

    const subText1 = isSummary ? 'Phạm vi: Toàn bộ khách hàng Văn phòng Cần Thơ' : 'Bộ phận công tác: Văn phòng Cần Thơ';
    const idxSub1 = addS(subText1);
    sheetRows.push(`<row r="7" ht="22" customHeight="1">
      <c r="A7" s="6" t="s"><v>${idxSub1}</v></c><c r="B7" s="6"/><c r="C7" s="6"/><c r="D7" s="6"/><c r="E7" s="6"/><c r="F7" s="6"/>
      <c r="G7" s="0"/><c r="H7" s="0"/><c r="I7" s="0"/><c r="J7" s="0"/><c r="K7" s="0"/><c r="${lastColLetter}7" s="0"/>
    </row>`);

    // Dòng 8: Header bảng
    let r8 = '<row r="8" ht="36" customHeight="1">';
    colLetters.forEach((col, i) => {
      const sIdx = addS(headers[i]);
      r8 += `<c r="${col}8" s="10" t="s"><v>${sIdx}</v></c>`;
    });
    r8 += '</row>';
    sheetRows.push(r8);

    // Dữ liệu
    let curR = 9;
    const merges = [
      `A1:D1`, `E1:${lastColLetter}1`,
      `A2:D2`, `E2:${lastColLetter}2`,
      `E3:${lastColLetter}3`,
      `A5:${lastColLetter}5`,
      `A6:${lastColLetter}6`,
      `A7:F7`
    ];

    if (isSummary) {
      // Dữ liệu Sheet Tổng hợp gom theo từng khách hàng
      let stt = 1;
      const sortedKeys = Object.keys(clientAggregatedMap).sort();

      sortedKeys.forEach(ckey => {
        const item = clientAggregatedMap[ckey];
        const startR = curR;

        item.tasks.forEach((t, tidx) => {
          const sStt = tidx === 0 ? stt : '';
          const sClient = tidx === 0 ? item.clientName : '';
          const sEmp = t.empName;
          const sRole = t.role;
          const sWork = t.work;
          const sDossier = t.dossier;
          const sResult = t.result;
          const sPending = t.pending;
          const sFee = t.fee;
          const sDebt = t.debt;
          const sDate = t.subDate;
          const sPaper = t.paper;
          const sNote = t.note;

          let rXml = `<row r="${curR}" ht="52" customHeight="1">`;
          rXml += `<c r="A${curR}" s="11">${sStt ? `<v>${sStt}</v>` : ''}</c>`;
          rXml += `<c r="B${curR}" s="12" t="s"><v>${addS(sClient)}</v></c>`;
          rXml += `<c r="C${curR}" s="11" t="s"><v>${addS(sEmp)}</v></c>`;
          rXml += `<c r="D${curR}" s="11" t="s"><v>${addS(sRole)}</v></c>`;
          rXml += `<c r="E${curR}" s="12" t="s"><v>${addS(sWork)}</v></c>`;
          rXml += `<c r="F${curR}" s="12" t="s"><v>${addS(sDossier)}</v></c>`;
          rXml += `<c r="G${curR}" s="12" t="s"><v>${addS(sResult)}</v></c>`;
          rXml += `<c r="H${curR}" s="12" t="s"><v>${addS(sPending)}</v></c>`;
          rXml += `<c r="I${curR}" s="13" t="s"><v>${addS(sFee)}</v></c>`;
          rXml += `<c r="J${curR}" s="12" t="s"><v>${addS(sDebt)}</v></c>`;
          rXml += `<c r="K${curR}" s="11" t="s"><v>${addS(sDate)}</v></c>`;
          rXml += `<c r="L${curR}" s="12" t="s"><v>${addS(sPaper)}</v></c>`;
          rXml += `<c r="M${curR}" s="12" t="s"><v>${addS(sNote)}</v></c>`;
          rXml += `</row>`;
          sheetRows.push(rXml);

          curR++;
        });

        // Merge STT và Tên khách hàng nếu có nhiều việc
        if (item.tasks.length > 1) {
          merges.push(`A${startR}:A${curR - 1}`);
          merges.push(`B${startR}:B${curR - 1}`);
        }
        stt++;
      });
    } else {
      // Sheet cá nhân
      let stt = 1;
      let lastClient = '';
      let clientStartR = curR;

      sheetDef.records.forEach((t, idx) => {
        const isNewClient = t.client !== lastClient;
        if (isNewClient && idx > 0) {
          if (curR - clientStartR > 1) {
            merges.push(`A${clientStartR}:A${curR - 1}`);
            merges.push(`B${clientStartR}:B${curR - 1}`);
          }
          clientStartR = curR;
          stt++;
        }
        lastClient = t.client;

        const sStt = isNewClient ? stt : '';
        const sClient = isNewClient ? t.client : '';

        let rXml = `<row r="${curR}" ht="52" customHeight="1">`;
        rXml += `<c r="A${curR}" s="11">${sStt ? `<v>${sStt}</v>` : ''}</c>`;
        rXml += `<c r="B${curR}" s="12" t="s"><v>${addS(sClient)}</v></c>`;
        rXml += `<c r="C${curR}" s="11" t="s"><v>${addS(t.role)}</v></c>`;
        rXml += `<c r="D${curR}" s="12" t="s"><v>${addS(t.work)}</v></c>`;
        rXml += `<c r="E${curR}" s="12" t="s"><v>${addS(t.dossier)}</v></c>`;
        rXml += `<c r="F${curR}" s="12" t="s"><v>${addS(t.result)}</v></c>`;
        rXml += `<c r="G${curR}" s="12" t="s"><v>${addS(t.pending)}</v></c>`;
        rXml += `<c r="H${curR}" s="13" t="s"><v>${addS(t.fee)}</v></c>`;
        rXml += `<c r="I${curR}" s="12" t="s"><v>${addS(t.debt)}</v></c>`;
        rXml += `<c r="J${curR}" s="11" t="s"><v>${addS(t.subDate)}</v></c>`;
        rXml += `<c r="K${curR}" s="12" t="s"><v>${addS(t.paper)}</v></c>`;
        rXml += `<c r="L${curR}" s="12" t="s"><v>${addS(t.note)}</v></c>`;
        rXml += `</row>`;
        sheetRows.push(rXml);

        curR++;
      });

      if (sheetDef.records.length > 0 && curR - clientStartR > 1) {
        merges.push(`A${clientStartR}:A${curR - 1}`);
        merges.push(`B${clientStartR}:B${curR - 1}`);
      }
    }

    const mergesXml = `<mergeCells count="${merges.length}">` + merges.map(m => `<mergeCell ref="${m}"/>`).join('') + `</mergeCells>`;

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews>
    <sheetView tabSelected="${sheetDef.id === 1 ? '1' : '0'}" workbookViewId="0" showGridLines="1"/>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="16.5"/>
  ${colsXml}
  <sheetData>
    ${sheetRows.join('\n')}
  </sheetData>
  ${mergesXml}
  <pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;

    newEntries.push({
      fileName: `xl/worksheets/sheet${sheetDef.id}.xml`,
      uncompressedData: Buffer.from(sheetXml, 'utf8')
    });
  });

  // Ghi SharedStrings
  const sstXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${stringList.length}" uniqueCount="${stringList.length}">
  ${stringList.map(s => `<si><t>${String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</t></si>`).join('\n')}
</sst>`;
  newEntries.push({ fileName: 'xl/sharedStrings.xml', uncompressedData: Buffer.from(sstXml, 'utf8') });

  const finalZip = buildZip(newEntries);

  const outputPath1 = 'D:\\Taskmanager\\2026.10.11 - BAO CAO CONG VIEC CHUAN HOA VP CAN THO.xlsx';
  const outputPath2 = 'H:\\My Drive\\task-manager-app\\2026.10.11 - BAO CAO CONG VIEC CHUAN HOA VP CAN THO.xlsx';

  fs.writeFileSync(outputPath1, finalZip);
  fs.writeFileSync(outputPath2, finalZip);

  console.log('SUCCESSFULLY GENERATED MULTI-SHEET WORKBOOK!');
  console.log('File size:', finalZip.length);
  console.log('Sheets created:', sheetsDef.length);
}

generateCompleteWorkbook();
