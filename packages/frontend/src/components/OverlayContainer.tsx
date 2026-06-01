import { useTheme } from '../hooks/useTheme';
import { ChatOverlay } from './ChatOverlay';
import { GiveawayOverlay } from './GiveawayOverlay';
import { PredictionOverlay } from './PredictionOverlay';
import { SocialOverlay } from './SocialOverlay';
import { Subnautica2ChatOverlay } from './Subnautica2ChatOverlay';

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    mode: params.get('mode') ?? 'chat',
    theme: params.get('theme'),
    channel: params.get('channel') ?? '',
  };
}

export function OverlayContainer() {
  const { mode, theme, channel } = getParams();
  useTheme(theme);

  switch (mode) {
    case 'giveaway':
      return <GiveawayOverlay channel={channel} />;
    case 'prediction':
      return <PredictionOverlay channel={channel} />;
    case 'social':
      return <SocialOverlay />;
    case 'chat':
    default:
      if (theme === 'subnautica2') {
        return <Subnautica2ChatOverlay channel={channel} />;
      }
      return <ChatOverlay channel={channel} />;
  }
}
