// Офлайн-режим: страница берётся из сети (чтобы получать обновления), а без интернета — из кэша.
const CACHE = "r312-v2";
const CORE = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function networkFirst(req, key) {
  const net = fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key || req, copy)); }
    return res;
  });
  const timeout = new Promise(resolve => setTimeout(resolve, 3500));
  return Promise.race([net.catch(() => null), timeout]).then(res =>
    res || caches.match(key || req, { ignoreSearch: true }).then(hit => hit || net)
  );
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // шрифты Google — из кэша, если уже скачаны
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html") || url.pathname.endsWith("config.js")) {
    e.respondWith(networkFirst(req, url.pathname.endsWith("config.js") ? "./config.js" : "./index.html"));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || networkFirst(req)));
});
