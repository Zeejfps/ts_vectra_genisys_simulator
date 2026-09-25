import { INDICATIONS, type Indication } from './indications';
import type { Message, ScreenModel } from './screenModel';
import { buildScreen } from './screens';
import {
  CHANNELS,
  DEFAULT_SETTINGS,
  VOLUME_LEVELS,
  US_COUPLING_LEVELS,
  type BeepKind,
  type ChannelId,
  type Params,
  type Treatment,
  type UnitSettings,
  type WaveformId,
} from './types';
import {
  defaultParams,
  defaultSetIntensity,
  treatmentDurationMs,
  findParam,
  getWaveform,
  resolveBound,
  type NumberParam,
} from './waveforms';

export type Route =
  | { kind: 'home' }
  | { kind: 'estim' }
  | { kind: 'vmsChoice' }
  | { kind: 'indications' }
  | { kind: 'review'; tid: number }
  | { kind: 'edit'; tid: number; editing?: { key: string; value: number } }
  | { kind: 'text'; title: string; lines: string[]; page: number }
  | { kind: 'placement'; tid: number; page: number }
  | { kind: 'utilities' }
  | { kind: 'clinicName'; draft: string; cursor: number; framed: { row: number; col: number } | null }
  | { kind: 'confirm'; text: string[]; onYes: () => void }
  | { kind: 'dateTime' }
  | { kind: 'library' }
  | { kind: 'protocolBody' }
  | { kind: 'protocolList'; area: string }
  | { kind: 'electrodeCount'; indication: Indication; source: string };

export type PowerState = 'off' | 'booting' | 'on';

type HardButton = 'home' | 'back';

const BOOT_MS = 2500;
/** Idle time before the screen saver blanks the display (no treatment running). */
export const SCREEN_SAVER_MS = 10 * 60_000;
/** Home + Back pressed within this window counts as "simultaneously". */
const CHORD_MS = 450;

export interface DeviceOptions {
  now?: () => number;
}

export class Device {
  power: PowerState = 'off';
  settings: UnitSettings = { ...DEFAULT_SETTINGS };
  /** Offset applied to the host clock by Set Date and Time. */
  clockOffsetMs = 0;
  treatments = new Map<number, Treatment>();
  channelOwner: Record<ChannelId, number | null> = { 1: null, 2: null, 3: null, 4: null };
  selectedChannel: ChannelId = 1;
  stack: Route[] = [{ kind: 'home' }];
  message: (Message & { interrupt?: boolean }) | null = null;
  /** Simulated time in ms, advanced by tick(). Drives the output model. */
  simTimeMs = 0;
  screenSaver = false;

  onBeep: (kind: BeepKind) => void = () => {};
  onChange: () => void = () => {};

  private bootRemainingMs = 0;
  private idleMs = 0;
  private nextId = 1;
  private lastHard: { button: HardButton; at: number } | null = null;
  private readonly now: () => number;

  constructor(opts: DeviceOptions = {}) {
    this.now = opts.now ?? (() => performance.now());
  }

  // ---------- queries ----------

  get route(): Route {
    return this.stack[this.stack.length - 1];
  }

  screen(): ScreenModel {
    return buildScreen(this);
  }

  treatmentOn(ch: ChannelId): Treatment | undefined {
    const id = this.channelOwner[ch];
    return id === null ? undefined : this.treatments.get(id);
  }

  channelStatus(ch: ChannelId): string {
    const t = this.treatmentOn(ch);
    if (!t) return 'Available';
    return { setup: 'Setup', running: 'Running', paused: 'Paused', completed: 'Completed' }[t.status];
  }

  /** The treatment the intensity knob and Start/Pause/Stop act on. */
  get activeTreatment(): Treatment | undefined {
    return this.treatmentOn(this.selectedChannel);
  }

  // ---------- power ----------

  togglePower(): void {
    if (this.power === 'off') {
      this.power = 'booting';
      this.bootRemainingMs = BOOT_MS;
    } else {
      this.powerOff();
    }
    this.onChange();
  }

  private powerOff(): void {
    this.power = 'off';
    this.treatments.clear();
    this.channelOwner = { 1: null, 2: null, 3: null, 4: null };
    this.selectedChannel = 1;
    this.stack = [{ kind: 'home' }];
    this.message = null;
    this.screenSaver = false;
    this.idleMs = 0;
  }

  // ---------- time ----------

  tick(dtMs: number, speed = 1): void {
    if (this.power === 'booting') {
      this.bootRemainingMs -= dtMs;
      if (this.bootRemainingMs <= 0) {
        this.power = 'on';
        this.onBeep('start');
      }
      this.onChange();
      return;
    }
    if (this.power !== 'on') return;

    const simDt = dtMs * speed;
    this.simTimeMs += simDt;
    let changed = false;
    const anyRunning = [...this.treatments.values()].some((t) => t.status === 'running');
    this.idleMs = anyRunning ? 0 : this.idleMs + dtMs;
    if (!this.screenSaver && this.idleMs >= SCREEN_SAVER_MS) {
      this.screenSaver = true;
      changed = true;
    }
    for (const t of this.treatments.values()) {
      if (t.status !== 'running') continue;
      t.remainingMs -= simDt;
      t.elapsedMs += simDt;
      changed = true;
      if (t.remainingMs <= 0) {
        t.remainingMs = 0;
        this.complete(t);
        this.onBeep('complete');
        this.showCompleted(t);
      }
    }
    if (changed) this.onChange();
  }

  // ---------- hardware buttons ----------

  pressSoftKey(index: number): void {
    if (!this.isOn() || this.wake()) return;
    if (this.dismissMessage()) return;
    const slot = this.screen().slots[index];
    if (!slot) return;
    this.onBeep('key');
    slot.onPress();
    this.onChange();
  }

  pressHome(): void {
    if (!this.isOn() || this.wake()) return;
    if (this.chord('home')) return;
    if (this.dismissMessage()) return;
    this.onBeep('key');
    this.stack = [{ kind: 'home' }];
    this.onChange();
  }

  pressBack(): void {
    if (!this.isOn() || this.wake()) return;
    if (this.chord('back')) return;
    if (this.dismissMessage()) return;
    this.onBeep('key');
    this.goBack();
    this.onChange();
  }

  pressLibrary(): void {
    if (!this.isOn() || this.wake()) return;
    if (this.dismissMessage()) return;
    this.onBeep('key');
    this.stack = [{ kind: 'home' }, { kind: 'library' }];
    this.onChange();
  }

  pressStart(): void {
    if (!this.isOn() || this.wake()) return;
    this.dismissMessage();
    const t = this.activeTreatment;
    if (!t || t.status === 'running' || t.status === 'completed') {
      this.onBeep('error');
    } else {
      t.startedAt ??= this.clock().getTime();
      t.status = 'running';
      this.onBeep('start');
    }
    this.onChange();
  }

  pressPause(): void {
    if (!this.isOn() || this.wake()) return;
    this.dismissMessage();
    const t = this.activeTreatment;
    if (t?.status === 'running') {
      this.pause(t);
      this.onBeep('key');
    } else if (t?.status === 'paused') {
      t.status = 'running';
      this.onBeep('start');
    } else {
      this.onBeep('error');
    }
    this.onChange();
  }

  pressStop(): void {
    if (!this.isOn() || this.wake()) return;
    this.dismissMessage();
    const t = this.activeTreatment;
    if (t && (t.status === 'running' || t.status === 'paused')) {
      this.complete(t);
      this.onBeep('key');
      if (t.params.method === 'Probe') {
        // Microcurrent probe treatments return straight to Home (service manual p.47).
        this.stack = [{ kind: 'home' }];
      } else {
        this.showCompleted(t);
      }
    } else {
      this.onBeep('error');
    }
    this.onChange();
  }

  /** Rotate the intensity knob by a number of detents (positive = clockwise). */
  turnKnob(detents: number): void {
    if (!this.isOn() || detents === 0 || this.wake()) return;
    const t = this.activeTreatment;
    if (!t || t.status === 'completed') {
      this.onBeep('error');
      return;
    }
    const wf = getWaveform(t.waveform);
    const max = wf.intensityMax(t.params);
    const step = wf.intensityStep;
    const both = wf.linkedIntensity || t.params.setIntensity === 'Both Channels';
    const targets = both ? t.intensity.map((_, i) => i) : [this.intensityIndex(t)];
    for (const i of targets) {
      const next = roundTo(t.intensity[i] + detents * step, step);
      t.intensity[i] = clamp(next, 0, max);
    }
    this.onChange();
  }

  /** Optional hand-held Patient Interrupt Switch (Channels 1/2). */
  patientInterrupt(): void {
    if (!this.isOn()) return;
    if (this.message?.interrupt) {
      // Second press clears the message; treatment stays paused.
      this.message = null;
      this.onChange();
      return;
    }
    let paused = false;
    for (const ch of [1, 2] as ChannelId[]) {
      const t = this.treatmentOn(ch);
      if (t?.status === 'running') {
        this.pause(t);
        paused = true;
      }
    }
    if (paused) {
      this.message = {
        lines: ['Patient switch for Ch 1 and 2 was pressed.', 'Press any button to continue...'],
        tone: 'pink',
        interrupt: true,
      };
      this.onBeep('error');
    }
    this.onChange();
  }

  // ---------- navigation helpers used by screens ----------

  push(route: Route): void {
    this.stack.push(route);
  }

  replaceTop(route: Route): void {
    this.stack[this.stack.length - 1] = route;
  }

  showMessage(lines: string[], tone: Message['tone'] = 'info'): void {
    this.message = { lines, tone };
  }

  goBack(): void {
    const r = this.route;
    if (r.kind === 'edit' && r.editing) {
      this.replaceTop({ kind: 'edit', tid: r.tid });
      return;
    }
    if (r.kind === 'review') {
      const t = this.treatments.get(r.tid);
      // Backing out of a channel that was never started cancels its setup.
      if (t && t.status === 'setup' && t.elapsedMs === 0) this.release(t);
    }
    if (this.stack.length > 1) this.stack.pop();
  }

  selectNextChannel(): void {
    const i = CHANNELS.indexOf(this.selectedChannel);
    this.selectedChannel = CHANNELS[(i + 1) % CHANNELS.length];
    // Keep a paired treatment's Set Intensity in step with the framed channel.
    const t = this.activeTreatment;
    if (t && t.channels.length > 1 && t.params.setIntensity !== undefined && t.params.setIntensity !== 'Both Channels') {
      t.params.setIntensity = t.channels.indexOf(this.selectedChannel) === 1 ? '2nd Channel' : '1st Channel';
    }
  }

  viewSelectedChannel(): void {
    const t = this.activeTreatment;
    if (!t) {
      this.showMessage([`Channel ${this.selectedChannel} is available.`, 'Select a modality to set up the channel.']);
      return;
    }
    this.push({ kind: 'review', tid: t.id });
  }

  openReview(t: Treatment): void {
    this.selectedChannel = t.channels[this.intensityIndex(t)];
    this.push({ kind: 'review', tid: t.id });
  }

  // ---------- treatments ----------

  /** Allocate channels and create a treatment in Setup. Returns undefined if no channel is free. */
  createTreatment(waveform: WaveformId, overrides: Params = {}, source?: string): Treatment | undefined {
    const params = { ...defaultParams(waveform), ...overrides };
    const wf = getWaveform(waveform);
    const channels = this.findFreeChannels(wf.channelsNeeded(params));
    if (!channels) {
      this.showMessage(['No channels available.', 'Stop a treatment or clear a channel first.']);
      return undefined;
    }
    for (const ch of channels) this.clearChannel(ch);
    const t: Treatment = {
      id: this.nextId++,
      waveform,
      params,
      channels,
      intensity: channels.map(() => 0),
      status: 'setup',
      remainingMs: treatmentDurationMs(params),
      elapsedMs: 0,
      source,
    };
    this.treatments.set(t.id, t);
    for (const ch of channels) this.channelOwner[ch] = t.id;
    return t;
  }

  selectWaveform(waveform: WaveformId): void {
    const t = this.createTreatment(waveform);
    if (t) this.openReview(t);
  }

  loadIndication(ind: Indication, source = `Indication: ${ind.label}`): void {
    const t = this.createTreatment(ind.waveform, ind.params, source);
    if (t) this.openReview(t);
  }

  indications(): readonly Indication[] {
    return INDICATIONS;
  }

  /** Choice parameters cycle to the next option each time their button is pressed. */
  cycleParam(t: Treatment, key: string): void {
    const def = findParam(t.waveform, key);
    if (!def || def.kind !== 'choice') return;
    const options = def.optionsFor ? def.optionsFor(t.params) : def.options;
    const i = options.indexOf(String(t.params[key]));
    const next = options[(i + 1) % options.length];
    this.setParam(t, key, next);
  }

  beginNumberEdit(t: Treatment, key: string): void {
    const r = this.route;
    if (r.kind !== 'edit') return;
    this.replaceTop({ kind: 'edit', tid: t.id, editing: { key, value: Number(t.params[key]) } });
  }

  stepNumberEdit(direction: 1 | -1): void {
    const r = this.route;
    if (r.kind !== 'edit' || !r.editing) return;
    const t = this.treatments.get(r.tid);
    const def = t && findParam(t.waveform, r.editing.key);
    if (!t || !def || def.kind !== 'number') return;
    const next = stepNumber(def, r.editing.value, direction, t.params);
    if (next === r.editing.value) this.onBeep('error');
    r.editing.value = next;
  }

  acceptNumberEdit(): void {
    const r = this.route;
    if (r.kind !== 'edit' || !r.editing) return;
    const t = this.treatments.get(r.tid);
    if (t) this.setParam(t, r.editing.key, r.editing.value);
    this.replaceTop({ kind: 'edit', tid: r.tid });
  }

  setParam(t: Treatment, key: string, value: number | string): void {
    const prev = t.params[key];
    t.params[key] = value;

    if (key === 'time' || key === 'probeTime' || key === 'method') {
      const before = treatmentDurationMs({ ...t.params, [key]: prev });
      const after = treatmentDurationMs(t.params);
      t.remainingMs = t.status === 'setup' ? after : Math.max(1000, t.remainingMs + after - before);
    }
    if (key === 'channelMode') {
      if (this.reallocate(t)) {
        t.params.setIntensity = defaultSetIntensity(String(value));
        this.selectedChannel = t.channels[0];
      } else {
        t.params[key] = prev;
      }
    }
    if (key === 'setIntensity' && t.channels.length > 1) {
      this.selectedChannel = t.channels[value === '2nd Channel' ? 1 : 0];
    }
    if (key === 'mode') {
      // Switching CC/CV changes the output unit, so start again from zero.
      t.intensity = t.intensity.map(() => 0);
    }
    const wf = getWaveform(t.waveform);
    const max = wf.intensityMax(t.params);
    t.intensity = t.intensity.map((v) => Math.min(v, max));
  }

  /** Index into treatment.channels / treatment.intensity that the knob controls. */
  intensityIndex(t: Treatment): number {
    if (t.channels.length < 2) return 0;
    if (getWaveform(t.waveform).linkedIntensity) return 0;
    const i = t.channels.indexOf(this.selectedChannel);
    return i < 0 ? 0 : i;
  }

  /** "Start New Treatment" on the Completed Treatment Review frees the channel. */
  startNewTreatment(t: Treatment): void {
    this.release(t);
    this.stack = [{ kind: 'home' }, { kind: 'estim' }];
  }

  // ---------- utilities ----------

  cycleVolume(): void {
    const i = VOLUME_LEVELS.indexOf(this.settings.volume);
    this.settings.volume = VOLUME_LEVELS[(i + 1) % VOLUME_LEVELS.length];
    this.onBeep('volumePreview');
  }

  cycleUsCoupling(): void {
    const i = US_COUPLING_LEVELS.indexOf(this.settings.usCoupling);
    this.settings.usCoupling = US_COUPLING_LEVELS[(i + 1) % US_COUPLING_LEVELS.length];
  }

  restoreUnitSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.clockOffsetMs = 0;
  }

  clock(): Date {
    return new Date(Date.now() + this.clockOffsetMs);
  }

  adjustClock(field: 'month' | 'day' | 'year' | 'hour' | 'minute', delta: 1 | -1): void {
    const d = this.clock();
    const next = new Date(d);
    if (field === 'month') next.setMonth(d.getMonth() + delta);
    if (field === 'day') next.setDate(d.getDate() + delta);
    if (field === 'year') next.setFullYear(d.getFullYear() + delta);
    if (field === 'hour') next.setHours(d.getHours() + delta);
    if (field === 'minute') next.setMinutes(d.getMinutes() + delta);
    this.clockOffsetMs += next.getTime() - d.getTime();
  }

  // ---------- internals ----------

  private isOn(): boolean {
    return this.power === 'on';
  }

  /** Any input resets the idle timer; the first input only wakes the screen saver. */
  private wake(): boolean {
    this.idleMs = 0;
    if (!this.screenSaver) return false;
    this.screenSaver = false;
    this.onChange();
    return true;
  }

  /** Returns true if a message was showing (the press only dismisses it). */
  private dismissMessage(): boolean {
    if (!this.message) return false;
    this.message = null;
    this.onBeep('key');
    this.onChange();
    return true;
  }

  /** Detect Home + Back pressed together, which opens Operator Utilities. */
  private chord(button: HardButton): boolean {
    const at = this.now();
    const other = this.lastHard;
    this.lastHard = { button, at };
    if (other && other.button !== button && at - other.at <= CHORD_MS) {
      this.lastHard = null;
      this.message = null;
      this.onBeep('key');
      this.stack = [{ kind: 'home' }, { kind: 'utilities' }];
      this.onChange();
      return true;
    }
    return false;
  }

  private complete(t: Treatment): void {
    t.status = 'completed';
    t.endIntensity = [...t.intensity];
    t.intensity = t.intensity.map(() => 0);
    t.endedAt = this.clock().getTime();
  }

  /** Pausing drops the output to zero; the intensity must be turned back up to resume. */
  private pause(t: Treatment): void {
    t.status = 'paused';
    t.intensity = t.intensity.map(() => 0);
  }

  private showCompleted(t: Treatment): void {
    this.selectedChannel = t.channels[0];
    this.stack = [{ kind: 'home' }, { kind: 'review', tid: t.id }];
  }

  private isFree(ch: ChannelId): boolean {
    const t = this.treatmentOn(ch);
    return !t || t.status === 'completed';
  }

  private findFreeChannels(count: 1 | 2): ChannelId[] | undefined {
    if (count === 1) {
      const ch = CHANNELS.find((c) => this.isFree(c));
      return ch ? [ch] : undefined;
    }
    const pairs: [ChannelId, ChannelId][] = [
      [1, 2],
      [3, 4],
    ];
    const pair = pairs.find(([a, b]) => this.isFree(a) && this.isFree(b));
    return pair ? [...pair] : undefined;
  }

  /** Drop a completed treatment from a channel so it can be reused. */
  private clearChannel(ch: ChannelId): void {
    const t = this.treatmentOn(ch);
    if (t) this.release(t);
  }

  private release(t: Treatment): void {
    for (const ch of t.channels) if (this.channelOwner[ch] === t.id) this.channelOwner[ch] = null;
    this.treatments.delete(t.id);
  }

  /** Grow or shrink a treatment's channel set after Channel Mode changes. */
  private reallocate(t: Treatment): boolean {
    const need = getWaveform(t.waveform).channelsNeeded(t.params);
    if (need === t.channels.length) return true;
    const primary = t.channels[0];
    if (need === 1) {
      const [, partner] = t.channels;
      if (this.channelOwner[partner] === t.id) this.channelOwner[partner] = null;
      t.channels = [primary];
      t.intensity = [t.intensity[0]];
      if (this.selectedChannel === partner) this.selectedChannel = primary;
      return true;
    }
    const partner = (primary % 2 === 1 ? primary + 1 : primary - 1) as ChannelId;
    if (!this.isFree(partner)) {
      this.showMessage([`Channel ${partner} is not available.`, 'Reciprocal and Co-Contract modes need', `Channels ${Math.min(primary, partner)} and ${Math.max(primary, partner)}.`]);
      return false;
    }
    this.clearChannel(partner);
    t.channels = [primary, partner];
    t.intensity = [t.intensity[0], 0];
    this.channelOwner[partner] = t.id;
    return true;
  }
}

// ---------- number helpers ----------

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function roundTo(v: number, step: number): number {
  const decimals = step < 1 ? String(step).split('.')[1]?.length ?? 1 : 0;
  return Number((Math.round(v / step) * step).toFixed(decimals));
}

/** Larger steps for wide ranges so holding an arrow key stays usable. */
function adaptiveStep(def: NumberParam, value: number, direction: 1 | -1): number {
  if (def.key !== 'carrier') return def.step;
  const probe = direction < 0 ? value - 1e-9 : value;
  if (probe < 10) return 0.1;
  if (probe < 100) return 1;
  return 10;
}

export function stepNumber(def: NumberParam, value: number, direction: 1 | -1, params: Params): number {
  const min = resolveBound(def.min, params);
  const max = resolveBound(def.max, params);
  const step = adaptiveStep(def, value, direction);
  return clamp(roundTo(value + direction * step, Math.min(step, def.step)), min, max);
}
