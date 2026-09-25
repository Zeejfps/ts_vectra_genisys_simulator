export type ChannelId = 1 | 2 | 3 | 4;
export const CHANNELS: readonly ChannelId[] = [1, 2, 3, 4];

export type ParamValue = number | string;
export type Params = Record<string, ParamValue>;

export type WaveformId =
  | 'ifc'
  | 'premod'
  | 'asym'
  | 'sym'
  | 'vms'
  | 'vmsBurst'
  | 'russian'
  | 'microcurrent'
  | 'hvpc'
  | 'dc';

export type TreatmentStatus = 'setup' | 'running' | 'paused' | 'completed';

export interface Treatment {
  id: number;
  waveform: WaveformId;
  params: Params;
  /** Channels allocated to this treatment. Index 0 is the primary channel. */
  channels: ChannelId[];
  /** Intensity per allocated channel, same order as `channels`, in the waveform's unit. */
  intensity: number[];
  status: TreatmentStatus;
  remainingMs: number;
  /** Time the output has actually been delivering (excludes pauses). */
  elapsedMs: number;
  /** Unit clock time (ms) when Start was first pressed / when the treatment ended. */
  startedAt?: number;
  endedAt?: number;
  /** Intensity per channel when the treatment ended, for the Completed review. */
  endIntensity?: number[];
  /** Set when a treatment was loaded from an Indication, shown in the review screen. */
  source?: string;
}

export type VolumeLevel = 'Off' | 'X-Low' | 'Low' | 'Med' | 'High' | 'X-High';
export const VOLUME_LEVELS: readonly VolumeLevel[] = ['Off', 'X-Low', 'Low', 'Med', 'High', 'X-High'];

export type UsCoupling = 'Pause and Beep' | 'Pause and No Beep' | 'Beep' | 'No Beep' | 'Off';
export const US_COUPLING_LEVELS: readonly UsCoupling[] = [
  'Pause and Beep',
  'Pause and No Beep',
  'Beep',
  'No Beep',
  'Off',
];

export interface UnitSettings {
  clinicName: string;
  volume: VolumeLevel;
  usCoupling: UsCoupling;
  padContactQuality: boolean;
  language: string;
}

export const DEFAULT_SETTINGS: UnitSettings = {
  clinicName: 'Chattanooga Group Vectra Genisys',
  volume: 'Med',
  usCoupling: 'Pause and Beep',
  padContactQuality: true,
  language: 'English',
};

export type BeepKind = 'key' | 'start' | 'error' | 'complete' | 'volumePreview';
