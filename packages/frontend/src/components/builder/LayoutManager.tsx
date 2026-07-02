import { useState, useEffect, useCallback } from 'react';
import { useBuilder } from './OverlayBuilderContext';
import { apiGet } from '../../utils/api';
import { BACKEND_URL } from '../../utils/api';

interface LayoutSummary {
  id: string;
  name: string;
  resolution: { width: number; height: number };
  backgroundColor: string;
  widgetCount: number;
  createdAt: number;
  updatedAt: number;
}

export function LayoutManager({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useBuilder();
  const [layouts, setLayouts] = useState<LayoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet('/layouts');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setLayouts(data);
    } catch (err) {
      console.error('Failed to load layouts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const loadLayout = useCallback(async (id: string) => {
    try {
      const res = await apiGet(`/layouts/${id}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      dispatch({ type: 'LOAD_LAYOUT', payload: data });
      onClose();
    } catch (err) {
      console.error('Failed to load layout:', err);
    }
  }, [dispatch, onClose]);

  const deleteLayout = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`${BACKEND_URL}/layouts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setLayouts(prev => prev.filter(l => l.id !== id));
      if (state.currentLayoutId === id) {
        dispatch({ type: 'LOAD_LAYOUT', payload: {
          id: '', name: 'My Layout', widgets: [],
          resolution: { width: 1920, height: 1080 },
          backgroundColor: '#0f0f23', createdAt: 0, updatedAt: 0,
        } as any });
      }
    } catch (err) {
      console.error('Failed to delete layout:', err);
    } finally {
      setDeleting(null);
    }
  }, [state.currentLayoutId, dispatch]);

  const newLayout = useCallback(() => {
    dispatch({ type: 'LOAD_LAYOUT', payload: {
      id: '', name: newName || 'My Layout', widgets: [],
      resolution: { width: 1920, height: 1080 },
      backgroundColor: '#0f0f23', createdAt: Date.now(), updatedAt: Date.now(),
    } });
    onClose();
  }, [dispatch, newName, onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--sf-surface)', borderRadius: 12, padding: 24, minWidth: 480, maxWidth: 600,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 60px rgba(0,0,0,.5)',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16, color: 'var(--sf-text)' }}>
          📂 Layout Manager
        </h2>

        {/* New layout form */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text" value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New layout name..."
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--sf-border)',
              background: 'var(--sf-bg)', color: 'var(--sf-text)', fontSize: '.82rem',
            }}
            onKeyDown={e => e.key === 'Enter' && newLayout()}
          />
          <button onClick={newLayout} disabled={!newName.trim()} style={{
            padding: '8px 16px', borderRadius: 6, border: 'none',
            background: 'var(--sf-accent)', color: '#fff', cursor: 'pointer', fontSize: '.82rem',
            fontWeight: 600, opacity: newName.trim() ? 1 : .5,
          }}>
            + New
          </button>
        </div>

        {/* Layout list */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 200 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--sf-text-3)', fontSize: '.85rem' }}>Loading...</div>
          ) : layouts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--sf-text-3)', fontSize: '.85rem' }}>
              No saved layouts yet.
            </div>
          ) : (
            layouts.map(l => (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderBottom: '1px solid var(--sf-border)', cursor: 'pointer',
                background: state.currentLayoutId === l.id ? 'rgba(124,58,237,.1)' : 'none',
                borderRadius: 6, marginBottom: 4,
              }}
                onClick={() => loadLayout(l.id)}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--sf-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = state.currentLayoutId === l.id ? 'rgba(124,58,237,.1)' : 'none')}
              >
                <div style={{
                  width: 36, height: 28, borderRadius: 4,
                  background: l.backgroundColor, border: '1px solid var(--sf-border)',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: 'rgba(255,255,255,.5)',
                }}>{l.resolution.width}×{l.resolution.height}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.85rem', fontWeight: 500, color: 'var(--sf-text)' }}>{l.name}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--sf-text-3)' }}>
                    {l.widgetCount} widgets · {new Date(l.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteLayout(l.id); }}
                  disabled={deleting === l.id}
                  style={{
                    padding: '4px 10px', borderRadius: 4, border: '1px solid #e53e3e',
                    background: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '.75rem',
                    opacity: deleting === l.id ? .5 : 1,
                  }}
                >{deleting === l.id ? '...' : '🗑️'}</button>
              </div>
            ))
          )}
        </div>

        <button onClick={onClose} style={{
          marginTop: 16, padding: '8px 20px', borderRadius: 8, border: '1px solid var(--sf-border)',
          background: 'none', color: 'var(--sf-text-2)', cursor: 'pointer', fontSize: '.82rem',
          width: '100%',
        }}>
          Close
        </button>
      </div>
    </div>
  );
}
