# StreamForger

**Open-source stream tools, forged for creators.**

StreamForger is a modular application for content creators to manage Twitch channels with game-customizable overlays, interactive giveaways, predictions, real-time chat, and a **Subathon** system. Compatible with OBS Studio via Browser Source.

Available in two modes:
- **🖥️ Linux Server** — Multi-user, SQLite, production-ready
- **💻 Windows Desktop** — Portable app with Electron + SQLite, zero configuration

---

## ✨ Features

- **🎨 Themed standalone overlays** — Pure HTML+CSS+JS overlays (no React) for Subnautica 2, Fortnite, and animated alerts. Each includes Canvas particles, CSS animations, real-time event queue, and direct Socket.IO connection. Loaded as static files (`/overlays/`) in OBS.
- **🔴 Subathon** — Extendable countdown timer: viewers add time via subscriptions (+5min), bits (+1min per 100 bits), or channel rewards. Configurable max limit (12/24h). Control panel with start/pause/resume/stop, manual time addition, action history, and dedicated OBS overlay.
- **📡 Unified Stream Dashboard** — Stream preview (iframe embed with multi-parent support for Electron and browser), title/game editor, live stats (viewers, followers, subs, uptime), and filtered channel activity feed in one screen.
- **💬 Live Chat** — Twitch IRC chat relayed in real-time to overlays via Socket.IO. Includes message sending, reply (@user), moderation (timeout/ban), role badges, notification sound selector with volume control, **TTS (text-to-speech)** with voice selection, speed, and volume.
- **🎁 Interactive Giveaways** — `!sorteo` command in chat to enter. Control panel with canvas wheel, spin duration selector (10/15/20s), and bulk name import. Dedicated overlay with live participant list and animated winner reveal.
- **📊 Predictions** — Twitch Predictions API integration. Create polls from the control panel with automatic resolution.
- **📊 Stream HUD** — Live stats panel (viewers, followers, subs, uptime, game) with auto-polling and informative overlay.
- **📈 Twitch Tracker** — Historical channel stats with period selector (7d, 30d, 90d, all time). Aggregate metric cards (hours, peak viewers, followers), last stream summary with views, followers, subs, bits, and estimated revenue. Interactive SVG evolution chart by stream. Expandable recent streams list with per-stream metrics. Multi-factor advice engine (frequency, duration, audience, monetization) with optional Ollama integration for local AI.
- **⏱️ Timer** — Configurable countdown from the panel with start, pause, resume, reset. Overlay with progress bar, last-30s visual alert, and "Time's up" state.
- **🏆 Scoreboard** — Live tournament/competition scoreboard with player management, increment/decrement scoring, and visual progress bar.
- **🔔 EventSub Notifications** — Follows, subs, re-subs, gifts, redemptions, and cheers in real-time via EventSub WebSocket with animated screen overlay.
- **🌐 Social Media** — Animated rotating overlay showing streamer's social links.
- **🛡️ Moderation** — Mod panel with timeout, ban, unban and live connected-user list.
- **🤖 Commands** — Custom chat command management: create, edit, enable/disable, with aliases and cooldown.
- **🔒 Anti-Bots** — Automatic bot and spam protection inspired by **Sery Bot**. Follow bot detection via EventSub, chat spam filtering by patterns, auto-ban via Helix API, and manual follower scan. Dashboard with stats, protection toggles, whitelist, and detection log.
- **🎮 Transparent overlay control** — Always-on-top window with sidebar toggle, background mode (black/transparent), font selector (6 fonts), text size slider (10-24px), general opacity control (10-100%), always-visible control bar with drag handle and integrated settings panel. Settings persist in localStorage. Includes `OverlayErrorBoundary` that catches React errors and shows a visible message instead of leaving the window invisible.
- **🔐 OAuth Authentication** — Twitch login. Browser: Authorization Code Grant with redirect. Desktop: **Device Code Grant** (user enters a code at twitch.tv/activate). Auto-refreshing tokens. Full logout.
- **🖥️ Premium Dashboard** — Sidebar navigation, glassmorphism, Framer Motion animations, violet/indigo palette, Twitch user badge, real-time connection status.
- **📊 Fortnite Stats Overlay** — Configurable overlay panel showing kills, wins, matches, K/D, and win rate from [fortnite-api.com](https://fortnite-api.com). Per-user API key management. 5 min cache.
- **📋 Activity Feed** — Chronological log of follows, subs, bits, and raids with filters and file persistence.
- **🎮 Stream Editor** — Change title, game, and tags from the dashboard with game search and tag selector.

---

## 🔒 Security

StreamForger implements multiple security layers:

| ID | Measure | Status |
|---|---|---|
| **C-1** | SQLite database excluded from Git (`*.db` in `.gitignore`) | ✅ |
| **C-2** | OAuth tokens encrypted with **AES-256-GCM** before persisting to SQLite | ✅ |
| **A-1** | Local API token (128-bit) required on all POST requests (`X-Local-Token`) | ✅ |
| **A-2** | OAuth `state` parameter generated with `crypto.randomBytes(16)` and verified with 10 min expiry | ✅ |
| **M-1** | Global rate limiting (100 req/min) + Socket.IO throttle (1 msg/1.5s) | ✅ |
| **M-2** | Input validation with **Zod** on all API routes | ✅ |
| **M-3** | CORS restricted to localhost | ✅ |
| **B-1** | Security headers: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` | ✅ |
| **B-2** | **Anti-Bots**: follow bot detection, spam filter, auto-ban, and manual follower scan | ✅ |

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
- A registered app at [dev.twitch.tv/console](https://dev.twitch.tv/console)

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

Add a **Browser Source** in OBS using these URLs:

| Overlay | URL |
|---|---|
| Chat | `http://localhost:3000/overlay.html?mode=chat&channel=yourchannel` |
| Giveaways | `http://localhost:3000/overlay.html?mode=giveaway&channel=yourchannel` |
| Predictions | `http://localhost:3000/overlay.html?mode=prediction&channel=yourchannel` |
| Social Media | `http://localhost:3000/overlay.html?mode=social` |
| Stream HUD | `http://localhost:3000/overlay.html?mode=hud&channel=yourchannel` |
| Timer | `http://localhost:3000/overlay.html?mode=timer&channel=yourchannel` |
| Scoreboard | `http://localhost:3000/overlay.html?mode=scoreboard&channel=yourchannel` |
| **Subathon** | `http://localhost:3000/overlays/subathon.html?channel=yourchannel` |
| **Subnautica 2 (full)** | `http://localhost:3000/overlays/subnautica2.html?channel=yourchannel` |
| **Fortnite (full)** | `http://localhost:3000/overlays/fortnite.html?channel=yourchannel&epic=yourEpic&mode=solo` |
| **Animated Alerts** | `http://localhost:3000/overlays/alerts.html?channel=yourchannel` |

> Standalone HTML overlays only show real data from the backend. For preview with simulated data add `&demo=true`. A permanent **🧪 TEST MODE** badge is shown when demo is active.

Add `&theme=subnautica2`, `&theme=poe2`, `&theme=wow`, or `&theme=alliance` to change the chat visual theme.

> In **development mode** (`npm run dev`), use `localhost:5173` instead of `localhost:3000`. The Fortnite overlay needs `&backend=http://localhost:3000` in that case (auto-added when copying the URL from the panel).

---

## 🏗️ Project Structure

```
StreamForge/
├── packages/
│   ├── backend/src/
│   │   ├── auth/          # OAuth Twitch
│   │   ├── chat/          # IRC + commands
│   │   ├── socket/        # WebSocket
│   │   ├── giveaways/     # Giveaways
│   │   ├── predictions/   # Predictions
│   │   ├── eventsub/      # EventSub WS
│   │   ├── hud/           # Stream HUD
│   │   ├── timer/         # Timer
│   │   ├── scoreboard/    # Scoreboard
│   │   ├── mod/           # Moderation
│   │   ├── subathon/      # Subathon
│   │   ├── activity/      # Activity feed
│   │   ├── commands/      # Custom commands
│   │   ├── tracker/       # Twitch Tracker (stats, streams, advice engine)
│   │   ├── security/      # Anti-Bots (follow bot detection, spam filter, auto-ban)
│   │   └── fortnite/      # Fortnite stats
│   ├── frontend/
│   │   ├── src/components/  # Dashboard
│   │   └── public/overlays/ # Standalone HTML overlays
│   │       ├── subnautica2.html
│   │       ├── fortnite.html
│   │       ├── alerts.html
│   │       └── subathon.html
│   ├── desktop/           # Electron + SQLite
│   └── shared/            # Shared types
├── STACK_TECNOLOGICO.md
├── README.md
└── README_en.md
```

---

## 🧭 Roadmap

### Upcoming features

| Feature | Description |
|---|---|
| **🌍 Multi-language translation** | Frontend translated to English, French, German, and Italian with automatic browser language detection |
| **🎮 Stream Deck integration** | Native Elgato Stream Deck plugin to control StreamForger from physical buttons: start/stop Subathon, launch giveaways, ban user, change stream title, and more |

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

## 📄 License

**AGPLv3** — See [LICENSE](LICENSE).
