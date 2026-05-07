import { abrirBD, criarRepositorio } from './idb.js';

const repo = criarRepositorio('planos');

export function init() {
  return abrirBD();
}

export function guardarPlano(plano) {
  const registo = {
    ...plano,
    estado: plano.estado || 'ativo',
  };
  return repo.guardar(registo);
}

export function listarPlanos() {
  return repo.listar();
}

export function obterPlano(id) {
  return repo.obter(id);
}

export function eliminarPlano(id) {
  return repo.eliminar(id);
}
