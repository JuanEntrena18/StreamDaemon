import 'pixi.js/unsafe-eval';
import * as PIXI from 'pixi.js';
import type { StreamAvatarConfig, StreamAvatarViseme } from '../types.js';

const MOUTH_TEXTURES: Record<StreamAvatarViseme, string> = {
  closed: 'mouth-closed.png',
  slight: 'mouth-slight.png',
  open: 'mouth-open.png',
  wide: 'mouth-wide.png',
  round: 'mouth-round.png',
  small: 'mouth-round.png',
  narrow: 'mouth-closed.png',
};

export class PngAvatarRenderer {
  private app: PIXI.Application | null = null;
  private container: PIXI.Container = new PIXI.Container();
  private body: PIXI.Sprite | null = null;
  private eyesOpen: PIXI.Sprite | null = null;
  private eyesClosed: PIXI.Sprite | null = null;
  private mouth: PIXI.Sprite | null = null;
  private config: StreamAvatarConfig;
  private baseUrl: string;
  private blinkState = { open: 1, target: 1, timer: 0, nextBlink: 2000 };
  private currentViseme: StreamAvatarViseme = 'closed';

  constructor(
    private canvas: HTMLCanvasElement,
    config: StreamAvatarConfig,
    assetId: string,
  ) {
    this.config = config;
    this.baseUrl = `${window.location.origin}/stream-avatar/assets/${assetId}`;
  }

  async init(): Promise<void> {
    if (this.app) return;

    const parent = this.canvas.parentElement;
    const width = parent?.clientWidth ?? this.canvas.width ?? 400;
    const height = parent?.clientHeight ?? this.canvas.height ?? 400;

    this.app = new PIXI.Application();
    await this.app.init({
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

    await this.loadSprites();
    this.app.stage.addChild(this.container);
    this.applyTransform();
    this.app.ticker.add(() => this.onTick());
  }

  private async loadSprites(): Promise<void> {
    const load = (file: string) => PIXI.Assets.load(`${this.baseUrl}/${file}`);

    try {
      const [body, eyesOpen, eyesClosed, mouthClosed] = await Promise.all([
        load('body.png'),
        load('eyes-open.png'),
        load('eyes-closed.png'),
        load('mouth-closed.png'),
      ]);

      this.body = new PIXI.Sprite(body);
      this.eyesOpen = new PIXI.Sprite(eyesOpen);
      this.eyesClosed = new PIXI.Sprite(eyesClosed);
      this.mouth = new PIXI.Sprite(mouthClosed);

      for (const sprite of [this.body, this.eyesOpen, this.eyesClosed, this.mouth]) {
        if (!sprite) continue;
        sprite.anchor.set(0.5);
        sprite.scale.set(1);
      }

      // Layer order: body, mouth, eyes
      this.container.addChild(this.body, this.mouth, this.eyesOpen, this.eyesClosed);
      this.updateMouth();
      this.updateEyes();
    } catch (e) {
      console.error('[stream-avatar] Failed to load PNG assets', e);
    }
  }

  destroy(): void {
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }
  }

  updateConfig(config: StreamAvatarConfig): void {
    this.config = config;
    this.applyTransform();
    if (this.app) {
      this.app.renderer.background.color = this.config.chromaKey
        ? this.hexToNumber(this.config.chromaKeyColor)
        : 0x000000;
    }
  }

  setViseme(viseme: StreamAvatarViseme, _volume: number): void {
    if (this.currentViseme === viseme) return;
    this.currentViseme = viseme;
    this.updateMouth();
  }

  private async updateMouth(): Promise<void> {
    if (!this.mouth) return;
    const file = MOUTH_TEXTURES[this.currentViseme];
    const texture = await PIXI.Assets.load(`${this.baseUrl}/${file}`);
    this.mouth.texture = texture;
  }

  private updateEyes(): void {
    if (!this.eyesOpen || !this.eyesClosed) return;
    this.eyesOpen.alpha = this.blinkState.open;
    this.eyesClosed.alpha = 1 - this.blinkState.open;
  }

  private onTick(): void {
    this.blinkState.timer += this.app?.ticker.deltaMS ?? 16;

    if (this.blinkState.timer >= this.blinkState.nextBlink) {
      this.blinkState.target = 0;
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
    this.updateEyes();
  }

  private applyTransform(): void {
    if (!this.app) return;

    const { width, height } = this.app.renderer;
    const scale = this.config.scale;

    this.container.scale.set(this.config.flipX ? -scale : scale, scale);
    this.container.position.set(
      width / 2 + this.config.offsetX * width,
      height / 2 + this.config.offsetY * height,
    );
  }

  private hexToNumber(hex: string): number {
    const cleaned = hex.replace('#', '');
    return parseInt(cleaned, 16);
  }
}
