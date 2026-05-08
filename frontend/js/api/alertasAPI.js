import { pedido, comId } from './_http.js';

const CLASSIFICACOES_BACKEND = {
  informativo: 'Informativo',
  aviso: 'Aviso',
  crítico: 'Crítico',
  critico: 'Crítico',
};

function paraBackend(classificacao) {
  if (!classificacao) return 'Informativo';
  const k = String(classificacao).toLowerCase();
  return CLASSIFICACOES_BACKEND[k] || classificacao;
}

export async function listarAlertas() {
  const lista = await pedido('/alertas');
  return (lista || []).map(comId);
}

export async function obterAlerta(id) {
  const a = await pedido(`/alertas/${encodeURIComponent(id)}`);
  return comId(a);
}

export async function guardarAlerta(_alerta) {
  const erro = new Error(
    'Criação manual de alertas não exposta pela API.'
  );
  erro.estado = 404;
  throw erro;
}

export async function atualizarAlerta(id, alteracoes) {
  if (alteracoes?.estado === 'resolvido') {
    const a = await pedido(`/alertas/${encodeURIComponent(id)}/resolver`, {
      method: 'PUT',
    });
    return comId(a);
  }
  if (alteracoes?.estado === 'ignorado') {
    const a = await pedido(`/alertas/${encodeURIComponent(id)}/ignorar`, {
      method: 'PUT',
      body: JSON.stringify({ justificacao: alteracoes.justificacao || '' }),
    });
    return comId(a);
  }
  const erro = new Error('Alteração de alerta não suportada pela API.');
  erro.estado = 405;
  throw erro;
}

export async function eliminarAlerta(_id) {
  const erro = new Error('Endpoint não disponível.');
  erro.estado = 404;
  throw erro;
}

// Função utilitária exportada para outros módulos converterem classificações
export { paraBackend };
