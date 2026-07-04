const CACHE_NAME = 'druisk-v25';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/settings.js',
  '/js/lock.js',
  '/js/song-actions.js',
  '/js/backup.js',
  '/js/parser/index.js',
  '/js/parser/chordpro.js',
  '/js/parser/plain-text.js',
  '/js/renderer/index.js',
  '/js/renderer/chord-renderer.js',
  '/js/storage/firebase.js',
  '/js/utils/transpose.js',
  '/js/utils/escape.js',
  '/js/views/home.js',
  '/js/views/favorites.js',
  '/js/views/song.js',
  '/js/views/upload.js',
  '/js/views/edit.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache Google Fonts requests
  if (url.hostname.includes('fonts')) {
    return;
  }

  // Only cache GET requests (Cache API doesn't support POST/PUT/DELETE)
  if (e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetched;
    })
  );
});
