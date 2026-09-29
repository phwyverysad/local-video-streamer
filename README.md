# Video Streamer

A lightweight desktop application and streaming server built with Electron and Node.js. It streams local video files directly from your machine to remote viewers using secure Cloudflare tunnels and HTTP 206 Byte-Range requests without uploading to third-party cloud storage.

## Features

- **Direct Local Streaming**: Streams video files directly from the host filesystem without cloud storage uploads.
- **HTTP 206 Byte-Range Support**: Provides instant playback and smooth scrubbing/seeking for high-bitrate video formats (MP4, MKV, MOV, WebM).
- **Secure Public Tunnels**: Integrates Cloudflare Tunnel to expose streams via HTTPS URLs automatically.
- **Integrated URL Shortening**: Built-in support for short URL generation using spoo.me with one-click clipboard copying.
- **Hardware-Accelerated Frame Extraction**: Captures high-clarity video cover posters directly from local video files.
- **Instant Revocation**: Deleting a stream revokes public access immediately.
- **Minimalist Desktop UI**: Clean light-themed interface with native file picker dialogs and drag-and-drop support.
- **System Tray & Settings**: Configurable background tray operation, language localization (English / Thai), and startup preferences.
- **Zero-Install Web Bootstrapper**: 26 KB lightweight installer that automatically provisions and launches the latest application release.

## Architecture

- **Desktop Framework**: Electron
- **Backend**: Node.js, Express
- **Frontend**: Vanilla HTML5, CSS3, JavaScript
- **Tunneling**: Cloudflare Tunnel (`cloudflared`)
- **URL Shortener**: spoo.me API

## Downloads & Distribution

Pre-built binaries for Windows are available under GitHub Releases:

1. **Web Installer / Launcher (`Video-Streamer-Installer.exe`)**:
   - Ultra-lightweight (~26 KB) bootstrapper.
   - Automatically downloads, unpacks, and launches the latest version.
   - If already installed, launches the application instantly with zero prompts.

2. **Portable Executable (`Video-Streamer-Portable.exe`)**:
   - Standalone single-file executable.
   - Runs directly on any Windows 10/11 system without installation or Node.js runtime.

## Getting Started (Development)

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/phwyverysad/local-video-streamer.git
cd local-video-streamer
npm install
```

### Running the Application

Launch the desktop application:

```bash
npm start
```

To run the application in server-only mode:

```bash
npm run start:server
```

## Building Binaries

Build all executables and installer packages:

```bash
npm run build
```

Individual build commands:

- **Build Web Installer (C# native bootstrapper)**:
  ```bash
  npm run build:installer
  ```
- **Build Portable Executable**:
  ```bash
  npm run build:portable
  ```

Outputs are generated in the `dist/` directory:
- `dist/Video-Streamer-Installer.exe`
- `dist/Video-Streamer-Portable.exe`
- `dist/Video-Streamer-win.zip`

## Usage

1. Open the application.
2. Select a video file using the native file picker or drag and drop a file into the upload zone.
3. Copy the generated public streaming URL or click **Shorten** to generate a compact link.
4. Share the link with viewers. The video can be streamed immediately in any modern web browser.
5. Click **Delete** to revoke the stream and terminate public access immediately.
6. Customize language and minimize-to-tray behavior via the bottom-left Settings gear menu.

## License

ISC License
