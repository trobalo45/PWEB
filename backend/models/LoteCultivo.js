const mongoose = require('mongoose');

const ESTADOS = ['ativo', 'concluído', 'comprometido'];

const perdaSchema = new mongoose.Schema(
  {
    quantidade: { type: Number, required: true, min: 1 },
    motivo: { type: String, required: true, trim: true },
    data: { type: Date, default: Date.now },
  },
  { _id: false }
);

const loteSchema = new mongoose.Schema(
  {
    erva: { type: String, required: true, trim: true },
    planoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlanoCultivo',
    },
    estado: {
      type: String,
      enum: { values: ESTADOS, message: 'Estado inválido.' },
      default: 'ativo',
    },
    dataInicio: { type: Date, required: true },
    dataFim: { type: Date },
    quantidadeInicial: { type: Number, required: true, min: 1 },
    quantidadeAtual: { type: Number, min: 0 },
    perdas: { type: [perdaSchema], default: [] },
    notas: { type: String, default: '', trim: true },
    criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador' },
    dataCriacao: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

loteSchema.pre('save', function preSave(next) {
  if (this.quantidadeAtual == null) {
    this.quantidadeAtual = this.quantidadeInicial;
  }
  next();
});

loteSchema.statics.ESTADOS = ESTADOS;

module.exports = mongoose.model('LoteCultivo', loteSchema);
