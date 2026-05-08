const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    utilizadorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilizador',
    },
    utilizadorNome: { type: String, default: 'Anónimo' },
    acao: { type: String, required: true },
    entidade: { type: String, default: '' },
    entidadeId: { type: String, default: '' },
    detalhes: { type: String, default: '' },
    dataHora: { type: Date, default: Date.now },
    ip: { type: String, default: '' },
  },
  { versionKey: false }
);

logSchema.index({ dataHora: -1 });
logSchema.index({ utilizadorId: 1 });
logSchema.index({ acao: 1 });

module.exports = mongoose.model('LogAuditoria', logSchema);
