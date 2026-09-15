/* 35MaktabTools Service Worker — offline shell + tez ochilish.
   Strategiya:
   - App shell (html/css/js/assets/manifest): cache-first, orqa fonda yangilanadi
   - Firebase CDN / Google Fonts: stale-while-revalidate
   - Navigatsiya: network-first, offline bo'lsa keshdagi sahifa yoki offline.html
   CACHE_VERSION o'zgarsa eski kesh tozalanadi.
*/

const CACHE_VERSION = 'mt-v5';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Birinchi o'rnatishda keshlanadigan asosiy fayllar
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './app.js',
  './shared/theme.css',
  './shared/shell.js',
  './shared/auth.js',
  './shared/data.js',
  './shared/firebase-config.js',
  './shared/icons.js',
  './shared/tools-registry.js',
  './login/',
  './login/index.html',
  './login/app.js',
  './settings/',
  './settings/index.html',
  './settings/app.js',
  './sinflar/',
  './sinflar/index.html',
  './sinflar/app.js',
  './tools/ism-tanlash/',
  './tools/ism-tanlash/index.html',
  './tools/ism-tanlash/app.js',
  './assets/favicon.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isShellAsset(url) {
  if (!isSameOrigin(url)) return false;
  const p = url.pathname;
  return (
    p.endsWith('.css') ||
    p.endsWith('.js') ||
    p.endsWith('.png') ||
    p.endsWith('.svg') ||
    p.endsWith('.json') ||
    p.endsWith('.woff2') ||
    p.endsWith('/') ||
    p.endsWith('.html')
  );
}

function isCdn(url) {
  const h = url.hostname;
  return (
    h.includes('gstatic.com') ||
    h.includes('googleapis.com') ||
    h.includes('firebaseio.com') ||
    h.includes('firestore.googleapis.com')
  );
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    // Orqa fonda yangilash
    fetch(request).then((res) => {
      if (res && res.ok) {
        caches.open(cacheName).then((c) => c.put(request, res));
      }
    }).catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(cacheName).then((c) => c.put(request, copy));
    }
    return res;
  } catch {
    return caches.match('./offline.html');
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return cached || network || new Response('', { status: 504 });
}

async function networkFirstNav(request) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Directory index fallback
    const url = new URL(request.url);
    if (url.pathname.endsWith('/')) {
      const idx = await caches.match(url.pathname + 'index.html');
      if (idx) return idx;
    }
    return caches.match('./offline.html');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Firestore/Auth API — hech qachon SW orqali keshlanmasin
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.pathname.includes('/google.firestore')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNav(request));
    return;
  }

  if (isCdn(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  if (isShellAsset(url)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }
});

// Yangi SW mavjudligida clientlarga xabar (ixtiyoriy UI)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
