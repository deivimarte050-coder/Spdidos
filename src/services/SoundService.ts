/**
 * SoundService — Web Audio API phone ringtone that loops until stopped.
 *
 * Browser autoplay policy requires the AudioContext to be "unlocked" via a
 * prior user gesture (click / touch / key).  We register global listeners so
 * the context is resumed as soon as the user first interacts with the page,
 * which happens long before any Firestore notification fires in practice.
 */
class SoundService {
  private ctx: AudioContext | null = null;
  private loopId: ReturnType<typeof setInterval> | null = null;
  private active = false;

  constructor() {
    // Unlock the AudioContext on ANY user interaction so it is ready before
    // a notification fires from a Firestore callback.
    const unlock = () => {
      // getCtx() creates the AudioContext if it doesn't exist yet.
      // Calling this inside a user-gesture handler lets the browser put it
      // directly into "running" state (or allows resume() to succeed).
      const ctx = this.getCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    };
    document.addEventListener('click',    unlock, { passive: true });
    document.addEventListener('touchend', unlock, { passive: true });
    document.addEventListener('keydown',  unlock, { passive: true });
  }

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  /** Play one "ring" cycle: two dual-tone beeps (classic phone). */
  private async ring(): Promise<void> {
    const ctx = this.getCtx();
    // Must await resume — otherwise oscillators schedule against a suspended clock
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { return; }
    }
    if (ctx.state !== 'running') return;

    const now = ctx.currentTime;

    const schedule = (offset: number, dur: number) => {
      [440, 480].forEach(freq => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.20, now + offset + 0.02);
        gain.gain.setValueAtTime(0.20, now + offset + dur - 0.02);
        gain.gain.linearRampToValueAtTime(0, now + offset + dur);
        osc.start(now + offset);
        osc.stop(now + offset + dur);
      });
    };

    schedule(0.00, 0.40);  // first beep
    schedule(0.55, 0.40);  // second beep
  }

  /** Start continuous ringing. Stops only when stopRinging() is called. */
  startRinging() {
    if (this.active) return;
    this.active = true;
    this.ring();
    this.loopId = setInterval(() => {
      if (!this.active) return;
      this.ring();
    }, 2200);
  }

  /** Stop all ringing immediately. */
  stopRinging() {
    this.active = false;
    if (this.loopId !== null) {
      clearInterval(this.loopId);
      this.loopId = null;
    }
  }

  get isRinging() { return this.active; }
}

export const soundService = new SoundService();
