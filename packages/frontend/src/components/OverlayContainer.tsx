import { useTheme } from '../hooks/useTheme';
import { ChatOverlay } from './ChatOverlay';
import { GiveawayOverlay } from './GiveawayOverlay';
import { PredictionOverlay } from './PredictionOverlay';
import { SocialOverlay } from './SocialOverlay';

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
      return <ChatOverlay channel={channel} />;
  }
}
