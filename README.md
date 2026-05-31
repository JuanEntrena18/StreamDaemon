# StreamForger

**Open-source stream tools, forged for creators.**

StreamForger es una aplicación modular para creadores de contenido que permite gestionar canales de Twitch con overlays personalizados por juego, sorteos interactivos, predicciones y visualización del chat en tiempo real. Compatible con OBS Studio vía Browser Source.

---

## ✨ Características

- **🎨 Overlays temáticos** — Overlays con la estética de Subnautica 2, Path of Exile 2 y World of Warcraft. Cada tema define su propia paleta de colores, tipografía y animaciones.
- **💬 Chat en vivo** — Lectura del chat de Twitch vía IRC con reenvío en tiempo real a los overlays mediante Socket.IO.
- **🎁 Sorteos interactivos** — Comando `!sorteo` en el chat para participar. Panel de control para iniciar/finalizar sorteos con selección aleatoria de ganador.
- **📊 Predicciones** — Integración con la API de Predicciones de Twitch. Creación de encuestas desde el panel de control con resolución automática.
- **🌐 Redes sociales** — Overlay animado que muestra las redes del streamer de forma rotativa.
- **🔐 Autenticación OAuth** — Login con Twitch mediante OAuth 2.0 + PKCE. Tokens persistidos en base de datos con refresco automático.
- **🖥️ Multiplataforma** — Compatible con OBS, Streamlabs, y cualquier software que soporte Browser Source.

---

## 🚀 Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| **Backend** | Node.js 20, Fastify, Socket.IO, @twurple (chat, API, EventSub) |
| **Base de datos** | PostgreSQL 16 (Prisma ORM), Redis 7 (cache/pub-sub) |
| **Infraestructura** | Docker Compose, Node.js Workspaces (monorepo) |

---

## 📦 Instalación

### Prerrequisitos

- Node.js 20+
- Docker + Docker Compose
- Una aplicación registrada en [dev.twitch.tv/console](https://dev.twitch.tv/console)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/JuanEntrena18/StreamForge.git
cd StreamForge

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp packages/backend/.env packages/backend/.env.local
# Editar .env.local con tu TWITCH_CLIENT_ID y TWITCH_CLIENT_SECRET

# 4. Iniciar base de datos y Redis
docker compose up -d

# 5. Crear tablas en PostgreSQL
npx prisma db push --schema=packages/backend/prisma/schema.prisma

# 6. Iniciar en modo desarrollo
npm run dev
```

El panel de control estará en `http://localhost:5173` y el backend en `http://localhost:3000`.

---

## 🎮 Overlays para OBS

Agrega un navegador **Browser Source** en OBS y usa las siguientes URLs:

| Overlay | URL |
|---|---|
| Chat | `http://localhost:5173/overlay.html?mode=chat&channel=tucanal` |
| Sorteos | `http://localhost:5173/overlay.html?mode=giveaway&channel=tucanal` |
| Predicciones | `http://localhost:5173/overlay.html?mode=prediction&channel=tucanal` |
| Redes Sociales | `http://localhost:5173/overlay.html?mode=social` |

Para cambiar el tema visual agrega `&theme=subnautica2`, `&theme=poe2` o `&theme=wow`.

---

## 🏗️ Estructura del proyecto

```
StreamForge/
├── packages/
│   ├── backend/          # Fastify + Twitch API + Socket.IO
│   │   ├── prisma/       # Schema de base de datos
│   │   └── src/
│   │       ├── auth/     # OAuth Twitch con persistencia en DB
│   │       ├── chat/     # Cliente IRC + manejador de comandos
│   │       ├── socket/   # Servidor Socket.IO
│   │       ├── giveaways/# Lógica de sorteos
│   │       └── predictions/ # Integración con Twitch Predictions
│   ├── frontend/         # Vite + React + Overlays
│   │   └── src/
│   │       ├── components/ # Overlays (chat, giveaway, prediction, social)
│   │       ├── hooks/      # useSocket, useTheme
│   │       └── themes/     # Definiciones CSS por juego
│   └── shared/           # Tipos, schemas Zod, constantes
├── docker-compose.yml    # PostgreSQL + Redis
└── STACK_TECNOLOGICO.md  # Documentación técnica detallada
```

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Hacé fork del proyecto
2. Creá una rama (`git checkout -b feature/mi-feature`)
3. Hacé commit de tus cambios (`git commit -m 'feat: agregar mi feature'`)
4. Hacé push a la rama (`git push origin feature/mi-feature`)
5. Abrí un Pull Request

---

## 📄 Licencia

**AGPLv3** — Ver el archivo [LICENSE](LICENSE) para más detalles.

Para uso comercial sin exposición del código fuente, contactá al autor.
