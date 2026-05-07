export function naoImplementado(nomeRecurso) {
  return function lancarErro() {
    const erro = new Error(
      `Endpoint para ${nomeRecurso} ainda não implementado no backend.`
    );
    erro.estado = 404;
    return Promise.reject(erro);
  };
}
