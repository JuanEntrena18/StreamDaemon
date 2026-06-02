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
  | { type: 'social:update'; data: SocialLink[] };
