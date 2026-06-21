import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Toast.module.css';

/* ── Types ── */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

/* ── Config ── */
const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const MAX_VISIBLE = 5;
const DEFAULT_DURATION = 3500;

let toastCounter = 0;

/* ── Provider ── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration: number = DEFAULT_DURATION) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const newToast: Toast = { id, type, message, duration };

    setToasts((prev) => {
      const next = [...prev, newToast];
      // Keep only the last MAX_VISIBLE toasts
      return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
    });

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const value: ToastContextValue = {
    toast: addToast,
    success: useCallback((msg: string, dur?: number) => addToast(msg, 'success', dur), [addToast]),
    error: useCallback((msg: string, dur?: number) => addToast(msg, 'error', dur), [addToast]),
    warning: useCallback((msg: string, dur?: number) => addToast(msg, 'warning', dur), [addToast]),
    info: useCallback((msg: string, dur?: number) => addToast(msg, 'info', dur), [addToast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* ── Toast container ── */}
      <div className={styles.container} aria-live="polite" aria-atomic="false">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.85 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`${styles.toast} ${styles[t.type]}`}
              role="alert"
            >
              <span className={styles.icon}>{TOAST_ICONS[t.type]}</span>
              <span className={styles.message}>{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className={styles.close}
                aria-label="Cerrar"
              >
                ×
              </button>

              {/* Progress bar */}
              {t.duration > 0 && (
                <motion.div
                  className={styles.progress}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: t.duration / 1000, ease: 'linear' }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/* ── Hook ── */
export function useToast() {
  return useContext(ToastContext);
}
