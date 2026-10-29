// Service Worker: speichert die App beim ersten Aufruf, danach läuft sie offline.
// Bei jeder Änderung an den Dateien CACHE-Version erhöhen.
const CACHE = "makrocoach-v2.3.0";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "data.js",
  "manifest.webmanifest",
  "fonts/fonts.css",
  "fonts/BarlowCondensed-500.woff2",
  "fonts/BarlowCondensed-600.woff2",
  "fonts/BarlowCondensed-700.woff2",
  "fonts/IBMPlexMono-400.woff2",
  "fonts/IBMPlexMono-500.woff2",
  "fonts/SchibstedGrotesk-400.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache zuerst (schnell & offline), im Hintergrund aktualisieren.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok && new URL(event.request.url).origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached || (event.request.mode === "navigate" ? caches.match("index.html") : undefined));
      return cached || network;
    })
  );
});
