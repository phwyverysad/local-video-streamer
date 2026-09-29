const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('==============================================');
console.log('Building Video Streamer Executables & Packages');
console.log('==============================================\n');

// 1. Generate ICO from PNG
console.log('[1/4] Generating Windows Icon...');
execSync('node scripts/make-ico.js', { stdio: 'inherit' });

// 2. Build embedded assets fallback
console.log('\n[2/4] Syncing embedded assets...');
execSync('node scripts/build-embedded-assets.js', { stdio: 'inherit' });

// 3. Compile C# Web Installer / Bootstrapper (26 KB)
console.log('\n[3/4] Compiling Web Installer (Video-Streamer-Installer.exe)...');
const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

const cscCmd = `"${cscPath}" /target:winexe /win32icon:public\\icon.ico /out:dist\\Video-Streamer-Installer.exe /r:System.IO.Compression.FileSystem.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll scripts\\WebInstaller.cs`;
execSync(cscCmd, { stdio: 'inherit' });
console.log('Built dist/Video-Streamer-Installer.exe (Lightweight Web Installer)');

// 4. Build Portable Standalone Executable with Electron Builder
console.log('\n[4/4] Building Electron Portable Executable & Zip...');
execSync('npx electron-builder --win portable zip', { stdio: 'inherit' });

const defaultZip = path.join(distDir, 'Video Streamer-1.0.0-win.zip');
const targetZip = path.join(distDir, 'Video-Streamer-win.zip');
if (fs.existsSync(defaultZip)) {
  fs.copyFileSync(defaultZip, targetZip);
}

console.log('\n==============================================');
console.log('Build Completed Successfully!');
console.log('Outputs in dist/:');
console.log('1. dist/Video-Streamer-Installer.exe (26 KB Web Installer / One-Click Launcher)');
console.log('2. dist/Video-Streamer-Portable.exe (Standalone Portable Executable)');
console.log('3. dist/Video-Streamer-win.zip (GitHub Release Archive)');
console.log('==============================================\n');
