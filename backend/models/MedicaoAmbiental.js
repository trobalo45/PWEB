const mongoose = require('mongoose');

const medicaoSchema = new mongoose.Schema(
  {
    loteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoteCultivo',
      required: true,
    },
    temperatura: { type: Number, required: true },
    humidade: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    luminosidade: { type: Number, required: true, min: 0 },
    dataHora: { type: Date, default: Date.now },
    registadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilizador',
    },
  },
  { versionKey: false }
);

module.exports = mongoose.model('MedicaoAmbiental', medicaoSchema);
