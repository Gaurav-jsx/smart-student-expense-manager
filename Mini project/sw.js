/* =========================================
   SMART STUDENT EXPENSE MANAGER
   File: sw.js
   Service Worker for 100% Offline PWA Shell
========================================= */

const CACHE_VERSION = 'smartspend-v2.1';
const APP_SHELL_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.webmanifest',
    './icons/icon.svg',
    './js/constants.js',
    './js/utils.js',
    './js/storage.js',
    './js/insights.js',
    './js/parser.js',
    './js/charts.js',
    './js/ui.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            return cache.addAll(APP_SHELL_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_VERSION) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Only intercept same-origin or local requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Fetch in background to update cache for next time
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_VERSION).then((cache) => {
                            cache.put(event.request, networkResponse);
                        });
                    }
                }).catch(() => {
                    // Ignore offline network failure when cached version exists
                });
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_VERSION).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            });
        }).catch(() => {
            // Offline fallback
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});

