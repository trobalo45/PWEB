import * as local from './tarefasDB.js';
import * as remoto from '../api/tarefasAPI.js';
import { criarFacade } from './criarStore.js';

const facade = criarFacade(local, remoto, {
  listar: ['listarTarefas', 'listarTarefas'],
  obter: ['obterTarefa', 'obterTarefa'],
  guardar: ['guardarTarefa', 'guardarTarefa'],
  atualizar: ['atualizarTarefa', 'atualizarTarefa'],
  eliminar: ['eliminarTarefa', 'eliminarTarefa'],
});

export const init = facade.init;
export const modoAtivo = facade.modoAtivo;
export const listarTarefas = facade.listar;
export const obterTarefa = facade.obter;
export const guardarTarefa = facade.guardar;
export const atualizarTarefa = facade.atualizar;
export const eliminarTarefa = facade.eliminar;
