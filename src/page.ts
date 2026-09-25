// Entry for the content pages (About, FAQ, ...): styles, the nav menu, the issue
// report dialog, and the service worker so a first visit to any page makes the
// whole site work offline.
import './site.css';
import './design.css';
import { initFeedback } from './feedback';
import { PAGES, initMenu } from './site';

initMenu();
initFeedback();

// Give long reference pages an index without duplicating their headings.
const article = document.querySelector<HTMLElement>('main.prose');
if (article) {
  const current = PAGES.find((page) => page.path === location.pathname.replace(/index\.html$/, ''));
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow page-eyebrow';
  eyebrow.textContent = `THE LEARNING LIBRARY / ${current?.nav.toUpperCase() ?? 'REFERENCE'}`;
  article.prepend(eyebrow);

  const headings = [...article.querySelectorAll<HTMLHeadingElement>('h2[id]')];
  if (headings.length) {
    const layout = document.createElement('div');
    layout.className = 'doc-layout';
    article.before(layout);
    layout.append(article);
    const outline = document.createElement('aside');
    outline.className = 'page-outline';
    outline.innerHTML = '<h2>ON THIS PAGE</h2><nav aria-label="On this page"></nav><a class="back-to-simulator" href="/">Back to the simulator <span aria-hidden="true">↗</span></a>';
    const nav = outline.querySelector('nav')!;
    const links = headings.map((heading) => {
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      nav.append(link);
      return link;
    });
    layout.append(outline);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (!visible) return;
      for (const [i, link] of links.entries()) {
        if (headings[i] === visible.target) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }, { rootMargin: '-5% 0px -65% 0px' });
    headings.forEach((heading) => observer.observe(heading));
  }
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}
