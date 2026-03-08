/**
 * SoundService — Web Audio API phone ringtone that loops until stopped.
 * No audio files needed; generates tones programmatically.
 */
class SoundService {
  private ctx: AudioContext | null = null;
  private loopId: ReturnType<typeof setInterval> | null = null;
  private active = false;

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  /** Play one "ring" cycle: two pairs of dual tones (classic phone) */
  private ring() {
    const ctx = this.getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // Each "beep" = 440Hz + 480Hz mixed together
    const schedule = (offset: number, dur: number) => {
      [440, 480].forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.18, now + offset + 0.02);
        gain.gain.setValueAtTime(0.18, now + offset + dur - 0.02);
        gain.gain.linearRampToValueAtTime(0, now + offset + dur);
        osc.start(now + offset);
        osc.stop(now + offset + dur);
      });
    };

    // Ring pattern: beep-beep ... pause ... repeat
    schedule(0.00, 0.40);   // first beep
    schedule(0.55, 0.40);   // second beep
  }

  /** Start continuous ringing. Stops only when stopRinging() is called. */
  startRinging() {
    if (this.active) return;
    this.active = true;
    this.ring();
    this.loopId = setInterval(() => {
      if (!this.active) return;
      this.ring();
    }, 2200); // ring every 2.2s
  }

  /** Stop all ringing immediately. */
  stopRinging() {
    this.active = false;
    if (this.loopId !== null) {
      clearInterval(this.loopId);
      this.loopId = null;
    }
  }

  get isRinging() {
    return this.active;
  }
}

export const soundService = new SoundService();
