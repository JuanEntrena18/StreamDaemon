let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export const SOUNDS = {
  pop: () => {
    playTone(800, 0.08, 'sine', 0.12);
  },
  ding: () => {
    playTone(1200, 0.15, 'sine', 0.1);
    setTimeout(() => playTone(1600, 0.2, 'sine', 0.08), 80);
  },
  chime: () => {
    playTone(523, 0.2, 'sine', 0.1);
    setTimeout(() => playTone(659, 0.2, 'sine', 0.08), 120);
    setTimeout(() => playTone(784, 0.3, 'sine', 0.07), 240);
  },
  notification: () => {
    playTone(600, 0.1, 'triangle', 0.12);
    setTimeout(() => playTone(900, 0.15, 'triangle', 0.1), 100);
    setTimeout(() => playTone(1200, 0.2, 'triangle', 0.08), 200);
  },
} as const;

export type SoundKey = keyof typeof SOUNDS;
