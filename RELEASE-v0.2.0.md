# StreamForger v0.2.0

**Open-source stream tools, forged for creators.**

---

## 📦 Descarga

| Plataforma | Enlace |
|---|---|
| **Windows (portátil)** | `StreamForger.Setup.0.2.0.exe` (adjunto a esta release) |
| **Servidor Linux** | `git clone https://github.com/JuanEntrena18/StreamForge.git && cd StreamForge && npm install && npm run build` |

---

## ✨ Novedades

### 🎨 39 Overlays temáticos independientes
Cuatro temas nuevos con integración Socket.IO en tiempo real para chat, follows, subs, cheers y redemptions:

- **Retro 8-bits** — Estilo arcade clásico con tipografía _Press Start 2P_
- **Retro Win95** — Interfaz Windows 95 con bordes 3D, barra azul y botones de la época
- **RetroWave** — Estética Synthwave con neón, degradados solares y tipografía _Orbitron_
- **Tactical Sci-Fi** — Estilo militar/futurista con paneles rojos, tipografía _Share Tech Mono_ y glitch

Cada tema incluye overlays de: pantalla de inicio, gameplay, just chatting y despedida, más chat independiente y HUD.

**Total: 39 overlays standalone** — sin React, CSS+JS puro, conexión WebSocket directa.

### 🔔 Sistema de Alertas animadas
- 6 overlays de alerta temáticos (8-bits, Win95, RetroWave, Sci-Fi, Fortnite, Horda)
- Cola de eventos FIFO con animación de entrada/salida
- **Sonidos MP3 configurables** — selector de archivo local con persistencia en `data/alert-sounds/`
- Botones de prueba para cada tipo de evento desde el panel
- Integración con EventSub: follows, subs, resubs, gifts, cheers y redemptions

### 🔴 Subathon
- Temporizador ampliable en directo con los nuevos eventos de Twitch
- **EventSub integrado** — subs, resubs, gifts, cheers y follows añaden tiempo automáticamente
- Tiempo configurable por tier de suscripción (Tier 1/2/3), bits, propinas y follows
- **Alertas dinámicas en pantalla** — notificaciones animadas al añadirse tiempo
- **Diseño personalizable** — colores (primario, acento, fondo, texto) y selector de fuente (10 tipografías)
- Overlay OBS con cuenta atrás, barra de progreso, estadísticas y feed de actividad

### 🪟 Ventana overlay de escritorio
- **Icono en la barra de tareas** — la ventana overlay aparece como ventana independiente
- **Menú contextual** (clic derecho) — eliminar/mostrar bordes, ajustes de ventana, resetear posición
- **Ventana de ajustes** independiente con tipografía, tamaño de fuente y vista previa
- **Soporte para Cyan Chat** — URL configurable desde el panel, cargada en el overlay con controles

### 💬 Chat en vivo
- **Saludo automático** — mensaje de bienvenida configurable 30 segundos después de que un usuario entre al chat
- **Integración con Cyan Chat** — selector de modo (Chat / Cyan Chat) con campo de URL
- Pipeline de conexión mejorado con reconexión automática

### 📊 Predicciones
- Corrección del ID de canal — ahora resuelve el login a broadcaster ID antes de crear predicciones
- Autenticación corregida — usa `apiPost()` para enviar el token local en peticiones POST

### 🛡️ Anti-Bots
Detección de follow bots vía EventSub, filtro de spam en IRC, auto-ban mediante Helix API y escaneo manual de seguidores. Panel con estadísticas, toggles, lista blanca y registro de detecciones.

### 🧮 Calculadora de Bitrate
100% client-side. Calcula el bitrate óptimo según tu velocidad de subida con recomendación automática de resolución, FPS y bitrate. Incluye guía paso a paso para OBS.

### 🌍 Traducción
- **Castellano de España** como idioma nativo de la interfaz
- Preparado para: inglés, francés, alemán e italiano (conmutables desde el selector de idioma)

### 🔒 Seguridad
- Tokens OAuth cifrados con AES-256-GCM
- Token de API local (128 bits) en toda petición POST
- Rate limiting global + throttle Socket.IO
- Validación Zod en todas las rutas
- Cabeceras de seguridad CSP, X-Content-Type-Options, X-Frame-Options

---

## 🐛 Correcciones

- Conexión Socket.IO en overlays standalone: transporte WebSocket-only para evitar interceptación de Fastify v5
- Carga del cliente Socket.IO desde servidor local (`/overlays/js/socket.io.js`) en lugar de CDN
- Pipeline de chat: await connect/join, reconexión automática y gestión de canales unidos
- Overlay de Fortnite: URL de backend configurable, fallback a polling transport
- Atajo F12 para DevTools en ventanas de producción
- Subathon: tick del temporizador corrige tiempo pausado, integración EventSub sin duplicación

---

## 🚀 Cómo usar

```bash
# Servidor Linux
git clone https://github.com/JuanEntrena18/StreamForge.git
cd StreamForge
npm install
cp packages/backend/.env.example packages/backend/.env
# Configurar TWITCH_CLIENT_ID y TWITCH_CLIENT_SECRET
npm run build
npm run start -w packages/backend

# Desarrollo
npm run dev
```

Panel: `http://localhost:3000` · Desarrollador: `http://localhost:5173`

Para los overlays en OBS, agrega un Browser Source apuntando a las URLs del panel (sección "Overlay URL" de cada herramienta).

---

## ☕ Apoya el proyecto

[buymeacoffee.com/jentrena](https://buymeacoffee.com/jentrena)

---

*StreamForger v0.2.0 — AGPLv3*
