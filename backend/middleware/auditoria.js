const LogAuditoria = require('../models/LogAuditoria');

function obterIP(req) {
  return (
    req.ip ||
    req.headers?.['x-forwarded-for'] ||
    req.connection?.remoteAddress ||
    ''
  );
}

async function registarLog(req, acao, entidade, entidadeId, detalhes) {
  try {
    const log = new LogAuditoria({
      utilizadorId: req?.user?._id,
      utilizadorNome: req?.user?.nome || 'Anónimo',
      acao,
      entidade: entidade || '',
      entidadeId: entidadeId ? String(entidadeId) : '',
      detalhes:
        detalhes == null
          ? ''
          : typeof detalhes === 'string'
            ? detalhes
            : JSON.stringify(detalhes),
      ip: obterIP(req),
    });
    await log.save();
  } catch (erro) {
    console.warn('[auditoria] falha ao registar log:', erro.message);
  }
}

module.exports = { registarLog };
