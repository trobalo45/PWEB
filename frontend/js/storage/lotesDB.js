import { criarRepositorio } from './idb.js';

const repo = criarRepositorio('lotes');

export const init = () => repo.init();
export const listarLotes = () => repo.listar();
export const obterLote = (id) => repo.obter(id);
export const guardarLote = (lote) => repo.guardar(lote);
export const atualizarLote = (id, alteracoes) => repo.atualizar(id, alteracoes);
export const eliminarLote = (id) => repo.eliminar(id);
