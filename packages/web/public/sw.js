// Service worker mínimo: su única función es habilitar la instalación de la PWA.
// Los navegadores exigen un SW con un handler de `fetch` para considerar la app
// instalable. No cacheamos nada (passthrough a la red) para evitar contenido viejo.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // Sin respondWith: cada request usa la red por defecto.
});
