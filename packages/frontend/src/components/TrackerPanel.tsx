import { useState, useEffect } from 'react';

interface Props {
  channel: string;
  backendUrl?: string;
}

interface TrackerStats {
  period: string;
  channel: string;
  totalHoursStreamed: number;
  peakViewers: number;
  peakDate: string;
  totalFollowers: number;
  videoCount: number;
}

const PERIODS = [
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: '90d', label: '90 días' },
  { id: 'all', label: 'All time' },
];

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatHours(h: number): string {
  if (h === 0) return '0';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export function TrackerPanel({ channel, backendUrl }: Props) {
  const [period, setPeriod] = useState('7d');
  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const baseUrl = backendUrl || 'http://localhost:3000';

  useEffect(() => {
    if (!channel) return;
    setLoading(true);
    setError('');
    fetch(`${baseUrl}/tracker/stats?period=${period}&channel=${encodeURIComponent(channel)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Error al obtener estadísticas');
        return r.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [channel, period, baseUrl]);

  const noData = stats && stats.videoCount === 0;

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📊 Twitch Tracker
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Estadísticas de rendimiento de tu canal
        </p>
      </div>

      {/* Period selector */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-2)', whiteSpace: 'nowrap' }}>
          📅 Período
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: 99,
                border: '1px solid',
                borderColor: period === p.id ? 'var(--sf-primary)' : 'var(--sf-border)',
                background: period === p.id ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: period === p.id ? '#a78bfa' : 'var(--sf-text-3)',
                fontSize: '0.78rem',
                fontWeight: period === p.id ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--sf-text-3)', fontSize: '0.9rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>⏳</div>
          Cargando estadísticas…
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem 1.25rem', marginBottom: '1.25rem',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--sf-radius-sm)', fontSize: '0.82rem', color: '#f87171',
        }}>
          {error === 'Error al obtener estadísticas'
            ? 'No se pudieron cargar las estadísticas. Asegúrate de tener Twitch conectado.'
            : error}
        </div>
      )}

      {noData && !loading && (
        <div style={{
          padding: '2rem', textAlign: 'center',
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 'var(--sf-radius)', fontSize: '0.85rem', color: 'var(--sf-text-2)',
          marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📭</div>
          No hay streams archivados en este período.
        </div>
      )}

      {/* Stats cards */}
      {stats && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {/* Total hours */}
          <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏱️</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--sf-text)', marginBottom: '0.2rem' }}>
              {formatHours(stats.totalHoursStreamed)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Horas estremeadas
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--sf-text-4)', marginTop: '0.3rem' }}>
              {stats.videoCount} {stats.videoCount === 1 ? 'directo' : 'directos'}
            </div>
          </div>

          {/* Peak viewers */}
          <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👥</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--sf-text)', marginBottom: '0.2rem' }}>
              {stats.peakViewers.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pico de espectadores
            </div>
            {stats.peakDate && (
              <div style={{ fontSize: '0.68rem', color: 'var(--sf-text-4)', marginTop: '0.3rem' }}>
                {formatDate(stats.peakDate)}
              </div>
            )}
          </div>

          {/* Followers */}
          <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>❤️</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--sf-text)', marginBottom: '0.2rem' }}>
              {stats.totalFollowers.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Seguidores totales
            </div>
          </div>
        </div>
      )}

      {/* Trabajando en ello */}
      <div className="glass-card" style={{
        padding: '1.5rem',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))',
        border: '1px solid rgba(245,158,11,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{
            fontSize: '1.25rem', width: 40, height: 40, borderRadius: 10,
            background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>🚧</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fbbf24' }}>Trabajando en ello</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)' }}>
              Pronto recibirás consejos personalizados para mejorar tus directos basados en estas estadísticas.
            </p>
          </div>
        </div>

        {stats && !loading && !noData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 'var(--sf-radius-sm)',
              border: '1px solid rgba(255,255,255,0.04)',
              fontSize: '0.82rem',
              color: 'var(--sf-text-2)',
              lineHeight: 1.6,
            }}>
              💡 <strong style={{ color: 'var(--sf-text)' }}>Sugerencia:</strong>{' '}
              {stats.totalHoursStreamed === 0
                ? 'Comienza a hacer stream y guarda tus VODs para poder analizar tu rendimiento.'
                : stats.peakViewers < 10
                  ? 'Trabaja en la promoción de tus streams en redes sociales para aumentar tu audiencia.'
                  : stats.peakViewers < 50
                    ? '¡Buen trabajo! Sigue interactuando con tu chat para mantener a tu audiencia.'
                    : `¡Gran rendimiento! Tu pico de ${stats.peakViewers} espectadores muestra que tu contenido engancha.`}
            </div>
          </div>
        )}

        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          background: 'rgba(124,58,237,0.06)',
          borderRadius: 'var(--sf-radius-sm)',
          border: '1px dashed rgba(124,58,237,0.2)',
          fontSize: '0.75rem',
          color: 'var(--sf-text-3)',
          textAlign: 'center',
        }}>
          Próximamente: análisis de audiencia, ventana óptima de streaming, comparativas y más.
        </div>
      </div>
    </div>
  );
}
