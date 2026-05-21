import { criarRepositorio } from './idb.js';

const repo = criarRepositorio('ervas');

export const init = () => repo.init();
export const listarErvas = () => repo.listar();
export const obterErva = (id) => repo.obter(id);
export const guardarErva = (erva) => repo.guardar(erva);
export const atualizarErva = (id, alteracoes) => repo.atualizar(id, alteracoes);
export const eliminarErva = (id) => repo.eliminar(id);
