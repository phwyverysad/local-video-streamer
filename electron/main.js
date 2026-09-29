const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const { createApp } = require('../server/app');
const { defaultTunnelManager } = require('../server/tunnel');

let mainWindow = null;
let serverInstance = null;
const PORT = process.env.PORT || 3000;

app.setName('Video Streamer');

async function startServer() {
  const expressApp = createApp();
  
  return new Promise((resolve, reject) => {
    const server = expressApp.listen(PORT, '0.0.0.0', async () => {
      serverInstance = server;
      console.log(`[Video Streamer] Running on http://localhost:${PORT}`);

      // Start Cloudflare Tunnel in the background
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register Native IPC Handlers
ipcMain.handle('dialog:openVideoFile', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'เลือกไฟล์วิดีโอที่ต้องการแชร์',
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

// App Lifecycle
app.whenReady().then(async () => {
  try {
    await startServer();
  } catch (err) {
    console.error('[Video Streamer] Failed to start server:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (defaultTunnelManager) {
    defaultTunnelManager.stop();
  }
  if (serverInstance) {
    serverInstance.close();
  }
});
