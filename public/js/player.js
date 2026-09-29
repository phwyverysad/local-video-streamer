// Player Page Client Logic
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
    document.title = `${videoInfo.originalName} - รับชมวิดีโอ`;
    document.getElementById('video-title').textContent = videoInfo.originalName;
    document.getElementById('video-size').textContent = `ขนาด: ${formatBytes(videoInfo.size)}`;
    document.getElementById('video-views').textContent = `เข้าชม: ${videoInfo.views || 0} ครั้ง`;

    // Configure video source
    const videoEl = document.getElementById('video-element');
    const sourceEl = document.getElementById('video-source');
    sourceEl.src = videoInfo.streamUrl;
    sourceEl.type = videoInfo.mimeType || 'video/mp4';

    videoEl.onerror = () => {
      // If error occurs, check if revoked
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

  } catch (err) {
    console.error('Failed to load video info:', err);
    loadingEl.style.display = 'none';
    revokedEl.style.display = 'block';
    document.title = 'เกิดข้อผิดพลาดในการโหลดวิดีโอ';
  }
}

document.addEventListener('DOMContentLoaded', initPlayer);
