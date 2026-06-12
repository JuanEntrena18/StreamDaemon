let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

function getMasterGain(): GainNode {
  getCtx();
  return masterGain!;
}

export function setMasterVolume(v: number) {
  const gain = getMasterGain();
  gain.gain.setValueAtTime(Math.max(0, Math.min(1, v)), gain.context.currentTime);
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
  gain.connect(getMasterGain());
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
