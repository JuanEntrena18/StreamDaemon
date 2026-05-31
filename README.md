# StreamForger

**Open-source stream tools, forged for creators.**

StreamForger es una aplicación modular para creadores de contenido que permite gestionar canales de Twitch con overlays personalizados por juego, sorteos interactivos, predicciones y visualización del chat en tiempo real. Compatible con OBS Studio vía Browser Source.

Disponible en dos modos:
- **🖥️ Servidor Linux** — Multi-usuario, PostgreSQL + Redis, ideal para producción
- **💻 Escritorio Windows** — App portátil con Electron + SQLite, cero configuración

---

## ✨ Características

- **🎨 Overlays temáticos** — Overlays con la estética de Subnautica 2, Path of Exile 2 y World of Warcraft. Cada tema define su propia paleta de colores, tipografía y animaciones.
- **💬 Chat en vivo** — Lectura del chat de Twitch vía IRC con reenvío en tiempo real a los overlays mediante Socket.IO.
- **🎁 Sorteos interactivos** — Comando `!sorteo` en el chat para participar. Panel de control para iniciar/finalizar sorteos con selección aleatoria de ganador.
- **📊 Predicciones** — Integración con la API de Predicciones de Twitch. Creación de encuestas desde el panel de control con resolución automática.
- **🌐 Redes sociales** — Overlay animado que muestra las redes del streamer de forma rotativa.
- **🔐 Autenticación OAuth** — Login con Twitch mediante OAuth 2.0 + PKCE. Tokens persistidos con refresco automático.

---

## 🚀 Stack Tecnológico

| Capa | Servidor Linux | Escritorio Windows |
|---|---|---|
| **Frontend** | React 18 + Vite + Tailwind + Framer Motion | React 18 + Vite + Tailwind + Framer Motion |
| **Backend** | Node.js + Fastify + Socket.IO + @twurple | Node.js + Fastify (embebido en Electron) |
| **Base de datos** | PostgreSQL 16 (Prisma ORM) | SQLite (Prisma ORM) |
| **Cache** | Redis 7 | Memoria (Map) |
| **Runtime** | Docker Compose | Electron (.exe) |

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

# 2. Dependencias
npm install

# 3. Configurar credenciales de Twitch
cp packages/backend/.env.example packages/backend/.env
# Editar packages/backend/.env con TWITCH_CLIENT_ID y TWITCH_CLIENT_SECRET

# 4. Generar Prisma client para SQLite
npx prisma generate --schema=packages/desktop/prisma/schema.prisma

# 5. Iniciar en modo desarrollo (ventana Electron)
npm run dev:desktop

# 6. Generar instalador .exe
npm run build:desktop
# El instalador se genera en packages/desktop/release/StreamForger Setup 0.0.1.exe
# También queda una versión portable en packages/desktop/release/win-unpacked/
```

> El instalador incluye Node.js, SQLite y todo lo necesario. Al ejecutarlo, la app arranca el servidor en `localhost:3000` y abre la ventana del dashboard. No requiere Docker, PostgreSQL ni Redis.

> ⚠️ Al no tener firma digital, Windows mostrará "Windows protected your PC". Hacé clic en **More info → Run anyway** la primera vez. Para distribución oficial obtené un certificado de firma de código.

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
│   ├── backend/           # Servidor (PostgreSQL + Redis)
│   │   ├── prisma/        # Schema PostgreSQL
│   │   └── src/
│   │       ├── auth/      # OAuth Twitch
│   │       ├── chat/      # IRC + comandos
│   │       ├── socket/    # WebSocket
│   │       ├── giveaways/ # Sorteos
│   │       └── predictions/ # Predicciones
│   ├── frontend/          # React + Vite + Overlays
│   │   └── src/
│   │       ├── components/# Chat, Giveaway, Prediction, Social
│   │       ├── hooks/     # useSocket, useTheme
│   │       └── themes/    # Subnautica 2, PoE 2, WoW
│   ├── desktop/           # Electron + SQLite
│   │   ├── prisma/        # Schema SQLite
│   │   └── src/
│   │       ├── main.ts    # Proceso principal de Electron
│   │       └── preload.ts # Bridge IPC seguro
│   └── shared/            # Tipos, schemas, cache interface
├── docker-compose.yml     # PostgreSQL + Redis
└── STACK_TECNOLOGICO.md
```

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
