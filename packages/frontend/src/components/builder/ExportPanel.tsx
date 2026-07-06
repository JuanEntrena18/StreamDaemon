import { useCallback, useState } from 'react';
import { useBuilder } from './OverlayBuilderContext';
import { apiPost } from '../../utils/api';
import { BACKEND_URL, OVERLAY_BASE_URL } from '../../utils/api';

export function ExportPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useBuilder();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const saveLayout = useCallback(async () => {
    setSaving(true);
    try {
      const body = {
        name: state.layoutName,
        widgets: state.widgets,
        resolution: state.resolution,
        backgroundColor: state.backgroundColor,
      };

      let res;
      if (state.currentLayoutId) {
        res = await fetch(`${BACKEND_URL}/layouts/${state.currentLayoutId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await apiPost('/layouts/save', body);
      }

      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      dispatch({ type: 'LOAD_LAYOUT', payload: data });
      dispatch({ type: 'MARK_SAVED' });
    } catch (err) {
      console.error('Failed to save layout:', err);
    } finally {
      setSaving(false);
    }
  }, [state, dispatch]);

  const exportUrl = state.currentLayoutId
    ? `${BACKEND_URL}/layouts/${state.currentLayoutId}/html`
    : null;

  const copyUrl = useCallback(async () => {
    if (!exportUrl) return;
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  }, [exportUrl]);

  const downloadHtml = useCallback(async () => {
    if (!exportUrl) return;
    try {
      const res = await fetch(exportUrl);
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${state.layoutName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [exportUrl, state.layoutName]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--sf-surface)', borderRadius: 12, padding: 28, minWidth: 400, maxWidth: 500,
        boxShadow: '0 8px 60px rgba(0,0,0,.5)',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 20, color: 'var(--sf-text)' }}>
          📤 Export Layout
        </h2>

        {/* Save first */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: '.82rem', color: 'var(--sf-text-2)', marginBottom: 10 }}>
            Save your layout to enable export options.
          </p>
          <button
            onClick={saveLayout}
            disabled={saving}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: 'var(--sf-accent)', color: '#fff',
              fontSize: '.85rem', cursor: saving ? 'wait' : 'pointer', fontWeight: 600,
            }}
          >
            {saving ? 'Saving...' : state.currentLayoutId ? '💾 Update Layout' : '💾 Save Layout'}
          </button>
        </div>

        {/* Export options */}
        {exportUrl && (
          <>
            <div style={{ borderTop: '1px solid var(--sf-border)', paddingTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: 8 }}>
                Browser Source URL
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <input
                  type="text" readOnly value={exportUrl}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--sf-border)',
                    background: 'var(--sf-bg)', color: 'var(--sf-text)', fontSize: '.78rem', fontFamily: 'monospace',
                  }}
                />
                <button onClick={copyUrl} style={{
                  padding: '8px 14px', borderRadius: 6, border: '1px solid var(--sf-border)',
                  background: 'var(--sf-bg)', color: 'var(--sf-text)', cursor: 'pointer', fontSize: '.78rem',
                }}>
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
              <div style={{ fontSize: '.72rem', color: 'var(--sf-text-3)', marginBottom: 16 }}>
                Add this URL as a Browser Source in OBS with resolution {state.resolution.width}×{state.resolution.height}.
              </div>

              <button onClick={downloadHtml} style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid var(--sf-border)',
                background: 'var(--sf-bg)', color: 'var(--sf-text)', cursor: 'pointer', fontSize: '.85rem',
                width: '100%', marginBottom: 8,
              }}>
                ⬇️ Download Standalone HTML
              </button>

              <button onClick={() => {
                const obsUrl = `${OVERLAY_BASE_URL}/overlay.html?source=${encodeURIComponent(exportUrl!)}`;
                navigator.clipboard.writeText(obsUrl).catch(() => {});
              }} style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid var(--sf-border)',
                background: 'var(--sf-bg)', color: 'var(--sf-text)', cursor: 'pointer', fontSize: '.85rem',
                width: '100%',
              }}>
                🔗 Open in StreamDaemon Overlay
              </button>
            </div>
          </>
        )}

        <button onClick={onClose} style={{
          marginTop: 12, padding: '8px 20px', borderRadius: 8, border: '1px solid var(--sf-border)',
          background: 'none', color: 'var(--sf-text-2)', cursor: 'pointer', fontSize: '.82rem',
          width: '100%',
        }}>
          Close
        </button>
      </div>
    </div>
  );
}
