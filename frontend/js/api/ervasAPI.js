import { pedido, comId } from './_http.js';

export async function listarErvas() {
  const lista = await pedido('/ervas');
  return (lista || []).map(comId);
}

export async function obterErva(id) {
  const e = await pedido(`/ervas/${encodeURIComponent(id)}`);
  return comId(e);
}

export async function guardarErva(erva) {
  const criada = await pedido('/ervas', {
    method: 'POST',
    body: JSON.stringify(erva),
  });
  return criada?._id;
}

export async function atualizarErva(id, alteracoes) {
  const atualizada = await pedido(`/ervas/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(alteracoes || {}),
  });
  return comId(atualizada);
}

export async function eliminarErva(id) {
  await pedido(`/ervas/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
