import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '../utils/api';
import { useTranslation } from '../i18n/context';
import { ConfirmModal } from './ConfirmModal';
import { Toggle } from './Toggle';
import { EmptyState } from './EmptyState';
import styles from './SecurityPanel.module.css';

interface Props {
  channel: string;
}

interface WhitelistEntry {
  username: string;
  reason?: string | null;
  createdAt: string;
}

interface SecurityConfig {
  followBotProtection: boolean;
  spamFilter: boolean;
  autoBan: boolean;
  accountAgeFilter: number;
  whitelist: WhitelistEntry[];
}

interface BotDetection {
  id: string;
  type: 'follow-bot' | 'spam' | 'suspicious';
  user: string;
  userId: string;
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
  'follow-bot': 'security.followBot',
  spam: 'security.spam',
  suspicious: 'security.sospechoso',
};

const DETECTION_TYPE_COLORS: Record<string, string> = {
  'follow-bot': '#f87171',
  spam: '#fbbf24',
  suspicious: '#fb923c',
};

export function SecurityPanel({ channel }: Props) {
  const { t, dateLocale } = useTranslation();
  const [config, setConfig] = useState<SecurityConfig>({
    followBotProtection: true,
    spamFilter: true,
    autoBan: true,
    accountAgeFilter: 0,
    whitelist: [],
  });
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ found: number; banned: number } | null>(null);
  const [newWhitelistUser, setNewWhitelistUser] = useState('');
  const [newWhitelistReason, setNewWhitelistReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmBanUser, setConfirmBanUser] = useState<string | null>(null);

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

  const toggleConfig = async (key: keyof SecurityConfig, value: any) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    await apiPut('/security/config', updated);
  };

  const removeFromWhitelist = async (user: string) => {
    const r = await apiPost('/security/whitelist/remove', { user });
    if (r.ok) {
      const data = await r.json();
      setConfig({ ...config, whitelist: data.whitelist });
    }
  };

  const addWhitelist = async () => {
    const user = newWhitelistUser.trim();
    if (!user) return;
    if (config.whitelist.some((w) => w.username.toLowerCase() === user.toLowerCase())) return;
    
    const r = await apiPut('/security/whitelist', { user, reason: newWhitelistReason });
    if (r.ok) {
      const data = await r.json();
      setConfig({ ...config, whitelist: data.whitelist });
      setNewWhitelistUser('');
      setNewWhitelistReason('');
    }
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

  const handleBan = async (user: string) => {
    setActionLoading(`ban:${user}`);
    try {
      await apiPost('/security/ban', { user });
      loadData();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (user: string) => {
    setActionLoading(`unban:${user}`);
    try {
      await apiPost('/security/unban', { user });
      loadData();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="text-muted" style={{ fontSize: '0.9rem' }}>
        {t('security.loading')}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={`sf-heading flex-row flex-row--gap-sm ${styles.heading}`}>
          {t('security.title')}
        </h2>
        <p className="text-muted text-sm">
          {t('security.subtitle')}
        </p>
      </div>

      {/* Help card */}
      <div className={styles.helpCard}>
        <div className="text-xs" style={{ lineHeight: 1.6, color: 'var(--sf-text-2)' }}>
          {t('security.helpText')}
        </div>
      </div>

      {/* Stats */}
      <div className="glass-card sf-card--tight">
        <h3 className={`${styles.sectionTitle} mb-3`}>
          {t('security.stats')}
        </h3>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: '#f87171' }}>{stats?.stats.totalBanned ?? 0}</div>
            <div className={styles.statLabel}>{t('security.baneadosTotales')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: '#fbbf24' }}>{stats?.stats.todayBanned ?? 0}</div>
            <div className={styles.statLabel}>{t('security.baneadosHoy')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: '#fb923c' }}>{stats?.stats.totalFlagged ?? 0}</div>
            <div className={styles.statLabel}>{t('security.marcados')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: 'var(--sf-primary)' }}>{stats?.knownBotCount ?? 0}</div>
            <div className={styles.statLabel}>{t('security.botsConocidos')}</div>
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="glass-card sf-card--tight">
        <h3 className={`${styles.sectionTitle} mb-3`}>
          {t('security.protecciones')}
        </h3>

        <ToggleRow
          label={t('security.followBots')}
          desc={t('security.followBotsDesc')}
          checked={config.followBotProtection}
          onChange={(v) => toggleConfig('followBotProtection', v)}
        />
        <ToggleRow
          label={t('security.spamFilter')}
          desc={t('security.spamFilterDesc')}
          checked={config.spamFilter}
          onChange={(v) => toggleConfig('spamFilter', v)}
        />
        <ToggleRow
          label={t('security.autoBan')}
          desc={t('security.autoBanDesc')}
          checked={config.autoBan}
          onChange={(v) => toggleConfig('autoBan', v)}
        />
        <div className={styles.toggleRow}>
          <div className="flex-1" style={{ marginLeft: 6 }}>
            <div className={styles.toggleLabel}>
              {t('security.accountAge')}
            </div>
            <div className={styles.toggleDesc}>
              {t('security.accountAgeDesc')}
            </div>
          </div>
          <input 
            type="number" 
            min="0" 
            className="sf-input" 
            style={{ width: 80, textAlign: 'center' }} 
            value={config.accountAgeFilter} 
            onChange={(e) => toggleConfig('accountAgeFilter', parseInt(e.target.value) || 0)} 
          />
        </div>
      </div>

      {/* Manual scan */}
      <div className="glass-card sf-card--tight">
        <h3 className={`${styles.sectionTitle} mb-2`}>
          {t('security.scanTitle')}
        </h3>
        <p className="text-xs text-muted mb-3">
          {t('security.scanDesc')}
        </p>
        <button onClick={runScan} disabled={scanning} className={`sf-btn ${styles.scanButton}`}>
          {scanning ? t('security.escanenado') : t('security.escanear')}
        </button>
        {scanResult && (
          <div className={styles.scanResultBox} style={{
            background: scanResult.found > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            color: scanResult.found > 0 ? '#f87171' : '#34d399',
          }}>
            {scanResult.found > 0
              ? t('security.scanResult', { found: scanResult.found, banned: scanResult.banned })
              : t('security.scanClean')}
          </div>
        )}
      </div>

      {/* Whitelist */}
      <div className="glass-card sf-card--tight">
        <h3 className={`${styles.sectionTitle} mb-2`}>
          {t('security.whitelist')}
        </h3>
        <p className="text-xs text-muted mb-3">
          {t('security.whitelistDesc')}
        </p>

        <div className="flex-row flex-row--gap-sm mb-3">
          <input
            type="text"
            value={newWhitelistUser}
            onChange={(e) => setNewWhitelistUser(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addWhitelist(); }}
            placeholder={t('security.whitelistPlaceholder')}
            className="sf-input flex-1"
          />
          <input
            type="text"
            value={newWhitelistReason}
            onChange={(e) => setNewWhitelistReason(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addWhitelist(); }}
            placeholder={t('security.whitelistReasonPlaceholder')}
            className="sf-input flex-1"
          />
          <button onClick={addWhitelist} disabled={!newWhitelistUser.trim()} className={`sf-btn ${styles.addButton}`}>
            {t('security.agregar')}
          </button>
        </div>

        {config.whitelist.length === 0 ? (
          <div className={styles.emptyText}>
            {t('security.whitelistEmpty')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {config.whitelist.map((w) => (
              <div key={w.username} className="sf-card--tight flex-row flex-row--between" style={{ background: 'var(--sf-surface)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--sf-border)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{w.username}</div>
                  {w.reason && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{w.reason}</div>}
                  <div className="text-xs" style={{ color: 'var(--sf-text-3)', fontSize: '0.7rem', marginTop: 4 }}>
                    {t('security.added')}: {new Date(w.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => removeFromWhitelist(w.username)}
                  className={`sf-btn ${styles.actionBtnDanger}`}
                  style={{ padding: '4px 8px' }}
                >
                  {t('security.quitar')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent detections */}
      <div className="glass-card sf-card">
        <h3 className={`${styles.sectionTitle} mb-3`}>
          {t('security.detections')}
        </h3>
        {(!stats?.recentDetections || stats.recentDetections.length === 0) ? (
          <EmptyState
            icon="🛡️"
            title={t('security.emptyTitle') || 'Todo despejado'}
            description={t('security.detectionsEmpty') || 'No se han detectado bots o spam recientes.'}
          />
        ) : (
          <div className={styles.detectionList}>
            {stats.recentDetections.map((d) => {
              const isWhitelisted = config.whitelist.some((w) => w.username.toLowerCase() === d.user.toLowerCase());
              const loadingKey = actionLoading;
              const isBanLoading = loadingKey === `ban:${d.user}`;
              const isUnbanLoading = loadingKey === `unban:${d.user}`;
              const isWlLoading = loadingKey === `wl:${d.user}`;

              return (
              <div key={d.id} className={styles.detectionItem} style={{
                borderLeft: `3px solid ${DETECTION_TYPE_COLORS[d.type] || 'var(--sf-border)'}`,
              }}>
                <div className={styles.detectionHeader}>
                  <div className={styles.detectionUser}>
                    {d.user}
                    <span className={styles.detectionType} style={{
                      color: DETECTION_TYPE_COLORS[d.type] || 'var(--sf-text-2)',
                    }}>
                      {t(DETECTION_TYPE_LABELS[d.type] || d.type)}
                    </span>
                  </div>
                  <div className={styles.actionBadge} style={{
                    background: d.action === 'banned' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                    color: d.action === 'banned' ? '#f87171' : '#fbbf24',
                  }}>
                    {d.action === 'banned' ? t('security.baneado') : t('security.marcado')}
                  </div>
                </div>
                <div className={styles.detectionMeta}>
                  {d.reason} — {new Date(d.timestamp).toLocaleString(dateLocale || 'es-ES')}
                </div>
                <div className={styles.detectionActions}>
                  {d.action === 'flagged' && (
                    <button
                      onClick={() => setConfirmBanUser(d.user)}
                      disabled={isBanLoading}
                      className={`sf-btn ${styles.actionBtn} ${styles.actionBtnDanger}`}
                    >
                      {isBanLoading ? t('security.banning') : t('security.ban')}
                    </button>
                  )}
                  {d.action === 'banned' && (
                    <button
                      onClick={() => handleUnban(d.user)}
                      disabled={isUnbanLoading}
                      className={`sf-btn ${styles.actionBtn} ${styles.actionBtnSuccess}`}
                    >
                      {isUnbanLoading ? t('security.unbanning') : t('security.unban')}
                    </button>
                  )}
                  {isWhitelisted ? (
                    <button
                      onClick={() => removeFromWhitelist(d.user)}
                      className={`sf-btn ${styles.actionBtn} ${styles.actionBtnWarning}`}
                    >
                      {t('security.removeWhitelist')}
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        setActionLoading(`wl:${d.user}`);
                        try {
                          await apiPut('/security/whitelist', { user: d.user });
                          loadData();
                        } finally {
                          setActionLoading(null);
                        }
                      }}
                      disabled={isWlLoading}
                      className={`sf-btn ${styles.actionBtn} ${styles.actionBtnInfo}`}
                    >
                      {isWlLoading ? '...' : t('security.addWhitelist')}
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmBanUser !== null}
        title={t('security.confirmBanTitle')}
        message={t('security.confirmBanMsg', { user: confirmBanUser || '' })}
        confirmLabel={t('security.ban')}
        onConfirm={() => { if (confirmBanUser) handleBan(confirmBanUser); setConfirmBanUser(null); }}
        onCancel={() => setConfirmBanUser(null)}
      />
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
    <div className={styles.toggleRow}>
      <Toggle checked={checked} onChange={onChange} />
      <div className="flex-1" style={{ marginLeft: 6 }}>
        <div className={styles.toggleLabel}>
          {label}
        </div>
        <div className={styles.toggleDesc}>
          {desc}
        </div>
      </div>
    </div>
  );
}
