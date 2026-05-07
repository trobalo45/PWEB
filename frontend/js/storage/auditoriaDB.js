import { criarRepositorio } from './idb.js';

const repo = criarRepositorio('auditoria');

export const init = () => repo.init();
export const listarLogs = () => repo.listar();
export const guardarLog = (log) => repo.guardar(log);
export const eliminarLog = (id) => repo.eliminar(id);
