# StreamForger

**Open-source stream tools, forged for creators.**

StreamForger es una aplicación modular para creadores de contenido que permite gestionar canales de Twitch con overlays personalizados por juego, sorteos interactivos, predicciones y visualización del chat en tiempo real. Compatible con OBS Studio vía Browser Source.

Disponible en dos modos:
- **🖥️ Servidor Linux** — Multi-usuario, SQLite (o PostgreSQL con Docker), ideal para producción
- **💻 Escritorio Windows** — App portátil con Electron + SQLite, cero configuración

---

## ✨ Características

- **🎨 Overlays temáticos** — Overlays con la estética de Subnautica 2, Path of Exile 2 y World of Warcraft. Cada tema define su propia paleta de colores, tipografía y animaciones.
- **💬 Chat en vivo** — Lectura del chat de Twitch vía IRC con reenvío en tiempo real a los overlays mediante Socket.IO.
- **🎁 Sorteos interactivos** — Comando `!sorteo` en el chat para participar. Panel de control para iniciar/finalizar sorteos con selección aleatoria de ganador.
- **📊 Predicciones** — Integración con la API de Predicciones de Twitch. Creación de encuestas desde el panel de control con resolución automática.
- **🌐 Redes sociales** — Overlay animado que muestra las redes del streamer de forma rotativa.
- **🔐 Autenticación OAuth** — Login con Twitch mediante OAuth 2.0 + PKCE. Tokens persistidos con refresco automático.
- **🖥️ Dashboard premium** — Interfaz con sidebar de navegación, glassmorphism, animaciones Framer Motion y paleta violeta/índigo.

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
# El instalador se genera en packages/desktop/release/StreamForger Setup 0.0.1.exe
# También queda una versión portable en packages/desktop/release/win-unpacked/
```

> El instalador incluye Node.js, SQLite y todo lo necesario. Al ejecutarlo, la app arranca el servidor en `localhost:3000` y abre la ventana del dashboard. No requiere Docker, PostgreSQL ni Redis.

> ⚠️ Al no tener firma digital, Windows mostrará "Windows protected your PC". Hacé clic en **More info → Run anyway** la primera vez. Para distribución oficial obtené un certificado de firma de código.

---

## 🎨 Dashboard

El panel de control cuenta con un rediseño premium (v0.1.0):

- **Sidebar de navegación** con acceso a Sorteos, Predicciones, Overlay Transparente y URLs de OBS
- **Glassmorphism** — cards semitransparentes con blur y bordes sutiles
- **Animaciones** con Framer Motion en transiciones de tab y estados activos
- **Tipografía Inter** (Google Fonts) con sistema de tokens CSS
- **Indicador de conexión** animado (pulso) en la barra superior
- **Badge de estado** con color temático por sección

### Panel de Sorteos

- Formulario con selector de duración tipo pills
- Card activa con contador de participantes animado y badge pulsante
- Botón para finalizar con selección aleatoria de ganador

### Panel de Predicciones

- Opciones identificadas con letras (A, B, C…)
- Feedback animado al crear la predicción en Twitch
- Estado de carga para la llamada a la API

### Panel OBS URLs

- Cards individuales por overlay con botón **Copiar al portapapeles**
- Selector de tema global (Subnautica 2 / PoE 2 / WoW) con preview de color
- URLs actualizadas automáticamente al escribir el canal

---

## 🎮 Overlays para OBS

Agrega un navegador **Browser Source** en OBS y usa las siguientes URLs:

| Overlay | URL |
|---|---|
| Chat | `http://localhost:3000/overlay.html?mode=chat&channel=tucanal` |
| Sorteos | `http://localhost:3000/overlay.html?mode=giveaway&channel=tucanal` |
| Predicciones | `http://localhost:3000/overlay.html?mode=prediction&channel=tucanal` |
| Redes Sociales | `http://localhost:3000/overlay.html?mode=social` |

Para cambiar el tema visual agrega `&theme=subnautica2`, `&theme=poe2` o `&theme=wow`.

> Si usás el modo servidor, reemplazá `localhost:3000` por la IP o dominio del servidor.

---

## 🏗️ Estructura del proyecto

```
StreamForge/
├── packages/
│   ├── backend/           # Servidor (SQLite compartida, schema unificado)
│   │   ├── prisma/        # Schema SQLite (provider: sqlite)
│   │   └── src/
│   │       ├── auth/      # OAuth Twitch
│   │       ├── chat/      # IRC + comandos
│   │       ├── socket/    # WebSocket
│   │       ├── giveaways/ # Sorteos
│   │       └── predictions/ # Predicciones
│   ├── frontend/          # React + Vite + Overlays
│   │   └── src/
│   │       ├── components/# Chat, Giveaway, Prediction, Social, ObsPanel
│   │       ├── hooks/     # useSocket, useTheme
│   │       └── themes/    # Subnautica 2, PoE 2, WoW
│   ├── desktop/           # Electron + SQLite
│   │   ├── prisma/        # Schema SQLite + streamforger.db (base de datos)
│   │   └── src/
│   │       ├── main.ts    # Proceso principal (inyecta DATABASE_URL, retry, fallback)
│   │       └── preload.ts # Bridge IPC seguro
│   └── shared/            # Tipos, schemas, cache interface
├── docker-compose.yml     # PostgreSQL + Redis (opcional, para producción)
├── STACK_TECNOLOGICO.md
└── README.md
```

---

## 🐛 Fixes conocidos

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

---

## 🤝 Contribuir

1. Hacé fork del proyecto
2. Creá una rama (`git checkout -b feature/mi-feature`)
3. Hacé commit (`git commit -m 'feat: agregar mi feature'`)
4. Hacé push (`git push origin feature/mi-feature`)
5. Abrí un Pull Request

---

## 📄 Licencia

**AGPLv3** — Ver [LICENSE](LICENSE).

Para uso comercial sin exposición del código fuente, contactá al autor.
