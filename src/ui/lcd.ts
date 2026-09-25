import type { Area, Block, ScreenModel, Slot, StatusPanel } from '../sim/screenModel';
import { bodySvg, placementSvg } from './figures';
import { iconSvg, statusIconSvg } from './icons';

// Renders a ScreenModel into the LCD element. The LCD is a fixed-size box; its
// five button rows line up with the physical soft keys drawn by deviceView.

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function multiline(s: string): string {
  return s.split('\n').map(esc).join('<br>');
}

export function renderLcd(el: HTMLElement, model: ScreenModel, pressed: number | null): void {
  el.dataset.kind = model.kind;
  if (model.kind === 'off' || model.kind === 'saver') {
    el.innerHTML = '';
    return;
  }
  if (model.kind === 'boot') {
    el.innerHTML = `
      <div class="lcd-boot">
        <div class="boot-logo"><span class="boot-mark"></span><span>CHATTANOOGA<br><small>GROUP</small></span></div>
        <div class="boot-name">Vectra<sup>®</sup> Genisys</div>
        <div class="boot-sub">Therapy System</div>
        <div class="boot-bar"><div></div></div>
      </div>`;
    return;
  }

  const narrow = model.layout === 'narrow';
  const slots = model.slots.map((s, i) => renderSlot(s, i, narrow, pressed === i)).join('');
  const blocks = model.blocks.map((b) => renderBlock(b, narrow)).join('');

  el.innerHTML = `
    <div class="lcd-title">${esc(model.title)}</div>
    <div class="lcd-grid ${narrow ? 'narrow' : ''}">${blocks}${slots}</div>
    ${model.status ? renderStatus(model.status) : ''}
    ${model.message ? `<div class="lcd-message ${model.message.tone}"><div>${model.message.lines.map(esc).join('<br>')}</div></div>` : ''}`;
}

function gridPos(area: Area, narrow: boolean): string {
  const [c0, c1] = narrow ? [2, 2] : area.cols;
  return `grid-row:${area.rows[0]} / ${area.rows[1] + 1};grid-column:${c0} / ${c1 + 1}`;
}

function renderSlot(s: Slot | null, i: number, narrow: boolean, pressed: boolean): string {
  if (!s || (!s.label && !s.icon)) return '';
  const row = Math.floor(i / 2) + 1;
  const col = i % 2 === 0 ? 1 : narrow ? 3 : 2;
  const icon = s.icon ? iconSvg(s.icon) : '';
  const iconOnly = !s.label;
  const side = s.iconSide ?? 'right';
  const content = iconOnly
    ? icon
    : side === 'left'
      ? `${icon}<span>${multiline(s.label)}</span>`
      : `<span>${multiline(s.label)}</span>${icon}`;
  const cls = ['lcd-btn', iconOnly ? 'icon-only' : '', s.icon && !iconOnly ? 'has-icon' : '', s.active ? 'active' : '', pressed ? 'pressed' : '']
    .filter(Boolean)
    .join(' ');
  return `<div class="${cls}" style="grid-row:${row};grid-column:${col}">${content}</div>`;
}

function renderBlock(b: Block, narrow: boolean): string {
  switch (b.type) {
    case 'text':
      return `<div class="lcd-text ${b.tone}" style="${gridPos(b.area, narrow)}">${b.lines.map((l) => `<div>${esc(l) || '&nbsp;'}</div>`).join('')}</div>`;
    case 'intensity':
      return `<div class="lcd-intensity" style="${gridPos(b.area, narrow)}">
        <div class="vals">${b.values.map((v) => `<span>${esc(v)}</span>`).join('')}</div>
        <div class="unit">${esc(b.unit)}</div></div>`;
    case 'valueEditor':
      return `<div class="lcd-editor" style="${gridPos(b.area, narrow)}"><div class="ed-box">
        <div class="ed-label">${esc(b.label)}</div>
        <div class="ed-value">${esc(b.value)}</div>
        <div class="ed-range">${esc(b.range)}</div></div></div>`;
    case 'placement':
      return `<div class="lcd-placement" style="${gridPos(b.area, narrow)}">${placementSvg(b.figure)}<div class="cap">${esc(b.caption)}</div></div>`;
    case 'keyboard':
      return `<div class="lcd-keyboard" style="${gridPos(b.area, narrow)}">
        ${b.rows
          .map(
            (row, r) =>
              `<div class="kb-row">${[...row]
                .map((ch, c) => `<span class="${b.framed && b.framed.row === r && b.framed.col === c ? 'framed' : ''}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`)
                .join('')}</div>`,
          )
          .join('')}
        <div class="kb-hint">${esc(b.hint)}</div></div>`;
    case 'figure':
      return `<div class="lcd-figure" style="grid-row:1 / 6;grid-column:2">${bodySvg()}</div>`;
    case 'contact':
      return `<div class="lcd-contact" style="${gridPos(b.area, narrow)}">
        <div class="ct-bar"><span style="height:${Math.round(b.level * 100)}%"></span></div>
        <div class="ct-label">Contact<br>Quality</div></div>`;
    case 'sectionLabel':
      return `<div class="lcd-section" style="grid-row:${b.row};grid-column:1 / -1">${esc(b.text)}</div>`;
  }
}

function renderStatus(s: StatusPanel): string {
  const rows = s.rows
    .map(
      (r) =>
        `<div class="st-row ${r.framed ? 'framed' : ''}"><span class="ch">${esc(r.label)}</span><span class="st">${esc(r.status)}</span><span class="iv">${esc(r.intensity)}${r.icon ? statusIconSvg(r.icon) : ''}</span></div>`,
    )
    .join('');
  const pad = s.padContact.length
    ? `<div class="st-pad">${s.padContact.map((v, i) => `<span class="pad-label">${s.padContact.length > 1 ? `Ch${i + 1}` : 'Pad'}</span><span class="pad-bar"><span style="width:${Math.round(v * 100)}%"></span></span>`).join('')}</div>`
    : '';
  const right = s.timer
    ? `<div class="st-right">
        <div class="st-timer">${esc(s.timer)}</div>
        <div class="st-ints">${s.intensities.map((v) => `<span>${esc(v)}</span>`).join('')}</div>
        <div class="st-unit">${esc(s.unit)}</div></div>`
    : '';
  return `<div class="lcd-status"><div class="st-left"><div class="st-list">${rows}</div>${pad}</div>${right}</div>`;
}
