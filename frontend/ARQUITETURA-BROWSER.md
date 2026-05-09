# Arquitetura de Armazenamento no Browser — GreenHerb

## 1. Visão Geral

| Mecanismo | Tipo | Capacidade típica | Síncrono | O que armazena |
| --- | --- | --- | --- | --- |
| `localStorage` | chave/valor | ~5–10 MB | sim | Token JWT, utilizador autenticado, preferências de UI |
| `sessionStorage` | chave/valor | ~5 MB (por aba) | sim | Não usado neste projeto |
| IndexedDB | base de dados estruturada | ~100 MB+ | não (Promise) | Planos, lotes, tarefas, medições, alertas, logs, utilizadores |
| Cache API | cache HTTP | ~50 MB+ | não (Promise) | Recursos estáticos (HTML/CSS/JS) e respostas GET da API |

## 2. localStorage

- **O que guarda**:
  - `greenherb.token` — token JWT recebido após login.
  - `greenherb.utilizador` — objeto JSON do utilizador autenticado (nome, email, perfil, ativo).
  - `greenherb.ultimaVista` — última rota visitada para restauração ao reabrir.
  - `greenherb.vistaPlanos` — modo de listagem (`grelha`/`lista`).
  - `greenherb.vistaLotes` — idem para lotes.
  - `greenherb.modoAutomacao` — `manual`/`auto` para a vista de alertas.
- **Porquê**: é simples, síncrono e adequado para pequenos valores de configuração e preferências de UI que precisam de estar disponíveis imediatamente no arranque da SPA, sem promessas nem migrações de schema.
- **Expiração**: o token JWT expira em 8 horas (validado pelo servidor); as preferências de UI não expiram.
- **Invalidação**: ao fazer logout, `greenherb.token` e `greenherb.utilizador` são removidos. As preferências persistem até o utilizador limpar manualmente os dados do site.
- **Comportamento offline**: disponível sempre — não depende de rede.
- **Decisão JWT**: armazenado em `localStorage` por simplicidade numa SPA sem servidor de sessão. Trade-off aceite — vulnerável a XSS, mas mitigado por não haver dados sensíveis acessíveis para além do próprio token e pelo contexto de utilização (rede local de estufa).

## 3. sessionStorage

- Não utilizado neste projeto de forma explícita.
- **Justificação**: o estado de formulários multi-passo (wizard de criação de plano, modais de criação de lote/tarefa/medição, modal de edição de utilizador) é gerido em memória, em variáveis dos módulos de cada vista, por ser mais simples e suficiente para o âmbito do projeto. A vida útil do estado coincide com a permanência na vista, e a navegação para outra vista limpa-o naturalmente.

## 4. IndexedDB

- **O que guarda**: todos os dados de domínio quando se opera offline ou sem token — planos, lotes, tarefas, medições, alertas, logs de auditoria e utilizadores (cache local e fila offline).
- **Base de dados**: `greenherb` na versão 2; um único `IDBDatabase` partilhado, com 7 object stores (`planos`, `lotes`, `tarefas`, `medicoes`, `alertas`, `auditoria`, `utilizadores`), todos com `keyPath: 'id'` e `autoIncrement`.
- **Porquê**: suporta grandes volumes de dados estruturados, permite queries (`getAll`, `get(id)`), funciona offline e é assíncrono não-bloqueante, ao contrário do `localStorage`.
- **Expiração**: sem expiração automática. Dados são substituídos quando sincronizados com a API (cada chamada à API que tenha sucesso devolve a versão autoritativa).
- **Sincronização**: a *facade* em `js/storage/criarStore.js` decide em cada operação — se está online com token válido, usa a API; caso contrário, usa o IndexedDB. Ao voltar online, os dados locais ficam disponíveis mas **não** são automaticamente enviados para o servidor (sincronização manual — pode ser implementada como Background Sync no futuro).
- **Comportamento offline**: todas as operações de leitura e escrita continuam a funcionar; os dados ficam pendentes localmente até voltar online.

## 5. Cache API

- **O que guarda**:
  - `greenherb-static-v1` — recursos estáticos da SPA (HTML, CSS, módulos JS) e recursos externos (Tabler Icons, Google Fonts, SheetJS quando carregado dinamicamente).
  - `greenherb-api-v1` — respostas GET aos endpoints `/api/planos`, `/api/lotes`, `/api/tarefas`, `/api/medicoes`, `/api/alertas`, `/api/ervas`.
- **Porquê**: permite que a aplicação carregue sem rede e que os últimos dados consultados estejam disponíveis offline, mesmo antes de o IndexedDB ter sido populado.
- **Estratégia para estáticos**: *Cache First* — serve da cache, vai à rede em fallback e atualiza a cache em background. Apropriado para recursos cuja versão é controlada pelo nome da cache (`v1`).
- **Estratégia para a API**: *Network First* — tenta a rede; se falhar, cai para a cache; se não houver cópia em cache, devolve `503` com JSON `{ "erro": "Sem ligação ao servidor" }`. Apenas pedidos `GET` são cacheados; `POST`/`PUT`/`DELETE` passam directos sem cache.
- **Estratégia para CDN**: *Cache First* com fallback silencioso — primeiro acesso vai à rede e cacheia; subsequentes servem da cache. Em offline, falhas são silenciosas (resposta vazia).
- **Expiração**: a cache estática é atualizada quando o Service Worker é reinstalado (incrementar o sufixo `v1` → `v2` invalida tudo). A cache da API é substituída a cada resposta bem-sucedida do mesmo endpoint.
- **Invalidação**: o evento `activate` do Service Worker remove qualquer cache cujo nome não esteja na lista `[CACHE_ESTATICA, CACHE_API]`.

## 6. Política de Token JWT

- **Armazenado em**: `localStorage`, na chave `greenherb.token`.
- **Alternativas consideradas**:
  - *Cookie httpOnly*: mais seguro contra XSS (inacessível a JavaScript), mas requer configuração de servidor (`Set-Cookie`) e CORS com `credentials: true`, o que era incompatível com `CORS_ORIGIN=*` no estágio actual de desenvolvimento.
  - *sessionStorage*: perdido ao fechar o separador, o que prejudica a UX de uma aplicação que queremos sempre disponível.
- **Decisão**: `localStorage` foi escolhido por simplicidade de implementação numa SPA pura sem servidor de sessão dedicado. O risco de XSS é mitigado pelo contexto de uso (rede local de estufa, não exposição pública) e pelo facto de o token ter um TTL curto (8h).
- **Expiração**: 8 horas (definido no servidor em `JWT_EXPIRES_IN`).
- **Invalidação**: removido ao fazer logout (`greenherb.token` e `greenherb.utilizador`); pedidos com token expirado recebem `401` do servidor e o utilizador é redireccionado para `#login`.

## 7. Comportamento em Caso de Falha de Rede

- A SPA continua a funcionar com dados do **IndexedDB**.
- O **Service Worker** serve recursos estáticos da cache (a SPA carrega na mesma).
- Respostas `GET` recentes da API estão disponíveis através da **Cache API** (via `Network First`).
- O **indicador Online/Offline** na topbar (escuta `window.online`/`offline`) alerta o utilizador.
- Operações de **escrita** (`POST`/`PUT`/`DELETE`) falham silenciosamente para o servidor e ficam apenas no **IndexedDB local** — quando o utilizador voltar online, terá de sincronizar manualmente (a sincronização automática está fora do âmbito desta versão).
