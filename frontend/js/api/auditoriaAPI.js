import { pedido, comId } from './_http.js';

export async function listarLogs() {
  const lista = await pedido('/auditoria');
  return (lista || []).map((l) => ({
    ...comId(l),
    dataCriacao: l.dataHora || l.dataCriacao,
  }));
}

export async function guardarLog(_log) {
  const erro = new Error(
    'Os logs de auditoria são gerados automaticamente pelo backend.'
  );
  erro.estado = 405;
  throw erro;
}
