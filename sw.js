/* Service worker Bart: даёт установку как приложение и открытие без сети.
   Стратегия «сначала сеть, потом кэш» — после обновления сайта всегда видна свежая версия. */
const V = 'bart-v3';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/config.js', 'js/firebase-config.js', 'marked.min.js', 'purify.min.js',
  'highlight.min.js', 'github-dark.min.css', 'firebase.js', 'logo.svg', 'manifest.webmanifest'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return; // API, Firebase и картинки не трогаем
  e.respondWith(
    fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
  );
});
