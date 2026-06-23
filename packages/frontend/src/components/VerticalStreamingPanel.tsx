import { useState } from 'react';
import styles from './VerticalStreamingPanel.module.css';

type Tab = 'guide' | 'requirements' | 'obs' | 'plugins';

export function VerticalStreamingPanel() {
  const [activeSection, setActiveSection] = useState<Tab>('guide');

  const sections: { id: Tab; label: string; icon: string }[] = [
    { id: 'guide', label: 'Guía Completa', icon: '📖' },
    { id: 'requirements', label: 'Requisitos', icon: '🔧' },
    { id: 'plugins', label: 'Plugins', icon: '🔌' },
    { id: 'obs', label: 'Configuración OBS', icon: '🎬' },
  ];

  return (
    <div className={styles.container}>
      <div className="mb-5">
        <h2 className={styles.heading}>
          📱 Streaming Vertical (Dual Format)
        </h2>
        <p className={styles.subtitle}>
          Twitch ha integrado el nuevo sistema de streaming vertical (Dual Format).
          Transmite en horizontal y vertical simultáneamente para llegar a todos tus espectadores,
          estén en escritorio o móvil.
        </p>
        <div className={styles.tabsWrap}>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`${styles.tab} ${activeSection === s.id ? styles['tab--active'] : styles['tab--inactive']}`}
            >
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
      <div className={`glass-card ${styles.linksCard}`}>
        <p className={styles.linksTitle}>
          🌐 Enlaces oficiales
        </p>
        <div className={styles.linksList}>
          <a href="https://help.twitch.tv/s/article/dual-format-vertical-video" target="_blank" rel="noreferrer" className={styles.link}>
            Ayuda oficial de Twitch — Dual Format ↗
          </a>
          <a href="https://blog.twitch.tv/en/2026/06/17/introducing-dual-format-and-2k-streaming-on-twitch/" target="_blank" rel="noreferrer" className={styles.link}>
            Anuncio oficial de Twitch (17 Jun 2026) ↗
          </a>
          <a href="https://streamelements.com/selive" target="_blank" rel="noreferrer" className={styles.link}>
            SE.Live (StreamElements) ↗
          </a>
          <a href="https://aitum.tv/vertical" target="_blank" rel="noreferrer" className={styles.link}>
            Aitum Vertical Plugin ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={`glass-card ${styles.sectionCard}`}>
      <h3 className={styles.sectionTitle}>
        {title}
      </h3>
      <div className={styles.sectionBody}>
        {children}
      </div>
    </div>
  );
}

function StepList({ steps }: { steps: { title: string; desc: string }[] }) {
  return (
    <ol className={styles.stepList}>
      {steps.map((s, i) => (
        <li key={i}>
          <strong className={styles.stepTitle}>{s.title}</strong>
          <p className={styles.stepDesc}>{s.desc}</p>
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
        <ul className={`mt-2 ${styles.bulletList}`}>
          <li><strong>Horizontal (16:9)</strong> — para espectadores en escritorio y TV</li>
          <li><strong>Vertical (9:16)</strong> — para espectadores en móvil con el teléfono en vertical</li>
        </ul>
        <p className="mt-2">
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
        <ul className={styles.bulletList}>
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
        <p className="mb-3">
          El streaming Dual Format procesa dos vídeos simultáneamente, lo que aumenta la carga en la GPU y el ancho de banda.
          Twitch recomienda:
        </p>
        <div className={styles.overflowAuto}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableRow}>
                <th className={styles.tableHeader}>Requisito</th>
                <th className={styles.tableHeader}>1080p</th>
                <th className={styles.tableHeader}>1440p (2K)</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.tableRow}>
                <td className={styles.tableCellStrong}>GPU NVIDIA</td>
                <td className={styles.tableCell}>RTX 3070 o superior</td>
                <td className={styles.tableCell}>RTX 3080/3090/4070 o superior</td>
              </tr>
              <tr className={styles.tableRow}>
                <td className={styles.tableCellStrong}>GPU AMD</td>
                <td className={styles.tableCell}>Radeon 6700 o superior</td>
                <td className={styles.tableCell}>Radeon 6800 o superior</td>
              </tr>
              <tr className={styles.tableRow}>
                <td className={styles.tableCellStrong}>SO</td>
                <td className={styles.tableCell}>Windows 10/11</td>
                <td className={styles.tableCell}>Windows 10/11</td>
              </tr>
              <tr className={styles.tableRow}>
                <td className={styles.tableCellStrong}>Ancho de banda (subida)</td>
                <td className={styles.tableCell}>13.5 Mbps</td>
                <td className={styles.tableCell}>22.5 Mbps o superior</td>
              </tr>
              <tr>
                <td className={styles.tableCellStrong}>Máx. pistas de vídeo</td>
                <td className={styles.tableCell}>4 o menos</td>
                <td className={styles.tableCell}>5 o menos</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Software compatible">
        <ul className={styles.bulletList}>
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
        <p className="mb-2">
          Plugin oficial de OBS que añade un segundo lienzo vertical. Es la solución recomendada por Twitch.
        </p>
        <StepList steps={[
          {
            title: 'Instalación',
            desc: 'Descarga la última versión beta desde aitum.tv/vertical. Cierra OBS antes de instalar.',
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
        <p className="mb-2">
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
        <ul className={styles.bulletList}>
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
        <ul className={styles.bulletList}>
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
