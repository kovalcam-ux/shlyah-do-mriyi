/* Service worker для «Шлях до мрії».
   Стратегія:
   - сторінка (index.html): спочатку мережа, при відсутності інтернету — кеш;
   - статичні ресурси (іконка, шрифти): спочатку кеш, у фоні — оновлення.
   Щоб примусово оновити застосунок у користувачів, збільш номер версії CACHE. */

const CACHE = 'shlyah-do-mriyi-v1';
const PRECACHE = ['./', './index.html', './icon.png', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Запити до AI-воркера — лише мережа, без кешу
  if (req.url.includes('workers.dev')) return;

  // Навігація: мережа → кеш (щоб користувач завжди мав свіжу версію, але міг працювати офлайн)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Решта (іконка, шрифти, статика): кеш → мережа з докешуванням
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
