import type { BeepKind, VolumeLevel } from '../sim/types';

const GAIN: Record<VolumeLevel, number> = {
  Off: 0,
  'X-Low': 0.015,
  Low: 0.035,
  Med: 0.07,
  High: 0.13,
  'X-High': 0.22,
};

type Tone = [freq: number, startS: number, durS: number];

const PATTERNS: Record<BeepKind, Tone[]> = {
  key: [[2400, 0, 0.035]],
  start: [[1800, 0, 0.12]],
  error: [
    [620, 0, 0.08],
    [620, 0.12, 0.08],
  ],
  complete: [
    [2000, 0, 0.18],
    [2000, 0.3, 0.18],
    [2000, 0.6, 0.18],
  ],
  volumePreview: [
    [2400, 0, 0.06],
    [2400, 0.12, 0.06],
    [2400, 0.24, 0.06],
  ],
};

export class Beeper {
  private ctx: AudioContext | null = null;

  constructor(private readonly volume: () => VolumeLevel) {}

  play(kind: BeepKind): void {
    const gain = GAIN[this.volume()];
    if (gain === 0) return;
    const ctx = this.context();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.005;
    for (const [freq, start, dur] of PATTERNS[kind]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t0 + start);
      g.gain.linearRampToValueAtTime(gain, t0 + start + 0.004);
      g.gain.setValueAtTime(gain, t0 + start + dur - 0.004);
      g.gain.linearRampToValueAtTime(0, t0 + start + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.01);
    }
  }

  private context(): AudioContext | null {
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }
}
