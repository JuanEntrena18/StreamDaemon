// ─── Configuration ───────────────────────────────────────────────────
/** Max utterances tracked before we flush the queue and speak only the latest */
const MAX_QUEUE_SIZE = 8;
/** Pause/resume heartbeat interval to prevent Chrome/Chromium TTS freeze */
const KEEPALIVE_MS = 10_000;
/** Auto-remove tracked utterances whose callbacks never fired */
const ORPHAN_TIMEOUT_MS = 30_000;

// ─── Public helpers ──────────────────────────────────────────────────

export function getVoices(): SpeechSynthesisVoice[] {
  return (
    window.speechSynthesis
      ?.getVoices()
      ?.filter((v) => v.lang.startsWith('es') || v.lang.startsWith('en')) ?? []
  );
}

// ─── Utterance tracking (prevents Chrome GC bug + bounded size) ──────

interface TrackedUtterance {
  utterance: SpeechSynthesisUtterance;
  createdAt: number;
}

const tracked: TrackedUtterance[] = [];

function untrack(utterance: SpeechSynthesisUtterance) {
  const idx = tracked.findIndex((t) => t.utterance === utterance);
  if (idx > -1) tracked.splice(idx, 1);
  if (tracked.length === 0) stopKeepalive();
}

/** Remove utterances that exceeded the timeout without finishing. */
function pruneOrphans() {
  const now = Date.now();
  for (let i = tracked.length - 1; i >= 0; i--) {
    if (now - tracked[i].createdAt > ORPHAN_TIMEOUT_MS) {
      tracked.splice(i, 1);
    }
  }
  if (tracked.length === 0) stopKeepalive();
}

// ─── Keepalive heartbeat (Chrome/Chromium TTS freeze workaround) ─────
// Chrome silently freezes speechSynthesis after prolonged use.
// Calling pause() + resume() every ~10 s keeps the engine alive.

let keepaliveId: ReturnType<typeof setInterval> | null = null;

function startKeepalive() {
  if (keepaliveId) return;
  keepaliveId = setInterval(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (synth.speaking) {
      synth.pause();
      synth.resume();
    }
    pruneOrphans();
  }, KEEPALIVE_MS);
}

function stopKeepalive() {
  if (keepaliveId) {
    clearInterval(keepaliveId);
    keepaliveId = null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Enqueue a text-to-speech utterance.
 *
 * If the internal queue exceeds `MAX_QUEUE_SIZE`, the whole queue is
 * flushed and only the newest message is spoken, keeping the TTS
 * output relevant to the live conversation.
 */
export function speak(
  text: string,
  voiceURI: string | null,
  rate: number,
  volume: number,
) {
  const synth = window.speechSynthesis;
  if (!synth) return;

  // Queue limit: flush stale queue so the user hears recent messages
  if (tracked.length >= MAX_QUEUE_SIZE) {
    synth.cancel();
    tracked.length = 0;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  tracked.push({ utterance, createdAt: Date.now() });

  utterance.onend = () => untrack(utterance);
  utterance.onerror = () => untrack(utterance);

  if (voiceURI) {
    const found = getVoices().find((v) => v.voiceURI === voiceURI);
    if (found) utterance.voice = found;
  }
  utterance.rate = rate;
  utterance.volume = volume;

  synth.speak(utterance);
  startKeepalive();
}

/** Cancel all pending/active speech and release tracked references. */
export function cancelAll() {
  window.speechSynthesis?.cancel();
  tracked.length = 0;
  stopKeepalive();
}
