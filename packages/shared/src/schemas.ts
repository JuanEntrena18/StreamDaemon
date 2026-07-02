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

export const FighterConfigSchema = z.object({
  p1Name: z.string().min(1).max(50).optional(),
  p2Name: z.string().min(1).max(50).optional(),
  p1CharName: z.string().max(50).optional(),
  p2CharName: z.string().max(50).optional(),
  p1Portrait: z.string().max(500).optional(),
  p2Portrait: z.string().max(500).optional(),
  maxHealth: z.number().int().min(1).max(999).optional(),
  roundsToWin: z.number().int().min(1).max(99).optional(),
  timerDuration: z.number().int().min(1).max(3600).optional(),
});

export const FighterDamageSchema = z.object({
  player: z.enum(['p1', 'p2']),
  amount: z.number().int().min(1).max(999),
});

export const FighterRoundSchema = z.object({
  player: z.enum(['p1', 'p2']),
});

export const FighterHealSchema = z.object({
  player: z.enum(['p1', 'p2']),
  amount: z.number().int().min(1).max(999),
});

export const HudConfigSchema = z.object({
  showViewers: z.boolean().default(true),
  showFollowers: z.boolean().default(true),
  showSubs: z.boolean().default(true),
  showUptime: z.boolean().default(true),
  showGame: z.boolean().default(true),
  showTitle: z.boolean().default(false),
});

// ── Commands ──

export const CommandAddSchema = z.object({
  channel: z.string().min(1),
  name: z.string().min(1).max(100),
  response: z.string().min(1).max(500),
});

export const CommandDeleteSchema = z.object({
  channel: z.string().min(1),
  commandId: z.string().min(1),
});

export const CommandToggleSchema = z.object({
  channel: z.string().min(1),
  commandId: z.string().min(1),
  enabled: z.boolean(),
});

export const CommandUpdateSchema = z.object({
  channel: z.string().min(1),
  commandId: z.string().min(1),
  response: z.string().max(500).optional(),
  aliases: z.array(z.string()).optional(),
  cooldown: z.number().int().min(0).max(86400).optional(),
  modOnly: z.boolean().optional(),
});

export const CommandImportSchema = z.object({
  commands: z.array(z.object({
    name: z.string().min(1),
    response: z.string().min(1),
    enabled: z.boolean().optional(),
    aliases: z.array(z.string()).optional(),
    cooldown: z.number().int().optional(),
    modOnly: z.boolean().optional(),
  })),
});

// ── Security ──

export const SecurityConfigUpdateSchema = z.object({
  followBotProtection: z.boolean().optional(),
  spamFilter: z.boolean().optional(),
  autoBan: z.boolean().optional(),
  accountAgeFilter: z.number().int().min(0).max(720).optional(),
});

export const SecurityScanSchema = z.object({
  channel: z.string().min(1),
});

export const SecurityBanSchema = z.object({
  user: z.string().min(1),
});

export const SecurityUnbanSchema = z.object({
  user: z.string().min(1),
});

export const SecurityWhitelistAddSchema = z.object({
  user: z.string().min(1),
  reason: z.string().max(200).optional(),
});

export const SecurityWhitelistRemoveSchema = z.object({
  user: z.string().min(1),
});

// ── Chat ──

export const ChatGreetingConfigSchema = z.object({
  channel: z.string().min(1),
  enabled: z.boolean().optional(),
  message: z.string().min(1).max(500).optional(),
});
