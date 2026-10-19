/* DO Transfert — service worker (PWA).
 * Pages : réseau d'abord, copie en cache si hors ligne, sinon page « hors ligne ».
 * Fichiers du site : servis depuis le cache puis mis à jour en arrière-plan.
 * Polices Google : cache permanent. Carte, itinéraire, adresses : toujours en ligne.
 * Changez VERSION à chaque mise en ligne pour forcer la mise à jour des fichiers.
 */
const VERSION = "dot-v1";
const STATIC_CACHE = VERSION + "-static";
const FONT_CACHE = "dot-fonts";

const PRECACHE = [
  "./",
  "index.html",
  "reservation.html",
  "offline.html",
  "manifest.webmanifest",
  "assets/css/styles.css",
  "assets/js/icons.js",
  "assets/js/config.js",
  "assets/js/app.js",
  "assets/js/booking.js",
  "assets/vendor/leaflet/leaflet.css",
  "assets/vendor/leaflet/leaflet.js",
  "assets/img/favicon.svg",
  "assets/img/icons/icon-192.png",
  "assets/img/icons/icon-512.png",
  "assets/img/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("dot-") && k !== STATIC_CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Polices Google : cache d'abord (fichiers immuables)
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((hit) => hit || fetch(req).then((res) => {
          if (res.ok || res.type === "opaque") cache.put(req, res.clone());
          return res;
        }))
      )
    );
    return;
  }

  // Autres domaines (carte, itinéraire, adresses, WhatsApp…) : réseau uniquement
  if (url.origin !== self.location.origin) return;

  // Pages : réseau d'abord, cache ensuite (sans tenir compte des paramètres d'URL), puis page hors ligne
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(url.pathname, copy));
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true })
            .then((hit) => hit || caches.match("offline.html"))
        )
    );
    return;
  }

  // Fichiers du site : cache immédiat, mise à jour en arrière-plan
  event.respondWith(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((hit) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    )
  );
});
