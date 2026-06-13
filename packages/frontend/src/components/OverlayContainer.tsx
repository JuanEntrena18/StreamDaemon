import { useState, useCallback, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { OverlayControls } from './OverlayControls';
import { ChatOverlay } from './ChatOverlay';
import { CustomOverlay } from './CustomOverlay';
import { GiveawayOverlay } from './GiveawayOverlay';
import { PredictionOverlay } from './PredictionOverlay';
import { SocialOverlay } from './SocialOverlay';
import { HudOverlay } from './HudOverlay';
import { TimerOverlay } from './TimerOverlay';
import { ScoreboardOverlay } from './ScoreboardOverlay';
import { Subnautica2ChatOverlay } from './Subnautica2ChatOverlay';
import { WowChatOverlay } from './WowChatOverlay';
import { AllianceChatOverlay } from './AllianceChatOverlay';
import { ChannelNotifications } from './ChannelNotifications';

const LS_KEY = 'streamforger-overlay-settings';

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    mode: params.get('mode') ?? 'chat',
    theme: params.get('theme'),
    channel: params.get('channel') ?? '',
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveSettings(settings: Record<string, unknown>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  } catch {}
}

function OverlayContent({ mode, theme, channel, fontFamily, fontSize, bgMode }: {
  mode: string; theme: string | null; channel: string;
  fontFamily: string; fontSize: number; bgMode: 'transparent' | 'black';
}) {
  const chatProps = { channel, fontFamily, fontSize, bgMode };

  switch (mode) {
    case 'giveaway':
      return <GiveawayOverlay channel={channel} />;
    case 'prediction':
      return <PredictionOverlay channel={channel} />;
    case 'social':
      return <SocialOverlay />;
    case 'hud':
      return <HudOverlay channel={channel} />;
    case 'timer':
      return <TimerOverlay channel={channel} />;
    case 'scoreboard':
      return <ScoreboardOverlay channel={channel} />;
    case 'custom':
      return <CustomOverlay channel={channel} />;
    case 'chat':
    default:
      if (theme === 'subnautica2') return <Subnautica2ChatOverlay channel={channel} />;
      if (theme === 'wow') return <WowChatOverlay channel={channel} />;
      if (theme === 'alliance') return <AllianceChatOverlay channel={channel} />;
      return <ChatOverlay {...chatProps} />;
  }
}

export function OverlayContainer() {
  const { mode, theme, channel } = getParams();
  const [settings, setSettings] = useState<{ fontFamily: string; fontSize: number; bgMode: 'transparent' | 'black' }>(() => ({
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    bgMode: 'black',
    ...loadSettings(),
  }));

  useTheme(theme);

  const updateSetting = useCallback(<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  }, []);

  // Listen for settings changes pushed from the main window (via IPC → executeJavaScript)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.fontFamily) updateSetting('fontFamily', detail.fontFamily);
      if (detail.fontSize != null) updateSetting('fontSize', detail.fontSize);
      if (detail.bgMode) updateSetting('bgMode', detail.bgMode);
    };
    window.addEventListener('overlay:settings', handler);
    return () => window.removeEventListener('overlay:settings', handler);
  }, [updateSetting]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <OverlayContent
        mode={mode}
        theme={theme}
        channel={channel}
        fontFamily={settings.fontFamily}
        fontSize={settings.fontSize}
        bgMode={settings.bgMode}
      />
      {channel && <ChannelNotifications />}
      <OverlayControls
        mode={mode}
        bgMode={settings.bgMode}
        fontFamily={settings.fontFamily}
        fontSize={settings.fontSize}
        onBgModeChange={(v) => updateSetting('bgMode', v)}
        onFontFamilyChange={(v) => updateSetting('fontFamily', v)}
        onFontSizeChange={(v) => updateSetting('fontSize', v)}
      />
    </div>
  );
}
