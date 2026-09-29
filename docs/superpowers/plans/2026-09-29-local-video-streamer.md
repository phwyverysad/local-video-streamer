# Local Video Streamer & Instant Share Implementation Plan

## Goal
Build a local web application running on `localhost:3000` that allows the user to select any video file on their PC, generate a public HTTPS link via a zero-config tunnel (Cloudflare Quick Tunnel / Localtunnel), shorten the public link using `da.gd`, and stream the video directly to friends with smooth HTTP range seeking without cloud storage. When the user removes the video or revokes access, the public link is invalidated immediately.

## Design & UI Specifications
- **Theme**: Light, clean, modern, white & soft cyan/sky blue (`#F0F8FF`, `#E0F2FE`, `#0284C7`, `#0EA5E9`).
- **Dashboard**:
  - Drag-and-drop or file picker for videos.
  - Optional direct local file path input for zero-copy instant sharing.
  - "สร้างลิงก์สาธารณะ" (Create Public Link) button.
  - "ย่อลิงก์ (da.gd)" (Shorten Link) button to generate a short link like `https://da.gd/xxxx`.
  - Active Shares list with file info, view button, copy button, shorten button, and "ลบ/ยกเลิกแชร์" (Delete/Revoke) button.
  - Tunnel status indicator (Online / Offline / Public URL).
- **Player Page (Friend View)**:
  - Clean, distraction-free HTML5 video player with seek bar, playback speed control (0.5x, 1x, 1.25x, 1.5x, 2x), and fullscreen.
  - Clean error / 404 state if the video was revoked or deleted.
- **Streaming Engine**:
  - HTTP 206 Partial Content (Byte-Range requests) to allow scrubbing large videos (GBs) with instant playback start.
  - Strict security: Only registered video tokens can be accessed; no arbitrary file disclosure.

## Proposed File Structure
- `package.json`: Dependencies (`express`, `cors`, `multer`, `localtunnel` / `cloudflared`, `supertest`, `jest` / `node:test`).
- `server/app.js`: Express app setup, routing, and middleware.
- `server/registry.js`: Video registry (tracking active shares, tokens, metadata, revocation).
- `server/stream.js`: Video streaming handler supporting `Range` headers and MIME types.
- `server/shortener.js`: `da.gd` URL shortener service.
- `server/tunnel.js`: Public tunnel manager (Cloudflare / Localtunnel fallback).
- `server/index.js`: Server entrypoint that boots Express and tunnel.
- `public/index.html`: Dashboard UI.
- `public/player.html`: Clean video player for friends.
- `public/css/style.css`: Clean white-and-light-blue modern styling.
- `public/js/app.js`: Dashboard client logic.
- `public/js/player.js`: Player client logic.
- `test/registry.test.js`: Registry unit tests.
- `test/stream.test.js`: Video streaming unit tests (Range request).
- `test/shortener.test.js`: da.gd integration/mock tests.
- `test/api.test.js`: End-to-end API integration tests.
- `start.bat`: One-click startup script for Windows.

## Verification Steps
1. Unit and integration tests for all backend modules using Node.js test runner (`node --test`).
2. Verify HTTP Range streaming returns `206 Partial Content` with `Content-Range`.
3. Verify `da.gd` shortener creates valid shortened URLs.
4. Verify link revocation: revoked links immediately return 404 status.
5. End-to-end verification of dashboard and player UI.
