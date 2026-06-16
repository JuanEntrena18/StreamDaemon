# StreamForge

**Open-source stream tools, forged for creators.**

StreamForge is a modular application for content creators that lets you manage Twitch channels with game-themed overlays, interactive giveaways, predictions, real-time chat, and a **Subathon** system that extends stream duration based on community rewards. Compatible with OBS Studio via Browser Source.

Available in two modes:
- **🖥️ Linux Server** — Multi-user, SQLite, production-ready
- **💻 Windows Desktop** — Portable app with Electron + SQLite, zero configuration

---

## ✨ Features

- **🎨 Standalone themed overlays** — Pure HTML+CSS+JS overlays (no React) for multiple games and styles: Subnautica 2, Fortnite, animated Alerts, Subathon, **Retro 8-bit**, **Retro Win95**, **RetroWave**, and **Tactical Sci-Fi**. Each includes Canvas particles, CSS animations, real-time event queue, and direct Socket.IO connection. Loaded as static files (`/overlays/`) in OBS.
- **🔴 Subathon** — An extendable live timer: viewers add time through subscriptions (+5 min), bits (+1 min per 100 bits), or channel point redemptions. Configurable max limit (12/24h). Control panel with start/pause/resume/stop, manual time addition, action history log, and a dedicated OBS overlay with countdown, progress bar, stats, and activity feed.
- **📡 Unified Stream Dashboard** — Combines a stream preview (embedded iframe), title/game editor, live stats (viewers, followers, subs, uptime), and a channel activity feed with filters — all in one screen.
- **💬 Live Chat** — Twitch IRC chat reading with real-time relay to overlays via Socket.IO. Includes message sending, reply (↩ @user), moderation (timeout/ban), role badges, and notification sound selector.
- **🎁 Interactive Giveaways** — `!giveaway` chat command to enter. Control panel with canvas spinner, spin duration selector (10/15/20s), and bulk name import. Dedicated overlay with live participant list and animated winner reveal.
- **📊 Twitch Predictions** — Integration with the Twitch Predictions API. Create polls from the control panel with automatic resolution.
- **📊 Stream HUD** — Live statistics panel (viewers, followers, subs, uptime, game) with auto-polling and an informative overlay.
- **⏱️ Timer** — Configurable countdown from the panel with start, pause, resume, and reset. Overlay with progress bar, urgent visual alert at 30s, and "Time's up" state.
- **🏆 Scoreboard & Fighter Overlay** — Live tournament scoreboard with players and scores. **Fighter Overlay**: fighting game HUD with animated health bars (spring physics), character portraits, rounds, server-side countdown timer, and WIN/KO announcements. Perfect for fighting games, 1v1 battle royales, or head-to-head competitions.
- **🔔 EventSub Notifications** — Follows, subs, re-subs, gifts, redemptions, and cheers in real-time via EventSub WebSocket, with animated on-screen overlay.
- **🌐 Social Media** — Animated overlay that rotates through the streamer's social links.
- **🛡️ Moderation** — Mod panel with timeout, ban, and unban. Includes a live list of users connected to the channel, filterable and clickable.
- **🤖 Custom Commands** — Manage chat commands: create, edit, enable/disable, with aliases and configurable cooldown.
- **🔒 Anti-Bots** — Automatic bot and spam protection inspired by **Sery Bot**. Follow bot detection via EventSub, chat spam filter by pattern, auto-ban through Helix API, and manual follower scan. Panel with stats, protection toggles, whitelist, and detection log with ban/unban/whitelist action buttons per detection.
- **🎮 Transparent Overlay Control** — Always-on-top window with toggleable click-through (Ctrl+Shift+T), background-only opacity, resizable (S/M/L), and drag bar.
- **🔐 Twitch OAuth** — Login with Twitch. Browser: Authorization Code Grant flow. Desktop: **Device Code Grant** (user sees a code in the app and enters it at twitch.tv/activate). Tokens persisted with auto-refresh. Full logout.
- **🖥️ Premium Dashboard** — Glassmorphism sidebar navigation, Framer Motion animations, violet/indigo palette, Twitch user badge, and real-time connection status.
- **📊 Fortnite Stats Overlay** — Configurable Fortnite overlay panel showing kills, wins, matches, K/D, and win rate from [fortnite-api.com](https://fortnite-api.com). Each user registers their own API Key from the panel. 5-min cache.
- **🧮 Bitrate Calculator** — Calculate the optimal bitrate with automatic recommendations based on your upload speed. Enter your upload (or measure it with fast.com) and the tool suggests the best resolution, FPS, and bitrate. Fine-tune manually with selectors for resolution (1080p/900p/720p/480p/custom), FPS (60/30/24), BPP, audio, and upload usage %. Shows "your connection vs. required" comparison and Twitch 6000 kbps limit warnings. Includes a step-by-step OBS configuration guide with the calculated values. No backend — fully client-side.
- **📋 Activity Feed** — Chronological log of follows, subs, bits, and raids with filters and file persistence.
- **🎮 Integrated Stream Editor** — Change title, game, and tags from the dashboard with game search and tag selector.

---

## 🔒 Security

StreamForge implements multiple security layers to protect Twitch credentials and the streamer account:

| ID | Measure | Status |
|---|---|---|
| **C-1** | SQLite database excluded from Git (`*.db` in `.gitignore`) | ✅ |
| **C-2** | OAuth tokens encrypted with **AES-256-GCM** before persisting to SQLite | ✅ |
| **A-1** | Local API token (128-bit) required on every POST request (`X-Local-Token`) | ✅ |
| **A-2** | OAuth `state` parameter generated with `crypto.randomBytes(16)` and verified with 10-min expiry | ✅ |
| **M-1** | Global rate limiting (100 req/min) + Socket.IO throttle (1 msg/1.5s) | ✅ |
| **M-2** | Input validation with **Zod** on all API routes | ✅ |
| **M-3** | CORS restricted to localhost | ✅ |
| **B-1** | Security headers: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` | ✅ |
| **B-2** | **Anti-Bots**: follow bot detection, spam filter, auto-ban, manual follower scan | ✅ |

---

## 🚀 Tech Stack

| Layer | Linux Server | Windows Desktop |
|---|---|---|
| **Frontend** | React 18 + Vite + Framer Motion + pure HTML/CSS/JS overlays | React 18 + Vite |
| **Backend** | Node.js + Fastify + Socket.IO + @twurple | Node.js + Fastify (embedded in Electron) |
| **Database** | SQLite (Prisma ORM) | SQLite (Prisma ORM) |
| **Runtime** | Node.js direct | Electron (.exe) |

---

## 📦 Installation

### Prerequisites

- Node.js 20+
- A registered application at [dev.twitch.tv/console](https://dev.twitch.tv/console)

### 🔧 Linux Server / Production

```bash
git clone https://github.com/JuanEntrena18/StreamForge.git
cd StreamForge
npm install
cp packages/backend/.env.example packages/backend/.env
# Edit with your TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET
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
|---|---|---|
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

> Standalone HTML overlays only show real data from the backend. For a preview with simulated data add `&demo=true` to the URL. When demo mode is active, a permanent **🧪 TEST MODE** badge is shown on screen.

For themed chat add `&theme=subnautica2`, `&theme=poe2`, `&theme=wow`, `&theme=alliance`, `&theme=8bits`, `&theme=win95`, `&theme=retrowave`, or `&theme=tactical`. You can also use standalone HTML overlays per theme by selecting them from the control panel.

> In **development mode** (`npm run dev`), use `localhost:5173` instead of `localhost:3000`. The Fortnite overlay needs the `&backend=http://localhost:3000` parameter in that case (added automatically when copying the URL from the panel).

---

## 🏗️ Project Structure

```
StreamForge/
├── packages/
│   ├── backend/src/
│   │   ├── auth/          # Twitch OAuth + token encryption + API auth
│   │   ├── chat/          # IRC chat + commands
│   │   ├── socket/        # WebSocket (chat, join/leave channel)
│   │   ├── giveaways/     # Giveaway system
│   │   ├── predictions/   # Twitch Predictions API
│   │   ├── eventsub/      # EventSub WebSocket listener
│   │   ├── hud/           # Stream HUD (Twitch API polling)
│   │   ├── timer/         # Countdown timer
│   │   ├── scoreboard/    # Tournament scoreboard
│   │   ├── mod/           # Moderation (chatters, timeout, ban)
│   │   ├── subathon/      # Subathon (extendable timer)
│   │   ├── activity/      # Channel activity feed
│   │   ├── commands/      # Custom chat commands
│   │   └── fortnite/      # Fortnite stats (config + API)
│   ├── frontend/
│   │   ├── src/components/  # Dashboard (App, Chat, Giveaway, etc.)
│   │   └── public/overlays/ # Standalone HTML overlays
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
│   │       └── ...
│   ├── desktop/           # Electron + SQLite
│   └── shared/            # Shared types (SubathonState, TimerState, FighterState, etc.)
├── STACK_TECNOLOGICO.md
├── README.md              # Spanish
└── README.en.md           # English
```

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
