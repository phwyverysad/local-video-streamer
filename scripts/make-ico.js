const fs = require('fs');
const path = require('path');

function pngToIco(pngBuffer) {
  // Simple valid ICO header and single PNG directory entry (supported on Windows Vista+)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Image type (1 = ICO)
  header.writeUInt16LE(1, 4); // Number of images

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // Width 256 -> 0
  entry.writeUInt8(0, 1); // Height 256 -> 0
  entry.writeUInt8(0, 2); // Color palette (0 = no palette)
  entry.writeUInt8(0, 3); // Reserved
  entry.writeUInt16LE(1, 4); // Color planes
  entry.writeUInt16LE(32, 6); // Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // Image size in bytes
  entry.writeUInt32LE(22, 12); // Image offset (6 header + 16 entry = 22)

  return Buffer.concat([header, entry, pngBuffer]);
}

const pngPath = path.join(__dirname, '../public/icon.png');
const icoPath = path.join(__dirname, '../public/icon.ico');

if (fs.existsSync(pngPath)) {
  const pngData = fs.readFileSync(pngPath);
  const icoData = pngToIco(pngData);
  fs.writeFileSync(icoPath, icoData);
  console.log('Successfully created public/icon.ico from public/icon.png');
}
