import * as local from './ervasDB.js';
import * as remoto from '../api/ervasAPI.js';
import { criarFacade } from './criarStore.js';

const facade = criarFacade(local, remoto, {
  listar: ['listarErvas', 'listarErvas'],
  obter: ['obterErva', 'obterErva'],
  guardar: ['guardarErva', 'guardarErva'],
  atualizar: ['atualizarErva', 'atualizarErva'],
  eliminar: ['eliminarErva', 'eliminarErva'],
});

export const init = facade.init;
export const modoAtivo = facade.modoAtivo;
export const listarErvas = facade.listar;
export const obterErva = facade.obter;
export const guardarErva = facade.guardar;
export const atualizarErva = facade.atualizar;
export const eliminarErva = facade.eliminar;
