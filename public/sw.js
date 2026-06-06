const CACHE_NAME = "shalom-castelao-v1";
const ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network first, falling back to cache
self.addEventListener("fetch", (e) => {
  // Only cache GET requests and non-supabase calls
  if (e.request.method !== "GET" || e.request.url.includes("supabase.co")) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache valid responses
        if (res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return res;
      })
      .catch(() => {
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback if anything else fails
          return new Response("Erro de Conexão. Verifique sua internet.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        });
      })
  );
});
