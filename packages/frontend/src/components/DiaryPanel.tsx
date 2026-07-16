import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { OVERLAY_REGISTRY } from '../config/overlayRegistry';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import styles from './DiaryPanel.module.css';

interface HltbData {
  mainStory: number;
  mainExtra: number;
  completionist: number;
}

interface GameEntry {
  id: string;
  channel: string;
  name: string;
  coverUrl?: string;
  hoursPlayed: number;
  score: number;
  completedDate?: string;
  playDates?: string[];
  notes?: string;
  hltbData?: HltbData;
  createdAt: string;
  updatedAt: string;
}

interface HltbSearchResult {
  game_id: number;
  game_name: string;
  game_image_url?: string;
  gameplay_main: number;
  gameplay_main_extra: number;
  gameplay_completionist: number;
}

interface Props {
  channel: string;
}

function formatHours(h: number): string {
  if (h === 0) return '-';
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function hltbDiff(userHours: number, hltbHours: number): { text: string; className: string } {
  if (!userHours || !hltbHours) return { text: '', className: '' };
  const diff = userHours - hltbHours;
  const pct = Math.round((userHours / hltbHours) * 100);
  if (Math.abs(diff) < 1) return { text: '≈ HLTB', className: 'hltbMatch' };
  if (diff < 0) return { text: `${Math.abs(Math.round(diff))}h más rápido (${pct}%)`, className: 'hltbFaster' };
  return { text: `${Math.round(diff)}h más lento (${pct}%)`, className: 'hltbSlower' };
}

function Stars({ score }: { score: number }) {
  return (
    <span className={styles.stars}>
      {[1,2,3,4,5,6,7,8,9,10].map(i => (
        <span key={i} style={{ color: i <= score ? '#fbbf24' : 'var(--sf-text-4)' }}>★</span>
      ))}
    </span>
  );
}

export function DiaryPanel({ channel }: Props) {
  const { socket } = useSocket();
  const [entries, setEntries] = useState<GameEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({ name: '', hoursPlayed: 0, score: 0, coverUrl: '', completedDate: '', notes: '' });
  const [hltbData, setHltbData] = useState<HltbData | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HltbSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const be = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  const ov = OVERLAY_REGISTRY.find(o => o.id === 'diary');
  const overlayBaseUrl = import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin;
  const overlayUrl = ov?.filename
    ? `${overlayBaseUrl}/overlays/${ov.filename}?channel=${channel}&backend=${encodeURIComponent(be)}`
    : '';

  // Load entries
  const loadEntries = useCallback(async () => {
    try {
      const res = await apiGet(`/diary/${channel}`);
      if (res.ok) setEntries(await res.json());
    } catch {}
  }, [channel]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Socket updates
  useEffect(() => {
    if (!socket) return;
    const handler = (data: GameEntry[]) => {
      if (data) setEntries(data);
    };
    socket.on('diary:update', handler);
    return () => { socket.off('diary:update', handler); };
  }, [socket]);

  // HLTB search
  const doSearch = async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await apiGet(`/diary/hltb-search?q=${encodeURIComponent(q)}`);
      if (res.ok) setSearchResults(await res.json());
    } catch {}
    setSearching(false);
  };

  useEffect(() => {
    if (!showSearch || searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(() => doSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showSearch]);

  const selectHltbResult = (r: HltbSearchResult) => {
    setForm(f => ({ ...f, name: r.game_name, coverUrl: r.game_image_url || f.coverUrl }));
    setHltbData({
      mainStory: r.gameplay_main / 3600,
      mainExtra: r.gameplay_main_extra / 3600,
      completionist: r.gameplay_completionist / 3600,
    });
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const clearHltbData = () => {
    setHltbData(undefined);
    setShowSearch(true);
  };

  // CRUD
  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', hoursPlayed: 0, score: 0, coverUrl: '', completedDate: '', notes: '' });
    setHltbData(undefined);
    setShowSearch(true);
    setModalOpen(true);
  };

  const openEdit = (e: GameEntry) => {
    setEditingId(e.id);
    setForm({ name: e.name, hoursPlayed: e.hoursPlayed, score: e.score, coverUrl: e.coverUrl || '', completedDate: e.completedDate || '', notes: e.notes || '' });
    setHltbData(e.hltbData);
    setShowSearch(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setShowSearch(false);
    setSearchResults([]);
  };

  const saveEntry = async () => {
    if (!form.name) return;
    const body = { ...form, hltbData };
    try {
      if (editingId) {
        const res = await apiPut(`/diary/${channel}/${editingId}`, body);
        if (res.ok) {
          const updated = await res.json();
          setEntries(prev => prev.map(e => e.id === editingId ? updated : e));
        }
      } else {
        const res = await apiPost(`/diary/${channel}`, body);
        if (res.ok) {
          const created = await res.json();
          setEntries(prev => [...prev, created]);
        }
      }
      closeModal();
    } catch {}
  };

  const deleteEntry = async (id: string) => {
    try {
      await apiDelete(`/diary/${channel}/${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch {}
  };

  const copy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  }, []);

  const avgScore = entries.length > 0 ? (entries.reduce((sum, e) => sum + e.score, 0) / entries.length).toFixed(1) : '-';
  const totalHours = entries.reduce((sum, e) => sum + e.hoursPlayed, 0);
  const sorted = [...entries].sort((a, b) => (b.completedDate || b.createdAt).localeCompare(a.completedDate || a.createdAt));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className="sf-heading">🎮 Diario de Juegos</h2>
          <p className={styles.subtitle}>
            Lleva un registro de los videojuegos que te has pasado en directo.
            Compara tus tiempos con HowLongToBeat.
          </p>
        </div>

        {/* OBS URL */}
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
          <div className={styles.card}>
            <p className={styles.sectionTitle}>📡 Overlay para OBS</p>
            <code className={styles.urlBox} style={{ cursor: 'pointer' }}>
              {overlayUrl}
            </code>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => copy(overlayUrl, 'obs-url')} className={`sf-btn sf-btn-primary ${styles.copyBtn}`}>
                {copiedId === 'obs-url' ? '✓ Copiado' : '📋 Copiar URL'}
              </button>
              <button onClick={() => window.open(overlayUrl, '_blank')} className="sf-btn sf-btn-ghost">🔍 Abrir</button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.twoColGrid}>
          <div className="glass-card">
            <div className={styles.card}>
              <p className={styles.sectionTitle}>📊 Estadísticas</p>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--sf-teal)' }}>{entries.length}</div>
                  <div className="text-dim text-xs">Juegos</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--sf-warning)' }}>{formatHours(totalHours)}</div>
                  <div className="text-dim text-xs">Horas totales</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fbbf24' }}>{avgScore}</div>
                  <div className="text-dim text-xs">Nota media</div>
                </div>
              </div>
            </div>
          </div>
          <div className="glass-card">
            <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', height: '100%' }}>
              <button onClick={openNew} className="sf-btn sf-btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.25rem' }}>
                + Añadir juego
              </button>
              <div className="text-dim text-xs" style={{ marginTop: '0.5rem' }}>
                Busca en HowLongToBeat para comparar tiempos
              </div>
            </div>
          </div>
        </div>

        {/* Game list */}
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
          <div className={styles.card}>
            <p className={styles.sectionTitle}>🎮 Juegos completados</p>
            {sorted.length === 0 ? (
              <div className="text-dim text-xs">No hay juegos registrados. Haz clic en "Añadir juego" para empezar.</div>
            ) : (
              <div className={styles.gameGrid}>
                {sorted.map(entry => {
                  const diff = entry.hltbData?.mainStory ? hltbDiff(entry.hoursPlayed, entry.hltbData.mainStory) : null;
                  return (
                    <div key={entry.id} className={styles.gameRow}>
                      {entry.coverUrl ? (
                        <img src={entry.coverUrl} alt="" className={styles.gameCover} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className={styles.gameCoverPlaceholder}>🎮</div>
                      )}
                      <div className={styles.gameInfo}>
                        <div className={styles.gameName}>{entry.name}</div>
                        <div className={styles.gameMeta}>
                          <Stars score={entry.score} />
                          <span>· {formatHours(entry.hoursPlayed)}</span>
                          {entry.completedDate && <span>· {entry.completedDate}</span>}
                          {diff && diff.text && (
                            <span className={`${styles.hltbBadge} ${styles[diff.className as keyof typeof styles] || ''}`}>
                              {diff.text}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.gameActions}>
                        <button onClick={() => openEdit(entry)} className={styles.gameBtn}>✎</button>
                        <button onClick={() => deleteEntry(entry.id)} className={styles.gameBtnDanger}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>{editingId ? '✎ Editar juego' : '➕ Añadir juego'}</span>
              <button onClick={closeModal} className={styles.modalClose}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {/* HLTB Search */}
              {showSearch ? (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Buscar en HowLongToBeat</label>
                  <div className={styles.searchWrapper}>
                    <input
                      className="sf-input"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Escribe el nombre del juego..."
                      autoFocus
                    />
                    {searchResults.length > 0 && (
                      <div className={styles.searchResults}>
                        {searchResults.map(r => (
                          <div key={r.game_id} className={styles.searchResultItem} onClick={() => selectHltbResult(r)}>
                            {r.game_image_url ? (
                              <img src={r.game_image_url} alt="" className={styles.searchResultCover} />
                            ) : (
                              <div className={styles.searchResultCover} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>🎮</div>
                            )}
                            <div className={styles.searchResultInfo}>
                              <div className={styles.searchResultName}>{r.game_name}</div>
                              <div className={styles.searchResultTimes}>
                                {(r.gameplay_main / 3600).toFixed(1)}h · {(r.gameplay_main_extra / 3600).toFixed(1)}h · {(r.gameplay_completionist / 3600).toFixed(1)}h
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {searching && <div className="text-dim text-xs" style={{ marginTop: '0.25rem' }}>Buscando...</div>}
                  </div>
                </div>
              ) : hltbData ? (
                <div className={styles.hltbResult}>
                  {form.coverUrl && <img src={form.coverUrl} alt="" className={styles.hltbResultCover} />}
                  <div className={styles.hltbResultInfo}>
                    <div className={styles.hltbResultName}>{form.name}</div>
                    <div>
                      <span className={styles.hltbResultTime}>📖 {hltbData.mainStory.toFixed(1)}h</span>
                      <span className={styles.hltbResultTime}>📚 {hltbData.mainExtra.toFixed(1)}h</span>
                      <span className={styles.hltbResultTime}>🏆 {hltbData.completionist.toFixed(1)}h</span>
                    </div>
                  </div>
                  <button onClick={clearHltbData} className={styles.hltbChangeBtn}>Cambiar</button>
                </div>
              ) : null}

              {/* Name */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nombre del juego *</label>
                <input className="sf-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Elden Ring" />
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Horas jugadas</label>
                  <input className="sf-input" type="number" min={0} step={0.5} value={form.hoursPlayed || ''} onChange={e => setForm(f => ({ ...f, hoursPlayed: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Puntuación (1-10)</label>
                  <input className="sf-input" type="number" min={0} max={10} step={1} value={form.score || ''} onChange={e => setForm(f => ({ ...f, score: parseInt(e.target.value) || 0 }))} placeholder="0" />
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>URL de la carátula</label>
                  <input className="sf-input" value={form.coverUrl} onChange={e => setForm(f => ({ ...f, coverUrl: e.target.value }))} placeholder="https://..." />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Fecha de finalización</label>
                  <input className="sf-input" type="date" value={form.completedDate} onChange={e => setForm(f => ({ ...f, completedDate: e.target.value }))} />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Notas</label>
                <textarea className="sf-input" style={{ minHeight: 50, resize: 'vertical', fontFamily: 'inherit' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Tus impresiones del juego..." />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={closeModal} className="sf-btn sf-btn-ghost" style={{ flex: 1 }}>Cancelar</button>
                <button onClick={saveEntry} className="sf-btn sf-btn-primary" style={{ flex: 2 }} disabled={!form.name}>
                  {editingId ? 'Guardar cambios' : 'Añadir juego'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
