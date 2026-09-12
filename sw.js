// service worker «Технобунт» — версия по содержимому: 87c5d50ae0
// Игра всегда отдаётся МГНОВЕННО из памяти телефона (и работает без интернета).
// Новая версия скачивается фоном при следующем заходе и применяется сама.
const CACHE = 'technobunt-87c5d50ae0';
const ASSETS = ['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-512-maskable.png','./apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // cache:'reload' — качаем именно с сервера, а не из старого HTTP-кэша
    await Promise.all(ASSETS.map(async u => {
      try { const r = await fetch(new Request(u, { cache: 'reload' })); if (r.ok) await c.put(u, r); } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    // 🔄 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ СТАРЫХ КОПИЙ.
    // Даже если на телефоне лежит старая страница без нового обновлятора, браузер всё равно
    // скачивает свежий sw.js при заходе. Новый воркер сам перезагружает открытые окна
    // на свежий адрес — и застрявшая версия обновляется без всяких кнопок (Марк, 23.08).
    try {
      const окна = await self.clients.matchAll({ type: 'window' });
      for (const w of окна) {
        const базовый = w.url.split('?')[0];
        await w.navigate(базовый + '?v=' + Date.now());
      }
    } catch (_) {}
  })());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // файл версии НИКОГДА не кэшируем — по нему игра узнаёт про обновление
  if (new URL(e.request.url).pathname.endsWith('version.json')) return;
  const isDoc = e.request.mode === 'navigate' || e.request.destination === 'document';
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(isDoc ? './index.html' : e.request, { ignoreSearch: true });
    if (hit) return hit;                                   // мгновенный старт
    try {
      const r = await fetch(e.request);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    } catch (_) {
      return (await c.match('./index.html')) || Response.error();
    }
  })());
});
