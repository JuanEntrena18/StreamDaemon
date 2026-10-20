import type { StreamAvatarViseme } from '../types.js';
import type { AudioAnalysis } from '../types.js';

export interface VisemeMapOptions {
  sensitivity: number;
  noiseGate: number;
}

interface FormantEstimate {
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  veryHighEnergy: number;
  spectralCentroid: number;
}

function estimateFormants(audio: AudioAnalysis, rawRms: number): FormantEstimate {
  // The AudioAnalysis already splits into low/mid/high/very-high bands.
  // We add a crude spectral centroid estimate using the band energies as weights.
  const total = audio.lowFreq + audio.midFreq + audio.highFreq + audio.veryHighFreq + 0.001;
  const centroid = (audio.lowFreq * 250 + audio.midFreq * 1500 + audio.highFreq * 3500 + audio.veryHighFreq * 6500) / total;

  return {
    lowEnergy: audio.lowFreq,
    midEnergy: audio.midFreq,
    highEnergy: audio.highFreq,
    veryHighEnergy: audio.veryHighFreq * Math.min(rawRms * 4, 1),
    spectralCentroid: centroid,
  };
}

export function mapAudioToViseme(
  audio: AudioAnalysis,
  options: VisemeMapOptions,
): { viseme: StreamAvatarViseme; volume: number; isSpeaking: boolean } {
  const { sensitivity, noiseGate } = options;

  const rawVolume = audio.rms * sensitivity;
  const gatedVolume = rawVolume > noiseGate ? rawVolume : 0;

  if (gatedVolume === 0) {
    return { viseme: 'closed', volume: 0, isSpeaking: false };
  }

  const f = estimateFormants(audio, rawVolume);

  // Silence / labial plosive detection (M, B, P) — very low frequencies with sudden drop
  if (gatedVolume < 0.06 && f.lowEnergy < 0.08 && f.midEnergy < 0.06) {
    return { viseme: 'closed', volume: gatedVolume, isSpeaking: true };
  }

  // Sibilant / fricative detection (S, SH, F, TH) — strong high frequency energy
  if (f.veryHighEnergy > 0.12 && f.highEnergy > f.midEnergy && f.highEnergy > f.lowEnergy) {
    return { viseme: 'narrow', volume: gatedVolume, isSpeaking: true };
  }

  // Vowel classification based on spectral centroid and band dominance
  const centroid = f.spectralCentroid;

  // High centroid + mid dominance → E / I (smile / narrow mouth)
  if (centroid > 2200) {
    return {
      viseme: gatedVolume > 0.22 ? 'wide' : 'slight',
      volume: gatedVolume,
      isSpeaking: true,
    };
  }

  // Mid-high centroid with balanced mid/high → A (open mouth)
  if (centroid > 1200 && centroid <= 2200 && f.midEnergy > f.lowEnergy) {
    return { viseme: gatedVolume > 0.25 ? 'open' : 'slight', volume: gatedVolume, isSpeaking: true };
  }

  // Low centroid + low dominance → O / U (rounded lips)
  if (centroid <= 1200 && f.lowEnergy > f.midEnergy) {
    return { viseme: gatedVolume > 0.2 ? 'round' : 'small', volume: gatedVolume, isSpeaking: true };
  }

  // Mid-low centroid with low energy → U-like (small rounded)
  if (centroid <= 1500 && f.lowEnergy > f.highEnergy) {
    return { viseme: 'small', volume: gatedVolume, isSpeaking: true };
  }

  // Fallback: open for louder sounds, slight for quieter
  return {
    viseme: gatedVolume > 0.2 ? 'open' : 'slight',
    volume: gatedVolume,
    isSpeaking: true,
  };
}
