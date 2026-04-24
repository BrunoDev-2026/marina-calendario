const CACHE_NAME = "marina-buchardt-v1";
const ASSETS = [
    "/",
    "/static/style.css",
    "/static/script.js",
    "/static/manifest.json",
    "/static/calendario_marina_logo.png",
];

// ── Install: pré-cache dos assets estáticos ──────────────────────────────────
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    // Ativa imediatamente sem esperar o SW antigo terminar
    self.skipWaiting();
});

// ── Activate: limpa caches antigos ───────────────────────────────────────────
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    // Toma controle das páginas abertas imediatamente
    self.clients.claim();
});

// ── Fetch: Cache-first para assets, Network-first para API ───────────────────
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Requisições de API nunca são cacheadas
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Para assets estáticos: tenta o cache primeiro, fallback para rede
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                // Cacheia apenas respostas válidas
                if (response && response.status === 200 && response.type === "basic") {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            });
        })
    );
});
