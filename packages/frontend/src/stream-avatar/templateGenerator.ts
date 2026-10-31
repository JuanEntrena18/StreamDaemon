import { apiFetch } from '../utils/api.js';

export type RequiredLayerName =
  | 'body.png'
  | 'eyes-open.png'
  | 'eyes-closed.png'
  | 'mouth-closed.png'
  | 'mouth-slight.png'
  | 'mouth-open.png'
  | 'mouth-wide.png'
  | 'mouth-round.png';

const CANVAS_SIZE = 512;

function createCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  return [canvas, ctx];
}

function drawBodyLayer(ctx: CanvasRenderingContext2D): void {
  // Subtle registration corner marks (4px) so artists can align layers easily
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, CANVAS_SIZE - 32, CANVAS_SIZE - 32);

  // Shoulders / hoodie
  ctx.fillStyle = '#1e1b4b';
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(106, 336, 300, 150, 48);
  ctx.fill();
  ctx.stroke();

  // Neck
  ctx.fillStyle = '#e2b897';
  ctx.beginPath();
  ctx.roundRect(228, 296, 56, 56, 14);
  ctx.fill();

  // Ears
  ctx.fillStyle = '#f3cfb3';
  ctx.strokeStyle = '#c09070';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(132, 224, 22, 0, Math.PI * 2);
  ctx.arc(380, 224, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head base (without eyes or mouth — those go on separate transparent layers!)
  ctx.fillStyle = '#f8d8be';
  ctx.strokeStyle = '#c09070';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(140, 108, 232, 208, 96);
  ctx.fill();
  ctx.stroke();

  // Cheek blush
  ctx.fillStyle = 'rgba(244, 114, 182, 0.32)';
  ctx.beginPath();
  ctx.ellipse(178, 242, 18, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(334, 242, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair / Crown
  ctx.fillStyle = '#312e81';
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(136, 184);
  ctx.quadraticCurveTo(148, 86, 256, 86);
  ctx.quadraticCurveTo(364, 86, 376, 184);
  ctx.quadraticCurveTo(318, 134, 256, 148);
  ctx.quadraticCurveTo(194, 134, 136, 184);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawEyesOpenLayer(ctx: CanvasRenderingContext2D): void {
  // Eyebrows
  ctx.strokeStyle = '#312e81';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(182, 182);
  ctx.quadraticCurveTo(204, 174, 226, 180);
  ctx.moveTo(286, 180);
  ctx.quadraticCurveTo(308, 174, 330, 182);
  ctx.stroke();

  // Sclera
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1e1b4b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(204, 212, 22, 20, 0, 0, Math.PI * 2);
  ctx.ellipse(308, 212, 22, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Iris
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(204, 213, 12, 0, Math.PI * 2);
  ctx.arc(308, 213, 12, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(204, 213, 6, 0, Math.PI * 2);
  ctx.arc(308, 213, 6, 0, Math.PI * 2);
  ctx.fill();

  // Catchlights
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(209, 207, 4, 0, Math.PI * 2);
  ctx.arc(313, 207, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawEyesClosedLayer(ctx: CanvasRenderingContext2D): void {
  // Eyebrows slightly relaxed
  ctx.strokeStyle = '#312e81';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(182, 186);
  ctx.quadraticCurveTo(204, 180, 226, 184);
  ctx.moveTo(286, 184);
  ctx.quadraticCurveTo(308, 180, 330, 186);
  ctx.stroke();

  // Closed eyelids curve
  ctx.strokeStyle = '#1e1b4b';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(182, 214);
  ctx.quadraticCurveTo(204, 226, 226, 214);
  ctx.moveTo(286, 214);
  ctx.quadraticCurveTo(308, 226, 330, 214);
  ctx.stroke();
}

function drawMouthLayer(
  ctx: CanvasRenderingContext2D,
  mode: 'closed' | 'slight' | 'open' | 'wide' | 'round',
): void {
  const cx = 256;
  const cy = 268;

  ctx.strokeStyle = '#4c1d3d';
  ctx.fillStyle = '#881337';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';

  if (mode === 'closed') {
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy);
    ctx.quadraticCurveTo(cx, cy + 7, cx + 24, cy);
    ctx.stroke();
    return;
  }

  if (mode === 'slight') {
    ctx.beginPath();
    ctx.roundRect(cx - 22, cy - 6, 44, 14, 7);
    ctx.fill();
    ctx.stroke();
    return;
  }

  if (mode === 'open') {
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 28, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tongue
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 16, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Upper teeth
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cx - 18, cy - 16, 36, 8, 3);
    ctx.fill();
    return;
  }

  if (mode === 'wide') {
    ctx.beginPath();
    ctx.roundRect(cx - 36, cy - 12, 72, 26, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cx - 26, cy - 10, 52, 7, 3);
    ctx.fill();

    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 7, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // round ('O' / 'U')
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 18, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fb7185';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function generateTemplateFiles(): Record<RequiredLayerName, string> {
  const layers: Array<[RequiredLayerName, (ctx: CanvasRenderingContext2D) => void]> = [
    ['body.png', drawBodyLayer],
    ['eyes-open.png', drawEyesOpenLayer],
    ['eyes-closed.png', drawEyesClosedLayer],
    ['mouth-closed.png', (c) => drawMouthLayer(c, 'closed')],
    ['mouth-slight.png', (c) => drawMouthLayer(c, 'slight')],
    ['mouth-open.png', (c) => drawMouthLayer(c, 'open')],
    ['mouth-wide.png', (c) => drawMouthLayer(c, 'wide')],
    ['mouth-round.png', (c) => drawMouthLayer(c, 'round')],
  ];

  const out = {} as Record<RequiredLayerName, string>;
  for (const [name, drawer] of layers) {
    const [canvas, ctx] = createCanvas();
    drawer(ctx);
    out[name] = canvas.toDataURL('image/png');
  }
  return out;
}

const TEMPLATE_README = `====================================================================
STREAMDAEMON — GUIA Y PLANTILLA DE AVATAR PERSONALIZADO (PNGTUBER)
====================================================================

1. DIMENSIONES DEL LIENZO
-------------------------
- Tamano recomendado: 512x512 px o 1024x1024 px (proporcion 1:1 cuadrada).
- Formato: PNG de 32 bits con fondo transparente (canal Alfa).
- REGLA DE ORO: Exporta los 8 archivos con EXACTAMENTE el mismo tamano de
  lienzo (por ejemplo, todos a 512x512 px) para que los ojos y la boca
  encajen automaticamente en su posicion exacta sobre la cara.

2. ORDEN DE APILAMIENTO (CAPAS DE ABAJO HACIA ARRIBA)
-----------------------------------------------------
  [Capa 3 - Superior] : Ojos      -> eyes-open.png / eyes-closed.png
  [Capa 2 - Media]    : Boca      -> mouth-*.png (segun el fonema/volumen)
  [Capa 1 - Base]     : Cuerpo    -> body.png (torso, cabeza, pelo, SIN ojos ni boca)

3. LOS 8 ARCHIVOS REQUERIDOS EN TU .ZIP
---------------------------------------
  1. body.png          -> Cuerpo, ropa, cabeza y pelo (sin ojos ni boca).
  2. eyes-open.png     -> Ojos abiertos (estado normal).
  3. eyes-closed.png   -> Ojos cerrados (parpadeo automatico cada 2-6 seg).
  4. mouth-closed.png  -> Boca cerrada en silencio o consonantes M / B / P.
  5. mouth-slight.png  -> Boca entreabierta para murmullos o volumen bajo.
  6. mouth-open.png    -> Boca abierta amplia para vocales abiertas (A).
  7. mouth-wide.png    -> Boca estirada horizontalmente para sonrisas y vocales (E / I).
  8. mouth-round.png   -> Boca redondeada para vocales labiales (O / U).

4. COMO EMPAQUETAR Y SUBIR
--------------------------
- Selecciona los 8 archivos PNG y comprimelos en un archivo .zip.
- Sube el archivo .zip desde la seccion "Avatar en Directo" de StreamDaemon.
`;

export async function downloadAvatarTemplateZip(): Promise<void> {
  const files = generateTemplateFiles();
  const res = await apiFetch('/stream-avatar/template-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, readme: TEMPLATE_README }),
  });

  if (!res.ok) {
    throw new Error('Failed to generate template ZIP');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'streamdaemon-avatar-template.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

