import type { IconName } from '../sim/screenModel';

// Small line-art glyphs drawn on the LCD buttons, modelled on the waveform
// pictograms of the Electrotherapy screen.

const stroke = 'fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"';

const WAVE_ICONS: Record<string, string> = {
  ifc: `<path ${stroke} d="M2 3 L22 15 M2 15 L22 3"/><circle cx="2" cy="3" r="1.6" fill="currentColor"/><circle cx="22" cy="3" r="1.6" fill="currentColor"/><circle cx="2" cy="15" r="1.6" fill="currentColor"/><circle cx="22" cy="15" r="1.6" fill="currentColor"/>`,
  premod: `<path ${stroke} d="M1 9 C3 1,5 1,6 9 C7 17,9 17,10 9 C11 1,13 1,14 9 C15 17,17 17,18 9 C19 1,21 1,23 9"/><path ${stroke} d="M1 3 L1 15 M23 3 L23 15"/>`,
  asym: `<path ${stroke} d="M1 12 L5 12 L5 3 L9 3 L9 14 C12 13,16 12,23 12"/>`,
  sym: `<path ${stroke} d="M1 9 L6 9 L6 2 L11 2 L11 16 L16 16 L16 9 L23 9"/>`,
  microcurrent: `<path ${stroke} d="M1 12 L1 7 L4 7 L4 12 L7 12 L7 7 L10 7 L10 12 L13 12 L13 7 L16 7 L16 12 L19 12 L19 7 L22 7 L22 12"/>`,
  vms: `<path ${stroke} d="M2 5 L4 5 L4 1 L6 1 L6 5 L8 5 L8 9 L6 9 M10 5 L22 5"/><path ${stroke} d="M2 14 L4 11 L6 16 L8 11 L10 16 L12 11 L14 16 L16 11 L18 16 L20 14 L22 14"/>`,
  russian: `<path ${stroke} d="M2 2 L2 16 M4 2 L4 16 M6 2 L6 16 M8 2 L8 16 M14 2 L14 16 M16 2 L16 16 M18 2 L18 16 M20 2 L20 16"/>`,
  hvpc: `<path ${stroke} d="M1 16 L4 16 L6 2 L8 16 L10 3 L12 16 L23 16"/>`,
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

// Hardware button glyphs.
export const HOME_GLYPH = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3 L22 12 L19 12 L19 21 L14 21 L14 15 L10 15 L10 21 L5 21 L5 12 L2 12 Z"/></svg>`;
export const BACK_GLYPH = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2 12 L10 6 L10 10 L22 10 L22 14 L10 14 L10 18 Z"/></svg>`;
export const LIBRARY_GLYPH = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 6 L9 6 L11 8 L20 8 L20 10 L7 10 L4 19 L3 19 Z M8 11 L23 11 L19 20 L4.5 20 Z"/></svg>`;
