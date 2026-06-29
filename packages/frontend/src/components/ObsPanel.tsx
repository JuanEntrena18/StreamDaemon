import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPut, apiPost } from '../utils/api';
import { useTranslation } from '../i18n/context';
import { useToast } from '../contexts/ToastContext';
import { OVERLAY_REGISTRY, CATEGORIES, type OverlayEntry, type OverlayCategory } from '../config/overlayRegistry';
import styles from './ObsPanel.module.css';

interface Props {
  channel: string;
}

interface SocialLink {
  platform: string;
  icon: string;
  labelKey: string;
  placeholderKey: string;
  url: string;
  color: string;
}

interface EndScreenSocial {
  platform: string;
  label: string;
  icon: string;
  color: string;
  username: string;
  visible: boolean;
}

const THEMES = [
  { id: '',       labelKey: 'obs.sinTema' },
  { id: 'dj',     labelKey: 'obs.temaDJ' },
  { id: 'subnautica2', labelKey: 'obs.temaSubnautica' },
  { id: 'poe2',   labelKey: 'obs.temaPoE2' },
  { id: 'wow',    labelKey: 'obs.temaHorda' },
  { id: 'alliance', labelKey: 'obs.temaAlianza' },
  { id: 'fortnite', labelKey: 'obs.temaFortnite' },
  { id: '8bits', labelKey: 'obs.tema8bits' },
  { id: 'win95', labelKey: 'obs.temaWin95' },
  { id: 'retrowave', labelKey: 'obs.temaRetrowave' },
  { id: 'tactical', labelKey: 'obs.temaTactical' },
  { id: 'cyberpunk', labelKey: 'obs.temaCyberpunk' },
];

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { platform: 'twitter',   icon: '🐦', labelKey: 'obs.socialTwitter',  placeholderKey: 'obs.twitterPlaceholder',  url: '', color: '#1d9bf0' },
  { platform: 'youtube',   icon: '📺', labelKey: 'obs.socialYoutube',  placeholderKey: 'obs.youtubePlaceholder',  url: '', color: '#ff0000' },
  { platform: 'instagram', icon: '📸', labelKey: 'obs.socialInstagram', placeholderKey: 'obs.instagramPlaceholder', url: '', color: '#e1306c' },
  { platform: 'discord',   icon: '💬', labelKey: 'obs.socialDiscord',  placeholderKey: 'obs.discordPlaceholder',  url: '', color: '#5865f2' },
  { platform: 'tiktok',    icon: '🎵', labelKey: 'obs.socialTiktok',   placeholderKey: 'obs.tiktokPlaceholder',   url: '', color: '#ff0050' },
  { platform: 'github',    icon: '💻', labelKey: 'obs.socialGithub',   placeholderKey: 'obs.githubPlaceholder',   url: '', color: '#e6edf3' },
];

const END_SCREEN_SOCIALS_INIT: EndScreenSocial[] = [
  { platform: 'twitch',    label: 'Twitch',     icon: '📺', color: '#9146ff', username: '', visible: true },
  { platform: 'x',         label: 'X / Twitter', icon: '🐦', color: '#ffffff', username: '', visible: true },
  { platform: 'youtube',   label: 'YouTube',    icon: '📺', color: '#ff0000', username: '', visible: true },
  { platform: 'instagram', label: 'Instagram',  icon: '📸', color: '#e1306c', username: '', visible: true },
  { platform: 'tiktok',    label: 'TikTok',     icon: '🎵', color: '#ff0050', username: '', visible: true },
];

export function ObsPanel({ channel }: Props) {
  const { t } = useTranslation();
  const toast = useToast();

  const [selectedTheme, setSelectedTheme] = useState('');
  const [orientation, setOrientation] = useState<'all' | 'horizontal' | 'vertical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [socialExpanded, setSocialExpanded] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(DEFAULT_SOCIAL_LINKS);
  const [endScreenSocials, setEndScreenSocials] = useState<EndScreenSocial[]>(END_SCREEN_SOCIALS_INIT);
  const [endSocialExpanded, setEndSocialExpanded] = useState<string | null>(null);
  const overlayBaseUrl = import.meta.env.DEV ? 'http://localhost:5173' : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');

  const [customGame, setCustomGame] = useState('');

  const [fnApiKey, setFnApiKey] = useState('');
  const [fnHasKey, setFnHasKey] = useState(false);
  const [fnEditingKey, setFnEditingKey] = useState(false);
  const [showFnApiKey, setShowFnApiKey] = useState(false);
  const [fnEpicUsername, setFnEpicUsername] = useState('');
  const [fnStatsMode, setFnStatsMode] = useState('overall');
  const [fnLayout, setFnLayout] = useState('stats');
  const [fnSaved, setFnSaved] = useState(false);

  const [obsHost, setObsHost] = useState('127.0.0.1');
  const [obsPort, setObsPort] = useState('4455');
  const [obsPassword, setObsPassword] = useState('');
  const [obsConnected, setObsConnected] = useState(false);
  const [obsConnecting, setObsConnecting] = useState(false);
  const [obsError, setObsError] = useState('');
  const [obsApplying, setObsApplying] = useState<string | null>(null);

  useEffect(() => {
    apiGet('/obs/status').then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      setObsConnected(data.connected);
    }).catch(() => {});
  }, []);

  const getObsSceneConfigs = useCallback((themeId: string): { name: string; url: string; width: number; height: number }[] => {
    const cat = CATEGORIES.find((c) => c.themeId === themeId);
    if (!cat) return [];
    const overlays = OVERLAY_REGISTRY.filter((item) => item.category === cat.id);
    const socials = endScreenSocials.filter((s) => s.visible && s.username.trim());
    const socialsParam = socials.length > 0 ? encodeURIComponent(JSON.stringify(socials.map((s) => ({ p: s.platform, u: s.username })))) : '';
    const be = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    function makeUrl(ov: OverlayEntry): string {
      let url: string;
      if (ov.filename) {
        url = `${overlayBaseUrl}/overlays/${ov.filename}`;
        url += `?channel=${channel}`;
        url += `&backend=${encodeURIComponent(be)}`;
        if (ov.mode === 'fortnite' && fnEpicUsername) url += `&epic=${encodeURIComponent(fnEpicUsername)}&mode=${fnStatsMode}&layout=${fnLayout}`;
        if (ov.mode.endsWith('-end') && socialsParam) url += `&socials=${socialsParam}`;
      } else {
        url = `${overlayBaseUrl}/overlay.html?mode=${ov.mode}`;
        url += `&channel=${channel}`;
        if (ov.supportsTheme && selectedTheme) url += `&theme=${selectedTheme}`;
      }
      return url;
    }

    const sceneMap: { name: string; patterns: string[] }[] = [
      { name: 'Inicio', patterns: ['starting-soon', '-start', 'inicio', '-vertical-start'] },
      { name: 'Juego', patterns: ['gameplay', '-juego', '-vertical-gameplay'] },
      { name: 'BRB', patterns: ['brb', '-vertical-brb'] },
      { name: 'Just Chatting', patterns: ['just-chatting', 'justchatting', '-vertical-just-chatting'] },
    ];

    const result: { name: string; url: string; width: number; height: number }[] = [];
    for (const scene of sceneMap) {
      const hMatch = overlays.find((ov) => ov.orientation === 'horizontal' && scene.patterns.some((p) => ov.id.includes(p) && !ov.id.includes('-vertical-')));
      if (hMatch) {
        result.push({ name: scene.name, url: makeUrl(hMatch), width: 1920, height: 1080 });
      }
      const vMatch = overlays.find((ov) => ov.orientation === 'vertical' && scene.patterns.some((p) => ov.id.includes(p)));
      if (vMatch) {
        result.push({ name: `${scene.name} · Vertical`, url: makeUrl(vMatch), width: 1080, height: 1920 });
      }
    }
    return result;
  }, [channel, overlayBaseUrl, selectedTheme, fnEpicUsername, fnStatsMode, fnLayout, endScreenSocials]);

  const connectObs = useCallback(async () => {
    setObsConnecting(true);
    setObsError('');
    try {
      const r = await apiPost('/obs/connect', { host: obsHost, port: parseInt(obsPort, 10), password: obsPassword });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setObsError(data.error || 'Connection failed');
        setObsConnected(false);
      } else {
        setObsConnected(true);
      }
    } catch (err: any) {
      setObsError(err.message || 'Connection error');
      setObsConnected(false);
    } finally {
      setObsConnecting(false);
    }
  }, [obsHost, obsPort, obsPassword]);

  const disconnectObs = useCallback(async () => {
    try {
      await apiPost('/obs/disconnect');
      setObsConnected(false);
    } catch {}
  }, []);

  const applyTheme = useCallback(async (themeId: string) => {
    setObsApplying(themeId);
    setObsError('');
    try {
      const scenes = getObsSceneConfigs(themeId);
      if (scenes.length === 0) {
        setObsError('No overlays found for this theme');
        setObsApplying(null);
        return;
      }
      const r = await apiPost('/obs/apply-theme', { scenes });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setObsError(data.error || 'Failed to apply theme');
      } else {
        toast.success(t('obs.obsThemeApplied'));
      }
    } catch (err: any) {
      setObsError(err.message || 'Apply error');
    } finally {
      setObsApplying(null);
    }
  }, [getObsSceneConfigs, toast, t]);

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
    toast.success(t('obs.guardadoConfig'));
    setTimeout(() => setFnSaved(false), 3000);
  };

  function getFilteredOverlays(): OverlayEntry[] {
    const items = OVERLAY_REGISTRY.filter((item) => {
      if (!selectedTheme) {
        if (item.orientation === 'vertical') return true;
        const cat = CATEGORIES.find((c) => c.id === item.category);
        return cat && cat.themeId === '';
      }
      if (selectedTheme === 'fortnite') {
        return item.id === 'fortnite' || item.id === 'fortnite-alerts'
          || item.id === 'fortnite-vertical' || item.id === 'fortnite-alerts-vertical'
          || item.id === 'fortnite-vertical-inicio' || item.id === 'fortnite-vertical-despedida'
          || item.id === 'fortnite-vertical-brb' || item.id === 'fortnite-vertical-gameplay'
          || item.id === 'fortnite-vertical-just-chatting'
          || item.id === 'fortnite-starting-soon' || item.id === 'fortnite-ending'
          || item.id === 'fortnite-hud-api';
      }
      if (selectedTheme === 'subnautica2') return item.id === 'subnautica2_standalone';
      const cat = CATEGORIES.find((c) => c.id === item.category);
      return cat && cat.themeId === selectedTheme;
    });

    const orientationFiltered = orientation === 'all' ? items
      : items.filter((i) => orientation === 'vertical' ? i.orientation === 'vertical' : i.orientation === 'horizontal');

    if (!searchQuery.trim()) return orientationFiltered;
    const q = searchQuery.toLowerCase();
    return orientationFiltered.filter((i) =>
      t(i.labelKey).toLowerCase().includes(q) ||
      t(i.descKey).toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q),
    );
  }

  function getCategoryEntries(): Map<OverlayCategory, OverlayEntry[]> {
    const map = new Map<OverlayCategory, OverlayEntry[]>();
    for (const item of getFilteredOverlays()) {
      const existing = map.get(item.category);
      if (existing) existing.push(item);
      else map.set(item.category, [item]);
    }
    return map;
  }

  function buildUrl(item: OverlayEntry): string {
    const standalone = item.filename;
    if (standalone) {
      let url = `${overlayBaseUrl}/overlays/${standalone}`;
      if (channel) url += `?channel=${channel}`;
      if (item.mode === 'fortnite' && fnEpicUsername) url += `&epic=${encodeURIComponent(fnEpicUsername)}&mode=${fnStatsMode}&layout=${fnLayout}`;
      const be = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      url += `${channel ? '&' : '?'}backend=${encodeURIComponent(be)}`;
      if (item.mode.endsWith('-end')) {
        const active = endScreenSocials.filter((s) => s.visible && s.username.trim());
        if (active.length > 0) {
          url += `&socials=${encodeURIComponent(JSON.stringify(active.map((s) => ({ p: s.platform, u: s.username }))))}`;
        }
      }
      return url;
    }
    let url = `${overlayBaseUrl}/overlay.html?mode=${item.mode}`;
    if (channel) url += `&channel=${channel}`;
    if (item.supportsTheme && selectedTheme) url += `&theme=${selectedTheme}`;
    if (item.mode === 'custom' && customGame) url += `&game=${encodeURIComponent(customGame)}`;
    return url;
  }

  function buildSocialUrl(): string {
    const active = socialLinks.filter((l) => l.url.trim());
    const base = `${overlayBaseUrl}/overlay.html?mode=social`;
    const channelParam = channel ? `&channel=${channel}` : '';
    const linksParam =
      active.length > 0
        ? `&socials=${encodeURIComponent(JSON.stringify(active.map((l) => ({ platform: l.platform, url: l.url, label: t(l.labelKey) }))))}`
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

  function renderOverlayCard(item: OverlayEntry) {
    const isSocial = item.id === 'social';
    const url = isSocial ? buildSocialUrl() : buildUrl(item);
    const isCopied = copied === item.id;

    return (
      <div key={item.id}>
        <div className={`glass-card ${styles.overlayCard}`}>
          <div className={styles.iconBox} style={{
            background: `${item.color}22`,
            border: `1px solid ${item.color}44`,
          }}>
            {item.icon}
          </div>

          <div className={styles.cardContent}>
            <div className="flex-row flex-row--gap-sm mb-2">
              <span className={styles.cardTitle}>{t(item.labelKey)}</span>
              {item.supportsTheme && selectedTheme && (
                <span className="sf-badge sf-badge-violet text-xs">
                  {t(THEMES.find((th) => th.id === selectedTheme)?.labelKey ?? '')}
                </span>
              )}
              {item.isNew && <span className="sf-badge sf-badge-new text-xs">{t('obs.new')}</span>}
            </div>
            <p className={styles.cardDesc}>
              {t(item.descKey)}
            </p>
            {item.id === 'custom' && (
              <div className="mb-2">
                <input
                  id="custom-game-input"
                  type="text"
                  value={customGame}
                  onChange={(e) => setCustomGame(e.target.value)}
                  placeholder="Nombre del juego (opcional)"
                  className={`sf-input ${styles.customInput}`}
                />
              </div>
            )}
            <code className={styles.codeBlock}>
              {url}
            </code>
          </div>

          <div className={styles.cardActions}>
            <button
              id={`copy-${item.id}`}
              onClick={() => copyToClipboard(item.id, url)}
              className={`sf-btn ${isCopied ? 'sf-btn-ghost' : 'sf-btn-primary'} ${styles.copyBtn}`}
            >
              {isCopied ? t('obs.copiado') : t('obs.copiar')}
            </button>

            {isSocial && (
              <button
                id="social-configure-btn"
                onClick={() => setSocialExpanded((v) => !v)}
                className={socialExpanded ? styles.configureBtnSocial : styles.configureBtnInactive}
              >
                {socialExpanded ? '▲' : '▼'} {t('obs.configurar')}
              </button>
            )}

            {item.mode.endsWith('-end') && (
              <button
                id={`endsocial-configure-btn-${item.id}`}
                onClick={() => setEndSocialExpanded(endSocialExpanded === item.id ? null : item.id)}
                className={endSocialExpanded === item.id ? styles.configureBtnEnd : styles.configureBtnInactive}
              >
                {endSocialExpanded === item.id ? '▲' : '▼'} {t('obs.configurar')}
              </button>
            )}
          </div>
        </div>

        {item.mode.endsWith('-end') && (
          <AnimatePresence>
            {endSocialExpanded === item.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={styles.expandSection}
              >
                <div className={styles.expandContentEnd}>
                  <p className={styles.sectionTitleEnd}>
                    Redes Sociales · Pantalla de Despedida
                  </p>
                  <p className={styles.socialHelp}>
                    Ingresa tu nombre de usuario en cada red y desactiva las que no quieras mostrar.
                  </p>

                  <div className="flex-col flex-col--gap-sm">
                    {endScreenSocials.map((social, idx) => (
                      <div key={social.platform} className={styles.endSocialRow}>
                        <button
                          onClick={() => {
                            const next = [...endScreenSocials];
                            next[idx] = { ...next[idx], visible: !next[idx].visible };
                            setEndScreenSocials(next);
                          }}
                          className={social.visible ? styles.checkboxBtnChecked : styles.checkboxBtnUnchecked}
                          style={social.visible ? {
                            background: `${social.color}44`,
                            border: `2px solid ${social.color}`,
                            color: '#fff',
                          } : {
                            border: `2px solid var(--sf-border)`,
                          }}
                          title={social.visible ? 'Ocultar' : 'Mostrar'}
                        >
                          {social.visible ? '✓' : ''}
                        </button>

                        <div className={styles.endSocialIconBox} style={{
                          background: `${social.color}22`,
                          border: `1px solid ${social.color}44`,
                        }}>
                          {social.icon}
                        </div>

                        <span className={social.visible ? styles.endSocialLabelVisible : styles.endSocialLabelHidden}>
                          {social.label}
                        </span>

                        <input
                          type="text"
                          value={social.username}
                          onChange={(e) => {
                            const next = [...endScreenSocials];
                            next[idx] = { ...next[idx], username: e.target.value };
                            setEndScreenSocials(next);
                          }}
                          placeholder="@tu_usuario"
                          className={`sf-input ${styles.endSocialInput}`}
                          style={{ opacity: social.visible ? 1 : 0.4 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {isSocial && (
          <AnimatePresence>
            {socialExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={styles.expandSection}
              >
                <div className={styles.expandContentSocial}>
                  <p className={styles.sectionTitleSocial}>
                    {t('obs.socialUrls')}
                  </p>

                  <div className="flex-col flex-col--gap-sm">
                    {socialLinks.map((link) => (
                      <div key={link.platform} className={styles.socialRow}>
                        <div className={styles.socialIconBox} style={{
                          background: `${link.color}22`,
                          border: `1px solid ${link.color}44`,
                        }}>
                          {link.icon}
                        </div>

                        <span className={styles.socialLabel}>
                          {t(link.labelKey)}
                        </span>

                        <input
                          id={`social-url-${link.platform}`}
                          type="url"
                          value={link.url}
                          onChange={(e) => updateSocialLink(link.platform, e.target.value)}
                          placeholder={t(link.placeholderKey)}
                          className={`sf-input ${styles.socialInput}`}
                        />

                        <div className={link.url.trim() ? styles.statusDotActive : styles.statusDotInactive} />
                      </div>
                    ))}
                  </div>

                  <p className={styles.socialHelp}>
                    {t('obs.socialHelp')}<span style={{ color: '#10b981' }}>●</span>) se incluirán en la URL del overlay.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  }

  const categoryMap = getCategoryEntries();
  const hasHorizontal = [...categoryMap.values()].some((items) => items.some((i) => i.orientation === 'horizontal'));
  const hasVertical = [...categoryMap.values()].some((items) => items.some((i) => i.orientation === 'vertical'));

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className="mb-5">
        <h2 className="sf-heading">
          {t('obs.obsTitle')}
        </h2>
        <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>
          {t('obs.obsInstructions')} <strong style={{ color: 'var(--sf-text)' }}>{t('obs.browserSource')}</strong>.
          {' '}{t('obs.resolucionRecomendada')} <code style={{ background: 'rgba(124,58,237,0.15)', padding: '0.1rem 0.4rem', borderRadius: 4, color: '#a78bfa' }}>1920×1080</code> / <code style={{ background: 'rgba(6,182,212,0.15)', padding: '0.1rem 0.4rem', borderRadius: 4, color: '#22d3ee' }}>1080×1920</code>
        </p>
      </div>

      {/* Theme selector */}
      <div className="glass-card flex-row flex-row--gap-lg mb-5" style={{ padding: '1rem 1.25rem' }}>
        <span className="text-sm" style={{ fontWeight: 600, color: 'var(--sf-text-2)', whiteSpace: 'nowrap' }}>
          {t('obs.temaVisual')}
        </span>
        <div className="flex-wrap">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSelectedTheme(theme.id)}
              className={`sf-pill-selector__pill ${selectedTheme === theme.id ? 'sf-pill-selector__pill--active' : ''}`}
            >
              {t(theme.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* OBS WebSocket */}
      <div className="glass-card mb-5" style={{ padding: '1rem 1.25rem' }}>
        <div className="flex-row flex-row--gap-lg mb-2" style={{ alignItems: 'center' }}>
          <span className="text-sm" style={{ fontWeight: 600, color: 'var(--sf-text-2)', whiteSpace: 'nowrap' }}>
            🔌 {t('obs.obsWsTitle')}
          </span>
          {obsConnected && <span className="sf-badge sf-badge-success text-xs">{t('obs.obsWsConnected')}</span>}
        </div>

        {!obsConnected ? (
          <div className="flex-col flex-col--gap-sm">
            <div className="flex-row flex-row--gap-sm" style={{ alignItems: 'center' }}>
              <input type="text" value={obsHost} onChange={(e) => setObsHost(e.target.value)} placeholder={t('obs.obsWsHost')} className="sf-input text-xs" style={{ width: 140 }} />
              <span style={{ color: 'var(--sf-text-3)' }}>:</span>
              <input type="text" value={obsPort} onChange={(e) => setObsPort(e.target.value)} placeholder="4455" className="sf-input text-xs" style={{ width: 70 }} />
              <input type="password" value={obsPassword} onChange={(e) => setObsPassword(e.target.value)} placeholder={t('obs.obsWsPassword')} className="sf-input text-xs" style={{ width: 140 }} />
              <button onClick={connectObs} disabled={obsConnecting} className="sf-btn sf-btn-primary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}>
                {obsConnecting ? '...' : t('obs.obsWsConnect')}
              </button>
            </div>
            {obsError && <p className="text-xs" style={{ color: '#ef4444' }}>{obsError}</p>}
            <p className="text-xs" style={{ color: 'var(--sf-text-3)' }}>{t('obs.obsWsHelp')}</p>
          </div>
        ) : (
          <div className="flex-col flex-col--gap-sm">
            <div className="flex-row flex-row--gap-sm mb-1" style={{ alignItems: 'center' }}>
              <span className="text-xs" style={{ color: 'var(--sf-text-3)' }}>{t('obs.obsWsConnectedTo')} {obsHost}:{obsPort}</span>
              <button onClick={disconnectObs} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
                {t('obs.obsWsDisconnect')}
              </button>
            </div>
            <div className="flex-wrap" style={{ gap: '0.35rem' }}>
              {THEMES.filter((th) => th.id).map((th) => {
                const applying = obsApplying === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => applyTheme(th.id)}
                    disabled={!!obsApplying}
                    className="sf-pill-selector__pill"
                    style={{
                      borderColor: 'var(--sf-border)',
                      opacity: applying ? 0.6 : 1,
                      cursor: applying ? 'wait' : 'pointer',
                    }}
                  >
                    {applying ? '...' : `⚡ ${t('obs.obsApplyTheme')} ${t(th.labelKey)}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Orientation & Search */}
      <div className="glass-card mb-5" style={{ padding: '0.75rem 1.25rem' }}>
        <div className="flex-row flex-row--gap-lg mb-3">
          <span className="text-sm" style={{ fontWeight: 600, color: 'var(--sf-text-2)', whiteSpace: 'nowrap' }}>
            {t('obs.orientacion')}
          </span>
          <div className="flex-row flex-row--gap-sm">
            {[
              { id: 'all', labelKey: 'obs.orientationAll' },
              { id: 'horizontal', labelKey: 'obs.orientationHorizontal' },
              { id: 'vertical', labelKey: 'obs.orientationVertical' },
            ].map((o) => (
              <button
                key={o.id}
                onClick={() => setOrientation(o.id as any)}
                className={`sf-pill-selector__pill ${orientation === o.id ? 'sf-pill-selector__pill--active' : ''}`}
                style={orientation === o.id ? {
                  borderColor: '#22d3ee',
                  background: 'rgba(6,182,212,0.15)',
                  color: '#22d3ee',
                } : {}}
              >
                {t(o.labelKey)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('obs.searchPlaceholder')}
            className="sf-input w-full text-xs"
            style={{ maxWidth: 320 }}
          />
        </div>
      </div>

      {/* Category sections */}
      <div className="flex-col flex-col--gap-md">
        {CATEGORIES.map((cat) => {
          const catItems = categoryMap.get(cat.id);
          if (!catItems || catItems.length === 0) return null;

          const hItems = catItems.filter((i) => i.orientation === 'horizontal');
          const vItems = catItems.filter((i) => i.orientation === 'vertical');

          return (
            <div key={cat.id}>
              <div className={`glass-card ${styles.categoryHeader}`} style={{ borderLeftColor: cat.color }}>
                <span className={styles.categoryLabel}>{cat.icon} {t(cat.labelKey)}</span>
                <span className={styles.categoryCount}>{catItems.length}</span>
              </div>

              {hItems.length > 0 && hasHorizontal && (
                <>
                  {hasVertical && (
                    <div className={`glass-card ${styles.sectionDividerHorizontal}`}>
                      <span className={styles.sectionDividerLabel}>{t('obs.orientationHorizontal')}</span>
                      <code className={styles.sectionDividerCodeHorizontal}>1920×1080</code>
                    </div>
                  )}
                  {hItems.map((item) => renderOverlayCard(item))}
                </>
              )}

              {vItems.length > 0 && hasVertical && (
                <>
                  <div className={`glass-card ${styles.sectionDividerVertical}`}>
                    <span className={styles.sectionDividerLabel}>{t('obs.orientationVertical')}</span>
                    <code className={styles.sectionDividerCodeVertical}>1080×1920</code>
                  </div>
                  {vItems.map((item) => renderOverlayCard(item))}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Fortnite config */}
      {selectedTheme === 'fortnite' && (
        <div className="glass-card sf-card--tight" style={{ marginTop: '1.5rem' }}>
          <h4 className="flex-row flex-row--gap-sm mb-3" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--sf-text)' }}>
            {t('obs.fortniteTitle')}
          </h4>
          <div className="flex-col flex-col--gap-md">
            <div>
              <label className={styles.fnConfigLabel}>
                {t('obs.apiKeyLabel')}
                <span className={fnHasKey ? styles.fnBadgeReady : styles.fnBadgeMissing}>
                  {fnHasKey ? t('obs.configurada') : t('obs.sinKey')}
                </span>
              </label>
              <div className="flex-row flex-row--gap-sm">
                <input
                  type={showFnApiKey ? 'text' : 'password'}
                  value={fnEditingKey ? fnApiKey : (fnHasKey ? '••••••••' : '')}
                  onChange={(e) => { setFnEditingKey(true); setFnApiKey(e.target.value); }}
                  placeholder={fnHasKey ? t('obs.cambiarKey') : t('obs.ingresarKey')}
                  className="sf-input flex-1 text-xs"
                />
                <button
                  onClick={() => setShowFnApiKey(!showFnApiKey)}
                  className="sf-btn"
                  style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem', cursor: 'pointer' }}
                  title={showFnApiKey ? t('obs.ocultarKey') : t('obs.mostrarKey')}
                >{showFnApiKey ? '🙈' : '👁️'}</button>
                <a href="https://dash.fortnite-api.com" target="_blank" rel="noreferrer" className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  {t('obs.obtenerKey')}
                </a>
              </div>
            </div>
            <div>
              <label className={styles.fnConfigBlockLabel}>
                {t('obs.usuarioEpic')}
              </label>
              <input
                type="text"
                value={fnEpicUsername}
                onChange={(e) => setFnEpicUsername(e.target.value)}
                placeholder={t('obs.epicPlaceholder')}
                className="sf-input w-full text-xs"
              />
            </div>
            <div>
              <label className={styles.fnConfigBlockLabel}>
                {t('obs.modoEstadisticas')}
              </label>
              <div className="flex-wrap" style={{ gap: '0.35rem' }}>
                {['overall', 'solo', 'duo', 'trio', 'squad'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setFnStatsMode(m)}
                    className={`sf-pill-selector__pill ${fnStatsMode === m ? 'sf-pill-selector__pill--active' : ''}`}
                    style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}
                  >{m}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={styles.fnConfigBlockLabel}>
                {t('obs.disenoOverlay')}
              </label>
              <div className="flex-wrap" style={{ gap: '0.35rem' }}>
                {[
                  { value: 'stats', labelKey: 'obs.layoutSoloStats' },
                  { value: 'chat-left', labelKey: 'obs.layoutChatIzquierda' },
                  { value: 'chat-right', labelKey: 'obs.layoutChatDerecha' },
                ].map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setFnLayout(o.value)}
                    className={`sf-pill-selector__pill ${fnLayout === o.value ? 'sf-pill-selector__pill--active' : ''}`}
                  >{t(o.labelKey)}</button>
                ))}
              </div>
            </div>
            <div className="flex-row flex-row--gap-md">
              <button onClick={saveFnConfig} className={`sf-btn sf-btn-primary ${styles.fnSaveBtn}`}>
                {t('obs.guardarConfig')}
              </button>
              {fnSaved && <span className={styles.fnSavedText}>{t('obs.guardadoConfig')}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Help note */}
      <div className={styles.helpNote}>
        <strong style={{ color: '#22d3ee' }}>{t('obs.tip')}</strong> {t('obs.obsTip')}
      </div>
    </div>
  );
}
