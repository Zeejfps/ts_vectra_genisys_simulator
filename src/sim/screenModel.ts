// View model for one LCD frame. The device builds it, the LCD renderer draws it.
// Slots are the ten on-screen buttons that line up with the physical soft keys:
// index 0 = left row 1, 1 = right row 1, 2 = left row 2, ... 9 = right row 5.

export type IconName =
  | 'ifc'
  | 'premod'
  | 'asym'
  | 'sym'
  | 'microcurrent'
  | 'vms'
  | 'vmsBurst'
  | 'vmsFr'
  | 'russian'
  | 'hvpc'
  | 'dc'
  | 'up'
  | 'down'
  | 'accept'
  | 'left';

export interface Slot {
  label: string;
  icon?: IconName;
  /** Icon placement relative to the label. */
  iconSide?: 'left' | 'right';
  /** Draw inverted (selected / being edited). */
  active?: boolean;
  /** Keep firing while the soft key is held down (arrow keys). */
  repeat?: boolean;
  onPress: () => void;
}

/** Rectangular region of the button grid, 1-based rows (1-5), columns 1-2. */
export interface Area {
  rows: [number, number];
  cols: [number, number];
}

export type Block =
  | { type: 'text'; area: Area; tone: 'green' | 'white'; lines: string[] }
  | { type: 'intensity'; area: Area; values: string[]; unit: string }
  | { type: 'valueEditor'; area: Area; label: string; value: string; range: string }
  | { type: 'placement'; area: Area; figure: string; caption: string }
  | { type: 'keyboard'; area: Area; rows: string[]; framed: { row: number; col: number } | null; hint: string }
  | { type: 'figure'; area: Area; figure: 'body' }
  | { type: 'contact'; area: Area; level: number }
  /** IFC interference pattern for the Vector Position editor, rotated by `degrees`. */
  | { type: 'vector'; area: Area; degrees: number }
  | { type: 'sectionLabel'; row: number; text: string };

export interface StatusRow {
  label: string;
  status: string;
  intensity: string;
  /** Waveform pictogram shown after the intensity while the channel is in use. */
  icon?: IconName;
  framed: boolean;
}

export interface StatusPanel {
  rows: StatusRow[];
  timer: string | null;
  intensities: string[];
  unit: string;
  /** Pad contact quality bars (0..1), empty when not shown. */
  padContact: number[];
}

export interface Message {
  lines: string[];
  tone: 'pink' | 'info';
}

export interface ScreenModel {
  kind: 'off' | 'boot' | 'saver' | 'screen';
  title: string;
  slots: (Slot | null)[];
  blocks: Block[];
  /** 'narrow' shrinks the side buttons to make room for a centre figure. */
  layout: 'standard' | 'narrow';
  status: StatusPanel | null;
  message: Message | null;
}

export const SLOT_COUNT = 10;

export function slotIndex(side: 'left' | 'right', row: number): number {
  return (row - 1) * 2 + (side === 'left' ? 0 : 1);
}

export function emptySlots(): (Slot | null)[] {
  return new Array<Slot | null>(SLOT_COUNT).fill(null);
}
