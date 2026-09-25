import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { marked } from 'marked';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { MENU_TOGGLE, PAGES, REPORT_BUTTON, SITE_URL, navLinks } from './src/site.ts';

// Version shown in the app. A tag build in CI uses the pushed tag (e.g. "v1.2.3");
// otherwise fall back to the nearest git tag, then to "dev".
function appVersion(): string {
  if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME) {
    return process.env.GITHUB_REF_NAME;
  }
  try {
    return execSync('git describe --tags --always --dirty', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

// Date of the last commit touching any of `files`, or today if none (e.g. uncommitted).
function lastModified(files: string[]): string {
  try {
    const date = execSync(`git log -1 --format=%cs -- ${files.join(' ')}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    if (date) return date;
  } catch {
    // not a git checkout
  }
  return new Date().toISOString().slice(0, 10);
}

const HEAD = `
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="theme-color" content="#eef1f4" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#14191e" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect x=%224%22 y=%222%22 width=%2224%22 height=%2228%22 rx=%226%22 fill=%22%235a7088%22/%3E%3Crect x=%229%22 y=%226%22 width=%2214%22 height=%2214%22 fill=%22%23ffff3a%22/%3E%3Ccircle cx=%2216%22 cy=%2225%22 r=%223%22 fill=%22%23fff%22/%3E%3C/svg%3E" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="apple-mobile-web-app-title" content="Vectra Sim" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Vectra Genisys Simulator" />
    <meta property="og:image" content="${SITE_URL}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="The simulated Vectra Genisys unit showing its home screen, next to an output monitor." />
    <meta name="twitter:card" content="summary_large_image" />`;

const header = (path: string) => `
    <header class="site-header">
      <a class="brand" href="/">Vectra Genisys Simulator</a>
      ${MENU_TOGGLE}
      <nav class="site-nav" id="site-nav" aria-label="Site">${navLinks(path)}</nav>
    </header>`;

const footer = (path: string) => `
    <footer class="site-footer">
      <nav class="site-nav" aria-label="Footer">${navLinks(path)}</nav>
      ${REPORT_BUTTON}
      <p>
        Unofficial, for training and exploration only. Not a medical device. Not affiliated with or endorsed by Enovis, DJO or
        Chattanooga. Vectra and Genisys are trademarks of their respective owners.
      </p>
    </footer>`;

const slug = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Render a doc for the site: anchor ids on headings, scrollable tables on narrow
// screens, and links between docs (`accuracy.md`) pointed at their pages.
function renderDoc(file: string): string {
  return (marked.parse(readFileSync(resolve(import.meta.dirname, file), 'utf8'), { async: false }) as string)
    .replace(/<h([23])>(.*?)<\/h\1>/g, (_, level, text) => `<h${level} id="${slug(text)}">${text}</h${level}>`)
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, '</table></div>')
    .replace(/href="([a-z-]+)\.md(#[^"]*)?"/g, (_, page, hash = '') => `href="/${page}/${hash}"`);
}

const text = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// FAQPage structured data from the page's own questions (h2) and answers, so the two can't drift.
function faqSchema(html: string): string {
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const items = [...main.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|$)/g)].map(([, q, a]) => ({
    '@type': 'Question',
    name: text(q),
    acceptedAnswer: { '@type': 'Answer', text: text(a) },
  }));
  const data = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

// Fills the placeholder comments in each page and writes the sitemap.
function sitePages(): Plugin {
  return {
    name: 'site-pages',
    transformIndexHtml(html, ctx) {
      const path = ctx.path.replace(/index\.html$/, '');
      html = html
        .replace('<!-- site:head -->', HEAD)
        .replace('<!-- site:header -->', header(path))
        .replace('<!-- site:footer -->', footer(path))
        .replace(/<!-- md:(\S+) -->/g, (_, file) => renderDoc(file));
      return html.replace('<!-- site:faq-schema -->', () => faqSchema(html));
    },
    generateBundle() {
      const urls = PAGES.map(
        (p) => `  <url>\n    <loc>${SITE_URL}${p.path}</loc>\n    <lastmod>${lastModified(p.sources)}</lastmod>\n  </url>`,
      );
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  plugins: [sitePages()],
  build: {
    rolldownOptions: {
      input: Object.fromEntries(PAGES.map((p) => [p.path === '/' ? 'main' : p.path.slice(1, -1), resolve(import.meta.dirname, p.file)])),
    },
  },
});
