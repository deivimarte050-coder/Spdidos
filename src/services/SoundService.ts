/**
 * SoundService — Continuous phone-ring notification sound.
 *
 * Uses a programmatically-generated PCM WAV (no external files) played via
 * HTMLAudioElement.  Browsers allow audio.play() from any context once the
 * user has interacted with the page (login click, navigation, etc.).
 *
 * On first user interaction we play-then-immediately-pause to "warm up" the
 * element so later autoplay calls succeed even from Firestore callbacks.
 */

/** Build a louder WAV data-URI tuned for mobile speakers. */
function buildRingWav(): string {
  const SR   = 16000;  // better clarity on mobile speakers
  const dur  = 2.2;    // total seconds (matches loop interval)
  const nSmp = Math.floor(SR * dur);
  const buf  = new ArrayBuffer(44 + nSmp * 2);
  const dv   = new DataView(buf);

  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  str(0,  'RIFF'); dv.setUint32(4,  36 + nSmp * 2, true);
  str(8,  'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, SR, true); dv.setUint32(28, SR * 2, true);
  dv.setUint16(32, 2, true);  dv.setUint16(34, 16, true);
  str(36, 'data'); dv.setUint32(40, nSmp * 2, true);

  for (let i = 0; i < nSmp; i++) {
    const t = i / SR;
    // Beep 1: 0.00–0.42 s   Beep 2: 0.56–1.04 s   rest: silence
    const on = (t < 0.42) || (t >= 0.56 && t < 1.04);
    const mixed = on
      ? 0.42 * Math.sin(2 * Math.PI * 860 * t) +
        0.35 * Math.sin(2 * Math.PI * 1180 * t) +
        0.18 * Math.sin(2 * Math.PI * 1720 * t)
      : 0;
    const shaped = Math.tanh(mixed * 1.8);
    dv.setInt16(44 + i * 2, Math.round(shaped * 32767), true);
  }

  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

/** Build a sharper alert WAV for client-cancelled orders. */
function buildCancelledRingWav(): string {
  const SR   = 16000;
  const dur  = 1.4;
  const nSmp = Math.floor(SR * dur);
  const buf  = new ArrayBuffer(44 + nSmp * 2);
  const dv   = new DataView(buf);

  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  str(0,  'RIFF'); dv.setUint32(4,  36 + nSmp * 2, true);
  str(8,  'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, SR, true); dv.setUint32(28, SR * 2, true);
  dv.setUint16(32, 2, true);  dv.setUint16(34, 16, true);
  str(36, 'data'); dv.setUint32(40, nSmp * 2, true);

  for (let i = 0; i < nSmp; i++) {
    const t = i / SR;
    const on =
      (t < 0.20) ||
      (t >= 0.26 && t < 0.46) ||
      (t >= 0.52 && t < 0.74);
    const mixed = on
      ? 0.50 * Math.sin(2 * Math.PI * 980 * t) +
        0.30 * Math.sin(2 * Math.PI * 1420 * t) +
        0.16 * Math.sin(2 * Math.PI * 1960 * t)
      : 0;
    const shaped = Math.tanh(mixed * 2);
    dv.setInt16(44 + i * 2, Math.round(shaped * 32767), true);
  }

  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

class SoundService {
  private warmedUp = false;

  constructor() {
    // Audio functionality disabled - no sounds will play
  }

  startRinging() {
    // Audio disabled - no sound
  }

  startCancelledRinging() {
    // Audio disabled - no sound
  }

  stopRinging() {
    // Audio disabled - no sound to stop
  }

  get isRinging() { return false; }
}

export const soundService = new SoundService();
