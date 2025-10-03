const CACHE_NAME = 'ceres-gym-v1'
const STATIC_CACHE_URLS = [
  '/',
  '/login',
  '/dashboard',
  '/admin',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

const DYNAMIC_CACHE_NAME = 'ceres-gym-dynamic-v1'
const API_CACHE_NAME = 'ceres-gym-api-v1'

// Install service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error)
      })
  )
})

// Activate service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== API_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip requests to external domains
  if (url.origin !== location.origin) {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStaticAssets(request))
  } else {
    event.respondWith(handlePageRequest(request))
  }
})

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME)
  
  try {
    console.log('[SW] Fetching API request:', request.url)
    const response = await fetch(request)
    
    // Only cache successful GET requests
    if (response.status === 200 && request.method === 'GET') {
      // Don't cache sensitive endpoints
      const sensitiveEndpoints = ['/api/auth/', '/api/payments/']
      const isSensitive = sensitiveEndpoints.some(endpoint => 
        request.url.includes(endpoint)
      )
      
      if (!isSensitive) {
        cache.put(request, response.clone())
      }
    }
    
    return response
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', request.url)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for critical endpoints
    if (request.url.includes('/api/children') || 
        request.url.includes('/api/invoices')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Offline - data unavailable',
          offline: true
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    throw error
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAssets(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const response = await fetch(request)
    cache.put(request, response.clone())
    return response
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', request.url)
    throw error
  }
}

// Handle page requests with network-first, fallback to cache
async function handlePageRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME)
  
  try {
    console.log('[SW] Fetching page:', request.url)
    const response = await fetch(request)
    
    // Cache successful page responses
    if (response.status === 200) {
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.log('[SW] Network failed for page, trying cache:', request.url)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Fallback to cached home page for navigation requests
    if (request.mode === 'navigate') {
      const homeResponse = await cache.match('/')
      if (homeResponse) {
        return homeResponse
      }
    }
    
    // Return offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Ceres Gymnastics</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, sans-serif; 
              text-align: center; 
              padding: 2rem; 
              background: #f3f4f6;
            }
            .container { 
              max-width: 400px; 
              margin: 0 auto; 
              background: white; 
              padding: 2rem; 
              border-radius: 8px; 
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            h1 { color: #374151; margin-bottom: 1rem; }
            p { color: #6b7280; margin-bottom: 1.5rem; }
            button { 
              background: #7c3aed; 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 6px; 
              cursor: pointer;
              font-size: 1rem;
            }
            button:hover { background: #6d28d9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🏃</div>
            <h1>You're Offline</h1>
            <p>It looks like you're not connected to the internet. Some features may not be available.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>`,
      {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'background-sync-payments') {
    event.waitUntil(syncPayments())
  }
})

// Sync offline payments when online
async function syncPayments() {
  try {
    // Check if we have any pending payments to sync
    const cache = await caches.open(API_CACHE_NAME)
    // Implementation would sync any offline payment data
    console.log('[SW] Syncing offline payments...')
  } catch (error) {
    console.error('[SW] Failed to sync payments:', error)
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Ceres Gymnastics',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification('Ceres Gymnastics Club', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action)
  
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    )
  }
})

console.log('[SW] Service worker loaded successfully')