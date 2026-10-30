import { useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPut, apiPost } from '../utils/api';
import { useTranslation } from '../i18n/context';
import { useToast } from '../contexts/ToastContext';
import { OVERLAY_REGISTRY, CATEGORIES, type OverlayEntry, type OverlayCategory } from '../config/overlayRegistry';
import { OverlayPreviewModal } from './OverlayPreviewModal';
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

interface ThemeDescriptor {
  id: string;
  labelKey: string;
  color: string;
  tag: string;
}

const THEMES: ThemeDescriptor[] = [
  { id: '',           labelKey: 'obs.sinTema',        color: '#8b5cf6', tag: 'Core & Widgets' },
  { id: 'cyberpunk',  labelKey: 'obs.temaCyberpunk',  color: '#ff003c', tag: 'Neon Glitch' },
  { id: 'fortnite',   labelKey: 'obs.temaFortnite',   color: '#00d4ff', tag: 'Battle Royale' },
  { id: 'extraction', labelKey: 'obs.temaExtraction', color: '#ff6b00', tag: 'Raid & Comms' },
  { id: 'dj',         labelKey: 'obs.temaDJ',         color: '#00f0ff', tag: 'Vinyl & EQ' },
  { id: 'retrowave',  labelKey: 'obs.temaRetrowave',  color: '#ff00ff', tag: 'Synth Sunset' },
  { id: '8bits',      labelKey: 'obs.tema8bits',      color: '#00ff41', tag: 'Pixel Arcade' },
  { id: 'tactical',   labelKey: 'obs.temaTactical',   color: '#ffb300', tag: 'DRADIS HUD' },
  { id: 'win95',      labelKey: 'obs.temaWin95',      color: '#20b2aa', tag: 'Retro Desktop' },
  { id: 'wow',        labelKey: 'obs.temaHorda',      color: '#ff2a2a', tag: 'Crimson Bastion' },
  { id: 'alliance',   labelKey: 'obs.temaAlianza',    color: '#4a8cff', tag: 'Royal Crest' },
  { id: 'subnautica2', labelKey: 'obs.temaSubnautica', color: '#00d4ff', tag: 'Abyssal Sonar' },
];

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { platform: 'twitter',   icon: '𝕏', labelKey: 'obs.socialTwitter',   placeholderKey: 'obs.twitterPlaceholder',   url: '', color: '#1d9bf0' },
  { platform: 'youtube',   icon: '▶', labelKey: 'obs.socialYoutube',   placeholderKey: 'obs.youtubePlaceholder',   url: '', color: '#ff0000' },
  { platform: 'instagram', icon: '◎', labelKey: 'obs.socialInstagram', placeholderKey: 'obs.instagramPlaceholder', url: '', color: '#e1306c' },
  { platform: 'discord',   icon: '◈', labelKey: 'obs.socialDiscord',   placeholderKey: 'obs.discordPlaceholder',   url: '', color: '#5865f2' },
  { platform: 'tiktok',    icon: '♪', labelKey: 'obs.socialTiktok',    placeholderKey: 'obs.tiktokPlaceholder',    url: '', color: '#ff0050' },
  { platform: 'github',    icon: '⌘', labelKey: 'obs.socialGithub',    placeholderKey: 'obs.githubPlaceholder',    url: '', color: '#e6edf3' },
];

const END_SCREEN_SOCIALS_INIT: EndScreenSocial[] = [
  { platform: 'twitch',    label: 'Twitch',      icon: '◈', color: '#9146ff', username: '', visible: true },
  { platform: 'x',         label: 'X / Twitter', icon: '𝕏', color: '#ffffff', username: '', visible: true },
  { platform: 'youtube',   label: 'YouTube',     icon: '▶', color: '#ff0000', username: '', visible: true },
  { platform: 'instagram', label: 'Instagram',   icon: '◎', color: '#e1306c', username: '', visible: true },
  { platform: 'tiktok',    label: 'TikTok',      icon: '♪', color: '#ff0050', username: '', visible: true },
];

/** Strip leading emoji from legacy localized strings so custom SVG emblems stand cleanly */
function cleanLabel(text: string): string {
  return text.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\s]+/u, '').trim() || text;
}

/** Large bespoke SVG emblem for each Visual Theme in obs.temaVisual */
function ThemeArtwork({ themeId }: { themeId: string }) {
  switch (themeId) {
    case 'dj':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="14" r="9" />
          <circle cx="12" cy="14" r="3" fill="currentColor" fillOpacity="0.25" />
          <path d="M8.5 10.5A5 5 0 0 1 12 9" />
          <path d="M22 6v9l-3 3" />
          <circle cx="22" cy="6" r="1.5" fill="currentColor" />
          <line x1="25" y1="15" x2="25" y2="22" />
        </svg>
      );
    case 'subnautica2':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="14" cy="14" r="10" />
          <circle cx="14" cy="14" r="5.5" strokeDasharray="3 2.5" />
          <path d="M4.5 15.5c2.5-2 4.5 2 7 0s4.5 2 7 0 4.5 2 5 0.5" />
          <line x1="14" y1="14" x2="20.5" y2="8.5" />
          <circle cx="14" cy="14" r="1.6" fill="currentColor" />
        </svg>
      );
    case 'wow':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 3 22 9l-2 12-6 4-6-4L6 9z" fill="currentColor" fillOpacity="0.14" />
          <path d="M14 7 18 13l-4 8-4-8z" />
          <path d="M5 8 9 11M23 8l-4 3M6 19l3-2M22 19l-3-2" />
        </svg>
      );
    case 'alliance':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 6h16v8c0 6-8 10-8 10S6 20 6 14V6z" fill="currentColor" fillOpacity="0.14" />
          <path d="m9.5 12 2.5 2.5L14 10l2 4.5L18.5 12l-1 5h-7z" />
        </svg>
      );
    case 'fortnite':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="14" cy="14" r="8.5" />
          <line x1="14" y1="2.5" x2="14" y2="7.5" />
          <line x1="14" y1="20.5" x2="14" y2="25.5" />
          <line x1="2.5" y1="14" x2="7.5" y2="14" />
          <line x1="20.5" y1="14" x2="25.5" y2="14" />
          <polygon points="14 10.5 17.5 14 14 17.5 10.5 14" fill="currentColor" fillOpacity="0.3" />
        </svg>
      );
    case '8bits':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="7" width="22" height="14" rx="2" fill="currentColor" fillOpacity="0.12" />
          <path d="M9 11v6M6 14h6" strokeWidth="2.2" />
          <circle cx="18" cy="15.5" r="1.4" fill="currentColor" />
          <circle cx="21" cy="12.5" r="1.4" fill="currentColor" />
        </svg>
      );
    case 'win95':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="4.5" width="21" height="19" rx="1.5" />
          <line x1="3.5" y1="9.5" x2="24.5" y2="9.5" />
          <rect x="6" y="6.5" width="7" height="1.2" fill="currentColor" />
          <circle cx="21.5" cy="7" r="0.8" fill="currentColor" />
          <circle cx="18.5" cy="7" r="0.8" fill="currentColor" />
          <path d="m11 13 6 3.5-2.8.8 1.3 2.7-1.6.7-1.3-2.7-1.6 1.8z" fill="currentColor" fillOpacity="0.3" />
        </svg>
      );
    case 'retrowave':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 16a8 8 0 0 1 16 0" fill="currentColor" fillOpacity="0.2" />
          <line x1="2.5" y1="16" x2="25.5" y2="16" />
          <line x1="7.5" y1="13" x2="20.5" y2="13" />
          <path d="M3 23h22M6 19.5h16M14 16v7M10 16l-4 7M18 16l4 7" />
        </svg>
      );
    case 'tactical':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="9 3.5 19 3.5 24.5 9 24.5 19 19 24.5 9 24.5 3.5 19 3.5 9" fill="currentColor" fillOpacity="0.12" />
          <circle cx="14" cy="14" r="5" />
          <path d="M14 14 20 8" strokeWidth="2" />
          <circle cx="17" cy="11" r="1.2" fill="currentColor" />
        </svg>
      );
    case 'cyberpunk':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="3 9 25 9 22 18 16 18 14 15 12 18 6 18" fill="currentColor" fillOpacity="0.18" />
          <path d="M7 12.5h14" strokeWidth="2" />
          <path d="m16 4-3 5h4l-3 15" />
        </svg>
      );
    case 'extraction':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9V5h4M24 9V5h-4M4 19v4h4M24 19v4h-4" />
          <polygon points="14 7 20 17 8 17" fill="currentColor" fillOpacity="0.2" />
          <path d="m11 21 3-3 3 3" />
        </svg>
      );
    default:
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="14 3.5 24.5 9 14 14.5 3.5 9" fill="currentColor" fillOpacity="0.2" />
          <polyline points="3.5 14 14 19.5 24.5 14" />
          <polyline points="3.5 19 14 24.5 24.5 19" />
        </svg>
      );
  }
}

/** Clean vector icon for individual Scene Cards based on scene role */
function SceneRoleIcon({ item }: { item: OverlayEntry }) {
  const id = item.id;
  if (id.includes('start') || id.includes('inicio')) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" fillOpacity="0.18" />
      </svg>
    );
  }
  if (id.includes('brb')) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" fillOpacity="0.18" />
        <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" fillOpacity="0.18" />
      </svg>
    );
  }
  if (id.includes('end') || id.includes('despedida')) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="currentColor" fillOpacity="0.18" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    );
  }
  if (id.includes('alert')) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="currentColor" fillOpacity="0.16" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    );
  }
  if (id.includes('chat') || id.includes('just-chatting') || id.includes('justchatting')) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="currentColor" fillOpacity="0.16" />
        <line x1="8" y1="9" x2="16" y2="9" />
        <line x1="8" y1="13" x2="13" y2="13" />
      </svg>
    );
  }
  if (id.includes('gameplay') || id.includes('hud') || id === 'fortnite' || id === 'subnautica2_standalone') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="3" fill="currentColor" fillOpacity="0.15" />
        <path d="M6 12h4M8 10v4" />
        <circle cx="15" cy="11" r="1" fill="currentColor" />
        <circle cx="18" cy="13" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (id.includes('webcam') || id.includes('chroma') || id.includes('avatar')) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" fill="currentColor" fillOpacity="0.18" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="currentColor" fillOpacity="0.15" />
      </svg>
    );
  }
  if (id.includes('timer') || id.includes('subathon') || id.includes('speedrun')) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8" fill="currentColor" fillOpacity="0.15" />
        <path d="M12 9v4l2.5 2.5" />
        <path d="M9 2h6" />
      </svg>
    );
  }
  if (id.includes('giveaway') || id.includes('prediction') || id.includes('scoreboard')) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" fill="currentColor" fillOpacity="0.16" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="currentColor" fillOpacity="0.15" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function matchThemeItem(item: OverlayEntry, themeId: string): boolean {
  if (!themeId) {
    if (item.orientation === 'vertical') return true;
    const cat = CATEGORIES.find((c) => c.id === item.category);
    return Boolean(cat && cat.themeId === '');
  }
  if (themeId === 'fortnite') {
    return item.id === 'fortnite' || item.id === 'fortnite-alerts' || item.id === 'fortnite-brb'
      || item.id === 'fortnite-vertical' || item.id === 'fortnite-alerts-vertical'
      || item.id === 'fortnite-vertical-inicio' || item.id === 'fortnite-vertical-despedida'
      || item.id === 'fortnite-vertical-brb' || item.id === 'fortnite-vertical-gameplay'
      || item.id === 'fortnite-vertical-just-chatting'
      || item.id === 'fortnite-starting-soon' || item.id === 'fortnite-ending'
      || item.id === 'fortnite-hud-api';
  }
  if (themeId === 'subnautica2') return item.id === 'subnautica2_standalone';
  const cat = CATEGORIES.find((c) => c.id === item.category);
  return Boolean(cat && cat.themeId === themeId);
}

export function ObsPanel({ channel }: Props) {
  const { t } = useTranslation();
  const toast = useToast();

  const [selectedTheme, setSelectedTheme] = useState('');
  const [orientation, setOrientation] = useState<'all' | 'horizontal' | 'vertical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [previewOverlay, setPreviewOverlay] = useState<{ url: string; orientation: 'horizontal' | 'vertical' } | null>(null);
  const [socialExpanded, setSocialExpanded] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(DEFAULT_SOCIAL_LINKS);
  const [endScreenSocials, setEndScreenSocials] = useState<EndScreenSocial[]>(END_SCREEN_SOCIALS_INIT);
  const [endSocialExpanded, setEndSocialExpanded] = useState<string | null>(null);
  const overlayBaseUrl = import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin;

  const [customGame, setCustomGame] = useState('');

  const [fnApiKey, setFnApiKey] = useState('');
  const [fnHasKey, setFnHasKey] = useState(false);
  const [fnEditingKey, setFnEditingKey] = useState(false);
  const [showFnApiKey, setShowFnApiKey] = useState(false);
  const [fnEpicUsername, setFnEpicUsername] = useState('');
  const [fnStatsMode, setFnStatsMode] = useState('overall');
  const [fnLayout, setFnLayout] = useState('stats');
  const [fnSaved, setFnSaved] = useState(false);

  const [obsConnected, setObsConnected] = useState(false);
  const [obsApplyingId, setObsApplyingId] = useState<string | null>(null);

  useEffect(() => {
    apiGet('/obs/status').then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      setObsConnected(data.connected);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    apiGet('/fortnite/config').then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      if (data.apiKey) setFnHasKey(true);
      if (data.epicUsername) setFnEpicUsername(data.epicUsername);
      if (data.statsMode) setFnStatsMode(data.statsMode);
      if (data.layout) setFnLayout(data.layout);
    }).catch(() => {});
  }, []);

  /** Precompute scene count per visual theme so each card in obs.temaVisual shows its exact inventory */
  const themeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const th of THEMES) {
      counts[th.id] = OVERLAY_REGISTRY.filter((item) => matchThemeItem(item, th.id)).length;
    }
    return counts;
  }, []);

  function getSceneNameFromOverlay(ov: OverlayEntry): string {
    const id = ov.id;
    if (id.includes('starting-soon') || id.includes('-start') || id.includes('inicio')) return ov.orientation === 'vertical' ? 'Inicio · Vertical' : 'Inicio';
    if (id.includes('gameplay') || id.includes('-juego')) return ov.orientation === 'vertical' ? 'Juego · Vertical' : 'Juego';
    if (id.includes('brb')) return ov.orientation === 'vertical' ? 'BRB · Vertical' : 'BRB';
    if (id.includes('just-chatting') || id.includes('justchatting')) return ov.orientation === 'vertical' ? 'Just Chatting · Vertical' : 'Just Chatting';
    if (id.includes('-end') || id.includes('ending') || id.includes('despedida')) return ov.orientation === 'vertical' ? 'Final · Vertical' : 'Final';
    if (id.includes('alerts') || id.includes('alertas') || id.includes('alerta')) return ov.orientation === 'vertical' ? 'Alertas · Vertical' : 'Alertas';
    if (id.includes('fullscreen') || id.includes('pantalla-completa')) return 'Pantalla Completa';
    if (id.includes('chat-standalone') || id.includes('chat-independiente')) return 'Chat';
    if (id.includes('hud')) return 'HUD';
    return id;
  }

  function getOverlayUrl(ov: OverlayEntry): string {
    const be = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const socials = endScreenSocials.filter((s) => s.visible && s.username.trim());
    const socialsParam = socials.length > 0 ? encodeURIComponent(JSON.stringify(socials.map((s) => ({ p: s.platform, u: s.username })))) : '';
    if (ov.filename) {
      let url = `${overlayBaseUrl}/overlays/${ov.filename}`;
      url += `?channel=${channel}`;
      url += `&backend=${encodeURIComponent(be)}`;
      if ((ov.mode === 'fortnite' || ov.mode === 'fortnite-hud-api') && fnEpicUsername) url += `&epic=${encodeURIComponent(fnEpicUsername)}&mode=${fnStatsMode}&layout=${fnLayout}`;
      if (ov.mode.endsWith('-end') && socialsParam) url += `&socials=${socialsParam}`;
      return url;
    }
    let url = `${overlayBaseUrl}/overlay.html?mode=${ov.mode}`;
    url += `&channel=${channel}`;
    if (ov.supportsTheme && selectedTheme) url += `&theme=${selectedTheme}`;
    return url;
  }

  const applyOverlayToObs = useCallback(async (ov: OverlayEntry) => {
    setObsApplyingId(ov.id);
    try {
      const url = getOverlayUrl(ov);
      const name = getSceneNameFromOverlay(ov);
      const w = ov.orientation === 'vertical' ? 1080 : 1920;
      const h = ov.orientation === 'vertical' ? 1920 : 1080;
      const r = await apiPost('/obs/apply-scene', { name, url, width: w, height: h });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        toast.error(data.error || 'Failed to apply overlay to OBS');
      } else {
        toast.success(`✓ ${cleanLabel(t(ov.labelKey))} → ${name}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apply error';
      toast.error(message);
    } finally {
      setObsApplyingId(null);
    }
  }, [channel, overlayBaseUrl, selectedTheme, fnEpicUsername, fnStatsMode, fnLayout, endScreenSocials, toast, t]);

  const saveFnConfig = async () => {
    const body: { epicUsername: string; statsMode: string; layout: string; apiKey?: string } = { epicUsername: fnEpicUsername, statsMode: fnStatsMode, layout: fnLayout };
    if (fnApiKey) body.apiKey = fnApiKey;
    await apiPut('/fortnite/config', body);
    setFnSaved(true);
    if (fnApiKey) { setFnHasKey(true); setFnApiKey(''); setFnEditingKey(false); }
    toast.success(t('obs.guardadoConfig'));
    setTimeout(() => setFnSaved(false), 3000);
  };

  function getFilteredOverlays(): OverlayEntry[] {
    const items = OVERLAY_REGISTRY.filter((item) => matchThemeItem(item, selectedTheme));

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
      if ((item.mode === 'fortnite' || item.mode === 'fortnite-hud-api') && fnEpicUsername) url += `&epic=${encodeURIComponent(fnEpicUsername)}&mode=${fnStatsMode}&layout=${fnLayout}`;
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
    const isEndScreen = item.mode.endsWith('-end');

    return (
      <div key={item.id} className={styles.sceneCardWrap}>
        <div
          className={`glass-card ${styles.overlayCard}`}
          style={{ '--card-accent': item.color } as CSSProperties}
        >
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}>
              <SceneRoleIcon item={item} />
            </div>

            <div className={styles.cardContent}>
              <div className={styles.cardTitleRow}>
                <div className={styles.cardTitleGroup}>
                  <span className={styles.cardTitle}>{cleanLabel(t(item.labelKey))}</span>
                  {item.supportsTheme && selectedTheme && (
                    <span className="sf-badge sf-badge-violet text-xs">
                      {cleanLabel(t(THEMES.find((th) => th.id === selectedTheme)?.labelKey ?? ''))}
                    </span>
                  )}
                  {item.isNew && <span className="sf-badge sf-badge-new text-xs">{t('obs.new')}</span>}
                </div>
                <span className={styles.aspectBadge}>
                  {item.orientation === 'vertical' ? '9:16' : '16:9'}
                </span>
              </div>

              <p className={styles.cardDesc}>{t(item.descKey)}</p>

              {item.id === 'custom' && (
                <input
                  id="custom-game-input"
                  type="text"
                  value={customGame}
                  onChange={(e) => setCustomGame(e.target.value)}
                  placeholder={t('obs.customGamePlaceholder')}
                  className={`sf-input ${styles.customInput}`}
                />
              )}
            </div>
          </div>

          <div className={styles.cardFooter}>
            <code
              className={styles.codeBlock}
              onClick={() => copyToClipboard(item.id, url)}
              title={url}
            >
              {url}
            </code>

            <div className={styles.cardActions}>
              <button
                id={`copy-${item.id}`}
                onClick={() => copyToClipboard(item.id, url)}
                className={`sf-btn ${isCopied ? 'sf-btn-ghost' : 'sf-btn-primary'} ${styles.copyBtn}`}
              >
                {isCopied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    {cleanLabel(t('obs.copiado'))}
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                    {t('obs.copiar')}
                  </>
                )}
              </button>

              <button
                id={`preview-${item.id}`}
                onClick={() => setPreviewOverlay({ url, orientation: item.orientation })}
                className={`sf-btn sf-btn-ghost ${styles.previewBtn}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                {t('obs.vistaPrevia')}
              </button>

              {obsConnected && !isSocial && item.filename && (
                <button
                  id={`obs-apply-${item.id}`}
                  onClick={() => applyOverlayToObs(item)}
                  disabled={obsApplyingId === item.id}
                  className={`sf-btn sf-btn-ghost ${styles.obsApplyBtn}`}
                  style={{ opacity: obsApplyingId === item.id ? 0.6 : 1, cursor: obsApplyingId === item.id ? 'wait' : 'pointer' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                  {obsApplyingId === item.id ? '...' : cleanLabel(t('obs.obsApplyBtn'))}
                </button>
              )}

              {isSocial && (
                <button
                  id="social-configure-btn"
                  onClick={() => setSocialExpanded((v) => !v)}
                  className={socialExpanded ? styles.configureBtnSocial : styles.configureBtnInactive}
                >
                  {socialExpanded ? '▲' : '▼'} {t('obs.configurar')}
                </button>
              )}

              {isEndScreen && (
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
        </div>

        {isEndScreen && (
          <AnimatePresence>
            {endSocialExpanded === item.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={styles.expandSection}
              >
                <div className={styles.expandContentEnd}>
                  <p className={styles.sectionTitleEnd}>{t('obs.endSocialsTitle')}</p>
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
                            border: '2px solid var(--sf-border)',
                          }}
                        >
                          {social.visible ? '✓' : ''}
                        </button>

                        <div
                          className={styles.endSocialIconBox}
                          style={{
                            background: `${social.color}22`,
                            border: `1px solid ${social.color}44`,
                            color: social.color,
                          }}
                        >
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
                          placeholder="@usuario"
                          className={`sf-input ${styles.endSocialInput}`}
                          style={{ opacity: social.visible ? 1 : 0.4 }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className={styles.socialHelp}>{t('obs.endSocialsHelp')}</p>
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
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={styles.expandSection}
              >
                <div className={styles.expandContentSocial}>
                  <p className={styles.sectionTitleSocial}>{cleanLabel(t('obs.socialUrls'))}</p>

                  <div className="flex-col flex-col--gap-sm">
                    {socialLinks.map((link) => (
                      <div key={link.platform} className={styles.socialRow}>
                        <div
                          className={styles.socialIconBox}
                          style={{
                            background: `${link.color}22`,
                            border: `1px solid ${link.color}44`,
                            color: link.color,
                          }}
                        >
                          {link.icon}
                        </div>

                        <span className={styles.socialLabel}>{t(link.labelKey)}</span>

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
                    {cleanLabel(t('obs.socialHelp'))}<span style={{ color: 'var(--sf-success)' }}>●</span>) se incluirán en la URL del overlay.
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
  const filteredTotal = [...categoryMap.values()].reduce((acc, arr) => acc + arr.length, 0);
  const hasHorizontal = [...categoryMap.values()].some((items) => items.some((i) => i.orientation === 'horizontal'));
  const hasVertical = [...categoryMap.values()].some((items) => items.some((i) => i.orientation === 'vertical'));

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <h2 className={styles.heading}>{cleanLabel(t('obs.obsTitle'))}</h2>
            {obsConnected && (
              <span className={styles.obsLivePill}>
                <span className={styles.obsLiveDot} />
                {t('obs.obsWsConnected')}
              </span>
            )}
          </div>
          <p className={styles.subtitle}>
            {t('obs.obsInstructions')}{' '}
            <strong className={styles.subtitleStrong}>{t('obs.browserSource')}</strong>.
          </p>
        </div>

        <div className={styles.headerBadges}>
          <span className={styles.resBadgeHorizontal}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /></svg>
            1920×1080
          </span>
          <span className={styles.resBadgeVertical}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="2" width="12" height="20" rx="2" /></svg>
            1080×1920
          </span>
        </div>
      </div>

      {/* ── HERO CENTERPIECE: obs.temaVisual — Visual Universe Deck ── */}
      <section className={`glass-card ${styles.themeSection}`} aria-label={cleanLabel(t('obs.temaVisual'))}>
        <div className={styles.themeSectionHeader}>
          <div className={styles.themeSectionTitleGroup}>
            <h3 className={styles.themeSectionTitle}>{cleanLabel(t('obs.temaVisual'))}</h3>
            <span className={styles.themeSectionCount}>
              {OVERLAY_REGISTRY.length} {t('obs.scenesAvailable')}
            </span>
          </div>
        </div>

        <div className={styles.themeGrid}>
          {THEMES.map((theme) => {
            const isActive = selectedTheme === theme.id;
            const label = cleanLabel(t(theme.labelKey));
            return (
              <button
                key={theme.id || 'general'}
                type="button"
                onClick={() => setSelectedTheme(theme.id)}
                className={isActive ? styles.themeCardActive : styles.themeCard}
                style={{ '--theme-accent': theme.color } as CSSProperties}
                aria-pressed={isActive}
              >
                <div className={styles.themeCardTop}>
                  <div className={styles.themeIconWrap}>
                    <ThemeArtwork themeId={theme.id} />
                  </div>
                  <span className={styles.themeCountBadge}>
                    {themeCounts[theme.id] ?? 0}
                  </span>
                </div>

                <div className={styles.themeCardBody}>
                  <span className={styles.themeCardName}>{label}</span>
                  <span className={styles.themeCardTag}>{theme.tag}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Control Bar: Format Segmented Switch & Instant Search ── */}
      <div className={`glass-card ${styles.controlBar}`}>
        <div className={styles.controlLeft}>
          <span className={styles.orientationLabel}>{t('obs.orientacion')}</span>
          <div className={styles.segmentedGroup} role="group" aria-label={t('obs.orientacion')}>
            {([
              { id: 'all', labelKey: 'obs.orientationAll', res: '' },
              { id: 'horizontal', labelKey: 'obs.orientationHorizontal', res: '16:9' },
              { id: 'vertical', labelKey: 'obs.orientationVertical', res: '9:16' },
            ] as { id: 'all' | 'horizontal' | 'vertical'; labelKey: string; res: string }[]).map((o) => {
              const active = orientation === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOrientation(o.id)}
                  className={active ? styles.segmentBtnActive : styles.segmentBtn}
                >
                  {o.id === 'horizontal' && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /></svg>
                  )}
                  {o.id === 'vertical' && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="2" width="12" height="20" rx="2" /></svg>
                  )}
                  <span>{t(o.labelKey)}</span>
                  {o.res && <span className={styles.segmentRes}>{o.res}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('obs.searchPlaceholder')}
            className={`sf-input ${styles.searchInput}`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={styles.searchClearBtn}
              title={t('obs.clearSearch')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Contextual Fortnite Config (Surfaced at top when Fortnite is active) ── */}
      {selectedTheme === 'fortnite' && (
        <div className={`glass-card ${styles.fnPanel}`}>
          <div className={styles.fnPanelHeader}>
            <h4 className={styles.fnPanelTitle}>
              <span style={{ color: '#00d4ff', display: 'inline-flex' }}>
                <ThemeArtwork themeId="fortnite" />
              </span>
              {cleanLabel(t('obs.fortniteTitle'))}
            </h4>
            <a
              href="https://dash.fortnite-api.com"
              target="_blank"
              rel="noreferrer"
              className="sf-btn sf-btn-ghost"
              style={{ fontSize: '0.74rem', padding: '0.32rem 0.7rem', textDecoration: 'none' }}
            >
              {cleanLabel(t('obs.obtenerKey'))} ↗
            </a>
          </div>

          <div className={styles.fnGrid}>
            <div>
              <label className={styles.fnConfigLabel}>
                {t('obs.apiKeyLabel')}
                <span className={fnHasKey ? styles.fnBadgeReady : styles.fnBadgeMissing}>
                  {fnHasKey ? cleanLabel(t('obs.configurada')) : cleanLabel(t('obs.sinKey'))}
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
                  type="button"
                  onClick={() => setShowFnApiKey(!showFnApiKey)}
                  className="sf-btn sf-btn-ghost"
                  style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem' }}
                  title={showFnApiKey ? t('obs.ocultarKey') : t('obs.mostrarKey')}
                >
                  {showFnApiKey ? t('obs.ocultarKey') : t('obs.mostrarKey')}
                </button>
              </div>
            </div>

            <div>
              <label className={styles.fnConfigBlockLabel}>{t('obs.usuarioEpic')}</label>
              <input
                type="text"
                value={fnEpicUsername}
                onChange={(e) => setFnEpicUsername(e.target.value)}
                placeholder={t('obs.epicPlaceholder')}
                className="sf-input w-full text-xs"
              />
            </div>

            <div>
              <label className={styles.fnConfigBlockLabel}>{t('obs.modoEstadisticas')}</label>
              <div className="flex-wrap" style={{ gap: '0.3rem' }}>
                {['overall', 'solo', 'duo', 'trio', 'squad'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFnStatsMode(m)}
                    className={`sf-pill-selector__pill ${fnStatsMode === m ? 'sf-pill-selector__pill--active' : ''}`}
                    style={{ textTransform: ' capitalize', fontSize: '0.74rem' }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={styles.fnConfigBlockLabel}>{t('obs.disenoOverlay')}</label>
              <div className="flex-wrap" style={{ gap: '0.3rem' }}>
                {[
                  { value: 'stats', labelKey: 'obs.layoutSoloStats' },
                  { value: 'chat-left', labelKey: 'obs.layoutChatIzquierda' },
                  { value: 'chat-right', labelKey: 'obs.layoutChatDerecha' },
                ].map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setFnLayout(o.value)}
                    className={`sf-pill-selector__pill ${fnLayout === o.value ? 'sf-pill-selector__pill--active' : ''}`}
                    style={{ fontSize: '0.74rem' }}
                  >
                    {cleanLabel(t(o.labelKey))}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.fnFooter}>
            <div className="flex-row flex-row--gap-md">
              <button type="button" onClick={saveFnConfig} className={`sf-btn sf-btn-primary ${styles.fnSaveBtn}`}>
                {t('obs.guardarConfig')}
              </button>
              {fnSaved && <span className={styles.fnSavedText}>✓ {cleanLabel(t('obs.guardadoConfig'))}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Category & Scene Sections ── */}
      {filteredTotal === 0 ? (
        <div className={`glass-card ${styles.emptySearch}`}>
          <p className={styles.emptySearchTitle}>{t('obs.emptySearchTitle')}</p>
          <p className={styles.emptySearchDesc}>{t('obs.emptySearchDesc')}</p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="sf-btn sf-btn-ghost text-xs"
            >
              {t('obs.clearSearch')}
            </button>
          )}
        </div>
      ) : (
        <div className="flex-col flex-col--gap-lg">
          {CATEGORIES.map((cat) => {
            const catItems = categoryMap.get(cat.id);
            if (!catItems || catItems.length === 0) return null;

            const hItems = catItems.filter((i) => i.orientation === 'horizontal');
            const vItems = catItems.filter((i) => i.orientation === 'vertical');

            return (
              <div key={cat.id} className={styles.categoryBlock}>
                <div className={`glass-card ${styles.categoryHeader}`} style={{ borderLeftColor: cat.color }}>
                  <div className={styles.categoryTitleGroup}>
                    <span className={styles.categoryDot} style={{ background: cat.color, boxShadow: `0 0 8px ${cat.color}` }} />
                    <span className={styles.categoryLabel}>{cleanLabel(t(cat.labelKey))}</span>
                  </div>
                  <span className={styles.categoryCount}>{catItems.length}</span>
                </div>

                {hItems.length > 0 && hasHorizontal && (
                  <div className={styles.formatSection}>
                    {hasVertical && (
                      <div className={styles.sectionDividerHorizontal}>
                        <div className={styles.sectionDividerLeft}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /></svg>
                          <span className={styles.sectionDividerLabel}>{t('obs.orientationHorizontal')}</span>
                        </div>
                        <code className={styles.sectionDividerCodeHorizontal}>1920×1080</code>
                      </div>
                    )}
                    <div className={styles.sceneGrid}>
                      {hItems.map((item) => renderOverlayCard(item))}
                    </div>
                  </div>
                )}

                {vItems.length > 0 && hasVertical && (
                  <div className={styles.formatSection}>
                    <div className={styles.sectionDividerVertical}>
                      <div className={styles.sectionDividerLeft}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="2" width="12" height="20" rx="2" /></svg>
                        <span className={styles.sectionDividerLabel}>{t('obs.orientationVertical')}</span>
                      </div>
                      <code className={styles.sectionDividerCodeVertical}>1080×1920</code>
                    </div>
                    <div className={styles.sceneGrid}>
                      {vItems.map((item) => renderOverlayCard(item))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Help Note ── */}
      <div className={styles.helpNote}>
        <strong style={{ color: 'var(--sf-live)' }}>{cleanLabel(t('obs.tip'))}</strong> {t('obs.obsTip')}
      </div>

      {previewOverlay && (
        <OverlayPreviewModal
          open={true}
          url={previewOverlay.url}
          orientation={previewOverlay.orientation}
          onClose={() => setPreviewOverlay(null)}
        />
      )}
    </div>
  );
}
