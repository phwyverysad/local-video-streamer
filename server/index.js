const { createApp } = require('./app');
const { defaultTunnelManager } = require('./tunnel');

const PORT = process.env.PORT || 3000;
const app = createApp();

const server = app.listen(PORT, async () => {
  console.log('\n========================================================');
  console.log('🎬 Local Video Streamer กำลังทำงาน!');
  console.log(`🌐 Dashboard (เปิดในเครื่องคุณ): http://localhost:${PORT}`);
  console.log('⏳ กำลังเชื่อมต่อ Secure Public Tunnel (Cloudflare)...');
  console.log('========================================================\n');

  try {
    const publicUrl = await defaultTunnelManager.start(PORT);
    console.log('✅ Public Tunnel พร้อมใช้งานแล้ว!');
    console.log(`🌍 Public Link Base: ${publicUrl}`);
    console.log('💡 เพื่อนของคุณสามารถเปิดดูวิดีโอผ่านลิงก์นี้ได้ทันที\n');
  } catch (err) {
    console.warn('⚠️ ไม่สามารถเริ่ม Public Tunnel ได้โดยอัตโนมัติ:', err.message);
    console.log('💡 ระบบยังคงทำงานได้บนเครือข่ายภายใน (Localhost)');
  }
});

function gracefulShutdown() {
  console.log('\n🛑 กำลังปิดระบบ...');
  defaultTunnelManager.stop();
  server.close(() => {
    console.log('✅ ปิดระบบเรียบร้อย');
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
