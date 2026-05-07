import * as local from './medicoesDB.js';
import * as remoto from '../api/medicoesAPI.js';
import { criarFacade } from './criarStore.js';

const facade = criarFacade(local, remoto, {
  listar: ['listarMedicoes', 'listarMedicoes'],
  obter: ['obterMedicao', 'obterMedicao'],
  guardar: ['guardarMedicao', 'guardarMedicao'],
  atualizar: ['atualizarMedicao', 'atualizarMedicao'],
  eliminar: ['eliminarMedicao', 'eliminarMedicao'],
});

export const init = facade.init;
export const modoAtivo = facade.modoAtivo;
export const listarMedicoes = facade.listar;
export const obterMedicao = facade.obter;
export const guardarMedicao = facade.guardar;
export const atualizarMedicao = facade.atualizar;
export const eliminarMedicao = facade.eliminar;
