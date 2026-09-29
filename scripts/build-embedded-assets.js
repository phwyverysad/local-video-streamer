const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const outputFile = path.join(__dirname, '..', 'server', 'embedded-assets.js');

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    default: return 'application/octet-stream';
  }
}

const assets = {};

function scan(dir, baseRoute = '') {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const route = (baseRoute + '/' + item.name).replace(/\\/g, '/');
    if (item.isDirectory()) {
      scan(fullPath, route);
    } else {
      const content = fs.readFileSync(fullPath, 'utf8');
      assets[route] = {
        type: getMimeType(fullPath),
        content
      };
    }
  }
}

if (fs.existsSync(publicDir)) {
  scan(publicDir);
}

const code = `// Auto-generated embedded assets for standalone executable
module.exports = ${JSON.stringify(assets, null, 2)};
`;

fs.writeFileSync(outputFile, code, 'utf8');
console.log(`Embedded ${Object.keys(assets).length} static assets into ${outputFile}`);
