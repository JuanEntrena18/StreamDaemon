import { useBuilder } from './OverlayBuilderContext';
import type { Widget } from '@streamforger/shared';

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ width: 80, fontSize: '.78rem', color: 'var(--sf-text-2)', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', gap: 4 }}>{children}</div>
    </div>
  );
}

function NumInput({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      min={min} max={max} step={step}
      style={{
        width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--sf-border)',
        background: 'var(--sf-bg)', color: 'var(--sf-text)', fontSize: '.78rem',
      }}
    />
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, flex: 1 }}>
      <input
        type="color" value={value || '#000000'}
        onChange={e => onChange(e.target.value)}
        style={{ width: 32, height: 28, padding: 0, border: '1px solid var(--sf-border)', borderRadius: 4, cursor: 'pointer', background: 'none' }}
      />
      <input
        type="text" value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{ flex: 1, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--sf-border)', background: 'var(--sf-bg)', color: 'var(--sf-text)', fontSize: '.78rem', fontFamily: 'monospace' }}
      />
    </div>
  );
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--sf-border)',
        background: 'var(--sf-bg)', color: 'var(--sf-text)', fontSize: '.78rem',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function PropertyPanel() {
  const { selectedWidget, updateWidget, deleteWidget } = useBuilder();

  if (!selectedWidget) {
    return (
      <div style={{
        width: 240, background: 'var(--sf-surface)', borderLeft: '1px solid var(--sf-border)',
        padding: 16, flexShrink: 0,
      }}>
        <div style={{ fontSize: '.82rem', color: 'var(--sf-text-3)', textAlign: 'center', paddingTop: 40 }}>
          Select a widget to edit its properties
        </div>
      </div>
    );
  }

  const update = (changes: Partial<Widget>) => updateWidget(selectedWidget.id, changes);
  const updateConfig = (key: string, value: unknown) => {
    update({ config: { ...selectedWidget.config, [key]: value } });
  };

  const animations = [
    { label: 'None', value: 'none' },
    { label: 'Fade In', value: 'fadeIn' },
    { label: 'Slide Up', value: 'slideUp' },
    { label: 'Slide Left', value: 'slideLeft' },
    { label: 'Bounce In', value: 'bounceIn' },
    { label: 'Glitch', value: 'glitch' },
  ];

  const shapes = [
    { label: 'Rectangle', value: 'rect' },
    { label: 'Circle', value: 'circle' },
    { label: 'Rounded', value: 'rounded' },
  ];

  return (
    <div style={{
      width: 240, background: 'var(--sf-surface)', borderLeft: '1px solid var(--sf-border)',
      padding: 16, overflowY: 'auto', flexShrink: 0,
    }}>
      <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--sf-text-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>
        Properties
      </div>
      <div style={{ fontSize: '.75rem', color: 'var(--sf-text-3)', marginBottom: 16 }}>
        {selectedWidget.type.toUpperCase()} · {selectedWidget.id.slice(0, 12)}
      </div>

      <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: 8 }}>Position</div>
      <PropRow label="X"><NumInput value={selectedWidget.x} onChange={v => update({ x: v })} /></PropRow>
      <PropRow label="Y"><NumInput value={selectedWidget.y} onChange={v => update({ y: v })} /></PropRow>

      <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: 8, marginTop: 8 }}>Size</div>
      <PropRow label="Width"><NumInput value={selectedWidget.width} onChange={v => update({ width: v })} min={10} /></PropRow>
      <PropRow label="Height"><NumInput value={selectedWidget.height} onChange={v => update({ height: v })} min={10} /></PropRow>

      <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: 8, marginTop: 8 }}>Style</div>
      <PropRow label="Opacity">
        <NumInput value={Math.round(selectedWidget.opacity * 100)} onChange={v => update({ opacity: v / 100 })} min={0} max={100} />
      </PropRow>
      <PropRow label="Z-Index"><NumInput value={selectedWidget.zIndex} onChange={v => update({ zIndex: v })} min={0} max={999} /></PropRow>
      <PropRow label="Bg Color">
        <ColorInput value={selectedWidget.config.backgroundColor || ''} onChange={v => updateConfig('backgroundColor', v || undefined)} />
      </PropRow>
      <PropRow label="Border Color">
        <ColorInput value={selectedWidget.config.borderColor || ''} onChange={v => updateConfig('borderColor', v || undefined)} />
      </PropRow>
      <PropRow label="Border W">
        <NumInput value={selectedWidget.config.borderWidth || 0} onChange={v => updateConfig('borderWidth', v || undefined)} min={0} max={20} />
      </PropRow>
      <PropRow label="Radius">
        <NumInput value={selectedWidget.config.borderRadius || 0} onChange={v => updateConfig('borderRadius', v || undefined)} min={0} max={100} />
      </PropRow>
      <PropRow label="Animation">
        <SelectInput value={selectedWidget.config.animation || 'none'} onChange={v => updateConfig('animation', v === 'none' ? undefined : v)} options={animations} />
      </PropRow>

      {(selectedWidget.type === 'text' || selectedWidget.type === 'chat' || selectedWidget.type === 'hud') && (
        <>
          <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: 8, marginTop: 8 }}>Typography</div>
          <PropRow label="Font Size"><NumInput value={selectedWidget.config.fontSize || 16} onChange={v => updateConfig('fontSize', v)} min={8} max={200} /></PropRow>
          <PropRow label="Text Color">
            <ColorInput value={selectedWidget.config.textColor || '#ffffff'} onChange={v => updateConfig('textColor', v)} />
          </PropRow>
          <PropRow label="Font">
            <input
              type="text" value={selectedWidget.config.fontFamily || ''}
              onChange={e => updateConfig('fontFamily', e.target.value || undefined)}
              placeholder="Arial, sans-serif"
              style={{
                width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--sf-border)',
                background: 'var(--sf-bg)', color: 'var(--sf-text)', fontSize: '.78rem',
              }}
            />
          </PropRow>
        </>
      )}

      {selectedWidget.type === 'text' && (
        <>
          <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: 8, marginTop: 8 }}>Content</div>
          <textarea
            value={selectedWidget.config.textContent || ''}
            onChange={e => updateConfig('textContent', e.target.value)}
            rows={3}
            style={{
              width: '100%', padding: '6px', borderRadius: 6, border: '1px solid var(--sf-border)',
              background: 'var(--sf-bg)', color: 'var(--sf-text)', fontSize: '.78rem', resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </>
      )}

      {selectedWidget.type === 'image' && (
        <>
          <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: 8, marginTop: 8 }}>Image URL</div>
          <input
            type="text" value={selectedWidget.config.imageSrc || ''}
            onChange={e => updateConfig('imageSrc', e.target.value || undefined)}
            placeholder="https://example.com/image.png"
            style={{
              width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--sf-border)',
              background: 'var(--sf-bg)', color: 'var(--sf-text)', fontSize: '.78rem',
            }}
          />
        </>
      )}

      {selectedWidget.type === 'shape' && (
        <PropRow label="Shape">
          <SelectInput value={selectedWidget.config.shape || 'rect'} onChange={v => updateConfig('shape', v)} options={shapes} />
        </PropRow>
      )}

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--sf-border)' }}>
        <button
          onClick={() => update({ locked: !selectedWidget.locked })}
          style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid var(--sf-border)',
            background: selectedWidget.locked ? 'var(--sf-accent)' : 'var(--sf-bg)',
            color: selectedWidget.locked ? '#fff' : 'var(--sf-text)',
            fontSize: '.78rem', cursor: 'pointer', width: '100%', marginBottom: 6,
          }}
        >
          {selectedWidget.locked ? '🔒 Locked' : '🔓 Unlocked'}
        </button>
        <button
          onClick={() => deleteWidget(selectedWidget.id)}
          style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid #e53e3e',
            background: 'transparent', color: '#e53e3e',
            fontSize: '.78rem', cursor: 'pointer', width: '100%',
          }}
        >
          🗑️ Delete Widget
        </button>
      </div>
    </div>
  );
}
