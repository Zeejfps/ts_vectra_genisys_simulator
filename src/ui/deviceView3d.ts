import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import modelUrl from '../assets/vectra_genisys.glb?url';
import type { Device } from '../sim/device';
import { renderLcd } from './lcd';
import { DEGREES_PER_DETENT, type HardwareKey, type UnitView, hardwareAction } from './unitView';

// The physical unit as a 3D model (built by tools/build_genisys_model.py).
//
// Controls in the model are nodes named softkey_0..9, key_<name> and knob, each
// with extras (userData) giving sim_id, action and travel_mm. A press moves the
// node along its local -Y; the knob turns about its local Y. The HTML LCD from
// lcd.ts is laid over the lcd_screen quad with a CSS3D transform so its text
// stays crisp. The face node's frame_box extra is the region the camera frames.

const DEG = Math.PI / 180;

const FOV = 28;
/** Room left around the framed parts, as a fraction of the fit distance. */
const FRAME_MARGIN = 1.05;
/** Seconds for a key to travel fully down or back up. */
const PRESS_TIME = 0.06;
/** A tap from the keyboard or screen reader holds the key down this long (ms). */
const TAP_MS = 120;
/** Fingers also hit a control this many screen px outside it (keys are small on phones). */
const TOUCH_SLOP = 12;
/** Seen head-on a press barely moves, so pressed keys also darken this much. */
const PRESS_SHADE = 0.3;

interface Key {
  node: THREE.Object3D;
  rest: THREE.Vector3;
  /** Full travel in the parent's space. */
  stroke: THREE.Vector3;
  depth: number;
  held: boolean;
  releaseAt: number;
  /** The key's own material copies, with their resting colours. */
  shades: { material: THREE.MeshStandardMaterial; base: THREE.Color }[];
}

type LedState = 'standby' | 'on' | 'saver';

const HW_LABELS: Record<HardwareKey, string> = {
  home: 'Home',
  back: 'Back',
  library: 'Clinical Resources Library',
  stop: 'Stop',
  pause: 'Pause',
  start: 'Start',
};

export class DeviceView3D implements UnitView {
  readonly root: HTMLElement;
  private readonly lcd: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly css = new CSS3DRenderer();
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 10);
  private readonly raycaster = new THREE.Raycaster();

  private model: THREE.Object3D | null = null;
  private readonly keys = new Map<string, Key>();
  private readonly controlMeshes: THREE.Object3D[] = [];
  private knob: THREE.Object3D | null = null;
  private knobRest = new THREE.Quaternion();
  private led: THREE.MeshStandardMaterial | null = null;
  private ledState: LedState = 'standby';

  /** The framed region in face space: x right, -z up the face, y out of it. */
  private framed = new THREE.Box3();

  private knobAngle = 0;
  private pressedSlot: number | null = null;
  private repeatTimer: number | undefined;
  private needsRender = true;
  private lastFrame = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly device: Device,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'device3d';
    host.appendChild(this.root);

    // Throws where WebGL is unavailable; main.ts falls back to the flat view.
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.domElement.className = 'device3d-canvas';
    this.root.appendChild(this.renderer.domElement);

    this.css.domElement.className = 'device3d-overlay';
    this.root.appendChild(this.css.domElement);

    this.lcd = document.createElement('div');
    this.lcd.className = 'lcd';
    this.lcd.dataset.kind = 'off';

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.45;
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(-0.6, 1.2, 0.9);
    this.scene.add(key);

    this.buildScreenReaderControls();
    this.bindPointer();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();

    new GLTFLoader().load(
      modelUrl,
      (gltf) => this.onModel(gltf.scene),
      undefined,
      (err) => console.error('Could not load the unit model', err),
    );
  }

  // ---------- UnitView ----------

  render(): void {
    renderLcd(this.lcd, this.device.screen(), this.pressedSlot);
    const led: LedState = this.device.screenSaver ? 'saver' : this.device.power === 'off' ? 'standby' : 'on';
    if (led !== this.ledState) {
      this.ledState = led;
      this.needsRender = true;
    }
  }

  frame(now: number): void {
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const moving = this.animateKeys(now, dt);
    if (this.ledState === 'saver') this.needsRender = true;
    if (moving || this.needsRender) this.draw(now);
  }

  nudgeKnob(detents: number): void {
    this.setKnobAngle(this.knobAngle + detents * DEGREES_PER_DETENT);
  }

  softKeyDown(index: number): void {
    const repeat = this.device.screen().slots[index]?.repeat === true;
    this.pressedSlot = index;
    this.holdKey(`softkey_${index}`, true);
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
    if (this.pressedSlot !== null) this.holdKey(`softkey_${this.pressedSlot}`, false);
    this.pressedSlot = null;
    this.render();
  }

  pressHardware(key: HardwareKey): void {
    this.tapKey(`key_${key}`);
    hardwareAction(this.device, key);
  }

  // ---------- model ----------

  private onModel(model: THREE.Object3D): void {
    this.model = model;
    this.scene.add(model);
    model.updateMatrixWorld(true);

    model.traverse((obj) => {
      const data = obj.userData as { action?: string; travel_mm?: number };
      if (data.action === 'press') {
        const stroke = new THREE.Vector3(0, -(data.travel_mm ?? 1) / 1000, 0).applyQuaternion(obj.quaternion);
        const shades: Key['shades'] = [];
        obj.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const material = (child.material as THREE.MeshStandardMaterial).clone();
          child.material = material;
          shades.push({ material, base: material.color.clone() });
        });
        this.keys.set(obj.name, { node: obj, rest: obj.position.clone(), stroke, depth: 0, held: false, releaseAt: 0, shades });
      } else if (data.action === 'rotate') {
        this.knob = obj;
        this.knobRest.copy(obj.quaternion);
      }
      if (data.action) obj.traverse((child) => child instanceof THREE.Mesh && this.controlMeshes.push(child));
    });

    const led = model.getObjectByName('led_power');
    if (led instanceof THREE.Mesh) {
      this.led = (led.material as THREE.MeshStandardMaterial).clone();
      led.material = this.led;
    }

    // Lay the HTML LCD over the glass: CSS x runs along the quad's +X and CSS
    // down along its +Z (the quad's top is -Z and it faces +Y).
    const screen = model.getObjectByName('lcd_screen')!;
    const info = screen.userData as { width_mm: number; dom_width_px: number; dom_height_px: number };
    // The glass isn't 3:4 like the flat view's panel; the status area absorbs the extra height.
    this.lcd.style.width = `${info.dom_width_px}px`;
    this.lcd.style.height = `${info.dom_height_px}px`;
    const overlay = new CSS3DObject(this.lcd);
    overlay.element.style.pointerEvents = 'none';
    overlay.scale.setScalar(info.width_mm / 1000 / info.dom_width_px);
    overlay.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    overlay.position.set(0, 0.0002, 0);
    screen.add(overlay);

    const [x0, y0, z0, x1, y1, z1] = (model.getObjectByName('face')!.userData as { frame_box: number[] }).frame_box;
    this.framed.set(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
    this.fit();
  }

  /** Aim the fixed camera straight at the face, close enough that the framed parts just fit. */
  private fit(): void {
    if (!this.model) return;
    const face = this.model.getObjectByName('face')!;
    const tanV = Math.tan((FOV / 2) * DEG);
    const tanH = tanV * this.camera.aspect;
    const centre = this.framed.getCenter(new THREE.Vector3());
    const half = this.framed.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    // Nearest face of the box (out of the face is +y) sits half.y in front of the centre.
    const distance = (half.y + Math.max(half.x / tanH, half.z / tanV)) * FRAME_MARGIN;
    const eye = centre.clone().add(new THREE.Vector3(0, distance, 0));
    this.camera.position.copy(face.localToWorld(eye));
    this.camera.up.set(0, 0, -1).applyQuaternion(face.getWorldQuaternion(new THREE.Quaternion()));
    this.camera.lookAt(face.localToWorld(centre.clone()));
    this.needsRender = true;
  }

  private resize(): void {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    this.css.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.fit();
    this.draw(performance.now());
  }

  private draw(now: number): void {
    this.needsRender = false;
    if (this.led) this.updateLed(now);
    this.renderer.render(this.scene, this.camera);
    this.css.render(this.scene, this.camera);
  }

  private updateLed(now: number): void {
    const led = this.led!;
    if (this.ledState === 'standby') {
      led.color.set(0x3f8f4c);
      led.emissive.set(0x3f8f4c);
      led.emissiveIntensity = 0.6;
    } else {
      led.color.set(0x3aa7ff);
      led.emissive.set(0x3aa7ff);
      // Screen saver: slow blink, matching the flat view's 1.6 s cycle.
      const blink = this.ledState === 'saver' ? 0.15 + 0.85 * (0.5 + 0.5 * Math.cos((now / 1600) * 2 * Math.PI)) : 1;
      led.emissiveIntensity = 3 * blink;
    }
  }

  // ---------- animation ----------

  private holdKey(name: string, held: boolean): void {
    const key = this.keys.get(name);
    if (!key) return;
    key.held = held;
    key.releaseAt = 0;
  }

  private tapKey(name: string): void {
    const key = this.keys.get(name);
    if (!key) return;
    key.held = true;
    key.releaseAt = performance.now() + TAP_MS;
  }

  private animateKeys(now: number, dt: number): boolean {
    let moving = false;
    for (const key of this.keys.values()) {
      if (key.releaseAt && now >= key.releaseAt) {
        key.held = false;
        key.releaseAt = 0;
      }
      const goal = key.held ? 1 : 0;
      if (key.depth === goal) continue;
      const step = dt / PRESS_TIME;
      key.depth = goal > key.depth ? Math.min(goal, key.depth + step) : Math.max(goal, key.depth - step);
      key.node.position.copy(key.rest).addScaledVector(key.stroke, key.depth);
      for (const { material, base } of key.shades) {
        material.color.copy(base).multiplyScalar(1 - PRESS_SHADE * key.depth);
        material.envMapIntensity = 1 - 2 * PRESS_SHADE * key.depth;
      }
      moving = true;
    }
    return moving;
  }

  private setKnobAngle(degrees: number): void {
    this.knobAngle = degrees;
    if (!this.knob) return;
    // Clockwise as seen from the front is negative about the knob's +Y.
    this.knob.quaternion.copy(this.knobRest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -degrees * DEG));
    this.needsRender = true;
  }

  // ---------- input ----------

  /**
   * A page point as CSS px from the canvas's top left. Works from page
   * coordinates and the layout offsets rather than clientX and
   * getBoundingClientRect: once the page is pinch-zoomed, mobile browsers
   * (iOS Safari especially) don't agree on which viewport those two are
   * relative to, and taps land on the wrong control or none.
   */
  private toCanvas(pageX: number, pageY: number): { x: number; y: number } {
    let x = pageX;
    let y = pageY;
    for (let el: HTMLElement | null = this.renderer.domElement; el; el = el.offsetParent as HTMLElement | null) {
      x -= el.offsetLeft + el.clientLeft;
      y -= el.offsetTop + el.clientTop;
    }
    return { x, y };
  }

  /** The control at a page point, allowing some slop around it for touches. */
  private hitTarget(pageX: number, pageY: number, touch: boolean): string | null {
    const id = this.hit(pageX, pageY);
    if (id || !touch) return id;
    // Fingers don't shrink when the page is zoomed in, so keep the slop constant on screen.
    const slop = TOUCH_SLOP / (window.visualViewport?.scale ?? 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 2 * Math.PI;
      const near = this.hit(pageX + slop * Math.cos(a), pageY + slop * Math.sin(a));
      if (near) return near;
    }
    return null;
  }

  /** The control under a page point: 'softkey:3', 'hw:stop', 'knob' or null. */
  private hit(pageX: number, pageY: number): string | null {
    if (!this.model) return null;
    const canvas = this.renderer.domElement;
    const { x, y } = this.toCanvas(pageX, pageY);
    const ndc = new THREE.Vector2((x / canvas.clientWidth) * 2 - 1, -(y / canvas.clientHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const [first] = this.raycaster.intersectObject(this.model, true);
    for (let obj: THREE.Object3D | null = first?.object ?? null; obj; obj = obj.parent) {
      const id = (obj.userData as { sim_id?: string }).sim_id;
      if (id && id !== 'led:power') return id;
    }
    return null;
  }

  private bindPointer(): void {
    const canvas = this.renderer.domElement;
    let knobDrag: { last: number; carry: number } | null = null;
    let heldHw: string | null = null;

    const angleAt = (e: PointerEvent) => {
      const p = this.knob!.getWorldPosition(new THREE.Vector3()).project(this.camera);
      const { x, y } = this.toCanvas(e.pageX, e.pageY);
      return Math.atan2(y - ((1 - p.y) / 2) * canvas.clientHeight, x - ((p.x + 1) / 2) * canvas.clientWidth) / DEG;
    };

    // Touches that start on a control are ours; anywhere else they scroll the page.
    canvas.addEventListener(
      'touchstart',
      (e) => {
        const t = e.touches[0];
        if (t && this.hitTarget(t.pageX, t.pageY, true)) e.preventDefault();
      },
      { passive: false },
    );

    canvas.addEventListener('pointerdown', (e) => {
      const id = this.hitTarget(e.pageX, e.pageY, e.pointerType === 'touch');
      if (!id) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const [kind, name] = id.split(':');
      if (kind === 'softkey') {
        this.softKeyDown(Number(name));
      } else if (kind === 'hw') {
        heldHw = `key_${name}`;
        this.holdKey(heldHw, true);
        hardwareAction(this.device, name as HardwareKey);
      } else if (kind === 'knob') {
        knobDrag = { last: angleAt(e), carry: 0 };
        canvas.style.cursor = 'grabbing';
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (knobDrag) {
        const a = angleAt(e);
        let delta = a - knobDrag.last;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        knobDrag.last = a;
        this.setKnobAngle(this.knobAngle + delta);
        knobDrag.carry += delta;
        const detents = Math.trunc(knobDrag.carry / DEGREES_PER_DETENT);
        if (detents !== 0) {
          knobDrag.carry -= detents * DEGREES_PER_DETENT;
          this.device.turnKnob(detents);
        }
      } else if (e.pointerType === 'mouse') {
        const id = this.hit(e.pageX, e.pageY);
        canvas.style.cursor = id === 'knob' ? 'grab' : id ? 'pointer' : 'default';
      }
    });

    const end = () => {
      if (this.pressedSlot !== null) this.softKeyUp();
      if (heldHw) this.holdKey(heldHw, false);
      heldHw = null;
      knobDrag = null;
      canvas.style.cursor = 'default';
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    canvas.addEventListener(
      'wheel',
      (e) => {
        if (this.hit(e.pageX, e.pageY) !== 'knob') return;
        e.preventDefault();
        const detents = e.deltaY < 0 ? 1 : -1;
        this.nudgeKnob(detents);
        this.device.turnKnob(detents);
      },
      { passive: false },
    );
  }

  /** Offscreen buttons so the controls stay reachable by screen readers. */
  private buildScreenReaderControls(): void {
    const group = document.createElement('div');
    group.className = 'sr-only';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Unit controls');
    const add = (label: string, onClick: () => void) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      group.appendChild(btn);
    };
    for (let i = 0; i < 10; i++) {
      const side = i % 2 === 0 ? 'Left' : 'Right';
      add(`${side} soft key ${Math.floor(i / 2) + 1}`, () => {
        this.softKeyDown(i);
        window.setTimeout(() => this.softKeyUp(), TAP_MS);
      });
    }
    for (const [key, label] of Object.entries(HW_LABELS) as [HardwareKey, string][]) {
      add(label, () => this.pressHardware(key));
    }
    add('Intensity up', () => {
      this.nudgeKnob(1);
      this.device.turnKnob(1);
    });
    add('Intensity down', () => {
      this.nudgeKnob(-1);
      this.device.turnKnob(-1);
    });
    this.root.appendChild(group);
  }
}
