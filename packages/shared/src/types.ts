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

export type ServerEvent =
  | { type: 'chat:message'; data: ChatMessage }
  | { type: 'giveaway:start'; data: GiveawayData }
  | { type: 'giveaway:end'; data: GiveawayData }
  | { type: 'giveaway:winner'; data: { winner: string; prize: string } }
  | { type: 'prediction:create'; data: PredictionData }
  | { type: 'prediction:update'; data: PredictionData }
  | { type: 'social:update'; data: SocialLink[] };
