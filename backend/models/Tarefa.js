const mongoose = require('mongoose');

const TIPOS = ['rega', 'fertilização', 'colheita', 'monitorização'];
const ESTADOS = ['pendente', 'executada'];

const tarefaSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: { values: TIPOS, message: 'Tipo de tarefa inválido.' },
      required: true,
    },
    loteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoteCultivo',
      required: true,
    },
    estado: {
      type: String,
      enum: { values: ESTADOS, message: 'Estado inválido.' },
      default: 'pendente',
    },
    dataPrevista: { type: Date, required: true },
    dataExecucao: { type: Date },
    notas: { type: String, default: '', trim: true },
    criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador' },
    executadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador' },
    dataCriacao: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

tarefaSchema.statics.TIPOS = TIPOS;
tarefaSchema.statics.ESTADOS = ESTADOS;

module.exports = mongoose.model('Tarefa', tarefaSchema);
