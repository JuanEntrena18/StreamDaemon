import { motion } from 'framer-motion';
import styles from './EmptyState.module.css';

interface Props {
  icon: string | React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={styles.container}
    >
      <div className={`animate-float ${styles.icon}`}>
        {icon}
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      
      {actionLabel && onAction && (
        <button onClick={onAction} className={styles.actionBtn}>
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
