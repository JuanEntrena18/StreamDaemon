import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import styles from './PredictionOverlay.module.css';

interface Option {
  id: string;
  title: string;
  votes: number;
}

interface PredictionState {
  id: string;
  title: string;
  options: Option[];
  status: string;
  outcome: string | null;
}

interface Props {
  channel: string;
}

export function PredictionOverlay({ channel }: Props) {
  const [prediction, setPrediction] = useState<PredictionState | null>(null);
  const { socket, connected } = useSocket();

  useSocketEvent('prediction:create', useCallback((data: PredictionState) => {
    setPrediction(data);
  }, []));

  useSocketEvent('prediction:update', useCallback((data: { id: string; status: string; outcome: string | null }) => {
    setPrediction((prev) => prev && prev.id === data.id ? { ...prev, status: data.status, outcome: data.outcome } : prev);
  }, []));

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  const totalVotes = prediction?.options.reduce((acc, o) => acc + o.votes, 0) ?? 0;

  return (
    <AnimatePresence>
      {prediction && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`fixed bottom-6 left-6 right-6 max-w-lg p-4 rounded-lg ${styles.card}`}
        >
          <h3 className="text-lg font-bold mb-3">{prediction.title}</h3>
          <div className="flex flex-col gap-2">
            {prediction.options.map((option) => {
              const pct = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
              const isWinner = prediction.outcome === option.id;
              return (
                <div key={option.id} className={styles.optionRow}>
                  <div
                    className={styles.optionBar}
                    style={{
                      width: `${pct}%`,
                      background: isWinner ? 'var(--theme-accent)' : 'var(--theme-secondary)',
                      opacity: 0.3,
                    }}
                  />
                  <div className={styles.optionContent}>
                    <span>{option.title}{isWinner ? ' 👑' : ''}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className={styles.footer}>
            {prediction.status === 'active'
              ? 'Predicción activa — usa !predict en el chat'
              : prediction.status === 'resolved'
                ? 'Predicción finalizada'
                : 'Predicción bloqueada'}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
