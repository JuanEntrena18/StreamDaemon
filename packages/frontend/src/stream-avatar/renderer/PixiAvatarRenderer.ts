import 'pixi.js/unsafe-eval';
import * as PIXI from 'pixi.js';
import type { StreamAvatarConfig, StreamAvatarViseme } from '../types.js';

const MOUTH_SHAPES: Record<StreamAvatarViseme, { w: number; h: number; round: boolean }> = {
  closed: { w: 18, h: 4, round: true },
  slight: { w: 22, h: 10, round: true },
  open:   { w: 26, h: 30, round: true },
  wide:   { w: 34, h: 16, round: false },
  round:  { w: 22, h: 26, round: true },
  small:  { w: 16, h: 14, round: true },
  narrow: { w: 30, h: 4, round: false },
};

interface AvatarColors {
  skin: number;
  hair: number;
  eyes: number;
  mouth: number;
  shirt: number;
}

const DEFAULT_COLORS: AvatarColors = {
  skin: 0xffdbac,
  hair: 0x3a2a1a,
  eyes: 0x222222,
  mouth: 0x883333,
  shirt: 0x7c3aed,
};

const CYBER_COLORS: AvatarColors = {
  skin: 0xe0e0ff,
  hair: 0x0a0a1a,
  eyes: 0x00f0ff,
  mouth: 0xff003c,
  shirt: 0x1a1a3a,
};

const PIXEL_COLORS: AvatarColors = {
  skin: 0xf5c7a0,
  hair: 0x5c3a21,
  eyes: 0x111111,
  mouth: 0x883333,
  shirt: 0x10b981,
};

const FUTURE_COLORS: AvatarColors = {
  skin: 0xc8e0ff,
  hair: 0x1a2a3a,
  eyes: 0x60a5fa,
  mouth: 0x3b82f6,
  shirt: 0x334155,
};

const DARK_COLORS: AvatarColors = {
  skin: 0xf0e6dc,
  hair: 0x1a1a1a,
  eyes: 0x9f1239,
  mouth: 0x7f1d1d,
  shirt: 0x27272a,
};

export class PixiAvatarRenderer {
  private app: PIXI.Application | null = null;
  private container: PIXI.Container = new PIXI.Container();
  private head: PIXI.Graphics = new PIXI.Graphics();
  private hair: PIXI.Graphics = new PIXI.Graphics();
  private leftEye: PIXI.Graphics = new PIXI.Graphics();
  private rightEye: PIXI.Graphics = new PIXI.Graphics();
  private mouth: PIXI.Graphics = new PIXI.Graphics();
  private body: PIXI.Graphics = new PIXI.Graphics();
  private blinkState = { open: 1, target: 1, timer: 0, nextBlink: 2000 };
  private currentViseme: StreamAvatarViseme = 'closed';
  private mouthOpen = 0;
  private config: StreamAvatarConfig;
  private colors: AvatarColors;
  private isDestroyed = false;
  private initPromise: Promise<void> | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    config: StreamAvatarConfig,
  ) {
    this.config = config;
    this.colors = this.resolveColors(config.avatarId);
  }

  async init(): Promise<void> {
    if (this.isDestroyed) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const parent = this.canvas.parentElement;
      const width = parent?.clientWidth ?? this.canvas.width ?? 400;
      const height = parent?.clientHeight ?? this.canvas.height ?? 400;

      const app = new PIXI.Application();
      this.app = app;

      // Safe patch against PixiJS v8 ResizePlugin bug if destroy is called before init finishes
      if (typeof (app as unknown as { _cancelResize?: () => void })._cancelResize !== 'function') {
        (app as unknown as { _cancelResize?: () => void })._cancelResize = () => {};
      }

      try {
        await app.init({
          canvas: this.canvas,
          width,
          height,
          backgroundAlpha: this.config.transparentBg ? 0 : 1,
          backgroundColor: this.config.chromaKey ? this.hexToNumber(this.config.chromaKeyColor) : 0x000000,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio, 2),
          autoDensity: true,
          preference: 'webgl',
        });
      } catch (err) {
        if (this.isDestroyed) return;
        throw err;
      }

      if (this.isDestroyed) {
        this.safeDestroyApp(app);
        return;
      }

      this.buildAvatar();
      app.stage.addChild(this.container);
      this.applyTransform();

      app.ticker.add(() => this.onTick());
    })();

    return this.initPromise;
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.app) {
      this.safeDestroyApp(this.app);
      this.app = null;
    }
  }

  private safeDestroyApp(app: PIXI.Application): void {
    try {
      if (typeof (app as unknown as { _cancelResize?: () => void })._cancelResize !== 'function') {
        (app as unknown as { _cancelResize?: () => void })._cancelResize = () => {};
      }
      app.destroy(true, { children: true, texture: true });
    } catch (err) {
      console.warn('[PixiAvatarRenderer] Error during destroy:', err);
    }
  }

  updateConfig(config: StreamAvatarConfig): void {
    if (this.isDestroyed) return;
    const avatarChanged = this.config.avatarId !== config.avatarId;
    this.config = config;
    this.colors = this.resolveColors(config.avatarId);
    if (avatarChanged) {
      this.buildAvatar();
    }
    this.applyTransform();
    const renderer = this.app?.renderer;
    if (renderer) {
      renderer.background.color = this.config.chromaKey
        ? this.hexToNumber(this.config.chromaKeyColor)
        : 0x000000;
    }
  }

  setViseme(viseme: StreamAvatarViseme, _volume: number): void {
    this.currentViseme = viseme;
  }

  private buildAvatar(): void {
    const c = this.colors;

    // Body / shoulders
    this.body
      .clear()
      .fill({ color: c.shirt })
      .roundRect(-70, 90, 140, 110, 40);

    // Neck
    const neck = new PIXI.Graphics();
    neck.fill({ color: c.skin }).roundRect(-25, 70, 50, 40, 12);

    // Head
    this.head
      .clear()
      .fill({ color: c.skin })
      .circle(0, 0, 80);

    // Hair (simple shape)
    this.hair
      .clear()
      .fill({ color: c.hair })
      .moveTo(-78, -20)
      .lineTo(-70, -80)
      .lineTo(-30, -105)
      .lineTo(30, -105)
      .lineTo(70, -80)
      .lineTo(78, -20)
      .lineTo(60, -50)
      .lineTo(0, -60)
      .lineTo(-60, -50)
      .closePath();

    // Eyes
    this.drawEye(this.leftEye, -28, -10);
    this.drawEye(this.rightEye, 28, -10);

    // Mouth
    this.drawMouth();

    this.container.removeChildren();
    this.container.addChild(this.body, neck, this.head, this.hair, this.leftEye, this.rightEye, this.mouth);
  }

  private drawEye(graphics: PIXI.Graphics, x: number, y: number): void {
    graphics.clear();
    graphics.position.set(x, y);

    // Sclera / eye white
    graphics.fill({ color: 0xffffff }).ellipse(0, 0, 14, 18 * this.blinkState.open);
    // Iris
    graphics.fill({ color: this.colors.eyes }).ellipse(0, 2, 8, 10 * this.blinkState.open);
    // Highlight
    graphics.fill({ color: 0xffffff }).ellipse(3, -2, 3, 4 * this.blinkState.open);
  }

  private drawMouth(): void {
    const target = MOUTH_SHAPES[this.currentViseme];
    // Smooth interpolation
    this.mouthOpen += (1 - this.mouthOpen) * 0.25;

    const w = target.w + (this.mouthOpen - 1) * 4;
    const h = target.h + (this.mouthOpen - 1) * 6;
    const y = 35;

    this.mouth.clear();
    this.mouth.fill({ color: this.colors.mouth });

    if (target.round) {
      this.mouth.ellipse(0, y, w / 2, h / 2);
    } else {
      this.mouth.roundRect(-w / 2, y - h / 2, w, h, Math.min(w, h) / 2);
    }
  }

  private onTick(): void {
    if (this.isDestroyed || !this.app) return;
    // Blink logic
    this.blinkState.timer += this.app?.ticker.deltaMS ?? 16;

    if (this.blinkState.timer >= this.blinkState.nextBlink) {
      this.blinkState.target = 0.1;
      if (this.blinkState.timer >= this.blinkState.nextBlink + 120) {
        this.blinkState.target = 1;
        this.blinkState.timer = 0;
        this.blinkState.nextBlink = 2000 + Math.random() * 4000;
      }
    }

    this.blinkState.open += (this.blinkState.target - this.blinkState.open) * 0.4;
    if (Math.abs(this.blinkState.open - this.blinkState.target) < 0.01) {
      this.blinkState.open = this.blinkState.target;
    }

    this.drawEye(this.leftEye, -28, -10);
    this.drawEye(this.rightEye, 28, -10);
    this.drawMouth();
  }

  private applyTransform(): void {
    const renderer = this.app?.renderer;
    if (!renderer) return;

    const { width, height } = renderer;
    const scale = this.config.scale;

    this.container.scale.set(this.config.flipX ? -scale : scale, scale);
    this.container.position.set(
      width / 2 + this.config.offsetX * width,
      height / 2 + this.config.offsetY * height,
    );
  }

  private resolveColors(avatarId: string): AvatarColors {
    switch (avatarId) {
      case 'cyber': return CYBER_COLORS;
      case 'pixel': return PIXEL_COLORS;
      case 'future': return FUTURE_COLORS;
      case 'dark': return DARK_COLORS;
      default: return DEFAULT_COLORS;
    }
  }

  private hexToNumber(hex: string): number {
    const cleaned = hex.replace('#', '');
    return parseInt(cleaned, 16);
  }
}
