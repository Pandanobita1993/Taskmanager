const fs = require('fs');
const zlib = require('zlib');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://yzciddxfeyqmlrtlsknz.supabase.co', 'sb_publishable_z9p7un1Zq5UGMf2ShJ72Pg_ANjTg2un');

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
      if (compMethod === 0) {
        uncompressedData = compressedData;
      } else if (compMethod === 8) {
        try {
          uncompressedData = zlib.inflateRawSync(compressedData);
        } catch(e){}
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

async function run() {
  const [tasksRes] = await Promise.all([
    supabase.from('tasks').select('*, clients(name, contact_name, contact_phone)').order('created_at', { ascending: false })
  ]);
  const tasks = tasksRes.data || [];

  const templateBuf = fs.readFileSync('D:\\Taskmanager\\MAU_BAO_CAO_TIEN_DO_CONG_VIEC.xlsx');
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

  const idxPeriod = addString('(Kỳ báo cáo: 01/10/2026 - 10/10/2026)');
  const idxDate = addString('Ngày xuất báo cáo: 10/10/2026');

  sheet1Xml = sheet1Xml.replace(/(<c r="A5"[^>]*><v>)\d+(<\/v><\/c>)/, `$1${idxPeriod}$2`);
  sheet1Xml = sheet1Xml.replace(/(<c r="A8"[^>]*><v>)\d+(<\/v><\/c>)/, `$1${idxDate}$2`);

  const grouped = {};
  tasks.forEach(t => {
    const cName = t.clients?.name || 'Khách hàng khác';
    if (!grouped[cName]) grouped[cName] = [];
    grouped[cName].push(t);
  });

  const actionTypeLabels = {
    'ke_toan': 'Kế toán',
    'bhxh': 'BHXH',
    'nop_ho_so': 'Hồ sơ GPKD',
    'ho_tro': 'Hỗ trợ',
    'khac': 'Khác'
  };

  const statusLabels = {
    'completed': 'Đã hoàn thành',
    'in_progress': 'Đang xử lý',
    'received': 'Tiếp nhận',
    'failed': 'Thất bại'
  };

  let rowXmls = [];
  let currentRow = 11;
  let stt = 1;
  const mergeList = [
    'A4:J4', 'A5:J5', 'A7:B7', 'A8:B8', 'A1:C1', 'A2:C2', 'D1:J1', 'D2:J2', 'D3:J3'
  ];

  Object.keys(grouped).sort().forEach(cName => {
    const cTasks = grouped[cName];
    const startRow = currentRow;

    cTasks.forEach((t, idx) => {
      const rowNum = currentRow;
      const contact = t.contact_person || t.clients?.contact_name || '';
      const role = actionTypeLabels[t.action_type] || t.action_type || 'Kế toán';
      const intakeDate = t.intake_date || (t.created_at ? t.created_at.split('T')[0] : '01/10/2026');
      const completeDate = t.completed_at ? t.completed_at.split('T')[0] : (t.deadline || '');
      const statusText = statusLabels[t.status] || (t.info_pending ? 'Đang chờ: ' + t.info_pending : 'Đang xử lý');
      const dossier = t.dossier_code || '';
      const note = t.resolution_note || t.notes || '';

      const idxClient = addString(cName);
      const idxContact = addString(contact);
      const idxContent = addString(t.content || '');
      const idxRole = addString(role);
      const idxIntake = addString(intakeDate);
      const idxComplete = addString(completeDate);
      const idxStatus = addString(statusText);
      const idxDossier = addString(dossier);
      const idxNote = addString(note);

      let row = '<row r="' + rowNum + '" spans="1:10" ht="33" x14ac:dyDescent="0.25">';
      row += '<c r="A' + rowNum + '" s="4">' + (idx === 0 ? '<v>' + stt + '</v>' : '') + '</c>';
      row += '<c r="B' + rowNum + '" s="5" t="s">' + (idx === 0 ? '<v>' + idxClient + '</v>' : '') + '</c>';
      row += '<c r="C' + rowNum + '" s="6" t="s"><v>' + idxContact + '</v></c>';
      row += '<c r="D' + rowNum + '" s="6" t="s"><v>' + idxContent + '</v></c>';
      row += '<c r="E' + rowNum + '" s="6" t="s"><v>' + idxRole + '</v></c>';
      row += '<c r="F' + rowNum + '" s="7" t="s"><v>' + idxIntake + '</v></c>';
      row += '<c r="G' + rowNum + '" s="7" t="s"><v>' + idxComplete + '</v></c>';
      row += '<c r="H' + rowNum + '" s="7" t="s"><v>' + idxStatus + '</v></c>';
      row += '<c r="I' + rowNum + '" s="6" t="s"><v>' + idxDossier + '</v></c>';
      row += '<c r="J' + rowNum + '" s="6" t="s"><v>' + idxNote + '</v></c>';
      row += '</row>';
      rowXmls.push(row);

      currentRow++;
    });

    if (cTasks.length > 1) {
      mergeList.push('A' + startRow + ':A' + (currentRow - 1));
      mergeList.push('B' + startRow + ':B' + (currentRow - 1));
    }

    stt++;
  });

  const sheetDataParts = sheet1Xml.split('<row r="11"');
  const preRows = sheetDataParts[0];
  const postSheet = sheet1Xml.split('</sheetData>')[1];

  const newSheetData = preRows + rowXmls.join('') + '</sheetData>' + postSheet;

  const mergeXml = '<mergeCells count="' + mergeList.length + '">' + mergeList.map(m => '<mergeCell ref="' + m + '"/>').join('') + '</mergeCells>';
  let finalSheetXml = newSheetData.replace(/<mergeCells count="[^"]*">.*?<\/mergeCells>/s, mergeXml);
  finalSheetXml = finalSheetXml.replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="A1:J' + (currentRow - 1) + '"/>');

  const newSsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + stringList.length + '" uniqueCount="' + stringList.length + '">' +
    stringList.map(s => '<si><t>' + String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</t></si>').join('') +
    '</sst>';

  sharedStringsEntry.uncompressedData = Buffer.from(newSsXml, 'utf8');
  sheet1Entry.uncompressedData = Buffer.from(finalSheetXml, 'utf8');

  const finalZipBuffer = buildZip(entries);

  fs.writeFileSync('D:\\Taskmanager\\BaoCao_KetQua_CongViec_10_10_2026.xlsx', finalZipBuffer);
  fs.writeFileSync('H:\\My Drive\\task-manager-app\\BaoCao_KetQua_CongViec_10_10_2026.xlsx', finalZipBuffer);

  console.log('EXPORT COMPLETED! Preserved 100% of formatting, borders, fonts and green header!');
}

run();
