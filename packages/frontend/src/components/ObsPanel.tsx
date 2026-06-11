import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPut } from '../utils/api';

interface Props {
  channel: string;
  backendUrl?: string;
}

interface OBSUrl {
  id: string;
  icon: string;
  label: string;
  description: string;
  mode: string;
  supportsTheme: boolean;
  color: string;
}

const OBS_URLS: OBSUrl[] = [
  {
    id: 'chat',
    icon: '💬',
    label: 'Chat Overlay',
    description: 'Mensajes del chat en tiempo real con animaciones temáticas',
    mode: 'chat',
    supportsTheme: true,
    color: '#7c3aed',
  },
  {
    id: 'custom',
    icon: '🎨',
    label: 'Overlay Personalizado',
    description: 'Overlay interactivo con nombre del canal, juego y actividad de usuarios',
    mode: 'custom',
    supportsTheme: false,
    color: '#a855f7',
  },
  {
    id: 'giveaway',
    icon: '🎁',
    label: 'Sorteos',
    description: 'Notificaciones de sorteos activos y anuncio del ganador',
    mode: 'giveaway',
    supportsTheme: true,
    color: '#10b981',
  },
  {
    id: 'prediction',
    icon: '📊',
    label: 'Predicciones',
    description: 'Estado y resultados de predicciones de Twitch en vivo',
    mode: 'prediction',
    supportsTheme: true,
    color: '#f59e0b',
  },
  {
    id: 'social',
    icon: '🌐',
    label: 'Redes Sociales',
    description: 'Overlay animado con enlaces a redes sociales del canal',
    mode: 'social',
    supportsTheme: false,
    color: '#06b6d4',
  },
  {
    id: 'hud',
    icon: '📊',
    label: 'Stream HUD',
    description: 'Estadísticas en vivo: viewers, followers, subs y tiempo de stream',
    mode: 'hud',
    supportsTheme: false,
    color: '#a855f7',
  },
  {
    id: 'timer',
    icon: '⏱️',
    label: 'Temporizador',
    description: 'Cuenta regresiva en pantalla configurable desde el panel',
    mode: 'timer',
    supportsTheme: false,
    color: '#f59e0b',
  },
  {
    id: 'scoreboard',
    icon: '🏆',
    label: 'Scoreboard',
    description: 'Marcador en vivo para torneos y competiciones',
    mode: 'scoreboard',
    supportsTheme: false,
    color: '#10b981',
  },
  {
    id: 'subathon',
    icon: '🔴',
    label: 'Subathon',
    description: 'Temporizador ampliable con suscripciones, bits y recompensas',
    mode: 'subathon',
    supportsTheme: false,
    color: '#ef4444',
  },
  {
    id: 'subnautica2_standalone',
    icon: '🌊',
    label: 'Subnautica 2 (Completo)',
    description: 'Overlay completo de Subnautica 2 con HUD, partículas, sonar, chat y alertas en vivo',
    mode: 'subnautica2_standalone',
    supportsTheme: false,
    color: '#00d4ff',
  },
  {
    id: 'fortnite',
    icon: '🔫',
    label: 'Fortnite Overlay',
    description: 'Overlay temático de Fortnite con HUD, stats, alertas y chat en vivo',
    mode: 'fortnite',
    supportsTheme: false,
    color: '#00D4FF',
  },
  {
    id: 'alerts',
    icon: '🔔',
    label: 'Alertas',
    description: 'Alertas animadas con confetti: follows, subs, bits, raids y canjeos',
    mode: 'alerts',
    supportsTheme: false,
    color: '#c84bff',
  },
  // ── DJ Section ──
  {
    id: 'dj-webcam',
    icon: '🎥',
    label: 'DJ · Webcam',
    description: 'Marco DJ para webcam con ecualizador y vinilos decorativos',
    mode: 'dj-webcam',
    supportsTheme: false,
    color: '#00f0ff',
  },
  {
    id: 'dj-webcam-labels',
    icon: '🏷️',
    label: 'DJ · Webcam + Etiquetas',
    description: 'Webcam DJ con seguidores, suscriptores, donaciones y bits en vivo',
    mode: 'dj-webcam-labels',
    supportsTheme: false,
    color: '#ff00aa',
  },
  {
    id: 'dj-chroma',
    icon: '🟢',
    label: 'DJ · Chroma Verde',
    description: 'Overlay DJ con fondo chroma green para cámara',
    mode: 'dj-chroma',
    supportsTheme: false,
    color: '#34d399',
  },
  {
    id: 'dj-chroma-labels',
    icon: '🔰',
    label: 'DJ · Chroma + Etiquetas',
    description: 'Chroma verde DJ con seguidores, suscriptores, donaciones y cheers',
    mode: 'dj-chroma-labels',
    supportsTheme: false,
    color: '#8b5cf6',
  },
  {
    id: 'dj-banner-webcam',
    icon: '📰',
    label: 'DJ · Banner + Webcam',
    description: 'Banner inferior DJ con webcam, nombre y estadísticas en vivo',
    mode: 'dj-banner-webcam',
    supportsTheme: false,
    color: '#fbbf24',
  },
  {
    id: 'dj-banner-chroma',
    icon: '📋',
    label: 'DJ · Banner Chroma',
    description: 'Banner inferior DJ con fondo chroma, nombre y estadísticas',
    mode: 'dj-banner-chroma',
    supportsTheme: false,
    color: '#f472b6',
  },
  {
    id: 'dj-fullscreen',
    icon: '🖥️',
    label: 'DJ · Pantalla Completa',
    description: 'Overlay DJ a pantalla completa con nombre, ecualizador y 4 etiquetas',
    mode: 'dj-fullscreen',
    supportsTheme: false,
    color: '#a855f7',
  },
  {
    id: 'dj-alerts',
    icon: '🔔',
    label: 'DJ · Alertas',
    description: 'Alertas temáticas DJ: seguidor, sub, donación, cheer, host y raid',
    mode: 'dj-alerts',
    supportsTheme: false,
    color: '#ff00aa',
  },
  {
    id: 'dj-transition',
    icon: '💿',
    label: 'DJ · Transición',
    description: 'Transición DJ con vinilo giratorio, brillos y nombre en vivo',
    mode: 'dj-transition',
    supportsTheme: false,
    color: '#00f0ff',
  },
];

const THEMES = [
  { id: '', label: 'Sin tema' },
  { id: 'dj', label: '🎧 DJ' },
  { id: 'subnautica2', label: '🌊 Subnautica 2' },
  { id: 'poe2', label: '⚔️ Path of Exile 2' },
  { id: 'wow', label: '🛡️ WoW - Horda' },
  { id: 'alliance', label: '👑 WoW - Alianza' },
  { id: 'fortnite', label: '🔫 Fortnite' },
];

interface SocialLink {
  platform: string;
  icon: string;
  label: string;
  placeholder: string;
  url: string;
  color: string;
}

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { platform: 'twitter',   icon: '🐦', label: 'Twitter / X',  placeholder: 'https://x.com/tu_usuario',        url: '', color: '#1d9bf0' },
  { platform: 'youtube',   icon: '📺', label: 'YouTube',       placeholder: 'https://youtube.com/@tu_canal',   url: '', color: '#ff0000' },
  { platform: 'instagram', icon: '📸', label: 'Instagram',     placeholder: 'https://instagram.com/tu_usuario',url: '', color: '#e1306c' },
  { platform: 'discord',   icon: '💬', label: 'Discord',       placeholder: 'https://discord.gg/tu_invite',    url: '', color: '#5865f2' },
  { platform: 'tiktok',    icon: '🎵', label: 'TikTok',        placeholder: 'https://tiktok.com/@tu_usuario',  url: '', color: '#ff0050' },
  { platform: 'github',    icon: '💻', label: 'GitHub',        placeholder: 'https://github.com/tu_usuario',   url: '', color: '#e6edf3' },
];

export function ObsPanel({ channel, backendUrl }: Props) {
  const [selectedTheme, setSelectedTheme] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [socialExpanded, setSocialExpanded] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(DEFAULT_SOCIAL_LINKS);
  // En modo dev (Vite) el overlay lo sirve el frontend en :5173
  const overlayBaseUrl = import.meta.env.DEV ? 'http://localhost:5173' : (backendUrl || 'http://localhost:3000');

  const [customGame, setCustomGame] = useState('');

  // Fortnite config
  const [fnApiKey, setFnApiKey] = useState('');
  const [fnHasKey, setFnHasKey] = useState(false);
  const [fnEditingKey, setFnEditingKey] = useState(false);
  const [showFnApiKey, setShowFnApiKey] = useState(false);
  const [fnEpicUsername, setFnEpicUsername] = useState('');
  const [fnStatsMode, setFnStatsMode] = useState('overall');
  const [fnLayout, setFnLayout] = useState('stats');
  const [fnSaved, setFnSaved] = useState(false);

  useEffect(() => {
    apiGet('/fortnite/config').then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      if (data.apiKey) setFnHasKey(true);
      if (data.epicUsername) setFnEpicUsername(data.epicUsername);
      if (data.statsMode) setFnStatsMode(data.statsMode);
      if (data.layout) setFnLayout(data.layout);
    });
  }, []);

  const saveFnConfig = async () => {
    const body: any = { epicUsername: fnEpicUsername, statsMode: fnStatsMode, layout: fnLayout };
    if (fnApiKey) body.apiKey = fnApiKey;
    await apiPut('/fortnite/config', body);
    setFnSaved(true);
    if (fnApiKey) { setFnHasKey(true); setFnApiKey(''); setFnEditingKey(false); }
    setTimeout(() => setFnSaved(false), 3000);
  };

  const STANDALONE_OVERLAYS: Record<string, string> = {
    subnautica2_standalone: 'subnautica2.html',
    fortnite: 'fortnite.html',
    alerts: 'alerts.html',
    subathon: 'subathon.html',
    'dj-webcam': 'dj-webcam.html',
    'dj-webcam-labels': 'dj-webcam-labels.html',
    'dj-chroma': 'dj-chroma.html',
    'dj-chroma-labels': 'dj-chroma-labels.html',
    'dj-banner-webcam': 'dj-banner-webcam.html',
    'dj-banner-chroma': 'dj-banner-chroma.html',
    'dj-fullscreen': 'dj-fullscreen.html',
    'dj-alerts': 'dj-alerts.html',
    'dj-transition': 'dj-transition.html',
  };

  function buildUrl(mode: string, supportsTheme: boolean): string {
    const standalone = STANDALONE_OVERLAYS[mode];
    if (standalone) {
      let url = `${overlayBaseUrl}/overlays/${standalone}`;
      if (channel) url += `?channel=${channel}`;
      if (mode === 'fortnite' && fnEpicUsername) url += `&epic=${encodeURIComponent(fnEpicUsername)}&mode=${fnStatsMode}&layout=${fnLayout}`;
      const be = backendUrl || 'http://localhost:3000';
      if (be !== location.origin) url += `${channel ? '&' : '?'}backend=${encodeURIComponent(be)}`;
      return url;
    }
    let url = `${overlayBaseUrl}/overlay.html?mode=${mode}`;
    if (channel) url += `&channel=${channel}`;
    if (supportsTheme && selectedTheme) url += `&theme=${selectedTheme}`;
    if (mode === 'custom' && customGame) url += `&game=${encodeURIComponent(customGame)}`;
    return url;
  }

  function buildSocialUrl(): string {
    const active = socialLinks.filter((l) => l.url.trim());
    const base = `${overlayBaseUrl}/overlay.html?mode=social`;
    const channelParam = channel ? `&channel=${channel}` : '';
    // Encode social links as query params
    const linksParam =
      active.length > 0
        ? `&socials=${encodeURIComponent(JSON.stringify(active.map((l) => ({ platform: l.platform, url: l.url, label: l.label }))))}` 
        : '';
    return `${base}${channelParam}${linksParam}`;
  }

  async function copyToClipboard(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  function updateSocialLink(platform: string, url: string) {
    setSocialLinks((prev) =>
      prev.map((l) => (l.platform === platform ? { ...l, url } : l)),
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)' }}>
          URLs para OBS Browser Source
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Copia la URL y agrégala en OBS como <strong style={{ color: 'var(--sf-text)' }}>Browser Source</strong>.
          Resolución recomendada: <code style={{ background: 'rgba(124,58,237,0.15)', padding: '0.1rem 0.4rem', borderRadius: 4, color: '#a78bfa' }}>1920×1080</code>
        </p>
      </div>

      {/* Theme selector */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-2)', whiteSpace: 'nowrap' }}>
          🎨 Tema visual
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTheme(t.id)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: 99,
                border: '1px solid',
                borderColor: selectedTheme === t.id ? 'var(--sf-primary)' : 'var(--sf-border)',
                background: selectedTheme === t.id ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: selectedTheme === t.id ? '#a78bfa' : 'var(--sf-text-3)',
                fontSize: '0.78rem',
                fontWeight: selectedTheme === t.id ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* URL Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {OBS_URLS.filter((item) => {
          if (selectedTheme === 'fortnite') return item.id === 'fortnite';
          if (selectedTheme === 'subnautica2') return item.id === 'subnautica2_standalone';
          if (selectedTheme === 'dj') return item.id.startsWith('dj-');
          // When no theme is selected, hide theme-specific overlays
          if (item.id.startsWith('dj-')) return false;
          return true;
        }).map((item) => {
          const isSocial = item.id === 'social';
          const url = isSocial ? buildSocialUrl() : buildUrl(item.mode, item.supportsTheme);
          const isCopied = copied === item.id;

          return (
            <div key={item.id}>
              <div
                className="glass-card"
                style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}
              >
                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `${item.color}22`,
                  border: `1px solid ${item.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.25rem',
                }}>
                  {item.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--sf-text)' }}>{item.label}</span>
                    {item.supportsTheme && selectedTheme && (
                      <span className="sf-badge sf-badge-violet" style={{ fontSize: '0.6rem' }}>
                        {THEMES.find((t) => t.id === selectedTheme)?.label}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', marginBottom: '0.625rem' }}>
                    {item.description}
                  </p>
                  {item.id === 'custom' && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <input
                        id="custom-game-input"
                        type="text"
                        value={customGame}
                        onChange={(e) => setCustomGame(e.target.value)}
                        placeholder="Nombre del juego (opcional)"
                        className="sf-input"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', maxWidth: 280 }}
                      />
                    </div>
                  )}
                  <code style={{
                    fontSize: '0.72rem',
                    color: 'var(--sf-text-2)',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.3rem 0.6rem',
                    borderRadius: 6,
                    display: 'block',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                    border: '1px solid var(--sf-border)',
                  }}>
                    {url}
                  </code>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                  <button
                    id={`copy-${item.id}`}
                    onClick={() => copyToClipboard(item.id, url)}
                    className={`sf-btn ${isCopied ? 'sf-btn-ghost' : 'sf-btn-primary'}`}
                    style={{ minWidth: 90, fontSize: '0.78rem', padding: '0.45rem 0.875rem' }}
                  >
                    {isCopied ? '✓ Copiado' : 'Copiar'}
                  </button>

                  {/* Configure button for social */}
                  {isSocial && (
                    <button
                      id="social-configure-btn"
                      onClick={() => setSocialExpanded((v) => !v)}
                      style={{
                        padding: '0.45rem 0.875rem',
                        borderRadius: 'var(--sf-radius-sm)',
                        border: `1px solid ${socialExpanded ? item.color + '88' : 'var(--sf-border)'}`,
                        background: socialExpanded ? `${item.color}18` : 'transparent',
                        color: socialExpanded ? '#22d3ee' : 'var(--sf-text-3)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        justifyContent: 'center',
                      }}
                    >
                      {socialExpanded ? '▲' : '▼'} Configurar
                    </button>
                  )}
                </div>
              </div>

              {/* ── Social sub-menu ── */}
              {isSocial && (
                <AnimatePresence>
                  {socialExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          marginTop: 4,
                          padding: '1.25rem',
                          background: 'rgba(6,182,212,0.04)',
                          border: '1px solid rgba(6,182,212,0.15)',
                          borderTop: 'none',
                          borderRadius: '0 0 var(--sf-radius) var(--sf-radius)',
                        }}
                      >
                        <p
                          className="sf-section-title"
                          style={{ marginBottom: '1rem', color: '#22d3ee' }}
                        >
                          🌐 URLs de tus redes sociales
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                          {socialLinks.map((link) => (
                            <div
                              key={link.platform}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                            >
                              {/* Platform badge */}
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  background: `${link.color}22`,
                                  border: `1px solid ${link.color}44`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1rem',
                                  flexShrink: 0,
                                }}
                              >
                                {link.icon}
                              </div>

                              {/* Label */}
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  color: 'var(--sf-text-2)',
                                  width: 90,
                                  flexShrink: 0,
                                }}
                              >
                                {link.label}
                              </span>

                              {/* URL input */}
                              <input
                                id={`social-url-${link.platform}`}
                                type="url"
                                value={link.url}
                                onChange={(e) => updateSocialLink(link.platform, e.target.value)}
                                placeholder={link.placeholder}
                                className="sf-input"
                                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                              />

                              {/* Active indicator */}
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: link.url.trim() ? '#10b981' : 'var(--sf-border)',
                                  boxShadow: link.url.trim() ? '0 0 6px #10b981' : 'none',
                                  flexShrink: 0,
                                  transition: 'all 0.2s ease',
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        <p
                          style={{
                            marginTop: '1rem',
                            fontSize: '0.72rem',
                            color: 'var(--sf-text-3)',
                            lineHeight: 1.5,
                          }}
                        >
                          💡 Deja vacíos los campos que no uses. Las redes activas (
                          <span style={{ color: '#10b981' }}>●</span>) se incluirán en la URL del overlay.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          );
        })}
      </div>

      {/* Fortnite config */}
      {selectedTheme === 'fortnite' && (
        <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--sf-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔫 Estadísticas de Fortnite
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* API Key */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                API Key de Fortnite-API.com
                <span style={{
                  fontSize: '0.6rem', fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                  color: fnHasKey ? '#34d399' : '#ef4444',
                  background: fnHasKey ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)',
                  border: `1px solid ${fnHasKey ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>
                  {fnHasKey ? '✓ Configurada' : '✗ Sin key'}
                </span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type={showFnApiKey ? 'text' : 'password'}
                  value={fnEditingKey ? fnApiKey : (fnHasKey ? '••••••••' : '')}
                  onChange={(e) => { setFnEditingKey(true); setFnApiKey(e.target.value); }}
                  placeholder={fnHasKey ? 'Escribí para cambiar la key...' : 'Ingresá tu API key...'}
                  className="sf-input"
                  style={{ flex: 1, fontSize: '0.78rem' }}
                />
                <button
                  onClick={() => setShowFnApiKey(!showFnApiKey)}
                  className="sf-btn"
                  style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem', cursor: 'pointer' }}
                  title={showFnApiKey ? 'Ocultar key' : 'Mostrar key'}
                >{showFnApiKey ? '🙈' : '👁️'}</button>
                <a href="https://dash.fortnite-api.com" target="_blank" rel="noreferrer" className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  🌐 Obtener key
                </a>
              </div>
            </div>
            {/* Epic Username */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '0.25rem', display: 'block' }}>
                Usuario de Epic Games
              </label>
              <input
                type="text"
                value={fnEpicUsername}
                onChange={(e) => setFnEpicUsername(e.target.value)}
                placeholder="Ej: jentrena"
                className="sf-input"
                style={{ width: '100%', fontSize: '0.78rem' }}
              />
            </div>
            {/* Mode selector */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '0.25rem', display: 'block' }}>
                Modo de estadísticas
              </label>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {['overall', 'solo', 'duo', 'trio', 'squad'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setFnStatsMode(m)}
                    style={{
                      padding: '0.25rem 0.75rem', borderRadius: 99, border: '1px solid',
                      borderColor: fnStatsMode === m ? 'var(--sf-primary)' : 'var(--sf-border)',
                      background: fnStatsMode === m ? 'rgba(124,58,237,0.2)' : 'transparent',
                      color: fnStatsMode === m ? '#a78bfa' : 'var(--sf-text-3)',
                      fontSize: '0.75rem', fontWeight: fnStatsMode === m ? 600 : 400,
                      cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase',
                    }}
                  >{m}</button>
                ))}
              </div>
            </div>
            {/* Layout selector */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '0.25rem', display: 'block' }}>
                Diseño del overlay
              </label>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[
                  { value: 'stats', label: '📊 Solo stats' },
                  { value: 'chat-left', label: '💬 Chat izquierda' },
                  { value: 'chat-right', label: '💬 Chat derecha' },
                ].map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setFnLayout(o.value)}
                    style={{
                      padding: '0.25rem 0.75rem', borderRadius: 99, border: '1px solid',
                      borderColor: fnLayout === o.value ? 'var(--sf-primary)' : 'var(--sf-border)',
                      background: fnLayout === o.value ? 'rgba(124,58,237,0.2)' : 'transparent',
                      color: fnLayout === o.value ? '#a78bfa' : 'var(--sf-text-3)',
                      fontSize: '0.75rem', fontWeight: fnLayout === o.value ? 600 : 400,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >{o.label}</button>
                ))}
              </div>
            </div>
            {/* Save */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={saveFnConfig} className="sf-btn sf-btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 1rem' }}>
                Guardar Configuración
              </button>
              {fnSaved && <span style={{ fontSize: '0.72rem', color: '#34d399' }}>✓ Guardado</span>}
            </div>
          </div>
        </div>
      )}

      {/* Help note */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem 1.25rem',
        background: 'rgba(6,182,212,0.06)',
        border: '1px solid rgba(6,182,212,0.15)',
        borderRadius: 'var(--sf-radius)',
        fontSize: '0.8rem',
        color: 'var(--sf-text-2)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: '#22d3ee' }}>💡 Tip:</strong> En OBS, ve a <em>Fuentes → + → Browser</em> y pega la URL.
        Asegúrate de que StreamForger esté corriendo para que el overlay reciba datos en tiempo real.
      </div>
    </div>
  );
}
