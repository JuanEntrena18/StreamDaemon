# StreamForger

**Open-source stream tools, forged for creators.**

StreamForger es una aplicación modular para creadores de contenido que permite gestionar canales de Twitch con overlays personalizados por juego, sorteos interactivos, predicciones, visualización del chat en tiempo real y un sistema de **Subathon** para ampliar la duración del directo con recompensas de la comunidad. Compatible con OBS Studio vía Browser Source.

Disponible en dos modos:
- **🖥️ Servidor Linux** — Multi-usuario, SQLite, ideal para producción
- **💻 Escritorio Windows** — App portátil con Electron + SQLite, cero configuración

---

## ✨ Características

- **🎨 Overlays temáticos independientes** — 39 overlays standalone en HTML+CSS+JS puro (sin React) para múltiples juegos y estilos: Subnautica 2, Fortnite, Alertas animadas, Subathon, **Retro 8-bits**, **Retro Win95**, **RetroWave** y **Tactical Sci-Fi**. Cada overlay incluye Canvas de partículas, animaciones CSS, cola de eventos en tiempo real y conexión Socket.IO con transporte WebSocket-only. El cliente Socket.IO se sirve desde `/overlays/js/socket.io.js` (Vite) para evitar que Fastify v5 intercepte la descarga. Se cargan como archivos estáticos (`/overlays/`) en OBS.
- **🔴 Subathon** — Temporizador ampliable en directo: los espectadores añaden tiempo con suscripciones (+5 min), bits (+1 min por cada 100 bits) o recompensas de canal. Límite máximo configurable (12/24h). Panel de control con inicio/pausa/reanudar/detener, añadir tiempo manual, historial de acciones y overlay OBS dedicado con cuenta atrás, barra de progreso, estadísticas y feed de actividad.
- **📡 Gestor del Stream unificado** — Dashboard que combina vista previa del stream (iframe embed con soporte multi-parent para Electron y navegador), editor de título/juego, estadísticas en vivo (viewers, followers, subs, uptime) y feed de actividad del canal con filtros — todo en una sola pantalla.
- **💬 Chat en vivo** — Lectura del chat de Twitch vía IRC con reenvío en tiempo real a los overlays mediante Socket.IO. Incluye envío de mensajes, reply (↩ @usuario), moderación (timeout/ban), badges por rol, selector de sonido de notificación con control de volumen, **TTS (text-to-speech)** con selección de voz, velocidad y volumen.
- **🎁 Sorteos interactivos** — Comando `!sorteo` en el chat para participar. Panel de control con ruleta canvas, selector de duración del giro (10/15/20s) e importación masiva de nombres. Overlay dedicado con lista de participantes en vivo y ruleta animada con ganador gigante.
- **📊 Predicciones** — Integración con la API de Predicciones de Twitch. Creación de encuestas desde el panel de control con resolución automática.
- **📊 Stream HUD** — Panel de estadísticas en vivo (viewers, followers, subs, uptime, game) con polling automático y overlay informativo.
- **📈 Twitch Tracker** — Estadísticas históricas del canal con selector de período (7d, 30d, 90d, all time). Cards de métricas agregadas (horas, pico de viewers, seguidores), resumen del último stream con visualizaciones, seguidores, suscripciones, bits e ingresos estimados. Gráfico SVG interactivo de evolución por stream. Lista expandible de streams recientes con métricas detalladas. Motor de consejos inteligente multi-factor (frecuencia, duración, audiencia, monetización) con integración opcional de Ollama para IA local.
- **⏱️ Temporizador** — Cuenta regresiva configurable desde el panel con inicio, pausa, reanudación y reset. Overlay con barra de progreso, alerta visual los últimos 30s y estado "Tiempo cumplido".
- **🏆 Scoreboard & Fighter Overlay** — Marcador en vivo para torneos con jugadores y puntuaciones. **Fighter Overlay**: overlay de pelea con barras de vida animadas (spring physics), retratos de personaje, rondas, temporizador con cuenta regresiva del servidor y anuncios de WIN/KO. Ideal para juegos de lucha, battle royale 1v1 o competencias head-to-head.
- **🔔 Notificaciones EventSub** — Follows, subs, re-suscripciones, gifts, redemptions y cheers en tiempo real vía EventSub WebSocket, con overlay animado en pantalla.
- **🌐 Redes sociales** — Overlay animado que muestra las redes del streamer de forma rotativa.
- **🛡️ Moderación** — Panel de moderación con timeout, ban y unban. Incluye lista de usuarios conectados al canal en ese momento con selección clickeable.
- **🤖 Comandos** — Gestión de comandos personalizados del chat: crear, editar, habilitar/deshabilitar, con alias y cooldown configurable.
- **🔒 Anti-Bots** — Protección automática contra bots y spam inspirada en **Sery Bot**. Detección de follow bots vía EventSub, filtro de spam en chat IRC por patrones, auto-ban mediante Helix API y escaneo manual de seguidores. Panel con estadísticas, toggles de protección, lista blanca y registro de detecciones con botones de banear/desbanear/whitelist por detección.
- **🎮 Control de overlay transparente** — Ventana always-on-top con toggle desde la sidebar, modo fondo (negro/transparente), selector de tipografía (6 fuentes), ajuste de tamaño de texto (10-24px), control de opacidad general (10-100%), barra de control siempre visible con zona de arrastre y panel de ajustes integrado. Los cambios persisten en localStorage. Incluye `OverlayErrorBoundary` que captura errores de React y muestra un mensaje visible en lugar de dejar la ventana invisible.
- **🔐 Autenticación OAuth** — Login con Twitch. En navegador: flujo Authorization Code Grant con redirect. En escritorio: flujo **Device Code Grant** (el usuario ve un código en la app y lo ingresa en twitch.tv/activate). Tokens persistidos con refresco automático. Logout completo.
- **🖥️ Dashboard premium** — Interfaz con sidebar de navegación, glassmorphism, animaciones Framer Motion, paleta violeta/índigo, badge de usuario Twitch y estado de conexión en tiempo real.
- **📊 Fortnite Stats Overlay** — Panel configurable en el overlay de Fortnite que muestra kills, wins, partidas, K/D y win rate desde la API de [fortnite-api.com](https://fortnite-api.com). Cada usuario registra su propia API Key desde el panel. Cache de 5 min.
- **🧮 Calculadora de Bitrate** — Calcula el bitrate óptimo para tu stream con recomendación automática según tu velocidad de subida. Introduce tu upload (o mídelo con fast.com) y la herramienta sugiere la mejor resolución, FPS y bitrate. Ajuste manual fino con selectores de resolución (1080p/900p/720p/480p/personalizada), FPS (60/30/24), BPP, audio y % de uso de subida. Muestra comparación "tu conexión vs. lo necesario" y advertencia del límite de 6000 kbps de Twitch. Incluye guía paso a paso de configuración en OBS con los valores calculados. Sin backend — 100% client-side.
- **📋 Feed de actividad** — Registro cronológico de follows, subs, bits y raids en el canal con filtros y persistencia en archivo.
- **🎮 Editor de stream integrado** — Cambia título, juego y tags del directo desde el dashboard con buscador de juegos y selector de tags.

---

## 🔒 Seguridad

StreamForger implementa múltiples capas de seguridad para proteger las credenciales de Twitch y la cuenta del streamer:

| ID | Medida | Estado |
|---|---|---|
| **C-1** | Base de datos SQLite excluida del repositorio Git (`*.db` en `.gitignore`) | ✅ |
| **C-2** | Tokens OAuth cifrados con **AES-256-GCM** antes de persistir en SQLite | ✅ |
| **A-1** | Token de API local (128 bits) requerido en toda petición POST (`X-Local-Token`) | ✅ |
| **A-2** | Parámetro `state` OAuth generado con `crypto.randomBytes(16)` y verificado con expiración de 10 min | ✅ |
| **M-1** | Rate limiting global (100 req/min) + throttle Socket.IO (1 msg/1.5s) | ✅ |
| **M-2** | Validación de entrada con **Zod** en todas las rutas de API | ✅ |
| **M-3** | CORS restringido a localhost | ✅ |
| **B-1** | Cabeceras de seguridad: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` | ✅ |
| **B-2** | **Anti-Bots**: detección de follow bots, filtro de spam, auto-ban y escaneo manual de seguidores | ✅ |

---

## 🚀 Stack Tecnológico

| Capa | Servidor Linux | Escritorio Windows |
|---|---|---|
| **Frontend** | React 18 + Vite + Framer Motion + overlays HTML/CSS/JS puros | React 18 + Vite |
| **Backend** | Node.js + Fastify + Socket.IO + @twurple | Node.js + Fastify (embebido en Electron) |
| **Base de datos** | SQLite (Prisma ORM) | SQLite (Prisma ORM) |
| **Runtime** | Node.js directo | Electron (.exe) |

---

## 📦 Instalación

### Prerrequisitos

- Node.js 20+
- Una aplicación registrada en [dev.twitch.tv/console](https://dev.twitch.tv/console)

### 🔧 Servidor Linux / Producción

```bash
git clone https://github.com/JuanEntrena18/StreamForge.git
cd StreamForge
npm install
cp packages/backend/.env.example packages/backend/.env
# Editar con TWITCH_CLIENT_ID y TWITCH_CLIENT_SECRET
npm run build
npm run start -w packages/backend
```

Panel: `http://localhost:3000` · API: `http://localhost:3000`

### 💻 Desarrollo

```bash
npm install
cp packages/backend/.env.example packages/backend/.env
npm run dev
```

Panel (Vite): `http://localhost:5173` · API: `http://localhost:3000`

---

## 🎮 Overlays para OBS

Agrega un navegador **Browser Source** en OBS y usa las siguientes URLs:

| Overlay | URL |
|---|---|
| Chat | `http://localhost:3000/overlay.html?mode=chat&channel=tucanal` |
| Sorteos | `http://localhost:3000/overlay.html?mode=giveaway&channel=tucanal` |
| Predicciones | `http://localhost:3000/overlay.html?mode=prediction&channel=tucanal` |
| Redes Sociales | `http://localhost:3000/overlay.html?mode=social` |
| Stream HUD | `http://localhost:3000/overlay.html?mode=hud&channel=tucanal` |
| Temporizador | `http://localhost:3000/overlay.html?mode=timer&channel=tucanal` |
| Scoreboard | `http://localhost:3000/overlay.html?mode=scoreboard&channel=tucanal` |
| **Fighter** | `http://localhost:3000/overlay.html?mode=fighter&channel=tucanal` |
| **Subathon** | `http://localhost:3000/overlays/subathon.html?channel=tucanal` |
| **Subnautica 2 (completo)** | `http://localhost:3000/overlays/subnautica2.html?channel=tucanal` |
| **Fortnite (completo)** | `http://localhost:3000/overlays/fortnite.html?channel=tucanal&epic=tuEpic&mode=solo` |
| **Alertas animadas** | `http://localhost:3000/overlays/alerts.html?channel=tucanal` |
| **8-bits (tema)** | `http://localhost:5173/overlays/8bits-pantalla_comienzo.html?backend=http://localhost:3000&channel=tucanal` |
| **Win95 (tema)** | `http://localhost:5173/overlays/pantalla_comienzo_win95.html?backend=http://localhost:3000&channel=tucanal` |
| **RetroWave (tema)** | `http://localhost:5173/overlays/pantalla_comienzo_retrowave.html?backend=http://localhost:3000&channel=tucanal` |
| **Tactical Sci-Fi (tema)** | `http://localhost:5173/overlays/pantalla_de_inicio_t_ctica.html?backend=http://localhost:3000&channel=tucanal` |

> Los overlays HTML independientes solo muestran datos reales del backend. Para vista previa con datos simulados añade `&demo=true` a la URL. Cuando el modo demo está activo se muestra un badge **🧪 MODO PRUEBA** permanente en pantalla.

Para cambiar el tema visual del chat añade `&theme=subnautica2`, `&theme=poe2`, `&theme=wow`, `&theme=alliance`, `&theme=8bits`, `&theme=win95`, `&theme=retrowave` o `&theme=tactical`. También puedes usar overlays HTML independientes por tema seleccionándolos desde el panel de control.

> En la ventana transparente de escritorio, los ajustes de tipografía, tamaño y modo de fondo se pueden modificar desde la barra de control superior (⚙) o desde el panel de Chat en la aplicación. La configuración persiste entre sesiones.

> En **modo desarrollo** (`npm run dev`), usa `localhost:5173` en lugar de `localhost:3000`. El overlay de Fortnite necesita el parámetro `&backend=http://localhost:3000` en ese caso (se añade automáticamente al copiar la URL desde el panel).

> **Arquitectura de conexión Socket.IO en overlays standalone:** Fastify v5 intercepta todas las peticiones HTTP a `localhost:3000`, incluyendo `/socket.io/socket.io.js` (cliente) y los POST de polling de Socket.IO, devolviendo 404/401 antes de que el handler de Socket.IO pueda procesarlos. La solución: (1) usar solo transporte WebSocket (`transports: ['websocket']`) — Fastify no intercepta el upgrade HTTP que WebSocket utiliza, (2) servir el cliente Socket.IO desde Vite (`/overlays/js/socket.io.js`) copiado de `node_modules/socket.io/client-dist/`, y (3) asignar `script.onload / onerror` **antes** de `script.src` para evitar race conditions con la caché del navegador.

---

## 🏗️ Estructura del proyecto

```
StreamForge/
├── packages/
│   ├── backend/src/
│   │   ├── auth/          # OAuth Twitch + token-crypto + api-auth
│   │   ├── chat/          # IRC + comandos
│   │   ├── socket/        # WebSocket (chat, join/leave channel)
│   │   ├── giveaways/     # Sorteos
│   │   ├── predictions/   # Predicciones Twitch API
│   │   ├── eventsub/      # EventSub WebSocket
│   │   ├── hud/           # Stream HUD (polling Twitch API)
│   │   ├── timer/         # Temporizador (cuenta regresiva)
│   │   ├── scoreboard/    # Scoreboard (marcador torneos)
│   │   ├── mod/           # Moderación (chatters, timeout, ban)
│   │   ├── subathon/      # Subathon (temporizador ampliable)
│   │   ├── activity/      # Feed de actividad del canal
│   │   ├── commands/      # Comandos personalizados del chat
│   │   ├── tracker/       # Twitch Tracker (stats, streams, advice engine)
│   │   ├── security/      # Anti-Bots (follow bot detection, spam filter, auto-ban)
│   │   └── fortnite/      # Fortnite stats (config + API)
│   ├── frontend/
│   │   ├── src/components/  # Dashboard (App, Chat, Giveaway, etc.)
│   │   └── public/overlays/ # 39 overlays HTML independientes
│   │       ├── js/
│   │       │   └── socket.io.js  # Socket.IO client (non-minified, v4.8.3)
│   │       ├── subnautica2.html
│   │       ├── fortnite.html
│   │       ├── alerts.html
│   │       ├── subathon.html
│   │       ├── 8bits-* # Retro 8-bits (start, gameplay, just chatting, end)
│   │       ├── *win95* # Retro Win95 (start, gameplay, just chatting, end)
│   │       ├── *retrowave* # RetroWave (start, gameplay, just chatting, end)
│   │       ├── hud_* # Tactical Sci-Fi (gameplay, just chatting)
│   │       ├── pantalla_de_inicio_t_ctica.html
│   │       ├── pantalla_despedida_t_ctica.html
│   │       └── ...
│   ├── desktop/           # Electron + SQLite
│   └── shared/            # Tipos compartidos (SubathonState, TimerState, FighterState, etc.)
├── STACK_TECNOLOGICO.md
└── README.md
```

---

## 🧭 Roadmap

### Próximas funcionalidades

| Funcionalidad | Descripción |
|---|---|
| **🌍 Traducción multi-idioma** | Frontend traducido a inglés, francés, alemán e italiano con detección automática del idioma del navegador |
| **🎮 Integración con Stream Deck** | Plugin nativo para Elgato Stream Deck que permite controlar StreamForger desde los botones físicos: iniciar/detener Subathon, lanzar sorteo, banear usuario, cambiar título del stream y más |
| **🎬 Gestión y exportación de clips a TikTok** | Creación, edición y exportación automática de clips del stream a TikTok con formato vertical, subtítulos automáticos y programación de publicaciones |

---

## 🤝 Contribuir

1. Haz fork del proyecto
2. Crea una rama (`git checkout -b feature/mi-feature`)
3. Haz commit (`git commit -m 'feat: añadir mi feature'`)
4. Haz push (`git push origin feature/mi-feature`)
5. Abre un Pull Request

---

## ☕ Apoya el proyecto

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

## 📄 Licencia

**AGPLv3** — Ver [LICENSE](LICENSE).
