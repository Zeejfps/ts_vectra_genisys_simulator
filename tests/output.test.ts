import { describe, expect, it } from 'vitest';
import { channelOutput, detailView, instantaneousFrequency } from '../src/sim/output';
import type { Treatment } from '../src/sim/types';
import { defaultParams } from '../src/sim/waveforms';

function treatment(waveform: Treatment['waveform'], params: Treatment['params'] = {}, channels: Treatment['channels'] = [1]): Treatment {
  return {
    id: 1,
    waveform,
    params: { ...defaultParams(waveform), ...params },
    channels,
    intensity: channels.map(() => 10),
    status: 'running',
    remainingMs: 600_000,
    elapsedMs: 0,
  };
}

describe('channel output', () => {
  it('is silent unless running', () => {
    const t = { ...treatment('ifc'), status: 'paused' as const };
    expect(channelOutput(t, 0, 5).level).toBe(0);
  });

  it('ramps up, holds, ramps down and rests over a cycle', () => {
    const t = treatment('vms', { cycle: '10/10', ramp: '2 sec' });
    expect(channelOutput(t, 0, 1).phase).toBe('ramp');
    expect(channelOutput(t, 0, 1).level).toBeCloseTo(0.5);
    expect(channelOutput(t, 0, 5).level).toBe(1);
    expect(channelOutput(t, 0, 9).level).toBeCloseTo(0.5);
    expect(channelOutput(t, 0, 15).phase).toBe('rest');
  });

  it('reciprocal channel B works while channel A rests', () => {
    const t = treatment('vms', { channelMode: 'Reciprocal', cycle: '10/10', ramp: '0.5 sec' }, [1, 2]);
    expect(channelOutput(t, 0, 5).level).toBe(1);
    expect(channelOutput(t, 1, 5).level).toBe(0);
    expect(channelOutput(t, 0, 15).level).toBe(0);
    expect(channelOutput(t, 1, 15).level).toBe(1);
  });

  it('IFC sweep moves between beat low and beat high over 15 s', () => {
    const t = treatment('ifc', { beatLow: 80, beatHigh: 150 });
    expect(instantaneousFrequency(t, 0)).toBe(80);
    expect(instantaneousFrequency(t, 7.5)).toBe(150);
    expect(instantaneousFrequency(t, 15)).toBeCloseTo(80);
  });

  it('DC polarity reverses half way through when enabled', () => {
    const t = treatment('dc', { polarityReversal: 'On', time: 10 });
    expect(channelOutput(t, 0, 10).polarity).toBe('Positive');
    expect(channelOutput(t, 0, 301).polarity).toBe('Negative');
  });
});

describe('pulse shape', () => {
  it('symmetrical biphasic has equal positive and negative phases', () => {
    const t = treatment('sym', { phase: 300 });
    const v = detailView(t, 0);
    expect(v.sample(450e-6)).toBe(1);
    expect(v.sample(750e-6)).toBe(-1);
    expect(v.sample(1000e-6)).toBe(0);
  });

  it('negative HVPC polarity inverts the twin peaks', () => {
    const t = treatment('hvpc', { polarity: 'Negative' });
    const v = detailView(t, 0);
    expect(v.sample(45e-6)).toBeLessThan(0);
  });
});
