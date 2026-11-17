// Service worker: tiene una copia dell'app sul telefono per aprirla anche senza rete.
// Strategia: prova prima la rete (così gli aggiornamenti arrivano subito),
// se non risponde entro pochi secondi usa la copia salvata.

const CACHE = 'routine-cache-v12';
const FILE_APP = ['./', './index.html', './style.css', './app.js', './dati/maree-venezia.json'];
const ATTESA_RETE_MS = 3000;

// Installazione: salva subito una copia dei file principali
self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILE_APP)));
  self.skipWaiting();
});

// Attivazione: elimina eventuali copie di versioni vecchie
self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(nomi => Promise.all(nomi.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Ogni richiesta di file dell'app passa da qui
self.addEventListener('fetch', evento => {
  const richiesta = evento.request;

  // Gestisce solo le letture dei file del nostro sito
  if (richiesta.method !== 'GET' || new URL(richiesta.url).origin !== self.location.origin) return;

  evento.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const risposta = await Promise.race([
        fetch(richiesta),
        new Promise((_, rifiuta) => setTimeout(() => rifiuta(new Error('rete lenta')), ATTESA_RETE_MS))
      ]);
      if (risposta.ok) cache.put(richiesta, risposta.clone()); // aggiorna la copia
      return risposta;
    } catch {
      const salvata = await cache.match(richiesta, { ignoreSearch: true });
      return salvata || Response.error();
    }
  })());
});