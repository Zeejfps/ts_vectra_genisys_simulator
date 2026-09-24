// Simple anatomical sketches for the Electrode Placement and Clinical Protocols screens.
// Placeholders for the photographs used on the real unit.

const SKIN = '#e9b999';
const SKIN_SHADE = '#c98f6d';
const SHORTS = '#2b2b2b';

function electrode(x: number, y: number, channel: 1 | 2, label: string): string {
  const ring = channel === 1 ? '#111' : '#8a8a8a';
  return `<circle cx="${x}" cy="${y}" r="9" fill="#fafafa" stroke="${ring}" stroke-width="3"/>
    <text x="${x}" y="${y - 14}" text-anchor="middle" font-size="13" font-weight="700" fill="#111">${label}</text>`;
}

function backTorso(): string {
  return `
    <rect width="240" height="200" fill="#f4f4f4"/>
    <path d="M40 0 C60 20,62 60,64 100 L60 150 L180 150 L176 100 C178 60,180 20,200 0 Z" fill="${SKIN}"/>
    <path d="M120 10 L120 140" stroke="${SKIN_SHADE}" stroke-width="2"/>
    <path d="M60 140 L180 140 L192 200 L48 200 Z" fill="${SHORTS}"/>`;
}

const FIGURES: Record<string, string> = {
  lowBack4: `${backTorso()}
    ${electrode(92, 72, 1, '1')}${electrode(148, 72, 2, '2')}
    ${electrode(92, 120, 2, '2')}${electrode(148, 120, 1, '1')}
    <path d="M92 72 L148 120 M148 72 L92 120" stroke="#1d5fa8" stroke-width="1.5" stroke-dasharray="4 3"/>`,
  lowBack2: `${backTorso()}
    ${electrode(96, 96, 1, '1')}${electrode(144, 96, 1, '1')}`,
  quad2: `
    <rect width="240" height="200" fill="#f4f4f4"/>
    <path d="M70 0 L170 0 C172 60,160 130,150 200 L96 200 C86 130,68 60,70 0 Z" fill="${SKIN}"/>
    <path d="M70 0 L170 0 L168 26 L72 26 Z" fill="${SHORTS}"/>
    <ellipse cx="124" cy="182" rx="18" ry="12" fill="${SKIN_SHADE}" opacity="0.5"/>
    ${electrode(118, 62, 1, '1')}${electrode(128, 140, 1, '1')}`,
  shoulder2: `
    <rect width="240" height="200" fill="#f4f4f4"/>
    <path d="M0 200 L0 90 C30 70,80 60,110 62 C150 60,180 80,190 120 L200 200 Z" fill="${SKIN}"/>
    <path d="M110 62 C112 40,112 20,108 0 L150 0 C146 20,146 40,150 66" fill="${SKIN}"/>
    ${electrode(150, 98, 1, '1')}${electrode(172, 150, 1, '1')}`,
};

export function placementSvg(figure: string): string {
  return `<svg viewBox="0 0 240 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${FIGURES[figure] ?? FIGURES.lowBack2}</svg>`;
}

export function bodySvg(): string {
  const muscle = '#c0392b';
  const dark = '#8e2418';
  return `<svg viewBox="0 0 100 220" aria-hidden="true">
    <rect width="100" height="220" fill="#f7f7f7"/>
    <circle cx="50" cy="20" r="12" fill="${muscle}"/>
    <path d="M44 31 L56 31 L57 38 L43 38 Z" fill="${dark}"/>
    <path d="M28 40 C36 36,64 36,72 40 L70 96 L30 96 Z" fill="${muscle}"/>
    <path d="M50 42 L50 94 M36 60 L64 60 M37 74 L63 74" stroke="${dark}" stroke-width="1.2"/>
    <path d="M28 40 C20 44,18 60,16 76 L12 118 L18 119 L25 80 L30 58 Z" fill="${muscle}"/>
    <path d="M72 40 C80 44,82 60,84 76 L88 118 L82 119 L75 80 L70 58 Z" fill="${muscle}"/>
    <path d="M30 96 L70 96 L68 112 L32 112 Z" fill="${dark}"/>
    <path d="M32 112 L49 112 L47 160 L44 208 L36 208 L34 160 Z" fill="${muscle}"/>
    <path d="M51 112 L68 112 L66 160 L64 208 L56 208 L53 160 Z" fill="${muscle}"/>
    <path d="M40 130 L42 156 M60 130 L58 156" stroke="${dark}" stroke-width="1.2"/>
  </svg>`;
}
