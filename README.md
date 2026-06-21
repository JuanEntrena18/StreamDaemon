# StreamForger

**Open-source stream tools, forged for creators.**

StreamForger is a modular application for content creators that manages Twitch channels with per-game themed overlays, interactive giveaways, predictions, real-time chat, and a **Subathon** system to extend stream duration through community rewards. Compatible with OBS Studio via Browser Source.

Available in two modes:
- **🖥️ Linux Server** — Multi-user, SQLite, production-ready
- **💻 Windows Desktop** — Portable app with Electron + SQLite, zero configuration

---

## ✨ Features

- **🎨 Standalone themed overlays** — 51 standalone overlays in pure HTML+CSS+JS (no React) for multiple games and styles: Subnautica 2, Fortnite, Animated Alerts, Subathon, **Retro 8-bit**, **Retro Win95**, **RetroWave**, **Tactical Sci-Fi**, **WoW Horde/Alliance** and **12 vertical (1080×1920)** variants with orientation selector in the OBS panel. Each overlay includes particle Canvas, CSS animations, real-time event queue and Socket.IO connection with WebSocket-only transport. The Socket.IO client is served from `/overlays/js/socket.io.js` (Vite) to prevent Fastify v5 from intercepting the download. Loaded as static files (`/overlays/`) in OBS.
- **📱 Vertical Streaming (Dual Format)** — Complete setup guide for Twitch's new Dual Format streaming. Covers Aitum Vertical and SE.Live plugins, Enhanced Broadcasting, system requirements, OBS configuration steps, and mobile-first design tips. Includes **12 dedicated vertical overlays (1080×1920)** — 6 fullscreen and 6 alert variants for all styled themes (Fortnite, 8-bit, Win95, RetroWave, Tactical Sci-Fi, Horde), compatible with OBS Browser Source.
- **🔴 Subathon** — Live extendable timer: viewers add time through subscriptions (+5 min), bits (+1 min per 100 bits), tips, follows or channel rewards. Configurable max limit (12/24h). Control panel with start/pause/resume/stop, manual time addition, action history, and dedicated OBS overlay with countdown, progress bar, statistics and activity feed.
- **📡 Unified Stream Manager** — Dashboard combining stream preview (iframe embed with multi-parent support for Electron and browser), title/game editor, live stats (viewers, followers, subs, uptime) and channel activity feed with filters — all in one screen.
- **💬 Live Chat** — Twitch IRC chat with real-time forwarding to overlays via Socket.IO. Includes message sending, reply (↩ @user), moderation (timeout/ban), role badges, notification sound selector with volume control, **TTS (text-to-speech)** with voice selection, speed and volume. TTS continues reading messages even when browsing other sections of the app.
- **🎁 Interactive Giveaways** — `!giveaway` chat command to participate. Control panel with canvas wheel, spin duration selector (10/15/20s) and bulk name import. Dedicated overlay with live participant list and animated wheel with giant winner display.
- **📊 Predictions** — Twitch Predictions API integration. Create polls from the control panel with automatic resolution.
- **📈 Twitch Tracker** — Historical channel stats with period selector (7d, 30d, 90d, all time). Aggregate metric cards (hours, peak viewers, followers), last stream summary with views, followers, subs, bits and estimated revenue. Interactive SVG chart of stream evolution. Expandable recent streams list with detailed metrics. Multi-factor smart advice engine (frequency, duration, audience, monetization) with optional local Ollama AI integration.
- **🏆 Twitch Achievements** — Real-time progress tracking toward Affiliate, Partner, and Build a Community milestones via Twitch's internal GraphQL API. Progress bars with current/goal counts, completion status, invitation status, and badge display. Integrated under the Statistics section alongside Twitch Tracker.
- **📊 Stream HUD** — Live stats panel (viewers, followers, subs, uptime, game) with auto-polling and informative overlay.
- **⏱️ Timer** — Configurable countdown from the panel with start, pause, resume and reset. Overlay with progress bar, visual alert in the last 30s and "Time's up" status.
- **🏆 Scoreboard & Fighter Overlay** — Live tournament scoreboard with players and scores. **Fighter Overlay**: fighting game overlay with animated health bars (spring physics), character portraits, rounds, server-synced countdown timer and WIN/KO announcements. Ideal for fighting games, 1v1 battle royale or head-to-head competitions.
- **🔔 EventSub Notifications** — Real-time follows, subs, resubs, gifts, redemptions and cheers via EventSub WebSocket, with animated on-screen overlay.
- **🌐 Social Media** — Animated rotating overlay showing the streamer's social links.
- **🛡️ Moderation** — Moderation panel with timeout, ban and unban. Includes a clickable list of currently connected chatters.
- **🤖 Commands** — Custom chat command management: create, edit, enable/disable, with aliases and configurable cooldown.
- **🔒 Anti-Bots** — Automatic bot and spam protection inspired by **Sery Bot**. Follow bot detection via EventSub, IRC spam pattern filter, auto-ban through Helix API and manual follower scan. Dashboard with stats, protection toggles, whitelist and detection log with ban/unban/whitelist buttons per detection.
- **🎮 Transparent overlay window** — Always-on-top window with sidebar toggle, background mode (black/transparent), font selector (6 typefaces), text size adjustment (10-24px), overall opacity control (10-100%), always-visible control bar with drag zone and integrated settings panel. Changes persist in localStorage. Includes `OverlayErrorBoundary` that catches React errors and shows a visible message instead of leaving the window blank.
- **🔐 OAuth Authentication** — Twitch login. Browser: Authorization Code Grant flow with redirect. Desktop: **Device Code Grant** flow (user sees a code in the app and enters it at twitch.tv/activate). Tokens persisted with automatic refresh. Full logout.
- **🖥️ Premium dashboard** — Interface with collapsible sidebar (expands from 56px icons to 220px full navigation), responsive drawer mode on mobile with hamburger menu, glassmorphism, Framer Motion animations, purple/indigo palette, Twitch user badge and real-time connection status. All components use **CSS Modules** (`*.module.css`) instead of inline styles for maintainability and performance.
- **📊 Fortnite Stats Overlay** — Configurable panel in the Fortnite overlay displaying kills, wins, matches, K/D and win rate from the [fortnite-api.com](https://fortnite-api.com) API. Each user registers their own API Key from the panel. 5 min cache.
- **🧮 Bitrate Calculator** — Calculates the optimal bitrate for your stream with automatic recommendation based on your upload speed. Enter your upload (or measure it with fast.com) and the tool suggests the best resolution, FPS and bitrate. Fine manual adjustment with resolution selectors (1080p/900p/720p/480p/custom), FPS (60/30/24), BPP, audio and upload usage %. Shows "your connection vs. required" comparison and Twitch's 6000 kbps limit warning. Includes step-by-step OBS configuration guide with calculated values. No backend — 100% client-side.
- **📋 Activity Feed** — Chronological log of follows, subs, bits and raids on the channel with filters and file persistence.
- **🎮 Built-in Stream Editor** — Change title, game and tags of your live stream from the dashboard with game search and tag selector.

---

## 🔒 Security

StreamForger implements multiple security layers to protect Twitch credentials and the streamer's account:

| ID | Measure | Status |
|---|---|---|
| **C-1** | SQLite database excluded from Git repository (`*.db` in `.gitignore`) | ✅ |
| **C-2** | OAuth tokens encrypted with **AES-256-GCM** before persisting to SQLite | ✅ |
| **A-1** | Local API token (128-bit) required on all POST requests (`X-Local-Token`) | ✅ |
| **A-2** | OAuth `state` parameter generated with `crypto.randomBytes(16)` and verified with 10 min expiry | ✅ |
| **M-1** | Global rate limiting (100 req/min) + Socket.IO throttle (1 msg/1.5s) | ✅ |
| **M-2** | Input validation with **Zod** on all API routes | ✅ |
| **M-3** | CORS restricted to localhost | ✅ |
| **B-1** | Security headers: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` | ✅ |
| **B-2** | **Anti-Bots**: follow bot detection, spam filter, auto-ban and manual follower scan | ✅ |

---

## 🚀 Tech Stack

| Layer | Linux Server | Windows Desktop |
|---|---|---|
| **Frontend** | React 18 + Vite + Framer Motion + pure HTML/CSS/JS overlays | React 18 + Vite |
| **Backend** | Node.js + Fastify + Socket.IO + @twurple | Node.js + Fastify (embedded in Electron) |
| **Database** | SQLite (Prisma ORM) | SQLite (Prisma ORM) |
| **Runtime** | Node.js directly | Electron (.exe) |

---

## 📦 Installation

### Prerequisites

- Node.js 20+
- An application registered at [dev.twitch.tv/console](https://dev.twitch.tv/console)

### 🔧 Linux Server / Production

```bash
git clone https://github.com/JuanEntrena18/StreamForge.git
cd StreamForge
npm install
cp packages/backend/.env.example packages/backend/.env
# Edit with TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET
npm run build
npm run start -w packages/backend
```

Dashboard: `http://localhost:3000` · API: `http://localhost:3000`

### 💻 Development

```bash
npm install
cp packages/backend/.env.example packages/backend/.env
npm run dev
```

Dashboard (Vite): `http://localhost:5173` · API: `http://localhost:3000`

---

## 🎮 OBS Overlays

Add a **Browser Source** in OBS and use the following URLs:

| Overlay | URL |
|---|---|
| Chat | `http://localhost:3000/overlay.html?mode=chat&channel=yourchannel` |
| Giveaways | `http://localhost:3000/overlay.html?mode=giveaway&channel=yourchannel` |
| Predictions | `http://localhost:3000/overlay.html?mode=prediction&channel=yourchannel` |
| Social Media | `http://localhost:3000/overlay.html?mode=social` |
| Stream HUD | `http://localhost:3000/overlay.html?mode=hud&channel=yourchannel` |
| Timer | `http://localhost:3000/overlay.html?mode=timer&channel=yourchannel` |
| Scoreboard | `http://localhost:3000/overlay.html?mode=scoreboard&channel=yourchannel` |
| **Fighter** | `http://localhost:3000/overlay.html?mode=fighter&channel=yourchannel` |
| **Subathon** | `http://localhost:3000/overlays/subathon.html?channel=yourchannel` |
| **Subnautica 2 (full)** | `http://localhost:3000/overlays/subnautica2.html?channel=yourchannel` |
| **Fortnite (full)** | `http://localhost:3000/overlays/fortnite.html?channel=yourchannel&epic=yourEpic&mode=solo` |
| **Animated Alerts** | `http://localhost:3000/overlays/alerts.html?channel=yourchannel` |
| **8-bit (theme)** | `http://localhost:5173/overlays/8bits-pantalla_comienzo.html?backend=http://localhost:3000&channel=yourchannel` |
| **Win95 (theme)** | `http://localhost:5173/overlays/pantalla_comienzo_win95.html?backend=http://localhost:3000&channel=yourchannel` |
| **RetroWave (theme)** | `http://localhost:5173/overlays/pantalla_comienzo_retrowave.html?backend=http://localhost:3000&channel=yourchannel` |
| **Tactical Sci-Fi (theme)** | `http://localhost:5173/overlays/pantalla_de_inicio_t_ctica.html?backend=http://localhost:3000&channel=yourchannel` |
| **Fortnite Vertical** | `http://localhost:3000/overlays/fortnite-vertical.html?channel=yourchannel` |
| **8-bit Vertical** | `http://localhost:3000/overlays/8bits-vertical.html?channel=yourchannel` |
| **Win95 Vertical** | `http://localhost:3000/overlays/win95-vertical.html?channel=yourchannel` |
| **RetroWave Vertical** | `http://localhost:3000/overlays/retrowave-vertical.html?channel=yourchannel` |
| **Tactical Sci-Fi Vertical** | `http://localhost:3000/overlays/tactical-vertical.html?channel=yourchannel` |
| **Horde Vertical** | `http://localhost:3000/overlays/horde-vertical.html?channel=yourchannel` |
| **Fortnite Alerts Vertical** | `http://localhost:3000/overlays/alerta_fortnite_vertical.html?channel=yourchannel` |
| **8-bit Alerts Vertical** | `http://localhost:3000/overlays/alerta_retro_8_bits_vertical.html?channel=yourchannel` |
| **Win95 Alerts Vertical** | `http://localhost:3000/overlays/alerta_windows_95_vertical.html?channel=yourchannel` |
| **RetroWave Alerts Vertical** | `http://localhost:3000/overlays/alerta_retrowave_vertical.html?channel=yourchannel` |
| **Tactical Sci-Fi Alerts Vertical** | `http://localhost:3000/overlays/alerta_sci_fi_t_ctica_bsg_vertical.html?channel=yourchannel` |
| **Horde Alerts Vertical** | `http://localhost:3000/overlays/alerta_horda_vertical.html?channel=yourchannel` |

> Standalone HTML overlays only show real backend data. For preview with simulated data add `&demo=true` to the URL. When demo mode is active a permanent **🧪 DEMO MODE** badge is shown on screen.

To change the chat visual theme add `&theme=subnautica2`, `&theme=poe2`, `&theme=wow`, `&theme=alliance`, `&theme=8bits`, `&theme=win95`, `&theme=retrowave` or `&theme=tactical`. You can also use standalone HTML overlays per theme by selecting them from the control panel.

> In the transparent desktop overlay window, font, size and background mode settings can be adjusted from the top control bar (⚙) or from the Chat panel in the application. Settings persist between sessions.

> In **development mode** (`npm run dev`), use `localhost:5173` instead of `localhost:3000`. The Fortnite overlay needs the `&backend=http://localhost:3000` parameter in that case (it is added automatically when copying the URL from the panel).

> **Vertical overlays (1080×1920)** are designed for Twitch Dual Format / mobile-first streaming. Each follows the same themed aesthetic as its horizontal counterpart. Use a 1080×1920 Browser Source in OBS.

> **Socket.IO connection architecture in standalone overlays:** Fastify v5 intercepts all HTTP requests to `localhost:3000`, including `/socket.io/socket.io.js` (client) and Socket.IO polling POST requests, returning 404/401 before the Socket.IO handler can process them. The solution: (1) use only WebSocket transport (`transports: ['websocket']`) — Fastify does not intercept the HTTP upgrade that WebSocket uses, (2) serve the Socket.IO client from Vite (`/overlays/js/socket.io.js`) copied from `node_modules/socket.io/client-dist/`, and (3) assign `script.onload / onerror` **before** `script.src` to avoid race conditions with browser cache.

---

## 🏗️ Project Structure

```
StreamForge/
├── packages/
│   ├── backend/src/
│   │   ├── auth/          # Twitch OAuth + token-crypto + api-auth
│   │   ├── chat/          # IRC + commands
│   │   ├── socket/        # WebSocket (chat, join/leave channel)
│   │   ├── giveaways/     # Giveaways
│   │   ├── predictions/   # Twitch Predictions API
│   │   ├── eventsub/      # EventSub WebSocket
│   │   ├── hud/           # Stream HUD (Twitch API polling)
│   │   ├── timer/         # Countdown timer
│   │   ├── scoreboard/    # Tournament scoreboard
│   │   ├── mod/           # Moderation (chatters, timeout, ban)
│   │   ├── subathon/      # Extendable subathon timer
│   │   ├── activity/      # Channel activity feed
│   │   ├── commands/      # Custom chat commands
│   │   ├── tracker/       # Twitch Tracker (stats, streams, advice engine)
│   │   ├── achievements/  # Twitch Achievements (GQL API)
│   │   ├── security/      # Anti-Bots (follow bot detection, spam filter, auto-ban)
│   │   └── fortnite/      # Fortnite stats (config + API)
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/    # Dashboard (App, ChatPanel, TtsManager, etc.)
│   │   │   ├── contexts/      # React contexts (TtsContext)
│   │   │   ├── hooks/         # Custom hooks (useSocket, useAuthStatus)
│   │   │   ├── i18n/          # Translations (es, en, de, fr, it)
│   │   │   └── utils/         # Utilities (api, sounds, tts)
│   │   └── public/overlays/   # 51 standalone HTML overlays
│   │       ├── js/
│   │       │   └── socket.io.js  # Socket.IO client (non-minified, v4.8.3)
│   │       ├── subnautica2.html
│   │       ├── fortnite.html
│   │       ├── alerts.html
│   │       ├── subathon.html
│   │       ├── 8bits-* # Retro 8-bit (start, gameplay, just chatting, end)
│   │       ├── *win95* # Retro Win95 (start, gameplay, just chatting, end)
│   │       ├── *retrowave* # RetroWave (start, gameplay, just chatting, end)
│   │       ├── hud_* # Tactical Sci-Fi (gameplay, just chatting)
│   │       ├── pantalla_de_inicio_t_ctica.html
│   │       ├── pantalla_despedida_t_ctica.html
│   │       ├── *-vertical.html # 6 fullscreen vertical overlays (1080×1920)
│   │       ├── alerta_*_vertical.html # 6 alert vertical overlays (1080×1920)
│   │       └── ...
│   ├── desktop/           # Electron + SQLite
│   └── shared/            # Shared types (SubathonState, TimerState, FighterState, etc.)
├── STACK_TECNOLOGICO.md
└── README.md
```

---

## 🧭 Roadmap

### Upcoming features

| Feature | Description |
|---|---|
| **🎮 Stream Deck integration** | Native Elgato Stream Deck plugin to control StreamForger from physical buttons: start/stop Subathon, launch giveaway, ban user, change stream title and more |
| **🎤 Twitch EventSub enhancements** | More EventSub subscription types: Hype Train, Channel Points Automatic Rewards, Stream Online/Offline notifications with configurable actions |
| **🎬 TikTok clip management** | Create, edit and automatically export stream clips to TikTok with vertical format, auto-captions and scheduled publishing |

---

## 🤝 Contributing

1. Fork the project
2. Create a branch (`git checkout -b feature/my-feature`)
3. Commit (`git commit -m 'feat: add my feature'`)
4. Push (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## ☕ Support the project

[**buymeacoffee.com/jentrena**](https://buymeacoffee.com/jentrena)

---

## Star History

<a href="https://www.star-history.com/?repos=JuanEntrena18%2FStreamForge&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=JuanEntrena18/StreamForge&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=JuanEntrena18/StreamForge&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=JuanEntrena18/StreamForge&type=date&legend=top-left" />
 </picture>
</a>

---

## 📄 License

**AGPLv3** — See [LICENSE](LICENSE).
