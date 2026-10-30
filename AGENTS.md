# AGENTS.md — StreamDaemon (StreamForge) Operational Guide

> **Guía maestra para Agentes de IA y Desarrolladores**  
> Este documento define la arquitectura, convenciones, flujos de trabajo y directrices de optimización para trabajar en el monorepo de **StreamDaemon**.

---

## 1. Visión General del Proyecto

**StreamDaemon** (anteriormente StreamForge) es una plataforma open-source, autocontenida y de ejecución local (local-first) diseñada para streamers de Twitch y creadores de contenido. Proporciona más de 57 overlays personalizables, integración en tiempo real con Twitch (IRC + EventSub WS), control de OBS, widgets interactivos, sistema de avatares con físicas 2D, herramientas de analítica y seguridad anti-bots, todo sin depender de servicios en la nube ni cuotas mensuales.

### Principios Fundamentales
1. **Local-First & Privacidad:** Todos los datos (tokens cifrados con AES-256-GCM, bases de datos SQLite, configuraciones y modelos de IA como Ollama) residen exclusivamente en la máquina del usuario.
2. **Modularidad & Desacoplamiento:** Backend (Fastify), Frontend (React/Vite), Desktop (Electron) y Standalone Overlays (Vanilla HTML/CSS/JS) están desacoplados mediante contratos compartidos (`@streamdaemon/shared`).
3. **Alto Rendimiento en Directo:** Bajo consumo de CPU/GPU para no penalizar el rendimiento durante streaming de videojuegos intensivos.

---

## 2. Estructura del Monorepo

El repositorio utiliza **npm workspaces** con la siguiente jerarquía de paquetes:

```
twitch_overlay/
├── package.json               # Configuración raíz de workspaces y scripts globales
├── tsconfig.base.json         # Configuración base de TypeScript
├── eslint.config.js           # Configuración ESLint v9
├── AGENTS.md                  # Este documento
├── packages/
│   ├── shared/                # Contratos, esquemas Zod, constantes, utilidades de caché
│   ├── backend/               # Servidor Fastify, Twitch API/IRC/EventSub, Socket.IO, Prisma ORM
│   ├── frontend/              # Dashboard React 18, Overlays React, Standalone HTML overlays (public/overlays/)
│   ├── desktop/               # Aplicación Electron 33, SQLite local, IPC bridge, ventanas transparentes
│   └── img/                   # Recursos gráficos compartidos (SVG, logos)
├── scripts/                   # Scripts de generación de assets, spritesheets y thumbnails
└── prisma/                    # Esquemas de base de datos SQLite (en backend y desktop)
```

---

## 3. Detalle de Paquetes y Responsabilidades

### 📦 `packages/shared` (`@streamdaemon/shared`)
- **Propósito:** Núcleo de interoperabilidad y fuente única de verdad para tipos de datos y esquemas de validación.
- **Tecnologías:** TypeScript, Zod.
- **Contenido Clave:**
  - `schemas.ts`: Validadores Zod para payloads de API, configuraciones y eventos WebSocket.
  - `types.ts`: Tipos TypeScript para overlays, eventos de Twitch, alertas, widgets y usuarios.
  - `constants.ts`: Constantes compartidas (puertos, nombres de eventos Socket.IO, roles).
  - `cache.ts`: Estructuras de caché ligera en memoria (LRU / TTL).
- **Regla:** Cualquier nuevo endpoint o evento WebSocket *debe* tener su tipo y esquema definido aquí antes de ser implementado en backend o frontend.

### 📦 `packages/backend` (`@streamdaemon/backend`)
- **Propósito:** Servidor de procesamiento, autenticación de Twitch, EventSub WebSocket, Socket.IO Hub y persistencia SQLite.
- **Tecnologías:** Node.js (ESM), Fastify v5, `@twurple/*` (API, Auth, Chat, EventSub-WS), Socket.IO, Prisma ORM, `obs-websocket-js`, Zod.
- **Arquitectura de Módulos (`src/`):**
  - `auth/`: Flujo OAuth de Twitch, cifrado AES-256 de tokens y refresh automático.
  - `eventsub/`: Cliente WebSocket oficial de Twitch para follows, subs, bits, raids, redemptions.
  - `chat/`: Conexión IRC de chat, relay hacia Socket.IO, comandos personalizados, TTS, auto-greeting.
  - `socket/`: Servidor Socket.IO que emite eventos a frontend y overlays standalone.
  - `obs/`: Conexión bidireccional con OBS Studio mediante OBS WebSocket v5.
  - `security/`: Protección anti-bots, filtros de spam, auto-ban y verificación de token local (`LOCAL_API_TOKEN`).
  - `kpi/`, `activity/`, `diary/`, `calendar/`: Módulos de analítica, historial y agenda.
  - `giveaways/`, `predictions/`, `subathon/`, `timer/`: Lógica de interacción en vivo.
  - `avatars/`: Gestión de avatares reactivos a eventos de streaming.
  - `vods/`, `fortnite/`, `speedrun/`, `scoreboard/`: Extensiones y widgets de juego.

### 📦 `packages/frontend` (`@streamdaemon/frontend`)
- **Propósito:** Interfaz de usuario del panel de control (Dashboard) y overlays en vivo (React y Standalone).
- **Tecnologías:** React 18, Vite 6, Framer Motion, PixiJS 8, Matter.js, Recharts, Socket.IO Client.
- **Estructura Clave:**
  - `src/components/`: Paneles modulares del dashboard (Chat, Obs, Giveaway, Kpi, Avatars, Mod, Config, etc.).
  - `src/avatars/`: Motor 2D en WebGL con PixiJS y físicas Matter.js para avatares interactivos.
  - `src/index.css`: Sistema de diseño global (variables CSS, temas oscuros, utilidades y tipografía).
  - `src/hooks/` & `src/contexts/`: Gestión de sockets, estado global, i18n y Web Speech TTS.
  - `src/contexts/SocketContext.tsx`: Proveedor centralizado de Socket.IO. Todos los componentes React deben consumir el socket a través de `useSocket()` / `useSocketEvent()` desde este contexto.
  - `src/components/ChatPanel.tsx`: Lista de chat virtualizada con `@tanstack/react-virtual` para mantener 60 FPS con grandes volúmenes de mensajes.
  - `public/overlays/`: Más de 57 overlays estáticos en HTML/CSS/JS puro para OBS Browser Source (Subnautica 2, Fortnite, Retro 8-bit, Win95, RetroWave, Sci-Fi, Vertical 9:16, etc.), con soporte para `?demo=true`.

### 📦 `packages/desktop` (`@streamdaemon/desktop`)
- **Propósito:** Wrapper de escritorio para Windows con soporte para ventanas overlay transparentes e interacción "click-through".
- **Tecnologías:** Electron 33, `better-sqlite3`, `@prisma/client`, `electron-store`, `electron-builder`.
- **Estructura Clave:**
  - `src/main.ts`: Ciclo de vida de la aplicación, inicio del backend empaquetado, gestión de bases de datos SQLite en `userData`, atajos de teclado globales y gestión de ventanas (Main, Overlay, Settings).
  - `src/preload.ts`: Bridge IPC seguro (`contextBridge`) para exponer funcionalidades nativas controladas al frontend.
  - `prisma/schema.prisma`: Esquema de datos para sqlite local (User, ChannelConfig, Giveaway, Prediction, SecurityConfig, SecurityWhitelist).

---

## 4. Flujos de Trabajo y Comandos

### Instalación y Preparación
```bash
# Instalar dependencias en todos los paquetes
npm install

# Generar cliente Prisma
npx prisma generate --schema=packages/desktop/prisma/schema.prisma
```

### Desarrollo
```bash
# Compilar shared antes de iniciar desarrollo
npm run predev

# Modo desarrollo Web (Backend Fastify + Frontend Vite en navegador)
npm run dev

# Modo desarrollo Desktop (Frontend Vite + Electron)
npm run dev:desktop
```

### Compilación y Producción
```bash
# Compilar todos los paquetes TypeScript
npm run build

# Compilar e empaquetar instalador de Electron para Windows (NSIS)
npm run dist -w packages/desktop
# o usando el script raíz:
npm run build:desktop
```

### Calidad de Código
```bash
# Ejecutar linter en todo el monorepo
npm run lint

# Formatear archivos con Prettier
npm run format

# Verificación de tipos TypeScript (build de todos los paquetes)
npm run typecheck

# Ejecutar tests unitarios
npm run test -w packages/backend
npm run test -w packages/frontend
```

---

## 5. Convenciones de Código y Arquitectura

### 1. Orden de Compilación
El flujo de dependencias estricto es:
$$\text{shared} \longrightarrow \text{backend} / \text{frontend} \longrightarrow \text{desktop}$$
Cualquier cambio en `@streamdaemon/shared` requiere recompilar `packages/shared` (`npm run build -w packages/shared`) para que backend y frontend reconozcan los nuevos tipos.

### 2. Estilo de Código y Tecnologías
- **TypeScript:** Modo estricto activado en todos los paquetes. La regla ESLint `@typescript-eslint/no-explicit-any` está configurada como **error**; no usar `any` salvo excepciones justificadas y documentadas.
- **ES Modules:** Todo el proyecto usa `"type": "module"`. Importaciones locales deben incluir extensión `.js` en código compilado de Node si es necesario.
- **Estilos CSS:** Uso prioritario de **CSS Modules** (`[Component].module.css`) y variables del sistema de diseño en `index.css`. Evitar clases ad-hoc que rompan la estética cyber / dark mode.
- **Aislamiento de Overlays:** Los overlays en `public/overlays/` deben permanecer como HTML/CSS/JS ligeros y autónomos, comunicándose vía Socket.IO y respondiendo a parámetros de URL (`?demo=true`, `?theme=...`).

### 3. Seguridad Local
- Todas las llamadas entre Frontend y Backend en local deben autenticarse con el header `x-local-api-token` validado contra `process.env.LOCAL_API_TOKEN`.
- Las credenciales de Twitch (tokens de acceso y refresh) se cifran mediante **AES-256-GCM** antes de persistirse en la base de datos SQLite.
- Validación exhaustiva de entradas en Fastify usando esquemas Zod.

---

## 6. Vectores de Optimización para Próximas Tareas

Al trabajar en la optimización de la aplicación, priorizar las siguientes áreas:

### A. Rendimiento del Frontend (React & Vite)
1. ✅ **Centralización de Socket:** El socket del frontend se centraliza en `src/contexts/SocketContext.tsx`; todos los componentes React consumen `useSocket()` / `useSocketEvent()` desde este contexto.
2. ✅ **Virtualización de Listas:** La lista de mensajes del chat ya está virtualizada con `@tanstack/react-virtual`.
3. **Lazy Loading & Code Splitting:** Carga diferida (`React.lazy` + `Suspense`) de paneles pesados del Dashboard (KPIs, Editor de OBS, Bitrate Calculator, Avatars Engine).
4. **Optimización de Re-renders:** Uso de `React.memo`, `useCallback`, `useMemo` y selectores de estado finos en paneles con alta frecuencia de eventos (Chat feed, Activity Feed).
5. **Limpieza de Recursos PixiJS/Matter.js:** Destrucción adecuada de texturas, listeners y bodies de físicas al desmontar componentes de avatares para evitar fugas de memoria.

### B. Rendimiento del Backend (Fastify & Sockets)
1. **Emisión Selectiva en Socket.IO:** Enviar payloads optimizados (solo deltas/diffs) y segmentar por salas (rooms) para evitar broadcasts innecesarios a overlays inactivos.
2. **Batching & Throttling:** Agrupar escrituras a SQLite y aplicar debouncing a eventos frecuentes (viewers count, CPU polling).
3. **Optimización de Consultas Prisma:** Índices adecuados en SQLite y consultas con `select` específico en lugar de recuperar modelos completos.
4. ✅ **Logging Estructurado:** Uso de `pino` en backend y `electron-log` en desktop, con redirección de `console.*` al logger para trazabilidad y rotación de logs.

### C. Overlays & Browser Sources en OBS
1. **Aceleración GPU & CSS:** Uso de `transform: translate3d()` y `will-change` en animaciones clave de overlays para garantizar 60 FPS estables en OBS.
2. **Modo Ahorro / Pausa:** Reducir o pausar animaciones Canvas en overlays cuando no haya eventos activos en pantalla.
3. **Minimización de Assets:** Optimizar spritesheets, fuentes y svgs embebidos.

### D. Optimización de Electron (Desktop)
1. **Huella de Memoria:** Suspender o destruir ventanas secundarias (Settings, Preview) cuando están ocultas.
2. **IPC Eficiente:** Usar transferencias binarias o buffers directos para datos pesados de video/audio, evitando serialización JSON redundante.
3. ✅ **SQLite WAL Mode:** Configurado SQLite en modo WAL (Write-Ahead Logging) mediante `?journal_mode=WAL` en `DATABASE_URL` para lecturas y escrituras concurrentes de alta velocidad.

---

## 7. Protocolo de Trabajo para Agentes

1. **Investigar Antes de Modificar:** Revisar siempre los tipos en `packages/shared/src/` y la arquitectura existente antes de crear nuevas abstracciones.
2. **Preservar la Integridad del Monorepo:** No romper scripts de construcción ni rutas de empaquetado de Electron (`extraPath`, `dist-electron`).
3. **Validación Continua:** Tras cada cambio significativo, verificar con `npm run typecheck` y `npm run lint`.
4. **Documentación Clara:** Documentar en markdown cualquier nuevo módulo o contrato de Socket.IO.

---

## 8. Directrices de Diseño Frontend

Al crear nuevas interfaces de usuario o rediseñar componentes existentes, seguir las directrices de `docs/FRONTEND_DESIGN_GUIDELINES.md`. Estas son las reglas esenciales:

### Principios Clave
1. **Identidad Visual Distintiva:** Cada diseño debe tener una personalidad propia, no genérica ni templada. Evitar los "defaults AI" (ej: fondo crema + terracota, SaaS-card kit, ALL-CAPS eyebrow labels).
2. **Typography Intencional:** Elegir fuentes deliberadamente, usar máximo 2 familias claramente distintas. Los textos son contenido, no decoración.
3. **Estructura Informada:** Borders, dividers y spacing deben codificar información jerárquica, no ser decoración gratuita.
4. **Motion Deliberado:** Usar animación solo para atención intencional. Evitar fade-and-slide-up en cada sección (genérico).
5. **Restraint:** Un elemento memorable por vista. Todo lo demás quieto y disciplinado.

### Antes de Diseñar
1. **Identificar el Brief:** ¿Qué es el producto? ¿Quién es el usuario? ¿Cuál es el job principal del diseño?
2. **Propuesta de Plan:** Crear un token system (color, tipo, layout, principios) antes de escribir código.
3. **Self-Critique:** Revisar si el plan suena genérico o específico del brief. Si es genérico, revisar y justificar por qué.

### Trabajando con Código
- CSS Modules y variables del sistema de diseño en `index.css` siempre.
- Estructurar selectores con cuidado de especificidad.
- Usar `useCallback`/`useMemo` en componentes de alta frecuencia (Chat, overlays).

**Regla de Oro:** Si el resultado se ve "templated" o se parece a un boilerplate de cualquier otro proyecto, parar y revisar. El diseño debe responder al brief específico, no a patrones genéricos.
