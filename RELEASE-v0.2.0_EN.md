# StreamForger v0.2.0

**Open-source stream tools, forged for creators.**

---

## 📦 Download

| Platform | Link |
|---|---|
| **Windows (portable)** | `StreamForger.Setup.0.2.0.exe` (attached to this release) |
| **Linux Server** | `git clone https://github.com/JuanEntrena18/StreamForge.git && cd StreamForge && npm install && npm run build` |

---

## ✨ What's New

### 🎨 39 Standalone Themed Overlays
Four new themes with real-time Socket.IO integration for chat, follows, subs, cheers and redemptions:

- **Retro 8-bits** — Classic arcade style with _Press Start 2P_ font
- **Retro Win95** — Windows 95 interface with 3D borders, blue title bar and period-accurate buttons
- **RetroWave** — Synthwave aesthetics with neon, sun gradients and _Orbitron_ font
- **Tactical Sci-Fi** — Military/futuristic style with red panels, _Share Tech Mono_ font and glitch effects

Each theme includes: start screen, gameplay, just chatting and end screen overlays, plus standalone chat and HUD.

**Total: 39 standalone overlays** — no React, pure CSS+JS, direct WebSocket connection.

### 🔔 Animated Alert System
- 6 themed alert overlays (8-bits, Win95, RetroWave, Sci-Fi, Fortnite, Horde)
- FIFO event queue with entrance/exit animations
- **Configurable MP3 sounds** — local file picker with persistence in `data/alert-sounds/`
- Test buttons for each event type from the dashboard
- EventSub integration: follows, subs, resubs, gifts, cheers and redemptions

### 🔴 Subathon
- Live extendable timer powered by Twitch events
- **EventSub integration** — subs, resubs, gifts, cheers and follows add time automatically
- Configurable time per subscription tier (Tier 1/2/3), bits, tips and follows
- **Dynamic on-screen alerts** — animated pop-ups when time is added
- **Tailored design** — customizable colors (primary, accent, background, text) and font selector (10 typefaces)
- OBS overlay with countdown, progress bar, statistics and activity feed

### 🪟 Desktop Overlay Window
- **Taskbar icon** — the overlay window appears as a separate taskbar entry
- **Right-click context menu** — toggle borders, window settings, reset position
- **Standalone settings window** with typography, font size and live preview
- **Cyan Chat support** — configurable URL from the panel, loaded inside the overlay with controls

### 💬 Live Chat
- **Auto greeting** — configurable welcome message sent 30 seconds after a user joins chat
- **Cyan Chat integration** — mode selector (Chat / Cyan Chat) with URL input field
- Improved connection pipeline with automatic reconnection

### 📊 Predictions
- Fixed channel ID resolution — now resolves login name to broadcaster ID before creating predictions
- Fixed authentication — uses `apiPost()` to send the local token on POST requests

### 🛡️ Anti-Bots
Follow bot detection via EventSub, IRC spam filter, auto-ban through Helix API and manual follower scanning. Dashboard with stats, protection toggles, whitelist and detection log.

### 🧮 Bitrate Calculator
100% client-side. Calculates the optimal bitrate based on your upload speed with automatic resolution, FPS and bitrate recommendation. Includes step-by-step OBS setup guide.

### 🌍 Localization
- **English** as default interface language
- Also available: Spanish (Spain), French, German and Italian (switchable from the language selector)

### 🔒 Security
- OAuth tokens encrypted with AES-256-GCM
- Local API token (128-bit) required on all POST requests
- Global rate limiting + Socket.IO throttle
- Zod validation on all routes
- Security headers: CSP, X-Content-Type-Options, X-Frame-Options

---

## 🐛 Bug Fixes

- Socket.IO connection in standalone overlays: WebSocket-only transport to avoid Fastify v5 interception
- Socket.IO client served locally (`/overlays/js/socket.io.js`) instead of CDN
- Chat pipeline: await connect/join, automatic reconnection and joined channel management
- Fortnite overlay: configurable backend URL, polling transport fallback
- F12 DevTools shortcut in production windows
- Subathon: timer tick handles paused state correctly, EventSub integration without duplication

---

## 🚀 Getting Started

```bash
# Linux Server
git clone https://github.com/JuanEntrena18/StreamForge.git
cd StreamForge
npm install
cp packages/backend/.env.example packages/backend/.env
# Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET
npm run build
npm run start -w packages/backend

# Development
npm run dev
```

Dashboard: `http://localhost:3000` · Dev: `http://localhost:5173`

For OBS overlays, add a Browser Source pointing to the URLs shown in each tool's "Overlay URL" section.

---

## ☕ Support the project

[buymeacoffee.com/jentrena](https://buymeacoffee.com/jentrena)

---

*StreamForger v0.2.0 — AGPLv3*
