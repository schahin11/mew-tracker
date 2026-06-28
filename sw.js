/* The Vault — service worker
   Strategy:
   - same-origin app files  -> network-first (so deploys always update), cache fallback offline
   - images + CDN libs (3D)  -> cache-first (immutable; makes viewed cards work offline)
   Bump VERSION to force a refresh of the cached app shell. */
const VERSION = 'vault-v3';
const RT = VERSION + '-runtime';
const SHELL = [
  '/', '/index.html', '/styles.css', '/app.js', '/hero.js',
  '/cards.js', '/collections.js', '/collections/ascended-heroes.js', '/deltas.js', '/tcgdex-map.js',
  '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== RT).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isImage = req.destination === 'image' || /\.(png|jpe?g|webp|svg|gif)$/i.test(url.pathname);
  const isCdnLib = url.hostname === 'unpkg.com' || url.hostname === 'cdn.jsdelivr.net';

  if (isImage || isCdnLib) {
    // cache-first
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(RT).then(c => c.put(req, copy));
        return res;
      }).catch(() => hit))
    );
    return;
  }

  if (url.origin === location.origin) {
    // network-first for the app shell
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('/index.html')))
    );
  }
});
