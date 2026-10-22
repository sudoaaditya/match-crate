/*
 * Offline support for the installed app. No precache list to keep in sync with builds:
 * - page loads: network first, so a deploy shows up on the next launch; the cached shell when offline
 * - everything else (hashed JS/CSS, models, textures, levels.json): served from cache at once and
 *   refreshed in the background, so the second launch is instant and works without a connection
 * Bump VERSION to drop everything cached by older builds.
 */
const VERSION = 'match-crate-v1';
const SHELL = ['./', './manifest.webmanifest', './favicon.svg', './icons/icon-192.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

const put = (request, response) => {
    if (response.ok) {
        const copy = response.clone();
        caches.open(VERSION).then(cache => cache.put(request, copy));
    }
    return response;
};

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => put('./', response))
                .catch(() => caches.match('./'))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => {
            const network = fetch(request).then(response => put(request, response));
            if (cached) {
                event.waitUntil(network.catch(() => {}));
                return cached;
            }
            return network;
        })
    );
});
