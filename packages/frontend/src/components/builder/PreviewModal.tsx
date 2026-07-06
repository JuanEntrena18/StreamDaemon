import { useBuilder } from './OverlayBuilderContext';

export function PreviewModal({ onClose }: { onClose: () => void }) {
  const { state } = useBuilder();
  const { resolution, backgroundColor, widgets, layoutName } = state;

  const widgetHtml = widgets
    .filter(w => w.visible)
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(w => {
      const { type, x, y, width, height, zIndex, opacity, config } = w;
      const bg = config.backgroundColor || 'transparent';
      const border = config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#fff'}` : 'none';
      const radius = config.borderRadius ? `${config.borderRadius}px` : '0';
      const font = config.fontFamily ? `font-family:${config.fontFamily};` : '';
      const size = config.fontSize ? `font-size:${config.fontSize}px;` : '';
      const color = config.textColor ? `color:${config.textColor};` : '';
      const anim = config.animation && config.animation !== 'none' ? `sf-preview-${config.animation}` : '';

      const content = (() => {
        switch (type) {
          case 'text': return `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:8px;text-align:center;overflow:hidden"><span class="${anim}">${config.textContent || 'Text'}</span></div>`;
          case 'chat': return `<div style="display:flex;flex-direction:column;height:100%;padding:8px;overflow:hidden"><div style="flex:1;overflow:auto"><div style="margin-bottom:6px;display:flex;gap:6px"><b style="color:#9147ff">StreamDaemonBot:</b><span>Welcome!</span></div><div style="margin-bottom:6px;display:flex;gap:6px"><b style="color:#0f0">Viewer1:</b><span>Great stream!</span></div></div></div>`;
          case 'hud': return `<div style="display:flex;align-items:center;justify-content:center;gap:16px;height:100%;padding:4px 12px"><div class="${anim}" style="text-align:center"><div style="font-size:1.3em;font-weight:700">1,234</div><div style="font-size:.7em;opacity:.7">VIEWERS</div></div><div class="${anim}" style="text-align:center"><div style="font-size:1.3em;font-weight:700">567</div><div style="font-size:.7em;opacity:.7">FOLLOWERS</div></div></div>`;
          case 'timer': return `<div style="display:flex;align-items:center;justify-content:center;height:100%"><span class="${anim}" style="font-family:monospace;font-variant-numeric:tabular-nums;font-size:36px;font-weight:700">12:34</span></div>`;
          case 'scoreboard': return `<div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:12px"><div class="${anim}" style="display:flex;justify-content:space-between;padding:4px 0"><span>Team A</span><b>3</b></div><div class="${anim}" style="display:flex;justify-content:space-between;padding:4px 0"><span>Team B</span><b>1</b></div></div>`;
          case 'alertbox': return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:12px;text-align:center"><div class="${anim}"><div style="font-size:28px;margin-bottom:4px">🎉</div></div><div class="${anim}" style="font-weight:700">New Follower!</div><div class="${anim}" style="font-size:.85em;opacity:.8">StreamDaemonBot</div></div>`;
          case 'image': return config.imageSrc ? `<div style="display:flex;align-items:center;justify-content:center;height:100%;overflow:hidden"><img src="${config.imageSrc}" class="${anim}" style="width:100%;height:100%;object-fit:contain"/></div>` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;font-size:12px">No image</div>`;
          case 'shape': return `<div class="${anim}" style="width:100%;height:100%;background:${bg};border:${border};${config.shape === 'circle' ? 'border-radius:50%' : config.shape === 'rounded' ? 'border-radius:12px' : ''}"></div>`;
          case 'webcam': return `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#1a1a2e"><svg viewBox="0 0 100 100" style="width:50%;height:50%;opacity:.3"><circle cx="50" cy="35" r="20" fill="none" stroke="#666" stroke-width="3"/><ellipse cx="50" cy="80" rx="35" ry="25" fill="none" stroke="#666" stroke-width="3"/></svg></div>`;
          case 'social': return `<div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;height:100%;padding:8px">${(config.socialLinks || []).length ? (config.socialLinks || []).map(l => `<span class="${anim}" style="padding:4px 10px;background:rgba(255,255,255,.1);border-radius:4px;color:${color || '#fff'};font-size:13px">${l.platform}</span>`).join('') : `<span class="${anim}" style="opacity:.5;color:${color || '#fff'};font-size:13px">Social Links</span>`}</div>`;
          default: return '';
        }
      })();

      return `<div style="position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;z-index:${zIndex};opacity:${opacity};background:${bg};border:${border};border-radius:${radius};overflow:hidden;${font}${size}${color}">${content}</div>`;
    }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${layoutName} Preview</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${resolution.width}px;height:${resolution.height}px;overflow:hidden;background:${backgroundColor};font-family:'Inter',Arial,sans-serif}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes slideLeft{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes bounceIn{0%{transform:scale(.3);opacity:0}50%{transform:scale(1.05)}70%{transform:scale(.9)}100%{transform:scale(1);opacity:1}}
@keyframes glitch{0%{transform:translate(0)}20%{transform:translate(-2px,2px)}40%{transform:translate(2px,-2px)}60%{transform:translate(-1px,-1px)}80%{transform:translate(1px,1px)}100%{transform:translate(0)}}
.sf-preview-fadeIn{animation:fadeIn .5s ease-out}
.sf-preview-slideUp{animation:slideUp .5s ease-out}
.sf-preview-slideLeft{animation:slideLeft .5s ease-out}
.sf-preview-bounceIn{animation:bounceIn .6s ease-out}
.sf-preview-glitch{animation:glitch .3s ease-in-out 3}
</style></head><body>${widgetHtml}</body></html>`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
    }} onClick={onClose}>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#fff', fontSize: '.85rem', fontWeight: 600 }}>Preview: {layoutName}</span>
        <span style={{ color: 'rgba(255,255,255,.5)', fontSize: '.78rem' }}>{resolution.width}×{resolution.height}</span>
        <button onClick={onClose} style={{
          padding: '6px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,.2)',
          background: 'rgba(255,255,255,.1)', color: '#fff', cursor: 'pointer', fontSize: '.8rem',
        }}>Close (ESC)</button>
      </div>
      <div style={{
        width: Math.min(resolution.width, window.innerWidth * 0.9),
        height: Math.min(resolution.height, window.innerHeight * 0.85),
        overflow: 'hidden', borderRadius: 8, boxShadow: '0 8px 60px rgba(0,0,0,.7)',
      }} onClick={e => e.stopPropagation()}>
        <iframe
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none', background: backgroundColor }}
          title="Preview"
        />
      </div>
    </div>
  );
}
