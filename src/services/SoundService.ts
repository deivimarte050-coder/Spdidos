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

/** Build a WAV data-URI: two 440+480 Hz beeps separated by silence. */
function buildRingWav(): string {
  const SR   = 8000;   // sample rate (Hz)
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
    // Beep 1: 0.00–0.38 s   Beep 2: 0.50–0.88 s   rest: silence
    const on = (t < 0.38) || (t >= 0.50 && t < 0.88);
    const amp = on
      ? 0.28 * Math.sin(2 * Math.PI * 440 * t) +
        0.28 * Math.sin(2 * Math.PI * 480 * t)
      : 0;
    dv.setInt16(44 + i * 2, Math.round(amp * 32767), true);
  }

  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

class SoundService {
  private audio: HTMLAudioElement;
  private active = false;
  private warmedUp = false;

  constructor() {
    this.audio       = new Audio(buildRingWav());
    this.audio.loop  = true;
    this.audio.volume = 1;

    // Warm up: play-then-pause on first user interaction so later calls
    // from Firestore callbacks are guaranteed to succeed.
    // Also starts a silent AudioContext loop to keep the background tab alive
    // so Chrome doesn't suspend JS execution (and Firestore subscriptions keep firing).
    const warmUp = () => {
      if (this.warmedUp) return;
      this.warmedUp = true;
      this.audio.play().then(() => {
        if (!this.active) {
          this.audio.pause();
          this.audio.currentTime = 0;
        }
      }).catch(() => {});
      this.startSilentLoop();
    };
    document.addEventListener('click',    warmUp, { passive: true });
    document.addEventListener('touchend', warmUp, { passive: true });
    document.addEventListener('keydown',  warmUp, { passive: true });
  }

  /** Plays a completely inaudible 1-sample loop via Web Audio API.
   *  Chrome treats the tab as "using audio" and will not suspend it,
   *  allowing Firestore subscriptions to keep delivering updates in background. */
  private startSilentLoop() {
    try {
      const ctx = new AudioContext();
      const buf = ctx.createBuffer(1, 1, 22050); // 1 sample ≈ silent
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop   = true;
      // Connect through a GainNode at 0 gain so literally nothing is audible
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(0);
    } catch { /* AudioContext unavailable — ignore */ }
  }

  startRinging() {
    if (this.active) return;
    this.active = true;
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {
      // Last resort: try again on next tick (handles edge-case timing)
      setTimeout(() => { if (this.active) this.audio.play().catch(() => {}); }, 100);
    });
  }

  stopRinging() {
    this.active = false;
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  get isRinging() { return this.active; }
}

export const soundService = new SoundService();
