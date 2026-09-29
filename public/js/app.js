// Single Unified Application Logic: Local Video Streamer
let currentShares = [];
let tunnelInfo = { status: 'offline', publicUrl: null };
let activeModalVideoId = null;
let currentPlayingId = null;
let currentLang = 'th';

let userSettings = {
  minimizeToTray: true,
  autoStart: false,
  autoCopy: true,
  language: 'th'
};

// Multi-Language Dictionary (Thai & English)
const I18N = {
  th: {
    appTitle: 'Video Streamer',
    headerShare: 'แชร์วิดีโอ',
    statusOnline: 'พร้อมใช้งาน',
    statusOffline: 'ออฟไลน์',
    dropzonePrompt: 'วางไฟล์วิดีโอ หรือ คลิกเพื่อเลือก',
    dropzoneFormats: 'รองรับ MP4 • MKV • MOV • WebM',
    loading: 'กำลังโหลด...',
    dividerPath: 'หรือใส่พาธไฟล์ในเครื่อง',
    btnShare: 'แชร์',
    sectionAllVideos: 'วิดีโอทั้งหมด',
    filesUnit: 'ไฟล์',
    emptyState: 'ยังไม่มีวิดีโอที่แชร์',
    btnPlay: 'เล่น',
    btnCopy: 'คัดลอก',
    btnCopied: 'คัดลอกแล้ว',
    btnShorten: 'ย่อลิงก์',
    btnShortened: 'ย่อแล้ว',
    btnOpen: 'เปิด',
    btnDelete: 'ลบ',
    btnEdit: 'แก้ไขชื่อตัวอย่าง',
    btnSave: 'บันทึก',
    btnCancel: 'ยกเลิก',
    labelCustomTitle: 'ชื่อตัวอย่างลิงก์ (แสดงบน Discord / โซเชียล)',
    hintOptional: '(ไม่บังคับ)',
    placeholderCustomTitle: 'เช่น สอนใช้งาน EP.1, ไฮไลท์การเล่น (เว้นว่าง = ใช้ชื่อไฟล์)',
    editModalTitle: 'แก้ไขชื่อตัวอย่างลิงก์',
    labelVideoTitle: 'ชื่อวิดีโอ (แสดงบน Discord, Facebook, Twitter, LINE)',
    editTitleNote: 'ชื่อนี้จะปรากฏที่หัวข้อลิงก์และหน้าต่างตัวอย่างบน Discord ทันที',
    labelOriginalFile: 'ไฟล์ต้นฉบับในเครื่อง',
    toastTitleUpdated: 'อัปเดตชื่อตัวอย่างลิงก์เรียบร้อยแล้ว',
    viewCount: 'ดู {n} ครั้ง',
    toastCopied: 'คัดลอกลิงก์แล้ว',
    toastShortened: 'ย่อและคัดลอกลิงก์แล้ว',
    toastUploaded: 'อัปโหลดสำเร็จ',
    toastShared: 'แชร์วิดีโอแล้ว',
    toastDeleted: 'ลบวิดีโอแล้ว',
    deleteConfirm: 'ต้องการลบวิดีโอนี้หรือไม่?',
    settingsTitle: 'การตั้งค่า',
    settingLanguage: 'ภาษา / Language',
    settingLanguageDesc: 'เลือกภาษาที่ต้องการใช้งานในโปรแกรม',
    settingTray: 'ทำงานในถาดระบบ (System Tray)',
    settingTrayDesc: 'เมื่อปิดหน้าต่าง ให้ย่อลงถาดงานด้านล่าง เพื่อให้วิดีโอยังคงสตรีมได้ต่อเนื่อง',
    settingAutoStart: 'เปิดโปรแกรมอัตโนมัติ',
    settingAutoStartDesc: 'เริ่มทำงานอัตโนมัติเมื่อเปิดเครื่องคอมพิวเตอร์',
    settingAutoCopy: 'คัดลอกลิงก์อัตโนมัติ',
    settingAutoCopyDesc: 'คัดลอกลิงก์สตรีมลงคลิปบอร์ดทันทีหลังแชร์วิดีโอ',
    serverStatus: 'เซิร์ฟเวอร์: ออนไลน์',
    serverPort: 'พอร์ต: 3000',
    btnDone: 'เสร็จสิ้น',
    btnClose: 'ปิด',
    btnOpenTab: 'เปิดแท็บใหม่',
    modalPlayTitle: 'เล่นตัวอย่าง',
    videoNotFoundTitle: 'ไม่พบวิดีโอ',
    videoNotFoundDesc: 'ไฟล์ถูกยกเลิกการแชร์หรือลบแล้ว'
  },
  en: {
    appTitle: 'Video Streamer',
    headerShare: 'Share Video',
    statusOnline: 'Ready',
    statusOffline: 'Offline',
    dropzonePrompt: 'Drop video file here or click to browse',
    dropzoneFormats: 'Supports MP4 • MKV • MOV • WebM',
    loading: 'Loading...',
    dividerPath: 'Or enter local file path',
    btnShare: 'Share',
    sectionAllVideos: 'All Videos',
    filesUnit: 'files',
    emptyState: 'No shared videos yet',
    btnPlay: 'Play',
    btnCopy: 'Copy',
    btnCopied: 'Copied',
    btnShorten: 'Shorten',
    btnShortened: 'Shortened',
    btnOpen: 'Open',
    btnDelete: 'Delete',
    btnEdit: 'Edit Preview Title',
    btnSave: 'Save',
    btnCancel: 'Cancel',
    labelCustomTitle: 'Link Preview Title (Discord / Social)',
    hintOptional: '(Optional)',
    placeholderCustomTitle: 'e.g. Tutorial EP.1, Gameplay Highlight (Empty = use filename)',
    editModalTitle: 'Edit Link Preview Title',
    labelVideoTitle: 'Video Title (Shown on Discord / Social Media)',
    editTitleNote: 'This title will be displayed directly in Discord embeds & link preview cards',
    labelOriginalFile: 'Original File Name',
    toastTitleUpdated: 'Link preview title updated successfully',
    viewCount: '{n} views',
    toastCopied: 'Link copied to clipboard',
    toastShortened: 'Link shortened and copied',
    toastUploaded: 'Uploaded successfully',
    toastShared: 'Video shared successfully',
    toastDeleted: 'Video removed',
    deleteConfirm: 'Are you sure you want to delete this video stream?',
    settingsTitle: 'Settings',
    settingLanguage: 'Language / ภาษา',
    settingLanguageDesc: 'Choose your preferred application language',
    settingTray: 'Run in System Tray',
    settingTrayDesc: 'Keep running in background when closed to maintain active video streams',
    settingAutoStart: 'Start on Boot',
    settingAutoStartDesc: 'Automatically start Video Streamer on Windows login',
    settingAutoCopy: 'Auto-copy Link',
    settingAutoCopyDesc: 'Automatically copy stream link to clipboard upon sharing',
    serverStatus: 'Server: Online',
    serverPort: 'Port: 3000',
    btnDone: 'Done',
    btnClose: 'Close',
    btnOpenTab: 'Open New Tab',
    modalPlayTitle: 'Video Preview',
    videoNotFoundTitle: 'Video Not Found',
    videoNotFoundDesc: 'This video has been removed or access was revoked'
  }
};

function t(key, vars = {}) {
  const dict = I18N[currentLang] || I18N.th;
  let text = dict[key] || I18N.th[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function applyLanguage(lang) {
  currentLang = (lang === 'en') ? 'en' : 'th';
  document.documentElement.lang = currentLang;
  
  // Update all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });

  // Update all data-i18n-placeholder elements
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.placeholder = t(key);
    }
  });

  // Update segmented control buttons in settings
  const thBtn = document.getElementById('lang-th-btn');
  const enBtn = document.getElementById('lang-en-btn');
  if (thBtn && enBtn) {
    if (currentLang === 'en') {
      thBtn.classList.remove('active');
      enBtn.classList.add('active');
    } else {
      thBtn.classList.add('active');
      enBtn.classList.remove('active');
    }
  }

  // Update shares list texts
  renderSharesList();
}

// SVG Icons Dictionary (Zero emojis)
const SVG_ICONS = {
  play: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
  copy: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
  scissors: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`,
  external: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
  trash: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
  edit: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
  check: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  spinner: `<svg class="svg-icon animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`,
  folder: `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
  eye: `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
  film: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  const toastIcon = document.getElementById('toast-icon');

  toastText.textContent = message;
  toast.classList.remove('toast-error');

  if (type === 'error') {
    toast.classList.add('toast-error');
    toastIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  } else if (type === 'success') {
    toastIcon.innerHTML = SVG_ICONS.check;
  } else {
    toastIcon.innerHTML = SVG_ICONS.copy;
  }

  toast.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.remove('toast-error');
  }, 3200);
}

// ==========================================
// ROUTING & VIEW CONTROLLER
// ==========================================
function parseCurrentRoute() {
  const pathname = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.has('v')) {
    return { view: 'player', videoId: urlParams.get('v') };
  }

  const vMatch = pathname.match(/^\/(v|player)\/([^/]+)/);
  if (vMatch) {
    return { view: 'player', videoId: vMatch[2] };
  }

  return { view: 'dashboard', videoId: null };
}

function handleRoute() {
  const { view, videoId } = parseCurrentRoute();

  if (view === 'player' && videoId) {
    renderPlayerView(videoId);
  } else {
    renderDashboardView();
  }
}

function navigateToDashboard() {
  if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
    window.history.pushState({}, '', '/');
  }
  handleRoute();
}

function navigateToPlayer(videoId, pushHistory = true) {
  if (pushHistory) {
    window.history.pushState({}, '', `/v/${videoId}`);
  }
  renderPlayerView(videoId);
}

window.addEventListener('popstate', handleRoute);

// ==========================================
// DASHBOARD VIEW
// ==========================================
async function renderDashboardView() {
  document.body.classList.remove('player-mode');
  document.title = t('appTitle');
  document.getElementById('view-dashboard').style.display = 'block';
  document.getElementById('view-player').style.display = 'none';

  const settingsBtn = document.getElementById('btn-open-settings');
  if (settingsBtn) settingsBtn.style.display = 'flex';

  // Stop video in dedicated player view if any was playing
  const playerVid = document.getElementById('video-element');
  if (playerVid) {
    playerVid.pause();
    playerVid.removeAttribute('src');
    playerVid.load();
  }

  await checkStatus();
  await loadShares();
}

// Check server status
async function checkStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) return;
    const data = await res.json();
    tunnelInfo = data.tunnel || {};
  } catch (err) {
    console.warn('Status check failed:', err);
  }
}

// Fetch active shares
async function loadShares() {
  try {
    const res = await fetch('/api/shares');
    if (!res.ok) return;
    const data = await res.json();
    currentShares = data.shares || [];
    renderSharesList();
  } catch (err) {
    console.error('Failed to load shares:', err);
  }
}

// Smart Multi-Frame Video Cover Extractor & Uploader
async function extractAndUploadThumbnail(shareId, source) {
  let tempVideo = null;
  let objectUrl = null;

  try {
    let videoSrc = '';
    if (source instanceof File || source instanceof Blob) {
      objectUrl = URL.createObjectURL(source);
      videoSrc = objectUrl;
    } else if (typeof source === 'string' && source.length > 0) {
      videoSrc = source;
    } else {
      videoSrc = `/api/stream/${shareId}`;
    }

    tempVideo = document.createElement('video');
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.preload = 'auto';
    tempVideo.style.position = 'fixed';
    tempVideo.style.left = '-9999px';
    tempVideo.style.top = '-9999px';
    tempVideo.style.width = '320px';
    tempVideo.style.height = '180px';
    tempVideo.style.opacity = '0';
    tempVideo.style.pointerEvents = 'none';
    document.body.appendChild(tempVideo);

    tempVideo.src = videoSrc;

    await new Promise((resolve, reject) => {
      let isDone = false;
      const onMeta = () => {
        if (!isDone) { isDone = true; resolve(); }
      };
      const onErr = (e) => {
        if (!isDone) { isDone = true; reject(e || new Error('Video load failed')); }
      };
      tempVideo.onloadedmetadata = onMeta;
      tempVideo.onerror = onErr;
      setTimeout(() => { if (!isDone) { isDone = true; resolve(); } }, 6000);
    });

    const duration = tempVideo.duration || 10;
    if (!tempVideo.videoWidth || !tempVideo.videoHeight) {
      try { await tempVideo.play(); tempVideo.pause(); } catch(e) {}
    }

    const candidates = [];
    if (duration > 1) {
      const rawPoints = [
        Math.min(1.5, duration * 0.1),
        Math.min(3.0, duration * 0.2),
        Math.min(6.0, duration * 0.35),
        Math.min(12.0, duration * 0.5),
        duration * 0.15,
        duration * 0.30,
        duration * 0.50,
        duration * 0.70
      ];
      for (const p of rawPoints) {
        if (p > 0.3 && p < duration && !candidates.some(c => Math.abs(c - p) < 0.8)) {
          candidates.push(p);
        }
      }
    }
    if (candidates.length === 0) candidates.push(0.5);

    const testCanvas = document.createElement('canvas');
    testCanvas.width = 160;
    testCanvas.height = 90;
    const testCtx = testCanvas.getContext('2d', { willReadFrequently: true });

    let bestFrame = null;
    let bestScore = -1;

    for (const seekTime of candidates) {
      await new Promise((resolve) => {
        let seekDone = false;
        const onSeek = () => {
          if (!seekDone) {
            seekDone = true;
            resolve();
          }
        };
        tempVideo.onseeked = onSeek;
        tempVideo.onerror = onSeek;
        try {
          tempVideo.currentTime = seekTime;
        } catch(e) {
          onSeek();
        }
        setTimeout(onSeek, 2000);
      });

      if ('requestVideoFrameCallback' in tempVideo) {
        await new Promise((res) => {
          tempVideo.requestVideoFrameCallback(() => res());
          setTimeout(res, 150);
        });
      }

      testCtx.drawImage(tempVideo, 0, 0, 160, 90);
      const imgData = testCtx.getImageData(0, 0, 160, 90);
      const data = imgData.data;

      let totalLum = 0;
      let nonZeroCount = 0;
      const pixelCount = 160 * 90;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLum += lum;
        if (lum > 8) nonZeroCount++;
      }

      const avgLum = totalLum / pixelCount;
      const nonZeroRatio = nonZeroCount / pixelCount;

      let variance = 0;
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        variance += Math.pow(lum - avgLum, 2);
      }
      const stdDev = Math.sqrt(variance / pixelCount);

      if (avgLum >= 12 && nonZeroRatio >= 0.20) {
        const score = (100 - Math.abs(avgLum - 100)) + (stdDev * 2) + (nonZeroRatio * 50);
        if (score > bestScore) {
          bestScore = score;
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = 640;
          exportCanvas.height = 360;
          const exportCtx = exportCanvas.getContext('2d');
          exportCtx.drawImage(tempVideo, 0, 0, 640, 360);
          bestFrame = exportCanvas.toDataURL('image/jpeg', 0.85);
        }

        if (score >= 120) {
          break;
        }
      }
    }

    if (bestFrame && bestFrame.startsWith('data:image/jpeg;base64,')) {
      await fetch(`/api/shares/${shareId}/thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: bestFrame })
      });
      
      const thumbImg = document.getElementById(`thumb-img-${shareId}`);
      if (thumbImg) {
        thumbImg.src = `/api/thumbnail/${shareId}.jpg?t=${Date.now()}`;
        thumbImg.style.display = 'block';
        if (thumbImg.nextElementSibling) {
          thumbImg.nextElementSibling.style.display = 'none';
        }
      }
    }
  } catch (err) {
    console.warn('[Thumbnail] Extraction error:', err);
  } finally {
    if (tempVideo && tempVideo.parentNode) {
      tempVideo.parentNode.removeChild(tempVideo);
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

function renderSharesList() {
  const container = document.getElementById('shares-list');
  const countSpan = document.getElementById('shares-count');
  if (countSpan) countSpan.textContent = `${currentShares.length} ${t('filesUnit')}`;

  if (currentShares.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-wrap">
          <svg class="svg-icon svg-icon-xl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
        </div>
        <p>${t('emptyState')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = currentShares.map((share) => {
    const activeUrl = share.shortUrl || share.publicUrl;
    const isShortened = Boolean(share.shortUrl);
    const viewText = t('viewCount', { n: share.views || 0 });
    const displayTitle = escapeHtml(share.title || share.originalName);
    const hasCustomTitle = Boolean(share.title && share.title !== share.originalName);

    return `
      <div class="share-item" id="share-card-${share.id}">
        <div class="share-header">
          <div class="video-meta">
            <div class="video-thumb">
              <img id="thumb-img-${share.id}" src="/api/thumbnail/${share.id}.jpg?t=${Date.now()}" alt="" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
              <span style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center;">${SVG_ICONS.play}</span>
            </div>
            <div class="video-info">
              <div class="video-title-row">
                <h3 title="${displayTitle}">${displayTitle}</h3>
                <button class="btn-edit-title" onclick="openEditModal('${share.id}')" title="${t('btnEdit')}">
                  ${SVG_ICONS.edit}
                </button>
              </div>
              ${hasCustomTitle ? `<div class="video-original-name" title="${escapeHtml(share.originalName)}">(${escapeHtml(share.originalName)})</div>` : ''}
              <div class="video-details">
                <span>${formatBytes(share.size)}</span>
                <span>•</span>
                <span>${viewText}</span>
              </div>
            </div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="revokeShare('${share.id}')" title="${t('btnDelete')}">
            ${SVG_ICONS.trash}
            <span>${t('btnDelete')}</span>
          </button>
        </div>

        <div class="link-row">
          <input 
            type="text" 
            readonly 
            class="link-input" 
            id="url-input-${share.id}" 
            value="${activeUrl}" 
            onclick="this.select()"
          >
          <div class="link-actions">
            <button class="btn btn-play btn-sm" onclick="openVideoModal('${share.id}')" title="${t('btnPlay')}">
              ${SVG_ICONS.play}
              <span>${t('btnPlay')}</span>
            </button>
            <button class="btn btn-primary btn-sm" id="btn-copy-${share.id}" onclick="copyShareLink('${share.id}')">
              ${SVG_ICONS.copy}
              <span>${t('btnCopy')}</span>
            </button>
            <button 
              class="btn btn-shorten btn-sm" 
              id="btn-shorten-${share.id}"
              onclick="shortenShareLink('${share.id}')"
              ${isShortened ? 'disabled style="opacity:0.7;"' : ''}
            >
              ${isShortened ? SVG_ICONS.check : SVG_ICONS.scissors}
              <span>${isShortened ? t('btnShortened') : t('btnShorten')}</span>
            </button>
            <button onclick="openExternalLink('${share.localUrl}')" class="btn btn-secondary btn-sm" title="${t('btnOpen')}">
              ${SVG_ICONS.external}
              <span>${t('btnOpen')}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Copy link to clipboard
async function copyShareLink(id) {
  const input = document.getElementById(`url-input-${id}`);
  const copyBtn = document.getElementById(`btn-copy-${id}`);
  if (!input) return;

  try {
    await navigator.clipboard.writeText(input.value);
    showToast(t('toastCopied'), 'success');
  } catch (err) {
    input.select();
    document.execCommand('copy');
    showToast(t('toastCopied'), 'success');
  }

  if (copyBtn) {
    const originalHtml = copyBtn.innerHTML;
    copyBtn.innerHTML = `${SVG_ICONS.check} <span>${t('btnCopied')}</span>`;
    setTimeout(() => {
      copyBtn.innerHTML = originalHtml;
    }, 1500);
  }
}

// Shorten link using spoo.me
async function shortenShareLink(id) {
  const btn = document.getElementById(`btn-shorten-${id}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `${SVG_ICONS.spinner} <span>${t('loading')}</span>`;
  }

  try {
    const res = await fetch(`/api/shares/${id}/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: tunnelInfo.publicUrl || window.location.origin
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to shorten');
    }

    const input = document.getElementById(`url-input-${id}`);
    if (input) {
      input.value = data.shortUrl;
    }
    if (btn) {
      btn.innerHTML = `${SVG_ICONS.check} <span>${t('btnShortened')}</span>`;
      btn.style.opacity = '0.7';
    }

    try {
      await navigator.clipboard.writeText(data.shortUrl);
      showToast(t('toastShortened'), 'success');
    } catch (e) {
      showToast(t('toastShortened'), 'success');
    }

    const target = currentShares.find(s => s.id === id);
    if (target) target.shortUrl = data.shortUrl;
  } catch (err) {
    showToast(err.message || 'Failed to shorten link', 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `${SVG_ICONS.scissors} <span>${t('btnShorten')}</span>`;
    }
  }
}

// Revoke and delete video
async function revokeShare(id) {
  if (!confirm(t('deleteConfirm'))) {
    return;
  }

  try {
    const res = await fetch(`/api/shares/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to revoke');
    }

    showToast(t('toastDeleted'), 'success');
    currentShares = currentShares.filter(s => s.id !== id);
    renderSharesList();
  } catch (err) {
    showToast(err.message || 'Failed to delete video', 'error');
  }
}

// Edit Title & Metadata Modal Handlers
let currentEditingShareId = null;

function openEditModal(id) {
  const share = currentShares.find(s => s.id === id);
  if (!share) return;
  currentEditingShareId = id;
  const modal = document.getElementById('edit-modal');
  const titleInput = document.getElementById('edit-title-input');
  const origFile = document.getElementById('edit-original-filename');

  if (titleInput) titleInput.value = share.title || share.originalName;
  if (origFile) origFile.textContent = share.originalName;

  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
      }
    }, 60);
  }
}

function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  if (modal) modal.style.display = 'none';
  currentEditingShareId = null;
}

function handleEditBackdropClick(e) {
  if (e && e.target && e.target.id === 'edit-modal') {
    closeEditModal();
  }
}

async function submitEditTitle(e) {
  if (e) e.preventDefault();
  if (!currentEditingShareId) return;

  const titleInput = document.getElementById('edit-title-input');
  const newTitle = titleInput ? titleInput.value.trim() : '';
  const saveBtn = document.getElementById('btn-save-title');

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `${SVG_ICONS.spinner} <span>${t('loading')}</span>`;
  }

  try {
    const res = await fetch(`/api/shares/${currentEditingShareId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update title');
    }

    // Update in memory currentShares
    const target = currentShares.find(s => s.id === currentEditingShareId);
    if (target && data.share) {
      target.title = data.share.title;
    }

    closeEditModal();
    showToast(t('toastTitleUpdated'), 'success');
    renderSharesList();
  } catch (err) {
    showToast(err.message || 'Failed to update title', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<span>${t('btnSave')}</span>`;
    }
  }
}

// Upload file handler
function uploadVideoFile(file) {
  if (!file) return;

  const progressWrap = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const progressPercent = document.getElementById('progress-percent');
  const customTitleInput = document.getElementById('custom-title-input');
  const customTitle = customTitleInput ? customTitleInput.value.trim() : '';

  progressWrap.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = `${t('loading')} ${file.name}...`;
  progressPercent.textContent = '0%';

  const formData = new FormData();
  formData.append('video', file);
  if (customTitle) {
    formData.append('title', customTitle);
  }

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/shares/upload', true);

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      progressFill.style.width = percent + '%';
      progressPercent.textContent = percent + '%';
    }
  };

  xhr.onload = () => {
    progressWrap.style.display = 'none';
    if (xhr.status === 201) {
      if (customTitleInput) customTitleInput.value = '';
      showToast(t('toastUploaded'), 'success');
      try {
        const res = JSON.parse(xhr.responseText);
        if (res.share && res.share.id) {
          extractAndUploadThumbnail(res.share.id, file);

          if (userSettings.autoCopy && res.share.publicUrl) {
            navigator.clipboard.writeText(res.share.publicUrl).catch(() => {});
          }
        }
      } catch (e) {}
      loadShares();
    } else {
      let errMsg = 'Failed to upload';
      try {
        const res = JSON.parse(xhr.responseText);
        if (res.error) errMsg = res.error;
      } catch (e) {}
      showToast(errMsg, 'error');
    }
  };

  xhr.onerror = () => {
    progressWrap.style.display = 'none';
    showToast('Connection failed', 'error');
  };

  xhr.send(formData);
}

// Register local file path directly (for Electron or path input)
async function registerLocalFilePath(filePath) {
  if (!filePath) return;
  const pathInput = document.getElementById('local-path-input');
  const customTitleInput = document.getElementById('custom-title-input');
  const customTitle = customTitleInput ? customTitleInput.value.trim() : '';
  const btn = document.getElementById('btn-add-path');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `${SVG_ICONS.spinner} <span>${t('loading')}</span>`;
  }

  try {
    const res = await fetch('/api/shares/local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, title: customTitle })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Cannot open file');
    }

    if (pathInput) pathInput.value = '';
    if (customTitleInput) customTitleInput.value = '';
    showToast(t('toastShared'), 'success');
    
    if (data.share && data.share.id) {
      extractAndUploadThumbnail(data.share.id, `/api/stream/${data.share.id}`);

      if (userSettings.autoCopy && data.share.publicUrl) {
        navigator.clipboard.writeText(data.share.publicUrl).catch(() => {});
      }
    }
    loadShares();
  } catch (err) {
    showToast(err.message || 'Failed to share file', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>${t('btnShare')}</span>`;
    }
  }
}

// ==========================================
// DEDICATED PLAYER VIEW (For /v/:id)
// ==========================================
async function renderPlayerView(videoId) {
  document.body.classList.add('player-mode');
  currentPlayingId = videoId;
  document.getElementById('view-dashboard').style.display = 'none';
  document.getElementById('view-player').style.display = 'flex';

  const settingsBtn = document.getElementById('btn-open-settings');
  if (settingsBtn) settingsBtn.style.display = 'none';

  const loadingEl = document.getElementById('player-loading');
  const activeEl = document.getElementById('player-active');
  const revokedEl = document.getElementById('player-revoked');

  loadingEl.style.display = 'block';
  activeEl.style.display = 'none';
  revokedEl.style.display = 'none';

  if (!videoId) {
    loadingEl.style.display = 'none';
    revokedEl.style.display = 'block';
    document.title = t('videoNotFoundTitle');
    return;
  }

  try {
    const res = await fetch(`/api/video-info/${videoId}`);
    if (!res.ok) {
      loadingEl.style.display = 'none';
      activeEl.style.display = 'none';
      revokedEl.style.display = 'block';
      document.title = t('videoNotFoundTitle');
      return;
    }

    const videoInfo = await res.json();
    if (!videoInfo.isAvailable) {
      loadingEl.style.display = 'none';
      activeEl.style.display = 'none';
      revokedEl.style.display = 'block';
      document.title = t('videoNotFoundTitle');
      return;
    }

    document.title = videoInfo.originalName;

    const videoEl = document.getElementById('video-element');
    const sourceEl = document.getElementById('video-source');
    
    videoEl.poster = `/api/thumbnail/${videoId}.jpg`;

    const streamUrl = `/api/stream/${videoId}`;
    sourceEl.src = streamUrl;
    sourceEl.type = videoInfo.mimeType || 'video/mp4';
    videoEl.src = streamUrl;

    videoEl.onerror = () => {
      fetch(`/api/video-info/${videoId}`).then(r => {
        if (!r.ok) {
          activeEl.style.display = 'none';
          revokedEl.style.display = 'block';
          document.title = t('videoNotFoundTitle');
        }
      });
    };

    videoEl.load();

    loadingEl.style.display = 'none';
    activeEl.style.display = 'block';

    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }

  } catch (err) {
    console.error('Failed to load video info:', err);
    loadingEl.style.display = 'none';
    revokedEl.style.display = 'block';
    document.title = t('videoNotFoundTitle');
  }
}

// ==========================================
// IN-APP MODAL VIDEO PLAYER
// ==========================================
async function openVideoModal(shareId) {
  activeModalVideoId = shareId;
  const modal = document.getElementById('video-modal');
  const titleEl = document.getElementById('modal-video-title');
  const sizeEl = document.getElementById('modal-video-size');
  const modalVideoEl = document.getElementById('modal-video-element');
  const modalSourceEl = document.getElementById('modal-video-source');

  titleEl.textContent = t('loading');
  modal.style.display = 'flex';

  try {
    const res = await fetch(`/api/video-info/${shareId}`);
    if (!res.ok) throw new Error(t('videoNotFoundTitle'));
    const info = await res.json();

    titleEl.textContent = info.originalName;
    sizeEl.textContent = `${formatBytes(info.size)} • ${t('viewCount', { n: info.views || 0 })}`;

    const streamUrl = `/api/stream/${shareId}`;
    modalVideoEl.poster = `/api/thumbnail/${shareId}.jpg`;
    modalSourceEl.src = streamUrl;
    modalSourceEl.type = info.mimeType || 'video/mp4';
    modalVideoEl.src = streamUrl;

    modalVideoEl.load();
    modalVideoEl.play().catch(() => {});
  } catch (err) {
    alert(err.message);
    closeVideoModal();
  }
}

function closeVideoModal() {
  const modal = document.getElementById('video-modal');
  const modalVideoEl = document.getElementById('modal-video-element');
  if (modalVideoEl) {
    modalVideoEl.pause();
    modalVideoEl.removeAttribute('src');
    modalVideoEl.load();
  }
  modal.style.display = 'none';
  activeModalVideoId = null;
}

function handleModalBackdropClick(e) {
  if (e.target.id === 'video-modal') {
    closeVideoModal();
  }
}

function openExternalLink(url) {
  if (window.electronAPI && typeof window.electronAPI.openExternalUrl === 'function') {
    window.electronAPI.openExternalUrl(url);
  } else {
    window.open(url, '_blank');
  }
}

function openModalVideoInNewTab() {
  if (activeModalVideoId) {
    openExternalLink(`/v/${activeModalVideoId}`);
    closeVideoModal();
  }
}

// ==========================================
// SETTINGS MODAL & MANAGEMENT
// ==========================================
async function initSettings() {
  // Try loading from Electron IPC or localStorage
  if (window.electronAPI && typeof window.electronAPI.getSettings === 'function') {
    try {
      const electronSettings = await window.electronAPI.getSettings();
      if (electronSettings) {
        userSettings = { ...userSettings, ...electronSettings };
      }
    } catch (e) {}
  } else {
    try {
      const local = localStorage.getItem('video_streamer_settings');
      if (local) userSettings = { ...userSettings, ...JSON.parse(local) };
    } catch (e) {}
  }

  // Apply settings to checkboxes & language
  const trayCheckbox = document.getElementById('setting-minimize-tray');
  if (trayCheckbox) trayCheckbox.checked = Boolean(userSettings.minimizeToTray);

  const autoStartCheckbox = document.getElementById('setting-auto-start');
  if (autoStartCheckbox) autoStartCheckbox.checked = Boolean(userSettings.autoStart);

  const autoCopyCheckbox = document.getElementById('setting-auto-copy');
  if (autoCopyCheckbox) autoCopyCheckbox.checked = Boolean(userSettings.autoCopy);

  applyLanguage(userSettings.language || 'th');
}

function saveCurrentSettings() {
  if (window.electronAPI && typeof window.electronAPI.saveSettings === 'function') {
    window.electronAPI.saveSettings(userSettings);
  } else {
    try {
      localStorage.setItem('video_streamer_settings', JSON.stringify(userSettings));
    } catch (e) {}
  }
}

function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.style.display = 'flex';
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.style.display = 'none';
  saveCurrentSettings();
}

function handleSettingsBackdropClick(e) {
  if (e.target.id === 'settings-modal') {
    closeSettingsModal();
  }
}

function setLanguage(lang) {
  userSettings.language = lang;
  applyLanguage(lang);
  saveCurrentSettings();
}

function toggleMinimizeToTray(enabled) {
  userSettings.minimizeToTray = enabled;
  saveCurrentSettings();
}

function toggleAutoStart(enabled) {
  userSettings.autoStart = enabled;
  saveCurrentSettings();
}

function toggleAutoCopy(enabled) {
  userSettings.autoCopy = enabled;
  saveCurrentSettings();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (activeModalVideoId) closeVideoModal();
    closeSettingsModal();
  }
});

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  handleRoute();
  initSettings();

  setInterval(checkStatus, 8000);

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', async () => {
      if (window.electronAPI && typeof window.electronAPI.selectVideoFile === 'function') {
        try {
          const selectedPath = await window.electronAPI.selectVideoFile();
          if (selectedPath) {
            registerLocalFilePath(selectedPath);
          }
        } catch (e) {
          fileInput.click();
        }
      } else {
        fileInput.click();
      }
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.path && window.electronAPI) {
          registerLocalFilePath(file.path);
        } else {
          uploadVideoFile(file);
        }
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        uploadVideoFile(fileInput.files[0]);
        fileInput.value = '';
      }
    });
  }

  const localForm = document.getElementById('local-path-form');
  const pathInput = document.getElementById('local-path-input');
  if (localForm && pathInput) {
    localForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const filePath = pathInput.value.trim();
      if (!filePath) return;
      await registerLocalFilePath(filePath);
    });
  }
});
