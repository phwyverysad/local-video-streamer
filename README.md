# Local Video Streamer

> ⚡ **Instant Local Video Streaming & Sharing Application**  
> สตรีมวิดีโอจากเครื่องคอมพิวเตอร์ของคุณให้ผู้อื่นรับชมได้ทันทีผ่านอินเทอร์เน็ต โดยไม่ต้องอัปโหลดขึ้นคลาวด์ พร้อมโปรแกรม Desktop (Electron) และดีไซน์ Modern Light Theme สะอาดตา

---

## ✨ จุดเด่นและฟังก์ชันการทำงาน

1. **สตรีมตรงจากเครื่อง 100% (No Cloud Storage Needed)**:
   - สตรีมไฟล์ขนาดใหญ่ (1 GB – 50 GB+) ส่งตรงไปยังผู้ชมผ่าน Secure Cloudflare Tunnel
2. **ระบบสตรีมมิ่งความเร็วสูง (HTTP 206 Byte-Range Streaming)**:
   - ผู้ชมเริ่มเล่นวิดีโอได้ทันที เลื่อนแถบเวลา (seek / scrub) ได้ลื่นไหล ไม่ต้องรอโหลดทั้งไฟล์
3. **ระบบดึงภาพปกคลิปอัจฉริยะ (Hardware-Accelerated Frame Extractor)**:
   - ตรวจจับและดึงภาพเฟรมที่คมชัดและสว่างที่สุดจากไฟล์วิดีโอในเครื่องมาทำเป็นภาพปก (Cover Thumbnail) อัตโนมัติ
4. **ปุ่มย่อลิงก์ด่วน (spoo.me)**:
   - แปลงลิงก์ยาวเป็นลิงก์สั้นจิ๋วได้ในคลิกเดียว พร้อมคัดลอกลงคลิปบอร์ดทันที
5. **ระบบความปลอดภัยและการตัดสิทธิ์ (Instant Revocation)**:
   - เมื่อกดลบวิดีโอ ลิงก์ที่แชร์จะถูกตัดการเข้าถึงทันที และเมื่อปิดโปรแกรม ลิงก์ทั้งหมดจะปิดตัวลงโดยสมบูรณ์
6. **Electron Desktop Application & Web Interface**:
   - รองรับการเปิดใช้งานเป็นโปรแกรม Desktop สวยงาม พร้อมฟังก์ชัน Native File Picker และ Drag & Drop จาก Windows Explorer

---

## 🚀 วิธีการติดตั้งและเริ่มใช้งาน

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. รัน Desktop Application (Electron)
```bash
npm start
```

### 3. รันเฉพาะ Web Server (Terminal Mode)
```bash
npm run start:server
```

---

## 🧪 การรันชุดทดสอบ (Automated Tests)

```bash
npm test
```
ชุดทดสอบครอบคลุม:
- การลงทะเบียนและเพิกถอนสิทธิ์ไฟล์ (`test/registry.test.js`)
- การสตรีมมิ่ง HTTP 206 Range (`test/stream.test.js`)
- การย่อลิงก์ URL Shortener (`test/shortener.test.js`)
- การทำงานของ REST API ครบทุก Endpoint (`test/api.test.js`)

---

## 🛠️ Tech Stack
- **Desktop:** Electron
- **Backend:** Node.js, Express
- **Frontend:** HTML5, CSS3, JavaScript (Light Theme, Responsive)
- **Tunneling:** Cloudflare Tunnel (cloudflared)
- **URL Shortener:** spoo.me
