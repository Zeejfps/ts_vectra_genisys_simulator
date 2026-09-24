import './styles.css';
import { Device } from './sim/device';
import { Beeper } from './ui/audio';
import { DeviceView } from './ui/deviceView';
import { Scope } from './ui/scope';

const SPEEDS = [1, 10, 60] as const;

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <main class="stage" aria-label="Vectra Genisys unit"></main>
  <aside class="panel">
    <header class="panel-head">
      <h1>Vectra Genisys Simulator <span class="version">${__APP_VERSION__}</span></h1>
      <p>Interactive replica of the Vectra Genisys electrotherapy interface. Unofficial, for training and exploration only. Not a medical device.</p>
    </header>

    <section class="panel-card">
      <h2>Unit</h2>
      <div class="row">
        <button class="ctl power" data-action="power"><span class="dot"></span><span class="label">Power On</span></button>
        <button class="ctl" data-action="interrupt" title="Patient Interrupt Switch (I)">Patient Interrupt Switch</button>
      </div>
      <div class="row">
        <span class="row-label">Timer speed</span>
        <div class="seg" role="radiogroup" aria-label="Timer speed">
          ${SPEEDS.map((s) => `<button role="radio" data-speed="${s}" aria-checked="${s === 1}">${s}×</button>`).join('')}
        </div>
      </div>
    </section>

    <section class="panel-card scope"></section>

    <section class="panel-card">
      <details>
        <summary><h2>How to use</h2></summary>
        <ol class="guide">
          <li>Turn the unit on with <b>Power On</b> (the real switch is on the back panel).</li>
          <li>Press <b>Electrotherapy</b>, then a waveform. Setup channels show in the yellow status area.</li>
          <li><b>Edit</b> changes parameters. Pressing a setting cycles its options. Number settings open an editor that uses the arrow keys.</li>
          <li>Turn the <b>intensity knob</b> by dragging it, scrolling over it, or using the ↑/↓ keys.</li>
          <li><b>Start</b>, <b>Pause</b> and <b>Stop</b> control the framed channel. <b>Select Channel</b> on Home moves the frame.</li>
          <li>Press <b>Home</b> and <b>Back</b> together to open Operator Utilities.</li>
        </ol>
      </details>
      <details>
        <summary><h2>Keyboard</h2></summary>
        <dl class="keys">
          <dt>1–5</dt><dd>Left soft keys</dd>
          <dt>6–0</dt><dd>Right soft keys</dd>
          <dt>↑ / ↓</dt><dd>Intensity knob</dd>
          <dt>S · P · X</dt><dd>Start · Pause · Stop</dd>
          <dt>H · B · L</dt><dd>Home · Back · Library</dd>
          <dt>U</dt><dd>Operator Utilities (Home + Back)</dd>
          <dt>I</dt><dd>Patient Interrupt Switch</dd>
          <dt>O</dt><dd>Power</dd>
        </dl>
      </details>
    </section>
  </aside>`;

const device = new Device();
const beeper = new Beeper(() => device.settings.volume);
device.onBeep = (kind) => beeper.play(kind);

if (import.meta.env.DEV) Object.assign(window, { device });

const view = new DeviceView(app.querySelector('.stage')!, device);
const scope = new Scope(app.querySelector('.scope')!, device);

let speed = 1;
let dirty = true;
device.onChange = () => {
  dirty = true;
};

// ---------- panel controls ----------

const powerBtn = app.querySelector<HTMLButtonElement>('[data-action="power"]')!;
powerBtn.addEventListener('click', () => device.togglePower());
app.querySelector('[data-action="interrupt"]')!.addEventListener('click', () => device.patientInterrupt());
for (const btn of app.querySelectorAll<HTMLButtonElement>('[data-speed]')) {
  btn.addEventListener('click', () => {
    speed = Number(btn.dataset.speed);
    for (const b of app.querySelectorAll('[data-speed]')) b.setAttribute('aria-checked', String(b === btn));
  });
}

function syncPanel(): void {
  const on = device.power !== 'off';
  powerBtn.classList.toggle('on', on);
  powerBtn.querySelector('.label')!.textContent = on ? 'Power Off' : 'Power On';
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
    s: () => device.pressStart(),
    p: () => device.pressPause(),
    x: () => device.pressStop(),
    h: () => device.pressHome(),
    b: () => device.pressBack(),
    l: () => device.pressLibrary(),
    u: () => {
      device.pressHome();
      device.pressBack();
    },
    i: () => device.patientInterrupt(),
    o: () => device.togglePower(),
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
  scope.update();
  requestAnimationFrame(frame);
}
view.render();
syncPanel();
requestAnimationFrame(frame);
