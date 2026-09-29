// Standalone Video Player Logic with zero emojis and SVG icons
const SVG_ICONS = {
  folder: `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
  eye: `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function initPlayer() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const videoId = pathParts[pathParts.length - 1];

  const loadingEl = document.getElementById('player-loading');
  const activeEl = document.getElementById('player-active');
  const revokedEl = document.getElementById('player-revoked');

  if (!videoId) {
    loadingEl.style.display = 'none';
    revokedEl.style.display = 'block';
    return;
  }

  try {
    const res = await fetch(`/api/video-info/${videoId}`);
    if (!res.ok) {
      loadingEl.style.display = 'none';
      activeEl.style.display = 'none';
      revokedEl.style.display = 'block';
      document.title = 'วิดีโอนี้ไม่สามารถรับชมได้แล้ว';
      return;
    }

    const videoInfo = await res.json();
    if (!videoInfo.isAvailable) {
      loadingEl.style.display = 'none';
      activeEl.style.display = 'none';
      revokedEl.style.display = 'block';
      document.title = 'วิดีโอนี้ไม่สามารถรับชมได้แล้ว';
      return;
    }

    // Populate video info
    const displayTitle = videoInfo.title || videoInfo.originalName;
    document.title = displayTitle;
    const titleEl = document.getElementById('video-title');
    if (titleEl) titleEl.textContent = displayTitle;

    const sizeEl = document.getElementById('video-size');
    if (sizeEl) {
      sizeEl.innerHTML = `
        ${SVG_ICONS.folder}
        <span>ขนาด: ${formatBytes(videoInfo.size)}</span>
      `;
    }

    const viewsEl = document.getElementById('video-views');
    if (viewsEl) {
      viewsEl.innerHTML = `
        ${SVG_ICONS.eye}
        <span>เข้าชม: ${videoInfo.views || 0} ครั้ง</span>
      `;
    }

    // Direct, reliable video stream setup
    const videoEl = document.getElementById('video-element');
    const sourceEl = document.getElementById('video-source');
    const streamUrl = `/api/stream/${videoId}`;

    videoEl.poster = `/api/thumbnail/${videoId}.jpg`;
    sourceEl.src = streamUrl;
    sourceEl.type = videoInfo.mimeType || 'video/mp4';
    videoEl.src = streamUrl;

    videoEl.onerror = () => {
      fetch(`/api/video-info/${videoId}`).then(r => {
        if (!r.ok) {
          activeEl.style.display = 'none';
          revokedEl.style.display = 'block';
          document.title = 'วิดีโอนี้ไม่สามารถรับชมได้แล้ว';
        }
      });
    };

    videoEl.load();

    // Show active player
    loadingEl.style.display = 'none';
    activeEl.style.display = 'block';

    // Attempt playback cleanly
    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy handled: user can tap play button
      });
    }

  } catch (err) {
    console.error('Failed to load video info:', err);
    loadingEl.style.display = 'none';
    revokedEl.style.display = 'block';
    document.title = 'เกิดข้อผิดพลาดในการโหลดวิดีโอ';
  }
}

document.addEventListener('DOMContentLoaded', initPlayer);

