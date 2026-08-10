const CACHE = "charger-shell-v9";
const SHELL_FILES = ["/", "/index.html", "/styles.css", "/app.js", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for the app shell - always try to get the freshest code,
// and only fall back to the cached shell copy if the network request
// genuinely fails (i.e. actually offline). This intentionally trades a
// small amount of load speed for never silently serving stale app code
// again - previously (cache-first), every future deploy required bumping
// this file's CACHE version *and* the person manually clearing site data/
// re-registering the service worker before they'd ever see it, which is
// easy to forget and hard to debug.
//
// All requests are handled network-first: try the network, fall back to cache
// if offline. The Worker lives on a different origin so the service worker
// never intercepts those requests — only the Pages static files are handled here.
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only same-origin GETs belong in the shell cache. Chrome on Android routes
  // POSTs (commands), non-http schemes (geo:, chrome-extension:) and the
  // cross-origin Worker/CDN requests through here too, and cache.put() throws
  // on any of them — which surfaces as an unhandled rejection and, for POSTs,
  // a broken command.
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp.ok && resp.type === "basic") {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/index.html")))
  );
});
