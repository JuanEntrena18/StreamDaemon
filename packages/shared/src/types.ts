export interface TwitchUser {
  id: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ChatMessage {
  id: string;
  user: {
    id: string;
    displayName: string;
    color: string;
    badges: string[];
  };
  text: string;
  timestamp: number;
}

export interface GiveawayData {
  id: string;
  prize: string;
  status: 'pending' | 'active' | 'ended';
  winnerId: string | null;
  entries: number;
  participants: string[];
}

export interface GiveawayEntryData {
  user: string;
  participants: string[];
  count: number;
}

export interface PredictionData {
  id: string;
  title: string;
  options: PredictionOption[];
  status: 'active' | 'locked' | 'resolved';
  outcome: string | null;
}

export interface PredictionOption {
  id: string;
  title: string;
  votes: number;
}

export interface SocialLink {
  platform: string;
  url: string;
  label: string;
  icon?: string;
}

export interface OverlayTheme {
  id: string;
  name: string;
  game: string;
  css: Record<string, string>;
}

export interface ChannelFollowEvent {
  userDisplayName: string;
  userName: string;
  userId: string;
  timestamp: number;
}

export interface ChannelSubscribeEvent {
  userDisplayName: string;
  userName: string;
  tier: string;
  isGift: boolean;
  timestamp: number;
}

export interface ChannelSubscriptionMessageEvent {
  userDisplayName: string;
  userName: string;
  tier: string;
  cumulativeMonths: number;
  streakMonths: number;
  messageText: string;
  timestamp: number;
}

export interface ChannelSubGiftEvent {
  gifterDisplayName: string;
  gifterName: string;
  tier: string;
  amount: number;
  cumulativeAmount: number | null;
  timestamp: number;
}

export interface ChannelRedemptionEvent {
  userDisplayName: string;
  userName: string;
  rewardTitle: string;
  rewardCost: number;
  input: string;
  timestamp: number;
}

export interface ChannelCheerEvent {
  userDisplayName: string;
  userName: string;
  bits: number;
  message: string;
  timestamp: number;
}

export interface HudData {
  viewers: number;
  followers: number;
  subscribers: number;
  uptimeSeconds: number;
  streamTitle: string;
  gameName: string;
  startedAt: string | null;
  isLive: boolean;
}

export interface HudConfig {
  showViewers: boolean;
  showFollowers: boolean;
  showSubs: boolean;
  showUptime: boolean;
  showGame: boolean;
  showTitle: boolean;
}

export interface TimerState {
  status: 'stopped' | 'running' | 'paused' | 'finished';
  remaining: number;
  duration: number;
  label: string;
}

export interface ScoreboardPlayer {
  id: string;
  name: string;
  score: number;
}

export interface ScoreboardState {
  players: ScoreboardPlayer[];
  title: string;
}

export type ServerEvent =
  | { type: 'chat:message'; data: ChatMessage }
  | { type: 'channel:follow'; data: ChannelFollowEvent }
  | { type: 'channel:subscribe'; data: ChannelSubscribeEvent }
  | { type: 'channel:subscription-message'; data: ChannelSubscriptionMessageEvent }
  | { type: 'channel:subgift'; data: ChannelSubGiftEvent }
  | { type: 'channel:redemption'; data: ChannelRedemptionEvent }
  | { type: 'channel:cheer'; data: ChannelCheerEvent }
  | { type: 'giveaway:start'; data: GiveawayData }
  | { type: 'giveaway:entry'; data: GiveawayEntryData }
  | { type: 'giveaway:end'; data: GiveawayData }
  | { type: 'giveaway:winner'; data: { winner: string; prize: string } }
  | { type: 'prediction:create'; data: PredictionData }
  | { type: 'prediction:update'; data: PredictionData }
  | { type: 'social:update'; data: SocialLink[] }
  | { type: 'hud:update'; data: HudData }
  | { type: 'timer:state'; data: TimerState }
  | { type: 'timer:tick'; data: { remaining: number } }
  | { type: 'scoreboard:update'; data: ScoreboardState }
  | { type: 'subathon:tick'; data: { remaining: number; maxLimit: number } }
  | { type: 'subathon:time-added'; data: { amount: number; reason: string; user: string; remaining: number } }
  | { type: 'subathon:state'; data: SubathonState };

export interface SubathonState {
  status: 'stopped' | 'running' | 'paused' | 'finished';
  remaining: number;
  totalAdded: number;
  maxLimit: number;
  subTime: number;
  bitTime: number;
  bitsPerUnit: number;
  startTime: number | null;
  actions: SubathonAction[];
}

export interface SubathonAction {
  id: string;
  type: 'sub' | 'bits' | 'redeem' | 'manual';
  user: string;
  amount: number;
  timeAdded: number;
  note: string;
  timestamp: number;
}
