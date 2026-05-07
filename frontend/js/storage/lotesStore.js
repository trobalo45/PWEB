import * as local from './lotesDB.js';
import * as remoto from '../api/lotesAPI.js';
import { criarFacade } from './criarStore.js';

const facade = criarFacade(local, remoto, {
  listar: ['listarLotes', 'listarLotes'],
  obter: ['obterLote', 'obterLote'],
  guardar: ['guardarLote', 'guardarLote'],
  atualizar: ['atualizarLote', 'atualizarLote'],
  eliminar: ['eliminarLote', 'eliminarLote'],
});

export const init = facade.init;
export const modoAtivo = facade.modoAtivo;
export const listarLotes = facade.listar;
export const obterLote = facade.obter;
export const guardarLote = facade.guardar;
export const atualizarLote = facade.atualizar;
export const eliminarLote = facade.eliminar;
