# Plan de Rediseño UI/UX — StreamDaemon

> Revisión completa de la interfaz. Objetivo: hacerla más sencilla de usar, más atractiva visualmente y alejarla de los clichés de "aplicación Electron genérica".

---

## 1. El Brief

**¿Qué es StreamDaemon?** Una herramienta de trabajo en tiempo real. No es un SaaS de marketing ni una landing. Es el *cuarto de control* del streamer durante su directo.

**¿Quién es el usuario?** Un streamer (gaming, Just Chatting, IRL) que está en directo. Su atención está dividida entre el juego/contenido y esta app. Tiene segundos, no minutos, para encontrar algo.

**¿Cuál es el job principal de la UI?** Respuesta rápida con una mirada. El usuario no *lee* el dashboard, lo *escanea*. Cada pixel debe ganarse su espacio o desaparecer.

**Tensión central del diseño:** Atractivo visual vs. legibilidad a golpe de vista. Una app de streaming que "deslumbra" pero que obliga a buscar las cosas es un fracaso. Una app que solo funciona pero parece un panel de Windows XP también. El equilibrio es: **contenido denso pero respirando, con personalidad en los detalles, no en la decoración.**

---

## 2. Auditoría del estado actual

### ❌ Problemas identificados

| Problema | Ubicación | Impacto |
|----------|-----------|---------|
| **Sidebar sobrecargada** | 25+ items en 7 secciones | Difícil escaneo, scroll obligatorio |
| **Iconos emoji** | Sidebar, tarjetas | Inconsistentes, informales, no escalan bien |
| **Glass-card por defecto** | Todos los paneles | "SaaS-card kit" — todo tiene el mismo peso visual |
| **Fade-slide genérico** | `MainContent.tsx` — motion.div en cada tab | Motion cliché, no aporta información |
| **Gradiente violeta por defecto** | Botones primarios, accents | Genérico, aparece en cualquier proyecto |
| **TopBar duplica info** | Título de pestaña + sidebar | Redundancia visual |
| **Baja densidad** | Paneles con poco contenido por viewport | Scroll excesivo durante el directo |
| **Jerarquía plana** | Títulos y contenido compiten | No hay dirección visual clara |
| **Theme light testigo** | Overrides en index.css | Funcional pero sin el mismo nivel de pulido |

### ✅ Lo que funciona y debemos preservar

- **Paleta de colores base:** Violeta/indigo sobre fondo oscuro cyber (#0a0a1a) — es la identidad del proyecto.
- **Sistema de tokens:** Ya existe `--sf-*` bien estructurado.
- **CSS Modules:** Arquitectura sólida, sin cambios estructurales necesarios.
- **Layout base:** Sidebar + TopBar + Content es correcto para el uso.
- **Glassmorphism sutil:** Como *acento* está bien, como *default* es el problema.

---

## 3. Plan de Diseño

### 3.1 Token System revisado

#### Color — Paleta refinada

La paleta actual es buena pero necesita **jerarquía de uso**, no nuevos colores:

```
Rol                    Dark                          Light
──────────────────────────────────────────────────────────────
Fondo base             #07070f (más oscuro)         #fafafa
Fondo superficie       #0f0f1e                      #ffffff
Fondo elevado          #16162b                      #f4f4f6
Acento primario        #7c3aed (violeta)            #6d28d9
Acento secundario      #06b6d4 (cyan, NUEVO rol)    #0891b2
Texto primario         #f8fafc                      #1d1d1f
Texto secundario       #94a3b8                      #6e6e73
Texto desactivado      #475569                      #aeaeb2
Estado éxito           #10b981                      #059669
Estado alerta          #f59e0b                      #d97706
Estado error           #ef4444                      #dc2626
```

**Cambio clave de uso de color:**
- **Cyan (#06b6d4)** pasa a ser el color de *estado en vivo/conexión* — Twitch usa púrpura, pero el "en directo" del mundo es verde/cyan. Nos da un segundo color distintivo que no sea violeta.
- **Violeta (#7c3aed)** se reserva para *acciones primarias y marca*, no para todo elemento decorativo.
- Los gradientes de botón se eliminan como default; solo en el CTA más importante de cada vista.

#### Tipografía

**Fuente actual:** Inter — es correcta para UI, la mantenemos.

**Cambio:** Añadir una escala tipográfica más definida con propósito:

```
Nombre              Tamaño    Peso    Uso
────────────────────────────────────────────────────
display             2rem      800     Solo SplashScreen y estados vacíos
heading-1           1.375rem  700     Título de página activa
heading-2           1rem      600     Título de tarjeta/sección
heading-3           0.875rem  600     Sub-secciones
body                0.875rem  400     Contenido principal
body-sm             0.8rem    400     Contenido secundario
caption             0.75rem   500     Metadatos, timestamps
mono                0.78rem   500     URLs, códigos, contadores
```

**Regla:** Solo `heading-1` puede ser > 1rem en el dashboard. Si todo es grande, nada lo es.

#### Espaciado y Layout

Sistema de espaciado basado en 4px:

```
xs   0.25rem (4px)
sm   0.5rem  (8px)
md   1rem    (16px)
lg   1.5rem  (24px)
xl   2rem    (32px)
xxl  3rem    (48px)
```

**Layout del dashboard:**

```
┌─────────────┬──────────────────────────────────────┐
│             │  TopBar (48px) — título + canal      │
│  Sidebar    ├──────────────────────────────────────┤
│  (220px)    │                                      │
│             │  Content (padding: 24px)             │
│             │                                      │
│             │                                      │
│             │                                      │
└─────────────┴──────────────────────────────────────┘
```

Cambios de layout:
- Sidebar: `260px` → `220px` (más compacta, menos scroll)
- TopBar: separar título de página de controles de canal
- Content: máximo `1400px`, centrado, padding consistente `24px`

#### Sombras y profundidad

Eliminar el glow genérico. Usar sombras con propósito:

```
nivel-0   (fondo)         sin sombra
nivel-1   (tarjetas)      0 1px 2px rgba(0,0,0,0.2)
nivel-2   (flotantes)     0 4px 16px rgba(0,0,0,0.3)
nivel-3   (modales)       0 8px 32px rgba(0,0,0,0.4)
```

El "glow violeta" se reserva para: elemento activo seleccionado, estado "en directo", y el CTA principal.

#### Border radius

Reducir la variedad. Tres niveles:

```
sm    6px    inputs, botones, chips
md    10px   tarjetas, paneles
lg    16px   modales, overlays
```

---

### 3.2 Sistema de Navegación

#### Problema actual

25+ items en sidebar, todos con la misma prioridad visual. El usuario tiene que escanear toda la lista cada vez.

#### Solución: Navegación en 3 niveles

```
Nivel 1: FAVORITOS (máx 5)      — acceso inmediato
         Chat · Dashboard · OBS · Avatar · KPIs

Nivel 2: CATEGORÍAS             — agrupación lógica
         EN VIVO:    chat, mod, comandos
         OVERLAYS:   obs, builder, avatars, stream-avatar
         ANALÍTICA:  kpi, tracker, calendar, diary
         HERRAMIENTAS: timer, subathon, sorteos, +
         SISTEMA:    config, security

Nivel 3: BUSCADOR (Ctrl+K)      — acceso por teclado
         CommandPalette ya existe — hacerlo prominente
```

**Comportamiento:**
- Los favoritos los configura el usuario (arrastrar o click derecho "añadir a favoritos")
- Los favoritos viven **arriba en la sidebar, separados visualmente**
- Las categorías se colapsan; solo una abierta a la vez
- El item activo usa **una barra lateral de color**, no un fondo completo

#### Indicador visual de estado en vivo

Si el stream está en directo, añadir un indicador global:
- Punto pulsante cyan en el logo de la sidebar
- Texto "EN VIVO" en TopBar
- No requiere acción del usuario

---

### 3.3 Rediseño de componentes clave

#### Sidebar

```
Antes:                          Después:
┌──────────────────┐           ┌──────────────────┐
│ 🎮 StreamDaemon  │           │ ◆ StreamDaemon   │  ← logo SVG, no texto
│ by Cyber Haute   │           │ ●  EN VIVO       │  ← indicador si live
├──────────────────┤           ├──────────────────┤
│ GESTOR DEL STREAM│           │ FAVORITOS        │
│ 📡 Gestor        │           │ 💬 Chat          │  ← user-configurables
│                  │           │ 📡 Dashboard     │
│ ESTADÍSTICAS     │           │ 🎮 OBS           │
│ 📈 Tracker       │           ├──────────────────┤
│ 📊 KPIs          │           │ EN VIVO          │
│ 📅 Calendario    │           │  Chat · Mod · +  │
│ 🎮 Diario        │           │                  │
│                  │           │ OVERLAYS         │
│ ... (25 items)   │           │  OBS · Avatars + │
└──────────────────┘           │                  │
                               │ ANALÍTICA        │
                               │  KPIs · Diary +  │
                               ├──────────────────┤
                               │ 🌙  🌐  ⚙️      │  ← footer minimal
                               └──────────────────┘
```

**Cambios:**
- Eliminar "by Cyber Haute Couture" del header (mover a About en Config)
- Sin títulos de sección en ALL-CAPS (usar heading-3 en su lugar)
- Iconos: reemplazar emojis por iconos SVG de 16x16 consistentes
- Indicador activo: barra lateral izquierda de 2px de color, no fondo completo

#### TopBar

```
Antes:                           Después:
┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│ Gestor del Stream    #canal  👤│ │ ◀ Chat    #canal      ● En vivo│
│ Panel de control                │ │        [conectar twitch]        │
└─────────────────────────────────┘ └─────────────────────────────────┘
```

**Cambios:**
- Título de página más pequeño (heading-1, no display)
- Eliminar "Panel de control · StreamDaemon" (redundante)
- El input de canal más prominente si no hay canal configurado
- Estado de conexión visible siempre (punto de color + texto)
- Si no hay canal: el input de canal es el elemento protagonista del TopBar

#### Tarjetas (glass-card)

```
Antes: todo es glass-card con el mismo estilo

Después: sistema de 3 niveles de contenido

.nivel-superficie    — fondo casi invisible, solo separación
                      para contenido que no compite
                      
.nivel-tarjeta       — fondo sutil + borde fino
                      para contenido principal del panel
                      
.nivel-elevado       — fondo más claro + sombra nivel-2
                      para modales, previews, elementos flotantes
```

**Regla:** En un panel, máximo 2 niveles de profundidad. Si todo tiene borde y fondo, nada tiene jerarquía.

#### Botones

```
Antes:                          Después:

[Gradiente violeta grande]      [Violeta sólido, sombra mínima]  ← CTA principal
[Gradiente violeta medio]       [Borde violeta, fondo transparente] ← Acción secundaria
[Gradiente violeta pequeño]     [Texto violeta, sin fondo]         ← Acción terciaria
[Ghost gris]                    [Gris neutro]                      ← Acción destructiva o cancelar
```

Un gradiente violeta **solo** en: "Conectar Twitch" si no hay sesión, "Empezar Subathon", o el CTA principal del estado vacío.

#### SplashScreen

```
Antes: logo + texto + barra de progreso

Después:
┌────────────────────────────────┐
│                                │
│         ◆ StreamDaemon         │  ← logo centrado
│                                │
│   ●  Conectando al servidor    │  ← estado con punto pulsante
│   ────────────────             │  ← barra fina, solo 2px
│                                │
└────────────────────────────────┘
```

Eliminar texto descriptivo extra. El splash es funcional, no una landing.

#### Estados vacíos

Principio: "Un estado vacío es una invitación a actuar."

```
Antes: "Esperando actividad del canal..."

Después:
┌────────────────────────────────┐
│         (icono SVG)            │
│     No hay actividad aún       │
│  Los follows, subs y raids     │
│  aparecerán aquí en directo    │
│                                │
│    [Ver canal en Twitch ↗]     │  ← acción clara si aplica
└────────────────────────────────┘
```

---

### 3.4 Motion — uso deliberado

**Eliminar:**
- `fade-slide-up` en cada cambio de tab (MainContent.tsx)
- Hover scale en todas las tarjetas
- Transiciones de 300ms por defecto en todo

**Mantener/añadir:**
- Indicador "EN VIVO" pulsante (cyan, suave)
- Transición de sidebar collapse/expand (funcional)
- Entrada de nuevos mensajes en chat (útil: muestra qué cambió)
- Active indicator en sidebar con spring (ya existe, es bueno)
- Transición de tema dark/light (suave, 200ms)

**Regla:** La animación debe responder a una acción o cambio de estado. Nunca es decoración de entrada.

---

### 3.5 Iconografía

**Decisión:** Reemplazar emojis de la sidebar por iconos SVG inline.

Razones:
- Los emojis varían entre SO (Windows, macOS, Linux)
- No heredan el color del texto
- No escalan limpiamente
- Aspecto más profesional

Usar un set consistente de 16x16, stroke-based, similar a Lucide o Phosphor. Sin dependencias externas: definir los ~20 iconos necesarios como componentes React inline.

---

### 3.6 Jerarquía visual del Dashboard principal

El panel más usado es probablemente Chat + Dashboard. Aquí es donde más impacto tiene el rediseño:

```
Antes (StreamDashboard):        Después:
┌──────────────────────────┐   ┌──────────────────────────────────┐
│ EN VIVO                  │   │ ● EN VIVO · 2h 34min             │
│ título del stream        │   │ Título del stream · Fortnite     │
│ categoría                │   │                                  │
│ [viewers] [followers]    │   │ ┌─────────┬─────────┬──────────┐ │
│ [subs] [uptime]          │   │ │  1,234  │   56    │    89    │ │
│                          │   │ │ viewers │  subs   │ follows  │ │
│ [actividad reciente]     │   │ └─────────┴─────────┴──────────┘ │
│ [editar info]            │   │                                  │
└──────────────────────────┘   │ Actividad reciente ▼             │
                               │ (lista con iconos de tipo)       │
                               └──────────────────────────────────┘
```

Los números grandes de stats deben usar `mono` y ser más compactos — una fila, no cards individuales.

---

## 4. Self-Critique del plan

Antes de implementar, revisemos contra los defaults genéricos:

| Tendencia genérica | ¿Estoy cayendo? | Justificación |
|---|---|---|
| Fondo crema + terracota | ❌ No | Mantenemos fondo oscuro cyber |
| SaaS-card kit | ⚠️ Riesgo | El sistema de 3 niveles lo mitiga: no todo tiene borde |
| ALL-CAPS eyebrow | ❌ Eliminado | Sidebar usa heading-3, no labels decorativos |
| Gradiente en todo | ✅ Corregido | Gradiente solo en CTA principal |
| Fade-slide en secciones | ✅ Corregido | Motion solo con propósito |
| Iconos genéricos | ⚠️ Riesgo | SVG inline propios, no librería estándar — esto es intencional para no depender de assets externos |
| Dark mode genérico | ⚠️ Riesgo bajo | El fondo #07070f con acentos cyber es identidad del proyecto, no default |

**¿Es este diseño específico de StreamDaemon o podría ser cualquier app?**

Los elementos que lo hacen específico:
- Indicador "EN VIVO" como estado global del sistema
- Navegación con favoritos configurables por el streamer
- Cyan como color de estado en directo (identidad propia, no genérica)
- Fondo cyber #07070f — no es un dark mode genérico
- Stats de stream en mono numérico grande — lenguaje del streaming

El resto (tipografía Inter, sidebar + topbar, glassmorphism sutil) es correcto para este tipo de herramienta. No necesitamos reinventar la rueda en estructura, solo en personalidad de los detalles.

---

## 5. Plan de implementación por fases

### Fase 1 — Fundamentos (sin cambios visibles estructurales)
- [x] Refinar tokens en `index.css` (colores, tipografía, sombras, spacing)
- [x] Crear componentes de iconos SVG (`src/components/icons/`)
- [x] Actualizar sistema de botones (3 niveles claros)
- [x] Actualizar sistema de tarjetas (3 niveles de profundidad)

### Fase 2 — Navegación
- [x] Rediseñar Sidebar (favoritos, categorías colapsables, iconos SVG)
- [x] Simplificar TopBar (eliminar redundancia, estado de conexión compacto)
- [x] Guardado de preferencias de UI + exportación/importación JSON
- [ ] Prominente CommandPalette (Ctrl+K como método de acceso)

### Fase 3 — Paneles principales
- [x] Rediseñar StreamDashboard (densidad, stats en línea)
- [x] Rediseñar ChatPanel (ya es bueno, pulir detalles)
- [x] Estados vacíos con invitación a actuar

### Fase 4 — Polish y theme light
- [x] Eliminar motion genérico de MainContent
- [x] Rediseñar SplashScreen
- [ ] Auditar y mejorar theme light con el mismo rigor

---

## 6. Qué NO cambia

- La estructura de rutas y tabs
- La lógica de negocio de ningún panel
- Los overlays (son producto separado, no dashboard)
- La arquitectura CSS Modules
- Los nombres de clases existentes (migración incremental, no reescritura)

---

*Documento de plan generado siguiendo `docs/FRONTEND_DESIGN_GUIDELINES.md`.*
