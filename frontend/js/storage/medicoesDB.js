import { criarRepositorio } from './idb.js';

const repo = criarRepositorio('medicoes');

export const init = () => repo.init();
export const listarMedicoes = () => repo.listar();
export const obterMedicao = (id) => repo.obter(id);
export const guardarMedicao = (medicao) => repo.guardar(medicao);
export const atualizarMedicao = (id, alteracoes) =>
  repo.atualizar(id, alteracoes);
export const eliminarMedicao = (id) => repo.eliminar(id);
