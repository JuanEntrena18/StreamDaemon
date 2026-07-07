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

/**
 * An individual avatar sprite with nametag and physics body sync.
 *
 * When no spritesheet is available (MVP), it draws a procedural
 * "character" using basic shapes + animations with GSAP.
 */
export class AvatarSprite {
  public container: PIXI.Container;
  public userId: string;
  public body: Matter.Body | null = null;

  private mainGraphic: PIXI.Graphics;
  private nametag: PIXI.Text;
  private eyeL: PIXI.Graphics;
  private eyeR: PIXI.Graphics;
  private currentAction: AvatarAction = 'idle';
  private tint: number;
  private animTimeline: gsap.core.Timeline | null = null;
  private destroyed = false;

  constructor(config: AvatarSpriteConfig, _themeConfig: SpriteThemeConfig) {
    this.userId = config.userId;
    this.tint = getUserTint(config.userId);

    this.container = new PIXI.Container();
    this.container.x = config.x;
    this.container.y = config.y;

    // ─── Procedural avatar body ───
    this.mainGraphic = new PIXI.Graphics();
    this.drawBody();
    this.container.addChild(this.mainGraphic);

    // ─── Eyes ───
    this.eyeL = new PIXI.Graphics();
    this.eyeR = new PIXI.Graphics();
    this.drawEyes();
    this.container.addChild(this.eyeL);
    this.container.addChild(this.eyeR);

    // ─── Nametag ───
    this.nametag = new PIXI.Text({ text: config.displayName, style: NAMETAG_STYLE });
    this.nametag.anchor.set(0.5, 1);
    this.nametag.x = 0;
    this.nametag.y = -28;
    this.container.addChild(this.nametag);

    // Start idle animation
    this.playAnimation('idle');
  }

  private drawBody() {
    this.mainGraphic.clear();
    // Body — rounded rectangle
    this.mainGraphic.roundRect(-16, -16, 32, 32, 8);
    this.mainGraphic.fill({ color: this.tint });
    this.mainGraphic.roundRect(-16, -16, 32, 32, 8);
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
    this.eyeL.y = -6;

    // Right eye
    this.eyeR.clear();
    this.eyeR.circle(0, 0, 3);
    this.eyeR.fill({ color: 0xffffff });
    this.eyeR.circle(0.5, 0.5, 1.5);
    this.eyeR.fill({ color: 0x111111 });
    this.eyeR.x = 6;
    this.eyeR.y = -6;
  }

  /** Set physics body reference for position syncing */
  setBody(body: Matter.Body) {
    this.body = body;
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
    this.container.rotation = this.body.angle;
  }

  /** Play an animation for this avatar */
  playAnimation(action: AvatarAction) {
    if (this.destroyed) return;
    if (this.currentAction === action && action === 'idle') return;

    // Kill previous animation
    if (this.animTimeline) {
      this.animTimeline.kill();
      this.animTimeline = null;
    }

    this.currentAction = action;

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
    this.animTimeline.to(this.mainGraphic, {
      y: -3,
      duration: 0.8,
      ease: 'sine.inOut',
    });
  }

  private animDance() {
    this.animTimeline = gsap.timeline({ repeat: 5, yoyo: true, onComplete: () => this.playAnimation('idle') });
    this.animTimeline
      .to(this.mainGraphic, { rotation: 0.2, duration: 0.15, ease: 'power2.inOut' })
      .to(this.mainGraphic, { rotation: -0.2, duration: 0.15, ease: 'power2.inOut' })
      .to(this.mainGraphic, { scaleY: 0.85, scaleX: 1.15, duration: 0.1, ease: 'power2.out' })
      .to(this.mainGraphic, { scaleY: 1, scaleX: 1, duration: 0.1, ease: 'power2.in' });
  }

  private animJump() {
    this.animTimeline = gsap.timeline({ onComplete: () => this.playAnimation('idle') });
    this.animTimeline
      .to(this.mainGraphic, { scaleY: 0.7, scaleX: 1.3, duration: 0.1, ease: 'power2.out' })
      .to(this.mainGraphic, { scaleY: 1.2, scaleX: 0.85, y: -20, duration: 0.2, ease: 'power2.out' })
      .to(this.mainGraphic, { scaleY: 1, scaleX: 1, y: 0, duration: 0.3, ease: 'bounce.out' });
  }

  private animWave() {
    this.animTimeline = gsap.timeline({ repeat: 3, onComplete: () => this.playAnimation('idle') });
    this.animTimeline
      .to(this.mainGraphic, { rotation: 0.15, duration: 0.2, ease: 'sine.inOut' })
      .to(this.mainGraphic, { rotation: -0.15, duration: 0.2, ease: 'sine.inOut' })
      .to(this.mainGraphic, { rotation: 0, duration: 0.2, ease: 'sine.inOut' });
  }

  private animHit() {
    this.animTimeline = gsap.timeline({ onComplete: () => this.playAnimation('idle') });
    this.animTimeline
      .to(this.mainGraphic, { tint: 0xff0000, duration: 0 } as any)
      .to(this.mainGraphic, { x: -5, duration: 0.05 })
      .to(this.mainGraphic, { x: 5, duration: 0.05 })
      .to(this.mainGraphic, { x: -3, duration: 0.05 })
      .to(this.mainGraphic, { x: 0, duration: 0.05 })
      .to(this.mainGraphic, { tint: 0xffffff, duration: 0.3 } as any);
  }

  private animRun() {
    this.animTimeline = gsap.timeline({ repeat: -1 });
    this.animTimeline
      .to(this.mainGraphic, { scaleX: 1.1, scaleY: 0.9, duration: 0.12, ease: 'power1.inOut' })
      .to(this.mainGraphic, { scaleX: 0.95, scaleY: 1.05, duration: 0.12, ease: 'power1.inOut' });
  }

  private animExplode() {
    this.animTimeline = gsap.timeline({ onComplete: () => this.playAnimation('idle') });
    this.animTimeline
      .to(this.mainGraphic, { scaleX: 1.5, scaleY: 1.5, alpha: 0.5, duration: 0.2, ease: 'power2.out' })
      .to(this.mainGraphic, { scaleX: 0.8, scaleY: 0.8, alpha: 1, duration: 0.15 })
      .to(this.mainGraphic, { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
  }

  private animSleep() {
    this.animTimeline = gsap.timeline({ repeat: -1, yoyo: true });
    this.animTimeline
      .to(this.eyeL, { scaleY: 0.1, duration: 0.3 })
      .to(this.eyeR, { scaleY: 0.1, duration: 0.3 }, '<')
      .to(this.mainGraphic, { y: 2, duration: 1.5, ease: 'sine.inOut' });
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  /** Flash a colour briefly (e.g. for bit donations) */
  flash(color: number, _duration = 0.5) {
    if (this.destroyed) return;
    gsap.to(this.mainGraphic, { pixi: { tint: color }, duration: 0.1, yoyo: true, repeat: 1 });
  }

  /** Remove from stage and clean up */
  destroy() {
    this.destroyed = true;
    if (this.animTimeline) {
      this.animTimeline.kill();
      this.animTimeline = null;
    }
    this.container.destroy({ children: true });
  }
}
