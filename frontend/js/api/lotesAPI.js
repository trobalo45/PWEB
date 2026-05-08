import { pedido, comId } from './_http.js';

export async function listarLotes() {
  const lista = await pedido('/lotes');
  return (lista || []).map(comId);
}

export async function obterLote(id) {
  const lote = await pedido(`/lotes/${encodeURIComponent(id)}`);
  return comId(lote);
}

export async function guardarLote(lote) {
  const corpo = {
    erva: lote.erva,
    planoId: lote.planoId || undefined,
    estado: lote.estado || 'ativo',
    dataInicio: lote.dataInicio,
    quantidadeInicial: Number(lote.quantidadeInicial),
    quantidadeAtual:
      lote.quantidadeAtual != null
        ? Number(lote.quantidadeAtual)
        : Number(lote.quantidadeInicial),
    perdas: lote.perdas || [],
    notas: lote.notas || '',
  };
  const criado = await pedido('/lotes', {
    method: 'POST',
    body: JSON.stringify(corpo),
  });
  return criado?._id;
}

export async function atualizarLote(id, alteracoes) {
  if (alteracoes && typeof alteracoes === 'object') {
    const chaves = Object.keys(alteracoes);
    if (
      chaves.length === 1 &&
      chaves[0] === 'estado' &&
      alteracoes.estado != null
    ) {
      const atualizado = await pedido(
        `/lotes/${encodeURIComponent(id)}/estado`,
        {
          method: 'PUT',
          body: JSON.stringify({ estado: alteracoes.estado }),
        }
      );
      return comId(atualizado);
    }
    if (
      chaves.length >= 1 &&
      'perdas' in alteracoes &&
      'quantidadeAtual' in alteracoes
    ) {
      const ultima = (alteracoes.perdas || []).slice(-1)[0];
      if (ultima) {
        const atualizado = await pedido(
          `/lotes/${encodeURIComponent(id)}/perda`,
          {
            method: 'POST',
            body: JSON.stringify({
              quantidade: ultima.quantidade,
              motivo: ultima.motivo,
            }),
          }
        );
        return comId(atualizado);
      }
    }
  }
  const atualizado = await pedido(`/lotes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(alteracoes || {}),
  });
  return comId(atualizado);
}

export async function eliminarLote(id) {
  await pedido(`/lotes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
