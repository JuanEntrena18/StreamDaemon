import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import type { ChatMessage } from '@streamdaemon/shared';
import styles from './AllianceChatOverlay.module.css';

const MAX_MESSAGES = 18;

interface Props {
  channel: string;
}

/* ─────────────────────────────────────────
   WoW ALIANZA OVERLAY
   Paleta: azul real + plata + dorado imperial
   - Marco de webcam: piedra de Ventormenta, arcos góticos
   - Chat en formato pergamino regio con sello de la Alianza
   - Decoraciones: leones heráldicos, escudos, runas arcanas
───────────────────────────────────────── */
export function AllianceChatOverlay({ channel }: Props) {
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

  /* ── Tokens de color Alianza ── */
  const A = {
    blue:        '#0a1f5c',
    blueLight:   '#1a3a8c',
    blueBright:  '#2255cc',
    blueGlow:    '#4488ff',
    azure:       '#0066cc',
    gold:        '#b8860b',
    goldLight:   '#d4af37',
    goldGlow:    '#ffd700',
    silver:      '#c0c8d8',
    silverLight: '#e8edf5',
    parchment:   '#d4c8b0',
    ink:         '#0a0e1c',
    stone:       '#0f1830',
    lionGold:    '#c8a028',
    glow:        '#6699ff',
  };

  return (
    <div className={styles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cinzel+Decorative:wght@400;700&family=IM+Fell+English:ital@0;1&display=swap');

        @keyframes allianceShimmer {
          0%   { opacity: 0.6; }
          50%  { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes magicPulse {
          0%,100% { box-shadow: 0 0 8px ${A.blueGlow}44; }
          50%     { box-shadow: 0 0 20px ${A.blueGlow}88, 0 0 40px ${A.azure}44; }
        }
        @keyframes lionGlow {
          0%,100% { text-shadow: 0 0 6px ${A.goldLight}66; }
          50%     { text-shadow: 0 0 16px ${A.goldGlow}, 0 0 30px ${A.goldLight}88; }
        }
        @keyframes runeShine {
          0%   { opacity: 0.3; }
          50%  { opacity: 0.7; }
          100% { opacity: 0.3; }
        }
        @keyframes manaFloat {
          0%,100% { transform: translateY(0); opacity: 0.5; }
          50%     { transform: translateY(-5px); opacity: 0.9; }
        }
        .alliance-shimmer { animation: allianceShimmer 4s ease-in-out infinite; }
        .alliance-rune    { animation: runeShine 3s ease-in-out infinite; }
        .alliance-mana    { animation: manaFloat 4s ease-in-out infinite; }
        .alliance-lion    { animation: lionGlow 5s ease-in-out infinite; }
      `}</style>

      <div className={styles.vignette} style={{
        background: `
          radial-gradient(ellipse 18% 100% at 0% 50%, ${A.blueGlow}06 0%, transparent 100%),
          radial-gradient(ellipse 18% 100% at 100% 50%, ${A.blueGlow}06 0%, transparent 100%)
        `,
      }} />

      <div className={styles.webcamFrame}>
        <div className={styles.webcamArea} style={{ border: `1px solid ${A.blueBright}44` }} />

        <svg
          width="320" height="240"
          viewBox="0 0 320 240"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="allianceStone" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1a2560" />
              <stop offset="50%" stopColor="#0f1840" />
              <stop offset="100%" stopColor="#080f28" />
            </linearGradient>
            <linearGradient id="allianceGoldH" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={A.gold}      stopOpacity="0" />
              <stop offset="25%"  stopColor={A.goldLight}  stopOpacity="0.8" />
              <stop offset="50%"  stopColor={A.goldGlow}   stopOpacity="1" />
              <stop offset="75%"  stopColor={A.goldLight}  stopOpacity="0.8" />
              <stop offset="100%" stopColor={A.gold}       stopOpacity="0" />
            </linearGradient>
            <linearGradient id="allianceBlueH" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={A.blueGlow}   stopOpacity="0" />
              <stop offset="40%"  stopColor={A.blueGlow}   stopOpacity="0.6" />
              <stop offset="60%"  stopColor={A.blueGlow}   stopOpacity="0.6" />
              <stop offset="100%" stopColor={A.blueGlow}   stopOpacity="0" />
            </linearGradient>
            <filter id="allianceGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect x="0" y="0" width="320" height="16" fill="url(#allianceStone)" />
          <rect x="0" y="224" width="320" height="16" fill="url(#allianceStone)" />
          <rect x="0" y="0" width="16" height="240" fill="url(#allianceStone)" />
          <rect x="304" y="0" width="16" height="240" fill="url(#allianceStone)" />

          <rect x="0" y="0" width="320" height="16" fill="url(#allianceGoldH)" opacity="0.5" />
          <rect x="0" y="224" width="320" height="16" fill="url(#allianceGoldH)" opacity="0.5" />

          <line x1="0" y1="15.5" x2="320" y2="15.5" stroke={A.goldLight} strokeWidth="0.75" opacity="0.7" />
          <line x1="0" y1="224.5" x2="320" y2="224.5" stroke={A.goldLight} strokeWidth="0.75" opacity="0.7" />
          <line x1="15.5" y1="0" x2="15.5" y2="240" stroke={A.goldLight} strokeWidth="0.75" opacity="0.6" />
          <line x1="304.5" y1="0" x2="304.5" y2="240" stroke={A.goldLight} strokeWidth="0.75" opacity="0.6" />

          <line x1="20" y1="20" x2="300" y2="20" stroke={A.blueGlow} strokeWidth="0.4" opacity="0.4" />
          <line x1="20" y1="220" x2="300" y2="220" stroke={A.blueGlow} strokeWidth="0.4" opacity="0.4" />
          <line x1="20" y1="20" x2="20" y2="220" stroke={A.blueGlow} strokeWidth="0.4" opacity="0.4" />
          <line x1="300" y1="20" x2="300" y2="220" stroke={A.blueGlow} strokeWidth="0.4" opacity="0.4" />

          <g>
            <polygon points="0,0 36,0 0,36" fill="#0d1440" opacity="0.98" />
            <path d="M4,4 L16,4 L16,18 Q10,22 4,18 Z" fill={A.blueLight} stroke={A.goldLight} strokeWidth="0.5" />
            <text x="10" y="15" fontSize="7" fill={A.goldLight} textAnchor="middle" fontFamily="serif">✦</text>
            <line x1="0" y1="36" x2="36" y2="0" stroke={A.goldLight} strokeWidth="0.5" opacity="0.5" />
          </g>
          <g transform="translate(320,0) scale(-1,1)">
            <polygon points="0,0 36,0 0,36" fill="#0d1440" opacity="0.98" />
            <path d="M4,4 L16,4 L16,18 Q10,22 4,18 Z" fill={A.blueLight} stroke={A.goldLight} strokeWidth="0.5" />
            <text x="10" y="15" fontSize="7" fill={A.goldLight} textAnchor="middle" fontFamily="serif">✦</text>
            <line x1="0" y1="36" x2="36" y2="0" stroke={A.goldLight} strokeWidth="0.5" opacity="0.5" />
          </g>
          <g transform="translate(0,240) scale(1,-1)">
            <polygon points="0,0 36,0 0,36" fill="#0d1440" opacity="0.98" />
            <path d="M4,4 L16,4 L16,18 Q10,22 4,18 Z" fill={A.blueLight} stroke={A.goldLight} strokeWidth="0.5" />
            <text x="10" y="15" fontSize="7" fill={A.goldLight} textAnchor="middle" fontFamily="serif">✦</text>
            <line x1="0" y1="36" x2="36" y2="0" stroke={A.goldLight} strokeWidth="0.5" opacity="0.5" />
          </g>
          <g transform="translate(320,240) scale(-1,-1)">
            <polygon points="0,0 36,0 0,36" fill="#0d1440" opacity="0.98" />
            <path d="M4,4 L16,4 L16,18 Q10,22 4,18 Z" fill={A.blueLight} stroke={A.goldLight} strokeWidth="0.5" />
            <text x="10" y="15" fontSize="7" fill={A.goldLight} textAnchor="middle" fontFamily="serif">✦</text>
            <line x1="0" y1="36" x2="36" y2="0" stroke={A.goldLight} strokeWidth="0.5" opacity="0.5" />
          </g>

          <g transform="translate(60,0)">
            <rect width="200" height="16" fill="#0d1440" />
            <path d="M80,16 Q100,-4 120,16" fill="none" stroke={A.goldLight} strokeWidth="0.75" opacity="0.6" />
            <text x="100" y="12" fontSize="9" fontFamily="'Cinzel', serif" fontWeight="700" fill={A.goldLight} textAnchor="middle" letterSpacing="2" opacity="0.85">⚜ FOR THE ALLIANCE ⚜</text>
          </g>

          {['✦', '◈', '✦'].map((rune, i) => (
            <text key={i} x="7" y={80 + i * 28} fontSize="9" fill={A.blueGlow} opacity="0.5" textAnchor="middle" fontFamily="serif">{rune}</text>
          ))}
          {['✦', '◈', '✦'].map((rune, i) => (
            <text key={i} x="313" y={80 + i * 28} fontSize="9" fill={A.blueGlow} opacity="0.5" textAnchor="middle" fontFamily="serif">{rune}</text>
          ))}

          <g transform="translate(40,224)">
            <rect x="0" y="0" width="240" height="16" fill="#0a1030" opacity="0.96" />
            <rect x="0" y="0" width="240" height="16" fill="url(#allianceGoldH)" opacity="0.3" />
            <text x="120" y="12" fontSize="9" fontFamily="'Cinzel', serif" fontWeight="600" fill={A.goldLight} textAnchor="middle" letterSpacing="2" opacity="0.85">{channel.toUpperCase()}</text>
          </g>

          <circle cx="36" cy="36" r="2.5" fill={A.blueGlow} opacity="0.5" />
          <circle cx="284" cy="36" r="2.5" fill={A.blueGlow} opacity="0.5" />
          <circle cx="36" cy="204" r="2.5" fill={A.blueGlow} opacity="0.5" />
          <circle cx="284" cy="204" r="2.5" fill={A.blueGlow} opacity="0.5" />
        </svg>

        <div className="alliance-mana" style={{
          position: 'absolute', top: 30, left: 30,
          width: 4, height: 4, borderRadius: '50%',
          background: A.blueGlow,
          boxShadow: `0 0 8px ${A.blueGlow}, 0 0 16px ${A.azure}88`,
        }} />
        <div className="alliance-mana" style={{
          position: 'absolute', bottom: 30, right: 30,
          width: 3, height: 3, borderRadius: '50%',
          background: A.goldGlow,
          boxShadow: `0 0 6px ${A.goldGlow}, 0 0 12px ${A.goldLight}88`,
          animationDelay: '1.5s',
        }} />
      </div>

      <div className={styles.chatSection}>
        <svg width="420" height="56" viewBox="0 0 420 56" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="allianceHeaderBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a2e80" />
              <stop offset="60%" stopColor="#0f1d5c" />
              <stop offset="100%" stopColor="#080e30" />
            </linearGradient>
            <linearGradient id="allianceHeaderGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={A.blueGlow} stopOpacity="0" />
              <stop offset="30%" stopColor={A.blueGlow} stopOpacity="0.6" />
              <stop offset="50%" stopColor={A.glow} stopOpacity="0.8" />
              <stop offset="70%" stopColor={A.blueGlow} stopOpacity="0.6" />
              <stop offset="100%" stopColor={A.blueGlow} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,20 Q0,0 20,0 L400,0 Q420,0 420,20 L420,56 L0,56 Z" fill="url(#allianceHeaderBg)" />
          <path d="M0,20 Q0,0 20,0 L400,0 Q420,0 420,20" fill="none" stroke="url(#allianceHeaderGlow)" strokeWidth="1.5" />
          <path d="M0,20 Q0,0.5 20,0.5 L400,0.5 Q419.5,0.5 419.5,20 L419.5,56 L0.5,56" fill="none" stroke={A.goldLight} strokeWidth="0.5" opacity="0.5" />
          <text x="24" y="38" fontSize="22" fill={A.lionGold} opacity="0.85" fontFamily="serif">🦁</text>
          <text x="210" y="24" fontSize="9" fontFamily="'Cinzel', serif" fontWeight="700" fill={A.blueGlow} textAnchor="middle" letterSpacing="4" opacity="0.7">HERALDS OF THE KING</text>
          <text x="210" y="44" fontSize="14" fontFamily="'Cinzel Decorative', serif" fontWeight="700" fill={A.goldGlow} textAnchor="middle" letterSpacing="1" style={{ filter: `drop-shadow(0 0 6px ${A.blueGlow}88)` }}>{t('overlayChat.chatAlianza')}</text>
          <text x="396" y="38" fontSize="22" fill={A.lionGold} opacity="0.85" fontFamily="serif" textAnchor="end">🦁</text>
          <line x1="0" y1="55.5" x2="420" y2="55.5" stroke={A.goldLight} strokeWidth="0.6" opacity="0.55" />
        </svg>

        <div className={styles.chatBody} style={{
          background: `linear-gradient(180deg, #080e30 0%, #060a22 40%, #080f28 100%)`,
          borderLeft: `1px solid ${A.goldLight}44`,
          borderRight: `1px solid ${A.goldLight}44`,
        }}>
          <div className={styles.chatLines} style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 22px, ${A.blueGlow}05 22px, ${A.blueGlow}05 23px)`,
          }} />
          <div className={styles.chatStains} style={{
            background: `radial-gradient(ellipse 50% 40% at 15% 60%, ${A.blueGlow}05 0%, transparent 100%), radial-gradient(ellipse 35% 25% at 85% 30%, ${A.goldLight}04 0%, transparent 100%)`,
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
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={styles.msgRow}
                    style={{
                      borderLeft: isLast ? `3px solid ${A.blueGlow}` : `3px solid ${msg.user.color || A.goldLight}88`,
                      background: isLast ? `linear-gradient(90deg, ${A.blueGlow}14 0%, transparent 75%)` : 'transparent',
                    }}
                  >
                    {isLast && (
                      <div className={styles.manaGem} style={{ background: A.blueGlow, boxShadow: `0 0 10px ${A.blueGlow}` }} />
                    )}

                    <div className={styles.msgContent}>
                      <span className={styles.username} style={{ color: msg.user.color || A.goldLight, textShadow: `0 0 8px ${msg.user.color || A.goldLight}66` }}>
                        {msg.user.displayName}
                      </span>
                      <span className={styles.separator} style={{ color: `${A.blueGlow}88` }}>⸬</span>
                      <span className={styles.messageText} style={{ color: `${A.silver}cc` }}>
                        {msg.text}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {messages.length === 0 && (
              <div className={styles.emptyPlaceholder}>
                <div className={styles.emptyText} style={{ color: `${A.blueGlow}55` }}>
                  {t('overlayChat.heraldosEsperan')}
                </div>
              </div>
            )}
          </div>
        </div>

        <svg width="420" height="32" viewBox="0 0 420 32" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="allianceFooterBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#080e30" />
              <stop offset="100%" stopColor="#1a2e80" />
            </linearGradient>
          </defs>
          <path d="M0,0 L420,0 L420,16 Q420,32 400,32 L20,32 Q0,32 0,16 Z" fill="url(#allianceFooterBg)" />
          <line x1="0" y1="0.5" x2="420" y2="0.5" stroke={A.goldLight} strokeWidth="0.5" opacity="0.4" />
          <text x="210" y="22" fontSize="9" fontFamily="'Cinzel', serif" fill={A.blueGlow} textAnchor="middle" letterSpacing="3" opacity="0.6">✦ FOR AZEROTH ✦</text>
          <circle cx="20" cy="16" r="2.5" fill={A.blueGlow} opacity="0.55" />
          <circle cx="400" cy="16" r="2.5" fill={A.blueGlow} opacity="0.55" />
        </svg>
      </div>

      <div className={styles.watermark}>
        <svg width="180" height="220" viewBox="0 0 180 220">
          <path d="M10,10 L170,10 L170,140 Q90,210 10,140 Z" fill="none" stroke={A.goldLight} strokeWidth="3" />
          <path d="M25,25 L155,25 L155,138 Q90,195 25,138 Z" fill="none" stroke={A.blueGlow} strokeWidth="1.5" />
          <line x1="90" y1="30" x2="90" y2="185" stroke={A.goldLight} strokeWidth="2.5" />
          <line x1="28" y1="90" x2="152" y2="90" stroke={A.goldLight} strokeWidth="2.5" />
          <text x="90" y="75" fontSize="52" textAnchor="middle" fill={A.goldLight} fontFamily="serif">🦁</text>
        </svg>
      </div>

      <div className={styles.connectionIndicator}>
        <div className={styles.connectionDot} style={{
          background: connected ? A.blueGlow : `${A.blueGlow}44`,
          boxShadow: connected ? `0 0 6px ${A.blueGlow}, 0 0 12px ${A.azure}88` : 'none',
        }} />
        <span className={styles.connectionLabel} style={{
          color: connected ? `${A.blueGlow}cc` : `${A.silver}55`,
        }}>
          {connected ? t('overlayChat.enVivo') : t('overlayChat.desconectado')}
        </span>
      </div>
    </div>
  );
}
