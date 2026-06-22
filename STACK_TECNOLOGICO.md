# StreamForge — Stack Tecnológico

## Visión General

Aplicación modular para creadores de contenido que permite gestionar el canal de Twitch con overlays personalizados por juego, sorteos, predicciones, interacción con chat y sistema de Subathon. Compatible con OBS vía Browser Source.

---

## Frontend (Dashboard + Overlays)

| Tecnología | Versión | Propósito |
|---|---|---|
| **React 18** | ^18.2 | Librería UI para construir el dashboard y los overlays React |
| **TypeScript** | ^5.4 | Tipado estático en todo el frontend |
| **Vite** | ^5.x | Bundler dev/build ultrarrápido |
| **Framer Motion** | ^11.x | Animaciones de transición entre tabs, estados activos, badges, cards |
| **Socket.IO Client** | ^4.x | Comunicación en tiempo real con el backend |
| **@twurple/chat** | ^6.x | Cliente IRC para leer el chat de Twitch (en backend, expuesto vía WS al frontend) |
| **@twurple/eventsub-ws** | ^7.x | EventSub WebSocket (follows, subs, gifts, redemptions, cheers) |
| **Inter (Google Fonts)** | — | Tipografía principal del dashboard |
| **Web Speech API** | — | Text-to-Speech integrado en el panel de chat con selección de voz, velocidad y volumen |

### Overlays independientes (HTML/CSS/JS puro)

39 overlays standalone en `public/overlays/` que se sirven como archivos estáticos. No requieren React ni Vite — conexión directa a Socket.IO con transporte WebSocket-only y cliente servido desde `public/overlays/js/socket.io.js`:

| Overlay | Archivo | Descripción |
|---|---|---|
| **Subnautica 2** | `subnautica2.html` | HUD completo: Canvas partículas bioluminiscentes, scan-line, esquinas decorativas, medidor de profundidad, sonar pulsante, cards de stats, chat en vivo, cola de alertas con animación por tipo, barra inferior con título/juego, reloj, badge de actividad reciente. Demo con `?demo=true` |
| **Fortnite** | `fortnite.html` | HUD hexagonal: stat-rows con iconos SVG, partículas, cuadrícula, cola de alertas, uptime, badge de último follow, barra inferior. **Panel de stats** configurabl (kills, wins, partidas, K/D, win rate) desde fortnite-api.com con API key propia y selector de modo (SOLO/DUO/TRIO/SQUAD). Refresh cada 5 min independiente del socket. Demo con `?demo=true` |
| **Alertas** | `alerts.html` | Alertas dedicadas: 7 tipos (follow/sub/resub/gift/bits/raid/canjeo), cola con animación bounce+shimmer+glow, Canvas confetti burst por tipo, colores específicos, botones de test. Demo con `?demo=true` |
| **Subathon** | `subathon.html` | Temporizador ampliable: cuenta atrás de 7rem con glow rojo y pulso crítico, barra de progreso con shimmer, indicador de estado, stats (tiempo añadido, acciones, subs, bits), feed lateral de actividad, uptime, barra inferior. Demo con `?demo=true` |
| **Retro 8-bits · Comienzo** | `8bits-pantalla_comienzo.html` | Pantalla de inicio pixelada con escenario retro, bordes NES, cuenta atrás y zona para logo |
| **Retro 8-bits · Gameplay** | `8bits-overlay_gameplay_tv.html` | Monitor CRT con scanlines, webcam pixelada, chat en vivo y notificaciones de Twitch (follows, subs, cheers, redemptions) |
| **Retro 8-bits · Just Chatting** | `8bits-overlay_just_chatting.html` | Estilo RPG con caja de diálogo, chat en vivo con nombre/color y eventos en tiempo real |
| **Retro 8-bits · Despedida** | `8bits-pantalla_despedida.html` | Pantalla de cierre con estrella fugaz pixelada y créditos estilo NES |
| **Retro Win95 · Comienzo** | `pantalla_comienzo_win95.html` | Pantalla de inicio estilo Windows 95 con escaneo CRT y botones retro |
| **Retro Win95 · Gameplay** | `overlay_gameplay_win95.html` | Ventanas clásicas Win95, webcam, chat mIRC en vivo con eventos de Twitch |
| **Retro Win95 · Just Chatting** | `overlay_just_chatting_win95.html` | Interfaz Windows 95 con chat tipo mIRC32, logo y notificaciones |
| **Retro Win95 · Despedida** | `pantalla_despedida_win95.html` | Pantalla de apagado estilo Windows con efectos CRT |
| **RetroWave · Comienzo** | `pantalla_comienzo_retrowave.html` | Sol radiante, cuadrícula 3D en perspectiva, cuenta atrás neón magenta/cyan |
| **RetroWave · Gameplay** | `overlay_gameplay_retrowave.html` | Bordes neón, retícula, chat con efecto glitch y eventos Twitch en tiempo real |
| **RetroWave · Just Chatting** | `overlay_just_chatting_retrowave.html` | Diseño magenta/cyan con logo pulsante, chat y notificaciones |
| **RetroWave · Despedida** | `pantalla_despedida_retrowave.html` | Cuadrícula 3D superior e inferior, enlaces sociales neón |
| **Tactical Sci-Fi · Comienzo** | `pantalla_de_inicio_t_ctica.html` | Radar DRADIS giratorio, panel octogonal BSG, cuenta atrás táctica |
| **Tactical Sci-Fi · Gameplay** | `hud_gameplay_monitor.html` | Retícula de puntería, telemetría animada, chat de comunicaciones con eventos Twitch |
| **Tactical Sci-Fi · Just Chatting** | `hud_just_chatting.html` | Parche de misión giratorio, visor táctico, registro de comunicaciones en vivo |
| **Tactical Sci-Fi · Despedida** | `pantalla_despedida_t_ctica.html` | Alerta roja, panel de frecuencias de comunicación, estilo BSG |

> Todos los overlays standalone solo muestran datos reales del backend. El modo demo (`?demo=true`) activa un badge **🧪 MODO PRUEBA** permanente en pantalla y datos simulados. Sin `?demo=true` y sin backend, todo se muestra en cero/`--`.

### Componentes del Overlay

| Componente | Descripción |
|---|---|
| `OverlayContainer.tsx` | Punto de entrada del overlay React. Lee parámetros URL (`mode`, `theme`, `channel`), gestiona ajustes de usuario (tipografía, tamaño, fondo) con persistencia en localStorage y los pasa a los componentes hijos |
| `OverlayControls.tsx` | Barra de control siempre visible en la parte superior del overlay: asa de arrastre, panel de ajustes (tipografía, tamaño), bloqueo/desbloqueo de clics (click-through), modo fondo negro/transparente, toggle siempre encima y botón cerrar |
| `OverlayErrorBoundary.tsx` | Captura errores de React en el overlay y muestra un mensaje visible en lugar de dejar la ventana transparente invisible |
| `ChatOverlay.tsx` | Overlay de chat con soporte para tipografía personalizada, tamaño de texto y modo de fondo (negro/transparente) |
| `ChannelNotifications.tsx` | Notificaciones animadas de EventSub (follows, subs, gifts, redemptions, cheers) en el overlay |

### Sistema de Diseño

El dashboard usa tokens CSS + clases utilitarias + CSS Modules:

**Tokens CSS** definidos en `index.css`:

| Token | Valor | Uso |
|---|---|---|
| `--sf-bg` | `#0a0a1a` | Fondo principal |
| `--sf-primary` | `#7c3aed` | Violeta — color de acento principal |
| `--sf-surface` | `rgba(255,255,255,0.04)` | Cards glassmorphism |
| `--sf-border` | `rgba(255,255,255,0.08)` | Bordes sutiles |
| `--sf-success` | `#10b981` | Verde esmeralda (conectado) |
| `--sf-danger` | `#ef4444` | Rojo (desconectado) |

**Clases utilitarias** en `index.css` (flex, typography, spacing, cards, badges, pills, toggles, etc.) para sustituir estilos inline repetitivos.

**CSS Modules** (`*.module.css`) por componente — estilos encapsulados que reemplazan ~1.190 estilos `style={{}}` inline. Solo se mantienen inline los valores verdaderamente dinámicos (colores de usuario, posiciones de toggle, accent-color de ranges).

### Componentes del Dashboard

| Componente | Descripción |
|---|---|
| `App.tsx` + `App.module.css` | Layout principal con sidebar state management, header + tab transitions, ?auth=success handler y version migration |
| `StreamDashboard.tsx` | Gestor unificado: preview embed, editor título/juego, stats en vivo, feed actividad con filtros |
| `ChatPanel.tsx` | Visor chat en vivo con envío, reply, moderación, selector sonido con volumen, **TTS (voz, velocidad, volumen)**, overlay controls (tamaño, opacidad, tipografía, fondo negro/transparente) |
| `SecurityPanel.tsx` | Anti-Bots: estadísticas, toggles de protección, escaneo manual, lista blanca, log de detecciones con acciones ban/unban/whitelist por fila, tarjeta de ayuda del sistema |
| `GiveawayPanel.tsx` | Panel sorteos con ruleta canvas e importación masiva |
| `PredictionPanel.tsx` | Panel de predicciones con opciones A/B/C |
| `TrackerPanel.tsx` | Twitch Tracker: estadísticas históricas, resumen del último stream, gráficos SVG de evolución (views/seguidores/duración), consejos inteligentes multi-factor e integración Ollama |
| `HudPanel.tsx` | Stream HUD: botones iniciar/detener polling, stats en vivo |
| `TimerPanel.tsx` | Temporizador: configurar duración, iniciar, pausar, reanudar, reset |
| `ScoreboardPanel.tsx` | Scoreboard clásico + Fighter Overlay: presets de daño, rondas, timer, configuración de jugadores/personajes/retratos |
| `BitrateCalculatorPanel` | Calculadora de bitrate para streaming: input de velocidad de subida con recomendación automática, selector de resolución, FPS, BPP, audio bitrate y % de uso de subida. Resultados con comparación "conexión vs. necesario", advertencia del límite de Twitch y guía paso a paso de configuración en OBS con valores dinámicos. Sin dependencia de backend |
| `SubathonPanel.tsx` | Subathon: timer, progreso, añadir tiempo manual, historial, config, overlay URL |
| `ModPanel.tsx` | Moderación: timeout/ban/unban + lista de chatters conectados |
| `CommandsPanel.tsx` | Comandos personalizados: crear, editar, toggle, cooldown |
| `ObsPanel.tsx` | URLs OBS con copiar al portapapeles y selector de overlays standalone |
| `ConfigPanel.tsx` | Config: conexión Twitch OAuth, logout, acerca de |
| `Sidebar.tsx` + `Sidebar.module.css` | Barra lateral colapsable con 8 secciones (GESTOR, ESTADÍSTICAS, SEGURIDAD, Chat, MOD, COMANDOS, Herramientas, Config). Se colapsa a 56px mostrando solo iconos con animación Framer Motion. En < 768px se convierte en drawer overlay con botón hamburguesa. Estado persistido en localStorage |

> Todos los componentes del dashboard y overlays tienen su `*.module.css` correspondiente. Consultar el listado completo de archivos en el repositorio.

---

## Backend

| Tecnología | Versión | Propósito |
|---|---|---|
| **Node.js** | 20 LTS | Runtime principal |
| **TypeScript** | ^5.4 | Tipado estático |
| **Fastify** | ^5.x | Framework HTTP rápido y eficiente |
| **Socket.IO** | ^4.x | WebSocket bidireccional (chat, sorteos, predicciones, subathon) |
| **@twurple/api** | ^7.x | Cliente oficial Twitch API |
| **@twurple/chat** | ^7.x | Conexión IRC para leer/enviar mensajes del chat |
| **@twurple/eventsub-ws** | ^7.x | EventSub WebSocket (follows, subs, gifts, redemptions, cheers) |
| **Prisma** | ^5.x | ORM para base de datos |
| **Zod** | ^3.x | Validación de schemas y tipos runtime |

### Módulos del backend

| Módulo | Archivo | Descripción |
|---|---|---|
| **Auth** | `src/auth/index.ts` | OAuth Twitch (Authorization Code + Device Code Grant), refresco automático de tokens |
| **Chat** | `src/chat/index.ts` | ChatClient IRC, comandos (`!sorteo`), reenvío de mensajes vía socket, integración con detección de spam |
| **Socket** | `src/socket/index.ts` | Socket.IO server, eventos `join:channel`, `leave:channel`, `chat:send` |
| **Giveaways** | `src/giveaways/index.ts` | Sorteos: crear, finalizar, entrada vía chat, selección aleatoria |
| **Predictions** | `src/predictions/index.ts` | Predicciones Twitch: crear, resolver |
| **HUD** | `src/hud/index.ts` | Stream HUD: polling Twitch API cada 10-15s, emisión `hud:update` |
| **Timer** | `src/timer/index.ts` | Temporizador: cuenta regresiva in-memory con tick cada 1s vía Socket.IO, REST start/pause/resume/reset |
| **Scoreboard** | `src/scoreboard/index.ts` | Scoreboard clásico + **Fighter**: barras de vida, rondas, timer server-side (setInterval 1s), daño/curación, resolución automática de rondas. Emisiones `scoreboard:update` y `fighter:update` |
| **EventSub** | `src/eventsub/index.ts` | EventSub WebSocket listener: follows, subs, resubs, gifts, redemptions, cheers. Integrado con detección de follow bots |
| **Mod** | `src/mod/index.ts` | Moderación: chatters (GET /mod/chatters/:channel), timeout, ban, unban vía Twitch Helix API |
| **Tracker** | `src/tracker/index.ts` | Twitch Tracker: estadísticas agregadas (`/tracker/stats`), desglose por stream con datos de actividad (`/tracker/streams`) y motor de consejos inteligente multi-factor con integración opcional Ollama (`/tracker/advice`) |
| **Security** | `src/security/index.ts` | Anti-Bots: detección de follow bots vía EventSub, filtro de spam por patrones en IRC, auto-ban por Helix API, escaneo manual de seguidores, configuración persistente, lista blanca y estadísticas |
| **Subathon** | `src/subathon/index.ts` | Subathon: temporizador ampliable con subs, bits y recompensas. Tick cada 1s. REST: start (con initialTime), add-time, pause, resume, stop, config. Socket.IO: `subathon:tick`, `subathon:time-added`, `subathon:state` |
| **Activity** | `src/activity/index.ts` | Feed de actividad del canal: follows, subs, bits, raids. Almacenamiento in-memory + persistencia a archivo. Socket.IO: `activity:new`, `activity:list` |
| **Commands** | `src/commands/index.ts` | Comandos personalizados del chat: CRUD, persistencia a archivo, exportación/importación, auto-respuesta vía chat handler |
| **Fortnite** | `src/fortnite/index.ts` | Estadísticas de Fortnite desde fortnite-api.com: `GET /fortnite/config`, `PUT /fortnite/config`, `GET /fortnite/stats/:username?mode=solo|duo|trio|squad`. Cache en memoria de 5 min. Soporta `FORTNITE_API_KEY` desde `.env` o config persistida |

---

## Base de Datos

| Tecnología | Propósito |
|---|---|
| **SQLite** | Base de datos única compartida entre backend y desktop. Sin servidor externo. |
| **Prisma 5** | ORM para ambos packages. |
| **PostgreSQL 16** | Opcional — disponible vía `docker-compose.yml` para producción multi-usuario. |

---

## Overlay React (Chat Transparente)

El overlay de chat se renderiza con React en una ventana Electron separada (o como Browser Source en OBS). A diferencia de los overlays HTML standalone, este overlay tiene acceso completo al ecosistema React y se comunica con el proceso principal de Electron vía IPC:

| Característica | Descripción |
|---|---|
| **Barra de control** | Siempre visible en la parte superior con asa de arrastre, ajustes, bloqueo de clics, modo fondo, siempre encima y cerrar |
| **Ajustes de tipografía** | Selector de 6 fuentes (Inter, Arial, Monospace, Georgia, Verdana, Impact) con slider de tamaño (10-24px) |
| **Modo de fondo** | Alternar entre fondo negro sólido o fondo completamente transparente |
| **Click-through** | Botón 🔓/🔒 para bloquear o permitir que los clics pasen a la ventana/juego detrás. También accesible con `Ctrl+Shift+T` |
| **Siempre encima** | Toggle para mantener la ventana sobre todas las demás aplicaciones |
| **Persistencia** | Todos los ajustes se guardan en localStorage y se restauran al abrir la ventana |
| **IPC bridge** | Los cambios realizados desde el panel de Chat de la app principal se sincronizan con la ventana overlay vía `executeJavaScript` + eventos personalizados |

---

## Overlays por Juego / Tema

| Juego / Tema | Estilo visual | Overlays |
|---|---|---|
| **Subnautica 2** | Azul profundo, neón bioluminiscente, interfaz HUD de PDA. Canvas partículas, sonar, chat, alertas por tipo | `subnautica2.html` |
| **Fortnite** | Hexágonos, azul/dorado/púrpura, estilo battle royale. Partículas, cuadrícula, alertas, uptime, **panel de stats** (kills, wins, partidas, K/D, win rate) con fetch directo a backend cada 5 min | `fortnite.html` |
| **Alertas genéricas** | Oscuro con bordes de color por tipo. Confetti Canvas, shimmer, glow ring. 7 tipos de evento | `alerts.html` |
| **Subathon** | Rojo/gradiente, timer grande con pulso crítico. Barra progreso, feed actividad, stats | `subathon.html` |
| **Retro 8-bits** | Pixel art NES, bordes estilo RPG, colores rojo/amarillo/azul. Scanlines CRT, fuentes Press Start 2P | 4 overlays (start, gameplay, just chatting, end) |
| **Retro Win95** | Interfaz Windows 95: ventanas grises, título azul marino, bordes en relieve. Fuente MS Sans Serif | 4 overlays (start, gameplay, just chatting, end) |
| **RetroWave** | Estilo outrun/synthwave: sol radiante, cuadrícula 3D, neón magenta/cyan. Fuentes VT323 + Righteous | 4 overlays (start, gameplay, just chatting, end) |
| **Tactical Sci-Fi** | Estilo Battlestar Galactica: paneles octogonales, radar DRADIS, ámbar/verde táctico, scanlines. Fuente Share Tech Mono | 4 overlays (start, gameplay, just chatting, end) |

---

## Autenticación Twitch

Dos flujos OAuth 2.0 según el entorno:

### Authorization Code Grant (browser / servidor Linux)

1. Usuario hace clic en "Conectar con Twitch"
2. Backend redirige a Twitch → callback → intercambia code → almacena tokens
3. `RefreshingAuthProvider` refresca token automáticamente

### Device Code Grant (Electron / escritorio Windows)

1. `POST /auth/device` → backend pide device code a Twitch
2. Panel muestra `user_code` y link `twitch.tv/activate`
3. Usuario ingresa el código en su navegador
4. Frontend sondea `POST /auth/device/poll` hasta que Twitch aprueba

Scopes solicitados: `chat:read`, `chat:edit`, `channel:read:redemptions`, `channel:manage:predictions`, `channel:read:predictions`, `channel:manage:raids`, `moderator:read:followers`, `channel:read:subscriptions`, `bits:read`, `channel:moderate`, `moderator:read:chatters`, `moderator:manage:banned_users`.

---

## Arquitectura de Comunicación

```
OBS (Browser Source) ←→ Overlays HTML/React
       ↑                        ↓
       |                   Socket.IO (WebSocket-only)
       |                        ↓
       +────────── Backend (Fastify + @twurple)
                             ↓
                      Twitch IRC / API / EventSub
```

- Overlays HTML standalone se conectan directamente a Socket.IO del backend sin pasar por React/Vite
- Todos los overlays requieren `?demo=true` para datos simulados; sin él muestran cero/`--`
- Socket.IO emite eventos por sala de canal (`channel:nombre`) para que overlays y paneles reciban solo su canal

### Consideraciones de la conexión Socket.IO en overlays standalone

Fastify v5 intercepta **todas** las peticiones HTTP entrantes a través de su hook `onRequest`, incluyendo:
- `/socket.io/socket.io.js` — la descarga del cliente Socket.IO
- Los POST de polling de Socket.IO (`/socket.io?EIO=4&transport=polling...`)

Esto provoca que Fastify responda con 404 (rutas no registradas) o 401 (protegidas por `requireLocalAuth`) antes de que el módulo Socket.IO pueda procesarlas. Como resultado, los overlays standalone no podían conectarse.

**Solución aplicada:**

1. **WebSocket-only transport** — Se eliminó `polling` de la lista de transports. Socket.IO usa el upgrade HTTP para establecer WebSocket, y Fastify **no** intercepta el evento `upgrade` — solo Socket.IO lo escucha. Así la conexión real funciona sin interferencia.

2. **Cliente Socket.IO local** — En lugar de cargar `socket.io.js` desde el backend (`BACKEND_URL + '/socket.io/socket.io.js'`), se copió el archivo no-minificado desde `node_modules/socket.io/client-dist/` a `public/overlays/js/socket.io.js`. Vite lo sirve como archivo estático, evitando que Fastify bloquee la descarga. El minificado no se usa porque no exponía `io` globalmente al cargarse con script dinámico.

3. **Orden de asignación correcto** — Se descubrió que asignar `script.onload = cb` pasaba el objeto `Event` del navegador como primer argumento (`err`), haciendo que `if (!err)` siempre fallara y `initSocket()` nunca se ejecutara. Se cambió a `script.onload = () => cb()`. Además, `onload` y `onerror` se asignan **antes** de `script.src` para evitar que el script cargue desde caché antes de registrar los handlers.

4. **connect_error handler** — Se agregó `socket.on('connect_error', ...)` con `console.error` a todos los overlays para visibilidad de errores de conexión.

Estos cambios se aplicaron a los 39 overlays standalone en `public/overlays/`.

---

## DevOps / Herramientas

| Herramienta | Propósito |
|---|---|
| **concurrently** | Lanza Vite y Electron en paralelo |
| **wait-on** | Electron espera a que Vite responda antes de abrir |
| **ESLint** + **Prettier** | Linter y formateo |
| **GitHub Actions** | CI/CD (lint, test, build) |

---

## Estructura de Carpetas (Monorepo)

```
twitch_overlay/
├── packages/
│   ├── backend/src/
│   │   ├── auth/          # OAuth Twitch
│   │   ├── chat/          # IRC + spam detection
│   │   ├── socket/        # WebSocket server
│   │   ├── giveaways/     # Sorteos
│   │   ├── predictions/   # Predicciones
│   │   ├── eventsub/      # EventSub WS + follow bot detection
│   │   ├── hud/           # Stream HUD
│   │   ├── timer/         # Temporizador
│   │   ├── scoreboard/    # Scoreboard
│   │   ├── mod/           # Moderación
│   │   ├── tracker/       # Twitch Tracker
│   │   ├── security/      # Anti-Bots
│   │   ├── subathon/      # Subathon
│   │   ├── activity/      # Feed actividad
│   │   ├── commands/      # Comandos personalizados
│   │   └── fortnite/      # Stats Fortnite
│   ├── frontend/
│   │   ├── src/components/  # Dashboard React
│   │   └── public/overlays/ # 39 overlays HTML standalone
│   │       ├── js/
│   │       │   └── socket.io.js  # Socket.IO client (non-minified, v4.8.3)
│   │       ├── subnautica2.html
│   │       ├── fortnite.html
│   │       ├── alerts.html
│   │       ├── subathon.html
│   │       ├── 8bits-*          # Retro 8-bits theme
│   │       ├── *win95*          # Retro Win95 theme
│   │       ├── *retrowave*      # RetroWave theme
│   │       ├── hud_*            # Tactical Sci-Fi theme
│   │       ├── pantalla_de_inicio_t_ctica.html
│   │       ├── pantalla_despedida_t_ctica.html
│   │       └── ...
│   ├── desktop/           # Electron
│   └── shared/            # Tipos compartidos
├── README.md
├── README.en.md
└── STACK_TECNOLOGICO.md
```

---

## Plan de Implementación

| Paso | Descripción | Estado |
|---|---|---|
| 1-17 | Funcionalidades base (chat, sorteos, predicciones, HUD, timer, scoreboard, moderación, comandos) | ✅ |
| 18 | **StreamDashboard unificado** — Vista previa + info stream + stats + actividad en un solo panel | ✅ |
| 19 | **Overlays HTML standalone** — Subnautica 2, Fortnite, Alertas con Canvas partículas, cola eventos, conexión Socket.IO directa | ✅ |
| 20 | **Subathon** — Backend (tick 1s, add-time, pause/resume/stop, config), panel (timer, progreso, añadir tiempo, historial), overlay standalone con badge demo | ✅ |
| 21 | **Demo mode** — Todos los overlays requieren `?demo=true` para datos simulados; sin él muestran cero/`--`. Badge 🧪 MODO PRUEBA visible en demo | ✅ |
| 22 | **Overlay Fortnite** — Integrado desde `fortnite-overlay.html` a `public/overlays/`, duplicados `id` corregidos | ✅ |
| 23 | **Activity Feed** — Backend `GET /activity/:channel` con persistencia a archivo, feed en StreamDashboard con filtros y socket events | ✅ |
| 24 | **Comandos personalizados** — Módulo backend CRUD con persistencia a archivo, export/import, auto-respuesta en chat. Panel en dashboard | ✅ |
| 25 | **Editor de stream** — Cambiar título, juego (buscador) y tags desde StreamDashboard. `PUT /hud/stream/info` con scope `channel:manage:broadcast` | ✅ |
| 26 | **Fortnite config UI** — API key, epic username y modo (SOLO/DUO/TRIO/SQUAD) configurables desde ObsPanel. `GET/PUT /fortnite/config` con persistencia a archivo | ✅ |
| 27 | **Fortnite stats panel en overlay** — Panel superior derecho con kills, wins, partidas, K/D, win rate. Fetch directo al backend cada 5 min (independiente del socket). Demo mode con stats de ejemplo | ✅ |
| 28 | **Backend param en URL** — `&backend=` auto-agregado al copiar URL en dev para que el overlay sepa dónde está el backend | ✅ |
| 29 | **Twitch Tracker v2** — Per-stream breakdown con datos de actividad (follows, subs, bits), SVG charts evolutivos, resumen del último stream con ingresos estimados | ✅ |
| 30 | **Consejos inteligentes** — Motor multi-factor (frecuencia, duración, audiencia, monetización) con reglas contextuales e integración opcional Ollama para IA local | ✅ |
| 31 | **CSP fix** — Agregado `frame-src https://player.twitch.tv` al Content-Security-Policy para permitir embed de Twitch en producción | ✅ |
| 32 | **Overlay controls redesign** — Toggle always-on-top desde sidebar, control de opacidad general (10-100%), modo fondo, selector de fuente y tamaño. `OverlayErrorBoundary` para manejo de errores React | ✅ |
| 33 | **Chat TTS + Volumen** — Text-to-Speech con selección de voz, velocidad y volumen. Control de volumen maestro para sonidos de alerta. Control de volumen independiente para TTS | ✅ |
| 34 | **Anti-Bots** — Módulo de seguridad con detección de follow bots, filtro de spam, auto-ban, escaneo manual, lista blanca y estadísticas. Sección SEGURIDAD en el dashboard | ✅ |
| **35** | **⚔️ Fighter Scoreboard Overlay** — Overlay de pelea con barras de vida animadas (spring physics), retratos, rondas, timer server-side, anuncios WIN/KO. Panel con presets de daño, control de rondas y configuración de jugadores | ✅ |
| **36** | **🌍 Traducción multi-idioma** — Frontend traducido a inglés, francés, alemán e italiano con detección automática del idioma del navegador | 🔜 |
| **37** | **🎮 Integración Stream Deck** — Plugin nativo para Elgato Stream Deck (Node.js + CLI SDK). Acciones: Subathon, Sorteo, Moderación, Stream info, Anti-Bots. Conexión vía HTTP REST a la API local de StreamForger | 🔜 |
| **38** | **🎬 Gestión y exportación de clips a TikTok** — Creación, edición y exportación automática de clips del stream a TikTok con formato vertical, subtítulos automáticos y programación de publicaciones | 🔜 |
| **39** | **🕹️ Retro 8-bits theme** — 4 overlays pixel art NES (start, gameplay, just chatting, end) con chat en vivo y eventos Twitch | ✅ |
| **40** | **🪟 Retro Win95 theme** — 4 overlays estilo Windows 95 con chat mIRC32 y notificaciones | ✅ |
| **41** | **🌅 RetroWave theme** — 4 overlays outrun/synthwave con neón magenta/cyan, chat glitch y eventos | ✅ |
| **42** | **🛸 Tactical Sci-Fi theme** — 4 overlays BSG con radar DRADIS, chat táctico y telemetría | ✅ |
| **43** | **Socket.IO en overlays temáticos** — Todos los overlays con chat (gameplay y just chatting) conectados al backend via Socket.IO para mensajes, follows, subs, cheers y redemptions | ✅ |
| **44** | **Socket.IO standalone fix** — Corrección de conexión Socket.IO en 39 overlays standalone: WebSocket-only transport para evitar interceptación de Fastify v5, cliente Socket.IO local (`/overlays/js/socket.io.js`), orden correcto de `script.onload` para evitar race condition, y handler `connect_error` en todos los overlays | ✅ |
| **45** | **🗂️ Sidebar colapsable/responsive** — Sidebar extraída a componente propio con colapso a 56px (solo iconos), animación Framer Motion, modo drawer en < 768px con overlay + backdrop blur y botón hamburguesa. Estado persistido en localStorage | ✅ |
| **46** | **🎨 CSS Modules migration** — Migración de ~1.190 estilos inline (`style={{}}`) a CSS Modules (`*.module.css`) + clases utilitarias en `index.css`. 32 componentes migrados. Solo se mantienen inline valores dinámicos (colores de usuario, posiciones de toggle, accent-color). Se añadieron clases reutilizables: `.flex-row`, `.flex-col`, `.sf-heading`, `.sf-label`, `.sf-card`, `.sf-chip`, `.sf-pill-selector__pill`, `.sf-toggle`, etc. | ✅ |
| **47** | **🗂️ Overlay registry centralizado** — Creación de `overlayRegistry.ts` con 80+ overlays categorizados en 8 secciones, tipado estricto (categoría, orientación, tema, colores, badge `isNew`). Refactor de `ObsPanel.tsx`: reducción de ~66 % del código, añadido filtro de búsqueda, cabeceras por categoría y selección por orientación. Traducciones en 5 idiomas. | ✅ |
| **48** | **⚠️ ConfirmModal para acciones destructivas** — Modal reutilizable con diseño glassmorphism, blur de fondo, animaciones Framer Motion, cierre con Escape y click fuera, foco atrapado entre botones y checkbox opcional "No preguntar de nuevo". Integrado en 7 componentes: finalizar sorteo, detener subathon, banear usuario, eliminar comando, cerrar sesión, banear/timeout desde moderación y chat. Traducciones en 5 idiomas. | ✅ |
| **49** | **⌨️ Atajos de teclado (keyboard shortcuts)** — `Ctrl+1` a `Ctrl+9` para navegar entre los primeros 9 paneles, `Ctrl+Shift+C` para abrir Chat, `Escape` para cerrar modales. Indicadores visuales en la sidebar (badge al lado del label en modo expandido, tooltip en modo colapsado). Los atajos se desactivan automáticamente al escribir en inputs de texto. Preparado para integración con Stream Deck. | ✅ |
