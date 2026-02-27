let audioContext: AudioContext | null = null;
let sfxEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioCtor();
  }

  return audioContext;
}

async function ensureRunningContext(): Promise<AudioContext | null> {
  const context = getAudioContext();
  if (!context) {
    return null;
  }

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return null;
    }
  }

  return context;
}

async function playTone(frequency: number, durationMs: number, gainValue: number): Promise<void> {
  if (!sfxEnabled) {
    return;
  }

  const context = await ensureRunningContext();
  if (!context) {
    return;
  }

  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const durationSec = durationMs / 1000;

    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.type = "triangle";
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + durationSec);
  } catch {
    // No-op: browsers/devices may reject or not support playback in some states.
  }
}

export function setSfxEnabled(enabled: boolean): void {
  sfxEnabled = enabled;
}

export function getSfxEnabled(): boolean {
  return sfxEnabled;
}

export async function playShoot(): Promise<void> {
  await playTone(740, 80, 0.06);
}

export async function playHit(): Promise<void> {
  await playTone(460, 120, 0.09);
}

export async function playGameOver(): Promise<void> {
  await playTone(220, 280, 0.1);
}
