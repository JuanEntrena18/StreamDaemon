import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { OVERLAY_REGISTRY } from '../config/overlayRegistry';
import styles from './AdsPanel.module.css';

interface AdsConfig {
  mode: 'lateral' | 'crossfade';
  speed: number;
  width: number;
  height: number;
}

interface AdImage {
  id: string;
  filename: string;
  order: number;
}

interface AdsData {
  config: AdsConfig;
  images: AdImage[];
}

interface Props {
  channel: string;
}

export function AdsPanel({ channel }: Props) {
  const { socket } = useSocket();
  const [config, setConfig] = useState<AdsConfig>({ mode: 'lateral', speed: 50, width: 300, height: 200 });
  const [images, setImages] = useState<AdImage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const be = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  const ov = OVERLAY_REGISTRY.find(o => o.id === 'ads');
  const overlayBaseUrl = import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin;
  const overlayUrl = ov?.filename
    ? `${overlayBaseUrl}/overlays/${ov.filename}?channel=${channel}&backend=${encodeURIComponent(be)}`
    : '';

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`${be}/ads/${channel}`);
      if (res.ok) {
        const data: AdsData = await res.json();
        setConfig(data.config);
        setImages(data.images);
      }
    } catch {}
  }, [channel, be]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data: AdsData) => {
      if (data) {
        setConfig(data.config);
        setImages(data.images);
      }
    };
    socket.on('ads:update', handler);
    return () => { socket.off('ads:update', handler); };
  }, [socket]);

  const updateConfig = async (patch: Partial<AdsConfig>) => {
    const updated = { ...config, ...patch };
    setConfig(updated);
    try {
      await fetch(`${be}/ads/${channel}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {}
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.png')) { alert('Solo se permiten archivos PNG'); return; }
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      await fetch(`${be}/ads/${channel}/upload`, { method: 'POST', body: form });
      await loadData();
    } catch {}
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteImage = async (id: string) => {
    try {
      await fetch(`${be}/ads/${channel}/${id}`, { method: 'DELETE' });
      setImages(prev => prev.filter(im => im.id !== id));
    } catch {}
  };

  const moveImage = (from: number, to: number) => {
    const list = [...images];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    const reordered = list.map((im, i) => ({ ...im, order: i }));
    setImages(reordered);
    fetch(`${be}/ads/${channel}/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: reordered.map(im => im.id) }),
    }).catch(() => {});
  };

  const copy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className="sf-heading">📢 Publicidad</h2>
          <p className={styles.subtitle}>
            Gestiona imágenes publicitarias en formato PNG para mostrar en directo.
            El overlay ocupa solo el espacio de las imágenes, intégralo donde quieras en OBS.
          </p>
        </div>

        <div className={styles.twoColGrid}>
          {/* Config */}
          <div className="glass-card">
            <div className={styles.cardSection}>
              <p className={styles.sectionTitle}>⚙️ Configuración</p>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Modo de animación</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="mode" value="lateral" checked={config.mode === 'lateral'} onChange={() => updateConfig({ mode: 'lateral' })} />
                    <span>Movimiento lateral</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="mode" value="crossfade" checked={config.mode === 'crossfade'} onChange={() => updateConfig({ mode: 'crossfade' })} />
                    <span>Difuminado</span>
                  </label>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Velocidad: {config.speed}</label>
                <input type="range" min={1} max={100} value={config.speed} onChange={e => updateConfig({ speed: parseInt(e.target.value) })} className={styles.slider} />
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Ancho (px)</label>
                  <input className="sf-input" type="number" min={50} max={1920} value={config.width} onChange={e => updateConfig({ width: parseInt(e.target.value) || 300 })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Alto (px)</label>
                  <input className="sf-input" type="number" min={50} max={1080} value={config.height} onChange={e => updateConfig({ height: parseInt(e.target.value) || 200 })} />
                </div>
              </div>
            </div>
          </div>

          {/* OBS URL */}
          <div className="glass-card">
            <div className={styles.cardSection}>
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
        </div>

        {/* Preview */}
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
          <div className={styles.cardSection}>
            <p className={styles.sectionTitle}>👁️ Vista previa</p>
            <div className={styles.previewContainer}>
              <div
                className={styles.previewBox}
                style={{
                  width: Math.min(config.width, 600),
                  height: Math.min(config.height, 400),
                }}
              >
                {images.length === 0 ? (
                  <div className={styles.previewEmpty}>Sube imágenes para ver la previsualización</div>
                ) : config.mode === 'lateral' ? (
                  <PreviewLateral images={images} config={config} backend={be} channel={channel} />
                ) : (
                  <PreviewCrossfade images={images} config={config} backend={be} channel={channel} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Upload + Image list */}
        <div className="glass-card">
          <div className={styles.cardSection}>
            <div className={styles.uploadRow}>
              <p className={styles.sectionTitle}>🖼️ Imágenes</p>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png"
                  onChange={handleUpload}
                  style={{ display: 'none' }}
                  id="ads-file-input"
                />
                <button onClick={() => fileInputRef.current?.click()} className="sf-btn sf-btn-primary" disabled={uploading} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                  {uploading ? 'Subiendo...' : '+ Subir PNG'}
                </button>
                <div className="text-dim text-xs" style={{ marginTop: '0.25rem' }}>Solo PNG, fondo transparente recomendado</div>
              </div>
            </div>

            {images.length === 0 ? (
              <div className="text-dim text-xs">No hay imágenes. Sube PNG para empezar.</div>
            ) : (
              <div className={styles.imageGrid}>
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className={`${styles.imageCard} ${dragIdx === idx ? styles.dragging : ''}`}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={e => { e.preventDefault(); }}
                    onDrop={e => { e.preventDefault(); if (dragIdx !== null && dragIdx !== idx) { moveImage(dragIdx, idx); setDragIdx(null); } }}
                  >
                    <img src={`${be}/ads/${channel}/${img.filename}`} alt="" className={styles.thumb} />
                    <div className={styles.imageActions}>
                      <span className={styles.imageOrder}>#{idx + 1}</span>
                      <button onClick={() => deleteImage(img.id)} className={styles.deleteBtn}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PreviewLateral({ images, config, backend, channel }: { images: AdImage[]; config: AdsConfig; backend: string; channel: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || images.length === 0) return;
    let pos = 0;
    const speed = Math.max(0.2, config.speed / 10);
    const totalW = images.length * (config.width + 20);

    el.innerHTML = '';
    [...images, ...images].forEach(img => {
      const im = document.createElement('img');
      im.src = `${backend}/ads/${channel}/${img.filename}`;
      im.style.width = Math.min(config.width, 600) + 'px';
      im.style.height = Math.min(config.height, 400) + 'px';
      im.style.objectFit = 'contain';
      im.style.flexShrink = '0';
      im.style.borderRadius = '6px';
      el.appendChild(im);
    });

    function animate() {
      if (!el) return;
      pos -= speed;
      if (pos <= -totalW) pos = 0;
      el.style.transform = `translateX(${pos}px)`;
      frameRef.current = requestAnimationFrame(animate);
    }
    animate();
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [images, config.speed, config.width, config.height, backend, channel]);

  return (
    <div style={{ overflow: 'hidden', width: '100%', height: '100%', position: 'relative' }}>
      <div ref={trackRef} style={{ display: 'flex', gap: '20px', willChange: 'transform', height: '100%', alignItems: 'center' }} />
    </div>
  );
}

function PreviewCrossfade({ images, config, backend, channel }: { images: AdImage[]; config: AdsConfig; backend: string; channel: string }) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const interval = Math.max(2000, 6000 - config.speed * 50);
    const timer = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % images.length);
    }, interval);
    return () => clearInterval(timer);
  }, [images.length, config.speed]);

  const w = Math.min(config.width, 600);
  const h = Math.min(config.height, 400);

  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      {images.map((img, i) => (
        <img
          key={img.id}
          src={`${backend}/ads/${channel}/${img.filename}`}
          alt=""
          style={{
            position: 'absolute', top: 0, left: 0, width: w, height: h,
            objectFit: 'contain', borderRadius: '6px',
            opacity: i === activeIdx ? 1 : 0,
            transition: 'opacity 1s ease',
          }}
        />
      ))}
    </div>
  );
}
