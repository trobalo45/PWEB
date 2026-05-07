const DB_NOME = 'greenherb';
const DB_VERSAO = 1;
const STORE_PLANOS = 'planos';

let dbPromise = null;

export function init() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const pedido = indexedDB.open(DB_NOME, DB_VERSAO);

    pedido.onupgradeneeded = (evento) => {
      const db = evento.target.result;
      if (!db.objectStoreNames.contains(STORE_PLANOS)) {
        const store = db.createObjectStore(STORE_PLANOS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('tipo', 'tipo', { unique: false });
        store.createIndex('estado', 'estado', { unique: false });
        store.createIndex('dataCriacao', 'dataCriacao', { unique: false });
      }
    };

    pedido.onsuccess = (evento) => resolve(evento.target.result);
    pedido.onerror = (evento) =>
      reject(new Error('Não foi possível abrir a base de dados local.'));
  });

  return dbPromise;
}

function comTransacao(modo, callback) {
  return init().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PLANOS, modo);
        const store = tx.objectStore(STORE_PLANOS);
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

export function guardarPlano(plano) {
  const registo = {
    ...plano,
    dataCriacao: plano.dataCriacao || new Date().toISOString(),
    estado: plano.estado || 'ativo',
  };

  return comTransacao('readwrite', (store) =>
    new Promise((resolve, reject) => {
      const pedido = store.add(registo);
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () =>
        reject(pedido.error || new Error('Erro ao guardar o plano.'));
    })
  );
}

export function obterPlano(id) {
  const numerico = Number(id);
  if (!Number.isFinite(numerico)) {
    return Promise.resolve(null);
  }
  return comTransacao('readonly', (store) =>
    new Promise((resolve, reject) => {
      const pedido = store.get(numerico);
      pedido.onsuccess = () => resolve(pedido.result || null);
      pedido.onerror = () =>
        reject(pedido.error || new Error('Erro ao ler o plano.'));
    })
  );
}

export function listarPlanos() {
  return comTransacao('readonly', (store) =>
    new Promise((resolve, reject) => {
      const pedido = store.getAll();
      pedido.onsuccess = () => {
        const lista = pedido.result || [];
        lista.sort((a, b) => {
          const da = new Date(a.dataCriacao).getTime();
          const db = new Date(b.dataCriacao).getTime();
          return db - da;
        });
        resolve(lista);
      };
      pedido.onerror = () =>
        reject(pedido.error || new Error('Erro ao ler os planos.'));
    })
  );
}

export function eliminarPlano(id) {
  const numerico = Number(id);
  const chave = Number.isFinite(numerico) ? numerico : id;
  return comTransacao('readwrite', (store) =>
    new Promise((resolve, reject) => {
      const pedido = store.delete(chave);
      pedido.onsuccess = () => resolve();
      pedido.onerror = () =>
        reject(pedido.error || new Error('Erro ao eliminar o plano.'));
    })
  );
}
