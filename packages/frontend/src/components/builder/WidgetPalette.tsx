import { useBuilder } from './OverlayBuilderContext';
import type { WidgetType } from '@streamdaemon/shared';

const WIDGETS: { type: WidgetType; icon: string; label: string }[] = [
  { type: 'chat', icon: '💬', label: 'Chat' },
  { type: 'hud', icon: '📊', label: 'Stream HUD' },
  { type: 'timer', icon: '⏱️', label: 'Timer' },
  { type: 'scoreboard', icon: '🏆', label: 'Scoreboard' },
  { type: 'alertbox', icon: '🔔', label: 'Alert Box' },
  { type: 'text', icon: '🔤', label: 'Text' },
  { type: 'image', icon: '🖼️', label: 'Image' },
  { type: 'shape', icon: '⬛', label: 'Shape' },
  { type: 'webcam', icon: '📷', label: 'Webcam Frame' },
  { type: 'social', icon: '🔗', label: 'Social Links' },
];

export function WidgetPalette() {
  const { addWidget } = useBuilder();

  return (
    <div style={{
      width: 200, background: 'var(--sf-surface)', borderRight: '1px solid var(--sf-border)',
      padding: 12, overflowY: 'auto', flexShrink: 0,
    }}>
      <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--sf-text-2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: .5 }}>
        Widgets
      </div>
      {WIDGETS.map(w => (
        <button
          key={w.type}
          onClick={() => addWidget(w.type)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px',
            background: 'none', border: '1px solid transparent', borderRadius: 8, cursor: 'grab',
            color: 'var(--sf-text)', fontSize: '.82rem', transition: 'all .15s', marginBottom: 4,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--sf-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--sf-bg)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
        >
          <span style={{ fontSize: 18 }}>{w.icon}</span>
          <span>{w.label}</span>
        </button>
      ))}
    </div>
  );
}
