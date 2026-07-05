import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n/context';
import styles from './OverlayPreviewModal.module.css';

type BackgroundMode = 'checkerboard' | 'black' | 'white' | 'chroma';

interface Props {
  open: boolean;
  url: string;
  orientation: 'horizontal' | 'vertical';
  onClose: () => void;
}

const RESOLUTIONS = {
  horizontal: { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920 },
};

const BACKGROUNDS: { mode: BackgroundMode; labelKey: string; color: string }[] = [
  { mode: 'checkerboard', labelKey: 'overlayPreview.bgCheckerboard', color: '' },
  { mode: 'black', labelKey: 'overlayPreview.bgBlack', color: '#000000' },
  { mode: 'white', labelKey: 'overlayPreview.bgWhite', color: '#ffffff' },
  { mode: 'chroma', labelKey: 'overlayPreview.bgChroma', color: '#00ff00' },
];

export function OverlayPreviewModal({ open, url, orientation, onClose }: Props) {
  const { t } = useTranslation();
  const [bgMode, setBgMode] = useState<BackgroundMode>('checkerboard');
  const [demoMode, setDemoMode] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const res = RESOLUTIONS[orientation];

  const scaledUrl = demoMode
    ? url + (url.includes('?') ? '&' : '?') + 'demo=true'
    : url;

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const padding = 48;
    const maxW = containerRef.current.clientWidth - padding;
    const maxH = containerRef.current.clientHeight - padding;
    const scaleX = maxW / res.width;
    const scaleY = maxH / res.height;
    setScale(Math.max(0.1, Math.min(scaleX, scaleY, 1.5)));
  }, [res.width, res.height]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      updateScale();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateScale]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const bgStyle = bgMode === 'checkerboard'
    ? { backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
       backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }
    : { backgroundColor: BACKGROUNDS.find(b => b.mode === bgMode)?.color ?? '#000000' };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.toolbar}>
              <div className={styles.toolbarLeft}>
                <span className={styles.resLabel}>{res.width}×{res.height}</span>
                <span className={styles.orientationBadge}>
                  {orientation === 'vertical' ? t('overlayPreview.vertical') : t('overlayPreview.horizontal')}
                </span>
              </div>
              <div className={styles.toolbarCenter}>
                <span className={styles.controlLabel}>{t('overlayPreview.background')}</span>
                <div className={styles.bgOptions}>
                  {BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.mode}
                      onClick={() => setBgMode(bg.mode)}
                      className={`${styles.bgBtn} ${bgMode === bg.mode ? styles.bgBtnActive : ''}`}
                      title={t(bg.labelKey)}
                    >
                      {bg.mode === 'checkerboard' && <span className={styles.checkerIcon} />}
                      {bg.mode === 'black' && <span className={styles.colorSwatch} style={{ background: '#000', border: '1px solid #555' }} />}
                      {bg.mode === 'white' && <span className={styles.colorSwatch} style={{ background: '#fff' }} />}
                      {bg.mode === 'chroma' && <span className={styles.colorSwatch} style={{ background: '#00ff00' }} />}
                    </button>
                  ))}
                </div>
                <label className={styles.demoToggle}>
                  <input
                    type="checkbox"
                    checked={demoMode}
                    onChange={(e) => setDemoMode(e.target.checked)}
                  />
                  <span>{t('overlayPreview.demoData')}</span>
                </label>
              </div>
              <div className={styles.toolbarRight}>
                <span className={styles.scaleLabel}>{Math.round(scale * 100)}%</span>
                <button onClick={onClose} className={styles.closeBtn}>
                  ✕
                </button>
              </div>
            </div>

            <div className={styles.canvasArea} ref={containerRef} style={bgStyle}>
              <div
                className={styles.iframeWrapper}
                style={{
                  width: res.width,
                  height: res.height,
                  transform: `scale(${scale})`,
                }}
              >
                <iframe
                  key={scaledUrl}
                  src={scaledUrl}
                  className={styles.iframe}
                  title={t('overlayPreview.previewTitle')}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
