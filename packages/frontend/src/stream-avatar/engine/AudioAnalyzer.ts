import type { AudioAnalysis } from '../types.js';

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private fftSize = 256;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;

  async start(deviceId: string): Promise<void> {
    await this.stop();

    const constraints: MediaStreamConstraints = {
      audio: deviceId === 'default'
        ? true
        : { deviceId: { exact: deviceId } },
      video: false,
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.audioContext = new AudioContext({ latencyHint: 'interactive' });
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.5;

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;
  }

  stop(): void {
    if (this.source) {
      try { this.source.disconnect(); } catch {}
      this.source = null;
    }
    if (this.audioContext) {
      try { void this.audioContext.close(); } catch {}
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }

  analyze(): AudioAnalysis | null {
    if (!this.analyser || !this.dataArray) return null;

    const data = this.dataArray;
    this.analyser.getByteFrequencyData(data);

    const binCount = data.length;
    const sampleRate = this.audioContext?.sampleRate ?? 44100;
    const freqPerBin = sampleRate / 2 / binCount;

    const lowCutoff = 250;
    const midCutoff = 2000;
    const highCutoff = 5000;
    const veryHighCutoff = 8000;

    const lowBins = Math.max(1, Math.floor(lowCutoff / freqPerBin));
    const midBins = Math.max(1, Math.floor((midCutoff - lowCutoff) / freqPerBin));
    const highBins = Math.max(1, Math.floor((highCutoff - midCutoff) / freqPerBin));
    const veryHighBins = Math.max(1, Math.floor((veryHighCutoff - highCutoff) / freqPerBin));

    let sum = 0;
    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;
    let veryHighSum = 0;

    for (let i = 0; i < binCount; i++) {
      const v = data[i];
      sum += v * v;
      if (i < lowBins) lowSum += v;
      else if (i < lowBins + midBins) midSum += v;
      else if (i < lowBins + midBins + highBins) highSum += v;
      else if (i < lowBins + midBins + highBins + veryHighBins) veryHighSum += v;
    }

    const rms = Math.sqrt(sum / binCount) / 255;

    return {
      rms,
      lowFreq: lowSum / lowBins / 255,
      midFreq: midSum / midBins / 255,
      highFreq: highSum / highBins / 255,
      veryHighFreq: veryHighSum / veryHighBins / 255,
    };
  }

  get isActive(): boolean {
    return this.audioContext?.state === 'running' && this.stream !== null;
  }
}
