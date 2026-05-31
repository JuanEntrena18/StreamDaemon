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
