import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import type { ChatMessage } from '@streamforger/shared';
import styles from './WowChatOverlay.module.css';

const MAX_MESSAGES = 18;

interface Props {
  channel: string;
}

/* ─────────────────────────────────────────
   WoW HORDA OVERLAY
   Paleta: rojo sangre + negro carbón + dorado ominoso
   - Marco de webcam estilo piedra orco grabada
   - Chat en formato pergamino envejecido
   - Decoraciones: cráneos, huesos, runas orcas
───────────────────────────────────────── */
export function WowChatOverlay({ channel }: Props) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { socket, connected } = useSocket();
  const chatRef = useRef<HTMLDivElement>(null);

  useSocketEvent('chat:message', useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), msg]);
  }, []));

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  /* ── Tokens de color Horda ── */
  const H = {
    red:       '#8b0000',
    redBright: '#c41e1e',
    redGlow:   '#ff2020',
    gold:      '#b8860b',
    goldLight: '#daa520',
    goldGlow:  '#ffd700',
    bone:      '#d4c5a0',
    parchment: '#c8b070',
    ink:       '#1a0a00',
    shadow:    '#0d0500',
    stone:     '#1c1008',
    ember:     '#ff6600',
  };

  return (
    <div className={styles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cinzel+Decorative:wght@400;700&family=IM+Fell+English:ital@0;1&display=swap');

        @keyframes hordaFlicker {
          0%,100%  { opacity: 1; }
          92%      { opacity: 1; }
          93%      { opacity: 0.88; }
          94%      { opacity: 1; }
          97%      { opacity: 0.92; }
          98%      { opacity: 1; }
        }
        @keyframes emberFloat {
          0%   { transform: translateY(0) scale(1);   opacity: 0.7; }
          50%  { transform: translateY(-8px) scale(1.1); opacity: 1; }
          100% { transform: translateY(0) scale(1);   opacity: 0.7; }
        }
        @keyframes runeGlow {
          0%,100% { text-shadow: 0 0 4px ${H.red}88; }
          50%     { text-shadow: 0 0 12px ${H.redGlow}, 0 0 24px ${H.red}66; }
        }
        @keyframes bloodPulse {
          0%,100% { box-shadow: inset 0 0 20px ${H.red}22; }
          50%     { box-shadow: inset 0 0 40px ${H.red}44; }
        }
        @keyframes scrollReveal {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .horda-rune { animation: runeGlow 2.5s ease-in-out infinite; }
        .horda-ember { animation: emberFloat 3s ease-in-out infinite; }
        .horda-flicker { animation: hordaFlicker 8s ease-in-out infinite; }
      `}</style>

      <div className={styles.vignette} style={{
        background: `
          radial-gradient(ellipse 20% 100% at 0% 50%, ${H.red}08 0%, transparent 100%),
          radial-gradient(ellipse 20% 100% at 100% 50%, ${H.red}08 0%, transparent 100%)
        `,
      }} />

      <div className={styles.webcamFrame}>
        <div className={styles.webcamArea} style={{ border: `2px solid ${H.red}66` }} />

        <svg
          width="320" height="240"
          viewBox="0 0 320 240"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="hordaStone" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2a1505" />
              <stop offset="50%" stopColor="#1a0d02" />
              <stop offset="100%" stopColor="#0d0500" />
            </linearGradient>
            <linearGradient id="hordaGoldH" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={H.gold} stopOpacity="0" />
              <stop offset="30%" stopColor={H.goldLight} stopOpacity="0.9" />
              <stop offset="70%" stopColor={H.goldLight} stopOpacity="0.9" />
              <stop offset="100%" stopColor={H.gold} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hordaGoldV" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={H.gold} stopOpacity="0" />
              <stop offset="30%" stopColor={H.goldLight} stopOpacity="0.8" />
              <stop offset="70%" stopColor={H.goldLight} stopOpacity="0.8" />
              <stop offset="100%" stopColor={H.gold} stopOpacity="0" />
            </linearGradient>
            <filter id="hordaBlur">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>
            <filter id="hordaRedGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect x="0" y="0" width="320" height="240" fill="url(#hordaStone)" rx="4" />
          <rect x="0" y="0" width="320" height="240" fill="transparent" />

          <rect x="0" y="0" width="320" height="16" fill="url(#hordaStone)" />
          <rect x="0" y="224" width="320" height="16" fill="url(#hordaStone)" />
          <rect x="0" y="0" width="16" height="240" fill="url(#hordaStone)" />
          <rect x="304" y="0" width="16" height="240" fill="url(#hordaStone)" />

          <rect x="0" y="0" width="320" height="16" fill="url(#hordaGoldH)" opacity="0.4" />
          <rect x="0" y="224" width="320" height="16" fill="url(#hordaGoldH)" opacity="0.4" />
          <line x1="0" y1="15.5" x2="320" y2="15.5" stroke={H.goldLight} strokeWidth="0.5" opacity="0.6" />
          <line x1="0" y1="224.5" x2="320" y2="224.5" stroke={H.goldLight} strokeWidth="0.5" opacity="0.6" />
          <line x1="15.5" y1="0" x2="15.5" y2="240" stroke={H.goldLight} strokeWidth="0.5" opacity="0.6" />
          <line x1="304.5" y1="0" x2="304.5" y2="240" stroke={H.goldLight} strokeWidth="0.5" opacity="0.6" />

          <g transform="translate(0,0)">
            <polygon points="0,0 32,0 0,32" fill={H.stone} opacity="0.95" />
            <text x="8" y="22" fontSize="16" fill={H.red} opacity="0.9" fontFamily="serif">☠</text>
            <line x1="0" y1="32" x2="32" y2="0" stroke={H.goldLight} strokeWidth="0.5" opacity="0.5" />
          </g>
          <g transform="translate(320,0) scale(-1,1)">
            <polygon points="0,0 32,0 0,32" fill={H.stone} opacity="0.95" />
            <text x="8" y="22" fontSize="16" fill={H.red} opacity="0.9" fontFamily="serif">☠</text>
            <line x1="0" y1="32" x2="32" y2="0" stroke={H.goldLight} strokeWidth="0.5" opacity="0.5" />
          </g>
          <g transform="translate(0,240) scale(1,-1)">
            <polygon points="0,0 32,0 0,32" fill={H.stone} opacity="0.95" />
            <text x="8" y="22" fontSize="16" fill={H.red} opacity="0.9" fontFamily="serif">☠</text>
            <line x1="0" y1="32" x2="32" y2="0" stroke={H.goldLight} strokeWidth="0.5" opacity="0.5" />
          </g>
          <g transform="translate(320,240) scale(-1,-1)">
            <polygon points="0,0 32,0 0,32" fill={H.stone} opacity="0.95" />
            <text x="8" y="22" fontSize="16" fill={H.red} opacity="0.9" fontFamily="serif">☠</text>
            <line x1="0" y1="32" x2="32" y2="0" stroke={H.goldLight} strokeWidth="0.5" opacity="0.5" />
          </g>

          <g transform="translate(80,0)">
            <rect x="0" y="0" width="160" height="16" fill={H.stone} />
            <text x="80" y="13" fontSize="10" fontFamily="'Cinzel', serif" fontWeight="700" fill={H.goldLight} textAnchor="middle" letterSpacing="3" opacity="0.9">⚔ FOR THE HORDE ⚔</text>
          </g>

          {['᚛', '᚜', 'ᚈ'].map((rune, i) => (
            <text key={i} x="7" y={80 + i * 28} fontSize="12" fontFamily="serif" fill={H.red} opacity="0.6" textAnchor="middle">{rune}</text>
          ))}
          {['᚛', '᚜', 'ᚈ'].map((rune, i) => (
            <text key={i} x="313" y={80 + i * 28} fontSize="12" fontFamily="serif" fill={H.red} opacity="0.6" textAnchor="middle">{rune}</text>
          ))}

          <g transform="translate(40,224)">
            <rect x="0" y="0" width="240" height="16" fill="#1a0803" opacity="0.95" />
            <rect x="0" y="0" width="240" height="16" fill="url(#hordaGoldH)" opacity="0.25" />
            <text x="120" y="12" fontSize="9" fontFamily="'Cinzel', serif" fontWeight="600" fill={H.goldLight} textAnchor="middle" letterSpacing="2" opacity="0.85">{channel.toUpperCase()}</text>
          </g>

          <circle cx="32" cy="32" r="2" fill={H.ember} opacity="0.4" />
          <circle cx="288" cy="32" r="2" fill={H.ember} opacity="0.4" />
          <circle cx="32" cy="208" r="2" fill={H.ember} opacity="0.4" />
          <circle cx="288" cy="208" r="2" fill={H.ember} opacity="0.4" />
        </svg>

        <div className="horda-ember" style={{
          position: 'absolute', top: 28, right: 28,
          width: 4, height: 4, borderRadius: '50%',
          background: H.ember,
          boxShadow: `0 0 6px ${H.ember}, 0 0 12px ${H.redGlow}`,
        }} />
        <div className="horda-ember" style={{
          position: 'absolute', bottom: 28, left: 28,
          width: 3, height: 3, borderRadius: '50%',
          background: H.ember,
          boxShadow: `0 0 6px ${H.ember}, 0 0 12px ${H.redGlow}`,
          animationDelay: '1.2s',
        }} />
      </div>

      <div className={styles.chatSection}>
        <div className={styles.chatHeader}>
          <svg width="420" height="52" viewBox="0 0 420 52" style={{ display: 'block' }}>
            <defs>
              <linearGradient id="hordaHeaderBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3d1500" />
                <stop offset="60%" stopColor="#2a0d00" />
                <stop offset="100%" stopColor="#1a0500" />
              </linearGradient>
              <linearGradient id="hordaHeaderTop" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={H.red} stopOpacity="0" />
                <stop offset="20%" stopColor={H.redBright} stopOpacity="0.7" />
                <stop offset="50%" stopColor={H.redGlow} stopOpacity="0.9" />
                <stop offset="80%" stopColor={H.redBright} stopOpacity="0.7" />
                <stop offset="100%" stopColor={H.red} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,16 Q0,0 16,0 L404,0 Q420,0 420,16 L420,52 L0,52 Z" fill="url(#hordaHeaderBg)" />
            <path d="M0,16 Q0,0 16,0 L404,0 Q420,0 420,16" fill="none" stroke="url(#hordaHeaderTop)" strokeWidth="1.5" />
            <text x="24" y="34" fontSize="20" fill={H.red} opacity="0.8" fontFamily="serif">⚔</text>
            <text x="210" y="22" fontSize="9" fontFamily="'Cinzel', serif" fontWeight="700" fill={H.goldLight} textAnchor="middle" letterSpacing="4" opacity="0.7">{t('overlayChat.susurrosGuerra')}</text>
            <text x="210" y="40" fontSize="14" fontFamily="'Cinzel Decorative', serif" fontWeight="700" fill={H.goldGlow} textAnchor="middle" letterSpacing="1" style={{ filter: `drop-shadow(0 0 6px ${H.red}88)` }}>{t('overlayChat.chatHorda')}</text>
            <text x="396" y="34" fontSize="20" fill={H.red} opacity="0.8" fontFamily="serif" textAnchor="end">⚔</text>
            <line x1="0" y1="51.5" x2="420" y2="51.5" stroke={H.goldLight} strokeWidth="0.5" opacity="0.5" />
          </svg>
        </div>

        <div className={styles.chatBody} style={{
          background: `linear-gradient(180deg, #1a0500 0%, #150400 40%, #1a0800 100%)`,
          borderLeft: `1px solid ${H.gold}44`,
          borderRight: `1px solid ${H.gold}44`,
        }}>
          <div className={styles.chatLines} style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 22px, ${H.red}06 22px, ${H.red}06 23px)`,
          }} />
          <div className={styles.chatStains} style={{
            background: `radial-gradient(ellipse 60% 30% at 20% 70%, ${H.red}06 0%, transparent 100%), radial-gradient(ellipse 40% 20% at 80% 30%, ${H.red}04 0%, transparent 100%)`,
          }} />

          <div ref={chatRef} className={styles.chatMessages}>
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => {
                const isLast = i === messages.length - 1;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={styles.msgRow}
                    style={{
                      borderLeft: isLast ? `3px solid ${H.redBright}` : `3px solid ${msg.user.color || H.red}99`,
                      background: isLast ? `linear-gradient(90deg, ${H.red}18 0%, transparent 80%)` : 'transparent',
                    }}
                  >
                    {isLast && (
                      <div className={styles.bloodDot} style={{ background: H.redBright, boxShadow: `0 0 8px ${H.redGlow}` }} />
                    )}

                    <div className={styles.msgContent}>
                      <span className={styles.username} style={{ color: msg.user.color || H.goldLight, textShadow: `0 0 8px ${msg.user.color || H.gold}66` }}>
                        {msg.user.displayName}
                      </span>
                      <span className={styles.separator} style={{ color: `${H.red}99` }}>⸬</span>
                      <span className={styles.messageText} style={{ color: `${H.bone}cc` }}>
                        {msg.text}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {messages.length === 0 && (
              <div className={styles.emptyPlaceholder}>
                <div className={styles.emptyText} style={{ color: `${H.red}66` }}>
                  {t('overlayChat.guerrerosAguardan')}
                </div>
              </div>
            )}
          </div>
        </div>

        <svg width="420" height="32" viewBox="0 0 420 32" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="hordaFooterBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a0500" />
              <stop offset="100%" stopColor="#3d1500" />
            </linearGradient>
          </defs>
          <path d="M0,0 L420,0 L420,16 Q420,32 404,32 L16,32 Q0,32 0,16 Z" fill="url(#hordaFooterBg)" />
          <line x1="0" y1="0.5" x2="420" y2="0.5" stroke={H.goldLight} strokeWidth="0.5" opacity="0.4" />
          <text x="210" y="22" fontSize="9" fontFamily="'Cinzel', serif" fill={H.red} textAnchor="middle" letterSpacing="3" opacity="0.6">✦ LOK'TAR OGAR ✦</text>
          <circle cx="20" cy="16" r="2" fill={H.ember} opacity="0.5" />
          <circle cx="400" cy="16" r="2" fill={H.ember} opacity="0.5" />
        </svg>
      </div>

      <div className={styles.watermark}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke={H.red} strokeWidth="2" />
          <circle cx="100" cy="100" r="75" fill="none" stroke={H.red} strokeWidth="0.5" />
          <text x="100" y="130" fontSize="100" fontFamily="serif" fontWeight="900" fill={H.red} textAnchor="middle">H</text>
          <polygon points="60,160 70,200 80,155" fill={H.red} />
          <polygon points="120,160 130,200 140,155" fill={H.red} />
        </svg>
      </div>

      <div className={styles.connectionIndicator}>
        <div className={styles.connectionDot} style={{
          background: connected ? H.ember : H.red,
          boxShadow: connected ? `0 0 6px ${H.ember}, 0 0 12px ${H.ember}88` : `0 0 6px ${H.red}`,
        }} />
        <span className={styles.connectionLabel} style={{
          color: connected ? `${H.ember}cc` : `${H.red}88`,
        }}>
          {connected ? t('overlayChat.enVivo') : t('overlayChat.desconectado')}
        </span>
      </div>
    </div>
  );
}
