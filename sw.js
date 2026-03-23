const CACHE_NAME = 'relojes-premium-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './Tienda importacion de relojs.css'
];
const DYNAMIC_CACHE = 'relojes-dynamic-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) return caches.delete(key);
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Estrategia: Cache First para recursos estáticos, Network First para API
  if (APP_SHELL.includes(url.pathname) || url.pathname === '/' || url.pathname.includes('manifest.json')) {
    // Cache First para recursos de la app
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        }).catch(() => caches.match('./index.html'));
      })
    );
  } else if (url.href.includes('docs.google.com') || url.href.includes('lh3.googleusercontent.com')) {
    // Network First para imágenes externas y API
    event.respondWith(
      fetch(event.request).then((response) => {
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, responseClone));
        return response;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
  } else {
    // Stale While Revalidate para otros recursos
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, responseClone));
          return response;
        });
        return cached || fetchPromise;
      })
    );
  }
});

// Manejo de notificaciones push (opcional)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nuevos productos disponibles!',
    icon: 'https://i.postimg.cc/HLt7Kqk1/Untitled-(1).png',
    badge: 'https://i.postimg.cc/HLt7Kqk1/Untitled-(1).png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver catálogo',
        icon: 'https://i.postimg.cc/HLt7Kqk1/Untitled-(1).png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: 'https://i.postimg.cc/HLt7Kqk1/Untitled-(1).png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Relojes Premium', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/catalogo/index.html')
    );
  }
});
