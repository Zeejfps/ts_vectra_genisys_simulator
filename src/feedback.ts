// "Report an issue" dialog. Reports are posted to Formspree, which emails them on.
// Any `[data-report]` button opens it; the simulator page adds a snapshot of the
// unit's state so a report says what was on screen.

const ENDPOINT = 'https://formspree.io/f/xgopqapy';

const DIALOG = `
<dialog class="report" aria-labelledby="report-title">
  <form class="report-form" method="dialog">
    <div class="report-head">
      <h2 id="report-title">Report an issue</h2>
      <button class="report-close" type="submit" value="cancel" aria-label="Close" formnovalidate>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </div>
    <p class="report-intro">
      Found something that doesn't match the real Vectra Genisys, or a bug? Let me know. On the simulator page, the
      current screen and treatment settings are attached automatically.
    </p>
    <label>
      <span>Type</span>
      <select name="type">
        <option>Doesn't match the real device</option>
        <option>Bug</option>
        <option>Suggestion</option>
        <option>Other</option>
      </select>
    </label>
    <label>
      <span>What happened?</span>
      <textarea name="message" rows="6" required
        placeholder="What you did, what the simulator showed, and what the real unit does instead."></textarea>
    </label>
    <label>
      <span>Email <small>(optional, if you'd like a reply)</small></span>
      <input type="email" name="email" autocomplete="email" placeholder="you@example.com" />
    </label>
    <input class="report-trap" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true" />
    <p class="report-status" role="status"></p>
    <div class="report-actions">
      <button class="button" type="submit" value="send">Send report</button>
    </div>
  </form>
  <div class="report-done" hidden>
    <h2>Thanks!</h2>
    <p>Your report was sent.</p>
    <div class="report-actions">
      <button class="button" type="button" data-close>Close</button>
    </div>
  </div>
</dialog>`;

/**
 * Wire up the `[data-report]` buttons. `context` returns extra details to attach
 * to a report, such as the simulator's current state.
 */
export function initFeedback(context?: () => Record<string, unknown>): void {
  let dialog: HTMLDialogElement | null = null;

  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('[data-report]')) return;
    dialog ??= createDialog(context);
    dialog.querySelector<HTMLFormElement>('.report-form')!.hidden = false;
    dialog.querySelector<HTMLElement>('.report-done')!.hidden = true;
    dialog.showModal();
  });
}

function createDialog(context?: () => Record<string, unknown>): HTMLDialogElement {
  document.body.insertAdjacentHTML('beforeend', DIALOG);
  const dialog = document.querySelector<HTMLDialogElement>('dialog.report')!;
  const form = dialog.querySelector<HTMLFormElement>('.report-form')!;
  const done = dialog.querySelector<HTMLElement>('.report-done')!;
  const status = dialog.querySelector<HTMLElement>('.report-status')!;
  const send = form.querySelector<HTMLButtonElement>('[value="send"]')!;

  // Click on the backdrop closes it.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  done.querySelector('[data-close]')!.addEventListener('click', () => dialog.close());

  form.addEventListener('submit', async (e) => {
    if (e.submitter?.getAttribute('value') !== 'send') return;
    e.preventDefault();

    const data = new FormData(form);
    const type = String(data.get('type'));
    data.set('_subject', `[Genisys Sim] ${type}`);
    data.set('page', location.href);
    data.set('version', __APP_VERSION__);
    data.set('browser', navigator.userAgent);
    data.set('screen', `${innerWidth}×${innerHeight} @${devicePixelRatio}x`);
    if (context) {
      try {
        data.set('state', JSON.stringify(context(), null, 2));
      } catch (err) {
        data.set('state', `unavailable: ${err}`);
      }
    }

    send.disabled = true;
    status.textContent = 'Sending…';
    status.classList.remove('error');
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      form.reset();
      status.textContent = '';
      form.hidden = true;
      done.hidden = false;
    } catch {
      status.textContent = navigator.onLine
        ? "Couldn't send the report. Please try again in a moment."
        : "You're offline. Reconnect and try again; your report is still here.";
      status.classList.add('error');
    } finally {
      send.disabled = false;
    }
  });

  return dialog;
}
