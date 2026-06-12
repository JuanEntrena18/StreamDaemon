import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '../utils/api';

interface Props {
  channel: string;
  backendUrl: string;
}

interface SecurityConfig {
  followBotProtection: boolean;
  spamFilter: boolean;
  autoBan: boolean;
  whitelist: string[];
}

interface BotDetection {
  id: string;
  type: 'follow-bot' | 'spam' | 'suspicious';
  user: string;
  action: 'banned' | 'flagged';
  timestamp: number;
  reason: string;
}

interface Stats {
  totalBanned: number;
  todayBanned: number;
  totalFlagged: number;
}

interface StatsResponse {
  stats: Stats;
  recentDetections: BotDetection[];
  knownBotCount: number;
}

const DETECTION_TYPE_LABELS: Record<string, string> = {
  'follow-bot': 'Follow Bot',
  spam: 'Spam',
  suspicious: 'Sospechoso',
};

const DETECTION_TYPE_COLORS: Record<string, string> = {
  'follow-bot': '#f87171',
  spam: '#fbbf24',
  suspicious: '#fb923c',
};

export function SecurityPanel({ channel }: Props) {
  const [config, setConfig] = useState<SecurityConfig>({
    followBotProtection: true,
    spamFilter: true,
    autoBan: true,
    whitelist: [],
  });
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ found: number; banned: number } | null>(null);
  const [newWhitelistUser, setNewWhitelistUser] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [cfg, st] = await Promise.all([
        apiGet('/security/config'),
        apiGet('/security/stats'),
      ]);
      if (cfg.ok) setConfig(await cfg.json());
      if (st.ok) setStats(await st.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleConfig = async (key: keyof SecurityConfig, value: boolean) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    await apiPut('/security/config', updated);
  };

  const removeFromWhitelist = async (user: string) => {
    await apiPost('/security/whitelist/remove', { user });
    const updated = config.whitelist.filter((w) => w !== user);
    setConfig({ ...config, whitelist: updated });
  };

  const addWhitelist = async () => {
    const user = newWhitelistUser.trim();
    if (!user) return;
    if (config.whitelist.includes(user)) return;
    await apiPut('/security/whitelist', { user });
    setConfig({ ...config, whitelist: [...config.whitelist, user] });
    setNewWhitelistUser('');
  };

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const r = await apiPost('/security/scan', { channel });
      if (r.ok) setScanResult(await r.json());
    } catch {
      setScanResult({ found: 0, banned: 0 });
    } finally {
      setScanning(false);
      loadData();
    }
  };

  if (loading) {
    return (
      <div style={{ color: 'var(--sf-text-2)', fontSize: '0.9rem' }}>
        Cargando configuración de seguridad...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Protección Anti-Bots
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Detección automática de bots y spam inspirada en Sery Bot
        </p>
      </div>

      {/* Stats */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--sf-text)' }}>
          Estadísticas
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'var(--sf-surface)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f87171' }}>{stats?.stats.totalBanned ?? 0}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-2)', marginTop: '0.2rem' }}>Baneados totales</div>
          </div>
          <div style={{ background: 'var(--sf-surface)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>{stats?.stats.todayBanned ?? 0}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-2)', marginTop: '0.2rem' }}>Baneados hoy</div>
          </div>
          <div style={{ background: 'var(--sf-surface)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fb923c' }}>{stats?.stats.totalFlagged ?? 0}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-2)', marginTop: '0.2rem' }}>Marcados</div>
          </div>
          <div style={{ background: 'var(--sf-surface)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--sf-primary)' }}>{stats?.knownBotCount ?? 0}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-2)', marginTop: '0.2rem' }}>Bots conocidos</div>
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--sf-text)' }}>
          Protecciones activas
        </h3>

        <ToggleRow
          label="Protección contra Follow Bots"
          desc="Detecta y bloquea automáticamente cuentas sospechosas al seguir el canal"
          checked={config.followBotProtection}
          onChange={(v) => toggleConfig('followBotProtection', v)}
        />
        <ToggleRow
          label="Filtro de Spam en chat"
          desc="Detecta mensajes con enlaces acortados, promociones no solicitadas y patrones de spam"
          checked={config.spamFilter}
          onChange={(v) => toggleConfig('spamFilter', v)}
        />
        <ToggleRow
          label="Auto-ban"
          desc="Banear automáticamente a los usuarios detectados como bots. Si está desactivado, solo se marcarán"
          checked={config.autoBan}
          onChange={(v) => toggleConfig('autoBan', v)}
        />
      </div>

      {/* Manual scan */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--sf-text)' }}>
          Escaneo manual de seguidores
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.75rem' }}>
          Revisa la lista de seguidores actual buscando patrones sospechosos
        </p>
        <button onClick={runScan} disabled={scanning} className="sf-btn" style={{
          fontSize: '0.82rem', padding: '0.45rem 1rem',
          background: 'rgba(239,68,68,0.1)', color: '#f87171',
          border: '1px solid rgba(239,68,68,0.25)',
        }}>
          {scanning ? 'Escaneando...' : 'Escanear seguidores'}
        </button>
        {scanResult && (
          <div style={{
            marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 6,
            fontSize: '0.82rem',
            background: scanResult.found > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            color: scanResult.found > 0 ? '#f87171' : '#34d399',
          }}>
            {scanResult.found > 0
              ? `Se encontraron ${scanResult.found} cuentas sospechosas. ${scanResult.banned} baneadas.`
              : 'No se encontraron cuentas sospechosas.'}
          </div>
        )}
      </div>

      {/* Whitelist */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--sf-text)' }}>
          Lista blanca
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.75rem' }}>
          Usuarios excluidos de la detección automática
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            type="text"
            value={newWhitelistUser}
            onChange={(e) => setNewWhitelistUser(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addWhitelist(); }}
            placeholder="Nombre de usuario"
            className="sf-input"
            style={{ flex: 1 }}
          />
          <button onClick={addWhitelist} disabled={!newWhitelistUser.trim()} className="sf-btn" style={{
            fontSize: '0.82rem', padding: '0.45rem 1rem',
            background: 'var(--sf-primary)', color: '#fff', border: 'none',
          }}>
            Agregar
          </button>
        </div>

        {config.whitelist.length === 0 ? (
          <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)' }}>
            No hay usuarios en la lista blanca
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {config.whitelist.map((user) => (
              <span key={user} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.25rem 0.5rem', borderRadius: 6,
                background: 'rgba(16,185,129,0.1)', color: '#34d399',
                fontSize: '0.8rem', border: '1px solid rgba(16,185,129,0.2)',
              }}>
                {user}
                <button
                  onClick={() => removeFromWhitelist(user)}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontSize: '0.85rem', lineHeight: 1 }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recent detections */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--sf-text)' }}>
          Detecciones recientes
        </h3>
        {(!stats?.recentDetections || stats.recentDetections.length === 0) ? (
          <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)' }}>
            No hay detecciones registradas
          </div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {stats.recentDetections.map((d) => (
              <div key={d.id} style={{
                padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: '0.35rem',
                background: 'var(--sf-surface)',
                borderLeft: `3px solid ${DETECTION_TYPE_COLORS[d.type] || 'var(--sf-border)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)' }}>
                    {d.user}
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 400, marginLeft: '0.4rem',
                      color: DETECTION_TYPE_COLORS[d.type] || 'var(--sf-text-2)',
                    }}>
                      {DETECTION_TYPE_LABELS[d.type] || d.type}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 4,
                    background: d.action === 'banned' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                    color: d.action === 'banned' ? '#f87171' : '#fbbf24',
                    textTransform: 'uppercase', fontWeight: 600,
                  }}>
                    {d.action === 'banned' ? 'Baneado' : 'Marcado'}
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-2)' }}>
                  {d.reason} — {new Date(d.timestamp).toLocaleString('es-ES')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      padding: '0.75rem 0', borderBottom: '1px solid var(--sf-border)',
    }}>
      <button
        onClick={() => onChange(!checked)}
        style={{
          flexShrink: 0, width: 44, height: 24, borderRadius: 12,
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s',
          background: checked ? 'var(--sf-primary)' : 'var(--sf-border)',
          marginTop: 2,
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: checked ? 22 : 2,
          width: 20, height: 20, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.15rem' }}>
          {label}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-2)' }}>
          {desc}
        </div>
      </div>
    </div>
  );
}
