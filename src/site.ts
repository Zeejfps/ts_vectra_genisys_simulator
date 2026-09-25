// Pages of the site. Used by the build (page inputs, sitemap, nav injection)
// and by the simulator page's panel nav, so the list lives in one place.

export const SITE_URL = 'https://estim.builtbyzee.com';

export interface SitePage {
  /** URL path, with a trailing slash. */
  path: string;
  /** HTML entry, relative to the project root. */
  file: string;
  /** Label in the site nav. */
  nav: string;
  /** Files whose last commit date is the page's sitemap lastmod. */
  sources: string[];
}

export const PAGES: SitePage[] = [
  { path: '/', file: 'index.html', nav: 'Simulator', sources: ['index.html', 'src'] },
  { path: '/how-to-use/', file: 'how-to-use/index.html', nav: 'How to use', sources: ['how-to-use/index.html'] },
  { path: '/about/', file: 'about/index.html', nav: 'About', sources: ['about/index.html'] },
  { path: '/faq/', file: 'faq/index.html', nav: 'FAQ', sources: ['faq/index.html'] },
  {
    path: '/device-reference/',
    file: 'device-reference/index.html',
    nav: 'Device reference',
    sources: ['device-reference/index.html', 'docs/device-reference.md'],
  },
  {
    path: '/accuracy/',
    file: 'accuracy/index.html',
    nav: 'Accuracy',
    sources: ['accuracy/index.html', 'docs/accuracy.md'],
  },
];

/** Site nav links, with the current page marked. */
export function navLinks(current: string): string {
  return PAGES.map(
    (p) => `<a href="${p.path}"${p.path === current ? ' aria-current="page"' : ''}>${p.nav}</a>`,
  ).join('');
}

/** Button that opens the site nav on narrow screens (see `initMenu`). */
export const MENU_TOGGLE = `<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path class="bars" d="M4 7h16M4 12h16M4 17h16" /><path class="close" d="M6 6l12 12M18 6 6 18" /></svg>
</button>`;

/** Wire up the menu toggle: it shows and hides the nav, and Escape closes it. */
export function initMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  const setOpen = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  };
  toggle.addEventListener('click', () => setOpen(!isOpen()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });
}
