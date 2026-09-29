const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const exePath = path.join(distDir, 'LocalVideoStreamer.exe');
const bundlePath = path.join(distDir, 'bundle.cjs');
const blobPath = path.join(distDir, 'sea-prep.blob');
const configPath = path.join(distDir, 'sea-config.json');

console.log('========================================================');
console.log('  Building Standalone Windows Executable (LocalVideoStreamer.exe)');
console.log('========================================================\n');

// 1. Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 2. Build embedded static assets
console.log('[1/5] Bundling static assets into memory...');
require('./build-embedded-assets.js');

// 3. Bundle server code with esbuild
console.log('\n[2/5] Bundling server code with esbuild...');
const esbuildCmd = `npx esbuild server/index.js --bundle --platform=node --target=node20 --format=cjs --outfile="${bundlePath}" --external:cloudflared`;
console.log('Running:', esbuildCmd);
execSync(esbuildCmd, { cwd: rootDir, stdio: 'inherit' });

// 4. Create SEA configuration
console.log('\n[3/5] Generating Node.js Single Executable Application (SEA) blob...');
const seaConfig = {
  main: bundlePath,
  output: blobPath,
  disableExperimentalSEAWarning: true
};
fs.writeFileSync(configPath, JSON.stringify(seaConfig, null, 2), 'utf8');

execSync(`node --experimental-sea-config "${configPath}"`, { cwd: rootDir, stdio: 'inherit' });

// 5. Copy node binary to target exe
console.log('\n[4/5] Creating executable base binary from Node.js runtime...');
const nodeBinaryPath = process.execPath;
console.log('Source Node binary:', nodeBinaryPath);
fs.copyFileSync(nodeBinaryPath, exePath);

// 6. Inject SEA blob using postject
console.log('\n[5/5] Injecting SEA blob into executable with postject...');
const postjectCmd = `npx postject "${exePath}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;
console.log('Running:', postjectCmd);
execSync(postjectCmd, { cwd: rootDir, stdio: 'inherit' });

// Copy cloudflared.exe to dist directory for 100% portable out-of-the-box tunnel support
const cfSrc = path.join(rootDir, 'node_modules', 'cloudflared', 'bin', 'cloudflared.exe');
const cfDest = path.join(distDir, 'cloudflared.exe');
if (fs.existsSync(cfSrc)) {
  fs.copyFileSync(cfSrc, cfDest);
  console.log('[+] Included portable Cloudflare Tunnel binary (cloudflared.exe) in dist/');
}

// Copy public assets folder to dist as well (optional external assets)
const publicSrc = path.join(rootDir, 'public');
const publicDest = path.join(distDir, 'public');
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true });
}

const stats = fs.statSync(exePath);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

console.log('\n========================================================');
console.log(`SUCCESS! Executable created: dist/LocalVideoStreamer.exe (${sizeMb} MB)`);
console.log('Portable standalone package ready in dist/');
console.log('========================================================\n');

