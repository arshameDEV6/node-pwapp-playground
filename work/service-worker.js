var
    appShellCacheName = 'your-first-pwa-step-2-shell',
    appDataCacheName = 'your-first-pwa-step-2-data';
var
    filesToCache = [
        '/favicon.ico',
        '/',
        '/index.html',
        '/scripts/app.js',
        '/styles/inline.css',
        '/images/clear.png',
        '/images/cloudy-scattered-showers.png',
        '/images/cloudy.png',
        '/images/fog.png',
        '/images/ic_add_white_24px.svg',
        '/images/ic_refresh_white_24px.svg',
        '/images/partly-cloudy.png',
        '/images/rain.png',
        '/images/scattered-showers.png',
        '/images/sleet.png',
        '/images/snow.png',
        '/images/thunderstorm.png',
        '/images/wind.png'
    ],
    dataUrl = 'api.openweathermap.org/data';

self.addEventListener('install', function(e) {
    console.log('[ServiceWorker] Install');

    e.waitUntil(
        caches.open(appShellCacheName).then(function(cache) {
            console.log('[ServiceWorker] Caching app shell');
            return cache.addAll(filesToCache);
        })
    );
});

self.addEventListener('activate', function(e) {
    console.log('[ServiceWorker] Activate');

    e.waitUntil(
        caches.keys().then(function(keyList) {
            return Promise.all(keyList.map(function(key) {

                // Delete caches we no longer use
                if (key !== appShellCacheName && key !== appDataCacheName) {
                    console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );

    // This activates the service worker quicker
    return self.clients.claim();
});

self.addEventListener('fetch', function(e) {
    console.log('[ServiceWorker] Fetch', e.request.url);

    // Intercept the fetch requests
    if (e.request.url.includes(dataUrl)) {
        /*
         * When the request URL contains dataUrl, the app is asking for fresh
         * weather data. In this case, the service worker always goes to the
         * network and then caches the response. This is called the "Cache then
         * network" strategy:
         * https://jakearchibald.com/2014/offline-cookbook/#cache-then-network
         */
        e.respondWith(
            caches.open(appDataCacheName).then(function(cache) {
                return fetch(e.request).then(function(response){
                    // We need to clone the response since request bodies are streams and can only be consumed once
                    cache.put(e.request.url, response.clone());
                    return response;
                });
            })
        );
    } else {
        /*
         * The app is asking for app shell files. In this scenario the app uses the
         * "Cache, falling back to the network" offline strategy:
         * https://jakearchibald.com/2014/offline-cookbook/#cache-falling-back-to-network
         */
        e.respondWith(
            caches.match(e.request).then(function(response) {
                return response || fetch(e.request);
            })
        );
    }
});