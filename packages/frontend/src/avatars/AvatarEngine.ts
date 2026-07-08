import 'pixi.js/unsafe-eval';
import * as PIXI from 'pixi.js';
import { AvatarPhysics } from './AvatarPhysics';
import { AvatarSprite } from './AvatarSprite';
import { getThemeConfig } from './AvatarThemeMapper';
import { getActionForEvent, getActionForCommand, getBitsForce, clearCooldowns } from './AvatarEventHandler';
import type { AvatarAction, AvatarConfig, AvatarEventPayload } from './types';

/**
 * Main avatar engine. Manages the PixiJS application,
 * the physics world, and the collection of avatar sprites.
 */
export class AvatarEngine {
  private app: PIXI.Application;
  private physics: AvatarPhysics;
  private sprites: Map<string, AvatarSprite> = new Map();
  private config: AvatarConfig;
  private ticker: PIXI.Ticker | null = null;
  private initialized = false;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, config: AvatarConfig) {
    this.canvas = canvas;
    this.config = config;
    this.app = new PIXI.Application();

    const parentEl = canvas.parentElement;
    const width = parentEl?.clientWidth ?? 1920;
    const height = parentEl?.clientHeight ?? 1080;

    this.physics = new AvatarPhysics(width, height);
  }

  /** Initialize the PixiJS application (async). */
  async init() {
    if (this.initialized) return;

    const parentEl = this.canvas.parentElement;
    const width = parentEl?.clientWidth ?? 1920;
    const height = parentEl?.clientHeight ?? 1080;

    await this.app.init({
      canvas: this.canvas,
      width,
      height,
      backgroundAlpha: 0, // Transparent
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      preference: 'webgl',
    });

    // Start physics
    if (this.config.physicsEnabled) {
      this.physics.start();
    }

    // Add the main ticker for syncing positions
    this.ticker = this.app.ticker;
    this.ticker.add(this.onTick, this);

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          this.app.renderer.resize(w, h);
          this.physics.resize(w, h);
        }
      }
    });
    if (parentEl) {
      resizeObserver.observe(parentEl);
    }

    this.initialized = true;
  }

  /** Main tick — sync physics positions to sprites. */
  private onTick = () => {
    for (const sprite of this.sprites.values()) {
      sprite.syncWithPhysics();
    }
  };

  /** Update config (e.g. when user changes settings). */
  updateConfig(config: AvatarConfig) {
    this.config = config;

    // Update nametag visibility
    for (const sprite of this.sprites.values()) {
      sprite.setNametagVisible(config.nametagsVisible);
    }

    // Enforce max avatars
    while (this.sprites.size > config.maxAvatars) {
      const oldestKey = this.sprites.keys().next().value;
      if (oldestKey) this.removeAvatar(oldestKey);
    }
  }

  /** Spawn a new avatar for a user. */
  spawnAvatar(userId: string, username: string, displayName: string) {
    if (!this.initialized) return;

    // Already exists
    if (this.sprites.has(userId)) return;

    // Max limit
    if (this.sprites.size >= this.config.maxAvatars) {
      // Remove the oldest avatar
      const oldestKey = this.sprites.keys().next().value;
      if (oldestKey) this.removeAvatar(oldestKey);
    }

    const width = this.app.renderer.width;
    const x = Math.random() * (width - 100) + 50;
    const y = -50; // Spawn above screen, will fall

    const themeConfig = getThemeConfig(this.config.theme);
    const sprite = new AvatarSprite(
      { userId, username, displayName, theme: this.config.theme, x, y },
      themeConfig,
    );

    sprite.setNametagVisible(this.config.nametagsVisible);

    // Add physics body
    if (this.config.physicsEnabled) {
      const body = this.physics.addBody(userId, x, y);
      sprite.setBody(body);
    }

    this.sprites.set(userId, sprite);
    this.app.stage.addChild(sprite.container);
  }

  /** Remove an avatar. */
  removeAvatar(userId: string) {
    const sprite = this.sprites.get(userId);
    if (!sprite) return;

    this.physics.removeBody(userId);
    this.app.stage.removeChild(sprite.container);
    sprite.destroy();
    this.sprites.delete(userId);
  }

  /** Trigger an action on a specific avatar. */
  doAction(userId: string, action: AvatarAction) {
    const sprite = this.sprites.get(userId);
    if (!sprite) return;
    sprite.playAnimation(action);
  }

  /** Trigger an action on ALL avatars. */
  doActionAll(action: AvatarAction) {
    for (const sprite of this.sprites.values()) {
      sprite.playAnimation(action);
    }
  }

  /** Handle an incoming Twitch event. */
  handleEvent(event: AvatarEventPayload) {
    if (!this.initialized || !this.config.enabled) return;

    // Spawn avatar if not existing
    this.spawnAvatar(event.userId, event.username, event.displayName);

    // Get action from event
    const handler = getActionForEvent(event, this.config.eventActions);
    if (handler) {
      if (handler.target === 'all') {
        this.doActionAll(handler.action);
      } else {
        this.doAction(event.userId, handler.action);
      }

      // Apply force for bits
      if (event.type === 'bits' && event.amount) {
        const force = getBitsForce(event.amount);
        this.physics.applyForce(event.userId, force);
      }
    }
  }

  /** Handle a chat message (for command detection). */
  handleChatMessage(userId: string, username: string, displayName: string, message: string) {
    if (!this.initialized || !this.config.enabled || !this.config.commandsEnabled) return;

    // Spawn if needed
    this.spawnAvatar(userId, username, displayName);

    // Check for commands
    const action = getActionForCommand(userId, message, this.config.commandCooldowns);
    if (action) {
      this.doAction(userId, action);

      // Jump also applies physics jump
      if (action === 'jump') {
        this.physics.jump(userId);
      }
    }
  }

  /** Get number of active avatars. */
  get avatarCount(): number {
    return this.sprites.size;
  }

  /** Clean up everything. */
  destroy() {
    if (this.ticker) {
      this.ticker.remove(this.onTick, this);
    }

    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    this.sprites.clear();

    this.physics.destroy();
    clearCooldowns();

    this.app.destroy(true, { children: true });
    this.initialized = false;
  }
}
