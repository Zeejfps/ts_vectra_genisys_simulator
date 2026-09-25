import './site.css';
import './styles.css';
import './design.css';
import './workspace.css';
import { initFeedback } from './feedback';
import { Device } from './sim/device';
import { initMenu } from './site';
import { WORKSPACE, initWorkspace } from './workspace';
import { Beeper } from './ui/audio';
import { DeviceView } from './ui/deviceView';
import { DeviceView3D } from './ui/deviceView3d';
import { Scope } from './ui/scope';
import type { UnitView } from './ui/unitView';
import { MAX_ZOOM, StageZoom, ZOOM_STEP } from './ui/zoom';

const SPEEDS = [1, 10, 60] as const;

const CLOCK_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>`;
const POWER_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v7" /><path d="M7.4 7.2a7 7 0 1 0 9.2 0" /></svg>`;
const ZOOM_OUT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" /></svg>`;
const ZOOM_IN_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" /><path d="M12 6v12" /></svg>`;
const INTERRUPT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z" /><path d="M12 7.5v5.5" /><path d="M12 16.5v.01" /></svg>`;

// Power, timer speed, zoom and the patient interrupt switch, each floating over a corner of the unit.
const UNIT_CONTROLS = `
  <div class="unit-controls" role="group" aria-label="Unit controls">
    <button class="power-switch" role="switch" aria-checked="false" aria-label="Power" title="Power (O)" data-action="power">
      ${POWER_ICON}<span class="track"><span class="thumb"></span></span>
    </button>
    <button class="tool speed" aria-label="Timer speed 1×" title="Timer speed: press to cycle 1×, 10×, 60×" data-action="speed">
      ${CLOCK_ICON}<span class="speed-value">1×</span>
    </button>
    <div class="zoom" role="group" aria-label="Zoom">
      <button class="zoom-out" aria-label="Zoom out" title="Zoom out (−)" data-action="zoom-out" disabled>${ZOOM_OUT_ICON}</button>
      <button class="zoom-level" aria-label="Reset zoom" title="Reset zoom. Pinch or drag to zoom and pan" data-action="zoom-reset" disabled>100%</button>
      <button class="zoom-in" aria-label="Zoom in" title="Zoom in (+)" data-action="zoom-in">${ZOOM_IN_ICON}</button>
    </div>
    <button class="tool interrupt" aria-label="Patient Interrupt Switch" title="Patient Interrupt Switch (I)" data-action="interrupt">
      ${INTERRUPT_ICON}
    </button>
  </div>`;

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <main class="stage" aria-label="Vectra Genisys unit"></main>
  ${WORKSPACE}`;

initMenu();
initWorkspace();

const device = new Device();
const beeper = new Beeper(() => device.settings.volume);
device.onBeep = (kind) => beeper.play(kind);

if (import.meta.env.DEV) Object.assign(window, { device });

// Offline support so the app works once installed. Skipped in dev, where the
// cache would serve stale modules.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

const stage = app.querySelector<HTMLElement>('.stage')!;
let view: UnitView;
let speed: (typeof SPEEDS)[number] = 1;

// Attached to issue reports so they say what the unit was showing.
initFeedback(() => {
  const { route, activeTreatment: t } = device;
  return {
    power: device.power,
    screen: route.kind === 'text' ? `text: ${route.title}` : route.kind,
    selectedChannel: device.selectedChannel,
    treatment: t && {
      waveform: t.waveform,
      status: t.status,
      channels: t.channels,
      intensity: t.intensity,
      params: t.params,
      protocol: t.protocol ?? t.source,
    },
    otherTreatments: device.treatments.size - (t ? 1 : 0),
    view: view instanceof DeviceView3D ? '3d' : 'flat',
    timerSpeed: speed,
    zoom: zoom.zoom,
  };
});

try {
  view = new DeviceView3D(stage, device);
} catch (err) {
  // No WebGL: fall back to the flat artwork.
  console.warn('3D view unavailable, using the flat view', err);
  stage.replaceChildren();
  view = new DeviceView(stage, device);
}
stage.insertAdjacentHTML('beforeend', UNIT_CONTROLS);
const scope = new Scope(app.querySelector('.scope')!, device);

let dirty = true;
device.onChange = () => {
  dirty = true;
};

// ---------- panel controls ----------

const powerBtn = stage.querySelector<HTMLButtonElement>('[data-action="power"]')!;
powerBtn.addEventListener('click', () => device.togglePower());
stage.querySelector('[data-action="interrupt"]')!.addEventListener('click', () => device.patientInterrupt());

const speedBtn = stage.querySelector<HTMLButtonElement>('[data-action="speed"]')!;
speedBtn.addEventListener('click', () => {
  speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
  speedBtn.querySelector('.speed-value')!.textContent = `${speed}×`;
  speedBtn.setAttribute('aria-label', `Timer speed ${speed}×`);
  speedBtn.classList.toggle('fast', speed !== 1);
});

const zoomOutBtn = stage.querySelector<HTMLButtonElement>('[data-action="zoom-out"]')!;
const zoomInBtn = stage.querySelector<HTMLButtonElement>('[data-action="zoom-in"]')!;
const zoomLevel = stage.querySelector<HTMLButtonElement>('[data-action="zoom-reset"]')!;
const zoom = new StageZoom(stage, view, (level) => {
  zoomLevel.textContent = `${Math.round(level * 100)}%`;
  zoomLevel.disabled = zoomOutBtn.disabled = level === 1;
  zoomInBtn.disabled = level >= MAX_ZOOM;
});
zoomInBtn.addEventListener('click', () => zoom.zoomBy(ZOOM_STEP));
zoomOutBtn.addEventListener('click', () => zoom.zoomBy(1 / ZOOM_STEP));
zoomLevel.addEventListener('click', () => zoom.reset());

function syncPanel(): void {
  powerBtn.setAttribute('aria-checked', String(device.power !== 'off'));
}

// ---------- keyboard ----------

const SOFT_KEY_MAP: Record<string, number> = {
  '1': 0, '2': 2, '3': 4, '4': 6, '5': 8,
  '6': 1, '7': 3, '8': 5, '9': 7, '0': 9,
};

const heldSoftKeys = new Set<string>();

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target as HTMLElement;
  if (target.closest('input, textarea, select')) return;
  const key = e.key.toLowerCase();

  if (key in SOFT_KEY_MAP) {
    if (!heldSoftKeys.has(key)) {
      heldSoftKeys.add(key);
      view.softKeyDown(SOFT_KEY_MAP[key]);
    }
    e.preventDefault();
    return;
  }
  if (e.repeat && !['arrowup', 'arrowdown', 'arrowright', 'arrowleft'].includes(key)) return;
  const actions: Record<string, () => void> = {
    arrowup: () => knob(1),
    arrowright: () => knob(1),
    arrowdown: () => knob(-1),
    arrowleft: () => knob(-1),
    s: () => view.pressHardware('start'),
    p: () => view.pressHardware('pause'),
    x: () => view.pressHardware('stop'),
    h: () => view.pressHardware('home'),
    b: () => view.pressHardware('back'),
    l: () => view.pressHardware('library'),
    u: () => {
      view.pressHardware('home');
      view.pressHardware('back');
    },
    i: () => device.patientInterrupt(),
    o: () => device.togglePower(),
    '+': () => zoom.zoomBy(ZOOM_STEP),
    '=': () => zoom.zoomBy(ZOOM_STEP),
    '-': () => zoom.zoomBy(1 / ZOOM_STEP),
  };
  const action = actions[key];
  if (action) {
    e.preventDefault();
    action();
  }
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (heldSoftKeys.delete(key)) view.softKeyUp();
});

function knob(detents: number): void {
  view.nudgeKnob(detents);
  device.turnKnob(detents);
}

// ---------- main loop ----------

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(250, now - last);
  last = now;
  device.tick(dt, speed);
  if (dirty) {
    dirty = false;
    view.render();
    syncPanel();
  }
  view.frame(now);
  scope.update();
  requestAnimationFrame(frame);
}
view.render();
syncPanel();
requestAnimationFrame(frame);
