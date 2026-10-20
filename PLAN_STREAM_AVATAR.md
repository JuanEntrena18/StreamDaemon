# Plan: StreamAvatar — Avatar con lip-sync por micrófono

> Reemplaza la webcam por un avatar animado en pantalla que mueve la boca en tiempo real según la voz del streamer.

---

## 1. Resumen y objetivo

**StreamAvatar** es una nueva funcionalidad para StreamDaemon que permite al streamer mostrar un avatar 2D animado en lugar de (o superpuesto a) la webcam. El avatar reacciona al audio del micrófono: mueve la boca sincronizada con el habla, parpadea y puede incluir gestos/expresiones adicionales.

**Referencia de competencia:** [OWN3D Avatar Maker](https://www.own3d.tv/es/producto/avatarmaker/) — creador de avatares estáticos/perfil. Nuestra propuesta va más allá: avatar en vivo, lip-sync en tiempo real y totalmente local-first.

---

## 2. Funcionalidades MVP (fase 1)

| Función | Descripción |
|---------|-------------|
| Selección de micrófono | Elegir dispositivo de entrada de audio desde el panel de configuración. |
| Avatar 2D PNGtuber | Avatar compuesto por capas: cuerpo, ojos y boca con varios estados. |
| Lip-sync en tiempo real | Análisis del audio del micrófono para determinar la apertura/forma de la boca. |
| Overlay transparente | URL propia para usar como Browser Source en OBS o como ventana overlay de Electron. |
| Configuración básica | Escala, posición, espejo horizontal, sensibilidad del micrófono y suavizado. |
| Avatares por defecto | 2-3 avatares incluidos alineados con la estética cyber/dark de StreamDaemon. |

---

## 3. Diferenciación respecto al sistema actual "Avatars"

El proyecto ya tiene un módulo `Avatars` (`packages/frontend/src/avatars/`): avatares reactivos a eventos de chat (bits, subs, raids) con físicas 2D. **StreamAvatar es un producto distinto:**

| Característica | Avatars existente | StreamAvatar nuevo |
|----------------|-------------------|--------------------|
| Trigger | Eventos de Twitch / chat | Audio del micrófono del streamer |
| Uso | Overlay de interacción con viewers | Reemplazo/superposición de webcam |
| Cantidad | Múltiples avatares simultáneos | Un avatar principal |
| Motor | PixiJS + Matter.js | PixiJS (MVP) + Web Audio API |

Por eso se propone un nombre y namespace separado: **`stream-avatar`**.

---

## 4. Arquitectura técnica

### 4.1 Diagrama general

```
┌─────────────────────────────────────────────────────────────────────┐
│                         StreamDaemon Desktop                         │
│  ┌─────────────────────┐        ┌─────────────────────────────────┐ │
│  │ Dashboard (React)   │        │ Overlay window / OBS Browser Src│ │
│  │ StreamAvatarPanel   │◄──────►│ StreamAvatarOverlay             │ │
│  │ · config            │  WS    │ · PixiJS renderer               │ │
│  │ · mic selector      │        │ · Web Audio analyser            │ │
│  │ · preview           │        │ · Lip-sync engine               │ │
│  └─────────────────────┘        └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Backend Fastify (configuración persistente)                          │
│ GET  /stream-avatar/config                                           │
│ PUT  /stream-avatar/config                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Flujo de datos

1. El overlay (`StreamAvatarOverlay`) solicita acceso al micrófono mediante `navigator.mediaDevices.getUserMedia()`.
2. El audio se conecta a un `AudioContext` + `AnalyserNode`.
3. Cada frame se calcula: volumen RMS y energía por bandas de frecuencia.
4. Se mapea el resultado a un **viseme** (estado de boca): `closed`, `slight`, `open`, `wide`, `round`.
5. PixiJS interpola suavemente entre sprites de boca.
6. La configuración (avatar elegido, escala, sensibilidad, etc.) se sincroniza vía Socket.IO / REST con el dashboard.

---

## 5. Stack tecnológico recomendado

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Renderizado | **PixiJS 8** | Ya está en el proyecto, alto rendimiento WebGL, ideal para sprites 2D. |
| Audio / lip-sync | **Web Audio API** nativo (`AnalyserNode`) | Sin dependencias externas, baja latencia, bajo consumo de CPU. |
| Lip-sync avanzado (futuro) | `@beer-digital/lipsync-engine` o `Wawa-Lipsync` | Alternativas open-source de ~15 KB renderer-agnostic si se requiere más precisión fonética. |
| Interfaz | React + CSS Modules | Consistente con el resto del dashboard. |
| Overlay | `overlay.html?mode=stream-avatar` | Mismo mecanismo que el resto de overlays del proyecto. |
| Configuración | JSON en `DATA_DIR/stream-avatar-config.json` | Igual patrón que el módulo `avatars` existente. |

> **Decisión clave:** para el MVP se recomienda **Web Audio API nativo** en lugar de un modelo ML. Es suficiente para un PNGtuber con 4-5 estados de boca, no requiere modelos ni nube, y consume muy pocos recursos.

---

## 6. Estructura de archivos propuesta

```
packages/
├── shared/src/
│   ├── types.ts              ← StreamAvatarConfig, Viseme, etc.
│   └── schemas.ts            ← validación Zod
│
├── backend/src/stream-avatar/
│   └── index.ts              ← endpoints GET/PUT /stream-avatar/config
│
├── frontend/src/
│   ├── components/
│   │   ├── StreamAvatarPanel.tsx          ← panel del dashboard
│   │   ├── StreamAvatarPanel.module.css
│   │   ├── StreamAvatarOverlay.tsx        ← overlay para OBS/Electron
│   │   └── StreamAvatarOverlay.module.css
│   │
│   ├── stream-avatar/
│   │   ├── engine/
│   │   │   ├── AudioAnalyzer.ts           ← Web Audio API + FFT
│   │   │   ├── LipSyncEngine.ts           ← mapeo audio → viseme
│   │   │   └── VisemeMapper.ts            ← tablas de visemas
│   │   │
│   │   ├── renderer/
│   │   │   ├── PixiAvatarRenderer.ts      ← escena PixiJS
│   │   │   ├── AvatarSpriteLoader.ts      ← carga de sprites
│   │   │   └── BlinkController.ts         ← parpadeo automático
│   │   │
│   │   ├── store/
│   │   │   └── streamAvatarStore.ts       ← estado local + localStorage
│   │   │
│   │   └── assets/
│   │       ├── default/
│   │       │   ├── body.png
│   │       │   ├── eyes-open.png
│   │       │   ├── eyes-closed.png
│   │       │   ├── mouth-closed.png
│   │       │   ├── mouth-slight.png
│   │       │   ├── mouth-open.png
│   │       │   ├── mouth-wide.png
│   │       │   └── mouth-round.png
│   │       └── cyber/
│   │           └── ...
│   │
│   ├── config/overlayRegistry.ts          ← añadir modo stream-avatar
│   └── components/OverlayContainer.tsx    ← caso stream-avatar
│
└── desktop/src/
    └── (sin cambios mayores; reutiliza overlay system existente)
```

---

## 7. Modelo de datos (`StreamAvatarConfig`)

```typescript
interface StreamAvatarConfig {
  enabled: boolean;

  // Audio
  audioDeviceId: string | 'default';
  micSensitivity: number;      // 0.5 - 3.0
  smoothing: number;           // 0.0 - 1.0
  noiseGate: number;           // 0.0 - 0.1

  // Avatar
  avatarId: string;            // 'default' | 'cyber' | ...
  scale: number;               // 0.25 - 2.0
  flipX: boolean;
  offsetX: number;             // porcentaje -50%..50%
  offsetY: number;             // porcentaje -50%..50%

  // Overlay
  chromaKey: boolean;          // fondo verde opcional para OBS
  chromaKeyColor: string;      // '#00ff00'
  transparentBg: boolean;      // por defecto true
}
```

---

## 8. Fases de implementación

### Fase 1 — MVP local (2-3 semanas)
- [ ] Crear tipos en `@streamdaemon/shared`.
- [ ] Crear módulo backend `stream-avatar` con persistencia JSON.
- [ ] Implementar `AudioAnalyzer` + `LipSyncEngine` con 5 visemas.
- [ ] Crear `PixiAvatarRenderer` con sprites por defecto.
- [ ] Crear `StreamAvatarOverlay` y registrar modo `stream-avatar`.
- [ ] Crear `StreamAvatarPanel` con preview en vivo, selector de micrófono y ajustes básicos.
- [ ] Añadir 2 avatares base (default + cyber).
- [ ] Tests manuales en desktop y como Browser Source en OBS.

### Fase 2 — Personalización y pulido (1-2 semanas)
- [ ] Permitir upload de sprites propios (cuerpo + ojos + bocas).
- [ ] Editor visual de offset/escala/espejo en el panel.
- [ ] Parpadeo automático y micro-expresiones.
- [ ] Mejorar suavizado y reducción de latencia.
- [ ] Modo "fondo verde" para integración avanzada en OBS.

### Fase 3 — Avanzado (futuro)
- [ ] Integrar librería de lip-sync fonético (`lipsync-engine` / `Wawa-Lipsync`).
- [ ] Avatares SVG vectoriales generados proceduralmente.
- [ ] Seguimiento de cabeza básico (mouse / cámara opcional).
- [ ] Reacciones a eventos de chat combinadas con el avatar existente.

---

## 9. Consideraciones técnicas importantes

### 9.1 Rendimiento
- El analizador de audio debe ejecutarse en `requestAnimationFrame` o `setInterval` de ~60 fps.
- FFT pequeño (256 o 512 bins) para reducir CPU.
- PixiJS con `ticker.maxFPS = 30` en el overlay si no hay movimiento brusco.

### 9.2 Permisos de micrófono
- En el dashboard de Electron el acceso al micrófono requiere `navigator.mediaDevices.getUserMedia()`.
- En OBS Browser Source el usuario debe autorizar el dispositivo; la URL puede incluir `?mic=default` como hint.
- Se recomienda que el preview del dashboard use el micrófono solo cuando el panel esté visible.

### 9.3 Latencia
- Web Audio API nativo tiene latencia casi nula para el propósito de abrir/cerrar la boca.
- No es necesario enviar audio al backend; todo se procesa en el renderer.

### 9.4 Compatibilidad con overlays existentes
- El nuevo overlay debe seguir el mismo contrato: `overlay.html?mode=stream-avatar&channel=...`.
- Debe respetar el fondo transparente y los ajustes de `localStorage` del overlay.

---

## 10. Preguntas de decisión para el equipo/producto

1. **Estilo de avatar para MVP:** ¿sprites PNGtuber (más simple, más rápido) o SVG procedural (más flexible, más trabajo)?
   - *Recomendación:* PNGtuber para MVP.
2. **Alcance del lip-sync:** ¿volumen/bandas de frecuencia (5 estados) o visemas fonéticos reales (A, E, I, O, U + consonantes)?
   - *Recomendación:* volumen/bandas para MVP; fonético en fase 3.
3. **Plataforma inicial:** ¿desktop + OBS Browser Source desde el primer día o solo desktop?
   - *Recomendación:* ambos, ya que comparten el mismo overlay.
4. **¿Avatar editable por el usuario desde el primer día o avatares predefinidos?**
   - *Recomendación:* predefinidos en MVP, editor/upload en fase 2.
5. **Nombre final:** ¿`StreamAvatar`, `TalkAvatar`, `CamAvatar`, `VoiceAvatar`?
   - *Recomendación:* `StreamAvatar`.

---

## 11. Próximos pasos sugeridos

1. Validar este plan y responder las preguntas de decisión.
2. Crear un prototipo de 1 día: `AudioAnalyzer` + canvas simple con un círculo que se abre al hablar.
3. Definir los assets visuales de los avatares base.
4. Implementar la fase 1 siguiendo la estructura propuesta.

---

*Documento de planificación generado para StreamDaemon v0.6.0+.*
