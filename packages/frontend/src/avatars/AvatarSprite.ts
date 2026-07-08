import * as PIXI from 'pixi.js';
import * as Matter from 'matter-js';
import { gsap } from 'gsap';
import type { AvatarAction, AvatarSpriteConfig, SpriteThemeConfig } from './types';
import { getUserTint } from './AvatarThemeMapper';

const NAMETAG_STYLE = new PIXI.TextStyle({
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 11,
  fontWeight: '600',
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 3 },
  align: 'center',
});

/** Actions that loop indefinitely until interrupted */
const LOOPING_ACTIONS: Set<AvatarAction> = new Set(['idle', 'run', 'sleep']);

/** Actions triggered by events — these have priority over wander/idle */
const EVENT_ACTIONS: Set<AvatarAction> = new Set([
  'dance', 'jump', 'wave', 'hit', 'explode',
]);

/**
 * An individual avatar sprite with nametag, spritesheet animation,
 * physics body sync, directional flip, and wander state.
 */
export class AvatarSprite {
  public container: PIXI.Container;
  public userId: string;
  public body: Matter.Body | null = null;

  private bodyContainer: PIXI.Container;
  private mainGraphic: PIXI.Graphics;
  private nametag: PIXI.Text;
  private eyeL: PIXI.Graphics;
  private eyeR: PIXI.Graphics;

  private animatedSprite: PIXI.AnimatedSprite | null = null;
  private themeConfig: SpriteThemeConfig;
  private frames: Record<string, PIXI.Texture[]> = {};

  private currentAction: AvatarAction = 'idle';
  private tint: number;
  private animTimeline: gsap.core.Timeline | null = null;
  private destroyed = false;
  private durationMultiplier: number = 1.0;

  /** Direction the sprite is facing: 1 = right, -1 = left */
  private facingDir: 1 | -1 = 1;

  /**
   * Wander state — managed by AvatarEngine.
   * - 'idle': standing still, breathing
   * - 'walk': moving in facingDir
   * - 'event': playing an event animation (priority)
   */
  private _wanderState: 'idle' | 'walk' | 'event' = 'idle';
  private wanderTimer = 0;
  private wanderDecisionInterval = 0; // set on creation

  constructor(config: AvatarSpriteConfig, themeConfig: SpriteThemeConfig) {
    this.userId = config.userId;
    this.tint = getUserTint(config.userId);
    this.themeConfig = themeConfig;

    this.container = new PIXI.Container();
    this.container.x = config.x;
    this.container.y = config.y;

    this.bodyContainer = new PIXI.Container();
    this.container.addChild(this.bodyContainer);

    // ─── Procedural avatar body (Fallback) ───
    this.mainGraphic = new PIXI.Graphics();
    this.drawBody();
    this.bodyContainer.addChild(this.mainGraphic);

    // ─── Eyes (Fallback) ───
    this.eyeL = new PIXI.Graphics();
    this.eyeR = new PIXI.Graphics();
    this.drawEyes();
    this.bodyContainer.addChild(this.eyeL);
    this.bodyContainer.addChild(this.eyeR);

    // ─── Nametag ───
    this.nametag = new PIXI.Text({ text: config.displayName, style: NAMETAG_STYLE });
    this.nametag.anchor.set(0.5, 1);
    this.nametag.x = 0;
    this.nametag.y = -28;
    this.container.addChild(this.nametag);

    // Randomize initial wander decision interval (2-6 seconds at 60fps)
    this.wanderDecisionInterval = Math.floor(120 + Math.random() * 240);
    this.wanderTimer = Math.floor(Math.random() * this.wanderDecisionInterval);

    // Randomize initial direction
    this.facingDir = Math.random() > 0.5 ? 1 : -1;

    // Load spritesheet
    this.loadSpritesheet();

    // Start idle animation
    this.playAnimation('idle');
  }

  // ─── Spritesheet Loading ────────────────────────────────────────────

  private async loadSpritesheet() {
    try {
      const texture = await PIXI.Assets.load(this.themeConfig.sheetPath);
      if (this.destroyed) return;

      // Validate that we have a real texture
      if (!texture || !texture.source) {
        console.warn(`Spritesheet invalid for theme: ${this.themeConfig.sheetPath}`);
        return; // Keep procedural fallback
      }

      // Generate frames for each action
      let allFramesValid = true;
      for (const [action, def] of Object.entries(this.themeConfig.frames)) {
        if (!def) continue;
        const frameDef = def as { index: number; count: number };
        const textures: PIXI.Texture[] = [];

        for (let i = 0; i < frameDef.count; i++) {
          const x = i * this.themeConfig.frameWidth;
          const y = frameDef.index * this.themeConfig.frameHeight;



          const frameRect = new PIXI.Rectangle(
            x, y,
            this.themeConfig.frameWidth,
            this.themeConfig.frameHeight,
          );
          textures.push(new PIXI.Texture({ source: texture.source, frame: frameRect }));
        }

        if (textures.length === 0) {
          allFramesValid = false;
          break;
        }
        this.frames[action] = textures;
      }

      if (!allFramesValid || !this.frames['idle'] || this.frames['idle'].length === 0) {
        console.warn('Could not extract valid frames from spritesheet, using fallback');
        this.frames = {};
        return;
      }

      // Create the AnimatedSprite
      this.animatedSprite = new PIXI.AnimatedSprite(this.frames['idle']);
      this.animatedSprite.anchor.set(0.5, 1); // Anchor at bottom center
      this.animatedSprite.scale.set(this.themeConfig.scale || 1);
      if (this.themeConfig.tint) {
        this.animatedSprite.tint = this.themeConfig.tint;
      }
      this.animatedSprite.animationSpeed = 0.12;
      this.animatedSprite.loop = true;
      this.animatedSprite.play();

      // Hide procedural body
      this.mainGraphic.visible = false;
      this.eyeL.visible = false;
      this.eyeR.visible = false;

      this.bodyContainer.addChildAt(this.animatedSprite, 0);

      // Apply current direction
      this.updateFlip();

      // Restore current action
      this.playAnimation(this.currentAction);
    } catch (e: any) {
      console.error('Failed to load spritesheet:', this.themeConfig.sheetPath, e);
      // Silently fall back to procedural avatar — no error overlay needed
    }
  }

  // ─── Procedural Fallback Drawing ───────────────────────────────────

  private drawBody() {
    this.mainGraphic.clear();
    // Body — rounded rectangle
    this.mainGraphic.roundRect(-16, -32, 32, 32, 8);
    this.mainGraphic.fill({ color: this.tint });
    this.mainGraphic.roundRect(-16, -32, 32, 32, 8);
    this.mainGraphic.stroke({ color: 0xffffff, width: 2, alpha: 0.3 });
  }

  private drawEyes() {
    // Left eye
    this.eyeL.clear();
    this.eyeL.circle(0, 0, 3);
    this.eyeL.fill({ color: 0xffffff });
    this.eyeL.circle(0.5, 0.5, 1.5);
    this.eyeL.fill({ color: 0x111111 });
    this.eyeL.x = -6;
    this.eyeL.y = -22;

    // Right eye
    this.eyeR.clear();
    this.eyeR.circle(0, 0, 3);
    this.eyeR.fill({ color: 0xffffff });
    this.eyeR.circle(0.5, 0.5, 1.5);
    this.eyeR.fill({ color: 0x111111 });
    this.eyeR.x = 6;
    this.eyeR.y = -22;
  }

  // ─── Direction & Flip ──────────────────────────────────────────────

  /** Set facing direction and flip the sprite accordingly. */
  setDirection(dir: 1 | -1) {
    if (this.facingDir === dir) return;
    this.facingDir = dir;
    this.updateFlip();
  }

  get direction(): 1 | -1 {
    return this.facingDir;
  }

  private updateFlip() {
    // Flip the body container horizontally based on direction
    this.bodyContainer.scale.x = Math.abs(this.bodyContainer.scale.x) * this.facingDir;
  }

  // ─── Wander State ─────────────────────────────────────────────────

  get wanderState(): 'idle' | 'walk' | 'event' {
    return this._wanderState;
  }

  /**
   * Called each tick by AvatarEngine to manage wander behavior.
   * Returns a desired movement: 0 = still, 1 = right, -1 = left.
   */
  tickWander(): number {
    // If playing an event action, don't wander
    if (this._wanderState === 'event') return 0;

    this.wanderTimer++;
    if (this.wanderTimer < this.wanderDecisionInterval) {
      return this._wanderState === 'walk' ? this.facingDir : 0;
    }

    // Time for a new decision
    this.wanderTimer = 0;
    this.wanderDecisionInterval = Math.floor(90 + Math.random() * 300);

    const roll = Math.random();
    if (roll < 0.35) {
      // Stand idle
      if (this._wanderState !== 'idle') {
        this._wanderState = 'idle';
        this.playAnimation('idle');
      }
      return 0;
    } else if (roll < 0.55) {
      // Change direction and walk
      this.facingDir = this.facingDir === 1 ? -1 : 1;
      this.updateFlip();
      this._wanderState = 'walk';
      this.playAnimation('run');
      return this.facingDir;
    } else {
      // Keep walking same direction (or start walking)
      this._wanderState = 'walk';
      if (this.currentAction !== 'run') {
        this.playAnimation('run');
      }
      return this.facingDir;
    }
  }

  // ─── Physics Sync ─────────────────────────────────────────────────

  /** Set physics body reference for position syncing */
  setBody(body: Matter.Body) {
    this.body = body;
  }

  /** Set animation duration multiplier */
  setDurationMultiplier(mult: number) {
    this.durationMultiplier = Math.max(0.1, mult);
  }

  /** Show or hide nametag */
  setNametagVisible(visible: boolean) {
    this.nametag.visible = visible;
  }

  /** Sync container position with physics body. Called each tick. */
  syncWithPhysics() {
    if (!this.body) return;
    this.container.x = this.body.position.x;
    this.container.y = this.body.position.y;
    // Don't sync rotation — we want sprites upright
  }

  // ─── Animation Playback ───────────────────────────────────────────

  /** Play an animation for this avatar */
  playAnimation(action: AvatarAction) {
    if (this.destroyed) return;
    if (this.currentAction === action && action === 'idle') return;

    // Don't let wander/idle interrupt an event action in progress
    if (this._wanderState === 'event' && !EVENT_ACTIONS.has(action) && action !== 'idle') {
      return;
    }

    this.currentAction = action;

    // Trigger spritesheet animation
    if (this.animatedSprite && this.frames[action]) {
      this.animatedSprite.textures = this.frames[action];
      this.animatedSprite.loop = LOOPING_ACTIONS.has(action);
      this.animatedSprite.animationSpeed = action === 'run' ? 0.18 : 0.12;

      // For non-looping animations, return to idle/walk when done
      if (!LOOPING_ACTIONS.has(action)) {
        this.animatedSprite.onComplete = () => {
          this._wanderState = 'idle';
          this.playAnimation('idle');
        };
      } else {
        this.animatedSprite.onComplete = undefined;
      }

      this.animatedSprite.gotoAndPlay(0);
    }

    // Kill previous GSAP animation
    if (this.animTimeline) {
      this.animTimeline.kill();
      this.animTimeline = null;
    }

    // Reset container properties
    this.bodyContainer.rotation = 0;
    const flipX = this.facingDir;
    this.bodyContainer.scale.set(flipX, 1);
    this.bodyContainer.alpha = 1;
    this.bodyContainer.x = 0;
    this.bodyContainer.y = 0;

    // Set event state for priority actions
    if (EVENT_ACTIONS.has(action)) {
      this._wanderState = 'event';
    }

    switch (action) {
      case 'idle':
        this.animIdle();
        break;
      case 'dance':
        this.animDance();
        break;
      case 'jump':
        this.animJump();
        break;
      case 'wave':
        this.animWave();
        break;
      case 'hit':
        this.animHit();
        break;
      case 'run':
        this.animRun();
        break;
      case 'explode':
        this.animExplode();
        break;
      case 'sleep':
        this.animSleep();
        break;
    }
  }

  // ─── Animations ──────────────────────────────────────────────────

  private animIdle() {
    this.animTimeline = gsap.timeline({ repeat: -1, yoyo: true });
    this.animTimeline.to(this.bodyContainer, {
      y: -3,
      duration: 0.8,
      ease: 'sine.inOut',
    });
  }

  private animDance() {
    const m = this.durationMultiplier;
    this.animTimeline = gsap.timeline({
      repeat: 8, yoyo: true,
      onComplete: () => {
        this._wanderState = 'idle';
        this.playAnimation('idle');
      },
    });
    const flipX = this.facingDir;
    this.animTimeline
      .to(this.bodyContainer, { rotation: 0.25, duration: 0.25 * m, ease: 'power2.inOut' })
      .to(this.bodyContainer, { rotation: -0.25, duration: 0.25 * m, ease: 'power2.inOut' })
      .to(this.bodyContainer.scale, { y: 0.85, x: 1.15 * flipX, duration: 0.15 * m, ease: 'power2.out' })
      .to(this.bodyContainer.scale, { y: 1, x: 1 * flipX, duration: 0.15 * m, ease: 'power2.in' });
  }

  private animJump() {
    const m = this.durationMultiplier;
    this.animTimeline = gsap.timeline({
      onComplete: () => {
        this._wanderState = 'idle';
        this.playAnimation('idle');
      },
    });
    const flipX = this.facingDir;
    this.animTimeline
      .to(this.bodyContainer.scale, { y: 0.7, x: 1.3 * flipX, duration: 0.15 * m, ease: 'power2.out' })
      .to(this.bodyContainer.scale, { y: 1.2, x: 0.85 * flipX, duration: 0.25 * m, ease: 'power2.out' })
      .to(this.bodyContainer, { y: -20, duration: 0.25 * m, ease: 'power2.out' }, "<")
      .to(this.bodyContainer.scale, { y: 1, x: 1 * flipX, duration: 0.35 * m, ease: 'bounce.out' })
      .to(this.bodyContainer, { y: 0, duration: 0.35 * m, ease: 'bounce.out' }, "<");
  }

  private animWave() {
    const m = this.durationMultiplier;
    this.animTimeline = gsap.timeline({
      repeat: 5,
      onComplete: () => {
        this._wanderState = 'idle';
        this.playAnimation('idle');
      },
    });
    this.animTimeline
      .to(this.bodyContainer, { rotation: 0.15, duration: 0.3 * m, ease: 'sine.inOut' })
      .to(this.bodyContainer, { rotation: -0.15, duration: 0.3 * m, ease: 'sine.inOut' })
      .to(this.bodyContainer, { rotation: 0, duration: 0.3 * m, ease: 'sine.inOut' });
  }

  private animHit() {
    const m = this.durationMultiplier;
    this.animTimeline = gsap.timeline({
      onComplete: () => {
        this._wanderState = 'idle';
        this.playAnimation('idle');
      },
    });
    this.animTimeline
      .to(this.bodyContainer, { x: -5, duration: 0.07 * m })
      .to(this.bodyContainer, { x: 5, duration: 0.07 * m })
      .to(this.bodyContainer, { x: -3, duration: 0.07 * m })
      .to(this.bodyContainer, { x: 0, duration: 0.07 * m });
    this.flash(0xff0000, 0.2);
  }

  private animRun() {
    this.animTimeline = gsap.timeline({ repeat: -1 });
    const flipX = this.facingDir;
    this.animTimeline
      .to(this.bodyContainer.scale, { x: 1.1 * flipX, y: 0.9, duration: 0.12, ease: 'power1.inOut' })
      .to(this.bodyContainer.scale, { x: 0.95 * flipX, y: 1.05, duration: 0.12, ease: 'power1.inOut' });
  }

  private animExplode() {
    const m = this.durationMultiplier;
    this.animTimeline = gsap.timeline({
      onComplete: () => {
        this._wanderState = 'idle';
        this.playAnimation('idle');
      },
    });
    const flipX = this.facingDir;
    this.animTimeline
      .to(this.bodyContainer.scale, { x: 1.5 * flipX, y: 1.5, duration: 0.3 * m, ease: 'power2.out' })
      .to(this.bodyContainer, { alpha: 0.5, duration: 0.3 * m, ease: 'power2.out' }, "<")
      .to(this.bodyContainer.scale, { x: 0.8 * flipX, y: 0.8, duration: 0.25 * m })
      .to(this.bodyContainer, { alpha: 1, duration: 0.25 * m }, "<")
      .to(this.bodyContainer.scale, { x: 1 * flipX, y: 1, duration: 0.5 * m, ease: 'elastic.out(1, 0.5)' });
  }

  private animSleep() {
    this.animTimeline = gsap.timeline({ repeat: -1, yoyo: true });
    this.animTimeline
      .to(this.bodyContainer, { y: 2, duration: 1.5, ease: 'sine.inOut' });
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  /** Flash a colour briefly (e.g. for bit donations) */
  flash(color: number, _duration = 0.5) {
    if (this.destroyed) return;
    if (this.animatedSprite) {
      gsap.to(this.animatedSprite, { tint: color, duration: 0.1, yoyo: true, repeat: 1 } as any);
    } else {
      gsap.to(this.mainGraphic, { pixi: { tint: color }, duration: 0.1, yoyo: true, repeat: 1 });
    }
  }

  /** Remove from stage and clean up */
  destroy() {
    this.destroyed = true;
    if (this.animTimeline) {
      this.animTimeline.kill();
      this.animTimeline = null;
    }
    if (this.animatedSprite) {
      this.animatedSprite.onComplete = undefined;
    }
    this.container.destroy({ children: true });
  }
}
