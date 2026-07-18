const CACHE_NAME = 'lms-offline-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/vite.svg',
    '/src/main.jsx',
    '/src/App.jsx',
    '/src/index.css'
];

// Install Event: cache static shell resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pre-caching static app shell');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate Event: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event: Optimized strategies (Stale-While-Revalidate for assets, Network-First for documents)
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Skip API, sockets, and non-GET requests
    if (requestUrl.pathname.startsWith('/api') || 
        requestUrl.pathname.startsWith('/socket.io') ||
        event.request.method !== 'GET') {
        return;
    }

    const isStaticAsset = 
        requestUrl.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf)$/) ||
        requestUrl.pathname.includes('/assets/') ||
        requestUrl.pathname.includes('/src/');

    if (isStaticAsset) {
        // Stale-While-Revalidate: Serve from cache instantly, fetch and update in background
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => null); // Fail silently in background if offline

                return cachedResponse || fetchPromise;
            })
        );
    } else {
        // Network-First: Fetch latest document from network, update cache, fallback to cache offline
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fetch failed (offline) - return matching item in cache
                    return caches.match(event.request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // SPA Routing fallback: serve index.html for page navigation offline
                        if (event.request.headers.get('accept')?.includes('text/html')) {
                            return caches.match('/index.html').then((fallback) => {
                                if (fallback) return fallback;
                                return new Response('Offline: Page not cached.', {
                                    status: 503,
                                    statusText: 'Service Unavailable',
                                    headers: { 'Content-Type': 'text/html' }
                                });
                            });
                        }
                        return new Response('Offline: Network connection lost.', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
                })
        );
    }
});
