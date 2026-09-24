// Offline support. Pages are network-first so a new deploy shows up on the next
// online visit; hashed build assets are cache-first since their URLs never change.
const CACHE = 'vectra-sim-v1';

// Cache the page and every /assets/ file it references, and drop assets that
// an older build referenced.
async function cachePage(response) {
  const cache = await caches.open(CACHE);
  const html = await response.clone().text();
  const assets = new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]));
  await cache.addAll([...assets]);
  await cache.put('/', response);
  for (const req of await cache.keys()) {
    const path = new URL(req.url).pathname;
    if (path.startsWith('/assets/') && !assets.has(path)) await cache.delete(req);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    fetch('/', { cache: 'no-cache' })
      .then(cachePage)
      .then(() => self.skipWaiting()),
  );
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
          if (response.ok && url.pathname === '/') event.waitUntil(cachePage(response.clone()));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
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
