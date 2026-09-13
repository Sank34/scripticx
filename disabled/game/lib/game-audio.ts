import type { GameSettings } from './playground-settings';

export class GameAudio {
  private context: AudioContext | null = null;
  private last = 0;
  private voices = new Set<OscillatorNode>();
  play(kind: 'key' | 'click' | 'success', settings: GameSettings) {
    if (!settings.sound || settings.volume === 0 || typeof AudioContext === 'undefined') return;
    const now = performance.now();
    if (now - this.last < 35 || this.voices.size >= 8) return;
    this.last = now;
    try {
      const ctx = this.context ??= new AudioContext();
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      const start = ctx.currentTime, duration = kind === 'success' ? .3 : kind === 'key' ? .035 : .075;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(kind === 'key' ? 420 + Math.random() * 140 : kind === 'success' ? 520 : 360, start);
      oscillator.frequency.exponentialRampToValueAtTime(kind === 'success' ? 820 : 160, start + duration);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(settings.volume * (kind === 'key' ? .07 : .14), start + .004);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(gain); gain.connect(ctx.destination);
      this.voices.add(oscillator);
      oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(); oscillator.stop(start + duration + .01);
    } catch { /* Audio is optional, including when autoplay is blocked. */ }
  }
  silence() { this.voices.forEach(voice => { try { voice.stop(); } catch {} }); }
  dispose() { this.silence(); if (this.context) void this.context.close().catch(() => {}); this.context = null; }
}
