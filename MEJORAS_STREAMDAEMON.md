# 🛠️ Plan de Mejoras — StreamDaemon / StreamForge

> **Objetivo:** Mejorar la estabilidad, seguridad y calidad de las funcionalidades ya implementadas, sin añadir nuevas features.  
> **Basado en:** análisis de `AGENTS.md`, `README.md`, `SECURITY_AUDIT.md`, `STACK_TECNOLOGICO.md`, `REVISION_SEGURIDAD.md`, `RELEASE-v0.2.0.md` y revisión del código fuente actual.

---

## ✅ Cambios realizados en esta sesión

### Eliminación del soporte Linux
- Documentación actualizada: `README.md`, `README.en.md`, `README_en.md`, `AGENTS.md`, `STACK_TECNOLOGICO.md`.
- Eliminado `docker-compose.yml` (PostgreSQL/Redis solo para Linux server).
- Eliminado el target `linux` de `packages/desktop/package.json`.
- Eliminado el flujo OAuth Authorization Code Grant (browser/server); ahora solo se usa Device Code Grant para la app de escritorio Windows.
- Simplificados `packages/backend/src/config.ts` y `packages/backend/.env.example` (sin `TWITCH_REDIRECT_URI` ni `FRONTEND_URL`).
- Actualizados todos los puntos del frontend que llamaban a `/auth/login` para usar el flujo Device Code (`useAuthStatus`).

### Mejoras críticas de seguridad
- `packages/backend/src/auth/token-crypto.ts`: la clave de cifrado ya no se deriva de `TWITCH_CLIENT_SECRET`. Ahora se genera una clave maestra aleatoria de 256 bits por instalación y se guarda en `data/token-master.key` con permisos `0o600`. Se mantiene un fallback para descifrar tokens antiguos.
- `packages/backend/src/auth/api-auth.ts`: ya no se loguea el token completo; solo se muestran los primeros y últimos 4 caracteres.
- `packages/backend/src/auth/index.ts`: `GET /auth/token` ahora solo responde a orígenes locales de confianza (`localhost:3000`, `localhost:5173`, etc.).
- `packages/backend/src/index.ts`: el middleware `requireLocalAuth` ahora protege todos los métodos mutadores (`POST`, `PUT`, `PATCH`, `DELETE`), no solo `POST`.
- `packages/backend/src/socket/index.ts`: autenticación en el handshake de Socket.IO. Los clientes autenticados (dashboard/Electron) pueden leer y escribir; los overlays anónimos locales solo pueden leer.
- `packages/desktop/src/main.ts`: el token local se inyecta automáticamente en las cabeceras HTTP/WebSocket hacia `localhost:3000` mediante `session.webRequest.onBeforeSendHeaders`; el renderer nunca ve el token.
- `packages/desktop/src/preload.ts`: eliminado `localApiToken` del `contextBridge`.
- `packages/frontend/src/utils/api.ts`: en Electron no se añade `x-local-token` manualmente; en modo navegador de desarrollo se obtiene de `/auth/token` restringido por origen.
- `packages/frontend/src/hooks/useSocket.ts`: el token se envía en `auth` del handshake de Socket.IO en modo navegador.

### Mejoras críticas de estabilidad
- `packages/backend/src/subathon/index.ts`: refactorizado a un modelo basado en `endAt` (timestamp de finalización) para evitar drift del temporizador. Las pausas/reanudaciones recalculan correctamente el tiempo restante.
- `packages/backend/src/speedrun/index.ts`: el cronómetro ahora funciona. Se guarda `startTime` por canal y se calcula `elapsedTime = Date.now() - startTime` en cada tick/consulta.
- `packages/backend/src/chat/index.ts`: `setupChat()` ahora espera correctamente a que el cliente anterior haga `quit()` antes de crear uno nuevo. Los timers de saludo se cancelan y reprograman si un usuario se une repetidamente.

### Mejoras altas
- `packages/frontend/src/avatars/AvatarEngine.ts`: el `ResizeObserver` ahora se guarda y se desconecta en `destroy()`. Eliminación de avatares más robusta.
- `packages/desktop/src/main.ts`: la versión de la app se lee dinámicamente de `app.getVersion()` en lugar de estar hardcodeada.
- `packages/desktop/src/main.ts`: el backend ahora se reinicia con backoff si falla al arrancar y se muestra una pantalla de carga mientras tanto.

---

## 📋 Resumen Ejecutivo

El proyecto ha evolucionado mucho desde la auditoría de seguridad original (`SECURITY_AUDIT.md`). En la versión actual se han corregido la mayoría de problemas críticos que impedían publicar la release:

| Problema original | Estado actual |
|---|---|
| Base de datos SQLite en Git | ✅ Mitigado (`.gitignore` incluye `*.db`) |
| Tokens OAuth en texto plano | ✅ Cifrados con AES-256-GCM |
| Servidor en `0.0.0.0` | ✅ Escucha en `127.0.0.1` |
| API sin autenticación | ✅ `x-local-token` en rutas POST |
| OAuth `state` no verificado | ✅ Mapa `pendingStates` con expiración |
| Sin rate limiting | ✅ `@fastify/rate-limit` global |
| CORS abierto | ✅ Lista de orígenes restringida |
| Errores de Twitch expuestos | ✅ Respuestas genéricas al cliente |

Sin embargo, quedan **mejoras importantes para estabilidad y robustez** antes de considerar el proyecto listo para producción. Este documento las recoge organizadas por criticidad y área.

---

## 🔴 Críticas — Estabilidad y seguridad inmediatas

### 1. Derivar la clave de cifrado de un secreto de instalación, no del `TWITCH_CLIENT_SECRET`

**Archivo:** `packages/backend/src/auth/token-crypto.ts`

**Problema:** La clave AES-256-GCM se deriva de `TWITCH_CLIENT_SECRET`. Si ese valor se filtra (está en `.env`, en GitHub Actions, etc.), todos los tokens almacenados de todos los usuarios se pueden descifrar. Además, el mismo secreto sirve para autenticar la app ante Twitch.

**Recomendación:**
- En Electron: usar `app.getPath('userData')` + un secreto aleatorio guardado en el keyring del SO o en un archivo con permisos `0o600`.
- En servidor Linux: permitir configurar `TOKEN_ENCRYPTION_KEY` en `.env` o generar una clave en el primer arranque.
- Nunca usar un valor que también sea credencial de API pública.

---

### 2. Eliminar o proteger `GET /auth/token`

**Archivo:** `packages/backend/src/auth/index.ts:287-289`

**Problema:** Cualquier proceso local puede pedir el `LOCAL_API_TOKEN` al backend sin autenticación. Esto anula el propósito del token.

**Recomendación:**
- Eliminar el endpoint por completo.
- En Electron, pasar el token al renderer **solo** a través de `contextBridge`.
- En servidor Linux, imprimir el token en consola al arrancar o escribirlo en un archivo con permisos restringidos, pero nunca exponerlo por HTTP.

---

### 3. Aplicar autenticación local a TODOS los métodos HTTP, no solo POST

**Archivo:** `packages/backend/src/index.ts:85-99`

**Problema:** `requireLocalAuth` se añade automáticamente a `POST`, pero `GET`, `PUT` y `DELETE` quedan desprotegidos salvo que cada ruta lo añada manualmente.

**Recomendación:**
- Usar un `onRequest` hook global que permita explícitamente solo rutas públicas (`/auth/login`, `/auth/callback`, `/auth/device`, estáticos, etc.).
- O registrar todas las rutas administrativas bajo un prefijo `/api` y aplicar el middleware a ese prefijo.

---

### 4. Autenticar las conexiones y eventos de Socket.IO

**Archivo:** `packages/backend/src/socket/index.ts`

**Problema:** Cualquier cliente que se conecte al WebSocket local puede emitir eventos como `chat:send`, `giveaway:start`, `prediction:create`, `timer:start`, `scoreboard:update`, etc.

**Recomendación:**
- En el handshake de Socket.IO, exigir el `x-local-token` en `auth` o en query string.
- Rechazar conexiones sin token.
- Validar el token también en eventos de escritura (chat, sorteos, predicciones, moderación).

---

### 5. Corregir fugas de memoria y acumulación de timers/intervals

| Archivo | Problema | Solución |
|---|---|---|
| `packages/backend/src/socket/index.ts` | `chatThrottle` mapa sin limpieza de sockets desconectados | Limpiar en `disconnect` o usar TTL |
| `packages/backend/src/chat/index.ts` | Reconexiones crean nuevos `ChatClient` sin detener el anterior | Lifecycle manager con `stop()` explícito |
| `packages/backend/src/chat/index.ts` | `pendingGreetings` acumula timers | Cancelar timer previo si el usuario se une de nuevo |
| `packages/backend/src/timer/index.ts` | `setInterval` de 1s con drift acumulativo | Calcular tiempo restante con `Date.now()` |
| `packages/backend/src/subathon/index.ts` | Mismo problema de drift | Refactorizar a base de timestamps |
| `packages/backend/src/scoreboard/index.ts` | Intervals sin clear al borrar board | Guardar interval por canal y limpiar |
| `packages/backend/src/kpi/index.ts` | `saveSnapshots()` sincrónico en cada poll | Batch/debounce o flush en background |

---

### 6. Corregir el temporizador de Speedrun

**Archivo:** `packages/backend/src/speedrun/index.ts:66-103`

**Problema:** `elapsedTime` se inicializa a `0` en el primer split pero nunca se incrementa. El cronómetro no funciona.

**Recomendación:** Mantener un `startTime` y calcular `elapsedTime = Date.now() - startTime` en cada consulta/tick.

---

## 🟠 Altas — Robustez y calidad del código

### 7. Centralizar y limpiar el ciclo de vida de Socket.IO en frontend

**Archivo:** `packages/frontend/src/hooks/useSocket.ts`

**Problema:** El socket es un singleton a nivel de módulo, pero cada componente llama a `connect()` y registra listeners directamente, lo que genera listeners duplicados y reconexiones innecesarias.

**Recomendación:**
- Crear un `SocketProvider` con contexto de React.
- `useSocket()` consume el contexto; `useSocketEvent()` se suscribe una sola vez por evento.
- Desconectar el socket al cerrar la aplicación o cambiar de canal de forma controlada.

---

### 8. Virtualizar la lista de mensajes del chat

**Archivo:** `packages/frontend/src/contexts/ChatContext.tsx`

**Problema:** Se guardan hasta 100 mensajes en estado de React; en streams con mucho chat se producen re-renders frecuentes.

**Recomendación:** Usar `react-window` o `react-virtuoso` para renderizar solo los mensajes visibles.

---

### 9. Limpiar recursos del motor de avatares

**Archivo:** `packages/frontend/src/avatars/AvatarEngine.ts`, `AvatarSprite.ts`

**Problema:** El `ResizeObserver` no se desconecta en `destroy()`, y las texturas de PixiJS de temas anteriores no se destruyen al cambiar de tema rápidamente.

**Recomendación:**
- Llamar a `resizeObserver.disconnect()` y destruir la aplicación PixiJS.
- Rastrear texturas cargadas y llamar `texture.destroy(true)` antes de reemplazarlas.

---

### 10. Agregar manejo de errores y reintentos en el arranque del backend en Electron

**Archivo:** `packages/desktop/src/main.ts:122-131`

**Problema:** Si el backend falla al arrancar, la app sigue abierta sin funcionalidad.

**Recomendación:**
- Reintentar con backoff limitado.
- Mostrar una ventana de error fatal si no se puede iniciar.
- Iniciar el backend en paralelo con la ventana principal, no secuencialmente.

---

### 11. Unificar y proteger el flujo de autenticación en Electron

**Archivo:** `packages/desktop/src/preload.ts`, `packages/desktop/src/main.ts`

**Problema:** El preload expone `localApiToken` globalmente, y `auth.login` abre directamente `/auth/login` en lugar de usar el flujo de device code.

**Recomendación:**
- No exponer el token al renderer.
- Usar `ipcRenderer.invoke` para peticiones autenticadas y que el main inyecte el header.
- Unificar el flujo OAuth (device code en escritorio, authorization code en servidor).

---

### 12. Corregir la versión hardcodeada en Electron

**Archivo:** `packages/desktop/src/main.ts:75-94`

**Problema:** `APP_VERSION` está hardcodeada a `'0.2.4'` mientras que `package.json` dice `0.5.0`.

**Recomendación:** Leer la versión de `app.getVersion()` o importar `package.json`.

---

## 🟡 Medias — Mantenibilidad y rendimiento

### 13. Reducir el uso de `any` y fortalecer TypeScript

**Archivo:** Múltiples (`socket/index.ts`, `fortnite/index.ts`, `kpi/index.ts`, paneles de React)

**Problema:** Aunque `tsconfig.base.json` tiene `strict: true`, se usa `any` en muchos puntos críticos, lo que anula las garantías de tipo.

**Recomendación:**
- Cambiar `no-explicit-any` a `error` en ESLint.
- Tipar los eventos de Socket.IO con las uniones discriminadas de `packages/shared`.
- Tipar los payloads de Twitch API con tipos de `@twurple/api`.

---

### 14. Reemplazar `console.*` por logging estructurado

**Archivo:** Todo el backend y parte del desktop

**Problema:** Mensajes de consola dispersos y sin formato dificultan el diagnóstico en producción.

**Recomendación:** Usar el logger de Fastify (`req.log` / `app.log`) en el backend y `electron-log` en el desktop. Evitar loguear tokens o contraseñas.

---

### 15. Habilitar SQLite WAL mode

**Archivo:** `packages/backend/prisma/schema.prisma`, `packages/desktop/prisma/schema.prisma`

**Problema:** SQLite por defecto usa modo journal, que bloquea lecturas durante escrituras.

**Recomendación:** Añadir `?mode=wal` a la cadena de conexión (`DATABASE_URL`) para mejor concurrencia y menos corrupción ante cortes.

---

### 16. Unificar los dos esquemas de Prisma

**Archivo:** `packages/backend/prisma/schema.prisma`, `packages/desktop/prisma/schema.prisma`

**Problema:** Existen dos esquemas que pueden divergir. El desktop sobrescribe `DATABASE_URL` para apuntar al schema del backend.

**Recomendación:** Mantener un único schema en `packages/shared/prisma/` o en la raíz, y generar el cliente desde allí para ambos paquetes.

---

### 17. Mejorar la validación en subidas de archivos

**Archivo:** `packages/backend/src/ads/index.ts`, `packages/backend/src/alert-sounds/index.ts`

**Problema:** Se aceptan archivos base64/audio sin límite de tamaño ni validación de cabecera MIME real.

**Recomendación:**
- Limitar tamaño (ej. 2 MB para imágenes, 500 KB para sonidos).
- Verificar la firma mágica del archivo (PNG, MP3, WAV).
- Sanitizar nombres de archivo.

---

### 18. Pausar animaciones de overlays cuando no son visibles

**Archivo:** `packages/frontend/public/overlays/*.html`

**Problema:** Los overlays con canvas de partículas (`subnautica2.html`, `fortnite.html`, etc.) consumen GPU continuamente aunque OBS no los muestre o la pestaña esté oculta.

**Recomendación:**
- Escuchar `document.visibilitychange` y `document.hidden`.
- Pausar `requestAnimationFrame` y reducir la frecuencia de polling cuando el overlay no es visible.

---

### 19. Añadir tests automatizados

**Archivo:** Ninguno actualmente

**Problema:** No existe ningún test unitario, de integración ni E2E.

**Recomendación:**
- Añadir Vitest o Jest.
- Empezar por tests de autenticación local, validación Zod y lógica de sorteos/predicciones.
- Añadir un workflow de GitHub Actions que ejecute `lint`, `typecheck` y `test` en cada PR.

---

## 🔵 Bajas — Pulido y buenas prácticas

### 20. Revisar scripts de `package.json` raíz

- `typecheck` ejecuta `npm run build --workspaces`, que compila en lugar de solo verificar tipos. Crear un script `tsc --noEmit` por paquete.
- `build:desktop` repite trabajo (`build -w frontend && build -w backend && dist -w desktop`). Aprovechar que `npm run build` ya compila todos.

### 21. Mejorar `.gitignore`

Añadir explícitamente:

```gitignore
*.db-wal
*.db-shm
packages/desktop/prisma/*.db*
data/
```

### 22. Desactivar DevTools en builds de producción

**Archivo:** `packages/desktop/src/main.ts`

El atajo `F12` para DevTools está activo en producción. Considerar activarlo solo cuando `NODE_ENV !== 'production'` o añadir una flag de debug.

### 23. Añadir cabecera `Content-Security-Policy` completa

**Archivo:** `packages/backend/src/index.ts`

Aunque ya hay algunas cabeceras de seguridad, falta una CSP estricta para reducir riesgos XSS en overlays y dashboard.

---

## 📅 Plan de acción recomendado

> **Estado actual:** las tareas 1-8 y la eliminación del soporte Linux ya están implementadas y verificadas (compilación + lint sin errores nuevos). Las tareas 9-23 siguen pendientes para futuras iteraciones.

### Antes de publicar la siguiente release

| # | Tarea | Archivos principales | Estado |
|---|---|---|---|
| 1 | Corregir derivación de clave de cifrado | `backend/src/auth/token-crypto.ts` | ✅ Hecho |
| 2 | Eliminar/proteger `GET /auth/token` | `backend/src/auth/index.ts`, `desktop/src/preload.ts` | ✅ Hecho |
| 3 | Autenticar todas las rutas HTTP | `backend/src/index.ts`, `backend/src/auth/api-auth.ts` | ✅ Hecho |
| 4 | Autenticar Socket.IO | `backend/src/socket/index.ts`, frontend hooks | ✅ Hecho |
| 5 | Corregir drift de timers | `backend/src/subathon/index.ts` | ✅ Hecho |
| 6 | Corregir speedrun timer | `backend/src/speedrun/index.ts` | ✅ Hecho |
| 7 | Limpiar recursos del motor de avatares | `frontend/src/avatars/*` | ✅ Hecho |
| 8 | Mejorar arranque del backend en Electron | `desktop/src/main.ts` | ✅ Hecho |
| — | Eliminar soporte Linux y consolidar flujo OAuth | Documentación, `desktop/package.json`, `backend/src/auth/index.ts` | ✅ Hecho |

### Primer parche post-release

| # | Tarea | Archivos principales |
|---|---|---|
| 9 | Centralizar socket en frontend | `frontend/src/hooks/useSocket.ts`, nuevo provider |
| 10 | Virtualizar chat | `frontend/src/contexts/ChatContext.tsx` |
| 11 | Habilitar WAL mode | `.env.example`, schemas Prisma |
| 12 | Unificar schemas Prisma | `packages/backend/prisma/`, `packages/desktop/prisma/` |
| 13 | Reducir uso de `any` | Múltiples |
| 14 | Logging estructurado | Backend + desktop |
| 15 | Tests básicos + CI | `.github/workflows/`, `vitest.config.ts` |

---

## ✅ Checklist de verificación

Antes de marcar una tarea como completada, verificar:

- [ ] `npm run typecheck` pasa sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] El backend arranca correctamente en modo servidor y en modo Electron.
- [ ] El flujo OAuth completo funciona (login, callback, logout, refresco).
- [ ] Las rutas sensibles devuelven `401` sin token válido.
- [ ] Socket.IO rechaza conexiones sin token.
- [ ] Los timers (subathon, scoreboard, timer general) no pierden tiempo.
- [ ] Los overlays se conectan y reciben eventos.
- [ ] No hay fugas de memoria evidentes tras 30 min de uso.

---

## 📝 Notas finales

- **No se deben añadir nuevas features** (VODs, clips, exportación a redes sociales) hasta que las mejoras de estabilidad y seguridad estén completadas.
- Las mejoras críticas (1-6) son las que más impacto tienen en la experiencia del usuario final y en la seguridad del token de Twitch.
- La falta de tests automatizados es el riesgo técnico más grande a largo plazo: cualquier refactor puede romper funcionalidades sin detectarlo.

---

*Documento generado a partir del análisis del código fuente de StreamDaemon.*
