/* Caché sin conexión de Tico Box. El build reemplaza VERSION con el SHA del commit. */
const VERSION = 'tb-dev';
const CORE = ['./', 'index.html', 'style.css', 'app.js', 'sync.js', 'data.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'tutor.html', 'tutor.js', 'recorder.js', 'vendor/lame.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // API de GitHub y LanguageTool: siempre en vivo
  if (/\/(e|icons)\//.test(u.pathname)) {   // emojis e íconos: primero la caché, se guardan para siempre
    e.respondWith(caches.open(VERSION).then(c => c.match(e.request).then(r => r || fetch(e.request).then(n => { if (n.ok) c.put(e.request, n.clone()); return n; }))));
    return;
  }
  // archivos de la app: primero la red para que lleguen las actualizaciones; la caché cuando no hay conexión
  e.respondWith(fetch(e.request).then(n => { if (n.ok) { const copy = n.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); } return n; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
