const CACHE_NAME = 'initflow-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/index.css',
  '/src/components/RosterManager.jsx',
  '/src/components/InitiativeBuilder.jsx',
  '/src/components/CombatPanel.jsx',
  '/src/components/StatsDashboard.jsx',
  '/src/components/HistoryPanel.jsx',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(err => {
        // Assets cache failed, likely because of active dev reload files, but continue
      });
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
