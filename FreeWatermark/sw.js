/* Offline cache only for this static tool. User images and generated files are never cached. */
const CACHE = 'freewatermark-static-v1';
const ASSETS = ['./', './index.html', './styles.css', './src/app.js', './src/engine.js', './src/zip.js', './favicon.svg', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('freewatermark-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  const allowed = ASSETS.some(asset => path.endsWith(asset.replace(/^\.\//,''))) || path === new URL('./',self.location).pathname;
  if (!allowed) return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(e.request, copy)); } return response; })));
});
