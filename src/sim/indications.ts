import type { Params, WaveformId } from './types';

// Electrotherapy Indications from the Home > Indications screen. The manual lists the
// indications but not the exact parameters each one loads, so these presets are
// representative textbook settings for the simulator, not clinical guidance.

export interface Indication {
  label: string;
  /** Two-line button label. */
  button: string;
  waveform: WaveformId;
  params: Params;
}

export const INDICATIONS: readonly Indication[] = [
  { label: 'Acute Pain', button: 'Acute\nPain', waveform: 'ifc', params: { sweep: 'On', beatLow: 80, beatHigh: 150, mode: 'CC', time: 20 } },
  { label: 'Increase Local Circulation', button: 'Increase Local\nCirculation', waveform: 'ifc', params: { sweep: 'On', beatLow: 1, beatHigh: 10, mode: 'CC', time: 20 } },
  { label: 'Chronic Pain', button: 'Chronic\nPain', waveform: 'ifc', params: { sweep: 'On', beatLow: 1, beatHigh: 10, mode: 'CC', time: 20 } },
  { label: 'Muscle Re-education', button: 'Muscle\nRe-education', waveform: 'vms', params: { freq: 35, cycle: '10/10', ramp: '2 sec', time: 15 } },
  { label: 'Relax Muscle Spasm', button: 'Relax Muscle\nSpasm', waveform: 'premod', params: { sweep: 'On', beatLow: 80, beatHigh: 150, mode: 'CC', time: 15 } },
  { label: 'Stroke Muscle Re-ed', button: 'Stroke\nMuscle Re-ed', waveform: 'vms', params: { channelMode: 'Reciprocal', freq: 35, cycle: '10/10', ramp: '2 sec', time: 15 } },
  { label: 'Prevent/Retard Disuse Atrophy', button: 'Prevent/Retard\nDisuse Atrophy', waveform: 'russian', params: { burst: 50, dutyCycle: '50 %', cycle: '10/50', ramp: '2 sec', time: 10 } },
  { label: 'Range of Motion', button: 'Range of\nMotion', waveform: 'vms', params: { channelMode: 'Reciprocal', freq: 35, cycle: '10/10', ramp: '2 sec', time: 15 } },
];
