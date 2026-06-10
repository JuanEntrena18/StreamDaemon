# StreamForger

**Open-source stream tools, forged for creators.**

StreamForger es una aplicación modular para creadores de contenido que permite gestionar canales de Twitch con overlays personalizados por juego, sorteos interactivos, predicciones y visualización del chat en tiempo real. Compatible con OBS Studio vía Browser Source.

Disponible en dos modos:
- **🖥️ Servidor Linux** — Multi-usuario, SQLite (o PostgreSQL con Docker), ideal para producción
- **💻 Escritorio Windows** — App portátil con Electron + SQLite, cero configuración

---

## ✨ Características

- **🎨 Overlays temáticos** — Overlays con la estética de Subnautica 2, Path of Exile 2, WoW Horda y WoW Alianza. Cada tema define su propia paleta de colores, tipografía y animaciones.
- **💬 Chat en vivo** — Lectura del chat de Twitch vía IRC con reenvío en tiempo real a los overlays mediante Socket.IO. Incluye envío de mensajes, reply (↩ @usuario), moderación (timeout/ban), badges por rol y selector de sonido de notificación.
- **🎁 Sorteos interactivos** — Comando `!sorteo` en el chat para participar. Panel de control con ruleta canvas, selector de duración del giro (10/15/20s) e importación masiva de nombres. Overlay dedicado con lista de participantes en vivo y ruleta animada con ganador gigante.
- **📊 Predicciones** — Integración con la API de Predicciones de Twitch. Creación de encuestas desde el panel de control con resolución automática.
- **📊 Stream HUD** — Panel de estadísticas en vivo (viewers, followers, subs, uptime, game) con polling automático y overlay informativo.
- **⏱️ Temporizador** — Cuenta regresiva configurable desde el panel con inicio, pausa, reanudación y reset. Overlay con barra de progreso, alerta visual los últimos 30s y estado "Tiempo cumplido".
- **🏆 Scoreboard** — Marcador en vivo para torneos y competiciones con jugadores, puntuaciones por incremento/decremento y barra de progreso visual. Panel completo con gestión de jugadores.
- **🔔 Notificaciones EventSub** — Follows, subs, re-suscripciones, gifts, redemptions y cheers en tiempo real vía EventSub WebSocket, con overlay animado en pantalla.
- **🌐 Redes sociales** — Overlay animado que muestra las redes del streamer de forma rotativa.
- **🔴 Gestor del Stream** — Sección con feed de actividad del canal (follows, subs, raids, bits, redemptions), editor de título/juego del stream y vista previa de overlays.
- **🛡️ Moderación** — Panel de moderación con timeout, ban y unban. Incluye lista de usuarios conectados al canal en ese momento con selección clickeable.
- **🤖 Comandos** — Gestión de comandos personalizados del chat: crear, editar, habilitar/deshabilitar, con alias y cooldown configurable.
- **🎮 Control de overlay transparente** — Ventana always-on-top con click-through toggleable (Ctrl+Shift+T), opacidad solo del fondo, redimensionable (Peq/Med/Grande) y barra de arrastre.
- **🔐 Autenticación OAuth** — Login con Twitch. En navegador: flujo Authorization Code Grant con redirect. En escritorio: flujo **Device Code Grant** (el usuario ve un código en la app y lo ingresa en twitch.tv/activate). Tokens persistidos con refresco automático. Logout completo.
- **🖥️ Dashboard premium** — Interfaz con sidebar de navegación, glassmorphism, animaciones Framer Motion, paleta violeta/índigo, badge de usuario Twitch y estado de conexión en tiempo real.

---

## 🔒 Seguridad

StreamForger implementa múltiples capas de seguridad para proteger las credenciales de Twitch y la cuenta del streamer:

| ID | Medida | Estado |
|---|---|---|
| **C-1** | Base de datos SQLite excluida del repositorio Git (`*.db` en `.gitignore`) | ✅ |
| **C-2** | Tokens OAuth cifrados con **AES-256-GCM** antes de persistir en SQLite | ✅ |
| **C-3** | Servidor vinculado exclusivamente a `127.0.0.1` (sin exposición en red) | ✅ |
| **A-1** | Token de API local (128 bits) requerido en toda petición POST (<code>X-Local-Token</code>) | ✅ |
| **A-2** | Parámetro `state` OAuth generado con `crypto.randomBytes(16)` y verificado con expiración de 10 min | ✅ |
| **M-1** | Rate limiting global (100 req/min) + límites específicos por ruta (5/min sorteos, 12/min device poll) + throttle Socket.IO (1 msg/1.5s) | ✅ |
| **M-2** | Validación de entrada con **Zod** en todas las rutas de API | ✅ |
| **M-3** | CORS restringido a `localhost:3000` y `localhost:5173` (HTTP + Socket.IO) | ✅ |
| **M-4** | Errores internos de Twitch logueados en servidor; el cliente recibe mensajes genéricos | ✅ |
| **M-5** | URLs de overlay validadas contra orígenes de confianza antes de abrir la ventana Electron | ✅ |
| **M-6** | Hook `onRequest` con `return` para evitar doble ejecución de handlers después de 401 | ✅ |
| **B-1** | Todos los generadores de estado OAuth usan `crypto.randomBytes` en lugar de `Math.random()` | ✅ |
| **B-2** | Cabeceras de seguridad: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` | ✅ |
| **B-3** | Docker Compose con credenciales vía variables de entorno (`${VAR:-default}`) | ✅ |
| **B-4** | Protección `will-navigate` en ambas ventanas Electron contra navegación a orígenes no confiados | ✅ |
| **B-5** | Variable `SESSION_SECRET` eliminada de toda la configuración | ✅ |

> **Nota:** Las credenciales de Twitch (`TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`) se configuran localmente en `packages/desktop/extra/backend.env` (excluido de Git). Consulta `backend.env.example` para la plantilla.

---

## 🚀 Stack Tecnológico

| Capa | Servidor Linux | Escritorio Windows |
|---|---|---|
| **Frontend** | React 18 + Vite + Tailwind + Framer Motion | React 18 + Vite + Tailwind + Framer Motion |
| **Backend** | Node.js + Fastify + Socket.IO + @twurple | Node.js + Fastify (embebido en Electron) |
| **Base de datos** | SQLite compartida (Prisma ORM) | SQLite (Prisma ORM) |
| **Cache** | Memoria (Map) | Memoria (Map) |
| **Runtime** | Node.js directo / Docker opcional | Electron (.exe) |

---

## 📦 Instalación

### Prerrequisitos

- Node.js 20+
- Una aplicación registrada en [dev.twitch.tv/console](https://dev.twitch.tv/console)
- **Servidor Linux:** Docker + Docker Compose
- **Windows:** Solo Node.js (Electron genera el .exe)

### 🔧 Servidor Linux

```bash
# 1. Clonar
git clone https://github.com/JuanEntrena18/StreamForge.git
cd StreamForge

# 2. Dependencias
npm install

# 3. Configurar credenciales de Twitch
cp packages/backend/.env.example packages/backend/.env
# Editar packages/backend/.env con TWITCH_CLIENT_ID y TWITCH_CLIENT_SECRET

# 4. Iniciar PostgreSQL + Redis
docker compose up -d

# 5. Crear tablas
npx prisma db push --schema=packages/backend/prisma/schema.prisma

# 6. Iniciar
npm run dev
```

Panel: `http://localhost:5173` · API: `http://localhost:3000`

### 💻 Escritorio Windows

```bash
# 1. Clonar
git clone https://github.com/JuanEntrena18/StreamForge.git
cd StreamForge

# 2. Dependencias (incluye wait-on)
npm install

# 3. Configurar credenciales de Twitch
cp packages/backend/.env.example packages/backend/.env
# Editar packages/backend/.env con TWITCH_CLIENT_ID y TWITCH_CLIENT_SECRET

# 4. Crear tablas en la base de datos SQLite
npx prisma db push --schema=packages/desktop/prisma/schema.prisma

# 5. Iniciar en modo desarrollo (Vite + Electron arrancan juntos)
npm run dev:desktop

# 6. Generar instalador .exe
npm run build:desktop
# El instalador se genera en packages/desktop/dist-electron/StreamForger Setup 0.2.0.exe
# También queda una versión portable en packages/desktop/dist-electron/win-unpacked/
```

> El instalador incluye Node.js, SQLite y todo lo necesario. Al ejecutarlo, la app arranca el servidor en `localhost:3000` y abre la ventana del dashboard. No requiere Docker, PostgreSQL ni Redis.

> ⚠️ Al no tener firma digital, Windows mostrará "Windows protected your PC". Hacé clic en **More info → Run anyway** la primera vez. Para distribución oficial obtené un certificado de firma de código.

---

## 🎨 Dashboard

El panel de control cuenta con un rediseño premium (v0.2.0):

- **Sidebar de navegación** con secciones:
  - **GESTOR DEL STREAM:** Actividad del canal, Info del Stream, Vista previa
  - **Chat:** Chat en vivo
  - **MOD:** Moderación (con timeout, ban, unban + lista de usuarios)
  - **COMANDOS:** Comandos personalizados del chat
  - **Herramientas:** Sorteos, Predicciones, Twitch Tracker, HUD, Temporizador, Scoreboard, OBS URLs
  - **Configuración:** Conexión Twitch, preferencias de ventana, acerca de
- **Glassmorphism** — cards semitransparentes con blur y bordes sutiles
- **Animaciones** con Framer Motion en transiciones de tab y estados activos
- **Tipografía Inter** (Google Fonts) con sistema de tokens CSS
- **Indicador de conexión** animado (pulso) en la barra superior
- **Badge de estado** con color temático por sección

### Panel de Actividad

- Feed de eventos en vivo del canal: follows, subs, raids, bits, redemptions
- Filtros por tipo de evento
- Diseño tipo timeline con glassmorphism

### Panel de Info del Stream

- Edición del título del stream y nombre del juego/categoría
- Muestra el estado actual: título, juego, viewers, uptime
- Envío vía API de Twitch (PUT /stream/info)

### Panel de Moderación

- Timeout con duración predefinida (30s/1m/5m/10m/1h/24h) y razón opcional
- Ban con razón opcional
- Unban
- **Lista de usuarios conectados** al canal en ese momento, filtrable, seleccionable con un click
- Resultado visible con feedback visual

### Panel de Comandos

- Crear comandos personalizados con nombre, respuesta y alias
- Editar, habilitar/deshabilitar y eliminar comandos existentes
- Cooldown configurable y toggle modo solo-mods
- Listado tipo acordeón con estado activo/inactivo

### Panel de Chat

- Visor de chat en vivo con scroll automático y máximo 100 mensajes
- Envío de mensajes al chat de Twitch con Enter
- Reply a usuarios (↩ pre-filla @usuario en el input)
- Moderación: timeout y ban directo desde hover sobre mensaje
- Badges por rol (👑 broadcaster, 🛡️ mod, ⭐ VIP, 🎗️ sub, etc.)
- Timestamp formato local HH:MM
- Selector de sonido de notificación (pop/ding/chime/notification) generado con Web Audio API
- Control de overlay transparente: tamaño (Peq 300×450 / Med 400×600 / Grande 550×800) y opacidad

### Panel de Sorteos

- Formulario con selector de duración tipo pills (30s, 1min, 2min, 5min, 10min)
- Card activa con contador de participantes animado y badge pulsante
- Botón para finalizar con selección aleatoria de ganador
- **Ruleta aleatoria** — añade nombres manualmente o importación masiva (textarea separado por comas/saltos de línea)
- Selector de duración del giro: 10s / 15s / 20s

### Panel de Predicciones

- Opciones identificadas con letras (A, B, C…)
- Feedback animado al crear la predicción en Twitch
- Estado de carga para la llamada a la API

### Panel OBS URLs

- Cards individuales por overlay con botón **Copiar al portapapeles**
- Selector de tema global (Subnautica 2 / PoE 2 / WoW Horda / WoW Alianza)
- URLs actualizadas automáticamente al escribir el canal
- Overlay Personalizado con campo de nombre del juego (`?game=`)

---

## 🎮 Overlays para OBS

Agrega un navegador **Browser Source** en OBS y usa las siguientes URLs:

> En desarrollo (`npm run dev`), reemplazá `localhost:3000` por `localhost:5173`.

| Overlay | URL |
|---|---|---|
| Chat | `http://localhost:3000/overlay.html?mode=chat&channel=tucanal` |
| Sorteos | `http://localhost:3000/overlay.html?mode=giveaway&channel=tucanal` |
| Predicciones | `http://localhost:3000/overlay.html?mode=prediction&channel=tucanal` |
| Redes Sociales | `http://localhost:3000/overlay.html?mode=social` |
| Overlay Personalizado | `http://localhost:3000/overlay.html?mode=custom&channel=tucanal` |
| Stream HUD | `http://localhost:3000/overlay.html?mode=hud&channel=tucanal` |
| Temporizador | `http://localhost:3000/overlay.html?mode=timer&channel=tucanal` |
| Scoreboard | `http://localhost:3000/overlay.html?mode=scoreboard&channel=tucanal` |
| Subathon | `http://localhost:3000/overlays/subathon.html?channel=tucanal` |
| Subnautica 2 (completo) | `http://localhost:3000/overlays/subnautica2.html?channel=tucanal` |
| Fortnite (completo) | `http://localhost:3000/overlays/fortnite.html?channel=tucanal` |
| Alertas animadas | `http://localhost:3000/overlays/alerts.html?channel=tucanal` |

Para cambiar el tema visual del chat agrega `&theme=subnautica2`, `&theme=poe2`, `&theme=wow` (Horda) o `&theme=alliance` (Alianza).

> Si usás el modo servidor, reemplazá `localhost:3000` por la IP o dominio del servidor.
> En **modo desarrollo** (`npm run dev`), usá `localhost:5173` en lugar de `localhost:3000` (el overlay lo sirve Vite).

---

## 🏗️ Estructura del proyecto

```
StreamForge/
├── packages/
│   ├── backend/           # Servidor (SQLite compartida, schema unificado)
│   │   ├── prisma/        # Schema SQLite (provider: sqlite)
│   │   └── src/
│   │       ├── auth/      # OAuth Twitch + token-crypto (AES-256-GCM) + api-auth (X-Local-Token)
│   │       ├── chat/      # IRC + comandos (!sorteo)
│   │       ├── socket/    # WebSocket (chat:send, join/leave channel)
│   │       ├── giveaways/ # Sorteos (crear, entrar, finalizar, entry events)
│   │       ├── predictions/ # Predicciones Twitch API
│   │       ├── eventsub/  # EventSub WebSocket (follows, subs, cheers, etc.)
│   │       ├── hud/       # Stream HUD (polling Twitch API, estadísticas en vivo)
│   │       ├── timer/     # Temporizador (cuenta regresiva Socket.IO + REST)
│   │       ├── scoreboard/ # Scoreboard (marcador de torneos REST + Socket.IO)
│   │       └── mod/       # Moderación (chatters, timeout, ban, unban vía Twitch API)
│   ├── frontend/          # React + Vite + Overlays
│   │   └── src/
│   │       ├── components/# App, ChatPanel, GiveawayPanel, PredictionPanel,
│   │       │              # HudPanel, TimerPanel, ScoreboardPanel, TrackerPanel,
│   │       │              # StreamActivityFeed, StreamInfoEditor, ModPanel, CommandsPanel,
│   │       │              # ConfigPanel, ObsPanel, ChannelNotifications,
│   │       │              # Overlays (Chat, Giveaway, Prediction, Social, Custom,
│   │       │              # HUD, Timer, Scoreboard, Subnautica2, Wow, Alliance)
│   │       ├── hooks/     # useSocket, useTheme, useAuthStatus
│   │       └── utils/     # sounds.ts, api.ts (apiPost/apiGet/apiPut + OVERLAY_BASE_URL)
│   ├── desktop/           # Electron + SQLite
│   │   ├── extra/         # Frontend dist + backend.env (gitignored) + backend.env.example
│   │   ├── prisma/        # Schema SQLite
│   │   └── src/
│   │       ├── main.ts    # Proceso principal (overlay IPC + will-navigate + local API token)
│   │       └── preload.ts # Bridge IPC seguro (localApiToken, overlay, auth, window)
│   └── shared/            # Tipos compartidos (ChatMessage, GiveawayData, ServerEvent, etc.)
├── docker-compose.yml     # PostgreSQL + Redis (opcional, para producción)
├── STACK_TECNOLOGICO.md
├── SECURITY_AUDIT.md      # Auditoría de seguridad v1
└── README.md
```

---

## 🐛 Fixes conocidos

### v0.2.0 — Overlays nuevos no reciben eventos Socket.IO en OBS

**Causa:** Los componentes HudOverlay, TimerOverlay y ScoreboardOverlay no emitían `join:channel` al conectarse, por lo que no se unían a la sala Socket.IO del canal y nunca recibían eventos en tiempo real.

**Solución:** Añadido `useEffect` con `socket.emit('join:channel', channel)` en los tres overlays, replicando el patrón de ChatOverlay, GiveawayOverlay y PredictionOverlay.

### v0.2.0 — POST endpoints bloqueados en modo desarrollo

**Causa:** `requireLocalAuth` rechazaba todas las peticiones POST cuando `LOCAL_API_TOKEN` no estaba configurado (modo standalone sin Electron).

**Solución:** `requireLocalAuth` ahora permite peticiones cuando no hay token configurado (`!process.env.LOCAL_API_TOKEN`). En producción/desktop el token sigue siendo obligatorio.

### v0.2.0 — URLs de OBS apuntaban a backend en modo desarrollo

**Causa:** `ObsPanel` usaba `backendUrl` (`:3000`) para construir las URLs de overlay, pero en modo dev el frontend lo sirve Vite en `:5173`.

**Solución:** Separada la URL del overlay (`overlayBaseUrl`) que en modo dev (`import.meta.env.DEV`) usa `localhost:5173` y en producción usa `backendUrl`.

### v0.1.0 — Ventana Electron invisible al iniciar

**Causa:** El proceso principal de Electron fallaba silenciosamente si el backend no arrancaba, impidiendo que se mostrara la ventana.

**Solución aplicada en `packages/desktop/src/main.ts`:**
- `startBackend()` envuelto en `try/catch` — el backend puede fallar sin bloquear la UI
- Timeout de fallback de 8 segundos: si `ready-to-show` no dispara, la ventana se fuerza visible
- Hasta 5 reintentos con backoff de 2 s por intento al cargar la URL
- Las dos llamadas a `app.whenReady()` consolidadas en una sola

### v0.1.1 — Pantalla negra: Vite no arrancaba junto con Electron

**Causa:** `npm run dev:desktop` solo lanzaba el proceso Electron sin el servidor de Vite. La ventana intentaba conectarse a `http://localhost:5173` que no tenía nada escuchando.

**Solución:**
- `dev:desktop` (raíz) usa `concurrently` para arrancar Vite **y** Electron al mismo tiempo
- El script `dev` del desktop añade `wait-on http://localhost:5173` — Electron no se lanza hasta que Vite esté respondiendo
- Añadida dependencia `wait-on ^8.0.0` al package desktop

### v0.1.1 — Error Prisma P2021: tabla `main.User` no encontrada

**Causa:** El backend usaba el proveedor PostgreSQL de Prisma pero en modo desktop no hay PostgreSQL. Además, la base de datos SQLite existía pero sin tablas (nunca se había ejecutado `prisma db push`).

**Solución:**
- Unificación de la base de datos: **tanto el backend como el desktop usan SQLite**
- `packages/backend/prisma/schema.prisma` cambiado de `postgresql` → `sqlite`; campos `Json` → `String` (SQLite no tiene tipo JSON nativo)
- `packages/backend/.env` — `DATABASE_URL` apunta a `file:../desktop/prisma/streamforger.db`
- `packages/desktop/src/main.ts` — inyecta `process.env.DATABASE_URL` con la ruta absoluta al `.db` **antes** de importar el backend, garantizando que Prisma use SQLite siempre
- Ejecutado `prisma db push` para crear las tablas en la base de datos

### v0.2.0 — Overlay opacidad global: texto también se volvía transparente

**Causa:** `BrowserWindow.setOpacity()` aplicaba transparencia a toda la ventana, incluyendo el texto de los mensajes.

**Solución:** Reemplazado por inyección de CSS variable `:root { --bg-alpha }`. Todos los overlays ahora usan `rgba(..., var(--bg-alpha, default))` en los fondos, mientras el texto y elementos decorativos mantienen opacidad total.

### v0.2.0 — Socket StrictMode: mensajes duplicados y conexión inestable

**Causa:** En desarrollo con React StrictMode, los efectos se montan/desmontan dos veces, causando que los handlers del socket se registraran múltiples veces.

**Solución:** Se usan referencias de handler específicas al hacer `s.off()`, se verifica `s.connected` inmediato, y se añadió handler `connect_error`. Todos los overlays usan el estado `connected` del hook en vez de `socket?.connected`.

### v0.2.0 — Chat intent no registrado: "None of the queried intents (chat) are known"

**Causa:** `addUserForToken()` no se await-eaba, por lo que `ChatClient` consultaba el intent `chat` antes de que `RefreshingAuthProvider` lo registrara.

**Solución:** Se añadió `await` a `addUserForToken(token, ['chat'])` tanto en `finishAuth()` como en `restoreSession()`.

### v0.2.0 — Chat send: mensajes no aparecían en Twitch

**Causa:** `chatClient.say()` devuelve una Promise que no se await-eaba, por lo que errores (permisos, rate limit) se tragaban en silencio.

**Solución:** `sendMessage()` ahora es `async` con `try/catch` que registra errores en consola, y el handler `chat:send` hace `await`.

### v0.2.0 — POST endpoints devolvían 401 aunque requireLocalAuth devolvía la respuesta

**Causa:** El hook `onRequest` en `packages/backend/src/index.ts` llamaba a `requireLocalAuth(req, reply)` sin `return`, por lo que Fastify continuaba ejecutando el handler después del 401.

**Solución:** Agregado `return` antes de `requireLocalAuth(req, reply)` para detener la ejecución cuando falla la autenticación.

### v0.2.0 — Paneles no se conectaban al socket ni enviaban join:channel

**Causa:** HudPanel, TimerPanel y ScoreboardPanel solo importaban `useSocketEvent` sin llamar a `useSocket()` ni emitir `join:channel`. El overlay tampoco emitía el join.

**Solución:** Agregado `useSocket()` + `useEffect` con `socket.emit('join:channel', channel)` en los tres paneles y los tres overlays. Creado `utils/api.ts` con `apiPost`/`apiGet`/`apiPut` que usan `X-Local-Token` desde `window.streamforger?.localApiToken`.

### v0.2.0 — Tracker y HUD devolvían 500 silencioso

**Causa:** Los handlers de `/tracker/stats` y `fetchHud()` no tenían try/catch, por lo que errores de la API de Twitch (followers no disponibles, rate limit) explotaban como 500 sin mensaje.

**Solución:** Envuelto ambos en try/catch; cada llamada individual a la API de Twitch tiene su propio try/catch con fallback a 0/null.

### v0.2.0 — URLs de overlay en paneles apuntaban a backend en modo dev

**Causa:** HudPanel, TimerPanel y ScoreboardPanel usaban `backendUrl` para mostrar la URL del overlay en el panel, pero en modo dev el overlay lo sirve Vite (`:5173`), no el backend (`:3000`).

**Solución:** Creada constante `OVERLAY_BASE_URL` en `utils/api.ts` que usa `localhost:5173` en dev y `localhost:3000` en producción. Los tres paneles ahora importan `OVERLAY_BASE_URL`.

---

## 🤝 Contribuir

1. Hacé fork del proyecto
2. Creá una rama (`git checkout -b feature/mi-feature`)
3. Hacé commit (`git commit -m 'feat: agregar mi feature'`)
4. Hacé push (`git push origin feature/mi-feature`)
5. Abrí un Pull Request

---

## Star History

<a href="https://www.star-history.com/?repos=JuanEntrena18%2FStreamForge&type=date&legend=bottom-right">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=JuanEntrena18/StreamForge&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=JuanEntrena18/StreamForge&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=JuanEntrena18/StreamForge&type=date&legend=top-left" />
 </picture>
</a>

---

## ☕ Apoya el proyecto

StreamForger es open-source y gratuito. Si te gusta lo que hacemos, considerá invitarnos un café:

[**buymeacoffee.com/jentrena**](https://buymeacoffee.com/jentrena)

Cada aporte ayuda a mantener el desarrollo, el café y las horas de código.

---

## 📄 Licencia

**AGPLv3** — Ver [LICENSE](LICENSE).

Para uso comercial sin exposición del código fuente, contactá al autor.
