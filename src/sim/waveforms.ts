import type { Params, ParamValue, WaveformId } from './types';

// Waveform catalogue. Ranges and option lists come from the "Waveform Specifications"
// section of the Vectra Genisys user manual. Default values are reasonable starting
// points chosen for the simulator; the manual does not list factory defaults for all of them.

interface ParamBase {
  key: string;
  /** Label on the parameter button and in the Treatment Review list. */
  label: string;
  visible?: (p: Params) => boolean;
}

export interface NumberParam extends ParamBase {
  kind: 'number';
  unit: string;
  min: number | ((p: Params) => number);
  max: number | ((p: Params) => number);
  step: number;
  default: number;
}

export interface ChoiceParam extends ParamBase {
  kind: 'choice';
  options: readonly string[];
  default: string;
}

export type ParamDef = NumberParam | ChoiceParam;

export type IntensityUnit = 'mA' | 'V' | 'µA';

/** Placeholder used in edit-screen layouts for the live intensity readout. */
export const INTENSITY_SLOT = '#intensity';
export type LayoutEntry = string | readonly string[] | null;

export type PlacementFigure = 'lowBack4' | 'lowBack2' | 'quad2' | 'shoulder2';

export interface WaveformDef {
  id: WaveformId;
  /** Title shown on screens (title bar of edit/placement screens). */
  name: string;
  /** Name shown in the Treatment Review list ("Waveform: ..."). */
  reviewName: string;
  params: readonly ParamDef[];
  /** Ten soft-key slots, row-major: index 0 = left row 1, 1 = right row 1, ... 9 = right row 5. */
  editLayout: readonly LayoutEntry[];
  channelsNeeded: (p: Params) => 1 | 2;
  /** True if both channels always share one intensity (e.g. 4-pole interferential). */
  linkedIntensity: boolean;
  intensityUnit: (p: Params) => IntensityUnit;
  intensityMax: (p: Params) => number;
  intensityStep: number;
  /** Label under the intensity readout, e.g. "mA CC" or "Volts CV". */
  intensityLabel: (p: Params) => string;
  padContact: 'single' | 'dual' | null;
  description: readonly string[];
  terms: readonly string[];
  placement: { figure: PlacementFigure; text: readonly string[] };
}

// ---------- shared parameter builders ----------

const onOff = (key: string, label: string, def: 'On' | 'Off' = 'Off'): ChoiceParam => ({
  kind: 'choice',
  key,
  label,
  options: ['Off', 'On'],
  default: def,
});

const modeParam = (def: 'CC' | 'CV'): ChoiceParam => ({
  kind: 'choice',
  key: 'mode',
  label: 'CC/CV',
  options: ['CC', 'CV'],
  default: def,
});

const timeParam = (def: number, max = 60): NumberParam => ({
  kind: 'number',
  key: 'time',
  label: 'Treatment Time',
  unit: 'min.',
  min: 1,
  max,
  step: 1,
  default: def,
});

const CYCLE_TENS = ['Continuous', '4/4', '4/8', '7/7', '5/5', '4/12', '10/10', '10/20', '10/30', '10/50'] as const;
const CYCLE_MUSCLE = ['Continuous', '5/5', '4/12', '10/10', '10/20', '10/30', '10/50'] as const;

const cycleParam = (options: readonly string[], def: string): ChoiceParam => ({
  kind: 'choice',
  key: 'cycle',
  label: 'Cycle Time',
  options,
  default: def,
});

const rampParam = (def: string): ChoiceParam => ({
  kind: 'choice',
  key: 'ramp',
  label: 'Ramp',
  options: ['0.5 sec', '1 sec', '2 sec', '5 sec'],
  default: def,
});

const sweepParam: ChoiceParam = onOff('sweep', 'Sweep', 'On');
const sweepOn = (p: Params) => p.sweep === 'On';
const sweepOff = (p: Params) => p.sweep !== 'On';

const beatLow: NumberParam = {
  kind: 'number',
  key: 'beatLow',
  label: 'Beat Low',
  unit: 'Hz',
  min: 1,
  max: (p) => Math.min(199, Number(p.beatHigh) - 1),
  step: 1,
  default: 80,
  visible: sweepOn,
};

const beatHigh: NumberParam = {
  kind: 'number',
  key: 'beatHigh',
  label: 'Beat High',
  unit: 'Hz',
  min: (p) => Math.max(2, Number(p.beatLow) + 1),
  max: 200,
  step: 1,
  default: 150,
  visible: sweepOn,
};

const beatFreq: NumberParam = {
  kind: 'number',
  key: 'beatFreq',
  label: 'Beat Freq.',
  unit: 'Hz',
  min: 1,
  max: 200,
  step: 1,
  default: 100,
  visible: sweepOff,
};

const channelModeParam: ChoiceParam = {
  kind: 'choice',
  key: 'channelMode',
  label: 'Channel Mode',
  options: ['Single', 'Reciprocal', 'Co-Contract'],
  default: 'Single',
};

const setIntensityParam: ChoiceParam = {
  kind: 'choice',
  key: 'setIntensity',
  label: 'Set Intensity',
  options: ['Ch A', 'Ch B'],
  default: 'Ch A',
  visible: (p) => p.channelMode !== 'Single',
};

const phaseParam = (max: number, def: number): NumberParam => ({
  kind: 'number',
  key: 'phase',
  label: 'Phase Duration',
  unit: 'µsec',
  min: 20,
  max,
  step: 10,
  default: def,
});

const tensParams = (phaseDefault: number): ParamDef[] => [
  phaseParam(1000, phaseDefault),
  { kind: 'number', key: 'freq', label: 'Frequency', unit: 'Hz', min: 1, max: 250, step: 1, default: 80 },
  { kind: 'number', key: 'burst', label: 'Burst Freq.', unit: 'bps', min: 0, max: 10, step: 1, default: 0 },
  { kind: 'number', key: 'freqMod', label: 'Freq. Mod.', unit: 'Hz', min: 0, max: 250, step: 1, default: 0 },
  {
    kind: 'choice',
    key: 'ampMod',
    label: 'Amp. Mod.',
    options: ['Off', '40%', '60%', '80%', '100%'],
    default: 'Off',
  },
  cycleParam(CYCLE_TENS, 'Continuous'),
  modeParam('CC'),
  timeParam(20),
];

const ccCv = (p: Params) => (p.mode === 'CV' ? 'V' : 'mA');
const ccCvLabel = (p: Params) => (p.mode === 'CV' ? 'Volts CV' : 'mA CC');
const dualIfNotSingle = (p: Params): 1 | 2 => (p.channelMode === 'Single' ? 1 : 2);

const IFC_TERMS = [
  'TERMS:',
  'Carrier Frequency: The medium frequency of the two interfering currents.',
  'Beat Frequency: The difference between the two carrier frequencies. This is the frequency of the intensity modulation in the tissue.',
  'Sweep: The beat frequency changes between Beat Low and Beat High over a fixed 15 second sweep time.',
  'Vector Scan: Rotates the area of maximum interference to cover a larger treatment area.',
];

const PULSED_TERMS = [
  'TERMS:',
  'Phase Duration: The length of one phase of the pulse.',
  'Frequency: Number of pulses delivered per second.',
  'Cycle Time: Stimulation on time / off time in seconds.',
  'Ramp: Time to reach the set intensity at the start of each on time.',
  'CC/CV: Constant Current or Constant Voltage output.',
];

const WAVEFORMS: Record<WaveformId, WaveformDef> = {
  ifc: {
    id: 'ifc',
    name: 'Interferential',
    reviewName: 'Interferential',
    params: [
      sweepParam,
      {
        kind: 'choice',
        key: 'vectorScan',
        label: 'Vector Scan',
        options: ['Off', 'Manual', '40%', '100%'],
        default: 'Off',
      },
      beatLow,
      beatFreq,
      beatHigh,
      {
        kind: 'choice',
        key: 'carrier',
        label: 'Carrier Freq.',
        options: ['2500 Hz', '4000 Hz', '5000 Hz'],
        default: '4000 Hz',
      },
      modeParam('CV'),
      timeParam(20),
    ],
    editLayout: [
      'sweep', 'vectorScan',
      null, null,
      ['beatLow', 'beatFreq'], 'carrier',
      'beatHigh', 'mode',
      INTENSITY_SLOT, 'time',
    ],
    channelsNeeded: () => 2,
    linkedIntensity: true,
    intensityUnit: ccCv,
    intensityMax: () => 100,
    intensityStep: 0.5,
    intensityLabel: ccCvLabel,
    padContact: 'dual',
    description: [
      'DESCRIPTION:',
      'Interferential Current is a medium frequency waveform. Current comes out of two channels (four electrodes). The currents cross each other in the area that requires treatment. The two currents interfere with each other at this crossing point, resulting in a modulation of the intensity (the current intensity increases and decreases at a regular frequency).',
    ],
    terms: IFC_TERMS,
    placement: {
      figure: 'lowBack4',
      text: [
        'Four 2.75" Round Electrodes.',
        'Place the electrodes of each channel diagonally opposite each other so that the two currents cross in the center of the treatment area.',
        'Channel 1 (black lead) and Channel 2 (grey lead) should form an "X" over the area to be treated.',
      ],
    },
  },

  premod: {
    id: 'premod',
    name: 'Premodulated',
    reviewName: 'IFC Premod (2p)',
    params: [sweepParam, beatLow, beatFreq, beatHigh, modeParam('CV'), timeParam(20)],
    editLayout: [
      'sweep', null,
      null, null,
      ['beatLow', 'beatFreq'], 'mode',
      'beatHigh', null,
      INTENSITY_SLOT, 'time',
    ],
    channelsNeeded: () => 1,
    linkedIntensity: false,
    intensityUnit: ccCv,
    intensityMax: () => 100,
    intensityStep: 0.5,
    intensityLabel: ccCvLabel,
    padContact: 'single',
    description: [
      'DESCRIPTION:',
      'Premodulated Current is a medium frequency waveform. Current comes out of one channel (two electrodes). The current intensity is modulated: it increases and decreases at a regular frequency (the Amplitude Modulation Frequency).',
      'Carrier Frequency is fixed at 2,500 Hz.',
    ],
    terms: IFC_TERMS,
    placement: {
      figure: 'lowBack2',
      text: ['Two 2.75" Round Electrodes.', 'Place both electrodes of the channel over or on either side of the treatment area.'],
    },
  },

  asym: {
    id: 'asym',
    name: 'Asymmetrical Biphasic',
    reviewName: 'Asym. Biphasic',
    params: tensParams(250),
    editLayout: [
      'phase', 'freq',
      'burst', 'freqMod',
      'ampMod', 'cycle',
      'mode', null,
      INTENSITY_SLOT, 'time',
    ],
    channelsNeeded: () => 1,
    linkedIntensity: false,
    intensityUnit: ccCv,
    intensityMax: () => 110,
    intensityStep: 0.5,
    intensityLabel: ccCvLabel,
    padContact: null,
    description: [
      'DESCRIPTION:',
      'The Asymmetrical Biphasic waveform has a short pulse duration. It is capable of strong stimulation of the nerve fibers in the skin as well as of muscle tissue. This waveform is often used in TENS devices. Because of its short pulse, the patient typically tolerates the current well, even at relatively high intensities.',
    ],
    terms: [
      ...PULSED_TERMS,
      'Burst Freq.: Number of pulse bursts per second (0 = off).',
      'Freq. Mod.: Range over which the frequency is varied.',
      'Amp. Mod.: Amount the intensity is varied during stimulation.',
    ],
    placement: {
      figure: 'lowBack2',
      text: ['Two 2.75" Round Electrodes.', 'Place the electrodes over or around the painful area.'],
    },
  },

  sym: {
    id: 'sym',
    name: 'Symmetrical Biphasic',
    reviewName: 'Sym. Biphasic',
    params: tensParams(300),
    editLayout: [
      'phase', 'freq',
      'burst', 'freqMod',
      'ampMod', 'cycle',
      'mode', null,
      INTENSITY_SLOT, 'time',
    ],
    channelsNeeded: () => 1,
    linkedIntensity: false,
    intensityUnit: ccCv,
    intensityMax: () => 80,
    intensityStep: 0.5,
    intensityLabel: ccCvLabel,
    padContact: null,
    description: [
      'DESCRIPTION:',
      'The Symmetrical Biphasic waveform has a short pulse duration and is capable of strong stimulation of nerve fibers in the skin and in muscle. This waveform is often used in portable muscle stimulation units, and some TENS devices. Because of its short pulse duration, the patient typically tolerates the current well, even at relatively high intensities.',
    ],
    terms: [
      ...PULSED_TERMS,
      'Burst Freq.: Number of pulse bursts per second (0 = off).',
      'Freq. Mod.: Range over which the frequency is varied.',
      'Amp. Mod.: Amount the intensity is varied during stimulation.',
    ],
    placement: {
      figure: 'quad2',
      text: ['Two 2.75" Round Electrodes.', 'Place one electrode over the motor point of the muscle and the second electrode along the muscle belly.'],
    },
  },

  vms: {
    id: 'vms',
    name: 'VMS',
    reviewName: 'VMS',
    params: [
      channelModeParam,
      setIntensityParam,
      phaseParam(400, 300),
      { kind: 'number', key: 'freq', label: 'Frequency', unit: 'pps', min: 1, max: 200, step: 1, default: 50 },
      modeParam('CC'),
      rampParam('2 sec'),
      onOff('antiFatigue', 'Anti-Fatigue'),
      cycleParam(CYCLE_MUSCLE, '10/10'),
      timeParam(10),
    ],
    editLayout: [
      'channelMode', 'setIntensity',
      'phase', 'freq',
      'mode', 'ramp',
      'antiFatigue', 'cycle',
      INTENSITY_SLOT, 'time',
    ],
    channelsNeeded: dualIfNotSingle,
    linkedIntensity: false,
    intensityUnit: ccCv,
    intensityMax: () => 200,
    intensityStep: 0.5,
    intensityLabel: ccCvLabel,
    padContact: null,
    description: [
      'DESCRIPTION:',
      'VMS is a symmetrical biphasic waveform with a 100 µsec interphase interval. Because the pulse is relatively short, the waveform has a low skin load, making it suitable for applications requiring high intensities, such as in muscle strengthening protocols.',
    ],
    terms: [
      ...PULSED_TERMS,
      'Channel Mode: Single, Reciprocal (channels alternate) or Co-Contract (channels contract together).',
      'Anti-Fatigue: Varies the stimulation to reduce muscle fatigue.',
    ],
    placement: {
      figure: 'quad2',
      text: ['Two 2.75" Round Electrodes.', 'Place one electrode over the motor point of the quadriceps and the second over the distal muscle belly.'],
    },
  },

  vmsBurst: {
    id: 'vmsBurst',
    name: 'VMS Burst',
    reviewName: 'VMS Burst',
    params: [
      channelModeParam,
      setIntensityParam,
      phaseParam(400, 300),
      { kind: 'number', key: 'freq', label: 'Frequency', unit: 'pps', min: 1, max: 200, step: 1, default: 50 },
      modeParam('CC'),
      rampParam('2 sec'),
      onOff('antiFatigue', 'Anti-Fatigue'),
      cycleParam(CYCLE_MUSCLE, '10/10'),
      timeParam(10),
    ],
    editLayout: [
      'channelMode', 'setIntensity',
      'phase', 'freq',
      'mode', 'ramp',
      'antiFatigue', 'cycle',
      INTENSITY_SLOT, 'time',
    ],
    channelsNeeded: dualIfNotSingle,
    linkedIntensity: false,
    intensityUnit: ccCv,
    intensityMax: () => 200,
    intensityStep: 0.5,
    intensityLabel: ccCvLabel,
    padContact: null,
    description: [
      'DESCRIPTION:',
      'VMS Burst is a symmetrical biphasic waveform delivered in a burst format. Because the pulse is relatively short, the waveform has a low skin load, making it suitable for applications requiring high intensities, such as in muscle strengthening protocols.',
    ],
    terms: [
      ...PULSED_TERMS,
      'Channel Mode: Single, Reciprocal (channels alternate) or Co-Contract (channels contract together).',
      'Anti-Fatigue: Varies the stimulation to reduce muscle fatigue.',
    ],
    placement: {
      figure: 'quad2',
      text: ['Two 2.75" Round Electrodes.', 'Place one electrode over the motor point of the muscle and the second over the distal muscle belly.'],
    },
  },

  russian: {
    id: 'russian',
    name: 'Russian',
    reviewName: 'Russian',
    params: [
      channelModeParam,
      setIntensityParam,
      {
        kind: 'choice',
        key: 'dutyCycle',
        label: 'Duty Cycle',
        options: ['10%', '20%', '30%', '40%', '50%'],
        default: '50%',
      },
      { kind: 'number', key: 'burst', label: 'Burst Freq.', unit: 'bps', min: 20, max: 100, step: 1, default: 50 },
      modeParam('CC'),
      rampParam('2 sec'),
      onOff('antiFatigue', 'Anti-Fatigue'),
      cycleParam(CYCLE_MUSCLE, '10/50'),
      timeParam(10),
    ],
    editLayout: [
      'channelMode', 'setIntensity',
      'dutyCycle', 'burst',
      'mode', 'ramp',
      'antiFatigue', 'cycle',
      INTENSITY_SLOT, 'time',
    ],
    channelsNeeded: dualIfNotSingle,
    linkedIntensity: false,
    intensityUnit: ccCv,
    intensityMax: () => 100,
    intensityStep: 0.5,
    intensityLabel: ccCvLabel,
    padContact: 'single',
    description: [
      'DESCRIPTION:',
      'Russian Current is a sinusoidal waveform, delivered in bursts or series of pulses. This method was claimed by its author (Kots) to produce maximal muscle strengthening effects without significant discomfort to the patient.',
      'Carrier Frequency is fixed at 2,500 Hz.',
    ],
    terms: [
      'TERMS:',
      'Duty Cycle: Percentage of each burst period during which the carrier is on.',
      'Burst Freq.: Number of bursts delivered per second.',
      'Cycle Time: Stimulation on time / off time in seconds.',
      'Ramp: Time to reach the set intensity at the start of each on time.',
      'Channel Mode: Single, Reciprocal or Co-Contract.',
    ],
    placement: {
      figure: 'quad2',
      text: ['Two 2.75" Round Electrodes.', 'Place the electrodes over the proximal and distal quadriceps muscle belly.'],
    },
  },

  microcurrent: {
    id: 'microcurrent',
    name: 'Microcurrent',
    reviewName: 'Microcurrent',
    params: [
      {
        kind: 'choice',
        key: 'polarity',
        label: 'Polarity',
        options: ['Positive', 'Negative', 'Alternating'],
        default: 'Alternating',
      },
      { kind: 'number', key: 'carrier', label: 'Carrier Freq.', unit: 'Hz', min: 0.1, max: 1000, step: 0.1, default: 0.3 },
      timeParam(20),
    ],
    editLayout: [
      'polarity', 'carrier',
      null, null,
      null, null,
      null, null,
      INTENSITY_SLOT, 'time',
    ],
    channelsNeeded: () => 1,
    linkedIntensity: false,
    intensityUnit: () => 'µA',
    intensityMax: () => 1000,
    intensityStep: 5,
    intensityLabel: () => 'µA',
    padContact: null,
    description: [
      'DESCRIPTION:',
      'Microcurrent is a monophasic waveform of very low intensity that closely simulates the electrical current generated by the human body. Microcurrent can be applied via electrodes or probe.',
      'Duty cycle is fixed at 50% and ramp is fixed at 1 second.',
    ],
    terms: [
      'TERMS:',
      'Polarity: Positive, Negative or Alternating.',
      'Carrier Freq.: Frequency of the monophasic pulses.',
    ],
    placement: {
      figure: 'shoulder2',
      text: ['Two 2" Round Electrodes.', 'Place the electrodes on either side of the treatment area.'],
    },
  },

  hvpc: {
    id: 'hvpc',
    name: 'High Volt',
    reviewName: 'High Volt',
    params: [
      { kind: 'choice', key: 'polarity', label: 'Polarity', options: ['Positive', 'Negative'], default: 'Positive' },
      {
        kind: 'choice',
        key: 'sweep',
        label: 'Sweep',
        options: ['Continuous', '80/120 pps', '1/120 pps', '1/10 pps'],
        default: 'Continuous',
      },
      rampParam('2 sec'),
      {
        kind: 'number',
        key: 'freq',
        label: 'Frequency',
        unit: 'pps',
        min: 10,
        max: 120,
        step: 1,
        default: 100,
        visible: (p) => p.sweep === 'Continuous',
      },
      { kind: 'choice', key: 'display', label: 'Display', options: ['Volts', 'Peak Current'], default: 'Volts' },
      cycleParam(CYCLE_MUSCLE, 'Continuous'),
      onOff('antiFatigue', 'Anti-Fatigue'),
      timeParam(20),
    ],
    editLayout: [
      'polarity', 'sweep',
      'ramp', 'freq',
      'display', 'cycle',
      'antiFatigue', null,
      INTENSITY_SLOT, 'time',
    ],
    channelsNeeded: () => 1,
    linkedIntensity: false,
    intensityUnit: () => 'V',
    intensityMax: () => 500,
    intensityStep: 1,
    intensityLabel: (p) => (p.display === 'Peak Current' ? 'Peak mA' : 'Volts'),
    padContact: null,
    description: [
      'DESCRIPTION:',
      'The High Voltage Pulsed Current (HVPC) has a very brief pulse duration characterized by two distinct peaks delivered at high voltage. The waveform is monophasic (current flows in one direction only). The high voltage causes a decreased skin resistance making the current comfortable and easy to tolerate.',
    ],
    terms: [
      'TERMS:',
      'Polarity: Polarity of the active electrode.',
      'Sweep: Continuous, or a frequency sweep between the two listed frequencies.',
      'Display: Show intensity as Volts or estimated Peak Current.',
      'Cycle Time: Stimulation on time / off time in seconds.',
    ],
    placement: {
      figure: 'lowBack2',
      text: ['Two 2.75" Round Electrodes.', 'Place the active electrode over the treatment area and the dispersive electrode nearby.'],
    },
  },

  dc: {
    id: 'dc',
    name: 'DC',
    reviewName: 'Direct Current',
    params: [
      { kind: 'choice', key: 'polarity', label: 'Polarity', options: ['Positive', 'Negative'], default: 'Positive' },
      onOff('polarityReversal', 'Polarity Reversal'),
      { kind: 'choice', key: 'cycle', label: 'Cycle Time', options: ['Continuous', '5/60', '10/60'], default: 'Continuous' },
      timeParam(5, 10),
    ],
    editLayout: [
      'polarity', 'polarityReversal',
      null, 'cycle',
      null, null,
      null, null,
      INTENSITY_SLOT, 'time',
    ],
    channelsNeeded: () => 1,
    linkedIntensity: false,
    intensityUnit: () => 'mA',
    intensityMax: () => 4,
    intensityStep: 0.1,
    intensityLabel: () => 'mA CC',
    padContact: null,
    description: [
      'DESCRIPTION:',
      'DC Current is a direct current flowing in one direction only. The current can be continuous or interrupted.',
      'With Polarity Reversal On, polarity will change at 50% of treatment time.',
    ],
    terms: [
      'TERMS:',
      'Polarity: Polarity of the active (Channel) electrode.',
      'Polarity Reversal: Reverses polarity half way through the treatment.',
      'Cycle Time: Stimulation on time / off time in seconds.',
    ],
    placement: {
      figure: 'lowBack2',
      text: ['Two 2.75" Round Electrodes.', 'Place the active electrode over the treatment area.'],
    },
  },
};

export function getWaveform(id: WaveformId): WaveformDef {
  return WAVEFORMS[id];
}

export function defaultParams(id: WaveformId): Params {
  const params: Params = {};
  for (const def of WAVEFORMS[id].params) params[def.key] = def.default;
  return params;
}

export function findParam(id: WaveformId, key: string): ParamDef | undefined {
  return WAVEFORMS[id].params.find((d) => d.key === key);
}

export function isVisible(def: ParamDef, p: Params): boolean {
  return def.visible ? def.visible(p) : true;
}

export function resolveBound(bound: number | ((p: Params) => number), p: Params): number {
  return typeof bound === 'function' ? bound(p) : bound;
}

/** Resolve a layout slot to the first visible parameter it names. */
export function resolveLayoutEntry(id: WaveformId, entry: LayoutEntry, p: Params): ParamDef | typeof INTENSITY_SLOT | null {
  if (entry === null) return null;
  if (entry === INTENSITY_SLOT) return INTENSITY_SLOT;
  const keys = typeof entry === 'string' ? [entry] : entry;
  for (const key of keys) {
    const def = findParam(id, key);
    if (def && isVisible(def, p)) return def;
  }
  return null;
}

export function formatNumber(value: number, step: number): string {
  const decimals = step < 1 ? Math.max(1, String(step).split('.')[1]?.length ?? 1) : 0;
  return value.toFixed(decimals);
}

export function formatParamValue(def: ParamDef, value: ParamValue): string {
  if (def.kind === 'choice') return String(value);
  return `${formatNumber(Number(value), def.step)} ${def.unit}`;
}

/** Parse a cycle time string like "10/50" into seconds, or null for Continuous. */
export function parseCycle(cycle: ParamValue | undefined): { on: number; off: number } | null {
  if (typeof cycle !== 'string' || !cycle.includes('/')) return null;
  const [on, off] = cycle.split('/').map(Number);
  return { on, off };
}

export function parseSeconds(value: ParamValue | undefined, fallback: number): number {
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}
