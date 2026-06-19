import { useState } from 'react';

interface Props {
  channel: string;
  backendUrl?: string;
}

type Tab = 'guide' | 'requirements' | 'obs' | 'plugins';

export function VerticalStreamingPanel({ }: Props) {
  const [activeSection, setActiveSection] = useState<Tab>('guide');

  const sections: { id: Tab; label: string; icon: string }[] = [
    { id: 'guide', label: 'Guía Completa', icon: '📖' },
    { id: 'requirements', label: 'Requisitos', icon: '🔧' },
    { id: 'plugins', label: 'Plugins', icon: '🔌' },
    { id: 'obs', label: 'Configuración OBS', icon: '🎬' },
  ];

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    borderRadius: 8,
    border: active ? '1px solid var(--sf-primary)' : '1px solid var(--sf-border)',
    background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
    color: active ? 'var(--sf-primary)' : 'var(--sf-text-2)',
    fontSize: '0.8rem',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)' }}>
          📱 Streaming Vertical (Dual Format)
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Twitch ha integrado el nuevo sistema de streaming vertical (Dual Format).
          Transmite en horizontal y vertical simultáneamente para llegar a todos tus espectadores,
          estén en escritorio o móvil.
        </p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} style={tabStyle(activeSection === s.id)}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'guide' && <GuideSection />}
      {activeSection === 'requirements' && <RequirementsSection />}
      {activeSection === 'plugins' && <PluginsSection />}
      {activeSection === 'obs' && <ObsConfigSection />}

      {/* External links */}
      <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1.25rem' }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.5rem' }}>
          🌐 Enlaces oficiales
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
          <a href="https://help.twitch.tv/s/article/dual-format-vertical-video" target="_blank" rel="noreferrer" style={{ color: 'var(--sf-primary)' }}>
            Ayuda oficial de Twitch — Dual Format ↗
          </a>
          <a href="https://blog.twitch.tv/en/2026/06/17/introducing-dual-format-and-2k-streaming-on-twitch/" target="_blank" rel="noreferrer" style={{ color: 'var(--sf-primary)' }}>
            Anuncio oficial de Twitch (17 Jun 2026) ↗
          </a>
          <a href="https://streamelements.com/selive" target="_blank" rel="noreferrer" style={{ color: 'var(--sf-primary)' }}>
            SE.Live (StreamElements) ↗
          </a>
          <a href="https://aitum.tv/vertical" target="_blank" rel="noreferrer" style={{ color: 'var(--sf-primary)' }}>
            Aitum Vertical Plugin ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--sf-text)', marginBottom: '0.75rem' }}>
        {title}
      </h3>
      <div style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

function StepList({ steps }: { steps: { title: string; desc: string }[] }) {
  return (
    <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {steps.map((s, i) => (
        <li key={i}>
          <strong style={{ color: 'var(--sf-text)' }}>{s.title}</strong>
          <p style={{ margin: '0.25rem 0 0 0' }}>{s.desc}</p>
        </li>
      ))}
    </ol>
  );
}

function GuideSection() {
  return (
    <>
      <SectionCard title="¿Qué es Dual Format?">
        <p>
          <strong>Dual Format</strong> te permite enviar dos versiones de tu stream al mismo tiempo:
        </p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <li><strong>Horizontal (16:9)</strong> — para espectadores en escritorio y TV</li>
          <li><strong>Vertical (9:16)</strong> — para espectadores en móvil con el teléfono en vertical</li>
        </ul>
        <p style={{ marginTop: '0.5rem' }}>
          Twitch recibe ambas versiones simultáneamente con una sola clave de stream.
          Los espectadores ven automáticamente la mejor vista para su dispositivo.
        </p>
      </SectionCard>

      <SectionCard title="Guía paso a paso">
        <StepList steps={[
          {
            title: '1. Solicita acceso al Beta',
            desc: 'Twitch Dual Format está disponible para todos los streamers desde junio 2026. Si aún no lo tienes, ve a help.twitch.tv y solicita acceso al beta de Dual Format.',
          },
          {
            title: '2. Instala un plugin vertical para OBS',
            desc: 'Necesitas Aitum Vertical o SE.Live (versión beta) para añadir un segundo lienzo vertical a OBS. No instales ambos a la vez — pueden causar conflictos.',
          },
          {
            title: '3. Activa Enhanced Broadcasting',
            desc: 'En OBS: Configuración → Stream → marca "Enhanced Broadcasting" en "Multitrack Streaming". Luego selecciona tu plugin vertical como "Additional Canvas".',
          },
          {
            title: '4. Crea una escena vertical dedicada',
            desc: 'No reutilices tu escena horizontal. Crea una nueva escena "Vertical (Mobile)" optimizada para 1080×1920. Reorganiza cámara, gameplay y overlays para que se vean bien en vertical.',
          },
          {
            title: '5. Vincula las escenas',
            desc: 'Usa el dock del plugin (Aitum Vertical o SE.Live) para enlazar tus escenas horizontales con sus equivalentes verticales. Al cambiar de escena en horizontal, la vertical cambiará automáticamente.',
          },
          {
            title: '6. Prueba antes de salir en vivo',
            desc: 'Haz un stream de prueba y revísalo desde un móvil. Verifica que la cámara no se vea recortada, el gameplay sea legible, las alertas no tapen info importante y el texto se lea bien en pantalla pequeña.',
          },
        ]} />
      </SectionCard>

      <SectionCard title="Consejos para el layout vertical">
        <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <li><strong>La cámara arriba o abajo</strong> — el gameplay ocupa la mayor parte de la pantalla, la cámara va en la parte inferior o superior</li>
          <li><strong>Gameplay recortado al centro</strong> — para juegos FPS o competitivos, recorta la parte central de la imagen horizontal</li>
          <li><strong>Overlays reducidos</strong> — las alertas y notificaciones deben ser más compactas para no robar espacio</li>
          <li><strong>Texto más grande</strong> — lo que se ve bien en 1080p horizontal puede ser ilegible en vertical en un móvil</li>
          <li><strong>Menos es más</strong> — no intentes meter toda la info de tu overlay horizontal en el vertical. Prioriza lo esencial</li>
        </ul>
      </SectionCard>
    </>
  );
}

function RequirementsSection() {
  return (
    <>
      <SectionCard title="Requisitos mínimos del sistema">
        <p style={{ marginBottom: '0.75rem' }}>
          El streaming Dual Format procesa dos vídeos simultáneamente, lo que aumenta la carga en la GPU y el ancho de banda.
          Twitch recomienda:
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--sf-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--sf-text)', fontWeight: 600 }}>Requisito</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--sf-text)', fontWeight: 600 }}>1080p</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--sf-text)', fontWeight: 600 }}>1440p (2K)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--sf-border)' }}>
                <td style={{ padding: '0.5rem', color: 'var(--sf-text)' }}>GPU NVIDIA</td>
                <td style={{ padding: '0.5rem' }}>RTX 3070 o superior</td>
                <td style={{ padding: '0.5rem' }}>RTX 3080/3090/4070 o superior</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--sf-border)' }}>
                <td style={{ padding: '0.5rem', color: 'var(--sf-text)' }}>GPU AMD</td>
                <td style={{ padding: '0.5rem' }}>Radeon 6700 o superior</td>
                <td style={{ padding: '0.5rem' }}>Radeon 6800 o superior</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--sf-border)' }}>
                <td style={{ padding: '0.5rem', color: 'var(--sf-text)' }}>SO</td>
                <td style={{ padding: '0.5rem' }}>Windows 10/11</td>
                <td style={{ padding: '0.5rem' }}>Windows 10/11</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--sf-border)' }}>
                <td style={{ padding: '0.5rem', color: 'var(--sf-text)' }}>Ancho de banda (subida)</td>
                <td style={{ padding: '0.5rem' }}>13.5 Mbps</td>
                <td style={{ padding: '0.5rem' }}>22.5 Mbps o superior</td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem', color: 'var(--sf-text)' }}>Máx. pistas de vídeo</td>
                <td style={{ padding: '0.5rem' }}>4 o menos</td>
                <td style={{ padding: '0.5rem' }}>5 o menos</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Software compatible">
        <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <li><strong>OBS Studio</strong> v31.1.2 o superior (v32+ recomendado) + plugin vertical</li>
          <li><strong>Streamlabs</strong> — soporte integrado de Dual Format</li>
          <li><strong>Streamrun</strong> — procesamiento en la nube, sin plugins necesarios</li>
          <li><strong>XSplit</strong> — soporte nativo</li>
        </ul>
      </SectionCard>
    </>
  );
}

function PluginsSection() {
  return (
    <>
      <SectionCard title="Aitum Vertical">
        <p style={{ marginBottom: '0.5rem' }}>
          Plugin oficial de OBS que añade un segundo lienzo vertical. Es la solución recomendada por Twitch.
        </p>
        <StepList steps={[
          {
            title: 'Instalación',
            desc: 'Descarga la最新 versión beta desde aitum.tv/vertical. Cierra OBS antes de instalar.',
          },
          {
            title: 'Configuración en OBS',
            desc: 'Ve a Configuración → Stream → marca "Enhanced Broadcasting" → selecciona "Aitum Vertical" como "Additional Canvas".',
          },
          {
            title: 'Desactivar Backtrack',
            desc: 'En Ajustes de Aitum → General → desmarca "Backtrack" para evitar problemas de rendimiento.',
          },
          {
            title: 'Usar el dock',
            desc: 'Aparecerá un dock de Aitum Vertical en OBS. Desde ahí gestionas tus escenas verticales y las enlazas con las horizontales.',
          },
        ]} />
      </SectionCard>

      <SectionCard title="SE.Live (StreamElements)">
        <p style={{ marginBottom: '0.5rem' }}>
          Alternativa a Aitum Vertical con soporte integrado de Dual Format en su versión beta pública.
        </p>
        <StepList steps={[
          {
            title: 'Instalación',
            desc: 'Descarga la versión Public Beta de SE.Live desde streamelements.com/selive. No uses la versión stable.',
          },
          {
            title: 'Importante',
            desc: 'NO instales Aitum Vertical y SE.Live a la vez. Desinstala Aitum si lo tienes antes de instalar SE.Live.',
          },
          {
            title: 'Configuración',
            desc: 'En OBS → Configuración → Stream → "Enhanced Broadcasting" → selecciona tu canvas de SE.Live como "Additional Canvas".',
          },
          {
            title: 'Versión de OBS',
            desc: 'Si experimentas cuelgues, vuelve a OBS 31. La v32 tiene problemas de estabilidad con varios plugins.',
          },
        ]} />
      </SectionCard>
    </>
  );
}

function ObsConfigSection() {
  return (
    <>
      <SectionCard title="Configuración paso a paso en OBS">
        <StepList steps={[
          {
            title: '1. Verifica la versión de OBS',
            desc: 'Necesitas OBS Studio v31.1.2 o superior. Se recomienda v32+ para mejor compatibilidad.',
          },
          {
            title: '2. Instala el plugin vertical',
            desc: 'Elige Aitum Vertical o SE.Live Beta (no ambos). Instálalo con OBS cerrado.',
          },
          {
            title: '3. Activa Enhanced Broadcasting',
            desc: 'OBS → Configuración (Settings) → Stream → marca "Enhanced Broadcasting" en "Multitrack Streaming".',
          },
          {
            title: '4. Selecciona el lienzo adicional',
            desc: 'En el mismo panel, en "Additional Canvas", selecciona "Aitum Vertical" o el canvas de SE.Live.',
          },
          {
            title: '5. Crea la escena vertical',
            desc: 'Crea una nueva escena. Configura el lienzo a 1080×1920 (vertical). Diseña el layout específico para móvil.',
          },
          {
            title: '6. Vincula escenas',
            desc: 'Usa el dock del plugin para enlazar cada escena horizontal con su versión vertical. Así al cambiar de escena se actualizan ambas.',
          },
          {
            title: '7. Prueba con Twitch Inspector',
            desc: 'Antes de salir en vivo, haz una prueba y revisa Twitch Inspector para asegurarte de que ambas versiones se están enviando correctamente.',
          },
        ]} />
      </SectionCard>

      <SectionCard title="Checklist para móvil (antes de salir en vivo)">
        <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <li>✅ Cámara no recortada ni mal encuadrada</li>
          <li>✅ Gameplay sigue siendo legible en pantalla pequeña</li>
          <li>✅ Alertas y notificaciones no tapan información importante</li>
          <li>✅ Sin clutter excesivo — menos elementos que en horizontal</li>
          <li>✅ Texto legible en un teléfono (más grande que en horizontal)</li>
          <li>✅ Audio balanceado (voz {'>'} juego)</li>
          <li>✅ Probado en un móvil real, no solo en la previsualización de escritorio</li>
        </ul>
      </SectionCard>

      <SectionCard title="Notas importantes">
        <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <li>Dual Format funciona con <strong>Enhanced Broadcasting</strong>, que codifica múltiples variantes del vídeo en tu PC antes de subirlas</li>
          <li>Twitch ha añadido <strong>transcodificado del lado del servidor</strong> para Partners y muchos Afiliados, reduciendo la carga en tu sistema</li>
          <li>El streaming en <strong>1440p (2K)</strong> ya está disponible para Partners y Afiliados, también potenciado por Enhanced Broadcasting</li>
          <li>Los VODs y Clips se generan automáticamente en ambos formatos (horizontal y vertical)</li>
          <li>Usa la <strong>Calculadora de Bitrate</strong> para determinar la configuración óptima según tu subida — el Dual Format requiere ~13.5 Mbps para 1080p</li>
        </ul>
      </SectionCard>
    </>
  );
}
