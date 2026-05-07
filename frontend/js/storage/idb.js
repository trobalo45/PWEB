const DB_NOME = 'greenherb';
const DB_VERSAO = 2;
const STORES = [
  'planos',
  'lotes',
  'tarefas',
  'medicoes',
  'alertas',
  'auditoria',
  'utilizadores',
];

let dbPromise = null;

export function abrirBD() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const pedido = indexedDB.open(DB_NOME, DB_VERSAO);

    pedido.onupgradeneeded = (evento) => {
      const db = evento.target.result;
      STORES.forEach((nome) => {
        if (!db.objectStoreNames.contains(nome)) {
          db.createObjectStore(nome, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      });
    };

    pedido.onsuccess = (evento) => resolve(evento.target.result);
    pedido.onerror = () =>
      reject(new Error('Não foi possível abrir a base de dados local.'));
  });

  return dbPromise;
}

function chaveCoerente(id) {
  if (id === null || id === undefined) return id;
  const numero = Number(id);
  return Number.isFinite(numero) ? numero : id;
}

function comTransacao(storeNome, modo, callback) {
  return abrirBD().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeNome, modo);
        const store = tx.objectStore(storeNome);
        let resultado;

        Promise.resolve(callback(store))
          .then((valor) => {
            resultado = valor;
          })
          .catch(reject);

        tx.oncomplete = () => resolve(resultado);
        tx.onabort = () =>
          reject(tx.error || new Error('Transação cancelada.'));
        tx.onerror = () =>
          reject(tx.error || new Error('Erro na transação.'));
      })
  );
}

export function criarRepositorio(nomeStore) {
  return {
    init: () => abrirBD(),

    listar() {
      return comTransacao(nomeStore, 'readonly', (store) =>
        new Promise((res, rej) => {
          const r = store.getAll();
          r.onsuccess = () => {
            const lista = r.result || [];
            lista.sort((a, b) => {
              const da = new Date(a.dataCriacao || 0).getTime();
              const dbk = new Date(b.dataCriacao || 0).getTime();
              return dbk - da;
            });
            res(lista);
          };
          r.onerror = () => rej(r.error || new Error('Erro ao listar.'));
        })
      );
    },

    obter(id) {
      return comTransacao(nomeStore, 'readonly', (store) =>
        new Promise((res, rej) => {
          const r = store.get(chaveCoerente(id));
          r.onsuccess = () => res(r.result || null);
          r.onerror = () => rej(r.error || new Error('Erro ao obter.'));
        })
      );
    },

    guardar(item) {
      const dados = { ...item };
      if (!dados.dataCriacao) dados.dataCriacao = new Date().toISOString();
      return comTransacao(nomeStore, 'readwrite', (store) =>
        new Promise((res, rej) => {
          const r = dados.id != null ? store.put(dados) : store.add(dados);
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error || new Error('Erro ao guardar.'));
        })
      );
    },

    atualizar(id, alteracoes) {
      const chave = chaveCoerente(id);
      return comTransacao(nomeStore, 'readwrite', (store) =>
        new Promise((res, rej) => {
          const get = store.get(chave);
          get.onsuccess = () => {
            const existente = get.result;
            if (!existente) {
              res(null);
              return;
            }
            const atualizado = {
              ...existente,
              ...alteracoes,
              id: existente.id,
            };
            const put = store.put(atualizado);
            put.onsuccess = () => res(atualizado);
            put.onerror = () =>
              rej(put.error || new Error('Erro ao atualizar.'));
          };
          get.onerror = () =>
            rej(get.error || new Error('Erro ao ler para atualizar.'));
        })
      );
    },

    eliminar(id) {
      return comTransacao(nomeStore, 'readwrite', (store) =>
        new Promise((res, rej) => {
          const r = store.delete(chaveCoerente(id));
          r.onsuccess = () => res();
          r.onerror = () => rej(r.error || new Error('Erro ao eliminar.'));
        })
      );
    },

    contar() {
      return comTransacao(nomeStore, 'readonly', (store) =>
        new Promise((res, rej) => {
          const r = store.count();
          r.onsuccess = () => res(r.result || 0);
          r.onerror = () => rej(r.error || new Error('Erro ao contar.'));
        })
      );
    },
  };
}
