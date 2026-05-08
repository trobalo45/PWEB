const mongoose = require('mongoose');

const ervaSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'O nome é obrigatório.'],
      unique: true,
      trim: true,
    },
    descricao: { type: String, default: '', trim: true },
    tempMin: { type: Number },
    tempMax: { type: Number },
    humidadeMin: { type: Number, min: 0, max: 100 },
    humidadeMax: { type: Number, min: 0, max: 100 },
    luminosidadeMin: { type: Number, min: 0 },
    luminosidadeMax: { type: Number, min: 0 },
    dataCriacao: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('ErvaAromatica', ervaSchema);
