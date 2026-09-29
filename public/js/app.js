// Dashboard Client Logic
let currentShares = [];
let tunnelInfo = { status: 'offline', publicUrl: null };

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Check server and tunnel status
async function checkStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) return;
    const data = await res.json();
    tunnelInfo = data.tunnel || {};

    const badge = document.getElementById('tunnel-badge');
    const text = document.getElementById('tunnel-text');

    if (tunnelInfo.status === 'online' && tunnelInfo.publicUrl) {
      badge.className = 'tunnel-badge online';
      text.textContent = 'ออนไลน์ (พร้อมส่งต่อทั่วโลก)';
    } else if (tunnelInfo.status === 'starting') {
      badge.className = 'tunnel-badge starting';
      text.textContent = 'กำลังเชื่อมต่อท่อสัญญาณสาธารณะ...';
    } else {
      badge.className = 'tunnel-badge';
      text.textContent = 'ทำงานแบบโลคอลโฮสต์';
    }
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
    renderShares();
  } catch (err) {
    console.error('Failed to load shares:', err);
  }
}

function renderShares() {
  const container = document.getElementById('shares-list');
  const countSpan = document.getElementById('shares-count');
  countSpan.textContent = `${currentShares.length} รายการ`;

  if (currentShares.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎥</div>
        <p>ยังไม่มีวิดีโอที่กำลังแชร์</p>
        <p style="font-size: 12px; margin-top: 4px;">เลือกไฟล์ด้านบนเพื่อสร้างลิงก์ให้เพื่อนได้ทันที</p>
      </div>
    `;
    return;
  }

  container.innerHTML = currentShares.map(share => {
    const activeUrl = share.shortUrl || share.publicUrl;
    const isShortened = Boolean(share.shortUrl);

    return `
      <div class="share-item" id="share-card-${share.id}">
        <div class="share-header">
          <div class="video-meta">
            <div class="video-icon">▶</div>
            <div class="video-info">
              <h3 title="${share.originalName}">${share.originalName}</h3>
              <div class="details">
                <span>📁 ${formatBytes(share.size)}</span>
                <span>👁️ เข้าชม ${share.views || 0} ครั้ง</span>
              </div>
            </div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="revokeShare('${share.id}')" title="ลบวิดีโอและปิดลิงก์ถาวร">
            <span>🗑️</span> ลบวิดีโอ
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
          <button class="btn btn-primary btn-sm" onclick="copyShareLink('${share.id}')">
            <span>📋</span> คัดลอก
          </button>
          <button 
            class="btn btn-shorten btn-sm" 
            id="btn-shorten-${share.id}"
            onclick="shortenShareLink('${share.id}')"
            ${isShortened ? 'disabled style="opacity:0.75;"' : ''}
          >
            <span>✂️</span> ${isShortened ? 'ย่อแล้ว (da.gd) ✓' : 'ย่อลิงก์ (da.gd)'}
          </button>
          <a href="${share.localUrl}" target="_blank" class="btn btn-secondary btn-sm">
            <span>↗️</span> เปิดดู
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// Copy link to clipboard
async function copyShareLink(id) {
  const input = document.getElementById(`url-input-${id}`);
  if (!input) return;

  try {
    await navigator.clipboard.writeText(input.value);
    showToast('คัดลอกลิงก์สำเร็จ!');
  } catch (err) {
    input.select();
    document.execCommand('copy');
    showToast('คัดลอกลิงก์สำเร็จ!');
  }
}

// Shorten link using da.gd
async function shortenShareLink(id) {
  const btn = document.getElementById(`btn-shorten-${id}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> กำลังย่อ...';
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

    // Update input and button
    const input = document.getElementById(`url-input-${id}`);
    if (input) {
      input.value = data.shortUrl;
    }
    if (btn) {
      btn.innerHTML = '<span>✂️</span> ย่อแล้ว (da.gd) ✓';
      btn.style.opacity = '0.75';
    }

    // Auto copy shortened url
    try {
      await navigator.clipboard.writeText(data.shortUrl);
      showToast('ย่อลิงก์สำเร็จ และคัดลอกให้แล้ว!');
    } catch (e) {
      showToast('ย่อลิงก์ด้วย da.gd สำเร็จ!');
    }

    // Update internal state
    const target = currentShares.find(s => s.id === id);
    if (target) target.shortUrl = data.shortUrl;
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการย่อลิงก์: ' + err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>✂️</span> ย่อลิงก์ (da.gd)';
    }
  }
}

// Revoke and delete video
async function revokeShare(id) {
  if (!confirm('ยืนยันที่จะลบวิดีโอนี้หรือไม่?\n\nเมื่อลบแล้ว ลิงก์ที่ส่งให้เพื่อนจะใช้งานไม่ได้ทันที')) {
    return;
  }

  try {
    const res = await fetch(`/api/shares/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to revoke');
    }

    showToast('ลบวิดีโอและปิดการเข้าถึงเรียบร้อยแล้ว');
    currentShares = currentShares.filter(s => s.id !== id);
    renderShares();
  } catch (err) {
    alert('ไม่สามารถลบวิดีโอได้: ' + err.message);
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
      showToast('สร้างลิงก์สำหรับวิดีโอเรียบร้อย!');
      loadShares();
    } else {
      let errMsg = 'อัปโหลดไม่สำเร็จ';
      try {
        const res = JSON.parse(xhr.responseText);
        if (res.error) errMsg = res.error;
      } catch (e) {}
      alert('เกิดข้อผิดพลาด: ' + errMsg);
    }
  };

  xhr.onerror = () => {
    progressWrap.style.display = 'none';
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
  };

  xhr.send(formData);
}

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
  checkStatus();
  loadShares();

  // Poll status every 8 seconds
  setInterval(checkStatus, 8000);

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  dropzone.addEventListener('click', () => fileInput.click());

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
      uploadVideoFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      uploadVideoFile(fileInput.files[0]);
      fileInput.value = '';
    }
  });

  // Local Path Form
  const localForm = document.getElementById('local-path-form');
  const pathInput = document.getElementById('local-path-input');
  localForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const filePath = pathInput.value.trim();
    if (!filePath) return;

    try {
      const btn = document.getElementById('btn-add-path');
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> กำลังตรวจสอบ...';

      const res = await fetch('/api/shares/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register local file');
      }

      pathInput.value = '';
      showToast('สร้างลิงก์สำเร็จทันที!');
      loadShares();
    } catch (err) {
      alert('ไม่สามารถแชร์ไฟล์ได้: ' + err.message);
    } finally {
      const btn = document.getElementById('btn-add-path');
      btn.disabled = false;
      btn.innerHTML = '<span>⚡</span> สร้างลิงก์ทันที';
    }
  });
});
