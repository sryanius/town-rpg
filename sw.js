// 폰에서 PC 없이도 돌게 하는 저장해 두기(서비스 워커).
// 늘 먼저 PC 서버에 물어보고(새 판이 있으면 그걸 받고 저장), 서버가 없으면 저장해 둔 것을 쓴다.
const CACHE = 'town-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './manifest.json'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit ?? (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))),
  );
});
