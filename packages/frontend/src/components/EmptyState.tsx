import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface Props {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  hint?: string;
}

/**
 * Estado vacío = invitación a actuar.
 * Icono + motivo + siguiente paso concreto. Sin animación de entrada.
 */
export function EmptyState({ icon, title, description, actionLabel, onAction, hint }: Props) {
  return (
    <div className={styles.container}>
      {icon && <div className={styles.iconWrap}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>

      {actionLabel && onAction && (
        <button onClick={onAction} className="sf-btn sf-btn-primary sf-btn-sm">
          {actionLabel}
        </button>
      )}

      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
