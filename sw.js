// JMTI app on the phone (MANU 2026-10-13): the app page and its fonts and libraries are kept on the phone, so the app
// opens with no signal. Each open asks GitHub for the page first (MANU 2026-10-14 "github link is still not updated"),
// so a new version shows at once; when GitHub doesn't answer within 3 seconds or there is no signal, the kept page opens,
// and if a newer page arrives after that, the open page is told (it shows a Reload button).
// Data (script.google.com) is never kept here: the app asks the server for it every time.
const CACHE = 'jmti-app-v2';
const SHELL = ['./', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const LIBS = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)\//;
const WAIT_MS = 3000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'no-cache' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// The page being opened may not exist yet: wait for it (up to ~6 s), then tell it.
async function tell(id, msg) {
  for (let i = 0; i < 20; i++) {
    const c = id ? await self.clients.get(id) : null;
    if (c) { c.postMessage(msg); return; }
    await new Promise(r => setTimeout(r, 300));
  }
  (await self.clients.matchAll({ type: 'window' })).forEach(c => c.postMessage(msg));
}

// GitHub's copy of the app page (checked every time, never from the browser's own cache); a good answer is kept.
async function fresh() {
  const res = await fetch('./', { cache: 'no-cache' });
  if (res.ok) await (await caches.open(CACHE)).put('./', res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    const id = e.resultingClientId || e.clientId;
    e.respondWith((async () => {
      const kept = await caches.match('./');
      const net = fresh();
      if (!kept) return net;
      const first = await Promise.race([net.catch(() => null), new Promise(r => setTimeout(() => r(null), WAIT_MS))]);
      if (first && first.ok) return first;
      // slow or no signal: open the kept page now; if GitHub answers later with a different page, offer Reload
      const old = await kept.clone().text();
      e.waitUntil(net.then(async res => { if (res.ok && (await res.clone().text()) !== old) await tell(id, 'jmti-updated'); }).catch(() => {}));
      return kept;
    })());
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
