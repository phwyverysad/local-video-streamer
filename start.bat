@echo off
chcp 65001 > nul
title Local Video Streamer

echo ========================================================
echo   [App] Local Video Streamer - Instant Video Sharing
echo ========================================================
echo.

if not exist node_modules (
    echo [1/2] กำลังติดตั้ง Dependencies...
    call npm install
)

echo [2/2] กำลังเริ่มต้นระบบเซิร์ฟเวอร์และท่อส่งสัญญาณสาธารณะ...
echo.
echo กำลังเปิดเบราว์เซอร์ไปยังหน้า Dashboard...
start http://localhost:3000

node server/index.js
pause
