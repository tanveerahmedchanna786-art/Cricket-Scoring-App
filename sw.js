/**
 * sw.js - Bulletproof Service Worker for CricScore Pro
 * Ultra-resilient offline caching compatible with Netlify, GitHub Pages, and localhost.
 */

const CACHE_NAME = 'cricscore-v3';
const ASSETS_TO_CACHE = [
  'index.html',
  'css/style.css',
  'js/models.js',
  'js/storage.js',
  'js/animations.js',
  'js/engine.js',
  'js/demo.js',
  'js/app.js',
  'icon.svg',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Use resilient caching so a single asset failure never breaks the service worker
      await Promise.allSettled(
        ASSETS_TO_CACHE.map(async (url) => {
          try {
            await cache.add(url);
          } catch (e) {
            console.warn('Cache bypass for:', url);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        // Fallback for HTML navigation
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('index.html');
        }
      });
    })
  );
});
