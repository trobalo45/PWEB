const CHAVE_TOKEN = 'greenherb.token';

function temToken() {
  try {
    return Boolean(localStorage.getItem(CHAVE_TOKEN));
  } catch {
    return false;
  }
}

function estaOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function devePreferirRemoto() {
  return estaOnline() && temToken();
}

export function modoAtivoStore() {
  return devePreferirRemoto() ? 'remoto' : 'local';
}

function deveCairParaLocal(erro) {
  if (!erro) return false;
  if (erro.estado === 404) return true;
  if (erro.estado === 0 || erro.estado === undefined) return true;
  return false;
}

export function criarFacade(local, remoto, mapa) {
  const resultado = {
    init: () => local.init && local.init(),
    modoAtivo: modoAtivoStore,
  };

  Object.entries(mapa).forEach(([nomePublico, [funcaoLocal, funcaoRemota]]) => {
    resultado[nomePublico] = async function chamar(...args) {
      if (devePreferirRemoto() && remoto && remoto[funcaoRemota]) {
        try {
          return await remoto[funcaoRemota](...args);
        } catch (erro) {
          if (deveCairParaLocal(erro) && local && local[funcaoLocal]) {
            return local[funcaoLocal](...args);
          }
          throw erro;
        }
      }
      if (local && local[funcaoLocal]) {
        return local[funcaoLocal](...args);
      }
      throw new Error(`Operação ${nomePublico} indisponível.`);
    };
  });

  return resultado;
}
