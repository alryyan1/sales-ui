// src/lib/sound.ts
// Lightweight UI feedback sounds generated via the Web Audio API — no audio assets to ship.

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

/** Short, high "pop" — confirms an item was added to the cart. */
export function playAddItemSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = "sine";
    const now = ctx.currentTime;
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.06);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  } catch {
    // Audio is a nice-to-have — never let it break the add-to-cart flow.
  }
}

/** Short, low descending "thud" — confirms an item was removed from the cart. */
export function playRemoveItemSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = "sawtooth";
    const now = ctx.currentTime;
    oscillator.frequency.setValueAtTime(420, now);
    oscillator.frequency.exponentialRampToValueAtTime(120, now + 0.14);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    oscillator.start(now);
    oscillator.stop(now + 0.17);
  } catch {
    // Audio is a nice-to-have — never let it break the remove-from-cart flow.
  }
}

/** Low double "buzz" — signals a blocked action (e.g. not enough stock left). */
export function playErrorSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.11].forEach((offset) => {
      const start = now + offset;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(180, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.13, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);

      oscillator.start(start);
      oscillator.stop(start + 0.1);
    });
  } catch {
    // Audio is a nice-to-have — never let it break the cart flow.
  }
}

/** Cheerful ascending three-note chime — confirms a sale was completed successfully. */
export function playSaleCompleteSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const start = now + i * 0.09;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

      oscillator.start(start);
      oscillator.stop(start + 0.23);
    });
  } catch {
    // Audio is a nice-to-have — never let it break the checkout flow.
  }
}
