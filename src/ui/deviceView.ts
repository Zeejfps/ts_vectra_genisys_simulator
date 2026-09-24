import type { Device } from '../sim/device';
import { BACK_GLYPH, HOME_GLYPH, LIBRARY_GLYPH } from './icons';
import { renderLcd } from './lcd';

// The physical unit: housing, soft keys, hardware buttons and intensity knob.
// Everything is laid out on a fixed 620 x 980 canvas and scaled to fit.

export const DEVICE_W = 620;
export const DEVICE_H = 980;
/** Knob rotation (degrees) per detent. */
const DEGREES_PER_DETENT = 12;

const TEMPLATE = `
  <div class="housing-lower">
    <div class="front-panel"><span class="fp-slot"></span><span class="fp-dot"></span><span class="fp-slot"></span></div>
  </div>
  <div class="housing-upper">
    <div class="card-slot" title="Patient Data Card port"></div>
  </div>
  <div class="bezel">
    <div class="bezel-logo"><span class="logo-mark"></span><span class="logo-text">CHATTANOOGA<br><small>GROUP</small></span></div>
    <div class="lcd-frame"><div class="lcd" data-kind="off"></div></div>
    <div class="bezel-brand">Vectra<sup>®</sup><br><span>GEN<i>I</i>SYS</span></div>
    <div class="power-led" title="Unit on indicator"></div>
  </div>
  <div class="softkeys left"></div>
  <div class="softkeys right"></div>
  <button class="hw hw-home" data-hw="home" aria-label="Home" title="Home (H)">${HOME_GLYPH}</button>
  <button class="hw hw-back" data-hw="back" aria-label="Back" title="Back (B)">${BACK_GLYPH}</button>
  <button class="hw hw-library" data-hw="library" aria-label="Clinical Resources Library" title="Clinical Resources Library (L)">${LIBRARY_GLYPH}</button>
  <div class="therapy-buttons">
    <span class="tb-sym tb-sym-stop"></span><button class="tb tb-stop" data-hw="stop" title="Stop (X)">STOP</button>
    <span class="tb-sym tb-sym-pause"></span><button class="tb tb-pause" data-hw="pause" title="Pause (P)">PAUSE</button>
    <span class="tb-sym tb-sym-start"></span><button class="tb tb-start" data-hw="start" title="Start (S)">START</button>
  </div>
  <div class="knob-well">
    <div class="knob" role="slider" tabindex="0" aria-label="Intensity knob" title="Intensity: drag, scroll, or use the arrow keys">
      <div class="knob-grip"></div>
    </div>
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
    for (const side of ['left', 'right'] as const) {
      const col = this.root.querySelector(`.softkeys.${side}`)!;
      for (let row = 1; row <= 5; row++) {
        const index = (row - 1) * 2 + (side === 'left' ? 0 : 1);
        const key = document.createElement('button');
        key.className = 'softkey';
        key.setAttribute('aria-label', `${side} soft key ${row}`);
        key.title = `${side === 'left' ? 'Left' : 'Right'} key ${row} (${side === 'left' ? row : (row + 5) % 10})`;
        key.innerHTML = '<span class="tick"></span>';
        key.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          key.setPointerCapture(e.pointerId);
          this.softKeyDown(index);
        });
        const up = () => this.softKeyUp();
        key.addEventListener('pointerup', up);
        key.addEventListener('pointercancel', up);
        col.appendChild(key);
      }
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
