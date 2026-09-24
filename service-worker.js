const CACHE_NAME = 'dieu-phoi-pvt-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first cho app shell + Chart.js; các request khác (VD gọi API dữ liệu
// thật) luôn ưu tiên lấy mạng mới nhất, chỉ dùng cache khi mất mạng hẳn.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  const laApiDuLieu = url.indexOf('script.google.com') !== -1;

  if (laApiDuLieu) {
    // Luôn thử mạng trước cho API dữ liệu (cần mới nhất) — PWA tự lo phần
    // cache riêng qua localStorage (xem index.html), Service Worker không
    // cache lại các request này để tránh hiện số liệu cũ mà tưởng là mới.
    event.respondWith(fetch(event.request).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
