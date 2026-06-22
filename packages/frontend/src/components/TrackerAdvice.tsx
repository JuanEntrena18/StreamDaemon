import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/context';
import styles from './TrackerAdvice.module.css';

interface AdviceItem {
  type: 'tip' | 'warning' | 'achievement' | 'info';
  icon: string;
  title: string;
  description: string;
}

interface Props {
  advice: AdviceItem[];
  ollamaAvailable: boolean;
}

const ADVICE_TYPE_STYLES: Record<string, { border: string; bg: string; iconBg: string }> = {
  tip: {
    border: 'rgba(6,182,212,0.2)',
    bg: 'rgba(6,182,212,0.05)',
    iconBg: 'rgba(6,182,212,0.12)',
  },
  warning: {
    border: 'rgba(245,158,11,0.2)',
    bg: 'rgba(245,158,11,0.05)',
    iconBg: 'rgba(245,158,11,0.12)',
  },
  achievement: {
    border: 'rgba(52,211,153,0.2)',
    bg: 'rgba(52,211,153,0.05)',
    iconBg: 'rgba(52,211,153,0.12)',
  },
  info: {
    border: 'rgba(124,58,237,0.2)',
    bg: 'rgba(124,58,237,0.05)',
    iconBg: 'rgba(124,58,237,0.12)',
  },
};

export function TrackerAdvice({ advice, ollamaAvailable }: Props) {
  const { t } = useTranslation();
  if (advice.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 }}
      className={styles.adviceSection}
    >
      <h3 className={styles.adviceTitle}>
        {t('tracker.consejos')}
        {ollamaAvailable && (
          <span className={styles.iaBadge}>
            {t('tracker.ia')}
          </span>
        )}
      </h3>
      <div className={styles.adviceList}>
        {advice.map((item, idx) => {
          const s = ADVICE_TYPE_STYLES[item.type] ?? ADVICE_TYPE_STYLES.info;
          return (
            <div
              key={idx}
              className={styles.adviceCard}
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
              }}
            >
              <div className={styles.adviceIconBox} style={{ background: s.iconBg }}>
                {item.icon}
              </div>
              <div>
                <p className={styles.adviceTextTitle}>
                  {item.title}
                </p>
                <p className={styles.adviceTextDesc}>
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
