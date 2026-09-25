import { REPORT_BUTTON } from './site';

const ARROW = '<span aria-hidden="true">↗</span>';

export const WORKSPACE = `
  <aside class="panel" aria-label="Learning workspace">
    <header class="panel-head">
      <div class="workspace-heading"><h1>Your practice workspace</h1><span class="lab-label">LEARNING LAB</span></div>
      <p>Get to know the unit. See the signal. Practice at your own pace.</p>
    </header>

    <div class="workspace-body">
      <div class="workspace-tabs" role="tablist" aria-label="Workspace tools">
        <button id="tab-monitor" type="button" role="tab" aria-selected="true" aria-controls="pane-monitor" data-workspace-tab="monitor">Monitor</button>
        <button id="tab-guide" type="button" role="tab" aria-selected="false" aria-controls="pane-guide" tabindex="-1" data-workspace-tab="guide">Quick start</button>
        <button id="tab-keys" type="button" role="tab" aria-selected="false" aria-controls="pane-keys" tabindex="-1" data-workspace-tab="keys">Keyboard</button>
      </div>

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
          <li><div><h3>Power up the unit</h3><p>Use the power switch at the top left of the Device area, or press <kbd>O</kbd>. Let the home screen load.</p></div></li>
          <li><div><h3>Choose a waveform</h3><p>Press <strong>Electrotherapy</strong>, then select a waveform using the keys beside the screen.</p></div></li>
          <li><div><h3>Make it your own</h3><p>Use <strong>Edit</strong> to explore the parameters. Turn the intensity knob by dragging, scrolling over it, or pressing <kbd>↑</kbd> / <kbd>↓</kbd>.</p></div></li>
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
    </div>

    <footer class="workspace-footer">
      <p><span class="education-mark" aria-hidden="true">i</span><span>For learning, always.<br><small>Unofficial simulator. Not a medical device.</small></span></p>
      <div>${REPORT_BUTTON}<span class="version" title="Simulator version">${__APP_VERSION__}</span></div>
    </footer>
  </aside>`;

/** Accessible local tabs keep help available without leaving a running session. */
export function initWorkspace(): void {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-workspace-tab]')];
  const panes = [...document.querySelectorAll<HTMLElement>('.workspace-pane')];
  function select(tab: HTMLButtonElement, focus = false): void {
    for (const item of tabs) {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    }
    for (const pane of panes) pane.hidden = pane.id !== tab.getAttribute('aria-controls');
    if (focus) tab.focus();
  }
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => select(tab));
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
}
