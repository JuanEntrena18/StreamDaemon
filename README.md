<div align="center">

<img src="packages/frontend/public/logo.svg" width="88" height="88" alt="StreamDaemon Logo">

# StreamDaemon

### Production-Grade, Local-First Broadcast Suite for Twitch Creators

[![Version](https://img.shields.io/badge/Version-0.6.0-7c3aed?style=flat-square)](https://github.com/JuanEntrena18/StreamDaemon/releases)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-2563eb?style=flat-square)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows_10%2F11-0078D4?style=flat-square&logo=windows&logoColor=white)](https://github.com/JuanEntrena18/StreamDaemon/releases)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Twitch API](https://img.shields.io/badge/Twitch-EventSub_%26_IRC-9146FF?style=flat-square&logo=twitch&logoColor=white)](https://dev.twitch.tv)

**StreamDaemon** is a self-contained, open-source broadcast production platform built for Windows streamers. It combines **80+ real-time HTML5/WebGL overlays**, **direct OBS WebSocket v5 automation**, **gameplay-reactive Vibe Daemons**, **microphone-synced Live Avatares**, **interactive 2D physics chat avatars**, **anti-bot security**, and **deep channel analytics**—all running 100% locally on your machine with zero cloud subscriptions or recurring fees.

[**⬇ Download for Windows (.exe)**](https://github.com/JuanEntrena18/StreamDaemon/releases) · [**✨ Explore What's New in v0.6**](#-whats-new-in-v060) · [**🚀 Quick Start**](#-quick-start) · [**☕ Support Development**](https://buymeacoffee.com/jentrena)

</div>

---

## 📑 Table of Contents

- [Why StreamDaemon?](#-why-streamdaemon)
- [What's New in v0.6.0](#-whats-new-in-v060)
- [Core Capabilities](#-core-capabilities)
- [Quick Start (Windows)](#-quick-start)
- [OBS Studio Integration & Overlay Catalog](#-obs-studio-integration--overlay-catalog)
- [System Architecture & Tech Stack](#️-system-architecture--tech-stack)
- [Keyboard Shortcuts](#️-keyboard-shortcuts)
- [Roadmap](#-roadmap)
- [Contributing & Community](#-contributing--community)
- [License](#-license)

---

## 💡 Why StreamDaemon?

Commercial streaming ecosystems frequently lock essential broadcast tools behind monthly paywalls, harvest channel telemetry in the cloud, or inject heavy browser scripts that degrade in-game frame rates.

**StreamDaemon** is engineered around three uncompromising principles:

1. **100% Local-First & Private:** Every OAuth token (encrypted at rest via **AES-256-GCM**), SQLite database (WAL mode), custom asset, and computer-vision frame stays exclusively on your PC.
2. **Broadcast-Grade Performance:** Standalone overlays are crafted in hardware-accelerated vanilla HTML/CSS/JS and PixiJS 8 WebGL, ensuring rock-solid 60 FPS in OBS Browser Sources with minimal CPU/GPU overhead during demanding games.
3. **Unified Studio Workflow:** Replace half a dozen disconnected browser tabs and third-party bots with a single native Windows application that talks directly to Twitch (IRC + EventSub WebSocket) and OBS Studio.

| Capability | **StreamDaemon** | StreamElements | Streamlabs | Meld Studio |
| :--- | :---: | :---: | :---: | :---: |
| **100% Free & Open Source (AGPLv3)** | ✅ | ❌ | ❌ | ❌ |
| **Local-First Execution (Zero Cloud Lock-In)** | ✅ | ❌ | ✅ | ✅ |
| **Native Windows Desktop App** | ✅ | ❌ | ✅ | ✅ |
| **80+ Ready-to-Air Horizontal & Vertical Overlays** | ✅ | — | — | — |
| **Gameplay-Reactive Vibe Daemons + Local CV** | ✅ | ❌ | ❌ | ❌ |
| **Built-In Live Avatar (Lip-Sync) & 2D Chat Avatars** | ✅ | ❌ | ❌ | ❌ |
| **Integrated Anti-Bot & Follow-Bot Shield** | ✅ | ❌ | ✅ | ❌ |
| **One-Click OBS WebSocket Scene Injection** | ✅ | ❌ | ❌ | — |

---

## ✨ What's New in v0.6.0

Version **0.6.0** introduces a comprehensive UI/UX overhaul alongside major interactive broadcast engines:

### 🎨 Complete Studio UI/UX Redesign
- **Visual Universe Deck (`Game Overlays`):** Browse 12 distinct visual universes (*CyberPunk*, *Extraction*, *Fortnite*, *DJ Studio*, *RetroWave*, *Retro 8-bit*, *Tactical Sci-Fi*, *Retro Win95*, *WoW Horde*, *WoW Alliance*, *Subnautica 2*, and *General*) featuring bespoke vector emblems, live scene counters, and instant `16:9` / `9:16` format filtering.
- **Adaptive Dual Theme & HiDPI Scaling:** Seamlessly toggle between **Cyber Dark** and **Liquid Glass Light** modes, with built-in interface scaling (`Auto`, `100%`, `125%`, `150%`, `200%`) tailored for 2K and 4K production monitors.
- **Customizable Workspace Sidebar:** Pin favorite panels for instant access and export or import your sidebar layout across setups.

### ⚡ Vibe Daemons & Local Computer Vision (Beta)
- **Event-Driven Gameplay Reactions:** Configure automated rules (*Vibe Daemons*) that trigger custom overlay animations, WebM/image media, audio stingers, chat messages, or TTS announcements upon reaching kill streaks, victory streaks, or session milestones.
- **Zero-Risk Local Computer Vision for Fortnite:** Optional local screen/window analyzer (0.5–2 FPS ROI color telemetry) automatically detects low shield, low health, and storm phases to trigger live stream reactions without reading game memory or risking anti-cheat flags.
- **Global Desktop Hotkeys:** Trigger kills, deaths, victories, or custom events while your game is in fullscreen focus.

### 🎭 Live Stream Avatar (PNGTuber / WebGL Lip-Sync)
- **Real-Time Microphone Lip-Sync:** Replace or complement your webcam with an animated avatar driven by real-time voice detection, adjustable mic sensitivity, movement smoothing, and noise gating.
- **Built-In Styles & Custom ZIP Packs:** Choose from 5 built-in vector/pixel aesthetics (*Classic*, *Cyber*, *Pixel Art*, *Futuristic*, *Dark*), or upload a custom `.zip` bundle with 8-state eye and mouth PNG sprites. Includes one-click Chroma Key backgrounds for OBS.

### 👾 Interactive 2D Physics Chat Avatars
- **PixiJS 8 + Matter.js Crowd Engine:** Let active chatters spawn on-screen avatars with full 2D gravity, collisions, nametags, and live chat speech bubbles.
- **Automatic Event Choreography:** Avatars dance when users chat, leap on new subscriptions, wave during incoming raids, and react to Bit cheers.

### 🛠️ New Broadcast Suites & Production Modules
- **CyberPunk & Extraction Overlay Suites:** Full horizontal (`1920×1080`) and vertical (`1080×1920`) scene packs (Starting Soon, Gameplay HUD, Just Chatting, BRB, Ending, and Alerts).
- **Visual Overlay Builder:** Drag-and-drop canvas editor to compose custom multi-widget overlays visually.
- **Speedrun Suite (Beta):** Synchronized 4-scene speedrun package with real-time splits and a LiveSplit-compatible timer.
- **Sponsor & Ad Rotator (`AdsPanel`):** Upload PNG sponsor creatives and display them in OBS via smooth marquee or crossfade transitions.
- **Game Diary & Stream Calendar:** Track completed games with automatic **HowLongToBeat** time comparisons and publish your weekly stream schedule directly to live OBS overlays.

---

## 🧩 Core Capabilities

<table>
<tr>
<td width="50%" valign="top">

### 🎬 Overlays & OBS Automation
- **80+ Standalone Scenes & Widgets:** Starting Soon, Gameplay HUDs, Just Chatting, BRB, Ending screens, and full-screen Alerts.
- **Dual-Format Ready:** Dedicated `1920×1080` (16:9) and `1080×1920` (9:16 Vertical) scenes for simultaneous Twitch, TikTok, and YouTube Shorts streaming.
- **Direct OBS WebSocket v5 Sync:** Push any overlay directly into OBS Studio as a configured Browser Source with a single click (`Send to OBS`).
- **In-App Live Preview Modal:** Inspect any horizontal or vertical overlay with simulated **Demo Mode** (`?demo=true`) events and customizable preview backdrops (checkerboard, black, white, chroma green).

</td>
<td width="50%" valign="top">

### 💬 Chat, TTS & Viewer Engagement
- **Virtualized High-FPS Chat (`@tanstack/react-virtual`):** Handles massive message spikes at 60 FPS with quick moderation actions and transparent click-through desktop window support.
- **Dual TTS Engine:** Web Speech API and offline neural **Piper TTS** with voice selection, rate/volume controls, and bot/link filtering.
- **Custom Commands & Periodic Timers:** Dynamic variables (`{user}`, `{uptime}`, `{viewers}`, `{game}`, `{random}`), aliases, mod-only restrictions, and automated chat timers.
- **Giveaways, Predictions & Subathon:** Weighted subscriber ticket multipliers (`×2`, `×5`, `×10`), animated spin wheel, native Twitch Predictions, and an extendable Subathon countdown timer.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 📊 Channel Analytics & Game Widgets
- **KPI & Twitch Tracker Dashboards:** Analyze viewer trends, chat engagement rates, best streaming time slots, post-stream reports, and channel records across 7d, 30d, 90d, and all-time windows.
- **Affiliate & Partner Milestone Tracker:** Real-time progress bars toward Twitch Affiliate and Partner requirements.
- **Live Fortnite Telemetry HUD:** Connects to `Fortnite-API.com` to display live K/D, wins, and match stats across Solo, Duo, Trio, and Squad modes.
- **Tournament Scoreboard & Bitrate Calculator:** 1v1 fighting-game health/round HUDs and an upload-aware OBS bitrate recommender.

</td>
<td width="50%" valign="top">

### 🛡️ Local Security & Anti-Bot Shield
- **Sery-Inspired Anti-Bot Engine:** Real-time heuristic detection of follow-bots, malicious shortened links, and chat spam patterns.
- **Account Age Gate & Auto-Ban:** Automatically block or flag suspicious accounts younger than your configured hour threshold, with one-click manual follower scanning and whitelisting.
- **Hardened Local Architecture:** Every frontend-to-backend request is authenticated via `x-local-api-token`, validated with strict **Zod** schemas, and protected by **AES-256-GCM** token encryption.

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Option 1: Windows Installer (Recommended for Streamers)

No coding or terminal setup required:

1. Download the latest Windows installer (`StreamDaemon-Setup-x.x.x.exe`) from [**GitHub Releases**](https://github.com/JuanEntrena18/StreamDaemon/releases).
2. Run the installer and launch **StreamDaemon**.
3. Follow the built-in **Setup Wizard** to connect your Twitch account in seconds.

---

### Option 2: Local Development Setup (Windows)

#### Prerequisites
- **OS:** Windows 10 or Windows 11 (64-bit)
- **Runtime:** [Node.js 20 LTS or newer](https://nodejs.org/)
- **Twitch Credentials:** A client ID and secret from the [Twitch Developer Console](https://dev.twitch.tv/console) (set OAuth Redirect URL to `http://localhost:3000/auth/callback`)

#### 1. Clone & Install Dependencies

```powershell
git clone https://github.com/JuanEntrena18/StreamDaemon.git
cd StreamDaemon
npm install
```

> *Note:* `npm install` automatically generates the local Prisma SQLite client via the `postinstall` hook.

#### 2. Configure Environment Variables

```powershell
Copy-Item packages/backend/.env.example packages/backend/.env
```

Open `packages/backend/.env` and populate your Twitch application credentials (`TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and `TOKEN_ENCRYPTION_KEY`).

#### 3. Launch in Development Mode

```powershell
# Launch the full Windows Desktop App (Vite + Electron + Fastify Backend)
npm run dev:desktop

# Or launch in Web Dashboard mode (Fastify API on :3000 + Vite UI on :5173)
npm run dev
```

#### 4. Build Production Windows Installer

```powershell
npm run build:desktop
```

---

## 🎮 OBS Studio Integration & Overlay Catalog

All overlays are accessible directly from the **Game Overlays** panel inside StreamDaemon. You can either click **Send to OBS** (when connected via OBS WebSocket v5) or copy the URL into an OBS **Browser Source** (`1920×1080` for horizontal scenes, `1080×1920` for vertical scenes).

### Core Interactive Overlays

| Overlay Module | Default Browser Source URL |
| :--- | :--- |
| **Live Chat** | `http://localhost:3000/overlay.html?mode=chat&channel=YOUR_CHANNEL` |
| **Animated Alerts** | `http://localhost:3000/overlays/alerts.html?channel=YOUR_CHANNEL` |
| **Live Stream Avatar** | `http://localhost:3000/overlay.html?mode=stream-avatar&channel=YOUR_CHANNEL` |
| **2D Chat Avatars** | `http://localhost:3000/overlay.html?mode=avatars&channel=YOUR_CHANNEL` |
| **Subathon Timer** | `http://localhost:3000/overlays/subathon.html?channel=YOUR_CHANNEL` |
| **Giveaways & Wheel** | `http://localhost:3000/overlay.html?mode=giveaway&channel=YOUR_CHANNEL` |
| **Twitch Predictions** | `http://localhost:3000/overlay.html?mode=prediction&channel=YOUR_CHANNEL` |
| **Stream HUD** | `http://localhost:3000/overlay.html?mode=hud&channel=YOUR_CHANNEL` |
| **Countdown Timer** | `http://localhost:3000/overlay.html?mode=timer&channel=YOUR_CHANNEL` |
| **Tournament Scoreboard** | `http://localhost:3000/overlay.html?mode=scoreboard&channel=YOUR_CHANNEL` |
| **Speedrun Suite** | `http://localhost:3000/overlays/suite_de_overlays_speedrun.html?channel=YOUR_CHANNEL` |
| **Stream Calendar** | `http://localhost:3000/overlays/calendar.html?channel=YOUR_CHANNEL` |
| **Game Diary (HLTB)** | `http://localhost:3000/overlays/diary.html?channel=YOUR_CHANNEL` |
| **Sponsor / Ads Rotator** | `http://localhost:3000/overlays/ads.html?channel=YOUR_CHANNEL` |
| **Social Media Rotator** | `http://localhost:3000/overlay.html?mode=social&channel=YOUR_CHANNEL` |

### Visual Universe Suites (Horizontal `16:9` & Vertical `9:16`)

Each themed universe includes coordinated **Starting Soon**, **Gameplay HUD**, **Just Chatting**, **Be Right Back (BRB)**, **Stream Ending**, **Standalone Chat**, and **Alert** scenes:

- **🌆 CyberPunk:** Glitch-framed neon overlays, AFK warning terminals, and vertical mobile scenes.
- **🎯 Extraction:** Tactical squad comms, raid timers, and extraction telemetry.
- **🔫 Fortnite:** Live Epic Games API stat HUDs, Victory Royale ending screens, and cartoon/tactical layouts.
- **🎧 DJ Studio:** Spinning vinyl equalizers, chroma-key camera frames, and club banners.
- **🌅 RetroWave:** Outrun 3D perspective grids, VHS highway screensavers, and synthwave neon frames.
- **🕹️ Retro 8-Bit:** CRT scanlines, NES-inspired RPG dialogue boxes, and bouncing pixel screensavers.
- **🪟 Retro Win95:** Authentic beveled 32-bit OS windows, system tray widgets, and classic error screensavers.
- **🛸 Tactical Sci-Fi:** Octagonal DRADIS radar sweeps and military comms telemetry.
- **🛡️ WoW Horde & 👑 WoW Alliance:** Faction crests, animated embers/stars, and bastion frames.
- **🌊 Subnautica 2:** Abyssal bioluminescent HUD with sonar sweep and particle effects.

> **💡 Pro Tip — Simulated Demo Mode:** Append `&demo=true` to any overlay URL to preview animated alerts, chat messages, and telemetry counters without going live.

---

## 🏗️ System Architecture & Tech Stack

StreamDaemon is organized as a strict TypeScript **npm workspaces** monorepo:

```text
StreamDaemon/
├── packages/
│   ├── shared/      # @streamdaemon/shared   — Zod schemas, TypeScript contracts, Socket.IO constants, LRU/TTL cache
│   ├── backend/     # @streamdaemon/backend  — Fastify v5 API, Twurple (Auth/IRC/EventSub), Socket.IO Hub, OBS WS, Prisma
│   ├── frontend/    # @streamdaemon/frontend — React 18 Dashboard, PixiJS 8 + Matter.js engines, 80+ standalone HTML overlays
│   └── desktop/     # @streamdaemon/desktop  — Electron 33 Windows shell, transparent click-through windows, global hotkeys
└── scripts/         # Asset, spritesheet, and thumbnail generation utilities
```

| Layer | Technologies |
| :--- | :--- |
| **Frontend Dashboard** | React 18 · TypeScript · Vite 6 · Framer Motion · Recharts · `@tanstack/react-virtual` · CSS Modules |
| **2D & Avatar Engines** | PixiJS 8 (WebGL) · Matter.js (2D Physics) · Web Audio API Lip-Sync Detector |
| **Backend Server** | Node.js 20+ (ESM) · Fastify v5 · Socket.IO · `@twurple/*` · `obs-websocket-js` · Pino Logger |
| **Persistence & Security** | SQLite (WAL Mode) · Prisma ORM · AES-256-GCM Token Encryption · Zod Validation |
| **Windows Desktop** | Electron 33 · `electron-store` · NSIS Windows Installer (`electron-builder`) |
| **Internationalization** | Full UI & overlay localization in **5 languages**: English, Español, Français, Deutsch, Italiano |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` | Open Global Command Palette |
| `Ctrl + 1` – `Ctrl + 9` | Switch between primary sidebar panels |
| `Ctrl + Shift + C` | Jump directly to Live Chat |
| `Escape` | Close active modal or preview window |
| `F12` | Toggle Developer Tools (Desktop App) |

---

## 🧭 Roadmap

| Initiative | Status |
| :--- | :---: |
| 🎨 **v0.6 Studio UI/UX & Visual Universe Deck** | ✅ Completed |
| 🎭 **Live Stream Avatar (Lip-Sync) & 2D Physics Chat Avatars** | ✅ Completed |
| ⚡ **Vibe Daemons & Local Fortnite Computer Vision (Beta)** | ✅ Completed |
| 🏃 **Speedrun Suite, Game Diary (HLTB) & Stream Calendar** | ✅ Completed |
| 🎛️ **Elgato Stream Deck Plugin Integration** | 🗓️ Planned |
| 🤖 **Local LLM (Ollama) AI Chat Co-Pilot & Highlights** | 🗓️ Planned |
| 🎬 **Automated Vertical Clip Exporter for TikTok / Shorts** | 🗓️ Planned |

---

## 🤝 Contributing & Community

Contributions, bug reports, and new overlay themes are warmly welcomed!

1. **Fork** the repository on GitHub.
2. **Create a feature branch:** `git checkout -b feat/your-feature-name`
3. **Validate code quality:**
   ```powershell
   npm run lint
   npm run typecheck
   npm test -w packages/backend
   npm test -w packages/frontend
   ```
4. **Commit your changes** following Conventional Commits (`feat:`, `fix:`, `docs:`).
5. **Open a Pull Request** detailing your improvements.

Found a bug or have a feature request? [**Open an Issue on GitHub**](https://github.com/JuanEntrena18/StreamDaemon/issues).

---

## 📈 Star History

<div align="center">
<a href="https://www.star-history.com/?repos=JuanEntrena18%2FStreamDaemon&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=JuanEntrena18/StreamDaemon&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=JuanEntrena18/StreamDaemon&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=JuanEntrena18/StreamDaemon&type=date&legend=top-left" />
 </picture>
</a>
</div>

---

## 📄 License

Distributed under the **GNU Affero General Public License v3.0 (AGPLv3)**. See [`LICENSE`](LICENSE) for full terms. Commercial licensing inquiries are welcome.

<div align="center">

**☕ Enjoying StreamDaemon?** Support independent open-source development on [**Buy Me a Coffee**](https://buymeacoffee.com/jentrena)

*Forged with 💜 by **Cyber Haute Couture** for the global streaming community.*

</div>
