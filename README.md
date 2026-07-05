<div align="center">

# ⚒️ StreamForge

**Open-source stream tools, forged for creators.**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Twitch](https://img.shields.io/badge/Twitch-API-9146FF?logo=twitch&logoColor=white)](https://dev.twitch.tv)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-lightgrey)]()

*A free, self-hosted streaming toolkit with 57+ themed overlays, real-time chat, giveaways, predictions, subathons, anti-bot protection, and analytics — all in one app.*

[**Download for Windows**](https://github.com/JuanEntrena18/StreamForge/releases) · [**Self-Host on Linux**](#-quick-start) · [**Support the Project**](https://buymeacoffee.com/jentrena)

</div>

---

## Why StreamForge?

Most streaming tools lock you into paid subscriptions, closed ecosystems, or cloud-only services. StreamForge is **free, open-source, and runs locally** — your data never leaves your machine.

| | StreamForge | StreamElements | Streamlabs | Meld Studio |
|---|:---:|:---:|:---:|:---:|
| **Free & Open Source** | ✅ | ❌ | ❌ | ❌ |
| **Runs Locally** | ✅ | ❌ | ✅ | ✅ |
| **No Account Required** | ✅ | ❌ | ❌ | ❌ |
| **57+ Themed Overlays** | ✅ | — | — | — |
| **Built-in Anti-Bots** | ✅ | ❌ | ✅ | ❌ |
| **Custom Commands** | ✅ | ✅ | ✅ | ❌ |
| **Subathon System** | ✅ | ✅ | ✅ | ❌ |

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎨 Overlays & Themes
- **57 standalone overlays** — pure HTML/CSS/JS, no framework needed
- 8 themed styles: Subnautica 2, Fortnite, Retro 8-bit, Win95, RetroWave, Tactical Sci-Fi, WoW Horde/Alliance
- Start screens, gameplay, just chatting, BRB, and farewell screens
- 12 vertical overlays (1080×1920) for mobile/dual-format streaming
- Animated alerts for follows, subs, raids, cheers, and redemptions
- All overlays connect via Socket.IO for real-time data
- **Interactive in-app preview** with dynamic scaling and simulated Demo Mode data

</td>
<td width="50%">

### 💬 Chat & Interaction
- Live Twitch IRC chat with real-time relay to overlays
- TTS (text-to-speech) with voice selection, speed, and filters
- Custom chat commands with aliases and cooldown
- Auto-greeting for new chatters
- Interactive giveaways with weighted tickets and animated wheel
- Twitch Predictions with automatic resolution

</td>
</tr>
<tr>
<td>

### 📊 Analytics & Tools
- KPI dashboard with historical stats (7d, 30d, 90d, all-time)
- Twitch Achievements tracking (Affiliate, Partner milestones)
- Stream HUD with live viewer/follower/sub counts
- Scoreboard & Fighter Overlay for tournaments and 1v1s
- Fortnite Stats Overlay (kills, wins, K/D)
- Bitrate Calculator with OBS configuration guide

</td>
<td>

### 🛡️ Security & Moderation
- OAuth tokens encrypted with **AES-256-GCM**
- Local API authentication on every request
- Anti-bot protection: follow bots, spam filter, auto-ban
- Moderation panel with timeout, ban, and chatter list
- Rate limiting and input validation (Zod) on all routes
- CSP headers, CORS whitelist, and secure defaults

</td>
</tr>
</table>

**Plus:** Live Overlay Preview · Subathon timer · EventSub notifications · Social media overlay · Configurable countdown timer · Stream title/game editor · Transparent overlay window · Global command palette (`Ctrl+K`) · Keyboard shortcuts · 5 languages (EN, ES, FR, DE, IT) · Lazy-loaded UI for fast startup

---

## 🚀 Quick Start

### Windows Desktop — Zero Configuration

Download the latest `.exe` from [**Releases**](https://github.com/JuanEntrena18/StreamForge/releases), run it, and you're live.

### Linux Server — Self-Hosted

```bash
git clone https://github.com/JuanEntrena18/StreamForge.git
cd StreamForge
npm install
cp packages/backend/.env.example packages/backend/.env
# Add your TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET
npm run build
npm run start -w packages/backend
```

Open `http://localhost:3000` in your browser.

### Development

```bash
npm install
cp packages/backend/.env.example packages/backend/.env
npm run dev
```

Frontend: `http://localhost:5173` · API: `http://localhost:3000`

> **Prerequisite:** Node.js 20+ and a [Twitch Developer Application](https://dev.twitch.tv/console).

---

## 🎮 Using Overlays in OBS

Add a **Browser Source** in OBS pointing to the overlay URL. Replace `yourchannel` with your Twitch username.

**Core overlays:**

| Overlay | URL |
|---|---|
| Chat | `http://localhost:3000/overlay.html?mode=chat&channel=yourchannel` |
| Giveaway | `http://localhost:3000/overlay.html?mode=giveaway&channel=yourchannel` |
| Predictions | `http://localhost:3000/overlay.html?mode=prediction&channel=yourchannel` |
| Stream HUD | `http://localhost:3000/overlay.html?mode=hud&channel=yourchannel` |
| Timer | `http://localhost:3000/overlay.html?mode=timer&channel=yourchannel` |
| Scoreboard | `http://localhost:3000/overlay.html?mode=scoreboard&channel=yourchannel` |
| Fighter | `http://localhost:3000/overlay.html?mode=fighter&channel=yourchannel` |
| Social Media | `http://localhost:3000/overlay.html?mode=social` |

**Themed overlays** — each theme includes start, gameplay, chatting, BRB, farewell, chat, and alert screens:

| Theme | Example URL |
|---|---|
| Subnautica 2 | `http://localhost:3000/overlays/subnautica2.html?channel=yourchannel` |
| Fortnite | `http://localhost:3000/overlays/fortnite.html?channel=yourchannel` |
| Animated Alerts | `http://localhost:3000/overlays/alerts.html?channel=yourchannel` |
| Subathon | `http://localhost:3000/overlays/subathon.html?channel=yourchannel` |
| Retro 8-bit | Select from the Overlays panel in the dashboard |
| Win95 | Select from the Overlays panel in the dashboard |
| RetroWave | Select from the Overlays panel in the dashboard |
| Tactical Sci-Fi | Select from the Overlays panel in the dashboard |

> **Chat themes:** Append `&theme=subnautica2`, `&theme=wow`, `&theme=8bits`, `&theme=win95`, `&theme=retrowave`, or `&theme=tactical` to the chat overlay URL.
>
> **Demo mode:** Add `&demo=true` to any overlay URL to preview with simulated data.
>
> **Vertical overlays:** Use 1080×1920 Browser Sources for mobile-first/dual-format streaming. Available for all themes.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 · Vite · Framer Motion · CSS Modules |
| **Backend** | Node.js · Fastify · Socket.IO · Twurple |
| **Database** | SQLite · Prisma ORM |
| **Desktop** | Electron (Windows .exe) |
| **Overlays** | Pure HTML/CSS/JS · Socket.IO WebSocket |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+1` – `Ctrl+9` | Navigate sidebar panels |
| `Ctrl+Shift+C` | Jump to Chat |
| `Ctrl+K` | Command palette |
| `Escape` | Close modal |
| `F12` | Toggle DevTools (Electron) |

---

## 🧭 Roadmap

| Feature | Status |
|---|---|
| 🎨 Visual Overlay Builder (drag & drop) | Planned |
| 🤖 AI Overlay Generator | Planned |
| 🎮 Stream Deck integration | Planned |
| 🎬 TikTok clip auto-export | Planned |

---

## 🤝 Contributing

1. Fork the repository
2. Create your branch — `git checkout -b feature/my-feature`
3. Commit your changes — `git commit -m 'feat: add my feature'`
4. Push — `git push origin feature/my-feature`
5. Open a Pull Request

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

<div align="center">

**☕ Support the project** — [buymeacoffee.com/jentrena](https://buymeacoffee.com/jentrena)

**📄 License** — [AGPLv3](LICENSE)

Made with 💜 for the streaming community

</div>
