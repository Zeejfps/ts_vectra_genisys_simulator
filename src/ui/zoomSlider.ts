import { MAX_ZOOM, MIN_ZOOM, type StageZoom } from './zoom';

// The touch screen zoom control: a round button that pops up a vertical
// slider above it. Dragging anywhere on the slider sets the zoom, bottom for
// the whole unit and top for the closest view.

const MAGNIFIER_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 20 20" /><path d="M7.5 10.5h6" /><path d="M10.5 7.5v6" /></svg>`;

export const ZOOM_SLIDER = `
  <button class="zoom-toggle" aria-label="Zoom" aria-expanded="false" aria-controls="zoom-slider" title="Zoom">
    ${MAGNIFIER_ICON}<span class="zoom-toggle-value"></span>
  </button>
  <div id="zoom-slider" class="zoom-slider" role="slider" tabindex="0" aria-label="Zoom" aria-orientation="vertical"
    aria-valuemin="${MIN_ZOOM * 100}" aria-valuemax="${MAX_ZOOM * 100}" aria-valuenow="100" aria-valuetext="100%" hidden>
    <span class="zoom-slider-track"><span class="zoom-slider-fill"></span><span class="zoom-slider-thumb"></span></span>
  </div>`;

/** Slider keys move this far along it. */
const KEY_STEP = 0.1;

/** Slider position, 0 (bottom) to 1 (top), on a log scale so each step zooms by the same factor. */
const toPosition = (zoom: number) => Math.log(zoom / MIN_ZOOM) / Math.log(MAX_ZOOM / MIN_ZOOM);
const fromPosition = (t: number) => MIN_ZOOM * (MAX_ZOOM / MIN_ZOOM) ** Math.min(1, Math.max(0, t));

export class ZoomSlider {
  private readonly toggle: HTMLButtonElement;
  private readonly slider: HTMLElement;
  private readonly track: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly zoom: StageZoom,
  ) {
    this.toggle = root.querySelector('.zoom-toggle')!;
    this.slider = root.querySelector('.zoom-slider')!;
    this.track = root.querySelector('.zoom-slider-track')!;

    this.toggle.addEventListener('click', () => this.setOpen(!this.isOpen()));
    // A tap anywhere else puts it away.
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (this.isOpen() && !root.contains(e.target as Node)) this.setOpen(false);
      },
      true,
    );
    this.bindDrag();
    this.slider.addEventListener('keydown', (e) => {
      const t = toPosition(this.zoom.zoom);
      const next: Record<string, number> = {
        ArrowUp: t + KEY_STEP,
        ArrowRight: t + KEY_STEP,
        ArrowDown: t - KEY_STEP,
        ArrowLeft: t - KEY_STEP,
        Home: 0,
        End: 1,
      };
      if (e.key === 'Escape') {
        this.setOpen(false);
        this.toggle.focus();
      } else if (e.key in next) {
        this.setPosition(next[e.key]);
      } else {
        return;
      }
      // Keep the arrows from also turning the unit's knob.
      e.preventDefault();
      e.stopPropagation();
    });
  }

  /** Reflect a zoom change, from the slider or anywhere else. */
  update(level: number): void {
    const percent = `${Math.round(level * 100)}%`;
    const t = `${toPosition(level) * 100}%`;
    this.root.style.setProperty('--zoom-position', t);
    this.slider.setAttribute('aria-valuenow', String(Math.round(level * 100)));
    this.slider.setAttribute('aria-valuetext', percent);
    this.toggle.querySelector('.zoom-toggle-value')!.textContent = level === 1 ? '' : percent;
  }

  private isOpen(): boolean {
    return this.toggle.getAttribute('aria-expanded') === 'true';
  }

  private setOpen(open: boolean): void {
    this.slider.hidden = !open;
    this.toggle.setAttribute('aria-expanded', String(open));
  }

  private setPosition(t: number): void {
    this.zoom.zoomBy(fromPosition(t) / this.zoom.zoom);
  }

  private bindDrag(): void {
    let pointer: number | null = null;
    const follow = (e: PointerEvent) => {
      const { top, height } = this.track.getBoundingClientRect();
      this.setPosition(1 - (e.clientY - top) / height);
    };
    this.slider.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pointer = e.pointerId;
      this.slider.setPointerCapture(e.pointerId);
      follow(e);
    });
    this.slider.addEventListener('pointermove', (e) => {
      if (e.pointerId === pointer) follow(e);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId === pointer) pointer = null;
    };
    this.slider.addEventListener('pointerup', end);
    this.slider.addEventListener('pointercancel', end);
  }
}
