import { criarRepositorio } from './idb.js';

const repo = criarRepositorio('utilizadores');

export const init = () => repo.init();
export const listarUtilizadores = () => repo.listar();
export const obterUtilizador = (id) => repo.obter(id);
export const guardarUtilizador = (utilizador) => repo.guardar(utilizador);
export const atualizarUtilizador = (id, alteracoes) =>
  repo.atualizar(id, alteracoes);
export const eliminarUtilizador = (id) => repo.eliminar(id);
export const contarUtilizadores = () => repo.contar();
