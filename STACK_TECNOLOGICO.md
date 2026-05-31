# StreamForger — Stack Tecnológico

## Visión General

Aplicación modular para creadores de contenido que permite gestionar el canal de Twitch con overlays personalizados por juego, sorteos, predicciones e interacción con chat. Compatible con OBS vía Browser Source.

---

## Frontend (Overlays)

| Tecnología | Versión | Propósito |
|---|---|---|
| **React 18** | ^18.2 | Librería UI para construir los overlays y paneles de control |
| **TypeScript** | ^5.4 | Tipado estático en todo el frontend |
| **Vite** | ^5.x | Bundler dev/build ultrarrápido |
| **Tailwind CSS** | ^3.4 | Estilizado utilitario para overlays responsivos |
| **Framer Motion** | ^11.x | Animaciones CSS de alto rendimiento para overlays temáticos |
| **Socket.IO Client** | ^4.x | Comunicación en tiempo real con el backend |
| **@twurple/chat** | ^6.x | Cliente IRC para leer el chat de Twitch (en backend, expuesto vía WS al frontend) |

### Librerías de overlay (OBS Browser Source)

- **`obs-browser-source`** — APIs nativas de OBS para resolución dinámica, FPS, etc.
- **`obs-websocket-js`** (futuro) — Control remoto desde la app (cambio de escenas, fuentes)

---

## Backend

| Tecnología | Versión | Propósito |
|---|---|---|
| **Node.js** | 20 LTS | Runtime principal |
| **TypeScript** | ^5.4 | Tipado estático |
| **Fastify** | ^4.x | Framework HTTP rápido y eficiente |
| **Socket.IO** | ^4.x | WebSocket bidireccional (chat en vivo, sorteos, predicciones) |
| **@twurple/api** | ^6.x | Cliente oficial Twitch API (autenticación, datos de stream, usuarios) |
| **@twurple/chat** | ^6.x | Conexión IRC para leer/enviar mensajes del chat |
| **@twurple/eventsub** | ^6.x | Webhooks EventSub (follows, raids, predicciones, puntos de canal) |
| **Prisma** | ^5.x | ORM para base de datos |
| **Zod** | ^3.x | Validación de schemas y tipos runtime |
| **node-cron** | ^3.x | Tareas programadas (recordatorios, limpieza) |

---

## Base de Datos

| Tecnología | Propósito |
|---|---|
| **PostgreSQL 16** | Almacenamiento principal (usuarios, canales, configuraciones, historial) |
| **Redis 7** | Cache, sesiones, colas de pub/sub para eventos tiempo real |

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

Flujo OAuth 2.0 con **Code Grant** + **PKCE**:

1. Usuario hace clic en "Login con Twitch"
2. Backend genera `auth_url` con scopes:
   - `chat:read` / `chat:edit`
   - `channel:read:redemptions`
   - `channel:manage:predictions` / `channel:read:predictions`
   - `channel:manage:raids`
   - `channel:manage:moderators`
3. Twitch redirige a `/callback` → backend intercambia code → almacena `access_token` + `refresh_token` (cifrados en DB)
4. Middleware refresca token automáticamente al expirar

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
- Las predicciones se crean desde un panel de control (React) → API REST → Twitch API.
- Los sorteos se gestionan completamente en backend (entradas vía chat comando, selección aleatoria).

---

## DevOps / Herramientas

| Herramienta | Propósito |
|---|---|
| **Docker** + **Docker Compose** | Entorno local reproducible (app + postgres + redis) |
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
│   ├── frontend/          # Vite + React + Overlays
│   ├── shared/            # Tipos, schemas Zod, constantes
│   └── obs-integration/   # Scripts auxiliares para OBS
├── docker-compose.yml
├── package.json           # Workspaces (npm/pnpm)
└── STACK_TECNOLOGICO.md
```

---

## Plan de Implementación (Hito 1)

| Paso | Descripción |
|---|---|
| 1. Setup | Inicializar monorepo, workspaces, Docker, Prisma, ESLint, TS config |
| 2. Auth | Implementar OAuth Twitch con PKCE, almacenar tokens |
| 3. Chat | Conectar @twurple/chat, reenviar mensajes vía Socket.IO al frontend |
| 4. Overlay base | Crear componente Overlay genérico + themes CSS por juego |
| 5. Overlay chat | Mostrar chat en overlay con filtros (mod-only, emotes, etc.) |
| 6. Sorteos | Comando `!sorteo`, entrada vía chat, selección aleatoria, overlay notificación |
| 7. Predicciones | Integración con Twitch Predictions API, panel admin en frontend |
| 8. Social overlay | Overlay con enlaces a redes sociales animados |
