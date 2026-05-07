import * as local from './alertasDB.js';
import * as remoto from '../api/alertasAPI.js';
import { criarFacade } from './criarStore.js';

const facade = criarFacade(local, remoto, {
  listar: ['listarAlertas', 'listarAlertas'],
  obter: ['obterAlerta', 'obterAlerta'],
  guardar: ['guardarAlerta', 'guardarAlerta'],
  atualizar: ['atualizarAlerta', 'atualizarAlerta'],
  eliminar: ['eliminarAlerta', 'eliminarAlerta'],
});

export const init = facade.init;
export const modoAtivo = facade.modoAtivo;
export const listarAlertas = facade.listar;
export const obterAlerta = facade.obter;
export const guardarAlerta = facade.guardar;
export const atualizarAlerta = facade.atualizar;
export const eliminarAlerta = facade.eliminar;
