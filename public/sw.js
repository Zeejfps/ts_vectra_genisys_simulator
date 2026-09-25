// Offline support. Pages are network-first so a new deploy shows up on the next
// online visit; hashed build assets are cache-first since their URLs never change.
const CACHE = 'vectra-sim-v2';
const ASSET_RE = /(?:src|href)="(\/assets\/[^"]+)"/g;

const pageAssets = (html) => [...html.matchAll(ASSET_RE)].map((m) => m[1]);

// Cache every page in the sitemap and every /assets/ file they reference, and
// drop assets that an older build referenced.
async function cacheSite() {
  const cache = await caches.open(CACHE);
  const sitemap = await fetch('/sitemap.xml', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.text() : ''))
    .catch(() => '');
  const paths = new Set(['/', ...[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)]);
  const assets = new Set();
  const pages = await Promise.all(
    [...paths].map(async (path) => {
      const response = await fetch(path, { cache: 'no-cache' });
      if (!response.ok) return null;
      for (const asset of pageAssets(await response.clone().text())) assets.add(asset);
      return [path, response];
    }),
  );
  await cache.addAll([...assets]);
  await Promise.all(pages.filter(Boolean).map(([path, response]) => cache.put(path, response)));
  for (const req of await cache.keys()) {
    const path = new URL(req.url).pathname;
    if (path.startsWith('/assets/') && !assets.has(path)) await cache.delete(req);
  }
}

// Keep a freshly loaded page. If it references assets we don't have, a new
// build is live, so refresh the whole site so the other pages match it.
async function cachePage(path, response) {
  const cache = await caches.open(CACHE);
  const assets = pageAssets(await response.clone().text());
  const cached = await Promise.all(assets.map((a) => cache.match(a)));
  if (cached.some((c) => !c)) return cacheSite();
  await cache.put(path, response);
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheSite().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Skip redirects (e.g. /faq to /faq/): the cached copy lives at the final URL.
          if (response.ok && !response.redirected) event.waitUntil(cachePage(url.pathname, response.clone()));
          return response;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match(`${url.pathname}/`)) || caches.match('/')),
    );
    return;
  }

  // Ignore Vary: module scripts send an Origin header that the precache requests didn't.
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((c) => c.put(request, copy)));
          }
          return response;
        }),
    ),
  );
});
