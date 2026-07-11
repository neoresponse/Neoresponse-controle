self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Opcional: Adicionar lógica de cache aqui futuramente se necessário.
  // A presença de um listener de fetch é necessária para atender aos critérios de instalação do PWA.
});
