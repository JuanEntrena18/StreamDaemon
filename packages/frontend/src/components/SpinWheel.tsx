import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/context';
import { EmptyState } from './EmptyState';
import styles from './SpinWheel.module.css';

export interface SpinWheelHandle {
  autoSpin: (names: string[]) => void;
}

const WHEEL_COLORS = [
  '#7c3aed', '#6366f1', '#8b5cf6', '#a78bfa',
  '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#f97316',
];

export const SpinWheel = forwardRef<SpinWheelHandle>((_props, ref) => {
  const { t } = useTranslation();
  const [wheelNames, setWheelNames] = useState<string[]>([]);
  const [wheelInput, setWheelInput] = useState('');
  const [importText, setImportText] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [spinDuration, setSpinDuration] = useState(15);
  const [winner, setWinner] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawWheel();
  }, [wheelNames, rotation]);

  function drawWheel() {
    const canvas = wheelRef.current;
    if (!canvas || wheelNames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(cx, cy) - 4;
    const slice = (2 * Math.PI) / wheelNames.length;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);

    for (let i = 0; i < wheelNames.length; i++) {
      const startAngle = i * slice - Math.PI / 2;
      const endAngle = startAngle + slice;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + slice / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(wheelNames[i].substring(0, 12), r - 12, 4);
      ctx.restore();
    }

    ctx.restore();
  }

  function addWheelName() {
    const name = wheelInput.trim();
    if (!name || wheelNames.includes(name)) return;
    setWheelNames([...wheelNames, name]);
    setWheelInput('');
    setWinner(null);
  }

  function removeWheelName(idx: number) {
    setWheelNames(wheelNames.filter((_, i) => i !== idx));
    setWinner(null);
  }

  function startSpin() {
    if (wheelNames.length < 2 || spinning) return;
    setSpinning(true);
    setWinner(null);

    const slice = (2 * Math.PI) / wheelNames.length;
    const spins = 5 + Math.floor(Math.random() * 5);
    const target = Math.random() * slice;
    const totalRotation = spins * 2 * Math.PI + target;
    const startRotation = rotation;
    const endRotation = startRotation + totalRotation;

    const duration = spinDuration * 1000;
    const startTime = performance.now();

    function animate(time: number) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + totalRotation * eased;
      setRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setRotation(endRotation);
        setSpinning(false);
        const normalized = ((endRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const winnerIdx = Math.floor(((2 * Math.PI - normalized) % (2 * Math.PI)) / slice) % wheelNames.length;
        setWinner(wheelNames[winnerIdx]);
      }
    }

    requestAnimationFrame(animate);
  }

  useImperativeHandle(ref, () => ({
    autoSpin(names: string[]) {
      setWheelNames(names);
      setRotation(0);
      setWinner(null);
      setTimeout(startSpin, 300);
    },
  }));

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <p className="sf-section-title mb-3">{t('giveaway.ruleta')}</p>
      <p className={styles.description}>
        {t('giveaway.ruletaDesc')}
      </p>

      <details className="mb-3">
        <summary className="text-dim" style={{ fontSize: '0.72rem', cursor: 'pointer', userSelect: 'none' }}>
          {t('giveaway.importar')}
        </summary>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={t('giveaway.importarPlaceholder')}
          className="sf-input"
          style={{ width: '100%', minHeight: 60, fontSize: '0.78rem', marginTop: '0.5rem' }}
        />
        <div className="flex-row flex-row--gap-sm mt-2">
          <button
            onClick={() => {
              const names = importText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
              if (names.length === 0) return;
              setWheelNames((prev) => {
                const existing = new Set(prev);
                const newNames = names.filter((n) => !existing.has(n));
                return [...prev, ...newNames];
              });
              setImportText('');
              setWinner(null);
            }}
            disabled={!importText.trim()}
            className="sf-btn sf-btn-primary"
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.875rem' }}
          >
            {t('giveaway.añadirARuleta')}
          </button>
          <span className={styles.hintText}>
            {t('giveaway.nombresHint')}
          </span>
        </div>
      </details>

      <div className="flex-row flex-row--gap-sm mb-3">
        <input
          type="text"
          value={wheelInput}
          onChange={(e) => setWheelInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addWheelName(); }}
          placeholder={t('giveaway.participantePlaceholder')}
          className="sf-input flex-1"
          style={{ fontSize: '0.82rem' }}
        />
        <button
          onClick={addWheelName}
          disabled={!wheelInput.trim()}
          className="sf-btn sf-btn-primary"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
        >
          {t('giveaway.añadir')}
        </button>
      </div>

      {wheelNames.length > 0 && (
        <div className="flex-wrap mb-4">
          {wheelNames.map((name, i) => (
            <span
              key={i}
              className={styles.wheelChip}
              style={{
                background: `${WHEEL_COLORS[i % WHEEL_COLORS.length]}33`,
                border: `1px solid ${WHEEL_COLORS[i % WHEEL_COLORS.length]}66`,
              }}
            >
              {name}
              <button
                onClick={() => removeWheelName(i)}
                className={styles.wheelRemoveBtn}
              >×</button>
            </span>
          ))}
        </div>
      )}

      <div className="flex-row flex-row--gap-sm mb-3">
        <span className="text-dim" style={{ fontSize: '0.72rem', fontWeight: 500 }}>
          {t('giveaway.giroDuracion')}
        </span>
        {[10, 15, 20].map((s) => (
          <button
            key={s}
            onClick={() => setSpinDuration(s)}
            className={`sf-pill-selector__pill sf-pill-selector__pill--sm ${spinDuration === s ? 'sf-pill-selector__pill--active' : ''}`}
          >
            {s} {t('giveaway.seg')}
          </button>
        ))}
      </div>

      <div className={styles.wheelContainer}>
        {wheelNames.length < 2 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EmptyState
              icon="🎡"
              title={t('giveaway.emptyTitle') || 'Ruleta vacía'}
              description={t('giveaway.minimoNombres') || 'Añade al menos 2 nombres para girar la ruleta.'}
            />
          </div>
        ) : (
          <>
            <canvas
              ref={wheelRef}
              width={280}
              height={280}
              style={{ width: '100%', height: '100%', borderRadius: '50%' }}
              role="img"
              aria-label={t('giveaway.ruletaDesc')}
            />
            <div className={styles.wheelPointer} />
          </>
        )}
      </div>

      <button
        onClick={startSpin}
        disabled={wheelNames.length < 2 || spinning}
        className={`sf-btn w-full ${spinning ? 'sf-btn-ghost' : 'sf-btn-primary'}`}
        style={{ marginBottom: winner ? '0.75rem' : 0 }}
      >
        {spinning ? t('giveaway.girando') : t('giveaway.girar')}
      </button>

      {winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={styles.winnerBox}
        >
          <div className={styles.winnerLabel}>
            {t('giveaway.ganador')}
          </div>
          <div className={styles.winnerName}>
            {winner}
          </div>
        </motion.div>
      )}
    </div>
  );
});
