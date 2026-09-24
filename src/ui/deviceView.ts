import type { Device } from '../sim/device';
import {
  DEVICE_H,
  DEVICE_W,
  HOUSING_SVG,
  KNOB,
  LCD_X,
  LCD_Y,
  ROW_Y,
  THERAPY_KEYS,
  THERAPY_KEY_SIZE,
  bezelEdgeX,
  leafKeySvg,
  lensKeySvg,
  pillKeySvg,
  softKeySvg,
} from './housing';
import { BACK_GLYPH, HOME_GLYPH, LIBRARY_GLYPH } from './icons';
import { renderLcd } from './lcd';

// The physical unit: housing, soft keys, hardware buttons and intensity knob.
// Everything is laid out on a fixed canvas (see housing.ts) and scaled to fit.

/** Knob rotation (degrees) per detent. */
const DEGREES_PER_DETENT = 12;

const place = (cx: number, cy: number, w: number, h: number, rot = 0) =>
  `left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;${rot ? `rotate:${rot}deg;` : ''}`;

function therapyKey(key: keyof typeof THERAPY_KEYS, label: string, title: string): string {
  const { cx, cy, rot } = THERAPY_KEYS[key];
  const { w, h } = THERAPY_KEY_SIZE;
  return `<button class="tb" data-hw="${key}" style="${place(cx, cy, w, h, rot)}" title="${title}">${pillKeySvg(label)}</button>`;
}

const TEMPLATE = `
  ${HOUSING_SVG}
  <div class="bezel-logo" style="${place(360, 72, 260, 34)}"><span class="logo-mark"></span><span class="logo-text">chattanooga</span></div>
  <div class="lcd" data-kind="off" style="left:${LCD_X}px;top:${LCD_Y}px"></div>
  <div class="bezel-brand" style="${place(360, 668, 200, 44)}">Vectra<sup>®</sup><br><span>GEN<i>I</i>SYS</span></div>
  <div class="power-led" style="${place(360, 742, 16, 4)}" title="Unit on indicator"></div>
  <div class="softkeys"></div>
  <button class="hw" data-hw="home" style="${place(214, 733, 142, 64)}" aria-label="Home" title="Home (H)">${leafKeySvg(false, HOME_GLYPH)}</button>
  <button class="hw" data-hw="back" style="${place(506, 733, 142, 64)}" aria-label="Back" title="Back (B)">${leafKeySvg(true, BACK_GLYPH)}</button>
  <button class="hw" data-hw="library" style="${place(360, 786, 178, 50)}" aria-label="Clinical Resources Library" title="Clinical Resources Library (L)">${lensKeySvg(LIBRARY_GLYPH)}</button>
  ${therapyKey('stop', 'STOP', 'Stop (X)')}
  ${therapyKey('pause', 'PAUSE', 'Pause (P)')}
  ${therapyKey('start', 'START', 'Start (S)')}
  <div class="knob" style="${place(KNOB.cx, KNOB.cy, KNOB.r * 2, KNOB.r * 2)}" role="slider" tabindex="0" aria-label="Intensity knob" title="Intensity: drag, scroll, or use the arrow keys">
    <div class="knob-grip"></div>
  </div>
`;

export class DeviceView {
  readonly root: HTMLElement;
  private readonly lcd: HTMLElement;
  private readonly knob: HTMLElement;
  private readonly led: HTMLElement;
  private knobAngle = 0;
  private pressedSlot: number | null = null;
  private repeatTimer: number | undefined;

  constructor(
    private readonly host: HTMLElement,
    private readonly device: Device,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'device';
    this.root.innerHTML = TEMPLATE;
    host.appendChild(this.root);

    this.lcd = this.root.querySelector('.lcd')!;
    this.knob = this.root.querySelector('.knob')!;
    this.led = this.root.querySelector('.power-led')!;

    this.buildSoftKeys();
    this.bindHardware();
    this.bindKnob();
    new ResizeObserver(() => this.fit()).observe(host);
    this.fit();
  }

  render(): void {
    renderLcd(this.lcd, this.device.screen(), this.pressedSlot);
    this.led.dataset.state = this.device.screenSaver ? 'saver' : this.device.power;
  }

  /** Visual feedback for a knob turn triggered from outside (keyboard). */
  nudgeKnob(detents: number): void {
    this.knobAngle += detents * DEGREES_PER_DETENT;
    this.knob.style.transform = `rotate(${this.knobAngle}deg)`;
  }

  private fit(): void {
    const { width, height } = this.host.getBoundingClientRect();
    const scale = Math.min((width - 24) / DEVICE_W, (height - 24) / DEVICE_H);
    this.root.style.transform = `translate(-50%, -50%) scale(${Math.max(0.2, scale)})`;
  }

  private buildSoftKeys(): void {
    const host = this.root.querySelector('.softkeys')!;
    for (const side of ['left', 'right'] as const) {
      ROW_Y.forEach((y, r) => {
        const row = r + 1;
        const index = r * 2 + (side === 'left' ? 0 : 1);
        const key = document.createElement('button');
        key.className = `softkey ${side}`;
        // The flat end of each key tucks in against the bezel edge.
        const edge = bezelEdgeX(y) + 2;
        key.style.cssText = `left:${side === 'left' ? edge - 92 : 720 - edge}px;top:${y - 23}px`;
        key.setAttribute('aria-label', `${side} soft key ${row}`);
        key.title = `${side === 'left' ? 'Left' : 'Right'} key ${row} (${side === 'left' ? row : (row + 5) % 10})`;
        key.innerHTML = softKeySvg(side);
        key.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          key.setPointerCapture(e.pointerId);
          this.softKeyDown(index);
        });
        const up = () => this.softKeyUp();
        key.addEventListener('pointerup', up);
        key.addEventListener('pointercancel', up);
        host.appendChild(key);
      });
    }
  }

  softKeyDown(index: number): void {
    const repeat = this.device.screen().slots[index]?.repeat === true;
    this.pressedSlot = index;
    this.device.pressSoftKey(index);
    this.render();
    if (!repeat) return;
    let delay = 380;
    const fire = () => {
      this.device.pressSoftKey(index);
      delay = Math.max(35, delay * 0.8);
      this.repeatTimer = window.setTimeout(fire, delay);
    };
    this.repeatTimer = window.setTimeout(fire, delay);
  }

  softKeyUp(): void {
    window.clearTimeout(this.repeatTimer);
    this.repeatTimer = undefined;
    this.pressedSlot = null;
    this.render();
  }

  private bindHardware(): void {
    const actions: Record<string, () => void> = {
      home: () => this.device.pressHome(),
      back: () => this.device.pressBack(),
      library: () => this.device.pressLibrary(),
      start: () => this.device.pressStart(),
      pause: () => this.device.pressPause(),
      stop: () => this.device.pressStop(),
    };
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>('[data-hw]')) {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        actions[btn.dataset.hw!]();
      });
    }
  }

  private bindKnob(): void {
    const knob = this.knob;
    let lastAngle: number | null = null;
    let carry = 0;

    const angleOf = (e: PointerEvent) => {
      const r = knob.getBoundingClientRect();
      return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    };

    knob.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      knob.setPointerCapture(e.pointerId);
      knob.focus();
      lastAngle = angleOf(e);
      carry = 0;
    });
    knob.addEventListener('pointermove', (e) => {
      if (lastAngle === null) return;
      const a = angleOf(e);
      let delta = a - lastAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastAngle = a;
      this.knobAngle += delta;
      knob.style.transform = `rotate(${this.knobAngle}deg)`;
      carry += delta;
      const detents = Math.trunc(carry / DEGREES_PER_DETENT);
      if (detents !== 0) {
        carry -= detents * DEGREES_PER_DETENT;
        this.device.turnKnob(detents);
      }
    });
    const end = () => {
      lastAngle = null;
    };
    knob.addEventListener('pointerup', end);
    knob.addEventListener('pointercancel', end);

    knob.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const detents = e.deltaY < 0 ? 1 : -1;
        this.nudgeKnob(detents);
        this.device.turnKnob(detents);
      },
      { passive: false },
    );
  }
}
