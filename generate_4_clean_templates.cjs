const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

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

// Hàm trích xuất 1 sheet từ file nhiều sheet thành 1 workbook riêng biệt
function extractSingleSheetWorkbook(sourceFile, targetSheetName, employeeName) {
  const buf = fs.readFileSync(sourceFile);
  const entries = parseZip(buf);

  const wbEntry = entries.find(e => e.fileName === 'xl/workbook.xml');
  const wbRelsEntry = entries.find(e => e.fileName === 'xl/_rels/workbook.xml.rels');
  const wbXml = wbEntry.uncompressedData.toString('utf8');
  const wbRelsXml = wbRelsEntry.uncompressedData.toString('utf8');

  // Tìm sheetId và r:id của targetSheetName
  // <sheet name="MAI" sheetId="2" r:id="rId2"/>
  const sheetRegex = new RegExp('<sheet[^>]*name="' + targetSheetName + '"[^>]*sheetId="(\\d+)"[^>]*r:id="([^"]+)"', 'i');
  let match = sheetRegex.exec(wbXml);
  if (!match) {
    // Có thể thứ tự attribute khác
    const sheetRegex2 = new RegExp('<sheet[^>]*name="' + targetSheetName + '"[^>]*r:id="([^"]+)"[^>]*sheetId="(\\d+)"', 'i');
    match = sheetRegex2.exec(wbXml);
  }
  if (!match) {
    console.error('Sheet not found:', targetSheetName);
    return null;
  }
  const rId = match[1].startsWith('rId') ? match[1] : match[2];

  // Tìm target file trong rels
  const relRegex = new RegExp('<Relationship[^>]*Id="' + rId + '"[^>]*Target="([^"]+)"', 'i');
  const relMatch = relRegex.exec(wbRelsXml);
  const sheetRelPath = relMatch ? relMatch[1] : 'worksheets/sheet1.xml';
  const targetSheetEntryName = 'xl/' + sheetRelPath.replace(/\\/g, '/');

  console.log('Target sheet entry:', targetSheetEntryName);

  // Tạo entries mới cho single sheet
  const newEntries = [];

  // Content_Types
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
  newEntries.push({ fileName: '[Content_Types].xml', uncompressedData: Buffer.from(contentTypesXml, 'utf8') });

  // _rels/.rels
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
  newEntries.push({ fileName: '_rels/.rels', uncompressedData: Buffer.from(rootRels, 'utf8') });

  // xl/workbook.xml
  const newWbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="14140"/></bookViews>
  <sheets>
    <sheet name="${targetSheetName}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
  newEntries.push({ fileName: 'xl/workbook.xml', uncompressedData: Buffer.from(newWbXml, 'utf8') });

  // xl/_rels/workbook.xml.rels
  const newWbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;
  newEntries.push({ fileName: 'xl/_rels/workbook.xml.rels', uncompressedData: Buffer.from(newWbRelsXml, 'utf8') });

  // Styles, Theme, SharedStrings, DocProps
  ['xl/theme/theme1.xml', 'xl/styles.xml', 'xl/sharedStrings.xml', 'docProps/core.xml', 'docProps/app.xml'].forEach(fn => {
    const orig = entries.find(e => e.fileName === fn);
    if (orig && orig.uncompressedData) {
      newEntries.push({ fileName: fn, uncompressedData: orig.uncompressedData });
    }
  });

  // Sheet XML
  const origSheet = entries.find(e => e.fileName === targetSheetEntryName);
  let sheetXml = origSheet.uncompressedData.toString('utf8');

  // Đổi tên nhân sự nếu cần trong sheet hoặc giữ nguyên
  newEntries.push({ fileName: 'xl/worksheets/sheet1.xml', uncompressedData: Buffer.from(sheetXml, 'utf8') });

  return buildZip(newEntries);
}

function run() {
  const file1 = 'D:\\Taskmanager\\2026.10.11 - BAO CAO CONG VIEC VP CAN THO.xlsx';
  const file2 = 'D:\\Taskmanager\\2026.10.11 - BC NHẬP LIỆU MISA VP CẦN THƠ.xlsx';

  console.log('Generating 4 distinct standard reports...');

  // 1. Mẫu Kế toán dịch vụ & Thuế (Lấy từ sheet MAI)
  const buf1 = extractSingleSheetWorkbook(file1, 'MAI', 'TÔ THỊ NGỌC MAI');
  if (buf1) {
    fs.writeFileSync('D:\\Taskmanager\\MAU_1_BAO_CAO_CONG_VIEC_KE_TOAN.xlsx', buf1);
    fs.writeFileSync('H:\\My Drive\\task-manager-app\\MAU_1_BAO_CAO_CONG_VIEC_KE_TOAN.xlsx', buf1);
    console.log('1. Generated: MAU_1_BAO_CAO_CONG_VIEC_KE_TOAN.xlsx');
  }

  // 2. Mẫu Bảo hiểm xã hội (Lấy từ sheet TRINH)
  const buf2 = extractSingleSheetWorkbook(file1, 'TRINH', 'LÊ THỊ TÚ TRINH');
  if (buf2) {
    fs.writeFileSync('D:\\Taskmanager\\MAU_2_BAO_CAO_CONG_VIEC_BHXH.xlsx', buf2);
    fs.writeFileSync('H:\\My Drive\\task-manager-app\\MAU_2_BAO_CAO_CONG_VIEC_BHXH.xlsx', buf2);
    console.log('2. Generated: MAU_2_BAO_CAO_CONG_VIEC_BHXH.xlsx');
  }

  // 3. Mẫu Giấy phép kinh doanh / Pháp lý (Lấy từ sheet PHÚC BAO CAO ĐKGP)
  const buf3 = extractSingleSheetWorkbook(file1, 'PHÚC BAO CAO ĐKGP', 'BÙI VĨNH PHÚC');
  if (buf3) {
    fs.writeFileSync('D:\\Taskmanager\\MAU_3_BAO_CAO_CONG_VIEC_GPKD.xlsx', buf3);
    fs.writeFileSync('H:\\My Drive\\task-manager-app\\MAU_3_BAO_CAO_CONG_VIEC_GPKD.xlsx', buf3);
    console.log('3. Generated: MAU_3_BAO_CAO_CONG_VIEC_GPKD.xlsx');
  }

  // 4. Mẫu Báo cáo nhập liệu MISA (Lấy từ sheet NHUNG của file 2)
  const buf4 = extractSingleSheetWorkbook(file2, 'NHUNG', 'LÊ THỊ CẨM NHUNG');
  if (buf4) {
    fs.writeFileSync('D:\\Taskmanager\\MAU_4_BAO_CAO_NHAP_LIEU_MISA.xlsx', buf4);
    fs.writeFileSync('H:\\My Drive\\task-manager-app\\MAU_4_BAO_CAO_NHAP_LIEU_MISA.xlsx', buf4);
    console.log('4. Generated: MAU_4_BAO_CAO_NHAP_LIEU_MISA.xlsx');
  }

  console.log('ALL 4 SAMPLES EXPORTED SUCCESSFULLY!');
}

run();
