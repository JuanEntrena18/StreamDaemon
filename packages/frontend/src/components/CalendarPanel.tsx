import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { OVERLAY_REGISTRY } from '../config/overlayRegistry';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import styles from './CalendarPanel.module.css';

interface CalendarEvent {
  id: string;
  channel: string;
  title: string;
  date: string;
  startTime: string;
  duration: number;
  game?: string;
  category?: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  channel: string;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function toInputDate(dateStr: string): string {
  if (dateStr) return dateStr;
  return new Date().toISOString().split('T')[0];
}

export function CalendarPanel({ channel }: Props) {
  const { socket } = useSocket();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', date: '', startTime: '', duration: 60, game: '', category: '', description: '', color: '#7c3aed' });

  const be = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  const ov = OVERLAY_REGISTRY.find(o => o.id === 'calendar');
  const overlayBaseUrl = import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin;
  const overlayUrl = ov?.filename
    ? `${overlayBaseUrl}/overlays/${ov.filename}?channel=${channel}&backend=${encodeURIComponent(be)}`
    : '';

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      const res = await apiGet(`/calendar/${channel}`);
      if (res.ok) setEvents(await res.json());
    } catch {}
  }, [channel]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Socket updates
  useEffect(() => {
    if (!socket) return;
    const handler = (data: CalendarEvent[]) => {
      if (data) setEvents(data);
    };
    socket.on('calendar:update', handler);
    return () => { socket.off('calendar:update', handler); };
  }, [socket]);

  const emitConfig = (method: string, body: any) => {
    if (socket?.connected) {
      socket.emit('calendar:config', { channel, method, body });
    }
  };

  // Calendar helpers
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  // Get events for a specific date
  const eventsForDay = (date: string) => events.filter(e => e.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Open modal for new event on a specific date
  const openNewEvent = (date: string) => {
    setEditingId(null);
    setForm({ title: '', date, startTime: '20:00', duration: 60, game: '', category: '', description: '', color: '#7c3aed' });
    setModalOpen(true);
  };

  const openEditEvent = (ev: CalendarEvent) => {
    setEditingId(ev.id);
    setForm({ title: ev.title, date: ev.date, startTime: ev.startTime, duration: ev.duration, game: ev.game || '', category: ev.category || '', description: ev.description || '', color: ev.color || '#7c3aed' });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const saveEvent = async () => {
    if (!form.title || !form.date || !form.startTime) return;
    const body = { ...form };
    try {
      if (editingId) {
        const res = await apiPut(`/calendar/${channel}/${editingId}`, body);
        if (res.ok) {
          const updated = await res.json();
          setEvents(prev => prev.map(e => e.id === editingId ? updated : e));
          emitConfig('PUT', { id: editingId, ...body });
        }
      } else {
        const res = await apiPost(`/calendar/${channel}`, body);
        if (res.ok) {
          const created = await res.json();
          setEvents(prev => [...prev, created]);
          emitConfig('POST', created);
        }
      }
      closeModal();
    } catch {}
  };

  const deleteEvent = async (id: string) => {
    try {
      await apiDelete(`/calendar/${channel}/${id}`);
      setEvents(prev => prev.filter(e => e.id !== id));
      emitConfig('DELETE', { id });
    } catch {}
  };

  const copy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  }, []);

  // Build calendar days
  const todayStr = new Date().toISOString().split('T')[0];
  const calendarDays: { day: number; date: string; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    const d = new Date(currentYear, currentMonth, -firstDayOfWeek + i + 1);
    calendarDays.push({ day: d.getDate(), date: d.toISOString().split('T')[0], isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ day: d, date: dateStr, isCurrentMonth: true });
  }
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      calendarDays.push({ day: d.getDate(), date: d.toISOString().split('T')[0], isCurrentMonth: false });
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className="sf-heading">🗓️ Calendario de Directos</h2>
          <p className={styles.subtitle}>
            Organiza tus streams del mes. Los eventos se sincronizan en tiempo real con el overlay para OBS.
          </p>
        </div>

        {/* OBS URL */}
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
          <div className={styles.card}>
            <p className={styles.sectionTitle}>📡 Overlay para OBS</p>
            <code className={styles.urlBox} style={{ cursor: 'pointer' }} title="Haz clic para seleccionar">
              {overlayUrl}
            </code>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => copy(overlayUrl, 'obs-url')}
                className={`sf-btn sf-btn-primary ${styles.copyBtn}`}
              >
                {copiedId === 'obs-url' ? '✓ Copiado' : '📋 Copiar URL'}
              </button>
              <button
                onClick={() => window.open(overlayUrl, '_blank')}
                className="sf-btn sf-btn-ghost"
              >
                🔍 Abrir en navegador
              </button>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
          <div className={styles.card}>
            <div className={styles.calNav}>
              <button onClick={prevMonth} className={styles.calNavBtn}>←</button>
              <span className={styles.calMonthLabel}>{MONTHS[currentMonth]} {currentYear}</span>
              <button onClick={nextMonth} className={styles.calNavBtn}>→</button>
            </div>

            <div className={styles.calGrid}>
              {DAYS_SHORT.map(d => (
                <div key={d} className={styles.calDayHeader}>{d}</div>
              ))}
              {calendarDays.map((cd, i) => {
                const dayEvents = eventsForDay(cd.date);
                const isToday = cd.date === todayStr;
                return (
                  <div
                    key={i}
                    className={`${styles.calDay} ${!cd.isCurrentMonth ? styles.calDayOther : ''} ${isToday ? styles.calDayToday : ''}`}
                    onClick={() => openNewEvent(cd.date)}
                    title="Haz clic para añadir evento"
                  >
                    <div className={styles.calDayNum}>{cd.day}</div>
                    {dayEvents.slice(0, 3).map(ev => (
                      <span key={ev.id} className={styles.calDayDot} style={{ background: ev.color || '#7c3aed' }} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--sf-text-3)' }}>+{dayEvents.length - 3}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Events for selected month */}
            <p className={styles.sectionTitle}>Eventos de {MONTHS[currentMonth]}</p>
            {(() => {
              const monthEvents = events
                .filter(e => e.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`))
                .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
              if (monthEvents.length === 0) {
                return <div className="text-dim text-xs">No hay eventos este mes. Haz clic en un día para añadir uno.</div>;
              }
              return (
                <div className={styles.eventList}>
                  {monthEvents.map(ev => (
                    <div key={ev.id} className={styles.eventRow}>
                      <div className={styles.eventColor} style={{ background: ev.color || '#7c3aed' }} />
                      <div className={styles.eventInfo}>
                        <div className={styles.eventTitle}>{ev.title}</div>
                        <div className={styles.eventMeta}>
                          {ev.date} · {ev.startTime}
                          {ev.game ? ` · ${ev.game}` : ''}
                          {ev.duration ? ` · ${ev.duration}min` : ''}
                        </div>
                      </div>
                      <div className={styles.eventActions}>
                        <button onClick={() => openEditEvent(ev)} className={styles.eventBtn}>✎</button>
                        <button onClick={() => deleteEvent(ev.id)} className={styles.eventBtnDanger}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Quick Stats */}
        <div className={styles.twoColGrid}>
          <div className="glass-card">
            <div className={styles.card}>
              <p className={styles.sectionTitle}>📊 Este mes</p>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--sf-teal)' }}>
                {events.filter(e => e.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`)).length}
              </div>
              <div className="text-dim text-xs">eventos programados</div>
            </div>
          </div>
          <div className="glass-card">
            <div className={styles.card}>
              <p className={styles.sectionTitle}>🎯 Próximo directo</p>
              {(() => {
                const now = new Date();
                const upcoming = events
                  .filter(e => new Date(e.date + 'T' + e.startTime) >= now)
                  .sort((a, b) => new Date(a.date + 'T' + a.startTime).getTime() - new Date(b.date + 'T' + b.startTime).getTime());
                if (upcoming.length === 0) return <div className="text-dim text-xs">No hay próximos directos</div>;
                const next = upcoming[0];
                return (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{next.title}</div>
                    <div className="text-dim text-xs">{next.date} · {next.startTime}</div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>{editingId ? '✎ Editar evento' : '➕ Nuevo evento'}</span>
              <button onClick={closeModal} className={styles.modalClose}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Título *</label>
                <input className="sf-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Speedrun de Elden Ring" />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Fecha *</label>
                  <input className="sf-input" type="date" value={toInputDate(form.date)} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Hora *</label>
                  <input className="sf-input" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Duración (min)</label>
                  <input className="sf-input" type="number" min={15} step={15} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) || 60 }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Color</label>
                  <input className="sf-input" type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Juego</label>
                <input className="sf-input" value={form.game} onChange={e => setForm(f => ({ ...f, game: e.target.value }))} placeholder="Ej: Elden Ring" />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Categoría</label>
                <input className="sf-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ej: Any%" />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Descripción</label>
                <textarea className="sf-input" style={{ minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción opcional del directo" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={closeModal} className="sf-btn sf-btn-ghost" style={{ flex: 1 }}>Cancelar</button>
                <button onClick={saveEvent} className="sf-btn sf-btn-primary" style={{ flex: 2 }} disabled={!form.title || !form.date || !form.startTime}>
                  {editingId ? 'Guardar cambios' : 'Crear evento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
