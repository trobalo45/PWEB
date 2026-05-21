import { naoImplementado } from './stubs.js';

const API_BASE = `http://${window.location.hostname}:5000/api`;
const CHAVE_TOKEN = 'greenherb.token';

function obterToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

function cabecalhos() {
  const headers = { 'Content-Type': 'application/json' };
  const token = obterToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function pedido(caminho, opcoes = {}) {
  const resposta = await fetch(`${API_BASE}${caminho}`, {
    ...opcoes,
    headers: { ...cabecalhos(), ...(opcoes.headers || {}) },
  });

  if (resposta.status === 204) return null;

  let corpo = null;
  const tipo = resposta.headers.get('content-type') || '';
  if (tipo.includes('application/json')) {
    corpo = await resposta.json();
  }

  if (!resposta.ok) {
    const mensagem = (corpo && corpo.erro) || `Erro ${resposta.status}.`;
    const erro = new Error(mensagem);
    erro.estado = resposta.status;
    throw erro;
  }
  return corpo;
}

function paraFrontend(u) {
  if (!u) return null;
  return { ...u, id: u._id || u.id };
}

export async function listarUtilizadores() {
  const lista = await pedido('/utilizadores');
  return (lista || []).map(paraFrontend);
}

export async function guardarUtilizador(dados) {
  if (!dados?.password) {
    const erro = new Error(
      'A criação de utilizadores via API exige uma password.'
    );
    erro.estado = 400;
    throw erro;
  }
  const criado = await pedido('/utilizadores', {
    method: 'POST',
    body: JSON.stringify({
      nome: dados.nome,
      email: dados.email,
      password: dados.password,
      perfil: dados.perfil || 'Técnico',
    }),
  });
  return criado?._id;
}

export async function atualizarUtilizador(id, alteracoes) {
  const corpo = {};
  ['nome', 'email', 'perfil', 'ativo'].forEach((campo) => {
    if (campo in (alteracoes || {})) corpo[campo] = alteracoes[campo];
  });
  const atualizado = await pedido(`/utilizadores/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(corpo),
  });
  return paraFrontend(atualizado);
}

export const obterUtilizador = naoImplementado('utilizadores');

export async function eliminarUtilizador(id) {
  await pedido(`/utilizadores/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
