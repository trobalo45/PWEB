import * as local from './auditoriaDB.js';
import * as remoto from '../api/auditoriaAPI.js';
import { criarFacade } from './criarStore.js';

const facade = criarFacade(local, remoto, {
  listar: ['listarLogs', 'listarLogs'],
  guardar: ['guardarLog', 'guardarLog'],
});

export const init = facade.init;
export const modoAtivo = facade.modoAtivo;
export const listarLogs = facade.listar;
export const guardarLog = facade.guardar;

export async function registar(acao, detalhes = {}) {
  let utilizador = null;
  try {
    const json = localStorage.getItem('greenherb.utilizador');
    if (json) utilizador = JSON.parse(json);
  } catch {
    /* ignorar */
  }

  const log = {
    acao,
    utilizadorNome: utilizador?.nome || 'Anónimo',
    utilizadorEmail: utilizador?.email || '',
    perfil: utilizador?.perfil || '',
    detalhes,
    dataCriacao: new Date().toISOString(),
  };

  try {
    await guardarLog(log);
  } catch (erro) {
    console.warn('[auditoria] não foi possível registar:', erro.message);
  }
}
