import type { Device } from '../sim/device';
import { channelOutput, detailView } from '../sim/output';
import { intensityText } from '../sim/screens';
import { CHANNELS, type ChannelId } from '../sim/types';
import { getWaveform } from '../sim/waveforms';
import { esc } from './lcd';

// Output monitor shown beside the device: a zoomed pulse-shape view for the
// selected channel and a scrolling strip of each channel's output level.

const HISTORY_S = 12;
const SUBSAMPLES = 24;

interface Sample {
  t: number;
  v: number;
}

type Palette = { bg: string; grid: string; trace: string; dim: string; text: string };

const DARK = window.matchMedia('(prefers-color-scheme: dark)');

/** Set text only when it changes, so an unchanged monitor doesn't relayout every frame. */
function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export class Scope {
  private readonly detail: HTMLCanvasElement;
  private readonly strip: HTMLCanvasElement;
  private readonly caption: HTMLElement;
  private readonly readouts: HTMLElement;
  private readonly selection: HTMLElement;
  private readonly empty: HTMLElement;
  private readonly state: HTMLElement;
  private lastReadouts = '';
  /** Whether the monitor is on screen; it isn't drawn otherwise. */
  private visible = false;
  private palette: Palette | null = null;
  /** What the canvases last showed when idle, so an idle monitor is drawn once and left alone. */
  private detailIdle = false;
  private stripIdle = false;
  private readonly history = new Map<ChannelId, Sample[]>(CHANNELS.map((c) => [c, []]));

  constructor(
    host: HTMLElement,
    private readonly device: Device,
  ) {
    host.innerHTML = `
      <div class="monitor-heading"><div><span class="eyebrow">LIVE OUTPUT</span><h2>Output monitor</h2></div><span class="monitor-state" role="status">Unit off</span></div>
      <div class="scope-head"><h3>Pulse shape</h3><span class="scope-sel"></span></div>
      <div class="scope-screen">
        <canvas class="scope-detail" width="640" height="220" role="img" aria-label="Selected channel pulse shape; waveform description follows"></canvas>
        <div class="scope-empty"><span aria-hidden="true">∿</span><strong>Waiting for a waveform</strong><small>Power on the unit to begin</small></div>
      </div>
      <p class="scope-caption"></p>
      <div class="scope-head history-heading"><h3>Output history</h3><span>LAST ${HISTORY_S} S</span></div>
      <canvas class="scope-strip" width="640" height="240" role="img" aria-label="Simulated output level for channels 1 through 4 over the last 12 seconds; current values follow"></canvas>
      <div class="scope-head channel-heading"><h3>Channels</h3><span>SIMULATED OUTPUT</span></div>
      <div class="scope-readouts"></div>`;
    this.detail = host.querySelector('.scope-detail')!;
    this.strip = host.querySelector('.scope-strip')!;
    this.caption = host.querySelector('.scope-caption')!;
    this.readouts = host.querySelector('.scope-readouts')!;
    this.selection = host.querySelector('.scope-sel')!;
    this.empty = host.querySelector('.scope-empty')!;
    this.state = host.querySelector('.monitor-state')!;

    new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
    }).observe(host);
    DARK.addEventListener('change', () => this.repaint());
  }

  /** Forget the cached colours and idle drawings, e.g. after a theme change. */
  private repaint(): void {
    this.palette = null;
    this.detailIdle = this.stripIdle = false;
  }

  update(): void {
    const d = this.device;
    const now = d.simTimeMs / 1000;
    for (const ch of CHANNELS) {
      const t = d.power === 'on' ? d.treatmentOn(ch) : undefined;
      let v = 0;
      if (t) {
        const i = t.channels.indexOf(ch);
        const out = channelOutput(t, i, t.elapsedMs / 1000);
        v = out.level * (t.intensity[i] / getWaveform(t.waveform).intensityMax(t.params));
      }
      const h = this.history.get(ch)!;
      h.push({ t: now, v });
      while (h.length && h[0].t < now - HISTORY_S) h.shift();
    }
    // Keep recording history, but only draw what can be seen.
    if (!this.visible) return;
    this.drawDetail();
    this.drawStrip(now);
    this.drawReadouts();
  }

  private colors(): Palette {
    if (this.palette) return this.palette;
    const cs = getComputedStyle(document.documentElement);
    return (this.palette = {
      bg: cs.getPropertyValue('--scope-bg').trim() || '#0d1712',
      grid: cs.getPropertyValue('--scope-grid').trim() || '#1f3328',
      trace: cs.getPropertyValue('--scope-trace').trim() || '#5ef08f',
      dim: cs.getPropertyValue('--scope-dim').trim() || '#2f6b45',
      text: cs.getPropertyValue('--scope-text').trim() || '#9cc9ad',
    });
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, bg: string, grid: string): void {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += w / 10) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
    }
    for (let y = 0; y <= h; y += h / 8) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
    }
    ctx.stroke();
  }

  private drawDetail(): void {
    const c = this.colors();
    const ctx = this.detail.getContext('2d')!;
    const { width: w, height: h } = this.detail;

    const d = this.device;
    const t = d.power === 'on' ? d.activeTreatment : undefined;
    const sel = this.selection;
    const running = d.power === 'on' && [...d.treatments.values()].some((t) => t.status === 'running');
    const state = d.power === 'off' ? 'Unit off' : d.power === 'booting' ? 'Starting' : running ? 'Running' : 'Ready';
    setText(this.state, state);
    this.state.classList.toggle('is-on', d.power === 'on');
    this.empty.hidden = !!t;
    if (!t) {
      setText(sel, `CH ${d.selectedChannel}`);
      setText(this.empty.querySelector('small')!, d.power === 'on' ? 'Choose Electrotherapy on the unit' : 'Power on the unit to begin');
      setText(this.caption, 'Explore a waveform to see how its parameters shape the signal.');
      // Just the grid, under the empty message.
      if (!this.detailIdle) this.drawGrid(ctx, w, h, c.bg, c.grid);
      this.detailIdle = true;
      return;
    }
    this.detailIdle = false;
    this.drawGrid(ctx, w, h, c.bg, c.grid);
    const idx = t.channels.indexOf(d.selectedChannel);
    const tSec = t.elapsedMs / 1000;
    const out = channelOutput(t, Math.max(0, idx), tSec);
    const view = detailView(t, tSec);
    const delivering = t.status === 'running';
    const amp = delivering ? out.level : 1;

    setText(sel, `Ch ${d.selectedChannel} · ${getWaveform(t.waveform).name}`);
    setText(this.caption, `${view.caption} · window ${formatWindow(view.windowS)}${delivering ? '' : ' · preview (not running)'}`);

    const mid = h / 2;
    const scale = (h / 2 - 12) * amp;
    ctx.strokeStyle = delivering ? c.trace : c.dim;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let prevMax = mid;
    for (let x = 0; x < w; x++) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let s = 0; s < SUBSAMPLES; s++) {
        const tau = ((x + s / SUBSAMPLES) / w) * view.windowS;
        const v = view.sample(tau);
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      const yHi = mid - hi * scale;
      const yLo = mid - lo * scale;
      if (x === 0) ctx.moveTo(x, yHi);
      // Join to the previous column so steep edges stay continuous.
      ctx.lineTo(x, Math.min(prevMax, yHi));
      ctx.lineTo(x, yLo);
      ctx.lineTo(x, yHi);
      prevMax = yHi;
    }
    ctx.stroke();
  }

  private drawStrip(now: number): void {
    // With no output in the window, every lane is flat: draw that once.
    const idle = CHANNELS.every((ch) => this.history.get(ch)!.every((s) => s.v === 0));
    if (idle && this.stripIdle) return;
    this.stripIdle = idle;
    const c = this.colors();
    const ctx = this.strip.getContext('2d')!;
    const { width: w, height: h } = this.strip;
    this.drawGrid(ctx, w, h, c.bg, c.grid);
    const lane = h / CHANNELS.length;
    ctx.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    CHANNELS.forEach((ch, i) => {
      const top = i * lane;
      const base = top + lane - 6;
      const span = lane - 16;
      const samples = this.history.get(ch)!;
      ctx.fillStyle = c.text;
      ctx.fillText(`Ch ${ch}`, 8, top + 22);
      ctx.strokeStyle = c.trace;
      ctx.lineWidth = 2;
      if (idle) {
        // Nothing out: a flat line across the whole window.
        ctx.beginPath();
        ctx.moveTo(0, base);
        ctx.lineTo(w, base);
        ctx.stroke();
        return;
      }
      if (samples.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(w, base);
      for (let k = samples.length - 1; k >= 0; k--) {
        const x = w - ((now - samples[k].t) / HISTORY_S) * w;
        ctx.lineTo(x, base - samples[k].v * span);
      }
      ctx.lineTo(w - ((now - samples[0].t) / HISTORY_S) * w, base);
      ctx.closePath();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = c.trace;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
    });
  }

  private drawReadouts(): void {
    const d = this.device;
    const rows: string[] = [];
    for (const ch of CHANNELS) {
      const t = d.power === 'on' ? d.treatmentOn(ch) : undefined;
      if (!t) {
        rows.push(`<div class="ro-row is-idle"><span class="ro-ch">CH ${ch}</span><span class="ro-phase">IDLE</span><span class="ro-wf">No waveform selected</span></div>`);
        continue;
      }
      const i = t.channels.indexOf(ch);
      const out = channelOutput(t, i, t.elapsedMs / 1000);
      const wf = getWaveform(t.waveform);
      const phase = t.status === 'running' ? out.phase.toUpperCase() : d.channelStatus(ch).toUpperCase();
      const parts = [
        `${intensityText(t, i)} ${wf.intensityLabel(t.params)}`,
        out.frequency,
        out.polarity ? out.polarity : '',
      ].filter(Boolean);
      rows.push(
        `<div class="ro-row"><span class="ro-ch">CH ${ch}</span><span class="ro-phase ro-${esc(out.phase)}">${esc(phase)}</span><span class="ro-wf">${esc(wf.name)}</span><span class="ro-detail">${esc(parts.join(' · '))}</span></div>`,
      );
    }
    const html = rows.join('') || '<div class="ro-empty">No channels in use.</div>';
    if (html === this.lastReadouts) return;
    this.lastReadouts = html;
    this.readouts.innerHTML = html;
  }
}

function formatWindow(s: number): string {
  if (s >= 1) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  if (s >= 1e-3) return `${(s * 1e3).toFixed(s < 1e-2 ? 1 : 0)} ms`;
  return `${Math.round(s * 1e6)} µs`;
}
