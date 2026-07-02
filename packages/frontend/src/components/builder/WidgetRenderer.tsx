import type { Widget } from '@streamforger/shared';

function getAnimClass(anim?: string): string {
  if (!anim || anim === 'none') return '';
  const animMap: Record<string, string> = {
    fadeIn: 'sf-builder-fadeIn',
    slideUp: 'sf-builder-slideUp',
    slideLeft: 'sf-builder-slideLeft',
    bounceIn: 'sf-builder-bounceIn',
    glitch: 'sf-builder-glitch',
  };
  return animMap[anim] || '';
}

export function WidgetRenderer({ widget, selected, onSelect }: { widget: Widget; selected: boolean; onSelect: () => void }) {
  const { type, x, y, width, height, zIndex, opacity, locked, visible, config } = widget;
  if (!visible) return null;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width,
    height,
    zIndex,
    opacity,
    cursor: locked ? 'default' : 'pointer',
    borderRadius: config.borderRadius || 0,
    overflow: 'hidden',
    outline: selected ? '2px solid #7c3aed' : '1px solid rgba(255,255,255,.1)',
    outlineOffset: selected ? 1 : 0,
    transition: 'outline .15s',
  };

  const animClass = getAnimClass(config.animation);

  const renderContent = () => {
    switch (type) {
      case 'text':
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: config.backgroundColor || 'transparent',
            border: config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#fff'}` : 'none',
            borderRadius: config.borderRadius || 0,
            color: config.textColor || '#fff',
            fontFamily: config.fontFamily || 'Inter, Arial, sans-serif',
            fontSize: config.fontSize || 16,
            padding: 8, textAlign: 'center', overflow: 'hidden',
          }}>
            <span className={animClass}>{config.textContent || 'Text'}</span>
          </div>
        );
      case 'chat':
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            background: config.backgroundColor || 'rgba(0,0,0,.6)',
            border: config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#333'}` : 'none',
            borderRadius: config.borderRadius || 0,
            color: config.textColor || '#fff',
            fontFamily: config.fontFamily || 'inherit',
            fontSize: config.fontSize || 14,
            padding: 8, overflow: 'hidden',
          }}>
            <div className={animClass} style={{ flex: 1, overflow: 'auto' }}>
              <div style={{ marginBottom: 6, display: 'flex', gap: 6 }}>
                <span style={{ fontWeight: 700, color: '#9147ff' }}>StreamForgerBot:</span>
                <span>Welcome!</span>
              </div>
              <div style={{ marginBottom: 6, display: 'flex', gap: 6 }}>
                <span style={{ fontWeight: 700, color: '#00ff00' }}>Viewer1:</span>
                <span>Great stream!</span>
              </div>
            </div>
          </div>
        );
      case 'hud':
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            background: config.backgroundColor || 'rgba(0,0,0,.5)',
            border: config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#333'}` : 'none',
            borderRadius: config.borderRadius || 0,
            color: config.textColor || '#fff',
            fontFamily: config.fontFamily || 'inherit',
            fontSize: config.fontSize || 14,
            padding: '4px 12px',
          }}>
            <div className={animClass} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.3em', fontWeight: 700 }}>1,234</div>
              <div style={{ fontSize: '.7em', opacity: .7 }}>VIEWERS</div>
            </div>
            <div className={animClass} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.3em', fontWeight: 700 }}>567</div>
              <div style={{ fontSize: '.7em', opacity: .7 }}>FOLLOWERS</div>
            </div>
          </div>
        );
      case 'timer':
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: config.backgroundColor || 'transparent',
            border: config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#333'}` : 'none',
            borderRadius: config.borderRadius || 0,
            color: config.textColor || '#fff',
            fontFamily: config.fontFamily || 'monospace',
            fontSize: config.fontSize || 36,
          }}>
            <span className={animClass} style={{ fontVariantNumeric: 'tabular-nums' }}>12:34</span>
          </div>
        );
      case 'scoreboard':
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
            background: config.backgroundColor || 'rgba(0,0,0,.6)',
            border: config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#333'}` : 'none',
            borderRadius: config.borderRadius || 0,
            color: config.textColor || '#fff',
            fontFamily: config.fontFamily || 'inherit',
            fontSize: config.fontSize || 16,
            padding: 12,
          }}>
            <div className={animClass} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>Team A</span><span style={{ fontWeight: 700 }}>3</span>
            </div>
            <div className={animClass} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>Team B</span><span style={{ fontWeight: 700 }}>1</span>
            </div>
          </div>
        );
      case 'alertbox':
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: config.backgroundColor || 'rgba(0,0,0,.6)',
            border: config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#333'}` : 'none',
            borderRadius: config.borderRadius || 0,
            color: config.textColor || '#fff',
            fontFamily: config.fontFamily || 'inherit',
            fontSize: config.fontSize || 16,
            padding: 12, textAlign: 'center',
          }}>
            <div className={animClass}><div style={{ fontSize: 28, marginBottom: 4 }}>🎉</div></div>
            <div className={animClass} style={{ fontWeight: 700 }}>New Follower!</div>
            <div className={animClass} style={{ fontSize: '.85em', opacity: .8 }}>StreamForgerBot</div>
          </div>
        );
      case 'image':
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: config.backgroundColor || 'transparent',
            border: config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#333'}` : 'none',
            borderRadius: config.borderRadius || 0,
            overflow: 'hidden',
          }}>
            {config.imageSrc ? (
              <img src={config.imageSrc} alt="" className={animClass} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ color: '#666', fontSize: 12 }}>Click to select image</span>
            )}
          </div>
        );
      case 'shape':
        const shapeStyle: React.CSSProperties = {
          width: '100%', height: '100%',
          background: config.backgroundColor || 'rgba(255,255,255,.1)',
          border: config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || 'rgba(255,255,255,.3)'}` : 'none',
        };
        if (config.shape === 'circle') shapeStyle.borderRadius = '50%';
        else if (config.shape === 'rounded') shapeStyle.borderRadius = 12;
        return <div className={animClass} style={shapeStyle} />;
      case 'webcam':
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1a1a2e',
            border: config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#7c3aed'}` : '3px solid #7c3aed',
            borderRadius: config.borderRadius || 12,
            overflow: 'hidden',
          }}>
            <svg viewBox="0 0 100 100" style={{ width: '50%', height: '50%', opacity: .3 }}>
              <circle cx="50" cy="35" r="20" fill="none" stroke="#666" strokeWidth={3} />
              <ellipse cx="50" cy="80" rx="35" ry="25" fill="none" stroke="#666" strokeWidth={3} />
            </svg>
          </div>
        );
      case 'social':
        const links = config.socialLinks || [];
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap',
            background: config.backgroundColor || 'rgba(0,0,0,.4)',
            border: config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#333'}` : 'none',
            borderRadius: config.borderRadius || 0,
            padding: 8,
          }}>
            {links.length > 0 ? links.map((l, i) => (
              <span key={i} className={animClass} style={{
                padding: '4px 10px', background: 'rgba(255,255,255,.1)', borderRadius: 4,
                color: config.textColor || '#fff', fontSize: config.fontSize || 13,
              }}>{l.platform}</span>
            )) : (
              <span className={animClass} style={{ opacity: .5, color: config.textColor || '#fff', fontSize: config.fontSize || 13 }}>Social Links</span>
            )}
          </div>
        );
      default:
        return <div style={{ width: '100%', height: '100%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12 }}>{type}</div>;
    }
  };

  return (
    <div style={baseStyle} onClick={locked ? undefined : onSelect}>
      {renderContent()}
      {selected && (
        <div style={{
          position: 'absolute', bottom: 0, right: 0, padding: '2px 6px',
          background: '#7c3aed', color: '#fff', fontSize: 10, borderRadius: '4px 0 0 0',
          pointerEvents: 'none',
        }}>
          {type}
        </div>
      )}
    </div>
  );
}
