# StreamForger — Stack Tecnológico

## Visión General

Aplicación modular para creadores de contenido que permite gestionar el canal de Twitch con overlays personalizados por juego, sorteos, predicciones e interacción con chat. Compatible con OBS vía Browser Source.

---

## Frontend (Dashboard + Overlays)

| Tecnología | Versión | Propósito |
|---|---|---|
| **React 18** | ^18.2 | Librería UI para construir el dashboard y los overlays |
| **TypeScript** | ^5.4 | Tipado estático en todo el frontend |
| **Vite** | ^5.x | Bundler dev/build ultrarrápido |
| **Tailwind CSS** | ^3.4 | Estilizado utilitario; complementado con CSS custom properties del sistema de diseño |
| **Framer Motion** | ^11.x | Animaciones de transición entre tabs, estados activos, badges, cards |
| **Socket.IO Client** | ^4.x | Comunicación en tiempo real con el backend |
| **@twurple/chat** | ^6.x | Cliente IRC para leer el chat de Twitch (en backend, expuesto vía WS al frontend) |
| **@twurple/eventsub-ws** | ^7.x | EventSub WebSocket (follows, subs, gifts, redemptions, cheers) |
| **Inter (Google Fonts)** | — | Tipografía principal del dashboard |
| **Friz Quadrata** | — | Tipografía temática WoW (overlays Horda y Alianza) |

### Sistema de Diseño (v0.2.0)

El dashboard usa un sistema de tokens CSS definidos en `index.css`:

| Token | Valor | Uso |
|---|---|---|
| `--sf-bg` | `#0a0a1a` | Fondo principal |
| `--sf-bg-2` | `#0f0f23` | Fondo secundario (sidebar) |
| `--sf-primary` | `#7c3aed` | Violeta — color de acento principal |
| `--sf-accent` | `#6366f1` | Índigo — degradados y énfasis |
| `--sf-surface` | `rgba(255,255,255,0.04)` | Cards glassmorphism |
| `--sf-border` | `rgba(255,255,255,0.08)` | Bordes sutiles |
| `--sf-success` | `#10b981` | Verde esmeralda (sorteo activo, conectado) |
| `--sf-danger` | `#ef4444` | Rojo (desconectado, finalizar) |
| `--bg-alpha` | `1` | Opacidad del fondo de overlays (0-1, solo fondos, no texto) |

**Clases utilitarias personalizadas:**
- `.glass-card` / `.glass-card--accent` — Glassmorphism con blur y borde semitransparente
- `.sf-input` — Input con focus glow violeta
- `.sf-btn`, `.sf-btn-primary`, `.sf-btn-danger`, `.sf-btn-ghost` — Botones del sistema
- `.sf-badge-success/danger/violet/teal` — Badges de estado con pill redondeada
- `.animate-pulse-dot`, `.animate-glow`, `.animate-float`, `.animate-slide-up` — Animaciones CSS

### Temas visuales (overlays)

Los temas se definen en `useTheme.ts` y se aplican mediante variables CSS en el root:

| Tema | Colores clave | Tipografía |
|---|---|---|
| **Subnautica 2** | Cian `#00d4ff`, verde neón `#00ff88` | `Courier New`, monospace |
| **Path of Exile 2** | Dorado `#c9a04a`, rojo `#ff4444` | `Times New Roman`, serif |
| **WoW - Horda** | Dorado `#ffd100`, marrón `#2d1b00` | `Friz Quadrata`, serif |
| **WoW - Alianza** | Oro `#d4af37`, azul rey `#1a3a8a`, plata | `Friz Quadrata`, serif |

### Componentes del Dashboard

| Componente | Descripción |
|---|---|
| `App.tsx` | Layout principal con sidebar (6 secciones: GESTOR, Chat, MOD, COMANDOS, Herramientas, Config) + header (input #canal, badge usuario, conexión) + tab transitions |
| `Logo.tsx` | SVG hexagonal con gradiente violeta-índigo y rayo (ícono de "forja") |
| `ChatPanel.tsx` | Visor chat en vivo con envío, reply, moderación (timeout/ban), selector de sonido, overlay controls (tamaño, opacidad) |
| `GiveawayPanel.tsx` | Panel sorteos con badge pulsante, counter + ruleta canvas con selector duración giro (10/15/20s) e importación masiva de nombres |
| `PredictionPanel.tsx` | Panel de predicciones con opciones A/B/C y feedback animado |
| `TrackerPanel.tsx` | Panel Twitch Tracker: estadísticas históricas del canal con try/catch para datos no disponibles |
| `HudPanel.tsx` | Panel de Stream HUD: botones iniciar/detener polling, muestra estadísticas en vivo con try/catch en cada métrica |
| `TimerPanel.tsx` | Panel de temporizador: configurar duración, iniciar, pausar, reanudar, reset, con socket join:channel |
| `ScoreboardPanel.tsx` | Panel de scoreboard: añadir/remover jugadores, ajustar puntuaciones, cambiar título, reset, con socket join:channel |
| `ConfigPanel.tsx` | Configuración: conexión Twitch OAuth con Device Code Grant + "Login en navegador" (browser flow), logout, aviso re-autenticación, acerca de |
| `ObsPanel.tsx` | Panel de URLs para OBS Browser Source con cards, copiar al portapapeles, overlayBaseUrl para dev mode y selector de temas |
| `ChannelNotifications.tsx` | Notificaciones animadas (follows, subs, gifts, redemptions, cheers) en overlay |
| `StreamActivityFeed.tsx` | Feed de actividad del canal: follows, subs, raids, bits, redemptions en tiempo real con filtros por tipo |
| `StreamInfoEditor.tsx` | Editor de título y juego del stream con fetch y PUT vía API |
| `ModPanel.tsx` | Moderación: timeout/ban/unban + lista de chatters conectados filtrable y seleccionable |
| `CommandsPanel.tsx` | Gestión de comandos personalizados: crear, editar, toggle, eliminar, con alias, cooldown y modo solo-mods |

### Overlays (OBS Browser Source)

| Componente | Modo URL | Descripción |
|---|---|---|
| `ChatOverlay.tsx` | `mode=chat` | Overlay chat genérico con animaciones |
| `Subnautica2ChatOverlay.tsx` | `mode=chat&theme=subnautica2` | Chat estilo PDA bioluminiscente |
| `WowChatOverlay.tsx` | `mode=chat&theme=wow` | Chat estilo diario de misión Horda |
| `AllianceChatOverlay.tsx` | `mode=chat&theme=alliance` | Chat Alianza: corona, león, azul/dorado, marco gótico |
| `CustomOverlay.tsx` | `mode=custom` | Overlay interactivo: canal, juego, actividad de usuarios |
| `GiveawayOverlay.tsx` | `mode=giveaway` | Sorteos: participantes izquierda + ruleta derecha + ganador gigante |
| `PredictionOverlay.tsx` | `mode=prediction` | Predicciones en vivo |
| `SocialOverlay.tsx` | `mode=social` | Redes sociales animadas |
| `HudOverlay.tsx` | `mode=hud` | Stream HUD: viewers, followers, subs, uptime, game y título |
| `TimerOverlay.tsx` | `mode=timer` | Cuenta regresiva con barra de progreso, color urgente a 30s, glow animado |
| `ScoreboardOverlay.tsx` | `mode=scoreboard` | Marcador vertical con barras de progreso por jugador, ranking y corona al líder |

---

## Backend

| Tecnología | Versión | Propósito |
|---|---|---|
| **Node.js** | 20 LTS | Runtime principal |
| **TypeScript** | ^5.4 | Tipado estático |
| **Fastify** | ^5.x | Framework HTTP rápido y eficiente |
| **Socket.IO** | ^4.x | WebSocket bidireccional (chat en vivo, sorteos, predicciones) |
| **@twurple/api** | ^7.x | Cliente oficial Twitch API (autenticación, datos de stream, usuarios) |
| **@twurple/chat** | ^7.x | Conexión IRC para leer/enviar mensajes del chat |
| **@twurple/eventsub-ws** | ^7.x | EventSub WebSocket (follows, subs, gifts, redemptions, cheers) |
| **Prisma** | ^5.x | ORM para base de datos |
| **Zod** | ^3.x | Validación de schemas y tipos runtime |

### Módulos del backend

| Módulo | Archivo | Descripción |
|---|---|---|
| **Auth** | `src/auth/index.ts` | OAuth Twitch (Authorization Code + Device Code Grant), logout, restoreSession, refresco automático de tokens |
| **Chat** | `src/chat/index.ts` | ChatClient IRC, comandos (`!sorteo`), reenvío de mensajes vía socket, envío de mensajes con error handling |
| **Socket** | `src/socket/index.ts` | Socket.IO server, eventos `join:channel`, `leave:channel`, `chat:send` |
| **Giveaways** | `src/giveaways/index.ts` | Sorteos: crear, finalizar, entrada vía chat, selección aleatoria, emisión `giveaway:entry` con lista de participantes |
| **Predictions** | `src/predictions/index.ts` | Predicciones Twitch: crear, resolver |
| **HUD** | `src/hud/index.ts` | Stream HUD: polling Twitch API cada 10-15s, emisión `hud:update` con statistics en vivo. Try/catch por métrica |
| **Timer** | `src/timer/index.ts` | Temporizador: cuenta regresiva in-memory con tick cada 1s vía Socket.IO, endpoints REST start/pause/resume/reset |
| **Scoreboard** | `src/scoreboard/index.ts` | Scoreboard: gestión de jugadores y puntuaciones in-memory, emisión `scoreboard:update` |
| **EventSub** | `src/eventsub/index.ts` | EventSub WebSocket listener: follows, subs, resubs, gifts, redemptions, cheers |
| **Mod** | `src/mod/index.ts` | Moderación: chatters (GET /mod/chatters/:channel), timeout, ban, unban vía Twitch Helix API. Scopes: moderator:read:chatters, moderator:manage:banned_users, channel:moderate |
| **Tracker** | `src/tracker/index.ts` | Twitch Tracker: estadísticas del canal con try/catch por endpoint (followers, subs, videos) |

---

## Electron (Escritorio Windows)

| Tecnología | Versión | Propósito |
|---|---|---|
| **Electron** | ^33.x | Shell de escritorio (ventana principal + overlay transparente) |
| **electron-builder** | ^25.x | Generación del instalador `.exe` (NSIS) |
| **better-sqlite3** | ^11.x | SQLite sin dependencias externas |

### Proceso principal (`packages/desktop/src/main.ts`)

El proceso principal gestiona:
- **`startBackend()`** — Arranca el servidor Fastify embebido. Envuelto en `try/catch`.
- **`createMainWindow()`** — Ventana principal con `show: false`, timeout de fallback 8 s.
- **`loadWithRetry()`** — Hasta 5 reintentos con backoff de 2 s.
- **`createOverlayWindow()`** — Ventana transparente para overlay sobre juegos.
- **IPC handlers**:
  - `overlay:setOpacity` — Inyecta CSS `--bg-alpha` (opacidad solo de fondo, texto intacto)
  - `overlay:resize` — Redimensiona ventana overlay (sm 300x450 / md 400x600 / lg 550x800)
  - `overlay:setPosition` / `overlay:getBounds` — Arrastre de ventana
  - `overlay:open/close/isOpen/toggleClickThrough`
  - `auth:login` — Autenticación Twitch
- **Shortcut global** — `Ctrl+Shift+T` activa/desactiva click-through del overlay

### Scripts de desarrollo

```bash
# Arrancar Vite (frontend) + Electron juntos:
npm run dev:desktop
# Internamente: concurrently "npm run dev -w packages/frontend" "npm run dev -w packages/desktop"
# El proceso Electron espera a que Vite esté listo con: wait-on http://localhost:5173

# Arrancar solo el servidor web (sin Electron):
npm run dev
```

### Fix: Pantalla negra al iniciar (v0.1.1)

Problema detectado y corregido: la ventana Electron arrancaba vacía porque el servidor de Vite no se lanzaba. Solución:

1. `dev:desktop` usa `concurrently` para lanzar **Vite + Electron** simultáneamente
2. `wait-on http://localhost:5173` — Electron no abre hasta que Vite responde
3. `wait-on ^8.0.0` añadido como `devDependency` del package desktop

### Fix: Error Prisma P2021 — tabla no encontrada (v0.1.1)

Problema detectado y corregido: el backend usaba el proveedor PostgreSQL de Prisma, incompatible con SQLite en modo desktop. Solución:

1. Backend migrado a SQLite; campos `Json` convertidos a `String`
2. `DATABASE_URL` apunta a `file:../desktop/prisma/streamforger.db`
3. `main.ts` inyecta `process.env.DATABASE_URL` antes de importar el backend

### Fix: Ventana invisible al iniciar (v0.1.0)

Problema detectado y corregido: el proceso de Electron arrancaba sin mostrar la ventana cuando el backend fallaba al iniciar. Solución:

1. `startBackend()` en `try/catch` — el error del backend ya no bloquea la UI
2. Timeout de 8 s — si `ready-to-show` no dispara, `mainWindow.show()` se llama forzosamente
3. `loadWithRetry()` — hasta 5 reintentos con 2 s de espera entre intentos
4. Doble `app.whenReady()` consolidada en una única llamada

### Fix: Overlay opacidad global (v0.2.0)

Problema: `BrowserWindow.setOpacity()` hacía transparente todo (texto incluido). Solución: se reemplazó por inyección de CSS `:root { --bg-alpha }` y todos los overlays usan `rgba(..., var(--bg-alpha, default))` para que solo los fondos sean semitransparentes.

---

## Base de Datos

| Tecnología | Propósito |
|---|---|
| **SQLite** | Base de datos única compartida entre backend y desktop. Sin servidor externo, cero configuración. |
| **Prisma 5** | ORM para ambos packages. Schema en `packages/desktop/prisma/schema.prisma` (fuente de verdad). |
| **PostgreSQL 16** | Opcional — disponible vía `docker-compose.yml` para entornos de producción multi-usuario. |
| **Redis 7** | Opcional — disponible vía Docker para cache/pub-sub en producción. |

### Esquema principal (Prisma)

- **User** — id, twitch_id, twitch_token, refresh_token, display_name, avatar, roles
- **ChannelConfig** — overlay_settings (JSON), social_links (JSON), active_game
- **Giveaway** — id, channel_id, prize, status, entries (JSON), winner_id, ended_at
- **Prediction** — id, channel_id, title, options (JSON), status, outcome, ended_at
- **GameTheme** — id, game_name, game_box_art_url, css_variables (JSON), overlay_components (JSON)

---

## Overlays por Juego

Cada overlay se renderiza como página HTML independiente. El streamer la agrega a OBS como **Browser Source**.

| Juego | Estilo visual | Componentes clave |
|---|---|---|
| **Subnautica 2** | Azul profundo, neón bioluminiscente, interfaz HUD de PDA | Chat flotante tipo radio, alertas de "oxígeno" para eventos |
| **Path of Exile 2** | Oscuro, dorado/rojo, pétreo, tipografía gótica | Barra de progreso tipo experiencia, marco de gemas para sorteos |
| **World of Warcraft** | Marco de unidad tipo Blizzard, cuero/dorado, fuente Friz Quadrata | Barras de salud/maná para stats del canal, notificaciones estilo logro |

Cada tema define variables CSS (`--theme-primary`, `--theme-bg`, `--theme-font`, etc.) que los componentes consumen.

---

## Autenticación Twitch

Dos flujos OAuth 2.0 según el entorno:

### Authorization Code Grant (browser / servidor Linux)

1. Usuario hace clic en "Conectar con Twitch"
2. `window.open('/auth/login')` → backend redirige a Twitch
3. Twitch redirige a `/auth/callback` → backend intercambia code → almacena `access_token` + `refresh_token`
4. Backend redirige al frontend con `?auth=success`
5. Frontend sondea `/auth/status` cada 3 segundos para detectar la sesión activa
6. `RefreshingAuthProvider` refresca token automáticamente al expirar

Scopes solicitados:
- `chat:read` / `chat:edit`
- `channel:read:redemptions`
- `channel:manage:predictions` / `channel:read:predictions`
- `channel:manage:raids`
- `channel:manage:moderators`
- `moderator:read:followers`
- `channel:read:subscriptions`
- `bits:read`
- `channel:moderate`
- `moderator:read:chatters`
- `moderator:manage:banned_users`

### Device Code Grant (Electron / escritorio Windows)

Recomendado oficialmente por Twitch para apps desktop. No requiere redirect URI ni ventana emergente:

1. Usuario hace clic en "Conectar con Twitch"
2. `POST /auth/device` → backend pide un device code a Twitch
3. Backend devuelve `user_code`, `verification_uri`, `device_code`, `interval`
4. El panel muestra el código y el link `twitch.tv/activate`
5. Usuario abre el link en su navegador voluntariamente e ingresa el código
6. Frontend sondea `POST /auth/device/poll` cada `interval` segundos
7. Twitch responde con el token → backend completa el login (misma lógica que Code Grant)
8. El código expira tras `expires_in` segundos · El usuario puede cancelar en cualquier momento

**Ventajas sobre el flujo con redirect:**
- No requiere `redirect_uri` configurado en la app de Twitch
- El usuario abre el navegador voluntariamente (no hay window que "desaparece")
- Funciona correctamente en .exe empaquetado sin firma digital
- No depende de `shell.openExternal` ni de `setWindowOpenHandler`

---

## Arquitectura de Comunicación

```
OBS (Browser Source) ←→ Frontend (React SPA)
       ↑                        ↓
       |                   Socket.IO
       |                        ↓
       +────────── Backend (Fastify + @twurple)
                             ↓
                      Twitch IRC / API / EventSub
```

- El backend se conecta al chat IRC de Twitch y reenvía mensajes vía Socket.IO a los overlays.
- Las predicciones se crean desde el panel de control (React) → API REST → Twitch API.
- Los sorteos se gestionan completamente en backend (entradas vía chat comando, selección aleatoria).
- El Stream HUD consulta la API de Twitch cada 10-15s y emite estadísticas vía Socket.IO al overlay.
- El Temporizador corre en memoria del backend con un `setInterval` de 1s que emite `timer:tick` a la sala del canal.
- El Scoreboard mantiene el estado en memoria y emite `scoreboard:update` ante cualquier cambio.
- La Moderación consulta la API de Twitch para obtener la lista de chatters conectados y ejecutar timeout/ban/unban.

---

## DevOps / Herramientas

| Herramienta | Propósito |
|---|---|
| **Docker** + **Docker Compose** | Entorno opcional para PostgreSQL + Redis en producción |
| **concurrently** | Lanza Vite y Electron en paralelo con `npm run dev:desktop` |
| **wait-on** | Garantiza que Electron arranca solo cuando Vite ya responde en `:5173` |
| **ESLint** + **Prettier** | Linter y formateo consistente |
| **Husky** + **lint-staged** | Hooks pre-commit para calidad de código |
| **Jest** + **React Testing Library** | Tests unitarios y de componentes |
| **Playwright** | Tests E2E de overlays en navegador |
| **GitHub Actions** | CI/CD (lint, test, build) |

---

## Estructura de Carpetas (Monorepo)

```
twitch_overlay/
├── packages/
│   ├── backend/           # Fastify + Twitch API + Socket.IO
│   ├── frontend/          # Vite + React + Dashboard + Overlays
│   │   └── src/
│   │       ├── components/
│   │       │   ├── App.tsx              # Layout sidebar (6 secciones) + tabs
│   │       │   ├── Logo.tsx             # SVG hexagonal
│   │       │   ├── ChatPanel.tsx        # Visor chat en vivo
│   │       │   ├── ConfigPanel.tsx      # Login Twitch + device code + "Login en navegador"
│   │       │   ├── GiveawayPanel.tsx    # Panel sorteos + ruleta canvas
│   │       │   ├── PredictionPanel.tsx  # Panel predicciones
│   │       │   ├── TrackerPanel.tsx     # Panel Twitch Tracker
│   │       │   ├── HudPanel.tsx         # Panel Stream HUD
│   │       │   ├── TimerPanel.tsx       # Panel temporizador
│   │       │   ├── ScoreboardPanel.tsx  # Panel scoreboard
│   │       │   ├── StreamActivityFeed.tsx # Feed de actividad del canal
│   │       │   ├── StreamInfoEditor.tsx  # Editor título/juego del stream
│   │       │   ├── ModPanel.tsx         # Moderación + lista de chatters
│   │       │   ├── CommandsPanel.tsx    # Comandos personalizados
│   │       │   ├── ObsPanel.tsx         # URLs OBS con copiar
│   │       │   ├── TransparentOverlay.tsx # Control overlay transparente
│   │       │   ├── ChatOverlay.tsx      # Overlay chat (OBS)
│   │       │   ├── GiveawayOverlay.tsx  # Overlay sorteos (OBS)
│   │       │   ├── PredictionOverlay.tsx # Overlay predicciones (OBS)
│   │       │   ├── SocialOverlay.tsx    # Overlay redes (OBS)
│   │       │   ├── HudOverlay.tsx       # Overlay Stream HUD (OBS)
│   │       │   ├── TimerOverlay.tsx     # Overlay temporizador (OBS)
│   │       │   ├── ScoreboardOverlay.tsx # Overlay scoreboard (OBS)
│   │       ├── hooks/
│   │       │   ├── useAuthStatus.ts     # Estado OAuth + Device Code Grant polling
│   │       │   ├── useSocket.ts         # Conexión Socket.IO
│   │       │   └── useTheme.ts          # Variables CSS por tema
│   │       └── index.css               # Sistema de diseño (tokens + utilidades)
│   ├── desktop/           # Electron + SQLite
│   │   └── src/
│   │       ├── main.ts    # Proceso principal (con retry y fallback de ventana)
│   │       └── preload.ts # Bridge IPC seguro
│   └── shared/            # Tipos, schemas Zod, constantes (ChatMessage, GiveawayData, HudData, TimerState, ScoreboardState, etc.)
├── docker-compose.yml
├── package.json           # Workspaces (npm)
├── README.md
└── STACK_TECNOLOGICO.md
```

---

---

## ☕ Apoya el proyecto

**buymeacoffee.com/jentrena** — invitame un café y ayudá a mantener StreamForger vivo.

---

## Plan de Implementación

| Paso | Descripción | Estado |
|---|---|---|
| 1. Setup | Inicializar monorepo, workspaces, Docker, Prisma, ESLint, TS config | ✅ |
| 2. Auth | Implementar OAuth Twitch con PKCE, almacenar tokens | ✅ |
| 3. Chat | Conectar @twurple/chat, reenviar mensajes vía Socket.IO al frontend | ✅ |
| 4. Overlay base | Crear componente Overlay genérico + themes CSS por juego | ✅ |
| 5. Overlay chat | Mostrar chat en overlay con filtros (mod-only, emotes, etc.) | ✅ |
| 6. Sorteos | Comando `!sorteo`, entrada vía chat, selección aleatoria, overlay notificación | ✅ |
| 7. Predicciones | Integración con Twitch Predictions API, panel admin en frontend | ✅ |
| 8. Social overlay | Overlay con enlaces a redes sociales animados | ✅ |
| 9. Dashboard premium | Sidebar, glassmorphism, sistema de diseño, ObsPanel, bug fix Electron | ✅ |
| 10. Unificación SQLite | Backend migrado a SQLite; `dev:desktop` corregido con `concurrently` + `wait-on` | ✅ |
| 11. Stream HUD | Panel y overlay de estadísticas en vivo con polling a Twitch API | ✅ |
| 12. Temporizador | Cuenta regresiva configurable con REST + Socket.IO tick por segundo | ✅ |
| 13. Scoreboard | Marcador de torneos con jugadores, puntuaciones y ranking visual | ✅ |
| 14. Sidebar restructurada | Nuevas secciones GESTOR DEL STREAM, Chat, MOD, COMANDOS, Herramientas, Configuración | ✅ |
| 15. Backend moderación | Endpoints REST para chatters, timeout, ban, unban + scopes channel:moderate, moderator:read:chatters, moderator:manage:banned_users | ✅ |
| 16. Componentes nuevos | StreamActivityFeed, StreamInfoEditor, ModPanel (con lista de usuarios), CommandsPanel | ✅ |
| 17. Fixes conexión | POST 401 return fix, panel/overlay socket join:channel, api.ts con X-Local-Token + OVERLAY_BASE_URL para dev mode | ✅ |
