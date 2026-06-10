# StreamForger

**Open-source stream tools, forged for creators.**

StreamForger es una aplicación modular para creadores de contenido que permite gestionar canales de Twitch con overlays personalizados por juego, sorteos interactivos, predicciones, visualización del chat en tiempo real y un sistema de **Subathon** para ampliar la duración del directo con recompensas de la comunidad. Compatible con OBS Studio vía Browser Source.

Disponible en dos modos:
- **🖥️ Servidor Linux** — Multi-usuario, SQLite, ideal para producción
- **💻 Escritorio Windows** — App portátil con Electron + SQLite, cero configuración

---

## ✨ Características

- **🎨 Overlays temáticos independientes** — Overlays en HTML+CSS+JS puro (sin React) para Subnautica 2, Fortnite y Alertas animadas. Cada overlay incluye Canvas de partículas, animaciones CSS, cola de eventos en tiempo real y conexión directa a Socket.IO. Se cargan como archivos estáticos (`/overlays/`) en OBS.
- **🔴 Subathon** — Temporizador ampliable en directo: los espectadores añaden tiempo con suscripciones (+5 min), bits (+1 min por cada 100 bits) o recompensas de canal. Límite máximo configurable (12/24h). Panel de control con inicio/pausa/reanudar/detener, añadir tiempo manual, historial de acciones y overlay OBS dedicado con cuenta atrás, barra de progreso, estadísticas y feed de actividad.
- **📡 Gestor del Stream unificado** — Dashboard que combina vista previa del stream (iframe embed), editor de título/juego, estadísticas en vivo (viewers, followers, subs, uptime) y feed de actividad del canal con filtros — todo en una sola pantalla.
- **💬 Chat en vivo** — Lectura del chat de Twitch vía IRC con reenvío en tiempo real a los overlays mediante Socket.IO. Incluye envío de mensajes, reply (↩ @usuario), moderación (timeout/ban), badges por rol y selector de sonido de notificación.
- **🎁 Sorteos interactivos** — Comando `!sorteo` en el chat para participar. Panel de control con ruleta canvas, selector de duración del giro (10/15/20s) e importación masiva de nombres. Overlay dedicado con lista de participantes en vivo y ruleta animada con ganador gigante.
- **📊 Predicciones** — Integración con la API de Predicciones de Twitch. Creación de encuestas desde el panel de control con resolución automática.
- **📊 Stream HUD** — Panel de estadísticas en vivo (viewers, followers, subs, uptime, game) con polling automático y overlay informativo.
- **⏱️ Temporizador** — Cuenta regresiva configurable desde el panel con inicio, pausa, reanudación y reset. Overlay con barra de progreso, alerta visual los últimos 30s y estado "Tiempo cumplido".
- **🏆 Scoreboard** — Marcador en vivo para torneos y competiciones con jugadores, puntuaciones por incremento/decremento y barra de progreso visual. Panel completo con gestión de jugadores.
- **🔔 Notificaciones EventSub** — Follows, subs, re-suscripciones, gifts, redemptions y cheers en tiempo real vía EventSub WebSocket, con overlay animado en pantalla.
- **🌐 Redes sociales** — Overlay animado que muestra las redes del streamer de forma rotativa.
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
| **A-1** | Token de API local (128 bits) requerido en toda petición POST (`X-Local-Token`) | ✅ |
| **A-2** | Parámetro `state` OAuth generado con `crypto.randomBytes(16)` y verificado con expiración de 10 min | ✅ |
| **M-1** | Rate limiting global (100 req/min) + throttle Socket.IO (1 msg/1.5s) | ✅ |
| **M-2** | Validación de entrada con **Zod** en todas las rutas de API | ✅ |
| **M-3** | CORS restringido a localhost | ✅ |
| **B-1** | Cabeceras de seguridad: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` | ✅ |

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
| **Subathon** | `http://localhost:3000/overlays/subathon.html?channel=tucanal` |
| **Subnautica 2 (completo)** | `http://localhost:3000/overlays/subnautica2.html?channel=tucanal` |
| **Fortnite (completo)** | `http://localhost:3000/overlays/fortnite.html?channel=tucanal` |
| **Alertas animadas** | `http://localhost:3000/overlays/alerts.html?channel=tucanal` |

> Los overlays HTML independientes solo muestran datos reales del backend. Para vista previa con datos simulados añade `&demo=true` a la URL. Cuando el modo demo está activo se muestra un badge **🧪 MODO PRUEBA** permanente en pantalla.

Para cambiar el tema visual del chat agrega `&theme=subnautica2`, `&theme=poe2`, `&theme=wow` o `&theme=alliance`.

> En **modo desarrollo** (`npm run dev`), usá `localhost:5173` en lugar de `localhost:3000`.

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
│   │   └── subathon/      # Subathon (temporizador ampliable)
│   ├── frontend/
│   │   ├── src/components/  # Dashboard (App, Chat, Giveaway, etc.)
│   │   └── public/overlays/ # Overlays HTML independientes
│   │       ├── subnautica2.html
│   │       ├── fortnite.html
│   │       ├── alerts.html
│   │       └── subathon.html
│   ├── desktop/           # Electron + SQLite
│   └── shared/            # Tipos compartidos (SubathonState, TimerState, etc.)
├── STACK_TECNOLOGICO.md
└── README.md
```

---

## 🤝 Contribuir

1. Hacé fork del proyecto
2. Creá una rama (`git checkout -b feature/mi-feature`)
3. Hacé commit (`git commit -m 'feat: agregar mi feature'`)
4. Hacé push (`git push origin feature/mi-feature`)
5. Abrí un Pull Request

---

## ☕ Apoya el proyecto

[**buymeacoffee.com/jentrena**](https://buymeacoffee.com/jentrena)

---

## 📄 Licencia

**AGPLv3** — Ver [LICENSE](LICENSE).
