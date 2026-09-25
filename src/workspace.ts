import { REPORT_BUTTON } from './site';

const ARROW = '<span aria-hidden="true">↗</span>';

export const WORKSPACE = `
  <aside class="panel" aria-label="Learning workspace">
    <header class="panel-head">
      <div class="workspace-heading"><h1>Your practice workspace</h1><span class="lab-label">LEARNING LAB</span></div>
      <p>Get to know the unit. See the signal. Practice at your own pace.</p>
    </header>

    <div class="sheet-scrim" data-close-sheet aria-hidden="true"></div>

    <div class="workspace-tabs" role="tablist" aria-label="Workspace tools">
      <button id="tab-monitor" type="button" role="tab" aria-selected="true" aria-controls="pane-monitor" data-workspace-tab="monitor">Monitor</button>
      <button id="tab-guide" type="button" role="tab" aria-selected="false" aria-controls="pane-guide" tabindex="-1" data-workspace-tab="guide">Quick start</button>
      <button id="tab-keys" type="button" role="tab" aria-selected="false" aria-controls="pane-keys" tabindex="-1" data-workspace-tab="keys">Keyboard</button>
    </div>

    <div class="workspace-sheet">
      <button class="sheet-close" type="button" aria-label="Close panel" title="Close, or drag down" data-close-sheet></button>

      <section id="pane-monitor" class="workspace-pane" role="tabpanel" aria-labelledby="tab-monitor" tabindex="0">
        <section class="panel-card scope" aria-label="Simulated output monitor"></section>
        <button class="guide-prompt" type="button" data-open-guide>
          <span class="guide-prompt-icon" aria-hidden="true">↳</span>
          <span><strong>First time here?</strong><span>Set up your first waveform in four steps.</span></span>
          <span aria-hidden="true">→</span>
        </button>
      </section>

      <section id="pane-guide" class="workspace-pane guide-pane" role="tabpanel" aria-labelledby="tab-guide" tabindex="0" hidden>
        <div class="pane-intro"><span class="eyebrow">GETTING STARTED</span><h2>A little practice.<br>A lot more familiar.</h2><p>Use the controls on the replica just as you would on the real unit.</p></div>
        <ol class="practice-steps">
          <li><div><h3>Power up the unit</h3><p>Use the power switch at the top left of the Device area. Let the home screen load.</p></div></li>
          <li><div><h3>Choose a waveform</h3><p>Press <strong>Electrotherapy</strong>, then select a waveform using the keys beside the screen.</p></div></li>
          <li><div><h3>Make it your own</h3><p>Use <strong>Edit</strong> to explore the parameters. Turn the intensity knob by dragging or scrolling over it.</p></div></li>
          <li><div><h3>Start and observe</h3><p>Press <strong>Start</strong> on the unit, then open the Monitor tab to see the simulated output. Try changing a parameter and watch what happens.</p></div></li>
        </ol>
        <a class="resource-link" href="/how-to-use/">Explore the full guide ${ARROW}</a>
      </section>

      <section id="pane-keys" class="workspace-pane keys-pane" role="tabpanel" aria-labelledby="tab-keys" tabindex="0" hidden>
        <div class="pane-intro"><span class="eyebrow">AT YOUR FINGERTIPS</span><h2>Find your flow.</h2><p>Control the unit without leaving your keyboard.</p></div>
        <h3 class="shortcut-heading">TREATMENT</h3>
        <dl class="shortcut-list">
          <div><dt>Start</dt><dd><kbd>S</kbd></dd></div>
          <div><dt>Pause</dt><dd><kbd>P</kbd></dd></div>
          <div><dt>Stop</dt><dd><kbd>X</kbd></dd></div>
          <div><dt>Adjust intensity</dt><dd><kbd>↑</kbd><kbd>↓</kbd></dd></div>
          <div><dt>Patient interrupt</dt><dd><kbd>I</kbd></dd></div>
        </dl>
        <h3 class="shortcut-heading">NAVIGATION &amp; CONTROLS</h3>
        <dl class="shortcut-list">
          <div><dt>Home / Back / Library</dt><dd><kbd>H</kbd><kbd>B</kbd><kbd>L</kbd></dd></div>
          <div><dt>Left soft keys, top to bottom</dt><dd><kbd>1–5</kbd></dd></div>
          <div><dt>Right soft keys, top to bottom</dt><dd><kbd>6–0</kbd></dd></div>
          <div><dt>Operator Utilities</dt><dd><kbd>U</kbd></dd></div>
          <div><dt>Power on / off</dt><dd><kbd>O</kbd></dd></div>
          <div><dt>Zoom in / out</dt><dd><kbd>+</kbd><kbd>−</kbd></dd></div>
        </dl>
        <p class="keyboard-note">Shortcuts are inactive while you type in a form.</p>
      </section>

      <footer class="workspace-footer">
        <p><span class="education-mark" aria-hidden="true">i</span><span>For learning, always.<br><small>Unofficial simulator. Not a medical device.</small></span></p>
        <div>${REPORT_BUTTON}<span class="version" title="Simulator version">${__APP_VERSION__}</span></div>
      </footer>
    </div>
  </aside>`;

/** Phones show the workspace as a bottom sheet that the tabs open and close. */
const PHONE = window.matchMedia('(max-width: 900px)');
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
/** How far (as a fraction of its height) or fast (px/ms) a drag must go to dismiss the sheet. */
const DISMISS_DISTANCE = 0.25;
const DISMISS_VELOCITY = 0.5;
const SHEET_EASE = 'transform 220ms cubic-bezier(0.2, 0, 0, 1)';

/** Accessible local tabs keep help available without leaving a running session. */
export function initWorkspace(): void {
  const panel = document.querySelector<HTMLElement>('.panel')!;
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-workspace-tab]')];
  const panes = [...document.querySelectorAll<HTMLElement>('.workspace-pane')];
  const sheet = panel.querySelector<HTMLElement>('.workspace-sheet')!;
  const isOpen = () => panel.classList.contains('sheet-open');
  function setOpen(open: boolean): void {
    panel.classList.toggle('sheet-open', open);
    for (const tab of tabs) tab.setAttribute('aria-expanded', String(open && tab.getAttribute('aria-selected') === 'true'));
  }
  function select(tab: HTMLButtonElement, focus = false): void {
    for (const item of tabs) {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    }
    for (const pane of panes) pane.hidden = pane.id !== tab.getAttribute('aria-controls');
    setOpen(true);
    if (focus) tab.focus();
  }
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => {
      // On phones, tapping the open tab again tucks the sheet away.
      if (PHONE.matches && isOpen() && tab.getAttribute('aria-selected') === 'true') close();
      else select(tab);
    });
    tab.addEventListener('keydown', (event) => {
      let next: number;
      switch (event.key) {
        case 'ArrowRight':
          next = (index + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          next = (index - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = tabs.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      event.stopPropagation();
      select(tabs[next], true);
    });
  }
  document.querySelector('[data-open-guide]')?.addEventListener('click', () => select(tabs[1], true));
  for (const el of document.querySelectorAll('[data-close-sheet]')) el.addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && PHONE.matches && isOpen()) close();
  });
  bindSheetDrag(sheet, close);
  // Start with the sheet tucked away on phones, so the unit has the screen.
  setOpen(!PHONE.matches);

  /** Slide the sheet down from wherever it is, then hide it. */
  function close(): void {
    if (!isOpen()) return;
    if (!PHONE.matches || REDUCED_MOTION.matches) {
      setOpen(false);
      return;
    }
    panel.classList.add('sheet-closing');
    sheet.style.transition = SHEET_EASE;
    sheet.style.transform = 'translateY(100%)';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      panel.classList.remove('sheet-closing');
      sheet.style.transition = sheet.style.transform = '';
      setOpen(false);
    };
    sheet.addEventListener('transitionend', finish, { once: true });
    // In case the transition never runs, e.g. the tab is in the background.
    setTimeout(finish, 300);
  }
}

/**
 * Dragging the sheet down dismisses it: from the handle, or from anywhere once
 * its content is scrolled to the top. A short drag springs back.
 */
function bindSheetDrag(sheet: HTMLElement, close: () => void): void {
  let drag: { startY: number; y: number; t: number; velocity: number; active: boolean } | null = null;
  sheet.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1 || !PHONE.matches) return;
      const y = e.touches[0].clientY;
      drag = { startY: y, y, t: e.timeStamp, velocity: 0, active: false };
    },
    { passive: true },
  );
  sheet.addEventListener(
    'touchmove',
    (e) => {
      if (!drag || e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const dy = y - drag.startY;
      if (!drag.active) {
        const fromHandle = (e.target as Element).closest('.sheet-close') !== null;
        // Pulling up, or down while there is content above to scroll back to, scrolls as usual.
        if (dy <= 0 || (!fromHandle && sheet.scrollTop > 0)) {
          drag = null;
          return;
        }
        drag.active = true;
        sheet.style.transition = 'none';
      }
      e.preventDefault();
      const dt = e.timeStamp - drag.t;
      if (dt > 0) drag.velocity = (y - drag.y) / dt;
      drag.y = y;
      drag.t = e.timeStamp;
      sheet.style.transform = `translateY(${Math.max(0, dy)}px)`;
    },
    { passive: false },
  );
  const end = () => {
    if (!drag?.active) {
      drag = null;
      return;
    }
    const dy = drag.y - drag.startY;
    const dismiss = dy > sheet.offsetHeight * DISMISS_DISTANCE || drag.velocity > DISMISS_VELOCITY;
    drag = null;
    if (dismiss) {
      close();
    } else {
      sheet.style.transition = SHEET_EASE;
      sheet.style.transform = '';
    }
  };
  sheet.addEventListener('touchend', end);
  sheet.addEventListener('touchcancel', end);
}
