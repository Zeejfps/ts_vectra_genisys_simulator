// Static artwork for the unit's faceplate, drawn as SVG on the 720 x 1160 device
// canvas. Geometry was traced from a front photo of a Vectra Genisys scaled so
// its LCD lands on the simulator's 330 x 440 LCD at (195, 155).

export const DEVICE_W = 720;
export const DEVICE_H = 1160;

export const LCD_X = 195;
export const LCD_Y = 155;

/** Soft key row centres (match the LCD button rows). */
export const ROW_Y = [206, 270, 334, 398, 462];

export const KNOB = { cx: 497, cy: 978, r: 88 };

/** STOP / PAUSE / START keys: centre and tilt, traced from a photo of the unit. */
export const THERAPY_KEYS = {
  stop: { cx: 191, cy: 850, rot: 14 },
  pause: { cx: 214, cy: 950, rot: 4 },
  start: { cx: 269, cy: 1046, rot: -8 },
} as const;
export const THERAPY_KEY_SIZE = { w: 124, h: 42 };

// Silver bezel: slightly domed top, sides that flare out towards the bottom and a
// wide rounded base carrying the Home / Back / Library keys.
const BEZEL = `M124 80 Q125 38 170 34 Q360 8 550 34 Q595 38 596 80 L603 233
  Q612 480 628 650 Q640 760 596 792 Q505 828 360 830 Q215 828 124 792
  Q80 760 92 650 Q108 480 117 233 Z`;

// Raised, lighter surround that frames the LCD.
const SURROUND = `M180 132 Q368 116 556 132 Q566 133 566 146 L566 595 Q566 628 530 634
  Q368 648 206 634 Q170 628 170 595 L170 146 Q170 133 180 132 Z`;

// Shallow recess each STOP / PAUSE / START key sits in. It is a little larger than
// the key and runs further out to the left, like a shadow.
function well({ cx, cy, rot }: { cx: number; cy: number; rot: number }): string {
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})">
    <path class="well" d="M-92 4 C-92 -18 -70 -29 -36 -29 H34 C58 -29 70 -16 70 0 C70 18 56 30 30 30 H-40 C-72 30 -92 22 -92 4 Z"/>
  </g>`;
}

// Fine radial ticks on the dark ring around the knob.
function knobTicks(cx: number, cy: number, rIn: number, rOut: number, count: number): string {
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    d += `M${(cx + rIn * c).toFixed(1)} ${(cy + rIn * s).toFixed(1)}L${(cx + rOut * c).toFixed(1)} ${(cy + rOut * s).toFixed(1)}`;
  }
  return d;
}

export const HOUSING_SVG = `
<svg class="housing" viewBox="0 0 ${DEVICE_W} ${DEVICE_H}" aria-hidden="true">
  <defs>
    <linearGradient id="g-upper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6f8fa"/><stop offset="1" stop-color="#d8dee4"/>
    </linearGradient>
    <linearGradient id="g-lower" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6d839b"/><stop offset="0.5" stop-color="#566c84"/><stop offset="1" stop-color="#3f5268"/>
    </linearGradient>
    <linearGradient id="g-bezel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d9dde2"/><stop offset="0.45" stop-color="#c3c8ce"/><stop offset="1" stop-color="#aab1b8"/>
    </linearGradient>
    <linearGradient id="g-surround" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e3e6ea"/><stop offset="1" stop-color="#cfd4d9"/>
    </linearGradient>
    <radialGradient id="g-knob-ring" cx="0.5" cy="0.45" r="0.6">
      <stop offset="0.7" stop-color="#2c3a4c"/><stop offset="1" stop-color="#445872"/>
    </radialGradient>
    <linearGradient id="g-softkey" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eef1f3"/><stop offset="0.45" stop-color="#c9cfd5"/><stop offset="1" stop-color="#9ea6ae"/>
    </linearGradient>
    <linearGradient id="g-softkey-down" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#aab2ba"/><stop offset="1" stop-color="#cdd3d8"/>
    </linearGradient>
    <linearGradient id="g-hwkey" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7d9aba"/><stop offset="1" stop-color="#4c6a8c"/>
    </linearGradient>
    <linearGradient id="g-pill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#e3e8ed"/><stop offset="1" stop-color="#c3ccd5"/>
    </linearGradient>
    <linearGradient id="g-well" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#34465c"/><stop offset="1" stop-color="#4a5f78"/>
    </linearGradient>
    <filter id="f-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#1a2533" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- upper (light) and lower (blue) housing -->
  <path d="M40 0 H680 Q720 0 720 40 V720 H0 V40 Q0 0 40 0 Z" fill="url(#g-upper)"/>
  <path d="M0 688 H720 V1120 Q720 1160 680 1160 H40 Q0 1160 0 1120 Z" fill="url(#g-lower)"/>
  <path d="M0 688 H720" stroke="#8ea0b4" stroke-width="2"/>

  <!-- bezel -->
  <path d="${BEZEL}" fill="url(#g-bezel)" stroke="#9da4ab" stroke-width="1.5" filter="url(#f-shadow)"/>
  <path d="${SURROUND}" fill="url(#g-surround)" stroke="#f5f7f9" stroke-width="1.5"/>
  <rect x="${LCD_X - 4}" y="${LCD_Y - 4}" width="338" height="448" rx="4" fill="#7f8891"/>

  <!-- soft key index marks -->
  <g stroke="#3f4650" stroke-width="2.2" stroke-linecap="round">
    ${ROW_Y.map((y) => `<path d="M${LCD_X - 50} ${y + 1} L${LCD_X - 40} ${y}"/><path d="M${LCD_X + 370} ${y + 1} L${LCD_X + 380} ${y}"/>`).join('')}
  </g>

  <!-- key wells and symbols -->
  ${well(THERAPY_KEYS.stop)}
  ${well(THERAPY_KEYS.pause)}
  ${well(THERAPY_KEYS.start)}
  <g class="sym" fill="none" stroke="#c9d3de" stroke-width="1.6">
    <circle cx="91" cy="780" r="10"/><path d="M85 776 H97 L91 786 Z"/>
    <circle cx="104" cy="921" r="10"/><path d="M98 918 L104 925 L110 918"/>
    <rect x="153" y="1038" width="16" height="16" transform="rotate(45 161 1046)"/><path d="M158 1042 L165 1046 L158 1050 Z"/>
  </g>

  <!-- knob: faint raised collar arc, then a dark ring with fine ticks -->
  <path d="M${KNOB.cx - 118} ${KNOB.cy - 30} A122 122 0 0 1 ${KNOB.cx + 60} ${KNOB.cy - 106}" fill="none" stroke="#8ea3ba" stroke-width="2" opacity="0.6"/>
  <circle cx="${KNOB.cx}" cy="${KNOB.cy}" r="110" fill="url(#g-knob-ring)"/>
  <path d="${knobTicks(KNOB.cx, KNOB.cy, 97, 108, 120)}" stroke="#5c6f86" stroke-width="1"/>
  <circle cx="${KNOB.cx}" cy="${KNOB.cy}" r="95" fill="#1f2b3a"/>
</svg>`;

// ---------- key artwork (drawn inside each interactive element) ----------

/**
 * Soft key: a half ellipse, rounded on the outside and cut off flat where it
 * disappears under the bezel, with a groove running to the cut edge.
 * Drawn for the left column; the right column is mirrored.
 */
export function softKeySvg(side: 'left' | 'right'): string {
  const flip = side === 'right' ? ' transform="translate(92 0) scale(-1 1)"' : '';
  return `<svg viewBox="0 0 92 50" aria-hidden="true"><g${flip}>
    <path class="sk-rim" d="M92 6 A90 21 0 0 0 92 48 Z"/>
    <path class="sk-body" d="M92 2 A90 21 0 0 0 92 44 Z"/>
    <path class="sk-shine" d="M18 11 Q54 3.5 90 4" fill="none"/>
    <path class="sk-groove" d="M30 23 H92" fill="none"/>
  </g></svg>`;
}

/** Bezel edge x at a given y on the left side (right side mirrors around x = 360). */
export function bezelEdgeX(y: number): number {
  // Traced from the bezel outline between rows 1 and 5.
  return 118 - (y - 206) * 0.035;
}

/** Size a 24x24 glyph for use inside the key artwork. */
function sized(glyph: string, size: number): string {
  return glyph.replace('<svg ', `<svg width="${size}" height="${size}" `);
}

// Home / Back: flat top, round outer end, and a lower edge that sweeps up to a
// rounded point at the inner top corner (towards the LED). Drawn for Home;
// Back is mirrored. Keys sit in a recessed channel in the silver bezel.
const HOME_SHAPE = 'M30 10 L124 9 Q136 10 132 20 C120 36 90 55 52 54 C18 53 9 42 10 30 C11 17 18 10 30 10 Z';
// Library: long flat-topped pill with tapered ends.
const LENS_SHAPE = 'M34 7 H144 C160 7 170 17 175 25 C170 33 160 43 144 43 H34 C18 43 8 33 3 25 C8 17 18 7 34 7 Z';

function recessedKey(shape: string): string {
  return `<path class="hk-recess-hi" d="${shape}" transform="translate(0 2)"/>
    <path class="hk-recess" d="${shape}"/>
    <path class="hk-body" d="${shape}"/>`;
}

/** Home / Back key; `mirror` flips it for the Back key. */
export function leafKeySvg(mirror: boolean, glyph: string): string {
  const flip = mirror ? ' transform="translate(142 0) scale(-1 1)"' : '';
  return `<svg class="key-art" viewBox="0 0 142 64" aria-hidden="true">
    <g${flip}>${recessedKey(HOME_SHAPE)}</g>
    <g class="hk-glyph" transform="translate(${mirror ? 64 : 54} 21)">${sized(glyph, 22)}</g>
  </svg>`;
}

/** Clinical Resources Library key. */
export function lensKeySvg(glyph: string): string {
  return `<svg class="key-art" viewBox="0 0 178 50" aria-hidden="true">
    ${recessedKey(LENS_SHAPE)}
    <g class="hk-glyph" transform="translate(78 14)">${sized(glyph, 22)}</g>
  </svg>`;
}

/** Pill-shaped STOP / PAUSE / START key. */
export function pillKeySvg(label: string): string {
  return `<svg class="key-art" viewBox="0 0 124 42" aria-hidden="true">
    <path class="tk-body" d="M4 21 C4 8 20 3 40 3 H86 C106 3 120 9 120 21 C120 33 106 39 86 39 H40 C20 39 4 34 4 21 Z"/>
    <path class="tk-shine" d="M22 10 Q62 4 102 10" fill="none"/>
    <text x="62" y="25.5" text-anchor="middle">${label}</text>
  </svg>`;
}
