import { pedido, comId } from './_http.js';

export async function listarMedicoes() {
  const lista = await pedido('/medicoes');
  return (lista || []).map(comId);
}

export async function obterMedicao(id) {
  const m = await pedido(`/medicoes/${encodeURIComponent(id)}`);
  return comId(m);
}

export async function guardarMedicao(medicao) {
  const corpo = {
    loteId: medicao.loteId,
    temperatura: Number(medicao.temperatura),
    humidade: Number(medicao.humidade),
    luminosidade: Number(medicao.luminosidade),
    dataHora: medicao.dataHora,
  };
  const resposta = await pedido('/medicoes', {
    method: 'POST',
    body: JSON.stringify(corpo),
  });
  return resposta?.medicao?._id;
}

export async function atualizarMedicao(_id, _alteracoes) {
  const erro = new Error('Atualização de medições não suportada pela API.');
  erro.estado = 405;
  throw erro;
}

export async function eliminarMedicao(id) {
  await pedido(`/medicoes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
