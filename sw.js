// 폰에서 PC 없이도 돌게 하는 저장해 두기(서비스 워커).
// 늘 먼저 PC 서버에 물어보고(새 판이 있으면 그걸 받고 저장), 서버가 없으면 저장해 둔 것을 쓴다.
const CACHE = 'town-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './manifest.json'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// 폰 알림(원정 끝·공사 끝 — 서버 town-push 가 보냄). 게임을 보고 있는 중이면 알림 대신 게임이 알아서 보여 준다
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some(w => w.visibilityState === 'visible' && w.focused)) return;
    await self.registration.showNotification(d.title || '기록자의 마을', {
      body: d.body || '', tag: d.tag || 'town', renotify: true, icon: 'icon-192.png', data: { url: self.registration.scope },
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find(c => c.url.startsWith(self.registration.scope));
    if (w) { try { return await w.focus(); } catch { /* 못 올리면 새로 연다 */ } }
    return self.clients.openWindow(self.registration.scope);
  })());
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
