// Single Unified Application Logic: Local Video Streamer
let currentShares = [];
let tunnelInfo = { status: 'offline', publicUrl: null };
let activeModalVideoId = null;
let currentPlayingId = null;

// SVG Icons Dictionary for dynamic injection (Zero emojis)
const SVG_ICONS = {
  play: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
  copy: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
  scissors: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`,
  external: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
  trash: `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
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
  toastIcon.innerHTML = type === 'success' ? SVG_ICONS.check : SVG_ICONS.copy;

  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
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
  document.title = 'สตรีมวิดีโอ';
  document.getElementById('view-dashboard').style.display = 'block';
  document.getElementById('view-player').style.display = 'none';

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

    // 1. Wait for video metadata to load
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

    // 2. Build candidate timestamps
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

    // 3. Test canvas
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

    // 4. Upload best extracted thumbnail
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
  if (countSpan) countSpan.textContent = `${currentShares.length} ไฟล์`;

  if (currentShares.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-wrap">
          <svg class="svg-icon svg-icon-xl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
        </div>
        <p>ยังไม่มีวิดีโอที่แชร์</p>
      </div>
    `;
    return;
  }

  container.innerHTML = currentShares.map((share) => {
    const activeUrl = share.shortUrl || share.publicUrl;
    const isShortened = Boolean(share.shortUrl);

    return `
      <div class="share-item" id="share-card-${share.id}">
        <div class="share-header">
          <div class="video-meta">
            <div class="video-thumb">
              <img id="thumb-img-${share.id}" src="/api/thumbnail/${share.id}.jpg?t=${Date.now()}" alt="" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
              <span style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center;">${SVG_ICONS.play}</span>
            </div>
            <div class="video-info">
              <h3 title="${share.originalName}">${share.originalName}</h3>
              <div class="video-details">
                <span>${formatBytes(share.size)}</span>
                <span>•</span>
                <span>ดู ${share.views || 0} ครั้ง</span>
              </div>
            </div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="revokeShare('${share.id}')" title="ลบวิดีโอ">
            ${SVG_ICONS.trash}
            <span>ลบ</span>
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
            <button class="btn btn-play btn-sm" onclick="openVideoModal('${share.id}')" title="เล่นตัวอย่าง">
              ${SVG_ICONS.play}
              <span>เล่น</span>
            </button>
            <button class="btn btn-primary btn-sm" id="btn-copy-${share.id}" onclick="copyShareLink('${share.id}')">
              ${SVG_ICONS.copy}
              <span>คัดลอก</span>
            </button>
            <button 
              class="btn btn-shorten btn-sm" 
              id="btn-shorten-${share.id}"
              onclick="shortenShareLink('${share.id}')"
              ${isShortened ? 'disabled style="opacity:0.7;"' : ''}
            >
              ${isShortened ? SVG_ICONS.check : SVG_ICONS.scissors}
              <span>${isShortened ? 'ย่อแล้ว' : 'ย่อลิงก์'}</span>
            </button>
            <button onclick="openExternalLink('${share.localUrl}')" class="btn btn-secondary btn-sm" title="เปิดหน้าใหม่">
              ${SVG_ICONS.external}
              <span>เปิด</span>
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
    showToast('คัดลอกลิงก์แล้ว', 'success');
  } catch (err) {
    input.select();
    document.execCommand('copy');
    showToast('คัดลอกลิงก์แล้ว', 'success');
  }

  if (copyBtn) {
    const originalHtml = copyBtn.innerHTML;
    copyBtn.innerHTML = `${SVG_ICONS.check} <span>คัดลอกแล้ว</span>`;
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
    btn.innerHTML = `${SVG_ICONS.spinner} <span>กำลังย่อ...</span>`;
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
      btn.innerHTML = `${SVG_ICONS.check} <span>ย่อแล้ว</span>`;
      btn.style.opacity = '0.7';
    }

    try {
      await navigator.clipboard.writeText(data.shortUrl);
      showToast('ย่อและคัดลอกลิงก์แล้ว', 'success');
    } catch (e) {
      showToast('ย่อลิงก์แล้ว', 'success');
    }

    const target = currentShares.find(s => s.id === id);
    if (target) target.shortUrl = data.shortUrl;
  } catch (err) {
    alert('เกิดข้อผิดพลาด: ' + err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `${SVG_ICONS.scissors} <span>ย่อลิงก์</span>`;
    }
  }
}

// Revoke and delete video
async function revokeShare(id) {
  if (!confirm('ต้องการลบวิดีโอนี้หรือไม่?')) {
    return;
  }

  try {
    const res = await fetch(`/api/shares/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to revoke');
    }

    showToast('ลบวิดีโอแล้ว', 'success');
    currentShares = currentShares.filter(s => s.id !== id);
    renderSharesList();
  } catch (err) {
    alert('ไม่สามารถลบได้: ' + err.message);
  }
}

// Upload file handler
function uploadVideoFile(file) {
  if (!file) return;

  const progressWrap = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const progressPercent = document.getElementById('progress-percent');

  progressWrap.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = `กำลังโหลด ${file.name}...`;
  progressPercent.textContent = '0%';

  const formData = new FormData();
  formData.append('video', file);

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
      showToast('อัปโหลดสำเร็จ', 'success');
      try {
        const res = JSON.parse(xhr.responseText);
        if (res.share && res.share.id) {
          extractAndUploadThumbnail(res.share.id, file);
        }
      } catch (e) {}
      loadShares();
    } else {
      let errMsg = 'อัปโหลดไม่สำเร็จ';
      try {
        const res = JSON.parse(xhr.responseText);
        if (res.error) errMsg = res.error;
      } catch (e) {}
      alert('ข้อผิดพลาด: ' + errMsg);
    }
  };

  xhr.onerror = () => {
    progressWrap.style.display = 'none';
    alert('การเชื่อมต่อขัดข้อง');
  };

  xhr.send(formData);
}

// ==========================================
// DEDICATED PLAYER VIEW (For /v/:id)
// ==========================================
async function renderPlayerView(videoId) {
  document.body.classList.add('player-mode');
  currentPlayingId = videoId;
  document.getElementById('view-dashboard').style.display = 'none';
  document.getElementById('view-player').style.display = 'flex';

  const loadingEl = document.getElementById('player-loading');
  const activeEl = document.getElementById('player-active');
  const revokedEl = document.getElementById('player-revoked');

  loadingEl.style.display = 'block';
  activeEl.style.display = 'none';
  revokedEl.style.display = 'none';

  if (!videoId) {
    loadingEl.style.display = 'none';
    revokedEl.style.display = 'block';
    document.title = 'ไม่พบวิดีโอ';
    return;
  }

  try {
    const res = await fetch(`/api/video-info/${videoId}`);
    if (!res.ok) {
      loadingEl.style.display = 'none';
      activeEl.style.display = 'none';
      revokedEl.style.display = 'block';
      document.title = 'ไม่พบวิดีโอ';
      return;
    }

    const videoInfo = await res.json();
    if (!videoInfo.isAvailable) {
      loadingEl.style.display = 'none';
      activeEl.style.display = 'none';
      revokedEl.style.display = 'block';
      document.title = 'ไม่พบวิดีโอ';
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
          document.title = 'ไม่พบวิดีโอ';
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
    document.title = 'ไม่พบวิดีโอ';
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

  titleEl.textContent = 'กำลังโหลด...';
  modal.style.display = 'flex';

  try {
    const res = await fetch(`/api/video-info/${shareId}`);
    if (!res.ok) throw new Error('ไม่สามารถเข้าถึงวิดีโอได้');
    const info = await res.json();

    titleEl.textContent = info.originalName;
    sizeEl.textContent = `${formatBytes(info.size)} • ดู ${info.views || 0} ครั้ง`;

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

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeModalVideoId) {
    closeVideoModal();
  }
});

// Register local file path directly (for Electron or path input)
async function registerLocalFilePath(filePath) {
  if (!filePath) return;
  const pathInput = document.getElementById('local-path-input');
  const btn = document.getElementById('btn-add-path');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `${SVG_ICONS.spinner} <span>กำลังแชร์...</span>`;
  }

  try {
    const res = await fetch('/api/shares/local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'ไม่สามารถเปิดไฟล์ได้');
    }

    if (pathInput) pathInput.value = '';
    showToast('แชร์วิดีโอแล้ว', 'success');
    if (data.share && data.share.id) {
      extractAndUploadThumbnail(data.share.id, `/api/stream/${data.share.id}`);
    }
    loadShares();
  } catch (err) {
    alert('เกิดข้อผิดพลาด: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>แชร์</span>`;
    }
  }
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  handleRoute();

  setInterval(checkStatus, 8000);

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', async () => {
      // If running inside Electron, show native Windows file picker dialog!
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
        // If file.path is available in Electron, share instantly without uploading
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
