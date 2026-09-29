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

## Architecture

- **Desktop Framework**: Electron
- **Backend**: Node.js, Express
- **Frontend**: Vanilla HTML5, CSS3, JavaScript
- **Tunneling**: Cloudflare Tunnel (`cloudflared`)
- **URL Shortener**: spoo.me API

## Prerequisites

- Node.js (v18 or higher)
- npm

## Getting Started

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/phwyverysad/local-video-streamer.git
cd local-video-streamer
npm install
```

### 2. Running the Application

Launch the desktop application:

```bash
npm start
```

To run the application in server-only mode:

```bash
npm run start:server
```

## Usage

1. Open the application.
2. Select a video file using the native file picker or drag and drop a file into the upload zone. Alternatively, provide the absolute path to a local video file.
3. Copy the generated public streaming URL or click **Shorten** to generate a compact link.
4. Share the link with viewers. The video can be played immediately in any standard web browser.
5. Click **Delete** to revoke the stream and permanently terminate public access.

## License

ISC License
