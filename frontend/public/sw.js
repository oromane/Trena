// Service worker minimal : rend Trena installable (PWA).
// Pas de cache offline pour l'instant — les données doivent rester fraîches.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
