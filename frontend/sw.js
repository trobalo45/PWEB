/* GreenHerb Service Worker */

const CACHE_ESTATICA = 'greenherb-static-v1';
const CACHE_API = 'greenherb-api-v1';
const CACHES_VALIDAS = [CACHE_ESTATICA, CACHE_API];

const RECURSOS_ESTATICOS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/js/app.js',
  '/js/views/login.js',
  '/js/views/dashboard.js',
  '/js/views/planos.js',
  '/js/views/novoPlano.js',
  '/js/views/detalhePlano.js',
  '/js/views/lotes.js',
  '/js/views/novoLote.js',
  '/js/views/detalheLote.js',
  '/js/views/tarefas.js',
  '/js/views/medicoes.js',
  '/js/views/alertas.js',
  '/js/views/relatorios.js',
  '/js/views/auditoria.js',
  '/js/views/utilizadores.js',
  '/js/storage/idb.js',
  '/js/storage/criarStore.js',
  '/js/storage/planosDB.js',
  '/js/storage/planosStore.js',
  '/js/storage/lotesDB.js',
  '/js/storage/lotesStore.js',
  '/js/storage/tarefasDB.js',
  '/js/storage/tarefasStore.js',
  '/js/storage/medicoesDB.js',
  '/js/storage/medicoesStore.js',
  '/js/storage/alertasDB.js',
  '/js/storage/alertasStore.js',
  '/js/storage/auditoriaDB.js',
  '/js/storage/auditoriaStore.js',
  '/js/storage/utilizadoresDB.js',
  '/js/storage/utilizadoresStore.js',
  '/js/api/_http.js',
  '/js/api/stubs.js',
  '/js/api/planosAPI.js',
  '/js/api/lotesAPI.js',
  '/js/api/tarefasAPI.js',
  '/js/api/medicoesAPI.js',
  '/js/api/alertasAPI.js',
  '/js/api/auditoriaAPI.js',
  '/js/api/utilizadoresAPI.js',
];

const ENDPOINTS_API_CACHE = [
  '/api/planos',
  '/api/lotes',
  '/api/tarefas',
  '/api/medicoes',
  '/api/alertas',
  '/api/ervas',
];

function ehPedidoAPI(url) {
  return url.port === '5000' || url.pathname.startsWith('/api/');
}

function ehMesmoOrigem(url) {
  return url.origin === self.location.origin;
}

function devePoderCachearAPI(url) {
  return ENDPOINTS_API_CACHE.some((ep) => url.pathname.startsWith(ep));
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_ESTATICA);
      const resultados = await Promise.allSettled(
        RECURSOS_ESTATICOS.map((r) => cache.add(r))
      );
      resultados.forEach((res, i) => {
        if (res.status === 'rejected') {
          console.warn(
            '[SW] falha a pré-cachear',
            RECURSOS_ESTATICOS[i],
            res.reason
          );
        }
      });
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const chaves = await caches.keys();
      await Promise.all(
        chaves
          .filter((k) => !CACHES_VALIDAS.includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

async function tratarEstatico(request) {
  const cache = await caches.open(CACHE_ESTATICA);
  const cacheado = await cache.match(request);
  if (cacheado) {
    return cacheado;
  }
  try {
    const resposta = await fetch(request);
    if (resposta && resposta.ok && request.method === 'GET') {
      try {
        await cache.put(request, resposta.clone());
      } catch {
        /* ignorar — algumas respostas não podem ser cacheadas */
      }
    }
    return resposta;
  } catch (erro) {
    return new Response(
      'Recurso indisponível e sem cópia em cache.',
      { status: 503, statusText: 'Offline' }
    );
  }
}

function respostaErroAPI() {
  return new Response(
    JSON.stringify({ erro: 'Sem ligação ao servidor' }),
    {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
}

async function tratarAPI(request, url) {
  if (request.method !== 'GET') {
    try {
      return await fetch(request);
    } catch (erro) {
      return respostaErroAPI();
    }
  }

  try {
    const resposta = await fetch(request);
    if (resposta && resposta.ok && devePoderCachearAPI(url)) {
      try {
        const cache = await caches.open(CACHE_API);
        await cache.put(request, resposta.clone());
      } catch {
        /* ignorar */
      }
    }
    return resposta;
  } catch (erro) {
    const cache = await caches.open(CACHE_API);
    const cacheado = await cache.match(request);
    if (cacheado) return cacheado;
    return respostaErroAPI();
  }
}

async function tratarExterno(request) {
  const cache = await caches.open(CACHE_ESTATICA);
  const cacheado = await cache.match(request);
  if (cacheado) return cacheado;
  try {
    const resposta = await fetch(request);
    if (resposta && resposta.ok && request.method === 'GET') {
      try {
        await cache.put(request, resposta.clone());
      } catch {
        /* ignorar — respostas opacas/cross-origin podem rejeitar */
      }
    }
    return resposta;
  } catch (erro) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (evento) => {
  const request = evento.request;
  if (request.method === 'GET' && request.cache === 'only-if-cached') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (ehPedidoAPI(url)) {
    evento.respondWith(tratarAPI(request, url));
    return;
  }

  if (ehMesmoOrigem(url)) {
    evento.respondWith(tratarEstatico(request));
    return;
  }

  evento.respondWith(tratarExterno(request));
});
