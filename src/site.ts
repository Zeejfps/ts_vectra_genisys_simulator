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
  { path: '/about/', file: 'about/index.html', nav: 'About', sources: ['about/index.html'] },
  { path: '/faq/', file: 'faq/index.html', nav: 'FAQ', sources: ['faq/index.html'] },
  {
    path: '/device-reference/',
    file: 'device-reference/index.html',
    nav: 'Reference',
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
