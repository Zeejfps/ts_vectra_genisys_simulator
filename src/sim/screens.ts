import type { Device, Route } from './device';
import { INDICATIONS, type Indication } from './indications';
import { channelOutput } from './output';
import {
  emptySlots,
  slotIndex,
  type Block,
  type IconName,
  type ScreenModel,
  type Slot,
  type StatusPanel,
  type StatusRow,
} from './screenModel';
import { CHANNELS, type Treatment, type WaveformId } from './types';
import {
  INTENSITY_SLOT,
  findParam,
  formatNumber,
  formatParamValue,
  getWaveform,
  isVisible,
  resolveBound,
  resolveLayoutEntry,
} from './waveforms';

export const SOFTWARE_VERSION = '2.0 (Simulator)';
const TEXT_LINE_WIDTH = 40;
const TEXT_PAGE_LINES = 15;

const FULL = { rows: [2, 4] as [number, number], cols: [1, 2] as [number, number] };
const ROWS_1_TO_4 = { rows: [1, 4] as [number, number], cols: [1, 2] as [number, number] };

export function buildScreen(d: Device): ScreenModel {
  if (d.power === 'off') return blank('off');
  if (d.power === 'booting') return blank('boot');
  if (d.screenSaver) return blank('saver');

  const r = d.route;
  const base: ScreenModel = {
    kind: 'screen',
    title: '',
    slots: emptySlots(),
    blocks: [],
    layout: 'standard',
    status: statusPanel(d),
    message: d.message ? { lines: d.message.lines, tone: d.message.tone } : null,
  };

  switch (r.kind) {
    case 'home':
      return homeScreen(d, base);
    case 'estim':
      return estimScreen(d, base);
    case 'vmsChoice':
      return vmsChoiceScreen(d, base);
    case 'indications':
      return indicationsScreen(d, base);
    case 'review':
      return withTreatment(d, r.tid, base, (t) => reviewScreen(d, base, t));
    case 'edit':
      return withTreatment(d, r.tid, base, (t) => editScreen(d, base, t, r));
    case 'text':
      return textScreen(d, base, r);
    case 'placement':
      return withTreatment(d, r.tid, base, (t) => placementScreen(d, base, t, r.page));
    case 'utilities':
      return utilitiesScreen(d, base);
    case 'clinicName':
      return clinicNameScreen(d, base, r);
    case 'confirm':
      return confirmScreen(d, base, r);
    case 'dateTime':
      return dateTimeScreen(d, base);
    case 'library':
      return libraryScreen(d, base);
    case 'protocolBody':
      return protocolBodyScreen(d, base);
    case 'protocolList':
      return protocolListScreen(d, base, r.area);
    case 'electrodeCount':
      return electrodeCountScreen(d, base, r);
  }
}

function blank(kind: 'off' | 'boot' | 'saver'): ScreenModel {
  return { kind, title: '', slots: emptySlots(), blocks: [], layout: 'standard', status: null, message: null };
}

function withTreatment(d: Device, tid: number, base: ScreenModel, build: (t: Treatment) => ScreenModel): ScreenModel {
  const t = d.treatments.get(tid);
  if (!t) {
    // Treatment vanished (e.g. channel was reused); fall back to Home.
    d.stack = [{ kind: 'home' }];
    return homeScreen(d, base);
  }
  return build(t);
}

function slot(label: string, onPress: () => void, extra: Partial<Slot> = {}): Slot {
  return { label, onPress, ...extra };
}

function set(model: ScreenModel, side: 'left' | 'right', row: number, s: Slot | null): void {
  model.slots[slotIndex(side, row)] = s;
}

const noApplicator = (d: Device) => () =>
  d.showMessage(['Ultrasound applicator is not plugged into unit.', 'Press any button to continue...']);

const notSimulated = (d: Device, what: string) => () =>
  d.showMessage([`${what} is not available`, 'in this simulator.', 'Press any button to continue...']);

// ---------- Home ----------

function homeScreen(d: Device, m: ScreenModel): ScreenModel {
  m.title = d.settings.clinicName;
  set(m, 'left', 1, slot('Electrotherapy', () => d.push({ kind: 'estim' })));
  set(m, 'right', 1, slot('Indications', () => d.push({ kind: 'indications' })));
  set(m, 'left', 2, slot('Ultrasound', noApplicator(d)));
  set(m, 'right', 2, slot('Combination', noApplicator(d)));
  set(m, 'left', 3, slot('sEMG', notSimulated(d, 'sEMG')));
  set(m, 'right', 3, slot('sEMG + Stim', notSimulated(d, 'sEMG + Stim')));
  set(m, 'left', 4, slot('View / Edit\nChannel', () => d.viewSelectedChannel()));
  set(m, 'right', 4, slot('Patient Card\nNone Inserted', () => d.showMessage(['No Patient Data Card inserted.', 'Press any button to continue...'])));
  set(m, 'left', 5, slot('Select Channel', () => d.selectNextChannel()));
  return m;
}

// ---------- Electrotherapy waveform list ----------

function estimScreen(d: Device, m: ScreenModel): ScreenModel {
  m.title = 'Electrotherapy';
  const pick = (id: WaveformId) => () => d.selectWaveform(id);
  set(m, 'left', 1, slot('Interferential', pick('ifc'), { icon: 'ifc', iconSide: 'right' }));
  set(m, 'right', 1, slot('Premod', pick('premod'), { icon: 'premod', iconSide: 'left' }));
  set(m, 'left', 2, slot('Asymmetrical\nBiphasic', pick('asym'), { icon: 'asym', iconSide: 'right' }));
  set(m, 'right', 2, slot('Microcurrent', pick('microcurrent'), { icon: 'microcurrent', iconSide: 'left' }));
  set(m, 'left', 3, slot('VMS /\nVMS Burst', () => d.push({ kind: 'vmsChoice' }), { icon: 'vms', iconSide: 'right' }));
  set(m, 'right', 3, slot('Russian', pick('russian'), { icon: 'russian', iconSide: 'left' }));
  set(m, 'left', 4, slot('High Volt', pick('hvpc'), { icon: 'hvpc', iconSide: 'right' }));
  set(m, 'right', 4, slot('Symmetrical\nBiphasic', pick('sym'), { icon: 'sym', iconSide: 'left' }));
  set(m, 'left', 5, slot('DC', pick('dc'), { icon: 'dc', iconSide: 'right' }));
  set(m, 'right', 5, slot('Indications', () => d.push({ kind: 'indications' })));
  return m;
}

function vmsChoiceScreen(d: Device, m: ScreenModel): ScreenModel {
  m.title = 'VMS / VMS Burst';
  set(m, 'left', 1, slot('VMS', () => d.selectWaveform('vms'), { icon: 'vms', iconSide: 'right' }));
  set(m, 'right', 1, slot('VMS Burst', () => d.selectWaveform('vmsBurst'), { icon: 'vms', iconSide: 'left' }));
  return m;
}

// ---------- Indications ----------

// Button positions follow the Electrotherapy Indications screen in the manual.
const INDICATION_SLOTS: [side: 'left' | 'right', row: number][] = [
  ['left', 1],
  ['right', 1],
  ['left', 2],
  ['right', 2],
  ['left', 3],
  ['right', 3],
  ['left', 4],
  ['left', 5],
];

function indicationsScreen(d: Device, m: ScreenModel): ScreenModel {
  m.title = 'Electrotherapy Indications';
  INDICATIONS.forEach((ind, i) => {
    const [side, row] = INDICATION_SLOTS[i];
    set(m, side, row, slot(ind.button, () => d.loadIndication(ind)));
  });
  set(m, 'right', 5, slot('Waveforms', () => d.push({ kind: 'estim' })));
  return m;
}

// ---------- Treatment Review ----------

export function channelsLabel(t: Treatment): string {
  const sorted = [...t.channels].sort();
  return sorted.length === 1 ? `Ch ${sorted[0]}` : `Ch ${sorted[0]}-${sorted[sorted.length - 1]}`;
}

function reviewScreen(d: Device, m: ScreenModel, t: Treatment): ScreenModel {
  const wf = getWaveform(t.waveform);
  const completed = t.status === 'completed';
  m.title = `${completed ? 'Completed ' : ''}Treatment Review ${channelsLabel(t)}`;

  if (completed) {
    set(m, 'left', 1, slot('Save to\nPatient Card', () => d.showMessage(['No Patient Data Card inserted.', 'Press any button to continue...'])));
    set(m, 'right', 1, slot('Start New\nTreatment', () => d.startNewTreatment(t)));
  } else {
    set(m, 'left', 1, slot('Waveform\nDescription', () =>
      d.push({ kind: 'text', title: 'Waveform Description', lines: wrapParagraphs([...wf.description, '', ...wf.terms]), page: 0 })));
    set(m, 'right', 1, slot('Electrode\nPlacement', () => d.push({ kind: 'placement', tid: t.id, page: 0 })));
  }

  const lines = [`Waveform:  ${wf.reviewName}`];
  if (t.source) lines.push(t.source);
  for (const def of wf.params) {
    if (!isVisible(def, t.params)) continue;
    lines.push(`${def.label}:  ${formatParamValue(def, t.params[def.key])}`);
  }
  if (completed) {
    lines.push('', `Start Time: ${t.startedAt ? formatTime(t.startedAt) : '--'}   End Time: ${t.endedAt ? formatTime(t.endedAt) : '--'}`);
  }
  m.blocks.push({ type: 'text', area: FULL, tone: 'green', lines });

  if (!completed) {
    m.blocks.push(intensityBlock(t, 5, 1));
    set(m, 'right', 5, slot('Edit', () => d.push({ kind: 'edit', tid: t.id })));
  }
  return m;
}

function intensityBlock(t: Treatment, row: number, col: number): Block {
  return {
    type: 'intensity',
    area: { rows: [row, row], cols: [col, col] },
    values: t.channels.map((_, i) => intensityText(t, i)),
    unit: getWaveform(t.waveform).intensityLabel(t.params),
  };
}

// ---------- Edit parameters ----------

function editScreen(d: Device, m: ScreenModel, t: Treatment, r: Extract<Route, { kind: 'edit' }>): ScreenModel {
  const wf = getWaveform(t.waveform);
  m.title = wf.name;

  if (r.editing) return numberEditor(d, m, t, r.editing);

  if (t.waveform === 'microcurrent') {
    m.blocks.push({ type: 'contact', area: { rows: [1, 4], cols: [1, 1] }, level: contactLevel(t) });
  }

  wf.editLayout.forEach((entry, i) => {
    const def = resolveLayoutEntry(t.waveform, entry, t.params);
    if (def === null) return;
    if (def === INTENSITY_SLOT) {
      const row = Math.floor(i / 2) + 1;
      m.blocks.push(intensityBlock(t, row, (i % 2) + 1));
      return;
    }
    const label = `${def.label}\n${formatParamValue(def, t.params[def.key])}`;
    m.slots[i] = slot(label, () =>
      def.kind === 'choice' ? d.cycleParam(t, def.key) : d.beginNumberEdit(t, def.key));
  });
  return m;
}

function numberEditor(d: Device, m: ScreenModel, t: Treatment, editing: { key: string; value: number }): ScreenModel {
  const def = findParam(t.waveform, editing.key);
  if (!def || def.kind !== 'number') return m;
  const min = resolveBound(def.min, t.params);
  const max = resolveBound(def.max, t.params);
  // Layout follows the Treatment Time editor photographed in the Laser Module manual:
  // title bar shows the parameter, a small value box, arrows on the right rows 1-3.
  m.title = def.label;
  m.blocks.push({
    type: 'valueEditor',
    area: { rows: [1, 3], cols: [1, 1] },
    label: def.label,
    value: formatParamValue(def, editing.value),
    range: `Range: ${formatNumber(min, def.step)}-${formatNumber(max, def.step)}`,
  });
  set(m, 'right', 1, slot('', () => d.stepNumberEdit(1), { icon: 'up', repeat: true }));
  set(m, 'right', 2, slot('', () => d.acceptNumberEdit(), { icon: 'accept' }));
  set(m, 'right', 3, slot('', () => d.stepNumberEdit(-1), { icon: 'down', repeat: true }));
  return m;
}

// ---------- Text pages (waveform description etc.) ----------

export function wrapParagraphs(paragraphs: readonly string[], width = TEXT_LINE_WIDTH): string[] {
  const out: string[] = [];
  for (const para of paragraphs) {
    if (para === '') {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (line && (line + ' ' + word).length > width) {
        out.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function pageCount(lines: string[]): number {
  return Math.max(1, Math.ceil(lines.length / TEXT_PAGE_LINES));
}

function textScreen(d: Device, m: ScreenModel, r: Extract<Route, { kind: 'text' }>): ScreenModel {
  m.title = r.title;
  const pages = pageCount(r.lines);
  const start = r.page * TEXT_PAGE_LINES;
  m.blocks.push({ type: 'text', area: ROWS_1_TO_4, tone: 'green', lines: r.lines.slice(start, start + TEXT_PAGE_LINES) });
  if (r.page > 0) set(m, 'left', 5, slot('Prev\nPage', () => d.replaceTop({ ...r, page: r.page - 1 })));
  if (r.page < pages - 1) set(m, 'right', 5, slot('Next\nPage', () => d.replaceTop({ ...r, page: r.page + 1 })));
  return m;
}

// ---------- Electrode placement ----------

function placementScreen(d: Device, m: ScreenModel, t: Treatment, page: number): ScreenModel {
  const wf = getWaveform(t.waveform);
  m.title = `Electrode Placement ${wf.name}`;
  const go = (p: number) => () => d.replaceTop({ kind: 'placement', tid: t.id, page: p });
  if (page === 0) {
    m.blocks.push({ type: 'placement', area: ROWS_1_TO_4, figure: wf.placement.figure, caption: wf.placement.text[0] });
    set(m, 'right', 5, slot('Next\nPage', go(1)));
  } else {
    m.blocks.push({ type: 'text', area: ROWS_1_TO_4, tone: 'green', lines: wrapParagraphs(['ELECTRODE PLACEMENT:', '', ...wf.placement.text]) });
    set(m, 'left', 5, slot('Prev\nPage', go(0)));
  }
  return m;
}

// ---------- Operator Utilities ----------

function utilitiesScreen(d: Device, m: ScreenModel): ScreenModel {
  const s = d.settings;
  m.title = `Utilities: Version ${SOFTWARE_VERSION}`;
  set(m, 'left', 1, slot(`Clinic Name\n${truncate(s.clinicName, 18)}`, () =>
    d.push({ kind: 'clinicName', draft: s.clinicName, cursor: s.clinicName.length, framed: null })));
  set(m, 'right', 1, slot(`Volume\n${s.volume}`, () => d.cycleVolume()));
  set(m, 'left', 2, slot('Restore Default\nProtocols', () =>
    d.push({
      kind: 'confirm',
      text: ['Restore Protocols to Factory Settings?', '', 'This will permanently remove all', 'User Protocols and User saved Sequences.'],
      onYes: () => {
        d.goBack();
        d.showMessage(['Default Protocols are restored.', 'Press any button to continue...']);
      },
    })));
  set(m, 'right', 2, slot(`US Coupling\n${s.usCoupling}`, () => d.cycleUsCoupling()));
  set(m, 'left', 3, slot('Restore Default\nUnit Settings', () => {
    d.restoreUnitSettings();
    d.showMessage(['Default Unit Settings are restored.', 'Press any button to continue...']);
  }));
  set(m, 'right', 3, slot(`Pad Contact Quality\n${s.padContactQuality ? 'On' : 'Off'}`, () => {
    s.padContactQuality = !s.padContactQuality;
  }));
  set(m, 'left', 4, slot('Erase Patient\nCard', () =>
    d.showMessage(['Insert the Patient Data Card', 'to be erased.', 'Press any button to continue...'])));
  set(m, 'right', 4, slot(`Language\n${s.language}`, () => {}));
  set(m, 'left', 5, slot('Set Date\nand Time', () => d.push({ kind: 'dateTime' })));
  set(m, 'right', 5, slot('Display Unit\nVersion Info', () =>
    d.push({
      kind: 'text',
      title: 'Unit Version Information',
      lines: [
        `System Software:  ${SOFTWARE_VERSION}`,
        'Stim Board (Ch 1/2):  2.0',
        'Stim Board (Ch 3/4):  2.0',
        'Ultrasound Board:  Not Installed',
        'sEMG Module:  Not Installed',
        '',
        `Vectra Genisys Simulator ${__APP_VERSION__}`,
        'For training and exploration only.',
        'Not a medical device.',
      ],
      page: 0,
    })));
  return m;
}

function confirmScreen(d: Device, m: ScreenModel, r: Extract<Route, { kind: 'confirm' }>): ScreenModel {
  m.title = 'Confirm';
  m.blocks.push({ type: 'text', area: { rows: [1, 3], cols: [1, 2] }, tone: 'white', lines: r.text });
  set(m, 'left', 5, slot('Yes', r.onYes));
  set(m, 'right', 5, slot('No', () => d.goBack()));
  return m;
}

const CLOCK_FIELDS = ['month', 'day', 'year', 'hour', 'minute'] as const;

function dateTimeScreen(d: Device, m: ScreenModel): ScreenModel {
  const now = d.clock();
  m.title = `Set Date and Time  ${formatDate(now)}`;
  const values: Record<(typeof CLOCK_FIELDS)[number], string> = {
    month: String(now.getMonth() + 1).padStart(2, '0'),
    day: String(now.getDate()).padStart(2, '0'),
    year: String(now.getFullYear()),
    hour: String(now.getHours()).padStart(2, '0'),
    minute: String(now.getMinutes()).padStart(2, '0'),
  };
  CLOCK_FIELDS.forEach((field, i) => {
    const name = field[0].toUpperCase() + field.slice(1);
    set(m, 'left', i + 1, slot(`${name}  ${values[field]}`, () => d.adjustClock(field, -1), { icon: 'down', iconSide: 'left', repeat: true }));
    set(m, 'right', i + 1, slot(`${name}`, () => d.adjustClock(field, 1), { icon: 'up', iconSide: 'left', repeat: true }));
  });
  return m;
}

// ---------- Clinic Name keyboard ----------

export const KEYBOARD_ROWS = [' ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', '0123456789-.&'];

function clinicNameScreen(d: Device, m: ScreenModel, r: Extract<Route, { kind: 'clinicName' }>): ScreenModel {
  const shown = r.draft.slice(0, r.cursor) + '_' + r.draft.slice(r.cursor + 1);
  m.title = `Clinic Name: ${shown}`;
  m.blocks.push({
    type: 'keyboard',
    area: { rows: [1, 3], cols: [1, 2] },
    rows: KEYBOARD_ROWS,
    framed: r.framed,
    hint: 'Press the BACK button to cancel entry.',
  });
  const pickRow = (row: number) => () => {
    const len = KEYBOARD_ROWS[row].length;
    const col = r.framed && r.framed.row === row ? (r.framed.col + 1) % len : 0;
    d.replaceTop({ ...r, framed: { row, col } });
  };
  for (let row = 0; row < KEYBOARD_ROWS.length; row++) {
    set(m, 'left', row + 1, slot('', pickRow(row)));
    set(m, 'right', row + 1, slot('', pickRow(row)));
  }
  set(m, 'left', 4, slot('', () => d.replaceTop({ ...r, cursor: Math.max(0, r.cursor - 1) }), { icon: 'left' }));
  set(m, 'right', 4, slot('', () => {
    if (!r.framed) return;
    const ch = KEYBOARD_ROWS[r.framed.row][r.framed.col];
    const draft = (r.draft.slice(0, r.cursor) + ch + r.draft.slice(r.cursor + 1)).slice(0, 32);
    d.replaceTop({ ...r, draft, cursor: Math.min(draft.length, r.cursor + 1) });
  }, { icon: 'accept' }));
  set(m, 'left', 5, slot('Delete', () => {
    const at = r.cursor < r.draft.length ? r.cursor : r.cursor - 1;
    if (at < 0) return;
    d.replaceTop({ ...r, draft: r.draft.slice(0, at) + r.draft.slice(at + 1), cursor: at });
  }));
  set(m, 'right', 5, slot('Save', () => {
    d.settings.clinicName = r.draft.trim() || d.settings.clinicName;
    d.goBack();
  }));
  return m;
}

// ---------- Clinical Resources Library ----------

function libraryScreen(d: Device, m: ScreenModel): ScreenModel {
  m.title = 'Clinical Library';
  set(m, 'left', 1, slot('Clinical\nProtocols', () => d.push({ kind: 'protocolBody' })));
  set(m, 'right', 1, slot('User\nProtocols', () => d.showMessage(['No User Protocols.', 'Press any button to continue...'])));
  set(m, 'left', 2, slot('Sequencing', notSimulated(d, 'Sequencing')));
  set(m, 'right', 2, slot('MMC Graphical\nLibrary', () => d.showMessage(['No Multimedia Card inserted.', 'Press any button to continue...'])));
  return m;
}

const BODY_AREAS: [side: 'left' | 'right', row: number, label: string][] = [
  ['left', 1, 'Cervical'],
  ['right', 1, 'Shoulder'],
  ['left', 2, 'Lumbar'],
  ['right', 2, 'Thoracic'],
  ['left', 3, 'Elbow'],
  ['right', 3, 'Wrist /\nHand'],
  ['left', 4, 'Hip'],
  ['right', 4, 'Pelvic\nFloor'],
  ['left', 5, 'Ankle /\nFoot'],
  ['right', 5, 'Knee'],
];

function protocolBodyScreen(d: Device, m: ScreenModel): ScreenModel {
  m.title = 'Clinical Protocols';
  m.layout = 'narrow';
  m.blocks.push({ type: 'figure', area: { rows: [1, 5], cols: [1, 2] }, figure: 'body' });
  for (const [side, row, label] of BODY_AREAS) {
    set(m, side, row, slot(label, () => d.push({ kind: 'protocolList', area: label.replace(/\s*\n\s*/g, ' ') })));
  }
  return m;
}

const PROTOCOL_ESTIM: [side: 'left' | 'right', row: number, indication: string][] = [
  ['left', 1, 'Acute Pain'],
  ['right', 1, 'Chronic Pain'],
  ['left', 2, 'Increase Local Circulation'],
  ['right', 2, 'Relax Muscle Spasm'],
  ['left', 3, 'Prevent/Retard Disuse Atrophy'],
  ['right', 3, 'Muscle Re-education'],
];

function protocolListScreen(d: Device, m: ScreenModel, area: string): ScreenModel {
  m.title = `Clinical Protocols: ${area}`;
  m.blocks.push({ type: 'sectionLabel', row: 1, text: 'Electrotherapy' });
  m.blocks.push({ type: 'sectionLabel', row: 4, text: 'Ultrasound' });
  for (const [side, row, name] of PROTOCOL_ESTIM) {
    const ind = INDICATIONS.find((i) => i.label === name) as Indication;
    const source = `Protocol: ${area} - ${ind.label}`;
    const asksElectrodes = ind.waveform === 'ifc' || ind.waveform === 'premod';
    set(m, side, row, slot(ind.button, () =>
      asksElectrodes ? d.push({ kind: 'electrodeCount', indication: ind, source }) : d.loadIndication(ind, source)));
  }
  const us = noApplicator(d);
  set(m, 'left', 4, slot('Chronic\nPain', us));
  set(m, 'right', 4, slot('Sub-chronic\nPain', us));
  set(m, 'left', 5, slot('Scar Tissue /\nAdhesions', us));
  set(m, 'right', 5, slot('Joint Contract. w/\nAdhesive Capsulitis', us));
  return m;
}

// Clinical Protocols ask how many electrodes will be used: four runs 4-pole
// interferential, two runs premodulated on one channel.
function electrodeCountScreen(d: Device, m: ScreenModel, r: Extract<Route, { kind: 'electrodeCount' }>): ScreenModel {
  m.title = r.source.replace('Protocol: ', 'Clinical Protocols: ');
  m.blocks.push({ type: 'text', area: { rows: [1, 3], cols: [1, 2] }, tone: 'white', lines: ['Select the number of electrodes', 'to be used for this treatment.'] });
  const load = (waveform: WaveformId) => () => {
    d.stack.pop();
    d.loadIndication({ ...r.indication, waveform }, r.source);
  };
  set(m, 'left', 4, slot('2 Electrodes', load('premod')));
  set(m, 'right', 4, slot('4 Electrodes', load('ifc')));
  return m;
}

// ---------- Status panel ----------

/** Displayed intensity. While running, the unit shows what the channel is
 *  delivering, so it follows the ramp and drops to zero during the off time. */
export function intensityText(t: Treatment, i: number): string {
  const wf = getWaveform(t.waveform);
  const set = t.intensity[i] ?? 0;
  const v = t.status === 'running' ? set * channelOutput(t, i, t.elapsedMs / 1000).level : set;
  if (t.waveform === 'hvpc' && t.params.display === 'Peak Current') {
    // Estimated peak current (A) into a 500 ohm load.
    return (v / 500).toFixed(2);
  }
  return formatNumber(v, wf.intensityStep < 1 ? 0.1 : 1);
}

function waveformIcon(w: WaveformId): IconName {
  return w === 'vmsBurst' ? 'vms' : w;
}

function statusPanel(d: Device): StatusPanel {
  const active = d.activeTreatment;
  const rows = CHANNELS.map((ch): StatusRow => {
    const t = d.treatmentOn(ch);
    return {
      label: `Ch ${ch}:`,
      status: d.channelStatus(ch),
      intensity: t && t.status !== 'completed' ? intensityText(t, t.channels.indexOf(ch)) : '',
      icon: t && t.status !== 'completed' ? waveformIcon(t.waveform) : undefined,
      framed: ch === d.selectedChannel,
    };
  });
  rows.push({ label: 'US:', status: 'No Appl.', intensity: '', framed: false });
  let padContact: number[] = [];
  if (active && d.settings.padContactQuality) {
    const kind = getWaveform(active.waveform).padContact;
    const delivering = active.status === 'running' && active.intensity.some((v) => v > 0);
    if (kind === 'single') padContact = [delivering ? 0.85 : 0];
    if (kind === 'dual') padContact = [delivering ? 0.85 : 0, delivering ? 0.8 : 0];
  }
  return {
    rows,
    timer: active ? formatClock(active.remainingMs) : null,
    intensities: active ? active.channels.map((_, i) => intensityText(active, i)) : [],
    unit: active ? getWaveform(active.waveform).intensityLabel(active.params) : '',
    padContact,
  };
}

// ---------- formatting ----------

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  // Under a minute the unit drops the leading zero, e.g. ":20".
  return `${m > 0 ? m : ''}:${String(s).padStart(2, '0')}`;
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function contactLevel(t: Treatment): number {
  return t.status === 'running' && t.intensity[0] > 0 ? 0.8 : 0;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
