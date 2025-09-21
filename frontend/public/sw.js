const CACHE_NAME = "pillpal-v1.1.0"
const STATIC_CACHE = "pillpal-static-v1.1.0"
const DYNAMIC_CACHE = "pillpal-dynamic-v1.1.0"

// Assets to cache immediately
const STATIC_ASSETS = ["/", "/manifest.json", "/icon-192.jpg", "/icon-512.jpg", "/offline.html"]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...")

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching static assets")
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log("[SW] Static assets cached successfully")
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error("[SW] Failed to cache static assets:", error)
      }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...")

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("[SW] Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        console.log("[SW] Service worker activated")
        return self.clients.claim()
      }),
  )
})

// Fetch event - serve from cache with network fallback
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Skip API/auth/proxy requests entirely to avoid CORS/redirect issues
  if (url.pathname.startsWith("/api/")) {
    return
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return
  }

  // Handle navigation requests (pages)
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone()
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone)
              })
            }
            return response
          })
          .catch(() => {
            // Return offline page for navigation requests
            return caches.match("/offline.html")
          })
      }),
    )
    return
  }

  // Handle static assets
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request)
      }),
    )
    return
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache and update in background
        fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone()
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone)
              })
            }
          })
          .catch(() => {
            // Network failed, but we have cache
          })

        return cachedResponse
      }

      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
    }),
  )
})

// Background sync for medication reminders
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag)

  if (event.tag === "medication-reminder") {
    event.waitUntil(
      // Handle offline medication tracking
      handleOfflineMedicationSync(),
    )
  }
})

// Push notifications for medication reminders
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received")

  const options = {
    body: "Time to take your medication!",
    icon: "/icon-192.jpg",
    badge: "/icon-192.jpg",
    vibrate: [200, 100, 200],
    data: {
      url: "/",
      timestamp: Date.now(),
    },
    actions: [
      {
        action: "taken",
        title: "Mark as Taken",
        icon: "/icon-192.jpg",
      },
      {
        action: "snooze",
        title: "Snooze 15min",
        icon: "/icon-192.jpg",
      },
    ],
  }

  if (event.data) {
    try {
      const data = event.data.json()
      options.body = data.message || options.body
      options.data = { ...options.data, ...data }
    } catch (error) {
      console.error("[SW] Failed to parse push data:", error)
    }
  }

  event.waitUntil(self.registration.showNotification("PillPal Reminder", options))
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action)

  event.notification.close()

  if (event.action === "taken") {
    // Handle medication taken
    event.waitUntil(handleMedicationTaken(event.notification.data))
  } else if (event.action === "snooze") {
    // Handle snooze
    event.waitUntil(handleMedicationSnooze(event.notification.data))
  } else {
    // Open app
    event.waitUntil(clients.openWindow("/"))
  }
})

// Helper functions
async function handleOfflineMedicationSync() {
  try {
    // Sync offline medication data when connection is restored
    console.log("[SW] Syncing offline medication data...")
    // Implementation would sync with backend
  } catch (error) {
    console.error("[SW] Failed to sync medication data:", error)
  }
}

async function handleMedicationTaken(data) {
  try {
    // Mark medication as taken
    console.log("[SW] Marking medication as taken:", data)
    // Implementation would update local storage and sync with backend
  } catch (error) {
    console.error("[SW] Failed to mark medication as taken:", error)
  }
}

async function handleMedicationSnooze(data) {
  try {
    // Snooze medication reminder
    console.log("[SW] Snoozing medication reminder:", data)
    // Implementation would schedule new reminder
  } catch (error) {
    console.error("[SW] Failed to snooze medication:", error)
  }
}
