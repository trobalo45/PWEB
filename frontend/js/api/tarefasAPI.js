import { pedido, comId } from './_http.js';

export async function listarTarefas() {
  const lista = await pedido('/tarefas');
  return (lista || []).map(comId);
}

export async function obterTarefa(id) {
  const t = await pedido(`/tarefas/${encodeURIComponent(id)}`);
  return comId(t);
}

export async function guardarTarefa(tarefa) {
  const criada = await pedido('/tarefas', {
    method: 'POST',
    body: JSON.stringify({
      tipo: tarefa.tipo,
      loteId: tarefa.loteId,
      dataPrevista: tarefa.dataPrevista,
      notas: tarefa.notas || '',
      estado: tarefa.estado || 'pendente',
    }),
  });
  return criada?._id;
}

export async function atualizarTarefa(id, alteracoes) {
  if (
    alteracoes &&
    Object.keys(alteracoes).length === 1 &&
    alteracoes.estado === 'executada'
  ) {
    const t = await pedido(`/tarefas/${encodeURIComponent(id)}/executar`, {
      method: 'PUT',
    });
    return comId(t);
  }
  const t = await pedido(`/tarefas/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(alteracoes || {}),
  });
  return comId(t);
}

export async function eliminarTarefa(id) {
  await pedido(`/tarefas/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
