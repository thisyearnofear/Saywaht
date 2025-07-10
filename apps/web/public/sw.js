const CACHE_VERSION = "v1";
const STATIC_CACHE = `saywhat-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `saywhat-dynamic-${CACHE_VERSION}`;

// Static files to cache
const STATIC_FILES = ["/", "/editor", "/manifest.json", "/offline.html"];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Skip caching for chrome-extension URLs and other unsupported schemes
  if (
    event.request.url.startsWith("chrome-extension://") ||
    event.request.url.startsWith("moz-extension://") ||
    event.request.url.startsWith("safari-extension://")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request)
          .then((fetchResponse) => {
            // Only cache successful responses that are not partial (status 206)
            if (fetchResponse.ok && fetchResponse.status !== 206) {
              const responseClone = fetchResponse.clone();
              caches
                .open(DYNAMIC_CACHE)
                .then((cache) => {
                  // Additional check to ensure we can cache this response
                  try {
                    cache.put(event.request, responseClone);
                  } catch (error) {
                    console.warn("Failed to cache response:", error);
                  }
                })
                .catch((error) => {
                  console.warn("Failed to open cache:", error);
                });
            }
            return fetchResponse;
          })
          .catch(() => {
            if (event.request.destination === "document") {
              return caches.match("/offline.html");
            }
          })
      );
    })
  );
});

// Background sync
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Handle offline actions when back online
  console.log("Background sync triggered");
}
