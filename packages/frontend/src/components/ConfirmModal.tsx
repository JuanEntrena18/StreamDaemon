import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n/context';
import styles from './ConfirmModal.module.css';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  showDontAskAgain?: boolean;
  onConfirm: (dontAskAgain?: boolean) => void;
  onCancel: () => void;
}

export function ConfirmModal({ open, title, message, confirmLabel, cancelLabel, danger = true, showDontAskAgain = false, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  useEffect(() => {
    if (open) setTimeout(() => confirmRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === confirmRef.current) {
          e.preventDefault();
          cancelRef.current?.focus();
        } else if (!e.shiftKey && document.activeElement === cancelRef.current) {
          e.preventDefault();
          confirmRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onCancel}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.header}>
              <span className={danger ? styles.iconDanger : styles.iconWarning}>
                {danger ? '⚠️' : 'ℹ️'}
              </span>
              <h3 className={styles.title}>{title}</h3>
            </div>

            <p className={styles.message}>{message}</p>

            {showDontAskAgain && (
              <label className={styles.dontAskRow}>
                <input
                  type="checkbox"
                  checked={dontAskAgain}
                  onChange={(e) => setDontAskAgain(e.target.checked)}
                  className={styles.checkbox}
                />
                <span className={styles.dontAskLabel}>{t('confirm.dontAskAgain')}</span>
              </label>
            )}

            <div className={styles.actions}>
              <button
                ref={cancelRef}
                onClick={onCancel}
                className="sf-btn sf-btn-ghost"
              >
                {cancelLabel || t('confirm.cancel')}
              </button>
              <button
                ref={confirmRef}
                onClick={() => onConfirm(dontAskAgain)}
                className={`sf-btn ${danger ? 'sf-btn-danger' : 'sf-btn-primary'}`}
              >
                {confirmLabel || t('confirm.confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
