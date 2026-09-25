import type { Treatment } from './types';
import { getWaveform, parseCycle, parseSeconds } from './waveforms';

// Behavioural model of what each channel is outputting. It drives the scope panel
// and the live intensity readout; it is an illustration of the waveform family,
// not an electrical model.

const TAU = Math.PI * 2;
/** IFC / Premod sweep time is fixed at 15 seconds. */
const SWEEP_PERIOD_S = 15;
/** Period used to illustrate amplitude modulation, frequency modulation and anti-fatigue. */
const MOD_PERIOD_S = 6;

export type CyclePhase = 'off' | 'ramp' | 'on' | 'rest';

export interface ChannelOutput {
  /** 0..1 fraction of the set intensity being delivered right now. */
  level: number;
  phase: CyclePhase;
  /** Human readable instantaneous frequency, e.g. "Beat 112 Hz". */
  frequency: string;
  polarity: string | null;
}

/** Triangle wave 0 -> 1 -> 0 over `period` seconds. */
function tri(t: number, period: number): number {
  const x = (((t / period) % 1) + 1) % 1;
  return x < 0.5 ? x * 2 : 2 - x * 2;
}

export function instantaneousFrequency(t: Treatment, tSec: number): number {
  const p = t.params;
  switch (t.waveform) {
    case 'ifc':
    case 'premod':
      if (p.sweep !== 'On') return Number(p.beatFreq);
      return Number(p.beatLow) + (Number(p.beatHigh) - Number(p.beatLow)) * tri(tSec, SWEEP_PERIOD_S);
    case 'asym':
    case 'sym': {
      const f = Number(p.freq);
      const mod = Number(p.freqMod);
      return Math.max(1, f - mod * tri(tSec, MOD_PERIOD_S));
    }
    case 'hvpc': {
      const sweep = String(p.sweep);
      if (sweep === 'Continuous') return antiFatigue(t, Number(p.freq), tSec);
      const [lo, hi] = sweep.replace(' pps', '').split('/').map(Number);
      return lo + (hi - lo) * tri(tSec, SWEEP_PERIOD_S);
    }
    case 'vms':
    case 'vmsBurst':
      return antiFatigue(t, Number(p.freq), tSec);
    case 'russian':
      return antiFatigue(t, Number(p.burst), tSec);
    case 'microcurrent':
      return Number(p.carrier);
    case 'dc':
      return 0;
  }
}

function antiFatigue(t: Treatment, f: number, tSec: number): number {
  if (t.params.antiFatigue !== 'On') return f;
  return f * (0.9 + 0.2 * tri(tSec, MOD_PERIOD_S));
}

function frequencyText(t: Treatment, tSec: number): string {
  const f = instantaneousFrequency(t, tSec);
  switch (t.waveform) {
    case 'ifc':
    case 'premod':
      return `Beat ${Math.round(f)} Hz`;
    case 'russian':
      return `Burst ${Math.round(f)} bps`;
    case 'microcurrent':
      return `${f} Hz`;
    case 'dc':
      return 'DC';
    case 'hvpc':
    case 'vms':
    case 'vmsBurst':
      return `${Math.round(f)} pps`;
    default:
      return `${Math.round(f)} Hz`;
  }
}

export function polarityAt(t: Treatment, tSec: number): string | null {
  const pol = t.params.polarity;
  if (pol === undefined) return null;
  if (t.waveform === 'dc' && t.params.polarityReversal === 'On') {
    const half = (Number(t.params.time) * 60) / 2;
    if (tSec >= half) return pol === 'Positive' ? 'Negative' : 'Positive';
  }
  return String(pol);
}

/** Output of one allocated channel (index into treatment.channels) at a delivery time. */
export function channelOutput(t: Treatment, index: number, tSec: number): ChannelOutput {
  const frequency = frequencyText(t, tSec);
  const polarity = polarityAt(t, tSec);
  if (t.status !== 'running') return { level: 0, phase: 'off', frequency, polarity };

  const p = t.params;
  const cycle = parseCycle(p.cycle);
  const ramp = p.ramp !== undefined ? parseSeconds(p.ramp, 0) : t.waveform === 'microcurrent' ? 1 : 0;

  let level = 1;
  let phase: CyclePhase = 'on';

  if (cycle) {
    const period = cycle.on + cycle.off;
    // In Reciprocal mode the second channel works while the first rests.
    const shift = index === 1 && p.channelMode === 'Reciprocal' ? cycle.on : 0;
    const pos = (((tSec - shift) % period) + period) % period;
    if (pos >= cycle.on) {
      level = 0;
      phase = 'rest';
    } else {
      const r = Math.min(ramp, cycle.on / 2);
      if (r > 0 && pos < r) {
        level = pos / r;
        phase = 'ramp';
      } else if (r > 0 && pos > cycle.on - r) {
        level = (cycle.on - pos) / r;
        phase = 'ramp';
      }
    }
  } else if (ramp > 0 && tSec < ramp) {
    level = tSec / ramp;
    phase = 'ramp';
  }

  if (p.ampMod !== undefined && p.ampMod !== 'Off') {
    const depth = parseFloat(String(p.ampMod)) / 100;
    level *= 1 - depth * tri(tSec, MOD_PERIOD_S);
  }

  return { level, phase, frequency, polarity };
}

// ---------- pulse shape (scope detail view) ----------

export interface DetailView {
  windowS: number;
  /** Normalised sample at time `tau` seconds from the left edge of the window (-1..1). */
  sample: (tau: number) => number;
  caption: string;
}

function us(v: number): number {
  return v * 1e-6;
}

export function detailView(t: Treatment, tSec: number): DetailView {
  const p = t.params;
  const f = instantaneousFrequency(t, tSec);
  const polaritySign = polarityAt(t, tSec) === 'Negative' ? -1 : 1;

  switch (t.waveform) {
    case 'ifc': {
      const fc = parseFloat(String(p.carrier));
      const windowS = Math.min(2 / f, 0.05);
      return {
        windowS,
        caption: `Interference in tissue: ${fc} Hz carrier, ${Math.round(f)} Hz beat`,
        sample: (tau) => (Math.sin(TAU * fc * tau) + Math.sin(TAU * (fc + f) * tau)) / 2,
      };
    }
    case 'premod': {
      const windowS = Math.min(2 / f, 0.05);
      return {
        windowS,
        caption: `2500 Hz carrier modulated at ${Math.round(f)} Hz`,
        sample: (tau) => Math.sin(TAU * 2500 * tau) * (0.5 - 0.5 * Math.cos(TAU * f * tau)),
      };
    }
    case 'asym': {
      const pd = us(Number(p.phase));
      const windowS = Math.min(1 / f, pd * 8);
      return {
        windowS,
        caption: `Asymmetrical biphasic, ${p.phase} µs phase`,
        sample: (tau) => {
          const x = tau - pd;
          if (x < 0) return 0;
          if (x < pd) return 1;
          return -0.3 * Math.exp(-(x - pd) / (pd * 1.5));
        },
      };
    }
    case 'sym': {
      const pd = us(Number(p.phase));
      return {
        windowS: Math.min(1 / f, pd * 5),
        caption: `Symmetrical biphasic, ${p.phase} µs phase`,
        sample: (tau) => {
          const x = tau - pd;
          if (x < 0 || x >= 2 * pd) return 0;
          return x < pd ? 1 : -1;
        },
      };
    }
    case 'vms': {
      const pd = us(Number(p.phase));
      const gap = us(100);
      return {
        windowS: Math.min(1 / f, pd * 3 + gap * 2),
        caption: `Symmetrical biphasic, ${p.phase} µs phase, 100 µs interphase`,
        sample: (tau) => {
          const x = tau - pd / 2;
          if (x < 0) return 0;
          if (x < pd) return 1;
          if (x < pd + gap) return 0;
          if (x < 2 * pd + gap) return -1;
          return 0;
        },
      };
    }
    case 'vmsBurst': {
      const pd = us(Number(p.phase));
      const gap = us(100);
      const pulse = 2 * pd + gap;
      const spacing = pulse * 2;
      const perBurst = 5;
      return {
        windowS: Math.min(1 / f, spacing * (perBurst + 1)),
        caption: `VMS pulses delivered in bursts (${perBurst} shown)`,
        sample: (tau) => {
          const x = tau - pd / 2;
          if (x < 0) return 0;
          const k = Math.floor(x / spacing);
          if (k >= perBurst) return 0;
          const y = x - k * spacing;
          if (y < pd) return 1;
          if (y < pd + gap) return 0;
          if (y < pulse) return -1;
          return 0;
        },
      };
    }
    case 'russian': {
      const duty = parseFloat(String(p.dutyCycle)) / 100;
      const period = 1 / f;
      return {
        windowS: period * 2,
        caption: `2500 Hz sine in ${Math.round(f)} bps bursts, ${p.dutyCycle} duty`,
        sample: (tau) => ((tau % period) < period * duty ? Math.sin(TAU * 2500 * tau) : 0),
      };
    }
    case 'hvpc': {
      const width = us(8);
      const sep = us(70);
      return {
        windowS: us(250),
        caption: `Twin-peak monophasic, ${polarityAt(t, tSec) ?? ''} polarity`,
        sample: (tau) => {
          const x = tau - us(40);
          const peak = (d: number) => (d >= 0 ? Math.exp(-d / width) * Math.min(1, d / us(1.5)) : 0);
          return polaritySign * Math.min(1, peak(x) + peak(x - sep));
        },
      };
    }
    case 'microcurrent': {
      const period = 1 / Math.max(0.1, f);
      const alternating = p.polarity === 'Alternating';
      return {
        windowS: period * 2,
        caption: `Monophasic, 50% duty, ${p.polarity}`,
        sample: (tau) => {
          const k = Math.floor(tau / period);
          const on = (tau % period) < period / 2;
          if (!on) return 0;
          if (alternating) return k % 2 === 0 ? 1 : -1;
          return polaritySign;
        },
      };
    }
    case 'dc':
      return {
        windowS: 1,
        caption: `Direct current, ${polarityAt(t, tSec)} polarity`,
        sample: () => polaritySign,
      };
  }
}

export function outputUnit(t: Treatment): string {
  return getWaveform(t.waveform).intensityUnit(t.params);
}
