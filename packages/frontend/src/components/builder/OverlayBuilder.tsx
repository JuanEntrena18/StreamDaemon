import { useState, useRef, useCallback, useEffect } from 'react';
import { useBuilder } from './OverlayBuilderContext';
import { WidgetRenderer } from './WidgetRenderer';
import { PreviewModal } from './PreviewModal';
import { ExportPanel } from './ExportPanel';
import { LayoutManager } from './LayoutManager';

const TOOLBAR_HEIGHT = 44;

export function OverlayBuilder() {
  const { state, dispatch, selectWidget, undo, redo } = useBuilder();
  const [showPreview, setShowPreview] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showLayouts, setShowLayouts] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; edge: string; startX: number; startY: number; origW: number; origH: number; origX: number; origY: number } | null>(null);

  const gridSnap = useCallback((v: number) => {
    if (!state.gridSnap) return v;
    return Math.round(v / state.gridSize) * state.gridSize;
  }, [state.gridSnap, state.gridSize]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('builder-canvas-bg')) {
      selectWidget(null);
    }
  }, [selectWidget]);

  const handleMouseDown = useCallback((e: React.MouseEvent, widgetId: string, edge?: string) => {
    e.preventDefault();
    e.stopPropagation();
    const widget = state.widgets.find(w => w.id === widgetId);
    if (!widget || widget.locked) return;

    if (edge) {
      setResizing({ id: widgetId, edge, startX: e.clientX, startY: e.clientY, origW: widget.width, origH: widget.height, origX: widget.x, origY: widget.y });
    } else {
      selectWidget(widgetId);
      setDragging({ id: widgetId, startX: e.clientX, startY: e.clientY, origX: widget.x, origY: widget.y });
    }
  }, [state.widgets, selectWidget]);

  useEffect(() => {
    if (!dragging && !resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) {
        const dx = (e.clientX - dragging.startX) / state.canvasZoom;
        const dy = (e.clientY - dragging.startY) / state.canvasZoom;
        dispatch({
          type: 'UPDATE_WIDGET',
          payload: {
            id: dragging.id,
            changes: { x: gridSnap(dragging.origX + dx), y: gridSnap(dragging.origY + dy) },
          },
        });
      }
      if (resizing) {
        const dx = (e.clientX - resizing.startX) / state.canvasZoom;
        const dy = (e.clientY - resizing.startY) / state.canvasZoom;
        const changes: Record<string, number> = {};
        if (resizing.edge.includes('e')) { changes.width = Math.max(20, resizing.origW + dx); }
        if (resizing.edge.includes('w')) { changes.width = Math.max(20, resizing.origW - dx); changes.x = gridSnap(resizing.origX + dx); }
        if (resizing.edge.includes('s')) { changes.height = Math.max(20, resizing.origH + dy); }
        if (resizing.edge.includes('n')) { changes.height = Math.max(20, resizing.origH - dy); changes.y = gridSnap(resizing.origY + dy); }
        dispatch({ type: 'UPDATE_WIDGET', payload: { id: resizing.id, changes: changes as any } });
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      setResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, resizing, state.canvasZoom, dispatch, gridSnap]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selectedWidgetId) {
        dispatch({ type: 'DELETE_WIDGET', payload: { id: state.selectedWidgetId } });
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
  }, [state.selectedWidgetId, dispatch, undo, redo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const scale = state.canvasZoom;
  const canvasW = state.resolution.width;
  const canvasH = state.resolution.height;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        height: TOOLBAR_HEIGHT, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
        background: 'var(--sf-surface)', borderBottom: '1px solid var(--sf-border)', flexShrink: 0,
      }}>
        <input
          type="text" value={state.layoutName}
          onChange={e => dispatch({ type: 'SET_LAYOUT_NAME', payload: e.target.value })}
          style={{
            fontWeight: 600, fontSize: '.85rem', background: 'none', border: 'none', color: 'var(--sf-text)',
            outline: 'none', width: 180, padding: '4px 6px', borderRadius: 4,
          }}
          onFocus={e => (e.target.style.background = 'var(--sf-bg)')}
          onBlur={e => (e.target.style.background = 'none')}
        />
        <div style={{ flex: 1 }} />
        <button onClick={undo} disabled={state.historyIndex <= 0} title="Undo (Ctrl+Z)" style={btnStyle}>↩</button>
        <button onClick={redo} disabled={state.historyIndex >= state.history.length - 1} title="Redo (Ctrl+Shift+Z)" style={btnStyle}>↪</button>
        <div style={{ width: 1, height: 20, background: 'var(--sf-border)', margin: '0 4px' }} />
        <button onClick={() => dispatch({ type: 'SET_ZOOM', payload: state.canvasZoom - 0.1 })} style={btnStyle}>−</button>
        <span style={{ fontSize: '.78rem', color: 'var(--sf-text-2)', minWidth: 40, textAlign: 'center' }}>{Math.round(state.canvasZoom * 100)}%</span>
        <button onClick={() => dispatch({ type: 'SET_ZOOM', payload: state.canvasZoom + 0.1 })} style={btnStyle}>+</button>
        <button onClick={() => dispatch({ type: 'SET_ZOOM', payload: 0.5 })} style={btnStyle}>Fit</button>
        <div style={{ width: 1, height: 20, background: 'var(--sf-border)', margin: '0 4px' }} />
        <button onClick={() => dispatch({ type: 'TOGGLE_GRID_SNAP' })} style={{ ...btnStyle, background: state.gridSnap ? 'var(--sf-accent)' : 'transparent', color: state.gridSnap ? '#fff' : 'var(--sf-text)' }}>
          ⊞ Snap
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--sf-border)', margin: '0 4px' }} />
        <button onClick={() => setShowLayouts(true)} style={btnStyle}>📂 Layouts</button>
        <button onClick={() => setShowPreview(true)} style={btnStyle}>👁 Preview</button>
        <button onClick={() => setShowExport(true)} style={{ ...btnStyle, background: 'var(--sf-accent)', color: '#fff' }}>📤 Export</button>
        {state.isDirty && <span style={{ fontSize: '.7rem', color: 'var(--sf-accent)', marginLeft: 4 }}>●</span>}
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Canvas area */}
        <div ref={canvasRef} onClick={handleCanvasClick} style={{
          flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: 24, background: '#1a1a2e',
        }}>
          <div style={{
            position: 'relative', width: canvasW, height: canvasH, flexShrink: 0,
            transform: `scale(${scale})`, transformOrigin: 'top center',
            background: state.backgroundColor,
            borderRadius: 4, boxShadow: '0 4px 40px rgba(0,0,0,.5)',
            backgroundImage: state.gridSnap ? `url("data:image/svg+xml,%3Csvg width='${state.gridSize}' height='${state.gridSize}' viewBox='0 0 ${state.gridSize} ${state.gridSize}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='${state.gridSize}' height='${state.gridSize}' fill='none' stroke='rgba(255,255,255,0.03)' stroke-width='1'/%3E%3C/svg%3E")` : undefined,
            backgroundSize: `${state.gridSize}px ${state.gridSize}px`,
          }}
          >
            {/* Resolution label */}
            <div style={{ position: 'absolute', top: -20, left: 0, fontSize: 10, color: 'rgba(255,255,255,.3)', pointerEvents: 'none' }}>
              {canvasW}×{canvasH}
            </div>
            {/* Widgets */}
            {[...state.widgets].sort((a, b) => a.zIndex - b.zIndex).map(w => (
              <div key={w.id} style={{ position: 'relative' }}>
                <WidgetRenderer
                  widget={w}
                  selected={state.selectedWidgetId === w.id}
                  onSelect={() => selectWidget(w.id)}
                />
                {/* Resize handles */}
                {state.selectedWidgetId === w.id && !w.locked && (
                  <>
                    {['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(edge => (
                      <div
                        key={edge}
                        onMouseDown={e => handleMouseDown(e, w.id, edge)}
                        style={{
                          position: 'absolute',
                          width: 8, height: 8,
                          background: '#7c3aed', border: '1px solid #fff', borderRadius: 1,
                          cursor: edge.includes('n') && edge.includes('w') ? 'nw-resize'
                            : edge.includes('n') && edge.includes('e') ? 'ne-resize'
                            : edge.includes('s') && edge.includes('w') ? 'sw-resize'
                            : edge.includes('s') && edge.includes('e') ? 'se-resize'
                            : edge === 'n' || edge === 's' ? 'ns-resize'
                            : 'ew-resize',
                          zIndex: 10000,
                          ...(edge.includes('n') ? { top: -4 } : edge.includes('s') ? { bottom: -4 } : { top: 'calc(50% - 4px)' }),
                          ...(edge.includes('w') ? { left: -4 } : edge.includes('e') ? { right: -4 } : { left: 'calc(50% - 4px)' }),
                        }}
                      />
                    ))}
                    {/* Move handle (title bar) */}
                    <div
                      onMouseDown={e => handleMouseDown(e, w.id)}
                      style={{
                        position: 'absolute', top: -22, left: 0, right: 0, height: 20,
                        cursor: 'grab', background: 'rgba(124,58,237,.8)', borderRadius: '4px 4px 0 0',
                        display: 'flex', alignItems: 'center', padding: '0 6px',
                        color: '#fff', fontSize: 10, gap: 4,
                      }}
                    >
                      <span style={{ opacity: .7 }}>✥</span>
                      <span style={{ opacity: .8 }}>{w.type}</span>
                    </div>
                  </>
                )}
                {/* Locked indicator */}
                {w.locked && <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 12, opacity: .5 }}>🔒</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPreview && <PreviewModal onClose={() => setShowPreview(false)} />}
      {showExport && <ExportPanel onClose={() => setShowExport(false)} />}
      {showLayouts && <LayoutManager onClose={() => setShowLayouts(false)} />}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 6, border: '1px solid var(--sf-border)',
  background: 'transparent', color: 'var(--sf-text)',
  fontSize: '.8rem', cursor: 'pointer', whiteSpace: 'nowrap',
  display: 'flex', alignItems: 'center', gap: 4,
};
