import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';

interface Props {
  channel: string;
}

interface GiveawayState {
  id: string;
  prize: string;
  status: string;
  winnerId: string | null;
  entries: number;
}

export function GiveawayOverlay({ channel }: Props) {
  const [giveaway, setGiveaway] = useState<GiveawayState | null>(null);
  const [winner, setWinner] = useState<{ winner: string; prize: string } | null>(null);
  const { socket } = useSocket();

  useSocketEvent('giveaway:start', useCallback((data: GiveawayState) => {
    setGiveaway(data);
    setWinner(null);
  }, []));

  useSocketEvent('giveaway:end', useCallback(() => {
    setGiveaway(null);
  }, []));

  useSocketEvent('giveaway:winner', useCallback((data: { winner: string; prize: string }) => {
    setWinner(data);
    setTimeout(() => setWinner(null), 15000);
  }, []));

  useEffect(() => {
    if (channel && socket?.connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, socket?.connected]);

  return (
    <>
      <AnimatePresence>
        {giveaway && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-8 rounded-xl text-center"
            style={{
              background: 'rgba(0,0,0,0.85)',
              border: 'var(--theme-border)',
              boxShadow: 'var(--theme-glow)',
            }}
          >
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--theme-accent)' }}>
              🎉 SORTEO ACTIVO
            </h2>
            <p className="text-xl mb-4">{giveaway.prize}</p>
            <p className="text-sm opacity-70">Escribe !sorteo en el chat para participar</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-8 rounded-xl text-center"
            style={{
              background: 'rgba(0,0,0,0.9)',
              border: 'var(--theme-border)',
              boxShadow: 'var(--theme-glow)',
            }}
          >
            <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>
              🏆 GANADOR
            </h2>
            <p className="text-4xl font-bold mb-2" style={{ color: 'var(--theme-accent)' }}>
              @{winner.winner}
            </p>
            <p className="text-xl">{winner.prize}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
