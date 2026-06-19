import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPut } from '../utils/api';
import { useTranslation } from '../i18n/context';

interface Props {
  channel: string;
  backendUrl?: string;
}

interface OBSUrl {
  id: string;
  icon: string;
  labelKey: string;
  descKey: string;
  mode: string;
  supportsTheme: boolean;
  color: string;
}

const OBS_URLS: OBSUrl[] = [
  {
    id: 'start',
    icon: '🚀',
    labelKey: 'obs.start',
    descKey: 'obs.startDesc',
    mode: 'start',
    supportsTheme: false,
    color: '#7c3aed',
  },
  {
    id: 'chat',
    icon: '💬',
    labelKey: 'obs.chatOverlay',
    descKey: 'obs.chatOverlayDesc',
    mode: 'chat',
    supportsTheme: true,
    color: '#7c3aed',
  },
  {
    id: 'custom',
    icon: '🎨',
    labelKey: 'obs.customOverlay',
    descKey: 'obs.customOverlayDesc',
    mode: 'custom',
    supportsTheme: false,
    color: '#a855f7',
  },
  {
    id: 'giveaway',
    icon: '🎁',
    labelKey: 'obs.giveaways',
    descKey: 'obs.giveawaysDesc',
    mode: 'giveaway',
    supportsTheme: true,
    color: '#10b981',
  },
  {
    id: 'prediction',
    icon: '📊',
    labelKey: 'obs.predictions',
    descKey: 'obs.predictionsDesc',
    mode: 'prediction',
    supportsTheme: true,
    color: '#f59e0b',
  },
  {
    id: 'social',
    icon: '🌐',
    labelKey: 'obs.social',
    descKey: 'obs.socialDesc',
    mode: 'social',
    supportsTheme: false,
    color: '#06b6d4',
  },
  {
    id: 'hud',
    icon: '📊',
    labelKey: 'obs.hud',
    descKey: 'obs.hudDesc',
    mode: 'hud',
    supportsTheme: false,
    color: '#a855f7',
  },
  {
    id: 'timer',
    icon: '⏱️',
    labelKey: 'obs.timer',
    descKey: 'obs.timerDesc',
    mode: 'timer',
    supportsTheme: false,
    color: '#f59e0b',
  },
  {
    id: 'scoreboard',
    icon: '🏆',
    labelKey: 'obs.scoreboard',
    descKey: 'obs.scoreboardDesc',
    mode: 'scoreboard',
    supportsTheme: false,
    color: '#10b981',
  },
  {
    id: 'subathon',
    icon: '🔴',
    labelKey: 'obs.subathon',
    descKey: 'obs.subathonDesc',
    mode: 'subathon',
    supportsTheme: false,
    color: '#ef4444',
  },
  {
    id: 'subnautica2_standalone',
    icon: '🌊',
    labelKey: 'obs.subnautica',
    descKey: 'obs.subnauticaDesc',
    mode: 'subnautica2_standalone',
    supportsTheme: false,
    color: '#00d4ff',
  },
  {
    id: 'fortnite',
    icon: '🔫',
    labelKey: 'obs.fortnite',
    descKey: 'obs.fortniteDesc',
    mode: 'fortnite',
    supportsTheme: false,
    color: '#00D4FF',
  },
  {
    id: 'fortnite-alerts',
    icon: '🔔',
    labelKey: 'obs.fortniteAlerts',
    descKey: 'obs.fortniteAlertsDesc',
    mode: 'fortnite-alerts',
    supportsTheme: false,
    color: '#00D4FF',
  },
  {
    id: 'alerts',
    icon: '🔔',
    labelKey: 'obs.alertas',
    descKey: 'obs.alertasDesc',
    mode: 'alerts',
    supportsTheme: false,
    color: '#c84bff',
  },
  // ── DJ Section ──
  {
    id: 'dj-webcam',
    icon: '🎥',
    labelKey: 'obs.djWebcam',
    descKey: 'obs.djWebcamDesc',
    mode: 'dj-webcam',
    supportsTheme: false,
    color: '#00f0ff',
  },
  {
    id: 'dj-webcam-labels',
    icon: '🏷️',
    labelKey: 'obs.djWebcamTags',
    descKey: 'obs.djWebcamTagsDesc',
    mode: 'dj-webcam-labels',
    supportsTheme: false,
    color: '#ff00aa',
  },
  {
    id: 'dj-chroma',
    icon: '🟢',
    labelKey: 'obs.djChroma',
    descKey: 'obs.djChromaDesc',
    mode: 'dj-chroma',
    supportsTheme: false,
    color: '#34d399',
  },
  {
    id: 'dj-chroma-labels',
    icon: '🔰',
    labelKey: 'obs.djChromaTags',
    descKey: 'obs.djChromaTagsDesc',
    mode: 'dj-chroma-labels',
    supportsTheme: false,
    color: '#8b5cf6',
  },
  {
    id: 'dj-banner-webcam',
    icon: '📰',
    labelKey: 'obs.djBannerWebcam',
    descKey: 'obs.djBannerWebcamDesc',
    mode: 'dj-banner-webcam',
    supportsTheme: false,
    color: '#fbbf24',
  },
  {
    id: 'dj-banner-chroma',
    icon: '📋',
    labelKey: 'obs.djBannerChroma',
    descKey: 'obs.djBannerChromaDesc',
    mode: 'dj-banner-chroma',
    supportsTheme: false,
    color: '#f472b6',
  },
  {
    id: 'dj-fullscreen',
    icon: '🖥️',
    labelKey: 'obs.djFullscreen',
    descKey: 'obs.djFullscreenDesc',
    mode: 'dj-fullscreen',
    supportsTheme: false,
    color: '#a855f7',
  },
  {
    id: 'dj-alerts',
    icon: '🔔',
    labelKey: 'obs.djAlerts',
    descKey: 'obs.djAlertsDesc',
    mode: 'dj-alerts',
    supportsTheme: false,
    color: '#ff00aa',
  },
  {
    id: 'dj-transition',
    icon: '💿',
    labelKey: 'obs.djTransition',
    descKey: 'obs.djTransitionDesc',
    mode: 'dj-transition',
    supportsTheme: false,
    color: '#00f0ff',
  },
  // ── Retro 8-bits Section ──
  {
    id: '8bits-start',
    icon: '🕹️',
    labelKey: 'obs.b8bitsStart',
    descKey: 'obs.b8bitsStartDesc',
    mode: '8bits-start',
    supportsTheme: false,
    color: '#00ff41',
  },
  {
    id: '8bits-gameplay',
    icon: '📺',
    labelKey: 'obs.b8bitsGameplay',
    descKey: 'obs.b8bitsGameplayDesc',
    mode: '8bits-gameplay',
    supportsTheme: false,
    color: '#ff00ff',
  },
  {
    id: '8bits-just-chatting',
    icon: '💬',
    labelKey: 'obs.b8bitsJustChatting',
    descKey: 'obs.b8bitsJustChattingDesc',
    mode: '8bits-just-chatting',
    supportsTheme: false,
    color: '#ffff00',
  },
  {
    id: '8bits-end',
    icon: '🏁',
    labelKey: 'obs.b8bitsEnd',
    descKey: 'obs.b8bitsEndDesc',
    mode: '8bits-end',
    supportsTheme: false,
    color: '#ff4444',
  },
  {
    id: '8bits-fullscreen',
    icon: '🖥️',
    labelKey: 'obs.b8bitsFullscreen',
    descKey: 'obs.b8bitsFullscreenDesc',
    mode: '8bits-fullscreen',
    supportsTheme: false,
    color: '#00ff41',
  },
  {
    id: '8bits-chat-standalone',
    icon: '💬',
    labelKey: 'obs.b8bitsChatStandalone',
    descKey: 'obs.b8bitsChatStandaloneDesc',
    mode: '8bits-chat-standalone',
    supportsTheme: false,
    color: '#ff00ff',
  },
  {
    id: '8bits-alerts',
    icon: '🔔',
    labelKey: 'obs.b8bitsAlerts',
    descKey: 'obs.b8bitsAlertsDesc',
    mode: '8bits-alerts',
    supportsTheme: false,
    color: '#ffff00',
  },
  // ── Retro Win95 Section ──
  {
    id: 'win95-start',
    icon: '💻',
    labelKey: 'obs.bwin95Start',
    descKey: 'obs.bwin95StartDesc',
    mode: 'win95-start',
    supportsTheme: false,
    color: '#008080',
  },
  {
    id: 'win95-gameplay',
    icon: '🎮',
    labelKey: 'obs.bwin95Gameplay',
    descKey: 'obs.bwin95GameplayDesc',
    mode: 'win95-gameplay',
    supportsTheme: false,
    color: '#c0c0c0',
  },
  {
    id: 'win95-just-chatting',
    icon: '🪟',
    labelKey: 'obs.bwin95JustChatting',
    descKey: 'obs.bwin95JustChattingDesc',
    mode: 'win95-just-chatting',
    supportsTheme: false,
    color: '#000080',
  },
  {
    id: 'win95-end',
    icon: '🏁',
    labelKey: 'obs.bwin95End',
    descKey: 'obs.bwin95EndDesc',
    mode: 'win95-end',
    supportsTheme: false,
    color: '#800000',
  },
  {
    id: 'win95-fullscreen',
    icon: '🖥️',
    labelKey: 'obs.bwin95Fullscreen',
    descKey: 'obs.bwin95FullscreenDesc',
    mode: 'win95-fullscreen',
    supportsTheme: false,
    color: '#008080',
  },
  {
    id: 'win95-chat-standalone',
    icon: '💬',
    labelKey: 'obs.bwin95ChatStandalone',
    descKey: 'obs.bwin95ChatStandaloneDesc',
    mode: 'win95-chat-standalone',
    supportsTheme: false,
    color: '#c0c0c0',
  },
  {
    id: 'win95-alerts',
    icon: '🔔',
    labelKey: 'obs.bwin95Alerts',
    descKey: 'obs.bwin95AlertsDesc',
    mode: 'win95-alerts',
    supportsTheme: false,
    color: '#000080',
  },
  // ── RetroWave Section ──
  {
    id: 'retrowave-start',
    icon: '🌅',
    labelKey: 'obs.retrowaveStart',
    descKey: 'obs.retrowaveStartDesc',
    mode: 'retrowave-start',
    supportsTheme: false,
    color: '#ff00ff',
  },
  {
    id: 'retrowave-gameplay',
    icon: '🎮',
    labelKey: 'obs.retrowaveGameplay',
    descKey: 'obs.retrowaveGameplayDesc',
    mode: 'retrowave-gameplay',
    supportsTheme: false,
    color: '#00ffff',
  },
  {
    id: 'retrowave-just-chatting',
    icon: '💬',
    labelKey: 'obs.retrowaveJustChatting',
    descKey: 'obs.retrowaveJustChattingDesc',
    mode: 'retrowave-just-chatting',
    supportsTheme: false,
    color: '#ff00ff',
  },
  {
    id: 'retrowave-end',
    icon: '🏁',
    labelKey: 'obs.retrowaveEnd',
    descKey: 'obs.retrowaveEndDesc',
    mode: 'retrowave-end',
    supportsTheme: false,
    color: '#ffea00',
  },
  {
    id: 'retrowave-fullscreen',
    icon: '🖥️',
    labelKey: 'obs.retrowaveFullscreen',
    descKey: 'obs.retrowaveFullscreenDesc',
    mode: 'retrowave-fullscreen',
    supportsTheme: false,
    color: '#ff00ff',
  },
  {
    id: 'retrowave-chat-standalone',
    icon: '💬',
    labelKey: 'obs.retrowaveChatStandalone',
    descKey: 'obs.retrowaveChatStandaloneDesc',
    mode: 'retrowave-chat-standalone',
    supportsTheme: false,
    color: '#00ffff',
  },
  {
    id: 'retrowave-alerts',
    icon: '🔔',
    labelKey: 'obs.retrowaveAlerts',
    descKey: 'obs.retrowaveAlertsDesc',
    mode: 'retrowave-alerts',
    supportsTheme: false,
    color: '#ff00ff',
  },
  // ── Tactical Sci-Fi Section ──
  {
    id: 'tactical-start',
    icon: '🛸',
    labelKey: 'obs.tacticalStart',
    descKey: 'obs.tacticalStartDesc',
    mode: 'tactical-start',
    supportsTheme: false,
    color: '#ffb300',
  },
  {
    id: 'tactical-gameplay',
    icon: '🎯',
    labelKey: 'obs.tacticalGameplay',
    descKey: 'obs.tacticalGameplayDesc',
    mode: 'tactical-gameplay',
    supportsTheme: false,
    color: '#4caf50',
  },
  {
    id: 'tactical-just-chatting',
    icon: '📡',
    labelKey: 'obs.tacticalJustChatting',
    descKey: 'obs.tacticalJustChattingDesc',
    mode: 'tactical-just-chatting',
    supportsTheme: false,
    color: '#ffb300',
  },
  {
    id: 'tactical-end',
    icon: '🏁',
    labelKey: 'obs.tacticalEnd',
    descKey: 'obs.tacticalEndDesc',
    mode: 'tactical-end',
    supportsTheme: false,
    color: '#f44336',
  },
  {
    id: 'tactical-fullscreen',
    icon: '🖥️',
    labelKey: 'obs.tacticalFullscreen',
    descKey: 'obs.tacticalFullscreenDesc',
    mode: 'tactical-fullscreen',
    supportsTheme: false,
    color: '#4caf50',
  },
  {
    id: 'tactical-chat-standalone',
    icon: '💬',
    labelKey: 'obs.tacticalChatStandalone',
    descKey: 'obs.tacticalChatStandaloneDesc',
    mode: 'tactical-chat-standalone',
    supportsTheme: false,
    color: '#ffb300',
  },
  {
    id: 'tactical-alerts',
    icon: '🔔',
    labelKey: 'obs.tacticalAlerts',
    descKey: 'obs.tacticalAlertsDesc',
    mode: 'tactical-alerts',
    supportsTheme: false,
    color: '#4caf50',
  },
  // ── WoW Alianza Section ──
  {
    id: 'wow-alliance-start',
    icon: '🔵',
    labelKey: 'obs.allianceStart',
    descKey: 'obs.allianceStartDesc',
    mode: 'wow-alliance-start',
    supportsTheme: false,
    color: '#4a8cff',
  },
  {
    id: 'wow-alliance-webcam',
    icon: '🎥',
    labelKey: 'obs.allianceWebcam',
    descKey: 'obs.allianceWebcamDesc',
    mode: 'wow-alliance-webcam',
    supportsTheme: false,
    color: '#2b5fc8',
  },
  {
    id: 'wow-alliance-webcam-labels',
    icon: '🏷️',
    labelKey: 'obs.allianceWebcamTags',
    descKey: 'obs.allianceWebcamTagsDesc',
    mode: 'wow-alliance-webcam-labels',
    supportsTheme: false,
    color: '#ffc800',
  },
  {
    id: 'wow-alliance-chat',
    icon: '💬',
    labelKey: 'obs.allianceChat',
    descKey: 'obs.allianceChatDesc',
    mode: 'wow-alliance-chat',
    supportsTheme: false,
    color: '#8ab4ff',
  },
  {
    id: 'wow-alliance-chat-labels',
    icon: '🔰',
    labelKey: 'obs.allianceTags',
    descKey: 'obs.allianceTagsDesc',
    mode: 'wow-alliance-chat-labels',
    supportsTheme: false,
    color: '#6b4ce6',
  },
  {
    id: 'wow-alliance-banner-webcam',
    icon: '📰',
    labelKey: 'obs.allianceBannerWebcam',
    descKey: 'obs.allianceBannerWebcamDesc',
    mode: 'wow-alliance-banner-webcam',
    supportsTheme: false,
    color: '#ffc800',
  },
  {
    id: 'wow-alliance-banner-transparent',
    icon: '📋',
    labelKey: 'obs.allianceBannerTransparente',
    descKey: 'obs.allianceBannerTransparenteDesc',
    mode: 'wow-alliance-banner-transparent',
    supportsTheme: false,
    color: '#2b5fc8',
  },
  {
    id: 'wow-alliance-fullscreen',
    icon: '🖥️',
    labelKey: 'obs.allianceFullscreen',
    descKey: 'obs.allianceFullscreenDesc',
    mode: 'wow-alliance-fullscreen',
    supportsTheme: false,
    color: '#a855f7',
  },
  {
    id: 'wow-alliance-alerts',
    icon: '🔔',
    labelKey: 'obs.allianceAlerts',
    descKey: 'obs.allianceAlertsDesc',
    mode: 'wow-alliance-alerts',
    supportsTheme: false,
    color: '#ffc800',
  },
  {
    id: 'wow-alliance-transition',
    icon: '👑',
    labelKey: 'obs.allianceTransition',
    descKey: 'obs.allianceTransitionDesc',
    mode: 'wow-alliance-transition',
    supportsTheme: false,
    color: '#2b5fc8',
  },
  // ── WoW Horda Section ──
  {
    id: 'wow-horde-start',
    icon: '🔴',
    labelKey: 'obs.hordaStart',
    descKey: 'obs.hordaStartDesc',
    mode: 'wow-horde-start',
    supportsTheme: false,
    color: '#ff2222',
  },
  {
    id: 'wow-horde-gameplay',
    icon: '⚔️',
    labelKey: 'obs.hordaGameplay',
    descKey: 'obs.hordaGameplayDesc',
    mode: 'wow-horde-gameplay',
    supportsTheme: false,
    color: '#cc0000',
  },
  {
    id: 'wow-horde-just-chatting',
    icon: '💬',
    labelKey: 'obs.hordaJustChatting',
    descKey: 'obs.hordaJustChattingDesc',
    mode: 'wow-horde-just-chatting',
    supportsTheme: false,
    color: '#8b0000',
  },
  {
    id: 'wow-horde-end',
    icon: '🏁',
    labelKey: 'obs.hordaEnd',
    descKey: 'obs.hordaEndDesc',
    mode: 'wow-horde-end',
    supportsTheme: false,
    color: '#ffc800',
  },
  {
    id: 'wow-horde-fullscreen',
    icon: '🖥️',
    labelKey: 'obs.hordaFullscreen',
    descKey: 'obs.hordaFullscreenDesc',
    mode: 'wow-horde-fullscreen',
    supportsTheme: false,
    color: '#cc0000',
  },
  {
    id: 'wow-horde-chat-standalone',
    icon: '💬',
    labelKey: 'obs.hordaChatStandalone',
    descKey: 'obs.hordaChatStandaloneDesc',
    mode: 'wow-horde-chat-standalone',
    supportsTheme: false,
    color: '#8b0000',
  },
  {
    id: 'wow-horde-alerts-fullscreen',
    icon: '🔔',
    labelKey: 'obs.hordaAlertsFullscreen',
    descKey: 'obs.hordaAlertsFullscreenDesc',
    mode: 'wow-horde-alerts-fullscreen',
    supportsTheme: false,
    color: '#ff2222',
  },
  // ── Vertical Overlays (1080×1920) ──
  {
    id: 'fortnite-vertical',
    icon: '📱',
    labelKey: 'obs.fortniteVertical',
    descKey: 'obs.fortniteVerticalDesc',
    mode: 'fortnite-vertical',
    supportsTheme: false,
    color: '#00D4FF',
  },
  {
    id: 'fortnite-alerts-vertical',
    icon: '🔔',
    labelKey: 'obs.fortniteAlertsV',
    descKey: 'obs.fortniteAlertsVDesc',
    mode: 'fortnite-alerts-vertical',
    supportsTheme: false,
    color: '#00D4FF',
  },
  {
    id: '8bits-vertical',
    icon: '📱',
    labelKey: 'obs.b8bitsVertical',
    descKey: 'obs.b8bitsVerticalDesc',
    mode: '8bits-vertical',
    supportsTheme: false,
    color: '#00ff41',
  },
  {
    id: '8bits-alerts-vertical',
    icon: '🔔',
    labelKey: 'obs.b8bitsAlertsV',
    descKey: 'obs.b8bitsAlertsVDesc',
    mode: '8bits-alerts-vertical',
    supportsTheme: false,
    color: '#ff00ff',
  },
  {
    id: 'win95-vertical',
    icon: '📱',
    labelKey: 'obs.win95Vertical',
    descKey: 'obs.win95VerticalDesc',
    mode: 'win95-vertical',
    supportsTheme: false,
    color: '#008080',
  },
  {
    id: 'win95-alerts-vertical',
    icon: '🔔',
    labelKey: 'obs.win95AlertsV',
    descKey: 'obs.win95AlertsVDesc',
    mode: 'win95-alerts-vertical',
    supportsTheme: false,
    color: '#000080',
  },
  {
    id: 'retrowave-vertical',
    icon: '📱',
    labelKey: 'obs.retrowaveVertical',
    descKey: 'obs.retrowaveVerticalDesc',
    mode: 'retrowave-vertical',
    supportsTheme: false,
    color: '#ff00ff',
  },
  {
    id: 'retrowave-alerts-vertical',
    icon: '🔔',
    labelKey: 'obs.retrowaveAlertsV',
    descKey: 'obs.retrowaveAlertsVDesc',
    mode: 'retrowave-alerts-vertical',
    supportsTheme: false,
    color: '#ff00ff',
  },
  {
    id: 'tactical-vertical',
    icon: '📱',
    labelKey: 'obs.tacticalVertical',
    descKey: 'obs.tacticalVerticalDesc',
    mode: 'tactical-vertical',
    supportsTheme: false,
    color: '#ffb300',
  },
  {
    id: 'tactical-alerts-vertical',
    icon: '🔔',
    labelKey: 'obs.tacticalAlertsV',
    descKey: 'obs.tacticalAlertsVDesc',
    mode: 'tactical-alerts-vertical',
    supportsTheme: false,
    color: '#4caf50',
  },
  {
    id: 'wow-horde-vertical',
    icon: '📱',
    labelKey: 'obs.hordeVertical',
    descKey: 'obs.hordeVerticalDesc',
    mode: 'wow-horde-vertical',
    supportsTheme: false,
    color: '#cc0000',
  },
  {
    id: 'wow-horde-alerts-vertical',
    icon: '🔔',
    labelKey: 'obs.hordeAlertsV',
    descKey: 'obs.hordeAlertsVDesc',
    mode: 'wow-horde-alerts-vertical',
    supportsTheme: false,
    color: '#ff2222',
  },
];

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

export function ObsPanel({ channel, backendUrl }: Props) {
  const { t } = useTranslation();

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

  const [selectedTheme, setSelectedTheme] = useState('');
  const [orientation, setOrientation] = useState<'all' | 'horizontal' | 'vertical'>('all');
  const [copied, setCopied] = useState<string | null>(null);
  const [socialExpanded, setSocialExpanded] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(DEFAULT_SOCIAL_LINKS);
  const [endScreenSocials, setEndScreenSocials] = useState<EndScreenSocial[]>(END_SCREEN_SOCIALS_INIT);
  const [endSocialExpanded, setEndSocialExpanded] = useState<string | null>(null);
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
    start: 'start.html',
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
    '8bits-start': '8bits-pantalla_comienzo.html',
    '8bits-gameplay': '8bits-overlay_gameplay_tv.html',
    '8bits-just-chatting': '8bits-overlay_just_chatting.html',
    '8bits-end': '8bits-pantalla_despedida.html',
    '8bits-fullscreen': 'overlay_pantalla_completa_retro_8_bits_nochat_.html',
    '8bits-chat-standalone': 'chat_independiente_retro_8_bits.html',
    '8bits-alerts': 'alerta_retro_8_bits.html',
    'win95-start': 'pantalla_comienzo_win95.html',
    'win95-gameplay': 'overlay_gameplay_win95.html',
    'win95-just-chatting': 'overlay_just_chatting_win95.html',
    'win95-end': 'pantalla_despedida_win95.html',
    'win95-fullscreen': 'overlay_pantalla_completa_retro_95_nochat_.html',
    'win95-chat-standalone': 'chat_independiente_retro_95.html',
    'win95-alerts': 'alerta_windows_95.html',
    'retrowave-start': 'pantalla_comienzo_retrowave.html',
    'retrowave-gameplay': 'overlay_gameplay_retrowave.html',
    'retrowave-just-chatting': 'overlay_just_chatting_retrowave.html',
    'retrowave-end': 'pantalla_despedida_retrowave.html',
    'retrowave-fullscreen': 'overlay_pantalla_completa_retrowave_nochat_.html',
    'retrowave-chat-standalone': 'chat_independiente_retrowave.html',
    'retrowave-alerts': 'alerta_retrowave.html',
    'tactical-start': 'pantalla_de_inicio_t_ctica.html',
    'tactical-gameplay': 'hud_gameplay_monitor.html',
    'tactical-just-chatting': 'hud_just_chatting.html',
    'tactical-end': 'pantalla_despedida_t_ctica.html',
    'tactical-fullscreen': 'overlay_pantalla_completa_sci_fi_nochat_.html',
    'tactical-chat-standalone': 'chat_independiente_sci_fi.html',
    'tactical-alerts': 'alerta_sci_fi_t_ctica_bsg.html',
    'wow-alliance-start': 'wow-alliance-start.html',
    'wow-alliance-webcam': 'wow-alliance-webcam.html',
    'wow-alliance-webcam-labels': 'wow-alliance-webcam-labels.html',
    'wow-alliance-chat': 'wow-alliance-chat.html',
    'wow-alliance-chat-labels': 'wow-alliance-chat-labels.html',
    'wow-alliance-banner-webcam': 'wow-alliance-banner-webcam.html',
    'wow-alliance-banner-transparent': 'wow-alliance-banner-transparent.html',
    'wow-alliance-fullscreen': 'wow-alliance-fullscreen.html',
    'wow-alliance-alerts': 'wow-alliance-alerts.html',
    'wow-alliance-transition': 'wow-alliance-transition.html',
    'wow-horde-start': 'wow-horde-start.html',
    'wow-horde-gameplay': 'overlay_gameplay_horda.html',
    'wow-horde-just-chatting': 'overlay_just_chatting_horda.html',
    'wow-horde-end': 'pantalla_despedida_horda.html',
    'wow-horde-fullscreen': 'overlay_pantalla_completa_nochat_horda.html',
    'fortnite-alerts': 'alerta_fortnite.html',
    'wow-horde-chat-standalone': 'chat_independiente_horda.html',
    'wow-horde-alerts-fullscreen': 'alerta_horda.html',
    'fortnite-vertical': 'fortnite-vertical.html',
    '8bits-vertical': '8bits-vertical.html',
    'win95-vertical': 'win95-vertical.html',
    'retrowave-vertical': 'retrowave-vertical.html',
    'tactical-vertical': 'tactical-vertical.html',
    'wow-horde-vertical': 'horde-vertical.html',
    'fortnite-alerts-vertical': 'alerta_fortnite_vertical.html',
    '8bits-alerts-vertical': 'alerta_retro_8_bits_vertical.html',
    'win95-alerts-vertical': 'alerta_windows_95_vertical.html',
    'retrowave-alerts-vertical': 'alerta_retrowave_vertical.html',
    'tactical-alerts-vertical': 'alerta_sci_fi_t_ctica_bsg_vertical.html',
    'wow-horde-alerts-vertical': 'alerta_horda_vertical.html',
  };

  function buildUrl(mode: string, supportsTheme: boolean): string {
    const standalone = STANDALONE_OVERLAYS[mode];
    if (standalone) {
      let url = `${overlayBaseUrl}/overlays/${standalone}`;
      if (channel) url += `?channel=${channel}`;
      if (mode === 'fortnite' && fnEpicUsername) url += `&epic=${encodeURIComponent(fnEpicUsername)}&mode=${fnStatsMode}&layout=${fnLayout}`;
      const be = backendUrl || 'http://localhost:3000';
      if (be !== location.origin) url += `${channel ? '&' : '?'}backend=${encodeURIComponent(be)}`;
      // End screen social links
      if (mode.endsWith('-end')) {
        const active = endScreenSocials.filter((s) => s.visible && s.username.trim());
        if (active.length > 0) {
          url += `&socials=${encodeURIComponent(JSON.stringify(active.map((s) => ({ p: s.platform, u: s.username }))))}`;
        }
      }
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

  function renderOverlayCard(item: OBSUrl) {
    const isSocial = item.id === 'social';
    const url = isSocial ? buildSocialUrl() : buildUrl(item.mode, item.supportsTheme);
    const isCopied = copied === item.id;

    return (
      <div key={item.id}>
        <div
          className="glass-card"
          style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `${item.color}22`,
            border: `1px solid ${item.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem',
          }}>
            {item.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--sf-text)' }}>{t(item.labelKey)}</span>
              {item.supportsTheme && selectedTheme && (
                <span className="sf-badge sf-badge-violet" style={{ fontSize: '0.6rem' }}>
                  {t(THEMES.find((th) => th.id === selectedTheme)?.labelKey ?? '')}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', marginBottom: '0.625rem' }}>
              {t(item.descKey)}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
            <button
              id={`copy-${item.id}`}
              onClick={() => copyToClipboard(item.id, url)}
              className={`sf-btn ${isCopied ? 'sf-btn-ghost' : 'sf-btn-primary'}`}
              style={{ minWidth: 90, fontSize: '0.78rem', padding: '0.45rem 0.875rem' }}
            >
              {isCopied ? t('obs.copiado') : t('obs.copiar')}
            </button>

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
                {socialExpanded ? '▲' : '▼'} {t('obs.configurar')}
              </button>
            )}

            {item.id.endsWith('-end') && (
              <button
                id={`endsocial-configure-btn-${item.id}`}
                onClick={() => setEndSocialExpanded(endSocialExpanded === item.id ? null : item.id)}
                style={{
                  padding: '0.45rem 0.875rem',
                  borderRadius: 'var(--sf-radius-sm)',
                  border: `1px solid ${endSocialExpanded === item.id ? '#10b98188' : 'var(--sf-border)'}`,
                  background: endSocialExpanded === item.id ? 'rgba(16,185,129,0.1)' : 'transparent',
                  color: endSocialExpanded === item.id ? '#34d399' : 'var(--sf-text-3)',
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
                {endSocialExpanded === item.id ? '▲' : '▼'} {t('obs.configurar')}
              </button>
            )}
          </div>
        </div>

        {item.id.endsWith('-end') && (
          <AnimatePresence>
            {endSocialExpanded === item.id && (
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
                    background: 'rgba(16,185,129,0.04)',
                    border: '1px solid rgba(16,185,129,0.15)',
                    borderTop: 'none',
                    borderRadius: '0 0 var(--sf-radius) var(--sf-radius)',
                  }}
                >
                  <p className="sf-section-title" style={{ marginBottom: '1rem', color: '#34d399' }}>
                    Redes Sociales · Pantalla de Despedida
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '1rem', lineHeight: 1.5 }}>
                    Ingresa tu nombre de usuario en cada red y desactiva las que no quieras mostrar.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {endScreenSocials.map((social, idx) => (
                      <div key={social.platform} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          onClick={() => {
                            const next = [...endScreenSocials];
                            next[idx] = { ...next[idx], visible: !next[idx].visible };
                            setEndScreenSocials(next);
                          }}
                          style={{
                            width: 22, height: 22, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                            background: social.visible ? `${social.color}44` : 'transparent',
                            border: `2px solid ${social.visible ? social.color : 'var(--sf-border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', color: social.visible ? '#fff' : 'transparent',
                            transition: 'all 0.15s ease', fontFamily: 'inherit',
                          }}
                          title={social.visible ? 'Ocultar' : 'Mostrar'}
                        >
                          {social.visible ? '✓' : ''}
                        </button>

                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: `${social.color}22`,
                          border: `1px solid ${social.color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1rem', flexShrink: 0,
                        }}>
                          {social.icon}
                        </div>

                        <span style={{
                          fontSize: '0.78rem', fontWeight: 600,
                          color: social.visible ? 'var(--sf-text-2)' : 'var(--sf-text-3)',
                          width: 100, flexShrink: 0,
                        }}>
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
                          className="sf-input"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', opacity: social.visible ? 1 : 0.4 }}
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
                  <p className="sf-section-title" style={{ marginBottom: '1rem', color: '#22d3ee' }}>
                    {t('obs.socialUrls')}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {socialLinks.map((link) => (
                      <div key={link.platform} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: `${link.color}22`,
                          border: `1px solid ${link.color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1rem', flexShrink: 0,
                        }}>
                          {link.icon}
                        </div>

                        <span style={{
                          fontSize: '0.78rem', fontWeight: 600,
                          color: 'var(--sf-text-2)', width: 90, flexShrink: 0,
                        }}>
                          {t(link.labelKey)}
                        </span>

                        <input
                          id={`social-url-${link.platform}`}
                          type="url"
                          value={link.url}
                          onChange={(e) => updateSocialLink(link.platform, e.target.value)}
                          placeholder={t(link.placeholderKey)}
                          className="sf-input"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                        />

                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: link.url.trim() ? '#10b981' : 'var(--sf-border)',
                          boxShadow: link.url.trim() ? '0 0 6px #10b981' : 'none',
                          flexShrink: 0, transition: 'all 0.2s ease',
                        }} />
                      </div>
                    ))}
                  </div>

                  <p style={{ marginTop: '1rem', fontSize: '0.72rem', color: 'var(--sf-text-3)', lineHeight: 1.5 }}>
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

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)' }}>
          {t('obs.obsTitle')}
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          {t('obs.obsInstructions')} <strong style={{ color: 'var(--sf-text)' }}>{t('obs.browserSource')}</strong>.
          {' '}          {t('obs.resolucionRecomendada')} <code style={{ background: 'rgba(124,58,237,0.15)', padding: '0.1rem 0.4rem', borderRadius: 4, color: '#a78bfa' }}>1920×1080</code> / <code style={{ background: 'rgba(6,182,212,0.15)', padding: '0.1rem 0.4rem', borderRadius: 4, color: '#22d3ee' }}>1080×1920</code>
        </p>
      </div>

      {/* Theme selector */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-2)', whiteSpace: 'nowrap' }}>
          {t('obs.temaVisual')}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSelectedTheme(theme.id)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: 99,
                border: '1px solid',
                borderColor: selectedTheme === theme.id ? 'var(--sf-primary)' : 'var(--sf-border)',
                background: selectedTheme === theme.id ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: selectedTheme === theme.id ? '#a78bfa' : 'var(--sf-text-3)',
                fontSize: '0.78rem',
                fontWeight: selectedTheme === theme.id ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              {t(theme.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Orientation selector */}
      <div className="glass-card" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-2)', whiteSpace: 'nowrap' }}>
          {t('obs.orientacion')}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { id: 'all', labelKey: 'obs.orientationAll' },
            { id: 'horizontal', labelKey: 'obs.orientationHorizontal' },
            { id: 'vertical', labelKey: 'obs.orientationVertical' },
          ].map((o) => (
            <button
              key={o.id}
              onClick={() => setOrientation(o.id as any)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: 99,
                border: '1px solid',
                borderColor: orientation === o.id ? '#22d3ee' : 'var(--sf-border)',
                background: orientation === o.id ? 'rgba(6,182,212,0.15)' : 'transparent',
                color: orientation === o.id ? '#22d3ee' : 'var(--sf-text-3)',
                fontSize: '0.78rem',
                fontWeight: orientation === o.id ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              {t(o.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* URL Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {(() => {
          const filtered = OBS_URLS.filter((item) => {
            if (selectedTheme === 'fortnite') return item.id === 'fortnite' || item.id === 'fortnite-alerts' || item.id === 'fortnite-vertical' || item.id === 'fortnite-alerts-vertical';
            if (selectedTheme === 'subnautica2') return item.id === 'subnautica2_standalone';
            if (selectedTheme === 'dj') return item.id.startsWith('dj-');
            if (selectedTheme === 'alliance') return item.id.startsWith('wow-alliance-');
            if (selectedTheme === 'wow') return item.id.startsWith('wow-horde-');
            if (selectedTheme === '8bits') return item.id.startsWith('8bits-');
            if (selectedTheme === 'win95') return item.id.startsWith('win95-');
            if (selectedTheme === 'retrowave') return item.id.startsWith('retrowave-');
            if (selectedTheme === 'tactical') return item.id.startsWith('tactical-');
            // Always show vertical items regardless of theme selection
            if (item.id.endsWith('-vertical')) return true;
            // When no theme is selected, hide theme-specific overlays
            if (item.id.startsWith('dj-')) return false;
            if (item.id.startsWith('wow-alliance-')) return false;
            if (item.id.startsWith('wow-horde-')) return false;
            if (item.id.startsWith('8bits-')) return false;
            if (item.id.startsWith('win95-')) return false;
            if (item.id.startsWith('retrowave-')) return false;
            if (item.id.startsWith('tactical-')) return false;
            if (item.id.startsWith('fortnite-')) return false;
            return true;
          });

          const orientationFiltered = orientation === 'all' ? filtered
            : filtered.filter(i => orientation === 'vertical' ? i.id.endsWith('-vertical') : !i.id.endsWith('-vertical'));

          const hItems = orientationFiltered.filter(i => !i.id.endsWith('-vertical'));
          const vItems = orientationFiltered.filter(i => i.id.endsWith('-vertical'));

          return (
            <>
              {hItems.length > 0 && (
                <>
                  <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.15)' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--sf-text)' }}>{t('obs.orientationHorizontal')}</span>
                    <code style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 4, background: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}>1920×1080</code>
                  </div>
                  {hItems.map((item) => renderOverlayCard(item))}
                </>
              )}
              {vItems.length > 0 && (
                <>
                  <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(6,182,212,0.06)', borderColor: 'rgba(6,182,212,0.15)' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--sf-text)' }}>{t('obs.orientationVertical')}</span>
                    <code style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 4, background: 'rgba(6,182,212,0.1)', color: '#22d3ee' }}>1080×1920</code>
                  </div>
                  {vItems.map((item) => renderOverlayCard(item))}
                </>
              )}
            </>
          );
        })()}
      </div>



      {/* Fortnite config */}
      {selectedTheme === 'fortnite' && (
        <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--sf-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {t('obs.fortniteTitle')}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* API Key */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {t('obs.apiKeyLabel')}
                <span style={{
                  fontSize: '0.6rem', fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                  color: fnHasKey ? '#34d399' : '#ef4444',
                  background: fnHasKey ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)',
                  border: `1px solid ${fnHasKey ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>
                  {fnHasKey ? t('obs.configurada') : t('obs.sinKey')}
                </span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type={showFnApiKey ? 'text' : 'password'}
                  value={fnEditingKey ? fnApiKey : (fnHasKey ? '••••••••' : '')}
                  onChange={(e) => { setFnEditingKey(true); setFnApiKey(e.target.value); }}
                  placeholder={fnHasKey ? t('obs.cambiarKey') : t('obs.ingresarKey')}
                  className="sf-input"
                  style={{ flex: 1, fontSize: '0.78rem' }}
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
            {/* Epic Username */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '0.25rem', display: 'block' }}>
                {t('obs.usuarioEpic')}
              </label>
              <input
                type="text"
                value={fnEpicUsername}
                onChange={(e) => setFnEpicUsername(e.target.value)}
                placeholder={t('obs.epicPlaceholder')}
                className="sf-input"
                style={{ width: '100%', fontSize: '0.78rem' }}
              />
            </div>
            {/* Mode selector */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '0.25rem', display: 'block' }}>
                {t('obs.modoEstadisticas')}
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
                {t('obs.disenoOverlay')}
              </label>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[
                  { value: 'stats', labelKey: 'obs.layoutSoloStats' },
                  { value: 'chat-left', labelKey: 'obs.layoutChatIzquierda' },
                  { value: 'chat-right', labelKey: 'obs.layoutChatDerecha' },
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
                  >{t(o.labelKey)}</button>
                ))}
              </div>
            </div>
            {/* Save */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={saveFnConfig} className="sf-btn sf-btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 1rem' }}>
                {t('obs.guardarConfig')}
              </button>
              {fnSaved && <span style={{ fontSize: '0.72rem', color: '#34d399' }}>{t('obs.guardadoConfig')}</span>}
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
        <strong style={{ color: '#22d3ee' }}>{t('obs.tip')}</strong> {t('obs.obsTip')}
      </div>
    </div>
  );
}
