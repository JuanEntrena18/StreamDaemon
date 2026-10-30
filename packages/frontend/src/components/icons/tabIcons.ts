import type { Tab } from '../Sidebar';
import {
  IconDashboard, IconChat, IconMod, IconCommands, IconSecurity,
  IconTracker, IconKpi, IconCalendar, IconDiary,
  IconObs, IconBuilder, IconGiveaway, IconPrediction, IconHud,
  IconTimer, IconScoreboard, IconSubathon, IconAvatars, IconStreamAvatar,
  IconSpeedrun, IconAlertSounds, IconAds, IconVibeDaemon,
  IconBitrate, IconVertical, IconConfig,
} from './icons';
import type { IconProps } from './IconBase';
import type { ComponentType } from 'react';

export const TAB_ICONS: Record<Tab, ComponentType<IconProps>> = {
  dashboard:       IconDashboard,
  chat:            IconChat,
  mod:             IconMod,
  commands:        IconCommands,
  security:        IconSecurity,
  tracker:         IconTracker,
  kpi:             IconKpi,
  calendar:        IconCalendar,
  diary:           IconDiary,
  obs:             IconObs,
  builder:         IconBuilder,
  giveaway:        IconGiveaway,
  prediction:      IconPrediction,
  hud:             IconHud,
  timer:           IconTimer,
  scoreboard:      IconScoreboard,
  subathon:        IconSubathon,
  avatars:         IconAvatars,
  'stream-avatar': IconStreamAvatar,
  speedrun:        IconSpeedrun,
  alertsounds:     IconAlertSounds,
  ads:             IconAds,
  vibedaemon:      IconVibeDaemon,
  bitrate:         IconBitrate,
  vertical:        IconVertical,
  config:          IconConfig,
};
