import { app, desktopCapturer, screen } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  VibeCvConfigSchema,
  type VibeCvConfig,
  type VibeCvStatus,
  type VibeCvCaptureDebug,
  type VibeCvRatios,
  type VibeCvRoi,
} from '@streamdaemon/shared';
import { logger } from '../logger.js';

const BACKEND_ORIGIN = 'http://localhost:3000';
const CAPTURE_SIZE = { width: 1920, height: 1080 };
const PIXEL_STEP = 2;

const DEFAULT_CONFIG: VibeCvConfig = {
  enabled: false,
  sourceType: 'screen',
  windowTitleMatch: 'Fortnite',
  captureFps: 1,
  shieldRoi: { x: 0.055, y: 0.885, w: 0.135, h: 0.022 },
  healthRoi: { x: 0.055, y: 0.912, w: 0.135, h: 0.022 },
  stormRoi: { x: 0.845, y: 0.115, w: 0.075, h: 0.06 },
  shieldTriggerRatio: 0.12,
  shieldRecoveryRatio: 0.3,
  healthTriggerRatio: 0.08,
  healthRecoveryRatio: 0.25,
  stormTriggerRatio: 0.02,
  stormClearRatio: 0.005,
  consecutiveFrames: 2,
  cooldowns: { lowShieldMs: 15000, lowHealthMs: 20000, stormMs: 30000 },
};

type PixelClassifier = (r: number, g: number, b: number) => boolean;

type CaptureSource = Awaited<ReturnType<typeof desktopCapturer.getSources>>[number];

interface DetectorMachine {
  armed: boolean;
  metCount: number;
  lastEmittedAt: number;
}

const machines: Record<'shield' | 'health' | 'storm', DetectorMachine> = {
  shield: { armed: true, metCount: 0, lastEmittedAt: 0 },
  health: { armed: true, metCount: 0, lastEmittedAt: 0 },
  storm: { armed: true, metCount: 0, lastEmittedAt: 0 },
};

const status: VibeCvStatus = {
  running: false,
  sourceLabel: null,
  lastFrameAt: null,
  lastError: null,
  ratios: { shield: 0, health: 0, storm: 0 },
  lastEvent: null,
  captureSize: null,
};

let running = false;
let inFlight = false;
let timer: NodeJS.Timeout | null = null;
let configState: VibeCvConfig | null = null;
let channelCache: { channel: string | null; at: number } = { channel: null, at: 0 };

function apiToken(): string {
  return process.env.LOCAL_API_TOKEN ?? '';
}

function configFilePath(): string {
  const base = process.env.DATA_DIR || app.getPath('userData');
  return path.join(base, 'vibe-cv.json');
}

function loadConfigFromDisk(): VibeCvConfig {
  try {
    const file = configFilePath();
    if (fs.existsSync(file)) {
      const parsed = VibeCvConfigSchema.safeParse(JSON.parse(fs.readFileSync(file, 'utf-8')));
      if (parsed.success) return parsed.data;
      logger.warn('vibe-cv.json inválido, usando valores por defecto');
    }
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'No se pudo cargar vibe-cv.json');
  }
  return { ...DEFAULT_CONFIG };
}

function getConfig(): VibeCvConfig {
  if (!configState) configState = loadConfigFromDisk();
  return configState;
}

function isShieldPixel(r: number, g: number, b: number): boolean {
  return b >= 150 && b - r >= 70 && b - g >= 20 && g >= 60;
}

function isHealthPixel(r: number, g: number, b: number): boolean {
  return g >= 150 && g - r >= 70 && g - b >= 60;
}

function isStormPixel(r: number, g: number, b: number): boolean {
  return r >= 100 && b >= 140 && b - g >= 70 && r - g >= 40;
}

function ratioInRoi(buf: Buffer, width: number, height: number, roi: VibeCvRoi, classify: PixelClassifier): number {
  const x0 = Math.max(0, Math.floor(roi.x * width));
  const y0 = Math.max(0, Math.floor(roi.y * height));
  const x1 = Math.min(width - 1, Math.ceil((roi.x + roi.w) * width));
  const y1 = Math.min(height - 1, Math.ceil((roi.y + roi.h) * height));
  if (x1 <= x0 || y1 <= y0) return 0;
  let samples = 0;
  let hits = 0;
  for (let y = y0; y <= y1; y += PIXEL_STEP) {
    const rowOffset = y * width * 4;
    for (let x = x0; x <= x1; x += PIXEL_STEP) {
      const i = rowOffset + x * 4;
      samples += 1;
      if (classify(buf[i + 2], buf[i + 1], buf[i])) hits += 1;
    }
  }
  return samples > 0 ? hits / samples : 0;
}

async function pickSource(): Promise<CaptureSource | null> {
  const cfg = getConfig();
  if (cfg.sourceType === 'window') {
    const match = cfg.windowTitleMatch.trim().toLowerCase();
    if (!match) return null;
    const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: CAPTURE_SIZE });
    return sources.find((s) => s.name.toLowerCase().includes(match)) ?? null;
  }
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: CAPTURE_SIZE });
  if (sources.length === 0) return null;
  try {
    const primaryId = String(screen.getPrimaryDisplay().id);
    return sources.find((s) => s.display_id === primaryId) ?? sources[0];
  } catch {
    return sources[0];
  }
}

async function resolveChannel(force = false): Promise<string | null> {
  const now = Date.now();
  if (!force && channelCache.channel && now - channelCache.at < 60_000) return channelCache.channel;
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/auth/status`, { headers: { 'x-local-token': apiToken() } });
    if (!res.ok) return null;
    const data = (await res.json()) as { authenticated: boolean; user?: { login?: string } };
    const channel = data.authenticated && data.user?.login ? data.user.login : null;
    channelCache = { channel, at: now };
    return channel;
  } catch {
    return null;
  }
}

async function emitEvent(eventType: 'low_shield' | 'low_health' | 'storm_shrinking', ratio: number): Promise<void> {
  const channel = await resolveChannel();
  if (!channel) {
    status.lastError = 'Twitch no autenticado';
    return;
  }
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/vibe-daemon/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-local-token': apiToken() },
      body: JSON.stringify({
        channel,
        gameId: 'fortnite',
        eventType,
        timestamp: Date.now(),
        metadata: { source: 'vibe-cv', ratio },
      }),
    });
    if (res.ok) {
      status.lastEvent = { eventType, at: Date.now() };
      status.lastError = null;
      logger.info({ eventType, ratio }, 'Vibe CV event emitted');
    } else {
      status.lastError = `POST /vibe-daemon/event → ${res.status}`;
    }
  } catch (err) {
    status.lastError = err instanceof Error ? err.message : String(err);
  }
}

function stepMachine(
  machine: DetectorMachine,
  conditionMet: boolean,
  rearmCondition: boolean,
  cooldownMs: number,
  now: number,
): boolean {
  if (conditionMet) {
    machine.metCount += 1;
    if (
      machine.armed &&
      machine.metCount >= getConfig().consecutiveFrames &&
      now - machine.lastEmittedAt >= cooldownMs
    ) {
      machine.armed = false;
      machine.metCount = 0;
      machine.lastEmittedAt = now;
      return true;
    }
  } else {
    machine.metCount = 0;
    if (rearmCondition) machine.armed = true;
  }
  return false;
}

async function analyzeFrame(): Promise<void> {
  const source = await pickSource();
  if (!source) {
    status.sourceLabel = null;
    status.lastError = 'Fuente de captura no encontrada';
    return;
  }
  status.sourceLabel = source.name;
  const image = source.thumbnail;
  const { width, height } = image.getSize();
  if (width === 0 || height === 0) {
    status.lastError = 'Captura vacía';
    return;
  }
  const cfg = getConfig();
  const buf = image.toBitmap();
  const ratios: VibeCvRatios = {
    shield: ratioInRoi(buf, width, height, cfg.shieldRoi, isShieldPixel),
    health: ratioInRoi(buf, width, height, cfg.healthRoi, isHealthPixel),
    storm: ratioInRoi(buf, width, height, cfg.stormRoi, isStormPixel),
  };
  status.ratios = ratios;
  status.captureSize = { width, height };
  status.lastFrameAt = Date.now();
  status.lastError = null;

  const now = Date.now();
  if (stepMachine(machines.shield, ratios.shield < cfg.shieldTriggerRatio, ratios.shield > cfg.shieldRecoveryRatio, cfg.cooldowns.lowShieldMs, now)) {
    void emitEvent('low_shield', ratios.shield);
  }
  if (stepMachine(machines.health, ratios.health < cfg.healthTriggerRatio, ratios.health > cfg.healthRecoveryRatio, cfg.cooldowns.lowHealthMs, now)) {
    void emitEvent('low_health', ratios.health);
  }
  if (stepMachine(machines.storm, ratios.storm > cfg.stormTriggerRatio, ratios.storm < cfg.stormClearRatio, cfg.cooldowns.stormMs, now)) {
    void emitEvent('storm_shrinking', ratios.storm);
  }
}

function scheduleTick(): void {
  if (!running) return;
  const interval = Math.max(250, Math.round(1000 / getConfig().captureFps));
  timer = setTimeout(() => { void tick(); }, interval);
}

async function tick(): Promise<void> {
  if (!running) return;
  if (!inFlight) {
    inFlight = true;
    try {
      await analyzeFrame();
    } catch (err) {
      status.lastError = err instanceof Error ? err.message : String(err);
    } finally {
      inFlight = false;
    }
  }
  scheduleTick();
}

export function startVibeCvDetector(): void {
  if (running) return;
  if (!getConfig().enabled) return;
  running = true;
  status.running = true;
  logger.info({ fps: getConfig().captureFps, sourceType: getConfig().sourceType }, 'Vibe CV detector started');
  void tick();
}

export function stopVibeCvDetector(): void {
  if (!running) return;
  running = false;
  status.running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  logger.info('Vibe CV detector stopped');
}

export function getVibeCvConfig(): VibeCvConfig {
  const cfg = getConfig();
  return { ...cfg, cooldowns: { ...cfg.cooldowns } };
}

export function setVibeCvConfig(next: VibeCvConfig): boolean {
  const parsed = VibeCvConfigSchema.safeParse(next);
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues.length }, 'Configuración VibeCv rechazada');
    return false;
  }
  configState = parsed.data;
  try {
    const file = configFilePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(configState, null, 2), 'utf-8');
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'No se pudo guardar vibe-cv.json');
  }
  if (configState.enabled) startVibeCvDetector();
  else stopVibeCvDetector();
  return true;
}

export function getVibeCvStatus(): VibeCvStatus {
  return {
    ...status,
    ratios: { ...status.ratios },
    lastEvent: status.lastEvent ? { ...status.lastEvent } : null,
    captureSize: status.captureSize ? { ...status.captureSize } : null,
  };
}

export async function captureVibeCvDebug(): Promise<VibeCvCaptureDebug> {
  const source = await pickSource();
  if (!source) {
    return { dataUrl: null, ratios: { shield: 0, health: 0, storm: 0 }, sourceLabel: null, captureSize: null };
  }
  const image = source.thumbnail;
  const { width, height } = image.getSize();
  if (width === 0 || height === 0) {
    return { dataUrl: null, ratios: { shield: 0, health: 0, storm: 0 }, sourceLabel: source.name, captureSize: null };
  }
  const cfg = getConfig();
  const buf = image.toBitmap();
  const ratios: VibeCvRatios = {
    shield: ratioInRoi(buf, width, height, cfg.shieldRoi, isShieldPixel),
    health: ratioInRoi(buf, width, height, cfg.healthRoi, isHealthPixel),
    storm: ratioInRoi(buf, width, height, cfg.stormRoi, isStormPixel),
  };
  logger.info({ source: source.name, width, height, ratios }, 'Vibe CV debug capture');
  return {
    dataUrl: image.toDataURL(),
    ratios,
    sourceLabel: source.name,
    captureSize: { width, height },
  };
}

export function initVibeCvDetector(): void {
  if (getConfig().enabled) startVibeCvDetector();
}
