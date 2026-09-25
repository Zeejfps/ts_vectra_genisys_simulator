import type { UnitView } from './unitView';

// Zoom and pan inside the stage, so the unit can be enlarged without zooming
// the whole page: the zoom buttons, trackpad pinch (ctrl+wheel in Chrome and
// Firefox, gesture events in Safari), two-finger pinch on touch screens, and
// dragging or scrolling to pan once zoomed in.
//
// The visible window is kept as a fraction of the fitted view (see
// UnitView.setViewport), so it survives the stage being resized.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;
/** Zoom factor for one press of a zoom button or key. */
export const ZOOM_STEP = 1.5;
/** Wheel delta (px) for an e-fold of zoom; a trackpad pinch sends small deltas. */
const WHEEL_ZOOM_SCALE = 100;

interface Pinch {
  distance: number;
  mid: { x: number; y: number };
}

export class StageZoom {
  zoom = 1;
  /** Top left of the visible window, as a fraction of the fitted view. */
  private x = 0;
  private y = 0;

  private pinch: Pinch | null = null;
  private pan: { x: number; y: number } | null = null;
  private gestureStart = 1;

  constructor(
    private readonly stage: HTMLElement,
    private readonly view: UnitView,
    private readonly onChange: (zoom: number) => void,
  ) {
    this.bindWheel();
    this.bindSafariGestures();
    this.bindTouch();
    this.bindMouse();
  }

  /** Zoom by a factor about a stage point (CSS px), by default the centre. */
  zoomBy(factor: number, at = this.centre()): void {
    const { width, height } = this.size();
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * factor));
    if (zoom === this.zoom) return;
    // Keep the point under `at` where it is.
    const fx = this.x + at.x / width / this.zoom;
    const fy = this.y + at.y / height / this.zoom;
    this.zoom = zoom;
    this.x = fx - at.x / width / zoom;
    this.y = fy - at.y / height / zoom;
    this.apply();
  }

  /** Move the unit by (dx, dy) screen px. */
  panBy(dx: number, dy: number): void {
    const { width, height } = this.size();
    this.x -= dx / width / this.zoom;
    this.y -= dy / height / this.zoom;
    this.apply();
  }

  reset(): void {
    this.zoom = 1;
    this.x = this.y = 0;
    this.apply();
  }

  private apply(): void {
    // Snap to the fitted view so rounding can't leave it a hair off.
    if (this.zoom < 1.001) this.zoom = 1;
    const room = 1 - 1 / this.zoom;
    this.x = Math.min(room, Math.max(0, this.x));
    this.y = Math.min(room, Math.max(0, this.y));
    this.view.setViewport(this.zoom, this.x, this.y);
    this.stage.classList.toggle('zoomed', this.zoom > 1);
    this.onChange(this.zoom);
  }

  private size(): { width: number; height: number } {
    return { width: this.stage.clientWidth || 1, height: this.stage.clientHeight || 1 };
  }

  private centre(): { x: number; y: number } {
    const { width, height } = this.size();
    return { x: width / 2, y: height / 2 };
  }

  /**
   * A page point as CSS px from the stage's top left. Page coordinates and
   * layout offsets stay consistent when the page itself is pinch-zoomed on
   * mobile; clientX and getBoundingClientRect don't (see DeviceView3D.toCanvas).
   */
  private toStage(pageX: number, pageY: number): { x: number; y: number } {
    let x = pageX;
    let y = pageY;
    for (let el: HTMLElement | null = this.stage; el; el = el.offsetParent as HTMLElement | null) {
      x -= el.offsetLeft + el.clientLeft;
      y -= el.offsetTop + el.clientTop;
    }
    return { x, y };
  }

  /** Whether an event started on something that handles its own input. */
  private onControl(e: Event): boolean {
    // The 3D view cancels pointer and touch events that land on its keys and knob.
    return e.defaultPrevented || (e.target as Element).closest('button, [role="slider"]') !== null;
  }

  private bindWheel(): void {
    this.stage.addEventListener(
      'wheel',
      (e) => {
        // Already used, e.g. scrolled over the knob.
        if (e.defaultPrevented) return;
        const scale = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 400 : 1;
        if (e.ctrlKey) {
          // A trackpad pinch, or ctrl + mouse wheel: zoom here rather than the page.
          e.preventDefault();
          const delta = Math.max(-50, Math.min(50, e.deltaY * scale));
          this.zoomBy(Math.exp(-delta / WHEEL_ZOOM_SCALE), this.toStage(e.pageX, e.pageY));
        } else if (this.zoom > 1) {
          e.preventDefault();
          this.panBy(-e.deltaX * scale, -e.deltaY * scale);
        }
      },
      { passive: false },
    );
  }

  /** Desktop Safari reports a trackpad pinch as non-standard gesture events. */
  private bindSafariGestures(): void {
    type GestureEvent = UIEvent & { scale: number; pageX: number; pageY: number };
    this.stage.addEventListener('gesturestart', (e) => {
      e.preventDefault();
      this.gestureStart = this.zoom;
    });
    this.stage.addEventListener('gesturechange', (e) => {
      e.preventDefault();
      // iOS sends these for touch pinches too, which bindTouch already handles.
      if (this.pinch) return;
      const g = e as GestureEvent;
      this.zoomBy((this.gestureStart * g.scale) / this.zoom, this.toStage(g.pageX, g.pageY));
    });
    this.stage.addEventListener('gestureend', (e) => e.preventDefault());
  }

  private bindTouch(): void {
    const pinchOf = (touches: TouchList): Pinch => {
      const a = this.toStage(touches[0].pageX, touches[0].pageY);
      const b = this.toStage(touches[1].pageX, touches[1].pageY);
      return { distance: Math.hypot(b.x - a.x, b.y - a.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    };
    const start = (e: TouchEvent) => {
      if ((e.target as Element).closest('.unit-controls')) return;
      if (e.touches.length >= 2) {
        e.preventDefault();
        this.view.cancelInput();
        this.pinch = pinchOf(e.touches);
        this.pan = null;
      } else if (this.zoom > 1 && !this.onControl(e)) {
        // Zoomed in, a drag off the controls pans the unit instead of scrolling the page.
        e.preventDefault();
        this.pan = this.toStage(e.touches[0].pageX, e.touches[0].pageY);
      }
    };

    this.stage.addEventListener('touchstart', start, { passive: false });
    this.stage.addEventListener(
      'touchmove',
      (e) => {
        if (this.pinch && e.touches.length >= 2) {
          e.preventDefault();
          const next = pinchOf(e.touches);
          this.panBy(next.mid.x - this.pinch.mid.x, next.mid.y - this.pinch.mid.y);
          if (this.pinch.distance > 0) this.zoomBy(next.distance / this.pinch.distance, next.mid);
          this.pinch = next;
        } else if (this.pan && e.touches.length === 1) {
          e.preventDefault();
          const p = this.toStage(e.touches[0].pageX, e.touches[0].pageY);
          this.panBy(p.x - this.pan.x, p.y - this.pan.y);
          this.pan = p;
        }
      },
      { passive: false },
    );
    const end = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        this.pinch = pinchOf(e.touches);
      } else if (e.touches.length === 1 && (this.pinch || this.pan) && this.zoom > 1) {
        // Lifting one finger of a pinch carries on as a pan with the other.
        this.pinch = null;
        this.pan = this.toStage(e.touches[0].pageX, e.touches[0].pageY);
      } else {
        this.pinch = null;
        this.pan = null;
      }
    };
    this.stage.addEventListener('touchend', end);
    this.stage.addEventListener('touchcancel', end);
  }

  /** Zoomed in, dragging the background with the mouse pans. */
  private bindMouse(): void {
    let drag: { id: number; x: number; y: number } | null = null;
    this.stage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || e.button !== 0 || this.zoom === 1 || this.onControl(e)) return;
      if ((e.target as Element).closest('.unit-controls')) return;
      drag = { id: e.pointerId, ...this.toStage(e.pageX, e.pageY) };
      this.stage.setPointerCapture(e.pointerId);
      this.stage.classList.add('panning');
    });
    this.stage.addEventListener('pointermove', (e) => {
      if (drag?.id !== e.pointerId) return;
      const p = this.toStage(e.pageX, e.pageY);
      this.panBy(p.x - drag.x, p.y - drag.y);
      drag.x = p.x;
      drag.y = p.y;
    });
    const end = (e: PointerEvent) => {
      if (drag?.id !== e.pointerId) return;
      drag = null;
      this.stage.classList.remove('panning');
    };
    this.stage.addEventListener('pointerup', end);
    this.stage.addEventListener('pointercancel', end);
  }
}
