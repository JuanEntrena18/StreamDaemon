export function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices()?.filter((v) => v.lang.startsWith('es') || v.lang.startsWith('en')) ?? [];
}

// Reference array to prevent garbage collection of utterances
// This is a known Chrome bug where utterances are GC'd before finishing, breaking the TTS queue.
const activeUtterances: SpeechSynthesisUtterance[] = [];

export function speak(text: string, voiceURI: string | null, rate: number, volume: number) {
  if (!window.speechSynthesis) return;
  
  const utterance = new SpeechSynthesisUtterance(text);
  activeUtterances.push(utterance);
  
  utterance.onend = () => {
    const i = activeUtterances.indexOf(utterance);
    if (i > -1) activeUtterances.splice(i, 1);
  };
  utterance.onerror = () => {
    const i = activeUtterances.indexOf(utterance);
    if (i > -1) activeUtterances.splice(i, 1);
  };

  if (voiceURI) {
    const found = getVoices().find((v) => v.voiceURI === voiceURI);
    if (found) utterance.voice = found;
  }
  utterance.rate = rate;
  utterance.volume = volume;
  window.speechSynthesis.speak(utterance);
}
