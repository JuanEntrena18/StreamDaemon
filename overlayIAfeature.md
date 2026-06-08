# StreamForger — Creación de Overlays con IA

> **⚠️ FUNCIONALIDAD PREMIUM** — Esta feature está planificada exclusivamente para la versión de pago de StreamForger. No será incluida en la versión open-source gratuita.

## Resumen Ejecutivo

Integrar un **AI Design Agent** en StreamForger que permita a los streamers generar overlays personalizados, marcos de webcam, paneles de inicio/descanso/final y alertas a partir de una descripción en lenguaje natural. El usuario escribe un prompt, la IA genera el diseño, y el resultado se descarga como PNG listo para OBS Browser Source o Imagen Source — sin Photoshop, sin plantillas genéricas.

Este documento detalla el stack tecnológico necesario, la arquitectura de backend, los componentes frontend, el flujo de integración con StreamForger y el plan de implementación por fases.

---

## 1. User Flow (Experiencia de Usuario)

```
[1. Describe]  →  [2. Generate]  →  [3. Refine]  →  [4. Download]
```

| Paso | Descripción | UI |
|------|-------------|----|
| **1. Describe** | Usuario escribe un prompt: _"Overlay dark fantasy con runas brillantes, marco de webcam irregular de piedra, paleta negro/dorado/rojo"_ | Textarea + selectores de estilo (tema, colores, resolución) |
| **2. Generate** | IA genera 2-4 variantes del overlay en segundos | Gallery de previews (thumbnails) con loading skeleton |
| **3. Refine** | Usuario puede editar texto en el overlay, cambiar colores, separar elementos (webcam frame, chat box) en capas independientes | Inpainting/text-edit/element-edit sobre el canvas |
| **4. Download** | Descarga como PNG transparente (o capas individuales) listo para OBS | Botón "Download" + opción "Copy to clipboard" |

### Tipos de assets generables

| Asset | Descripción | Uso en OBS |
|-------|-------------|------------|
| **Overlay completo** | Plantilla 1920×1080 con espacios para webcam, chat, alerts | Browser Source única |
| **Webcam Frame** | Marco decorativo transparente para la cámara | Imagen Source sobre la webcam |
| **Alertas** | Paneles para follow, sub, raid, donación | Browser Source con animación CSS |
| **Starting Soon / BRB / Offline** | Pantallas de estado | Imagen Source |
| **Paneles de información** | About me, comandos, reglas | Imagen Source para panels de Twitch |

---

## 2. Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ AIPanel.tsx  │  │ AIGallery.tsx│  │ AIEditor.tsx     │ │
│  │ (prompt +    │  │ (variants    │  │ (text/element    │ │
│  │  controls)   │  │  preview)    │  │  editing)        │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
│         │                 │                    │           │
│         └─────────────────┴────────────────────┘           │
│                           │ Socket.IO (progress)           │
└───────────────────────────┼────────────────────────────────┘
                            │ REST (prompt → generation)
┌───────────────────────────┼────────────────────────────────┐
│              Backend (Fastify + Node.js)                    │
│  ┌────────────────────────┼────────────────────────────┐   │
│  │              AI Orchestrator (src/ai/)              │   │
│  │  ┌─────────────┐ ┌──────────┐ ┌──────────────────┐ │   │
│  │  │ PromptEngine│ │ModelRouter│ │ PostProcessor    │ │   │
│  │  │ (enhance    │ │ (select   │ │ (bgremoval,      │ │   │
│  │  │  prompt)    │ │  model)   │ │  upscale, layer) │ │   │
│  │  └─────────────┘ └──────────┘ └──────────────────┘ │   │
│  └────────────────────────────────────────────────────┘   │
│                           │                                │
│              ┌────────────┴────────────┐                   │
│              │  AI Provider Gateway    │                   │
│              │  (muapi.ai / fal.ai)    │                   │
│              └────────────┬────────────┘                   │
└───────────────────────────┼────────────────────────────────┘
                            │ HTTP
┌───────────────────────────┼────────────────────────────────┐
│              External AI APIs                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Flux Pro │ │Ideogram  │ │Replicate │ │ Background   │ │
│  │ (T2I)    │ │ v3 (T2I) │ │ (models) │ │ Removal API  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Capas de la Arquitectura

#### 2.1 Frontend — `packages/frontend/src/components/ai/`

| Componente | Archivo | Propósito |
|------------|---------|-----------|
| **AIPanel** | `AIPanel.tsx` | Panel principal: prompt input, selectores de estilo, tipo de asset, resolución, botón generate |
| **AIGallery** | `AIGallery.tsx` | Muestra 2-4 variantes generadas como thumbnails con zoom preview, selección, botón de regenerate |
| **AIEditor** | `AIEditor.tsx` | Editor post-generación: editar texto sobre el overlay, separar elementos (webcam, chat box), cambiar colores |
| **AIDownload** | `AIDownload.tsx` | Opciones de descarga: PNG individual, ZIP de capas, copiar URL |
| **AIHistory** | `AIHistory.tsx` | Historial de generaciones anteriores con posibilidad de re-descargar |

#### 2.2 Backend — `packages/backend/src/ai/`

| Módulo | Archivo | Propósito |
|--------|---------|-----------|
| **Router** | `index.ts` | Registra rutas REST + Socket.IO para el módulo AI |
| **PromptEngine** | `prompt-engine.ts` | Enriquece el prompt del usuario con contexto técnico (resolución, formato transparente, layout de streaming) usando un LLM (GPT-4o-mini / Claude 3.5 Haiku) |
| **ModelRouter** | `model-router.ts` | Selecciona el modelo de IA según el tipo de asset, calidad deseada y coste: Flux Pro para overlays, Ideogram v3 si hay texto, Flux Schnell para previews rápidas |
| **ProviderGateway** | `provider-gateway.ts` | Capa de abstracción sobre APIs externas (muapi.ai, fal.ai, Replicate). Maneja autenticación, rate limiting, retry con backoff, fallback entre providers |
| **PostProcessor** | `post-processor.ts` | Pipeline post-generación: background removal (BiRefNet), upscaling (Real-ESRGAN), separación de capas (inpainting), compositing final |
| **AssetStore** | `asset-store.ts` | Gestión de assets generados: almacenamiento local (filesystem/db), limpieza de temporales, export ZIP |

#### 2.3 Shared — `packages/shared/src/`

| Tipo | Propósito |
|------|-----------|
| `AIGenerationRequest` | Prompt, tipo de asset, estilo, resolución, colores, theme_id opcional |
| `AIGenerationVariant` | Variante generada: url, thumbnail_url, model usado, coste estimado |
| `AIGenerationResult` | Conjunto de variantes + metadatos de la sesión |
| `AIEditableLayer` | Capa extraíble: tipo (text, webcam_frame, chat_box, background), posición, tamaño |
| `AIGenerationStatus` | Estado del proceso: `queued` → `generating` → `post-processing` → `done` / `failed` |

---

## 3. Stack Tecnológico para Generación de Imágenes

### 3.1 Modelos de IA Recomendados

| Tarea | Modelo | Provider | Coste/imagen | Calidad |
|-------|--------|----------|-------------|---------|
| **Text-to-Image (calidad producción)** | Flux 2 Pro | BFL direct / fal.ai / Muapi | $0.030 | ⭐⭐⭐⭐⭐ |
| **Text-to-Image (rápido / preview)** | Flux Schnell | fal.ai / Replicate / Muapi | $0.003 | ⭐⭐⭐ |
| **Text-to-Image (con texto en imagen)** | Ideogram v3 | Ideogram API / Muapi | $0.022 | ⭐⭐⭐⭐ |
| **Text-to-Image (estilo consistente)** | Nano Banana 2 | Muapi | $0.060 | ⭐⭐⭐⭐⭐ |
| **Background Removal** | BiRefNet | Replicate / Muapi | ~$0.005 | ⭐⭐⭐⭐ |
| **Upscaling a 4K** | Clarity Upscaler | Replicate / Muapi | ~$0.010 | ⭐⭐⭐⭐⭐ |
| **Inpainting / Element Edit** | Flux Fill Pro | fal.ai / Muapi | ~$0.020 | ⭐⭐⭐⭐ |
| **Prompt Enhancement** | GPT-4o-mini | OpenAI | ~$0.0002/req | ⭐⭐⭐⭐⭐ |

### 3.2 Proveedores de API

| Provider | Ventajas | Desventajas | Modelos clave | Precio mínimo |
|----------|----------|-------------|---------------|---------------|
| **Muapi.ai** | API unificada, 100+ modelos, precios transparentes, SDK opcional | Dependencia de tercero unificado | Flux Dev/Pro/Schnell, Ideogram v3, BiRefNet, Clarity Upscaler, Seedream | $0.003/imagen |
| **fal.ai** | SDK TypeScript excelente, latencia mínima (<1s Schnell), precios idénticos a BFL direct | Catálogo más centrado en Flux | Flux Schnell/Dev/Pro, Flux Fill | $0.003/imagen |
| **Replicate** | Catálogo más amplio de modelos, pago por segundo GPU | Más caro a escala (~$0.025-0.040/imagen) | Flux, SDXL, BiRefNet, modelos de comunidad | $0.003/imagen |
| **OpenAI** | GPT-4o-image, mejor prompt understanding | Sin control fino sobre estilo, caro ($0.040) | DALL-E 4 / GPT-Image | $0.040/imagen |

**Recomendación: fal.ai como provider principal + Muapi.ai como fallback/alternativa.**

- **fal.ai** por su SDK TypeScript nativo (`@fal-ai/client`), latencia mínima, y precios competitivos.
- **Muapi.ai** como respaldo para modelos que fal.ai no ofrece (Ideogram v3, BiRefNet).
- **OpenAI GPT-4o-mini** para prompt enhancement (mejora del prompt del usuario) — cuesta centavos.

### 3.3 Estrategia de Routing (ModelRouter)

```
Prompt del usuario
    │
    ├── ¿Contiene palabras clave de texto/labels? ──SÍ──→ Ideogram v3 ($0.022)
    │
    ├── ¿Es preview rápida (generar sin editar)? ──SÍ──→ Flux Schnell ($0.003)
    │
    ├── ¿Es asset final de producción? ──SÍ──→ Flux 2 Pro ($0.030)
    │
    └── → Default: Flux Dev + post-processing ($0.015 + $0.015)
```

---

## 4. Pipeline de Generación (End-to-End)

```
Usuario escribe prompt
    │
    ▼
PromptEngine (GPT-4o-mini)
    ├── Extrae: colores, estilo, tipo de asset, elementos solicitados
    ├── Añade: contexto técnico ("1920×1080, transparent background, stream overlay layout")
    └── Genera: prompt enriquecido + negative prompt
    │
    ▼
ModelRouter
    ├── Decide: modelo según tipo de asset y calidad
    └── Devuelve: { model: "flux-pro", params: { ... } }
    │
    ▼
ProviderGateway
    ├── Encola: request a fal.ai (o fallback a Muapi)
    ├── Emite: Socket.IO `ai:progress` (porcentaje, estado)
    └── Recibe: image_urls (2-4 variantes)
    │
    ▼
PostProcessor (paralelo por variante)
    ├── 1. Background Removal (BiRefNet) → PNG transparente
    ├── 2. Upscaling (Clarity Upscaler) → 4K opcional
    └── 3. Layer Detection → separar webcam frame, chat box, etc.
    │
    ▼
AssetStore
    ├── Guarda: PNG en filesystem (carpeta temporal con limpieza TTL)
    ├── Genera: thumbnail para preview
    └── Devuelve: URLs al frontend
    │
    ▼
Frontend (AIGallery)
    └── Muestra: variantes en galería con opciones de edición/descarga
```

### Tiempos Estimados

| Etapa | Tiempo | Modelo usado |
|-------|--------|-------------|
| Prompt Enhancement | 0.5-1s | GPT-4o-mini |
| Generación (preview) | 1-3s | Flux Schnell |
| Generación (producción) | 3-6s | Flux 2 Pro |
| Background Removal | 2-4s | BiRefNet |
| Upscaling a 4K | 3-5s | Clarity Upscaler |
| **Total preview** | **1.5-4s** | |
| **Total producción** | **8-15s** | |

---

## 5. Integración con StreamForger Existente

### 5.1 Nuevo Módulo Backend

```
packages/backend/src/ai/
├── index.ts              # Fastify plugin: registra rutas + Socket.IO
├── prompt-engine.ts      # Enhance prompt con LLM
├── model-router.ts       # Selecciona modelo según input
├── provider-gateway.ts   # Capa sobre APIs externas
├── post-processor.ts     # Background removal, upscaling, layers
└── asset-store.ts        # Almacenamiento temporal de assets
```

### 5.2 Nuevos Componentes Frontend

```
packages/frontend/src/components/ai/
├── AIPanel.tsx           # Prompt + controles
├── AIGallery.tsx         # Galería de variantes
├── AIEditor.tsx          # Editor post-generación
├── AIDownload.tsx        # Opciones de descarga
└── AIHistory.tsx         # Historial de generaciones
```

### 5.3 Rutas REST

| Método | Ruta | Propósito |
|--------|------|-----------|
| `POST` | `/ai/generate` | Enviar prompt → recibir variantes generadas |
| `GET` | `/ai/generations/:id` | Obtener resultado de generación previa |
| `DELETE` | `/ai/generations/:id` | Eliminar asset generado |
| `POST` | `/ai/edit/text` | Editar texto en overlay existente |
| `POST` | `/ai/edit/layer` | Separar/seleccionar capa específica |
| `POST` | `/ai/edit/background` | Cambiar/quitar fondo |
| `GET` | `/ai/models` | Listar modelos disponibles con precios |
| `GET` | `/ai/credits` | Consultar créditos/uso del usuario |

### 5.4 Eventos Socket.IO

| Evento | Dirección | Propósito |
|--------|-----------|-----------|
| `ai:progress` | Server → Client | Progreso de generación (0-100%) |
| `ai:complete` | Server → Client | Generación completada con URLs |
| `ai:error` | Server → Client | Error en generación |

### 5.5 Integración en App.tsx

- Nuevo tab en la sidebar: **"🤖 IA Overlays"**
- El `AIPanel` se renderiza en lugar de los panels existentes cuando se selecciona el tab
- Integración con `useSocket` para progreso en tiempo real
- El resultado generado puede guardarse en la carpeta de assets local

### 5.6 Seguridad

- Las API keys de los providers (fal.ai, Muapi, OpenAI) van en `packages/backend/.env`, NUNCA en frontend
- `requireLocalAuth` protege todas las rutas POST del módulo AI (mismo patrón que timer/scoreboard)
- Rate limiting específico: 10 generaciones/minuto por IP (para evitar abuso)
- Los assets generados se almacenan temporalmente (TTL: 24h) con limpieza automática
- Validación Zod en todas las rutas

---

## 6. Modelo de Costes

### 6.1 Por Generación (estimado)

| Escenario | Modelos usados | Coste total |
|-----------|---------------|-------------|
| Preview rápida (2 variantes) | Flux Schnell × 2 | $0.006 |
| Producción (2 variantes) | Flux Pro × 2 + BiRefNet × 2 + Upscale × 2 | $0.090 |
| Producción con texto (2 variantes) | Ideogram v3 × 2 + BiRefNet × 2 | $0.064 |
| Edición (capa+texto) | Flux Fill + GPT-4o-mini | $0.025 |

### 6.2 Uso Mensual Estimado

| Perfil | Generaciones/mes | Coste estimado |
|--------|-----------------|----------------|
| Streamer casual | 20-50 | $1-5 |
| Streamer regular | 50-200 | $5-20 |
| Streamer profesional | 200-500 | $20-50 |
| Multi-cuenta (streamer + diseño) | 500-2000 | $50-200 |

### 6.3 Modelo de Monetización para StreamForger

Opción A — **Pague lo que use** (passthrough): El usuario provee su propia API key de fal.ai / Muapi. StreamForger no cobra por la IA, solo por el software.

Opción B — **Créditos StreamForger**: Compra de créditos dentro de la app (ej: $10 = 100 generaciones premium). StreamForger compra al por mayor con descuento por volumen y aplica un margen.

Opción C — **híbrido**: Preview rápida gratis (Flux Schnell con API key compartida y rate limiting), generación producción con API key del usuario.

---

## 7. Plan de Implementación por Fases

### Fase 1 (MVP) — 2-3 semanas

**Objetivo:** Generar overlays desde prompt, descargar PNG.

| Tarea | Dependencias | Archivos |
|-------|-------------|----------|
| Setup provider gateway (fal.ai SDK) | API key fal.ai | `backend/src/ai/provider-gateway.ts` |
| Implementar ruta `POST /ai/generate` | Gateway | `backend/src/ai/index.ts` |
| Prompt enhancement básico (GPT-4o-mini) | API key OpenAI | `backend/src/ai/prompt-engine.ts` |
| Post-processor: background removal | Gateway | `backend/src/ai/post-processor.ts` |
| Asset store temporal (filesystem) | — | `backend/src/ai/asset-store.ts` |
| Componente AIPanel (prompt + generate) | — | `frontend/src/components/ai/AIPanel.tsx` |
| Componente AIGallery (preview) | — | `frontend/src/components/ai/AIGallery.tsx` |
| Componente AIDownload (PNG) | — | `frontend/src/components/ai/AIDownload.tsx` |
| Eventos Socket.IO de progreso | — | `backend/src/ai/index.ts` |
| Integración en sidebar de App.tsx | Componentes | `frontend/src/App.tsx` |
| Types compartidos | — | `shared/src/types.ts`, `shared/src/schemas.ts` |

### Fase 2 — 2 semanas

**Objetivo:** Edición post-generación, capas separadas, soporte multi-modelo.

| Tarea | Dependencias |
|-------|-------------|
| Edición de texto sobre overlay (inpainting) | Fase 1 |
| Separación de capas (webcam frame, chat box) | Fase 1 |
| ModelRouter inteligente (selección automática) | Fase 1 |
| Soporte Muapi.ai como provider secundario | Fase 1 |
| Generación de Starting Soon / BRB / Offline screens | Fase 1 |
| Historial de generaciones (AIHistory) | Fase 1 |
| Exportar como ZIP de capas | Fase 1 |

### Fase 3 — 2-3 semanas

**Objetivo:** Consistencia de estilo, Brand Kit, animaciones.

| Tarea | Dependencias |
|-------|-------------|
| Brand Kit: definir paleta, tipografía, logo para usar como contexto en generaciones | Fase 1-2 |
| Style Consistency: generar conjunto completo (overlay + webcam + alerts + offline) con misma semilla | Fase 2 |
| Sobrescribir overlays existentes de StreamForger con diseño generado por IA (chat overlay, giveaway, timer, etc.) | Fase 2 |
| Generación de alertas animadas (GIF/WebP animado) | Fase 2 |
| Galería comunitaria (opcional): compartir prompts y resultados | Fase 3 |

---

## 8. Referencias y Recursos

| Recurso | URL |
|---------|-----|
| fal.ai SDK (TypeScript) | https://www.npmjs.com/package/@fal-ai/client |
| fal.ai pricing | https://fal.ai/pricing |
| Muapi.ai API Docs | https://muapi.ai/docs |
| Muapi.ai pricing programático | https://muapi.ai/docs/pricing |
| Replicate API | https://replicate.com/docs |
| Open Lovart (proyecto open-source de referencia) | https://github.com/Anil-matcha/Open-Lovart |
| Lovart.ai (referencia de producto) | https://www.lovart.ai/features/ai-twitch-overlay-generator |
| Flux Models (Black Forest Labs) | https://blackforestlabs.ai/ |

---

## 9. Análisis de Viabilidad

### ✅ Factible — Riesgo Bajo

- La generación de imágenes por IA vía API REST es una tecnología madura en 2026
- fal.ai ofrece SDK TypeScript nativo, latencia sub-1s para Schnell, y precios bajos ($0.003-0.030/imagen)
- La arquitectura de StreamForger (Fastify + Socket.IO) está preparada para integrar nuevos módulos (como ya se hizo con timer, scoreboard, hud)
- El patrón de `requireLocalAuth` + rate limiting ya existe para proteger rutas POST
- Prompt enhancement con GPT-4o-mini es trivial (~$0.0002 por request)

### ⚠️ Riesgo Medio — Gestionable

- **Dependencia de APIs externas**: Si fal.ai o Muapi están caídos, la funcionalidad no está disponible. Mitigación: multi-provider con fallback automático.
- **Coste variable**: El streamer debe asumir costes de API. Mitigación: modelo híbrido (previews gratis con API key compartida de StreamForger, generación producción con API key propia).
- **Calidad inconsistente**: Los modelos de IA no siempre generan exactamente lo que el usuario pide. Mitigación: generar múltiples variantes + edición post-generación.

### 🛑 No Factible — Fuera de Alcance

- **Generación de overlays animados complejos** (transiciones, animaciones CSS) desde IA: los modelos actuales generan imágenes estáticas o video corto, no HTML/CSS animado. Habría que convertir la imagen estática a overlay CSS manualmente o usar modelos de video corto (Kling, Runway) para alerts animados. Es viable pero complejo y caro.

### Decisión Final

**VIABLE** — Se recomienda proceder con Fase 1 (MVP) como prueba de concepto. El coste de desarrollo estimado es 2-3 semanas para un backend+frontend developer con experiencia en APIs de IA. El coste operativo por streamer es manejable ($1-20/mes para uso regular).

La integración más profunda (Fase 3) donde la IA genera overlays que se integran nativamente con los componentes React de StreamForger (chat, timer, scoreboard, etc.) requeriría investigación adicional sobre cómo traducir imágenes generadas a componentes CSS/HTML dinámicos.
