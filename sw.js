// JMTI app on the phone (MANU 2026-10-13): the app page and its fonts and libraries are kept on the phone, so the app
// opens at once even before the internet answers. Each open also checks GitHub for a newer page in the background;
// when there is one, it is kept for the next open and the open page is told (it shows a Reload button).
// Data (script.google.com) is never kept here: the app asks the server for it every time.
const CACHE = 'jmti-app-v1';
const SHELL = ['./', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const LIBS = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// The page being opened may not exist yet when the check ends: wait for it (up to ~6 s), then tell it.
async function tell(id, msg) {
  for (let i = 0; i < 20; i++) {
    const c = id ? await self.clients.get(id) : null;
    if (c) { c.postMessage(msg); return; }
    await new Promise(r => setTimeout(r, 300));
  }
  (await self.clients.matchAll({ type: 'window' })).forEach(c => c.postMessage(msg));
}

// GitHub's copy of the app page; when it differs from the kept one, keep it and tell the page.
async function check(kept, id) {   // kept: a copy of the kept page (the original goes to the page)
  const res = await fetch('./', { cache: 'no-cache' });
  if (!res.ok) return res;
  const c = await caches.open(CACHE);
  const text = await res.clone().text();
  const old = kept ? await kept.text() : null;
  if (old !== text) {
    await c.put('./', res.clone());
    if (old !== null) await tell(id, 'jmti-updated');
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    // The app page: answer from the phone at once, then check GitHub in the background.
    const id = e.resultingClientId || e.clientId;
    const answer = caches.match('./').then(kept => {
      const fresh = check(kept ? kept.clone() : null, id);
      if (!kept) return fresh;
      e.waitUntil(fresh.catch(() => {}));
      return kept;
    });
    e.respondWith(answer);
    return;
  }
  if (url.origin === self.location.origin) { e.respondWith(caches.match(req).then(r => r || fetch(req))); return; }
  if (LIBS.test(req.url)) {
    // Fonts and libraries: their addresses carry a version, so a kept copy is always right.
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(kept => kept || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))));
  }
});
