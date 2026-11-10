/* Service worker: caches the app shell for offline use. Same-origin only; nothing external is cached. */
const CACHE = 'acm-shell-v1'; // bump this number whenever you change index.html
const SHELL = ['./', 'index.html', 'manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

// Remove old caches when a new version activates
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // never touch external requests
  if (req.mode === 'navigate') {
    // Network first so updates arrive; fall back to cache when offline
    e.respondWith(
      fetch(req).then(r => {
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); }
        return r;
      }).catch(() => caches.match('index.html').then(m => m || caches.match('./')))
    );
    return;
  }
  e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(l => l.length ? l[0].focus() : clients.openWindow('./')));
});
