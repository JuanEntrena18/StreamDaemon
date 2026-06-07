import { z } from 'zod';

export const TwitchTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.array(z.string()),
});

export const GiveawayCreateSchema = z.object({
  prize: z.string().min(1).max(200),
  duration: z.number().min(10).max(3600).default(60),
});

export const PredictionCreateSchema = z.object({
  title: z.string().min(1).max(200),
  options: z.array(z.object({
    title: z.string().min(1).max(100),
  })).min(2).max(10),
});

export const SocialLinkSchema = z.object({
  platform: z.string().min(1),
  url: z.string().url(),
  label: z.string().min(1),
  icon: z.string().optional(),
});

export const ChannelConfigSchema = z.object({
  activeGame: z.string().optional(),
  overlaySettings: z.record(z.string(), z.unknown()).optional(),
  socialLinks: z.array(SocialLinkSchema).optional(),
});

export const TimerStartSchema = z.object({
  duration: z.number().min(1).max(86400),
  label: z.string().max(100).default(''),
});

export const ScoreboardPlayerSchema = z.object({
  name: z.string().min(1).max(50),
});

export const ScoreboardScoreSchema = z.object({
  playerId: z.string().min(1),
  score: z.number().int(),
});

export const ScoreboardIncrementSchema = z.object({
  playerId: z.string().min(1),
  amount: z.number().int().default(1),
});

export const HudConfigSchema = z.object({
  showViewers: z.boolean().default(true),
  showFollowers: z.boolean().default(true),
  showSubs: z.boolean().default(true),
  showUptime: z.boolean().default(true),
  showGame: z.boolean().default(true),
  showTitle: z.boolean().default(false),
});
