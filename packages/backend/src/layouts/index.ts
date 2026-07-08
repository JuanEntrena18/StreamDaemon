import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { LayoutSaveSchema, LayoutUpdateSchema } from '@streamdaemon/shared';
import type { Layout } from '@streamdaemon/shared';

const DATA_DIR = path.join(process.env.DATA_DIR || path.resolve('data'), 'layouts');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function listLayouts(): Layout[] {
  ensureDir();
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    try {
      return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')) as Layout;
    } catch { return null; }
  }).filter(Boolean) as Layout[];
}

function getLayout(id: string): Layout | null {
  ensureDir();
  const file = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as Layout;
  } catch { return null; }
}

function saveLayoutFile(layout: Layout) {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, `${layout.id}.json`), JSON.stringify(layout, null, 2));
}

function deleteLayoutFile(id: string) {
  const file = path.join(DATA_DIR, `${id}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function generateId(): string {
  return `layout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateWidgetHtml(widget: Layout['widgets'][0]): string {
  const { type, x, y, width, height, zIndex, opacity, config } = widget;
  const baseStyle = `position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;z-index:${zIndex};opacity:${opacity}`;
  const bg = config.backgroundColor || 'transparent';
  const border = config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#fff'}` : 'none';
  const radius = config.borderRadius ? `${config.borderRadius}px` : '0';
  const font = config.fontFamily ? `font-family:${config.fontFamily};` : '';
  const size = config.fontSize ? `font-size:${config.fontSize}px;` : '';
  const color = config.textColor ? `color:${config.textColor};` : '';

  const animClass = config.animation && config.animation !== 'none' ? `anim-${config.animation}` : '';

  switch (type) {
    case 'text':
      return `<div class="widget ${animClass}" style="${baseStyle};background:${bg};border:${border};border-radius:${radius};${font}${size}${color}padding:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;text-align:center"><span>${config.textContent || 'Text'}</span></div>`;
    case 'image':
      return `<div class="widget ${animClass}" style="${baseStyle};background:${bg};border:${border};border-radius:${radius};overflow:hidden"><img src="${config.imageSrc || ''}" style="width:100%;height:100%;object-fit:contain" alt="image" /></div>`;
    case 'shape':
      const shapeStyle = config.shape === 'circle'
        ? `border-radius:50%;background:${bg};border:${border}`
        : config.shape === 'rounded'
          ? `border-radius:12px;background:${bg};border:${border}`
          : `background:${bg};border:${border}`;
      return `<div class="widget ${animClass}" style="${baseStyle};${shapeStyle}"></div>`;
    case 'chat':
      return `<div class="widget ${animClass}" style="${baseStyle};background:${bg};border:${border};border-radius:${radius};${font}${size}${color}overflow:hidden;display:flex;flex-direction:column;padding:8px"><div style="flex:1;overflow-y:auto;padding:4px"><div style="margin-bottom:6px;display:flex;align-items:center;gap:6px"><span style="font-weight:bold;color:#9147ff">StreamDaemonBot</span><span style="color:#aaa">:</span><span>Welcome to the stream!</span></div><div style="margin-bottom:6px;display:flex;align-items:center;gap:6px"><span style="font-weight:bold;color:#00ff00">Viewer1</span><span style="color:#aaa">:</span><span>Hey! Great stream</span></div></div></div>`;
    case 'hud':
      return `<div class="widget ${animClass}" style="${baseStyle};background:${bg};border:${border};border-radius:${radius};${font}${color}display:flex;align-items:center;justify-content:center;gap:16px;padding:8px"><div style="text-align:center"><div style="font-size:24px;font-weight:bold">1,234</div><div style="font-size:11px;opacity:.7">VIEWERS</div></div><div style="text-align:center"><div style="font-size:24px;font-weight:bold">567</div><div style="font-size:11px;opacity:.7">FOLLOWERS</div></div></div>`;
    case 'timer':
      return `<div class="widget ${animClass}" style="${baseStyle};background:${bg};border:${border};border-radius:${radius};${font}${color}display:flex;align-items:center;justify-content:center;flex-direction:column"><div style="font-size:36px;font-weight:bold;font-variant-numeric:tabular-nums">12:34</div></div>`;
    case 'scoreboard':
      return `<div class="widget ${animClass}" style="${baseStyle};background:${bg};border:${border};border-radius:${radius};${font}${color}display:flex;flex-direction:column;padding:8px"><div style="display:flex;justify-content:space-between;padding:4px 0"><span>Team A</span><span>3</span></div><div style="display:flex;justify-content:space-between;padding:4px 0"><span>Team B</span><span>1</span></div></div>`;
    case 'alertbox':
      return `<div class="widget ${animClass}" style="${baseStyle};background:${bg};border:${border};border-radius:${radius};${font}${size}${color}display:flex;align-items:center;justify-content:center;flex-direction:column;padding:12px;text-align:center"><div style="font-size:1.5em;margin-bottom:4px">🎉</div><div style="font-weight:bold">New Follower!</div><div style="font-size:.85em;opacity:.8">StreamDaemonBot</div></div>`;
    case 'webcam':
      return `<div class="widget ${animClass}" style="${baseStyle};background:#1a1a2e;border:${border};border-radius:${radius};display:flex;align-items:center;justify-content:center;overflow:hidden"><svg viewBox="0 0 100 100" style="width:50%;height:50%;opacity:.3"><circle cx="50" cy="35" r="20" fill="none" stroke="#666" stroke-width="3"/><ellipse cx="50" cy="80" rx="35" ry="25" fill="none" stroke="#666" stroke-width="3"/></svg></div>`;
    case 'social':
      const links = config.socialLinks || [];
      return `<div class="widget ${animClass}" style="${baseStyle};background:${bg};border:${border};border-radius:${radius};${font}${size}${color}display:flex;align-items:center;justify-content:center;gap:12px;padding:8px;flex-wrap:wrap">${
        links.length ? links.map(l => `<a href="${l.url}" target="_blank" style="color:${config.textColor || '#fff'};text-decoration:none;padding:4px 8px;background:rgba(255,255,255,.1);border-radius:4px;font-size:14px">${l.platform}</a>`).join('') : '<span style="opacity:.5">Social Links</span>'
      }</div>`;
    default:
      return `<div class="widget" style="${baseStyle};background:#333;border:1px dashed #666;display:flex;align-items:center;justify-content:center;font-size:12px;color:#999">${type}</div>`;
  }
}

function generateHtml(layout: Layout, backendUrl: string): string {
  const widgetHtml = layout.widgets
    .filter(w => w.visible)
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(generateWidgetHtml)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${layout.name}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${layout.resolution.width}px; height:${layout.resolution.height}px; overflow:hidden; background:${layout.backgroundColor}; font-family:'Inter',Arial,sans-serif; }
.widget { pointer-events:none; }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes slideUp { from { transform:translateY(20px); opacity:0; } to { transform:translateY(0); opacity:1; } }
@keyframes slideLeft { from { transform:translateX(20px); opacity:0; } to { transform:translateX(0); opacity:1; } }
@keyframes bounceIn { 0% { transform:scale(.3); opacity:0; } 50% { transform:scale(1.05); } 70% { transform:scale(.9); } 100% { transform:scale(1); opacity:1; } }
@keyframes glitch { 0% { transform:translate(0); } 20% { transform:translate(-2px,2px); } 40% { transform:translate(2px,-2px); } 60% { transform:translate(-1px,-1px); } 80% { transform:translate(1px,1px); } 100% { transform:translate(0); } }
.anim-fadeIn { animation:fadeIn .5s ease-out; }
.anim-slideUp { animation:slideUp .5s ease-out; }
.anim-slideLeft { animation:slideLeft .5s ease-out; }
.anim-bounceIn { animation:bounceIn .6s ease-out; }
.anim-glitch { animation:glitch .3s ease-in-out 3; }
</style>
</head>
<body>
${widgetHtml}
<script>
(function() {
  var ws = null;
  var backendUrl = '${backendUrl}';
  function connect() {
    try {
      ws = new WebSocket(backendUrl);
      ws.onmessage = function(e) {
        try {
          var msg = JSON.parse(e.data);
          // Widget live updates handled via layout-specific logic
          window.dispatchEvent(new CustomEvent('sf:message', { detail: msg }));
        } catch(err) {}
      };
      ws.onclose = function() { setTimeout(connect, 5000); };
    } catch(err) { setTimeout(connect, 5000); }
  }
  connect();
})();
</script>
</body>
</html>`;
}

export function setupLayouts(app: FastifyInstance) {
  ensureDir();

  // List all layouts
  app.get('/layouts', async () => {
    return listLayouts().map(l => ({
      id: l.id,
      name: l.name,
      resolution: l.resolution,
      backgroundColor: l.backgroundColor,
      widgetCount: l.widgets.length,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));
  });

  // Get single layout
  app.get('/layouts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const layout = getLayout(id);
    if (!layout) return reply.status(404).send({ error: 'Layout not found' });
    return layout;
  });

  // Save new layout
  app.post('/layouts/save', async (req, reply) => {
    const parsed = LayoutSaveSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });

    const layout: Layout = {
      id: generateId(),
      name: parsed.data.name,
      widgets: parsed.data.widgets,
      resolution: parsed.data.resolution,
      backgroundColor: parsed.data.backgroundColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveLayoutFile(layout);
    return layout;
  });

  // Update layout
  app.put('/layouts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = getLayout(id);
    if (!existing) return reply.status(404).send({ error: 'Layout not found' });

    const parsed = LayoutUpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });

    const updated: Layout = {
      ...existing,
      ...parsed.data,
      updatedAt: Date.now(),
    };
    saveLayoutFile(updated);
    return updated;
  });

  // Delete layout
  app.delete('/layouts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!getLayout(id)) return reply.status(404).send({ error: 'Layout not found' });
    deleteLayoutFile(id);
    return { ok: true };
  });

  // Export as HTML
  app.get('/layouts/:id/html', async (req, reply) => {
    const { id } = req.params as { id: string };
    const layout = getLayout(id);
    if (!layout) return reply.status(404).send({ error: 'Layout not found' });

    const backendUrl = (req.query as { backend?: string }).backend || 'ws://localhost:3000';
    const html = generateHtml(layout, backendUrl);
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return reply.send(html);
  });
}
