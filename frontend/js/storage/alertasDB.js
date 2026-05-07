import { criarRepositorio } from './idb.js';

const repo = criarRepositorio('alertas');

export const init = () => repo.init();
export const listarAlertas = () => repo.listar();
export const obterAlerta = (id) => repo.obter(id);
export const guardarAlerta = (alerta) => repo.guardar(alerta);
export const atualizarAlerta = (id, alteracoes) =>
  repo.atualizar(id, alteracoes);
export const eliminarAlerta = (id) => repo.eliminar(id);
