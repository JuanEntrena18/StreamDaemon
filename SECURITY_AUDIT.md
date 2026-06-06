# 🔒 Informe de Seguridad — StreamForge
### Auditoría pre-release v1.0 · Windows · Junio 2026

---

> **Alcance:** Revisión completa del código fuente de los cuatro paquetes del monorepo (`backend`, `desktop`, `frontend`, `shared`) con foco en vectores de ataque que afectan a usuarios finales de la distribución Windows.

---

## Resumen ejecutivo

Se han identificado **15 problemas de seguridad** clasificados en cuatro niveles de criticidad. Ninguno de ellos hace la aplicación inutilizable, pero **5 son críticos o altos** y deben corregirse antes de publicar la release. Los restantes pueden resolverse en parches posteriores.

| Criticidad | Nº de problemas |
|---|---|
| 🔴 Crítico | 3 |
| 🟠 Alto | 2 |
| 🟡 Medio | 5 |
| 🔵 Bajo / Informativo | 5 |

---

## 🔴 Problemas Críticos

---

### C-1 · Base de datos SQLite comprometida en el repositorio

**Archivo:** `packages/desktop/prisma/streamforger.db`

**Descripción:**
El archivo `streamforger.db` está **commiteado y rastreado por Git** y es públicamente visible en GitHub. Este archivo es la base de datos SQLite de desarrollo y puede contener tokens de acceso OAuth de Twitch, refresh tokens, y datos de usuario reales si algún colaborador usó el proyecto con credenciales verdaderas.

```bash
# Confirmado: el archivo está rastreado
git ls-files | grep "\.db"
# → packages/desktop/prisma/streamforger.db
```

**Impacto:** Exposición de tokens OAuth de Twitch que permiten control total sobre la cuenta del streamer (banear usuarios, crear predicciones, gestionar raids).

**Solución:**
1. Eliminar el archivo del historial de Git con `git filter-repo` o BFG Repo Cleaner.
2. Añadir `*.db` y `*.db-journal` al `.gitignore`.
3. Rotar inmediatamente cualquier token que haya podido estar en ese archivo.

```gitignore
# Añadir a .gitignore
*.db
*.db-journal
*.db-wal
*.db-shm
packages/desktop/prisma/streamforger.db
```

---

### C-2 · Tokens OAuth almacenados en texto plano en la base de datos

**Archivos:** `packages/backend/src/auth/index.ts`, `packages/backend/prisma/schema.prisma`

**Descripción:**
Los `accessToken` y `refreshToken` de Twitch se guardan **sin ningún tipo de cifrado** en la base de datos SQLite. Cualquier persona con acceso al sistema de archivos del usuario (malware, acceso físico al PC, otro proceso con permisos) puede leer directamente los tokens.

```typescript
// auth/index.ts — los tokens van a la BD tal cual
await prisma.user.upsert({
  data: {
    accessToken: tokenData.access_token,   // ← texto plano
    refreshToken: tokenData.refresh_token, // ← texto plano
  },
});
```

**Impacto:** Un atacante con acceso al archivo `.db` obtiene tokens válidos para operar la cuenta de Twitch del usuario sin su conocimiento.

**Solución:**
Cifrar los tokens antes de persistirlos usando la API de cifrado nativa de Node.js con una clave derivada del `userData` path (único por instalación):

```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  // Clave derivada del path único del usuario — no viaja por red ni se almacena
  const salt = app.getPath('userData');
  return scryptSync(salt, 'streamforge-salt', 32);
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptToken(stored: string): string {
  const [ivHex, tagHex, encHex] = stored.split(':');
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
}
```

---

### C-3 · El servidor backend escucha en `0.0.0.0` — expuesto en red local

**Archivo:** `packages/backend/src/index.ts`, línea 37

**Descripción:**
El servidor Fastify arranca vinculado a **todas las interfaces de red**, no solo al loopback:

```typescript
await app.listen({ port: listenPort, host: '0.0.0.0' }); // ← PROBLEMA
```

En la distribución Windows cualquier otro dispositivo en la misma red local (Wi-Fi del hogar, oficina, café) puede acceder a `http://IP_LOCAL:3000` y llamar a **cualquier endpoint de la API sin autenticación**: iniciar sorteos, terminar predicciones, obtener el estado de autenticación, o desencadenar logout.

**Impacto:** Atacante en la misma red puede tomar control completo de las funciones del stream sin ninguna credencial.

**Solución:**

```typescript
// Cambiar a 127.0.0.1 — solo accesible desde el propio equipo
await app.listen({ port: listenPort, host: '127.0.0.1' });
```

> **Nota:** OBS Browser Source y el propio frontend de Electron acceden a `localhost`, por lo que este cambio no rompe ninguna funcionalidad.

---

## 🟠 Problemas Altos

---

### A-1 · Ningún endpoint de la API requiere autenticación

**Archivos:** `packages/backend/src/giveaways/index.ts`, `packages/backend/src/predictions/index.ts`, `packages/backend/src/auth/index.ts`

**Descripción:**
Todos los endpoints de la API (`/giveaways/start`, `/giveaways/end`, `/predictions/create`, `/predictions/resolve`, `/auth/logout`) son accesibles **sin ningún token, sesión ni cabecera de autorización**. Cualquier proceso en el equipo del usuario —o en la red local si no se corrige C-3— puede invocarlos.

```typescript
// giveaways/index.ts — cero autenticación
app.post('/giveaways/start', async (req, reply) => {
  const { channel, prize, duration = 60 } = req.body;
  // ← no hay comprobación de quién hace esta petición
```

**Impacto combinado con C-3:** Cualquier persona en la red puede iniciar sorteos falsos en el canal, resolver predicciones con el resultado que quiera, o forzar el logout del streamer en plena emisión.

**Solución:**
Crear un middleware de autenticación local basado en un token aleatorio generado al arrancar la app y pasado al frontend a través del preload de Electron:

```typescript
// backend/src/middleware/localAuth.ts
import { FastifyRequest, FastifyReply } from 'fastify';

let localToken: string | null = null;

export function setLocalToken(token: string) {
  localToken = token;
}

export async function requireLocalAuth(req: FastifyRequest, reply: FastifyReply) {
  const provided = req.headers['x-local-token'];
  if (!localToken || provided !== localToken) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}
```

```typescript
// desktop/src/main.ts — generar token al arrancar
import { randomBytes } from 'crypto';
const LOCAL_API_TOKEN = randomBytes(32).toString('hex');
process.env.LOCAL_API_TOKEN = LOCAL_API_TOKEN;
// Pasarlo al frontend via contextBridge en el preload
```

---

### A-2 · El parámetro `state` del flujo OAuth no se verifica

**Archivo:** `packages/backend/src/auth/index.ts`, líneas 57–119

**Descripción:**
El parámetro `state` se genera correctamente al iniciar el flujo OAuth, pero **nunca se almacena ni se comprueba** en el callback. Esto hace que el flujo sea vulnerable a CSRF (Cross-Site Request Forgery): un atacante puede crear un enlace malicioso que complete un callback OAuth con un `code` propio y vincular su cuenta de Twitch a la sesión del streamer.

```typescript
app.get('/auth/login', (_req, reply) => {
  const state = Math.random().toString(36).slice(2); // ← generado
  // ... pero nunca se guarda en ningún lado
});

app.get('/auth/callback', async (req, reply) => {
  const { code } = req.query as { code?: string };
  // ← state del callback nunca se comprueba
```

**Impacto:** Un streamer podría autenticar sin saberlo la cuenta Twitch de un atacante.

**Solución:**

```typescript
// Guardar state en memoria al generarlo
const pendingStates = new Set<string>();

app.get('/auth/login', (_req, reply) => {
  const state = randomBytes(16).toString('hex'); // más seguro que Math.random
  pendingStates.add(state);
  setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000); // expira en 10 min
  // ... construir URL con state
});

app.get('/auth/callback', async (req, reply) => {
  const { code, state } = req.query as { code?: string; state?: string };
  if (!state || !pendingStates.has(state)) {
    return reply.status(400).send({ error: 'Invalid or expired state' });
  }
  pendingStates.delete(state);
  // ... continuar con el intercambio de código
});
```

---

## 🟡 Problemas Medios

---

### M-1 · Sin rate limiting en ningún endpoint

**Archivos:** `packages/backend/src/index.ts`, todos los módulos de ruta

**Descripción:**
No existe ningún límite de peticiones en la API ni en los eventos de Socket.IO. Esto expone la aplicación a:

- Bucles de polling en `/auth/device/poll` consumiendo CPU innecesariamente.
- Spam masivo de sorteos o predicciones desde scripts automatizados.
- Inundación del chat de Twitch a través de `chat:send` en Socket.IO.

**Solución:**
Usar `@fastify/rate-limit` en los endpoints sensibles:

```bash
npm install @fastify/rate-limit
```

```typescript
// backend/src/index.ts
import rateLimit from '@fastify/rate-limit';

await app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
});

// Límites más estrictos para auth
app.post('/auth/device/poll', {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
}, handler);
```

Para Socket.IO, limitar el evento `chat:send`:

```typescript
const chatRateLimit = new Map<string, number>();

socket.on('chat:send', ({ channel, text }) => {
  const now = Date.now();
  const last = chatRateLimit.get(socket.id) ?? 0;
  if (now - last < 1500) return; // máximo 1 mensaje cada 1.5s por cliente
  chatRateLimit.set(socket.id, now);
  // ...
});
```

---

### M-2 · Los esquemas Zod del paquete `shared` no se usan en las rutas

**Archivos:** `packages/shared/src/schemas.ts`, `packages/backend/src/giveaways/index.ts`, `packages/backend/src/predictions/index.ts`

**Descripción:**
El proyecto tiene esquemas de validación bien definidos en `shared/src/schemas.ts` (`GiveawayCreateSchema`, `PredictionCreateSchema`), pero **ninguna ruta del backend los importa ni los aplica**. Los cuerpos de las peticiones se desestructuran directamente sin validar:

```typescript
// giveaways/index.ts — sin validación
const { channel, prize, duration = 60 } = req.body;
// prize podría ser undefined, un objeto, 10 MB de texto…

// predictions/index.ts — sin validación
const { channelId, title, options } = req.body;
// options podría no ser un array, o tener 1000 elementos
```

**Impacto:** Crasheos del servidor por datos malformados, posibles inyecciones en mensajes de chat, o denegación de servicio enviando payloads gigantes.

**Solución:**
Aplicar los schemas existentes en cada ruta:

```typescript
import { GiveawayCreateSchema } from '@streamforger/shared';

app.post('/giveaways/start', async (req, reply) => {
  const result = GiveawayCreateSchema.safeParse(req.body);
  if (!result.success) {
    return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() });
  }
  const { prize, duration } = result.data;
  // ...
});
```

---

### M-3 · CORS abierto a todos los orígenes

**Archivo:** `packages/backend/src/index.ts`, línea 19; `packages/backend/src/socket/index.ts`, línea 9

**Descripción:**
Tanto el servidor HTTP como Socket.IO aceptan peticiones de **cualquier origen**:

```typescript
await app.register(cors, { origin: true });          // HTTP
cors: { origin: true, credentials: true }             // Socket.IO
```

En una app de escritorio, el único origen legítimo es `http://localhost:5173` (dev) o el propio `file://` / `http://localhost:3000` (producción).

**Solución:**

```typescript
const ALLOWED_ORIGINS = isDev
  ? ['http://localhost:5173', 'http://localhost:3000']
  : ['http://localhost:3000'];

await app.register(cors, {
  origin: ALLOWED_ORIGINS,
  credentials: false, // no se usan cookies
});

// Socket.IO
io = new SocketIOServer(app.server, {
  cors: { origin: ALLOWED_ORIGINS },
});
```

---

### M-4 · Errores internos de Twitch reenviados al cliente

**Archivo:** `packages/backend/src/auth/index.ts`, líneas 101 y 138

**Descripción:**
Cuando falla el intercambio de tokens con Twitch, el error completo de la API externa se reenvía directamente al frontend:

```typescript
return reply.status(400).send({
  error: 'Failed to get token',
  details: err  // ← puede contener información interna de la API de Twitch
});
```

**Impacto bajo** en producción (app local), pero es una mala práctica que puede revelar detalles de configuración si alguien analiza el tráfico.

**Solución:**
Loguear el error internamente y devolver solo un mensaje genérico:

```typescript
if (!tokenRes.ok) {
  const err = await tokenRes.json().catch(() => ({}));
  app.log.error({ err }, 'Twitch token exchange failed');
  return reply.status(400).send({ error: 'Authentication failed. Please try again.' });
}
```

---

### M-5 · El overlay acepta URLs arbitrarias sin validación

**Archivo:** `packages/desktop/src/main.ts`, líneas 195–196 y 162

**Descripción:**
El handler IPC `overlay:open` acepta cualquier URL cuando `isUrl = true` y la carga directamente en una `BrowserWindow` sin ninguna comprobación:

```typescript
ipcMain.on('overlay:open', (_e, url: string, isUrl: boolean, theme?: string) => {
  createOverlayWindow(url, isUrl, theme); // ← url sin validar
});

// En createOverlayWindow:
if (isUrl) {
  overlayWindow.loadURL(urlOrChannel); // ← carga cualquier URL
}
```

Si la capa de renderizado (Chromium) fuera comprometida o un mensaje IPC manipulado llegara desde contenido no confiable, un atacante podría cargar una página externa con acceso al preload.

**Solución:**
Validar que las URLs cargadas en el overlay sean de orígenes de confianza:

```typescript
const TRUSTED_OVERLAY_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
];

function isUrlTrusted(url: string): boolean {
  try {
    const parsed = new URL(url);
    return TRUSTED_OVERLAY_ORIGINS.some(o => url.startsWith(o))
      || parsed.protocol === 'file:';
  } catch {
    return false;
  }
}

ipcMain.on('overlay:open', (_e, url: string, isUrl: boolean, theme?: string) => {
  if (isUrl && !isUrlTrusted(url)) {
    console.warn(`[security] Blocked untrusted overlay URL: ${url}`);
    return;
  }
  createOverlayWindow(url, isUrl, theme);
});
```

---

## 🔵 Problemas Bajos / Informativos

---

### B-1 · `SESSION_SECRET` definido pero nunca utilizado

**Archivo:** `packages/backend/src/config.ts`, línea 9

**Descripción:**
La variable `SESSION_SECRET` está presente en la configuración y en el `.env.example` con el valor por defecto `'change-me-in-production'`, pero **no se usa en ningún lugar del código**. Esto indica que en algún momento se planeó implementar sesiones con cookies, pero la funcionalidad nunca se completó.

**Riesgo:** Bajo en el estado actual. Si en el futuro se implementaran cookies de sesión sin actualizar este secret, el valor por defecto permitiría a un atacante firmar cookies válidas.

**Solución:** Eliminar la variable de `config.ts` y del `.env.example` hasta que sea necesaria, para no dar una falsa sensación de seguridad:

```typescript
// config.ts — eliminar esta línea hasta que se implemente
SESSION_SECRET: process.env.SESSION_SECRET ?? 'change-me-in-production',
```

---

### B-2 · `Math.random()` para generar el parámetro `state` OAuth

**Archivo:** `packages/backend/src/auth/index.ts`, líneas 58 y 70

**Descripción:**
El parámetro `state` del flujo OAuth se genera con `Math.random()`, que **no es criptográficamente seguro**:

```typescript
const state = Math.random().toString(36).slice(2); // ← no seguro
```

**Solución:**

```typescript
import { randomBytes } from 'crypto';
const state = randomBytes(16).toString('hex'); // 128 bits de entropía real
```

---

### B-3 · Cabeceras de seguridad HTTP ausentes

**Archivo:** `packages/backend/src/index.ts`

**Descripción:**
El servidor no envía ninguna cabecera de seguridad estándar. Si bien la app es local, es una buena práctica añadir `@fastify/helmet` para protección ante clickjacking y sniffing de contenido:

```bash
npm install @fastify/helmet
```

```typescript
import helmet from '@fastify/helmet';

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'wss://eventsub.wss.twitch.tv', 'https://id.twitch.tv'],
    },
  },
});
```

---

### B-4 · No existe protección `will-navigate` en Electron

**Archivo:** `packages/desktop/src/main.ts`

**Descripción:**
La ventana principal de Electron no tiene un listener en `will-navigate` que impida que el renderizador pueda navegar a URLs externas si algún link o código malicioso lo intentara. Solo `setWindowOpenHandler` está configurado, que protege `window.open()` pero no la navegación directa de la ventana.

**Solución:**

```typescript
mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
  const parsedUrl = new URL(navigationUrl);
  const allowedHosts = ['localhost'];
  if (!allowedHosts.includes(parsedUrl.hostname)) {
    event.preventDefault();
    shell.openExternal(navigationUrl); // Abre en el navegador por defecto
  }
});
```

---

### B-5 · `docker-compose.yml` con credenciales hardcodeadas

**Archivo:** `docker-compose.yml`, línea 7

**Descripción:**
La contraseña de PostgreSQL está hardcodeada en el fichero de compose que es público en el repositorio:

```yaml
POSTGRES_PASSWORD: overlay_dev
```

Aunque son credenciales de desarrollo, el fichero es visible públicamente y los usuarios podrían copiarlas para producción sin cambiarlas.

**Solución:**
Usar variables de entorno en el compose:

```yaml
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-overlay_dev}
```

Y documentar en el README que hay que cambiar la contraseña antes de cualquier despliegue no-local.

---

## Plan de acción recomendado

### Antes de publicar la release v1.0

| # | Problema | Acción | Tiempo estimado |
|---|---|---|---|
| 1 | **C-1** DB en Git | Eliminar con `git filter-repo`, añadir `*.db` al `.gitignore` | 30 min |
| 2 | **C-3** Server en `0.0.0.0` | Cambiar `host` a `127.0.0.1` | 5 min |
| 3 | **A-1** API sin autenticación | Implementar token local vía IPC | 2–3 h |
| 4 | **A-2** OAuth state no verificado | Guardar y validar el parámetro `state` | 1 h |
| 5 | **M-2** Validación Zod sin usar | Aplicar `safeParse` en todas las rutas | 1 h |

### En los primeros parches post-release

| # | Problema | Acción |
|---|---|---|
| 6 | **C-2** Tokens en texto plano | Cifrar con AES-256-GCM antes de persistir |
| 7 | **M-1** Sin rate limiting | Añadir `@fastify/rate-limit` y límite en Socket.IO |
| 8 | **M-3** CORS abierto | Restringir a orígenes de confianza |
| 9 | **M-4** Errores internos expuestos | Loguear internamente, respuesta genérica al cliente |
| 10 | **M-5** URL de overlay sin validar | Whitelist de orígenes permitidos |
| 11 | **B-1–B-5** Problemas bajos | Resolver según disponibilidad |

---

## Dependencias — estado de versiones

Las dependencias principales están en versiones modernas y sin CVEs conocidos en el momento de esta auditoría:

| Paquete | Versión | Estado |
|---|---|---|
| `fastify` | `^5.0.0` | ✅ Actual |
| `socket.io` | `^4.7.0` | ✅ Actual |
| `@prisma/client` | `^5.10.0` | ✅ Actual |
| `@twurple/*` | `^7.x` | ✅ Actual |
| `electron` | No visible en auditoría | ⚠️ Verificar versión — actualizar a la última LTS |
| `zod` | `^3.22.0` | ✅ Actual |

**Acción:** Ejecutar `npm audit` en cada paquete antes de la release y asegurarse de que Electron esté en su versión LTS más reciente.

---

*Informe generado sobre el código fuente de la rama `main` · commit más reciente disponible en el momento de la auditoría.*
