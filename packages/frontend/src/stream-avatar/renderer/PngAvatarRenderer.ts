import 'pixi.js/unsafe-eval';
import * as PIXI from 'pixi.js';
import { BACKEND_URL } from '../../utils/api.js';
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

const UNIQUE_MOUTH_FILES = [
  'mouth-closed.png',
  'mouth-slight.png',
  'mouth-open.png',
  'mouth-wide.png',
  'mouth-round.png',
] as const;

export class PngAvatarRenderer {
  private app: PIXI.Application | null = null;
  private container: PIXI.Container = new PIXI.Container();
  private characterRig: PIXI.Container = new PIXI.Container();
  private body: PIXI.Sprite | null = null;
  private eyesOpen: PIXI.Sprite | null = null;
  private eyesClosed: PIXI.Sprite | null = null;
  private mouth: PIXI.Sprite | null = null;
  private mouthTextureCache = new Map<string, PIXI.Texture>();
  private config: StreamAvatarConfig;
  private baseUrl: string;
  private blinkState = { open: 1, target: 1, timer: 0, nextBlink: 2000 };
  private currentViseme: StreamAvatarViseme = 'closed';
  private currentVolume = 0;
  private smoothedVolume = 0;
  private time = 0;
  private baseFitScale = 1;
  private isDestroyed = false;
  private initPromise: Promise<void> | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    config: StreamAvatarConfig,
    assetId: string,
  ) {
    this.config = config;
    this.baseUrl = `${BACKEND_URL}/stream-avatar/assets/${encodeURIComponent(assetId)}`;
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

      const useSolidBg = this.config.chromaKey || !this.config.transparentBg;

      try {
        await app.init({
          canvas: this.canvas,
          width,
          height,
          backgroundAlpha: useSolidBg ? 1 : 0,
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

      await this.loadSprites();
      if (this.isDestroyed) {
        this.safeDestroyApp(app);
        return;
      }

      this.container.addChild(this.characterRig);
      app.stage.addChild(this.container);
      this.applyTransform();
      app.ticker.add(() => this.onTick());
    })();

    return this.initPromise;
  }

  private async loadSprites(): Promise<void> {
    const load = (file: string) => PIXI.Assets.load<PIXI.Texture>(`${this.baseUrl}/${file}`);

    try {
      const [body, eyesOpen, eyesClosed, ...mouthTextures] = await Promise.all([
        load('body.png'),
        load('eyes-open.png'),
        load('eyes-closed.png'),
        ...UNIQUE_MOUTH_FILES.map((file) => load(file)),
      ]);

      UNIQUE_MOUTH_FILES.forEach((file, idx) => {
        const tex = mouthTextures[idx];
        if (tex) {
          this.mouthTextureCache.set(file, tex);
        }
      });

      const closedMouthTex = this.mouthTextureCache.get('mouth-closed.png') ?? mouthTextures[0];

      this.body = new PIXI.Sprite(body);
      this.eyesOpen = new PIXI.Sprite(eyesOpen);
      this.eyesClosed = new PIXI.Sprite(eyesClosed);
      this.mouth = new PIXI.Sprite(closedMouthTex);

      for (const sprite of [this.body, this.eyesOpen, this.eyesClosed, this.mouth]) {
        if (!sprite) continue;
        sprite.anchor.set(0.5);
        sprite.scale.set(1);
      }

      const renderer = this.app?.renderer;
      if (renderer && this.body.texture) {
        const maxDim = Math.max(this.body.texture.width, this.body.texture.height, 1);
        this.baseFitScale = (Math.min(renderer.width, renderer.height) * 0.84) / maxDim;
      }

      // Layer order: body (base), mouth (middle), eyes (top)
      this.characterRig.addChild(this.body, this.mouth, this.eyesOpen, this.eyesClosed);
      this.updateMouth();
      this.updateEyes();
    } catch (e) {
      console.error('[stream-avatar] Failed to load PNG assets', e);
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    this.mouthTextureCache.clear();
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
      app.destroy(true, { children: true, texture: false });
    } catch (err) {
      console.warn('[PngAvatarRenderer] Error during destroy:', err);
    }
  }

  updateConfig(config: StreamAvatarConfig): void {
    if (this.isDestroyed) return;
    this.config = config;
    this.applyTransform();
    const renderer = this.app?.renderer;
    if (renderer) {
      const useSolidBg = this.config.chromaKey || !this.config.transparentBg;
      renderer.background.alpha = useSolidBg ? 1 : 0;
      renderer.background.color = this.config.chromaKey
        ? this.hexToNumber(this.config.chromaKeyColor)
        : 0x000000;
    }
  }

  setViseme(viseme: StreamAvatarViseme, volume: number): void {
    this.currentVolume = volume;
    if (this.currentViseme === viseme) return;
    this.currentViseme = viseme;
    this.updateMouth();
  }

  private updateMouth(): void {
    if (!this.mouth) return;
    const file = MOUTH_TEXTURES[this.currentViseme];
    const cached = this.mouthTextureCache.get(file);
    if (cached) {
      this.mouth.texture = cached;
    }
  }

  private updateEyes(): void {
    if (!this.eyesOpen || !this.eyesClosed) return;
    this.eyesOpen.alpha = this.blinkState.open;
    this.eyesClosed.alpha = 1 - this.blinkState.open;
  }

  private onTick(): void {
    if (this.isDestroyed) return;
    const dt = this.app?.ticker.deltaMS ?? 16;
    this.time += dt * 0.001;
    this.blinkState.timer += dt;

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

    this.smoothedVolume += (this.currentVolume - this.smoothedVolume) * 0.25;

    // Subtle breathing & voice bounce so PNG tubers feel dynamic
    const breathY = Math.sin(this.time * 2.2) * 3;
    const talkBounceY = -this.smoothedVolume * 10;
    const talkScaleY = 1 + this.smoothedVolume * 0.025;
    this.characterRig.position.y = breathY + talkBounceY;
    this.characterRig.scale.set(1, talkScaleY);

    this.updateEyes();
  }

  private applyTransform(): void {
    const renderer = this.app?.renderer;
    if (!renderer) return;

    const { width, height } = renderer;
    if (this.body?.texture) {
      const maxDim = Math.max(this.body.texture.width, this.body.texture.height, 1);
      this.baseFitScale = (Math.min(width, height) * 0.84) / maxDim;
    }

    const scale = this.baseFitScale * this.config.scale;

    this.container.scale.set(this.config.flipX ? -scale : scale, scale);
    this.container.position.set(
      width / 2 + this.config.offsetX * width,
      height / 2 + this.config.offsetY * height,
    );
  }

  private hexToNumber(hex: string): number {
    const cleaned = hex.replace('#', '');
    return parseInt(cleaned, 16) || 0x00ff00;
  }
}
