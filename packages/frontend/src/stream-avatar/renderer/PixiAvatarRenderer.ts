import 'pixi.js/unsafe-eval';
import * as PIXI from 'pixi.js';
import type { StreamAvatarConfig, StreamAvatarViseme } from '../types.js';

interface MouthGeometry {
  w: number;
  h: number;
  round: boolean;
  openFactor: number;
}

const MOUTH_SHAPES: Record<StreamAvatarViseme, MouthGeometry> = {
  closed: { w: 22, h: 4,  round: true,  openFactor: 0 },
  narrow: { w: 32, h: 6,  round: false, openFactor: 0.15 },
  slight: { w: 26, h: 12, round: true,  openFactor: 0.35 },
  small:  { w: 18, h: 16, round: true,  openFactor: 0.45 },
  wide:   { w: 38, h: 18, round: false, openFactor: 0.65 },
  round:  { w: 24, h: 28, round: true,  openFactor: 0.8 },
  open:   { w: 32, h: 34, round: true,  openFactor: 1.0 },
};

type BuiltinAvatarId = 'default' | 'cyber' | 'pixel' | 'future' | 'dark';

export class PixiAvatarRenderer {
  private app: PIXI.Application | null = null;
  private rootContainer: PIXI.Container = new PIXI.Container();
  private characterContainer: PIXI.Container = new PIXI.Container();
  private headGroup: PIXI.Container = new PIXI.Container();
  private bodyLayer: PIXI.Graphics = new PIXI.Graphics();
  private backHairLayer: PIXI.Graphics = new PIXI.Graphics();
  private headLayer: PIXI.Graphics = new PIXI.Graphics();
  private faceExtrasLayer: PIXI.Graphics = new PIXI.Graphics();
  private leftEyeLayer: PIXI.Graphics = new PIXI.Graphics();
  private rightEyeLayer: PIXI.Graphics = new PIXI.Graphics();
  private mouthLayer: PIXI.Graphics = new PIXI.Graphics();
  private frontHairLayer: PIXI.Graphics = new PIXI.Graphics();
  private accessoryLayer: PIXI.Graphics = new PIXI.Graphics();

  private blinkState = { open: 1, target: 1, timer: 0, nextBlink: 2400 };
  private currentViseme: StreamAvatarViseme = 'closed';
  private currentVolume = 0;
  private smoothedVolume = 0;
  private curMouthW = 22;
  private curMouthH = 4;
  private curOpenFactor = 0;
  private elapsedMs = 0;

  private config: StreamAvatarConfig;
  private isDestroyed = false;
  private initPromise: Promise<void> | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    config: StreamAvatarConfig,
  ) {
    this.config = config;
  }

  async init(): Promise<void> {
    if (this.isDestroyed) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const parent = this.canvas.parentElement;
      const width = parent?.clientWidth || this.canvas.width || 420;
      const height = parent?.clientHeight || this.canvas.height || 420;

      const app = new PIXI.Application();
      this.app = app;

      if (typeof (app as unknown as { _cancelResize?: () => void })._cancelResize !== 'function') {
        (app as unknown as { _cancelResize?: () => void })._cancelResize = () => {};
      }

      const useSolidBg = this.config.chromaKey || !this.config.transparentBg;
      const bgColor = this.config.chromaKey
        ? this.hexToNumber(this.config.chromaKeyColor)
        : 0x080812;

      try {
        await app.init({
          canvas: this.canvas,
          width,
          height,
          backgroundAlpha: useSolidBg ? 1 : 0,
          backgroundColor: bgColor,
          antialias: this.config.avatarId !== 'pixel',
          resolution: Math.min(window.devicePixelRatio || 1, 2),
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

      this.setupHierarchy();
      this.buildStaticLayers();
      app.stage.addChild(this.rootContainer);
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
    if (avatarChanged) {
      this.buildStaticLayers();
    }
    this.applyTransform();
    const renderer = this.app?.renderer;
    if (renderer) {
      const useSolidBg = this.config.chromaKey || !this.config.transparentBg;
      renderer.background.alpha = useSolidBg ? 1 : 0;
      renderer.background.color = this.config.chromaKey
        ? this.hexToNumber(this.config.chromaKeyColor)
        : 0x080812;
    }
  }

  setViseme(viseme: StreamAvatarViseme, volume: number): void {
    this.currentViseme = viseme;
    this.currentVolume = Math.max(0, Math.min(volume, 1));
  }

  private getAvatarStyle(): BuiltinAvatarId {
    const id = this.config.avatarId;
    if (id === 'cyber' || id === 'pixel' || id === 'future' || id === 'dark') {
      return id;
    }
    return 'default';
  }

  private setupHierarchy(): void {
    this.rootContainer.removeChildren();
    this.characterContainer.removeChildren();
    this.headGroup.removeChildren();

    this.headGroup.addChild(
      this.backHairLayer,
      this.headLayer,
      this.faceExtrasLayer,
      this.leftEyeLayer,
      this.rightEyeLayer,
      this.mouthLayer,
      this.frontHairLayer,
      this.accessoryLayer,
    );

    this.characterContainer.addChild(this.bodyLayer, this.headGroup);
    this.rootContainer.addChild(this.characterContainer);
  }

  private buildStaticLayers(): void {
    const style = this.getAvatarStyle();
    this.bodyLayer.clear();
    this.backHairLayer.clear();
    this.headLayer.clear();
    this.faceExtrasLayer.clear();
    this.frontHairLayer.clear();
    this.accessoryLayer.clear();

    switch (style) {
      case 'cyber':
        this.buildCyberStatic();
        break;
      case 'pixel':
        this.buildPixelStatic();
        break;
      case 'future':
        this.buildFutureStatic();
        break;
      case 'dark':
        this.buildDarkStatic();
        break;
      default:
        this.buildDefaultStatic();
        break;
    }

    this.drawDynamicFace();
  }

  /* ─────────────────────────────────────────────────────────
     1. DEFAULT: Studio Streamer (Headphones, Boom Mic, Hoodie)
     ───────────────────────────────────────────────────────── */
  private buildDefaultStatic(): void {
    // Hoodie & shoulders
    this.bodyLayer
      .fill({ color: 0x5b21b6 })
      .roundRect(-86, 78, 172, 120, 46)
      .fill({ color: 0x7c3aed })
      .roundRect(-74, 84, 148, 110, 40)
      // Hoodie collar & drawstrings
      .fill({ color: 0x4c1d95 })
      .moveTo(-36, 82)
      .lineTo(0, 122)
      .lineTo(36, 82)
      .closePath()
      .stroke({ color: 0xe9d5ff, width: 3 })
      .moveTo(-16, 102)
      .lineTo(-16, 142)
      .moveTo(16, 102)
      .lineTo(16, 142);

    // Neck + shadow
    this.bodyLayer
      .fill({ color: 0xe6b88a })
      .roundRect(-24, 58, 48, 38, 14)
      .fill({ color: 0xd4a276 })
      .ellipse(0, 68, 22, 8);

    // Back hair
    this.backHairLayer
      .fill({ color: 0x271c19 })
      .roundRect(-84, -76, 168, 110, 52);

    // Ears & Head
    this.headLayer
      .fill({ color: 0xf5cba7 })
      .circle(-78, 4, 16)
      .circle(78, 4, 16)
      .fill({ color: 0xffdbb8 })
      .roundRect(-76, -78, 152, 156, 68);

    // Subtle blush & nose
    this.faceExtrasLayer
      .fill({ color: 0xff8da1, alpha: 0.32 })
      .ellipse(-44, 18, 14, 8)
      .ellipse(44, 18, 14, 8)
      .fill({ color: 0xe5b287 })
      .roundRect(-5, 4, 10, 14, 5);

    // Stylized swept front hair
    this.frontHairLayer
      .fill({ color: 0x3b2822 })
      .moveTo(-78, -22)
      .bezierCurveTo(-84, -78, -42, -96, 4, -94)
      .bezierCurveTo(48, -96, 84, -76, 78, -18)
      .lineTo(66, -48)
      .lineTo(36, -34)
      .lineTo(12, -56)
      .lineTo(-22, -36)
      .lineTo(-54, -54)
      .closePath()
      // Hair shine
      .fill({ color: 0x6b4c42, alpha: 0.65 })
      .ellipse(-24, -72, 28, 8);

    // Broadcast Headphones + Boom Mic
    this.accessoryLayer
      // Headband arch
      .stroke({ color: 0x1e1b2e, width: 12 })
      .arc(0, -6, 88, Math.PI * 1.08, Math.PI * 1.92)
      .stroke({ color: 0x8b5cf6, width: 4 })
      .arc(0, -6, 90, Math.PI * 1.2, Math.PI * 1.8)
      // Left & Right Earcups
      .fill({ color: 0x181826 })
      .roundRect(-98, -22, 24, 52, 10)
      .roundRect(74, -22, 24, 52, 10)
      .stroke({ color: 0x06b6d4, width: 2.5 })
      .roundRect(-94, -14, 16, 36, 6)
      .roundRect(78, -14, 16, 36, 6)
      // Boom mic arm
      .stroke({ color: 0x334155, width: 4 })
      .moveTo(-86, 22)
      .quadraticCurveTo(-76, 56, -34, 52)
      .fill({ color: 0x0f172a })
      .roundRect(-40, 46, 16, 11, 5)
      .fill({ color: 0x06b6d4 })
      .circle(-32, 51.5, 2.5);
  }

  /* ─────────────────────────────────────────────────────────
     2. CYBER: Edgerunner Neon (Tech Collar, Cyber Visor, Glitch)
     ───────────────────────────────────────────────────────── */
  private buildCyberStatic(): void {
    // High tech-collar jacket
    this.bodyLayer
      .fill({ color: 0x0f1026 })
      .moveTo(-96, 195)
      .lineTo(-82, 68)
      .lineTo(-46, 48)
      .lineTo(46, 48)
      .lineTo(82, 68)
      .lineTo(96, 195)
      .closePath()
      // Neon cyber-circuit lapels
      .stroke({ color: 0xff003c, width: 3 })
      .moveTo(-68, 74)
      .lineTo(-34, 130)
      .lineTo(-34, 190)
      .moveTo(68, 74)
      .lineTo(34, 130)
      .lineTo(34, 190)
      // Inner cyber-mesh chest
      .fill({ color: 0x191b38 })
      .moveTo(-34, 82)
      .lineTo(0, 135)
      .lineTo(34, 82)
      .closePath()
      // Neck with chrome seams
      .fill({ color: 0xcbd5e1 })
      .roundRect(-24, 56, 48, 36, 10)
      .stroke({ color: 0x00f0ff, width: 1.5 })
      .moveTo(-14, 62)
      .lineTo(-14, 88)
      .moveTo(14, 62)
      .lineTo(14, 88);

    // Angular cyber-head
    this.headLayer
      .fill({ color: 0xdbeafe })
      .moveTo(-72, -62)
      .lineTo(72, -62)
      .lineTo(76, 14)
      .lineTo(46, 72)
      .lineTo(-46, 72)
      .lineTo(-76, 14)
      .closePath();

    // Cybernetic panel lines on cheeks
    this.faceExtrasLayer
      .stroke({ color: 0x94a3b8, width: 1.5 })
      .moveTo(-72, 16)
      .lineTo(-42, 26)
      .lineTo(-36, 56)
      .moveTo(72, 16)
      .lineTo(42, 26)
      .lineTo(36, 56)
      // Glowing cheek nodes
      .fill({ color: 0xff003c })
      .circle(-42, 26, 2.5)
      .circle(42, 26, 2.5);

    // Asymmetric neon-streaked hair
    this.frontHairLayer
      .fill({ color: 0x090a14 })
      .moveTo(-80, -18)
      .lineTo(-74, -84)
      .lineTo(-16, -104)
      .lineTo(54, -96)
      .lineTo(84, -46)
      .lineTo(64, -42)
      .lineTo(24, -68)
      .lineTo(-28, -44)
      .closePath()
      // Neon magenta/cyan hair streaks
      .fill({ color: 0xff003c })
      .moveTo(-48, -52)
      .lineTo(-18, -94)
      .lineTo(-4, -92)
      .lineTo(-26, -46)
      .closePath()
      .fill({ color: 0x00f0ff })
      .moveTo(10, -64)
      .lineTo(36, -90)
      .lineTo(48, -84)
      .lineTo(24, -56)
      .closePath();

    // Temple audio-implants
    this.accessoryLayer
      .fill({ color: 0x0f172a })
      .poly([-84, -16, -70, -24, -70, 18, -84, 10])
      .poly([84, -16, 70, -24, 70, 18, 84, 10])
      .fill({ color: 0x00f0ff })
      .rect(-81, -8, 5, 16)
      .rect(76, -8, 5, 16);
  }

  /* ─────────────────────────────────────────────────────────
     3. PIXEL: Retro 8-Bit Arcade Hero (Crisp Stepped Grid)
     ───────────────────────────────────────────────────────── */
  private buildPixelStatic(): void {
    const P = 8; // 8px virtual pixel unit
    const rect = (g: PIXI.Graphics, gx: number, gy: number, gw: number, gh: number, color: number) => {
      g.fill({ color }).rect(gx * P, gy * P, gw * P, gh * P);
    };

    // 8-Bit Armor / Tunic
    rect(this.bodyLayer, -10, 10, 20, 14, 0x059669);
    rect(this.bodyLayer, -8, 9, 16, 2, 0x10b981);
    rect(this.bodyLayer, -4, 10, 8, 14, 0x047857);
    // Gold pixel belt / trim
    rect(this.bodyLayer, -6, 12, 12, 2, 0xfbbf24);
    // Pixel Neck
    rect(this.bodyLayer, -3, 7, 6, 3, 0xf5c7a0);

    // Stepped Pixel Head
    rect(this.headLayer, -8, -8, 16, 15, 0xfcd5b4);
    rect(this.headLayer, -9, -6, 18, 11, 0xfcd5b4);
    // Pixel Ears
    rect(this.headLayer, -10, -2, 2, 4, 0xeab68c);
    rect(this.headLayer, 8, -2, 2, 4, 0xeab68c);
    // Pixel Blush
    rect(this.faceExtrasLayer, -7, 1, 2, 2, 0xf472b6);
    rect(this.faceExtrasLayer, 5, 1, 2, 2, 0xf472b6);

    // 8-Bit Arcade Cap & Hair
    rect(this.frontHairLayer, -9, -10, 18, 4, 0x7c2d12);
    rect(this.frontHairLayer, -10, -8, 3, 3, 0x7c2d12);
    rect(this.frontHairLayer, 7, -8, 3, 3, 0x7c2d12);
    // Pixel Cap (Red/White Arcade style)
    rect(this.accessoryLayer, -9, -13, 18, 4, 0xef4444);
    rect(this.accessoryLayer, -7, -14, 14, 2, 0xdc2626);
    rect(this.accessoryLayer, -5, -12, 12, 2, 0xfef08a); // Visor Brim
    // Pixel Headset Mic
    rect(this.accessoryLayer, -11, -3, 2, 5, 0x1e293b);
    rect(this.accessoryLayer, -10, 2, 4, 1, 0x38bdf8);
  }

  /* ─────────────────────────────────────────────────────────
     4. FUTURE: Mecha Synth Android (Hex Chassis, Antennas, LEDs)
     ───────────────────────────────────────────────────────── */
  private buildFutureStatic(): void {
    // Mecha shoulder pauldrons & chest core
    this.bodyLayer
      .fill({ color: 0x1e293b })
      .poly([-98, 96, -64, 72, 64, 72, 98, 96, 86, 195, -86, 195])
      .stroke({ color: 0x38bdf8, width: 2.5 })
      .poly([-98, 96, -64, 72, 64, 72, 98, 96, 86, 195, -86, 195])
      // Glowing arc reactor chest core
      .fill({ color: 0x0f172a })
      .circle(0, 132, 24)
      .fill({ color: 0x38bdf8, alpha: 0.85 })
      .circle(0, 132, 15)
      .fill({ color: 0xe0f2fe })
      .circle(0, 132, 7)
      // Hydraulic neck pistons
      .fill({ color: 0x475569 })
      .roundRect(-22, 56, 44, 34, 8)
      .stroke({ color: 0x94a3b8, width: 2 })
      .moveTo(-12, 58)
      .lineTo(-12, 86)
      .moveTo(0, 58)
      .lineTo(0, 86)
      .moveTo(12, 58)
      .lineTo(12, 86);

    // Octagonal Mecha Helmet
    this.headLayer
      .fill({ color: 0x334155 })
      .poly([-56, -82, 56, -82, 82, -46, 78, 36, 44, 72, -44, 72, -78, 36, -82, -46])
      .fill({ color: 0x0f172a })
      .poly([-48, -66, 48, -66, 68, -36, 64, 28, 36, 58, -36, 58, -64, 28, -68, -36])
      .stroke({ color: 0x60a5fa, width: 2 })
      .poly([-48, -66, 48, -66, 68, -36, 64, 28, 36, 58, -36, 58, -64, 28, -68, -36]);

    // Forehead telemetry crest
    this.frontHairLayer
      .fill({ color: 0x38bdf8 })
      .poly([-18, -76, 18, -76, 10, -54, -10, -54]);
  }

  /* ─────────────────────────────────────────────────────────
     5. DARK: Gothic Vampire / Shadow Lord (Cloak, Pointed Ears, Fangs)
     ───────────────────────────────────────────────────────── */
  private buildDarkStatic(): void {
    // High-collared Aristocratic Vampire Cloak
    this.backHairLayer
      .fill({ color: 0x18181b })
      .poly([-104, 25, -76, -42, 76, -42, 104, 25, 84, 115, -84, 115])
      .fill({ color: 0x881337 })
      .poly([-92, 32, -68, -30, 68, -30, 92, 32, 74, 108, -74, 108]);

    this.bodyLayer
      .fill({ color: 0x18181b })
      .roundRect(-88, 82, 176, 115, 36)
      // Crimson vest & gold medallion
      .fill({ color: 0x9f1239 })
      .poly([-34, 82, 34, 82, 0, 165])
      .fill({ color: 0xfbbf24 })
      .poly([0, 96, 10, 108, 0, 120, -10, 108])
      .fill({ color: 0xe11d48 })
      .circle(0, 108, 4.5)
      // Pale neck
      .fill({ color: 0xe2d9e8 })
      .roundRect(-22, 58, 44, 34, 12);

    // Pointed Elven/Vampire Ears & Sculpted Pale Head
    this.headLayer
      .fill({ color: 0xede9fe })
      // Left pointed ear
      .poly([-72, -8, -106, -28, -92, 10, -72, 18])
      // Right pointed ear
      .poly([72, -8, 106, -28, 92, 10, 72, 18])
      // Sculpted head with tapered chin
      .moveTo(-72, -56)
      .bezierCurveTo(-72, -92, 72, -92, 72, -56)
      .lineTo(68, 16)
      .quadraticCurveTo(52, 66, 0, 76)
      .quadraticCurveTo(-52, 66, -68, 16)
      .closePath();

    // Swept obsidian & silver-streaked hair
    this.frontHairLayer
      .fill({ color: 0x09090b })
      .moveTo(-76, -16)
      .bezierCurveTo(-86, -82, -38, -108, 0, -102)
      .bezierCurveTo(38, -108, 86, -82, 76, -16)
      .lineTo(58, -54)
      .lineTo(18, -38)
      .lineTo(0, -18) // Widow's peak
      .lineTo(-18, -38)
      .lineTo(-58, -54)
      .closePath()
      // Silver hair lock
      .fill({ color: 0xe4e4e7, alpha: 0.85 })
      .moveTo(-8, -88)
      .lineTo(8, -88)
      .lineTo(0, -22)
      .closePath();
  }

  /* ─────────────────────────────────────────────────────────
     DYNAMIC FACE RENDERING (Eyes, Blink, Visemes, Voice Glow)
     ───────────────────────────────────────────────────────── */
  private drawDynamicFace(): void {
    const style = this.getAvatarStyle();
    const blink = this.blinkState.open;
    const vol = this.smoothedVolume;

    this.leftEyeLayer.clear();
    this.rightEyeLayer.clear();
    this.mouthLayer.clear();

    if (style === 'pixel') {
      this.drawPixelDynamic(blink, vol);
      return;
    }

    if (style === 'cyber') {
      this.drawCyberDynamic(blink, vol);
      return;
    }

    if (style === 'future') {
      this.drawFutureDynamic(blink, vol);
      return;
    }

    // Shared expressive eyes for 'default' and 'dark'
    const isDark = style === 'dark';
    const irisColor = isDark ? 0xe11d48 : 0x6d28d9;
    const browColor = isDark ? 0x18181b : 0x3b2822;
    const browLift = vol * 6;

    for (const side of [-1, 1] as const) {
      const g = side === -1 ? this.leftEyeLayer : this.rightEyeLayer;
      const ex = side * 30;
      const ey = -10;

      // Eyebrow
      g.stroke({ color: browColor, width: 4 })
        .moveTo(ex - 16, ey - 22 - browLift + (isDark ? side * -2 : 0))
        .quadraticCurveTo(ex, ey - 27 - browLift, ex + 16, ey - 20 - browLift + (isDark ? side * 3 : 0));

      if (blink < 0.18) {
        // Closed eye line
        g.stroke({ color: browColor, width: 3.5 })
          .moveTo(ex - 14, ey + 2)
          .quadraticCurveTo(ex, ey + 7, ex + 14, ey + 2);
      } else {
        // Sclera
        g.fill({ color: isDark ? 0xfce7f3 : 0xffffff })
          .ellipse(ex, ey, 15, 17 * blink);
        // Iris
        g.fill({ color: irisColor })
          .ellipse(ex, ey + 1, 9.5, 11.5 * blink);
        // Pupil
        g.fill({ color: 0x09090b })
          .ellipse(ex, ey + 1, 5, 6 * blink);
        // Catchlight
        g.fill({ color: 0xffffff })
          .circle(ex + 4, ey - 4 * blink, 3.2)
          .circle(ex - 3, ey + 3 * blink, 1.5);
      }
    }

    // Mouth for 'default' and 'dark'
    const my = 34;
    const mw = this.curMouthW;
    const mh = this.curMouthH;

    if (mh <= 6) {
      // Gentle closed smile or narrow line
      this.mouthLayer
        .stroke({ color: isDark ? 0x881337 : 0x7c2d12, width: 3.5 })
        .moveTo(-mw / 2, my - 1)
        .quadraticCurveTo(0, my + 4, mw / 2, my - 1);
    } else {
      // Open mouth cavity
      this.mouthLayer.fill({ color: isDark ? 0x4c0519 : 0x6b1d2f });
      if (MOUTH_SHAPES[this.currentViseme].round) {
        this.mouthLayer.ellipse(0, my, mw / 2, mh / 2);
      } else {
        this.mouthLayer.roundRect(-mw / 2, my - mh / 2, mw, mh, Math.min(mw, mh) * 0.4);
      }

      // Tongue
      if (mh > 12) {
        this.mouthLayer
          .fill({ color: isDark ? 0xbe123c : 0xf43f5e })
          .ellipse(0, my + mh * 0.22, mw * 0.34, mh * 0.24);
      }

      // Vampire fangs for 'dark', or upper teeth bar for 'default'
      if (isDark && mh > 10) {
        this.mouthLayer
          .fill({ color: 0xffffff })
          .poly([-mw * 0.28, my - mh * 0.42, -mw * 0.14, my - mh * 0.42, -mw * 0.21, my - mh * 0.05])
          .poly([mw * 0.14, my - mh * 0.42, mw * 0.28, my - mh * 0.42, mw * 0.21, my - mh * 0.05]);
      } else if (!isDark && mh > 14) {
        this.mouthLayer
          .fill({ color: 0xffffff })
          .roundRect(-mw * 0.34, my - mh * 0.44, mw * 0.68, 5, 2);
      }
    }
  }

  private drawCyberDynamic(blink: number, vol: number): void {
    // Illuminated Holographic Visor across eyes
    const visorGlow = 0.65 + vol * 0.35;
    this.leftEyeLayer
      .fill({ color: 0x050814 })
      .poly([-68, -24, 68, -24, 60, 4, -60, 4])
      .stroke({ color: 0x00f0ff, width: 2.5, alpha: visorGlow })
      .poly([-68, -24, 68, -24, 60, 4, -60, 4]);

    // Glowing digital eyes inside visor
    const eyeH = Math.max(2, 12 * blink);
    this.rightEyeLayer
      .fill({ color: 0x00f0ff, alpha: visorGlow })
      .roundRect(-44, -10 - eyeH / 2, 26, eyeH, 3)
      .roundRect(18, -10 - eyeH / 2, 26, eyeH, 3);

    // Neon Equalizer / Cyber Mouth
    const my = 36;
    const mw = this.curMouthW * 1.15;
    const mh = this.curMouthH;
    this.mouthLayer
      .fill({ color: 0x090d16 })
      .roundRect(-mw / 2 - 4, my - mh / 2 - 3, mw + 8, mh + 6, 6)
      .stroke({ color: 0xff003c, width: 2.2 })
      .roundRect(-mw / 2 - 4, my - mh / 2 - 3, mw + 8, mh + 6, 6);

    // Equalizer bars inside mouth
    const bars = 5;
    const barW = 4;
    const gap = (mw - bars * barW) / (bars + 1);
    for (let i = 0; i < bars; i++) {
      const distFromCenter = Math.abs(i - 2) / 2;
      const barH = Math.max(3, (mh - 4) * (1 - distFromCenter * 0.45));
      const bx = -mw / 2 + gap + i * (barW + gap);
      this.mouthLayer
        .fill({ color: i === 2 ? 0x00f0ff : 0xff003c })
        .roundRect(bx, my - barH / 2, barW, barH, 2);
    }
  }

  private drawFutureDynamic(blink: number, vol: number): void {
    // Lateral antennas that pulse with voice volume
    this.accessoryLayer
      .clear()
      .fill({ color: 0x475569 })
      .rect(-90, -24, 10, 36)
      .rect(80, -24, 10, 36)
      .stroke({ color: 0x94a3b8, width: 4 })
      .moveTo(-85, -24)
      .lineTo(-85, -68)
      .moveTo(85, -24)
      .lineTo(85, -68)
      .fill({ color: vol > 0.05 ? 0x38bdf8 : 0x64748b })
      .circle(-85, -72, 6 + vol * 4)
      .circle(85, -72, 6 + vol * 4);

    // LED Optics
    const eyeH = Math.max(2, 18 * blink);
    for (const side of [-1, 1] as const) {
      const ex = side * 28;
      this.leftEyeLayer
        .fill({ color: 0x38bdf8 })
        .roundRect(ex - 14, -14 - eyeH / 2, 28, eyeH, 6)
        .fill({ color: 0xe0f2fe })
        .roundRect(ex - 8, -14 - eyeH * 0.25, 16, eyeH * 0.5, 3);
    }

    // Vocoder LED Matrix Mouth
    const my = 32;
    const segments = 7;
    const totalW = 62;
    const segW = 6;
    const step = (totalW - segW) / (segments - 1);
    for (let i = 0; i < segments; i++) {
      const centerWeight = 1 - Math.abs(i - 3) / 3.5;
      const segH = Math.max(4, this.curMouthH * centerWeight);
      const sx = -totalW / 2 + i * step;
      this.mouthLayer
        .fill({ color: this.curOpenFactor > 0.1 ? 0x38bdf8 : 0x1e40af })
        .roundRect(sx, my - segH / 2, segW, segH, 2);
    }
  }

  private drawPixelDynamic(blink: number, _vol: number): void {
    const P = 8;
    const rect = (g: PIXI.Graphics, gx: number, gy: number, gw: number, gh: number, color: number) => {
      g.fill({ color }).rect(gx * P, gy * P, gw * P, gh * P);
    };

    // Pixel Eyes
    if (blink < 0.2) {
      rect(this.leftEyeLayer, -5, -2, 3, 1, 0x1e293b);
      rect(this.rightEyeLayer, 2, -2, 3, 1, 0x1e293b);
    } else {
      rect(this.leftEyeLayer, -5, -3, 3, 3, 0x0f172a);
      rect(this.leftEyeLayer, -5, -3, 1, 1, 0xffffff);
      rect(this.rightEyeLayer, 2, -3, 3, 3, 0x0f172a);
      rect(this.rightEyeLayer, 2, -3, 1, 1, 0xffffff);
    }

    // Stepped Pixel Mouth based on viseme
    const v = this.currentViseme;
    if (v === 'closed' || v === 'narrow') {
      rect(this.mouthLayer, -2, 3, 4, 1, 0x7c2d12);
    } else if (v === 'slight' || v === 'small') {
      rect(this.mouthLayer, -2, 3, 4, 2, 0x7c2d12);
      rect(this.mouthLayer, -1, 4, 2, 1, 0xf43f5e);
    } else if (v === 'round') {
      rect(this.mouthLayer, -2, 2, 4, 4, 0x450a0a);
      rect(this.mouthLayer, -1, 4, 2, 2, 0xf43f5e);
    } else {
      // open / wide
      rect(this.mouthLayer, -3, 2, 6, 4, 0x450a0a);
      rect(this.mouthLayer, -2, 2, 4, 1, 0xffffff);
      rect(this.mouthLayer, -2, 4, 4, 2, 0xf43f5e);
    }
  }

  private onTick(): void {
    if (this.isDestroyed || !this.app) return;
    const dt = this.app.ticker.deltaMS || 16;
    this.elapsedMs += dt;

    // Smooth volume & mouth dimensions
    this.smoothedVolume += (this.currentVolume - this.smoothedVolume) * 0.25;
    const targetMouth = MOUTH_SHAPES[this.currentViseme];
    const dynamicBoost = 1 + this.smoothedVolume * 0.35;
    this.curMouthW += (targetMouth.w * dynamicBoost - this.curMouthW) * 0.32;
    this.curMouthH += (targetMouth.h * dynamicBoost - this.curMouthH) * 0.32;
    this.curOpenFactor += (targetMouth.openFactor - this.curOpenFactor) * 0.3;

    // Natural blink cycle
    this.blinkState.timer += dt;
    if (this.blinkState.timer >= this.blinkState.nextBlink) {
      this.blinkState.target = 0.05;
      if (this.blinkState.timer >= this.blinkState.nextBlink + 130) {
        this.blinkState.target = 1;
        this.blinkState.timer = 0;
        this.blinkState.nextBlink = 2200 + Math.random() * 3600;
      }
    }
    this.blinkState.open += (this.blinkState.target - this.blinkState.open) * 0.42;

    // Subtle idle breathing + voice-reactive head bounce
    const breathY = Math.sin(this.elapsedMs * 0.0028) * 2.5;
    const talkBounceY = -this.smoothedVolume * 9;
    const talkTilt = Math.sin(this.elapsedMs * 0.01) * this.smoothedVolume * 0.04;

    this.characterContainer.position.y = breathY + talkBounceY;
    this.headGroup.rotation = talkTilt;

    this.drawDynamicFace();
  }

  private applyTransform(): void {
    const renderer = this.app?.renderer;
    if (!renderer) return;

    const { width, height } = renderer;
    const baseFit = Math.min(width, height) / 360;
    const scale = this.config.scale * baseFit;

    this.rootContainer.scale.set(this.config.flipX ? -scale : scale, scale);
    this.rootContainer.position.set(
      width / 2 + this.config.offsetX * width,
      height / 2 + this.config.offsetY * height,
    );
  }

  private hexToNumber(hex: string): number {
    const cleaned = hex.replace('#', '');
    return parseInt(cleaned, 16) || 0x00ff00;
  }
}
