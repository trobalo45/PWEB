import * as local from './utilizadoresDB.js';
import * as remoto from '../api/utilizadoresAPI.js';
import { criarFacade } from './criarStore.js';

const SEED = [
  {
    nome: 'Ana Administradora',
    email: 'admin@greenherb.local',
    perfil: 'Administrador',
    ativo: true,
  },
  {
    nome: 'Rui Responsável',
    email: 'responsavel@greenherb.local',
    perfil: 'Responsável',
    ativo: true,
  },
  {
    nome: 'Tânia Técnica',
    email: 'tecnico@greenherb.local',
    perfil: 'Técnico',
    ativo: true,
  },
];

const facade = criarFacade(local, remoto, {
  listar: ['listarUtilizadores', 'listarUtilizadores'],
  obter: ['obterUtilizador', 'obterUtilizador'],
  guardar: ['guardarUtilizador', 'guardarUtilizador'],
  atualizar: ['atualizarUtilizador', 'atualizarUtilizador'],
  eliminar: ['eliminarUtilizador', 'eliminarUtilizador'],
});

export const init = facade.init;
export const modoAtivo = facade.modoAtivo;
export const obterUtilizador = facade.obter;
export const guardarUtilizador = facade.guardar;
export const atualizarUtilizador = facade.atualizar;
export const eliminarUtilizador = facade.eliminar;

export async function desativarUtilizador(id) {
  return facade.atualizar(id, { ativo: false });
}

export async function ativarUtilizador(id) {
  return facade.atualizar(id, { ativo: true });
}

export async function loginLocal(email, _password) {
  const lista = await listarUtilizadores();
  const alvo = String(email || '').trim().toLowerCase();
  const utilizador = lista.find(
    (u) => String(u.email || '').toLowerCase() === alvo
  );

  if (!utilizador) {
    const erro = new Error('Credenciais inválidas.');
    erro.estado = 401;
    throw erro;
  }

  const estaAtivo =
    utilizador.ativo === true ||
    utilizador.ativo === 'true' ||
    utilizador.ativo === 1;
  console.log('[loginLocal] Utilizador encontrado:', utilizador.email, {
    ativo: utilizador.ativo,
    tipo: typeof utilizador.ativo,
    estaAtivo,
  });

  if (!estaAtivo) {
    console.log('[loginLocal] Login bloqueado — conta desativada');
    const erro = new Error(
      'Conta desativada. Contacta o administrador do sistema.'
    );
    erro.estado = 401;
    throw erro;
  }

  return {
    token: `local-${Date.now()}`,
    utilizador: { ...utilizador },
  };
}

export async function listarUtilizadores() {
  const modo = facade.modoAtivo();
  let lista;
  try {
    lista = await facade.listar();
  } catch (erro) {
    if (modo === 'remoto') throw erro;
    lista = [];
  }

  if (lista && lista.length) return lista;
  if (modo === 'remoto') return lista || [];

  for (const u of SEED) {
    try {
      await local.guardarUtilizador({ ...u });
    } catch {
      /* ignorar erros de seed */
    }
  }
  return local.listarUtilizadores();
}
