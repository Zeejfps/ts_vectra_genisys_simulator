import type { IconName } from '../sim/screenModel';

// Small line-art glyphs drawn on the LCD buttons, modelled on the waveform
// pictograms of the Electrotherapy screen.

const stroke = 'fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"';

const WAVE_ICONS: Record<string, string> = {
  ifc: `<path ${stroke} d="M3.5 3.5 L20.5 14.5 M3.5 14.5 L20.5 3.5"/><circle ${stroke} cx="2.5" cy="2.5" r="1.5"/><circle ${stroke} cx="21.5" cy="2.5" r="1.5"/><circle ${stroke} cx="2.5" cy="15.5" r="1.5"/><circle ${stroke} cx="21.5" cy="15.5" r="1.5"/>`,
  premod: `<path ${stroke} d="M1 9 C3 1,9 1,11 9 C9 17,3 17,1 9 Z M13 9 C15 1,21 1,23 9 C21 17,15 17,13 9 Z M4 5 L4 13 M6 3.5 L6 14.5 M8 5 L8 13 M16 5 L16 13 M18 3.5 L18 14.5 M20 5 L20 13"/>`,
  asym: `<path ${stroke} d="M1 8 L5 8 L5 2 L9 2 L9 16 C10 11,13 9,23 8.5"/>`,
  sym: `<path ${stroke} d="M1 9 L6 9 L6 2 L11 2 L11 16 L16 16 L16 9 L23 9"/>`,
  microcurrent: `<path ${stroke} d="M1 9 L2 9 L2 5 L5 5 L5 9 L6 9 L6 5 L9 5 L9 9 L13 9 L13 13 L16 13 L16 9 L17 9 L17 13 L20 13 L20 9 L23 9"/>`,
  vms: `<path ${stroke} d="M2 5 L6 5 L6 1 L8 1 L8 8 L10 8 L10 5 L22 5"/><path ${stroke} d="M2 14 L4 14 L4 11 L6 11 L6 17 L8 17 L8 11 L10 11 L10 17 L12 17 L12 11 L14 11 L14 17 L16 17 L16 14 L22 14"/>`,
  russian: `<path ${stroke} d="M1 9 L23 9 M3 2 L3 16 M5 2 L5 16 M7 2 L7 16 M9 2 L9 16 M15 2 L15 16 M17 2 L17 16 M19 2 L19 16 M21 2 L21 16"/>`,
  hvpc: `<path ${stroke} d="M1 16 L3 16 L4 2 C5 10,6 13,8 14 L9 2 C10 10,12 15,15 16 L23 16"/>`,
  dc: `<path ${stroke} d="M1 4 L23 4"/><path ${stroke} stroke-dasharray="1.5 2" d="M1 12 L23 12"/>`,
};

const ARROW_ICONS: Record<string, string> = {
  up: `<path fill="currentColor" d="M12 2 L20 11 L15 11 L15 20 L9 20 L9 11 L4 11 Z"/>`,
  down: `<path fill="currentColor" d="M12 22 L20 13 L15 13 L15 4 L9 4 L9 13 L4 13 Z"/>`,
  left: `<path fill="currentColor" d="M2 12 L11 4 L11 9 L22 9 L22 15 L11 15 L11 20 Z"/>`,
  accept: `<path fill="currentColor" d="M20 3 L20 14 L9 14 L9 19 L2 12 L9 5 L9 10 L16 10 L16 3 Z"/>`,
};

export function iconSvg(name: IconName): string {
  if (name in ARROW_ICONS) {
    return `<svg class="icon icon-arrow" viewBox="0 0 24 24" aria-hidden="true">${ARROW_ICONS[name]}</svg>`;
  }
  return `<svg class="icon icon-wave" viewBox="0 0 24 18" aria-hidden="true">${WAVE_ICONS[name]}</svg>`;
}

// The status rows use compact glyphs: VMS shows a single biphasic pulse and
// Russian two pairs of bars, rather than the fuller pictograms of the menu buttons.
const STATUS_ICONS: Partial<Record<string, string>> = {
  vms: `<path ${stroke} d="M1 9 L6 9 L6 2 L11 2 L11 16 L16 16 L16 9 L23 9"/>`,
  russian: `<path ${stroke} d="M4 2 L4 16 M8 2 L8 16 M16 2 L16 16 M20 2 L20 16"/>`,
};

export function statusIconSvg(name: IconName): string {
  return `<svg class="icon icon-status" viewBox="0 0 24 18" aria-hidden="true">${STATUS_ICONS[name] ?? WAVE_ICONS[name]}</svg>`;
}

// Hardware button glyphs.
export const HOME_GLYPH = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3 L22 12 L19 12 L19 21 L14 21 L14 15 L10 15 L10 21 L5 21 L5 12 L2 12 Z"/></svg>`;
export const BACK_GLYPH = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M1 12 L23 5.5 L23 8.3 L7.5 12 L23 15.7 L23 18.5 Z M11 12 L23 9.5 L23 14.5 Z"/></svg>`;
export const LIBRARY_GLYPH = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 6 L9 6 L11 8 L20 8 L20 10 L7 10 L4 19 L3 19 Z M8 11 L23 11 L19 20 L4.5 20 Z"/></svg>`;
