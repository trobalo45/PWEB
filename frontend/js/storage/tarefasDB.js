import { criarRepositorio } from './idb.js';

const repo = criarRepositorio('tarefas');

export const init = () => repo.init();
export const listarTarefas = () => repo.listar();
export const obterTarefa = (id) => repo.obter(id);
export const guardarTarefa = (tarefa) => repo.guardar(tarefa);
export const atualizarTarefa = (id, alteracoes) =>
  repo.atualizar(id, alteracoes);
export const eliminarTarefa = (id) => repo.eliminar(id);
