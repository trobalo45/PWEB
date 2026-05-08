const mongoose = require('mongoose');

const CLASSIFICACOES = ['Informativo', 'Aviso', 'Crítico'];
const ESTADOS = ['ativo', 'resolvido', 'ignorado'];

const alertaSchema = new mongoose.Schema(
  {
    loteId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoteCultivo' },
    medicaoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicaoAmbiental',
    },
    classificacao: {
      type: String,
      enum: { values: CLASSIFICACOES, message: 'Classificação inválida.' },
      default: 'Informativo',
    },
    mensagem: { type: String, required: true, trim: true },
    estado: {
      type: String,
      enum: { values: ESTADOS, message: 'Estado inválido.' },
      default: 'ativo',
    },
    justificacaoIgnorar: { type: String, trim: true },
    resolvidoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilizador',
    },
    dataRegisto: { type: Date, default: Date.now },
    dataResolucao: { type: Date },
  },
  { versionKey: false }
);

alertaSchema.pre('validate', function preValidate(next) {
  if (
    this.estado === 'ignorado' &&
    (!this.justificacaoIgnorar || this.justificacaoIgnorar.trim().length < 10)
  ) {
    this.invalidate(
      'justificacaoIgnorar',
      'A justificação de ignorar é obrigatória (mínimo 10 caracteres).'
    );
  }
  next();
});

alertaSchema.statics.CLASSIFICACOES = CLASSIFICACOES;
alertaSchema.statics.ESTADOS = ESTADOS;

module.exports = mongoose.model('Alerta', alertaSchema);
