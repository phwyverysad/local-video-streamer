const { app, BrowserWindow, dialog, shell, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { createApp } = require('../server/app');
const { defaultTunnelManager } = require('../server/tunnel');

let mainWindow = null;
let tray = null;
let serverInstance = null;
let isQuitting = false;
let hasShownTrayBalloon = false;
const PORT = process.env.PORT || 3000;

app.setName('Video Streamer');

// Prevent Chromium disk cache locking and GPU cache errors
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-program-cache');
app.commandLine.appendSwitch('disable-features', 'GpuShaderDiskCache');
app.commandLine.appendSwitch('log-level', '3');

// Load & Save Desktop App Settings
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

function loadAppSettings() {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const raw = fs.readFileSync(settingsFilePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[Settings] Failed to load:', e);
  }
  return {
    minimizeToTray: true,
    autoStart: false,
    autoCopy: true,
    language: 'th'
  };
}

let appSettings = loadAppSettings();

function saveAppSettings(newSettings) {
  appSettings = { ...appSettings, ...newSettings };
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(appSettings, null, 2), 'utf8');
    
    // Apply auto-start setting
    if (typeof appSettings.autoStart === 'boolean') {
      app.setLoginItemSettings({
        openAtLogin: appSettings.autoStart,
        path: process.execPath
      });
    }

    updateTrayMenu();
  } catch (e) {
    console.warn('[Settings] Failed to save:', e);
  }
  return appSettings;
}

async function startServer() {
  const expressApp = createApp();
  
  return new Promise((resolve, reject) => {
    const server = expressApp.listen(PORT, '0.0.0.0', async () => {
      serverInstance = server;
      console.log(`[Video Streamer] Running on http://localhost:${PORT}`);

      try {
        const publicUrl = await defaultTunnelManager.start(PORT);
        console.log(`[Video Streamer Tunnel] Connected: ${publicUrl}`);
      } catch (err) {
        console.warn(`[Video Streamer Tunnel] Warning: ${err.message}`);
      }

      resolve(server);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Video Streamer] Port ${PORT} already in use, attaching to existing instance`);
        resolve(null);
      } else {
        reject(err);
      }
    });
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  
  tray = new Tray(trayIcon);
  tray.setToolTip('Video Streamer - Running in background');

  updateTrayMenu();

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;
  const isThai = appSettings.language !== 'en';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isThai ? 'เปิดหน้าต่างหลัก' : 'Open Video Streamer',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: isThai ? 'เปิดดูบนเบราว์เซอร์' : 'Open in Web Browser',
      click: () => {
        shell.openExternal(`http://localhost:${PORT}`);
      }
    },
    { type: 'separator' },
    {
      label: isThai ? 'ปิดโปรแกรม' : 'Quit Video Streamer',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 880,
    height: 780,
    minWidth: 620,
    minHeight: 520,
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    title: 'Video Streamer',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Open external links safely in system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle minimize to tray on window close
  mainWindow.on('close', (event) => {
    if (!isQuitting && appSettings.minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();

      if (!hasShownTrayBalloon && tray) {
        hasShownTrayBalloon = true;
        const isThai = appSettings.language !== 'en';
        tray.displayBalloon({
          title: 'Video Streamer',
          content: isThai 
            ? 'โปรแกรมยังคงทำงานในพื้นหลัง และสตรีมวิดีโออย่างต่อเนื่อง'
            : 'Running in background. Video streams remain active.'
        });
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register Native IPC Handlers
ipcMain.handle('dialog:openVideoFile', async () => {
  if (!mainWindow) return null;
  const isThai = appSettings.language !== 'en';
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: isThai ? 'เลือกไฟล์วิดีโอที่ต้องการแชร์' : 'Select Video File to Stream',
    properties: ['openFile'],
    filters: [
      { name: 'วิดีโอ (Video Files)', extensions: ['mp4', 'mkv', 'mov', 'webm', 'avi', 'flv', 'wmv', 'm4v'] },
      { name: 'ไฟล์ทั้งหมด', extensions: ['*'] }
    ]
  });
  if (canceled || filePaths.length === 0) return null;
  return filePaths[0];
});

ipcMain.handle('shell:openExternal', async (event, url) => {
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    await shell.openExternal(url);
  }
});

ipcMain.handle('settings:get', async () => {
  return appSettings;
});

ipcMain.handle('settings:save', async (event, newSettings) => {
  return saveAppSettings(newSettings);
});

// App Lifecycle
app.whenReady().then(async () => {
  try {
    await startServer();
  } catch (err) {
    console.error('[Video Streamer] Failed to start server:', err);
  }

  createTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !appSettings.minimizeToTray) {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (defaultTunnelManager) {
    defaultTunnelManager.stop();
  }
  if (serverInstance) {
    serverInstance.close();
  }
});
