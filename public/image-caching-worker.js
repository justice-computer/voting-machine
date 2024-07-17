// public/service-worker.js
const CACHE_NAME = "image-cache"
const urlsToCache = [
	// Add any URLs that you want to cache during the installation phase
]

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(urlsToCache)
		}),
	)
})

self.addEventListener("fetch", (event) => {
	if (
		event.request.url.includes(".png") ||
		event.request.url.includes(".jpg") ||
		event.request.url.includes(".jpeg") ||
		event.request.url.includes("appspot.com/o/avatars")
	) {
		event.respondWith(
			caches.match(event.request).then((response) => {
				if (response) {
					return response
				}
				return fetch(event.request).then((networkResponse) => {
					return caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, networkResponse.clone())
						return networkResponse
					})
				})
			}),
		)
	}
})

self.addEventListener("activate", (event) => {
	const cacheWhitelist = [CACHE_NAME]
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheWhitelist.indexOf(cacheName) === -1) {
						return caches.delete(cacheName)
					}
				}),
			)
		}),
	)
})
