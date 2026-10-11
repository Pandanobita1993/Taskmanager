const fs = require('fs');
const zlib = require('zlib');

function parseZip(buffer) {
  let offset = 0;
  const entries = [];
  while (offset < buffer.length - 4) {
    const sig = buffer.readUInt32LE(offset);
    if (sig === 0x04034b50) {
      const compMethod = buffer.readUInt16LE(offset + 8);
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
      entries.push({ fileName, uncompressedData });
      offset = dataEnd;
    } else {
      offset++;
    }
  }
  return entries;
}

const entries = parseZip(fs.readFileSync('D:\\Taskmanager\\MAU_BAO_CAO_TIEN_DO_CONG_VIEC.xlsx'));
const sheet1 = entries.find(e => e.fileName === 'xl/worksheets/sheet1.xml').uncompressedData.toString('utf8');
const styles = entries.find(e => e.fileName === 'xl/styles.xml').uncompressedData.toString('utf8');

const p1 = sheet1.indexOf('<row r="10"');
const p2 = sheet1.indexOf('</row>', p1) + 6;
console.log('Row 10:', sheet1.substring(p1, p2));

const p3 = sheet1.indexOf('<row r="11"');
const p4 = sheet1.indexOf('</row>', p3) + 6;
console.log('Row 11:', sheet1.substring(p3, p4));

console.log('Styles length:', styles.length);
fs.writeFileSync('temp_styles.xml', styles);
console.log('Saved temp_styles.xml');
