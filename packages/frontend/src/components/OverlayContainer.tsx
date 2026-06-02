import { useTheme } from '../hooks/useTheme';
import { ChatOverlay } from './ChatOverlay';
import { CustomOverlay } from './CustomOverlay';
import { GiveawayOverlay } from './GiveawayOverlay';
import { PredictionOverlay } from './PredictionOverlay';
import { SocialOverlay } from './SocialOverlay';
import { Subnautica2ChatOverlay } from './Subnautica2ChatOverlay';
import { WowChatOverlay } from './WowChatOverlay';
import { AllianceChatOverlay } from './AllianceChatOverlay';
import { ChannelNotifications } from './ChannelNotifications';

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    mode: params.get('mode') ?? 'chat',
    theme: params.get('theme'),
    channel: params.get('channel') ?? '',
  };
}

function OverlayContent({ mode, theme, channel }: { mode: string; theme: string | null; channel: string }) {
  switch (mode) {
    case 'giveaway':
      return <GiveawayOverlay channel={channel} />;
    case 'prediction':
      return <PredictionOverlay channel={channel} />;
    case 'social':
      return <SocialOverlay />;
    case 'custom':
      return <CustomOverlay channel={channel} />;
    case 'chat':
    default:
      if (theme === 'subnautica2') return <Subnautica2ChatOverlay channel={channel} />;
      if (theme === 'wow') return <WowChatOverlay channel={channel} />;
      if (theme === 'alliance') return <AllianceChatOverlay channel={channel} />;
      return <ChatOverlay channel={channel} />;
  }
}

export function OverlayContainer() {
  const { mode, theme, channel } = getParams();
  useTheme(theme);

  return (
    <>
      <OverlayContent mode={mode} theme={theme} channel={channel} />
      {channel && <ChannelNotifications />}
    </>
  );
}
