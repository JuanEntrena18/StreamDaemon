export function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices()?.filter((v) => v.lang.startsWith('es') || v.lang.startsWith('en')) ?? [];
}

export function speak(text: string, voiceURI: string | null, rate: number, volume: number) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  if (voiceURI) {
    const found = getVoices().find((v) => v.voiceURI === voiceURI);
    if (found) utterance.voice = found;
  }
  utterance.rate = rate;
  utterance.volume = volume;
  window.speechSynthesis.speak(utterance);
}
