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

export { API_BASE };

export async function pedido(caminho, opcoes = {}) {
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

export function comId(item) {
  if (!item) return null;
  return { ...item, id: item._id || item.id };
}
