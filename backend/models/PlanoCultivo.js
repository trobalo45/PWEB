const mongoose = require('mongoose');

const TIPOS = ['regular', 'emergencia', 'pontual'];
const ERVAS = ['manjericão', 'hortelã', 'alecrim', 'tomilho'];
const ESTADOS = ['ativo', 'concluído', 'comprometido'];

const dadosRegularSchema = new mongoose.Schema(
  {
    tempMin: { type: Number, required: true },
    tempMax: { type: Number, required: true },
    humidadeMin: { type: Number, required: true, min: 0, max: 100 },
    humidadeMax: { type: Number, required: true, min: 0, max: 100 },
    luminosidadeMin: { type: Number, required: true, min: 0 },
    luminosidadeMax: { type: Number, required: true, min: 0 },
    duracaoCiclo: { type: Number, required: true, min: 1 },
    frequenciaRega: { type: Number, required: true, min: 1 },
    volumeRega: { type: Number, required: true, min: 0 },
    frequenciaFertilizacao: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const dadosEmergenciaSchema = new mongoose.Schema(
  {
    tipoIntervencao: { type: String, required: true, trim: true },
    intervaloMinimo: { type: Number, required: true, min: 1 },
    dosagem: { type: String, required: true, trim: true },
    notas: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const dadosPontualSchema = new mongoose.Schema(
  {
    nomeResponsavel: { type: String, required: true, trim: true },
    justificacao: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
    },
    dataAutorizacao: { type: Date, required: true },
  },
  { _id: false }
);

const planoCultivoSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: { values: TIPOS, message: 'Tipo de plano inválido.' },
      required: true,
    },
    erva: {
      type: String,
      enum: { values: ERVAS, message: 'Erva aromática inválida.' },
      required: true,
    },
    estado: {
      type: String,
      enum: { values: ESTADOS, message: 'Estado inválido.' },
      default: 'ativo',
    },
    criadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilizador',
      required: true,
    },
    dataCriacao: {
      type: Date,
      default: Date.now,
    },
    dadosRegular: dadosRegularSchema,
    dadosEmergencia: dadosEmergenciaSchema,
    dadosPontual: dadosPontualSchema,
  },
  {
    versionKey: false,
  }
);

planoCultivoSchema.pre('validate', function preValidate(next) {
  if (this.tipo === 'regular') {
    this.dadosEmergencia = undefined;
    this.dadosPontual = undefined;
    if (!this.dadosRegular) {
      this.invalidate(
        'dadosRegular',
        'dadosRegular é obrigatório para planos regulares.'
      );
    }
  } else if (this.tipo === 'emergencia') {
    this.dadosRegular = undefined;
    this.dadosPontual = undefined;
    if (!this.dadosEmergencia) {
      this.invalidate(
        'dadosEmergencia',
        'dadosEmergencia é obrigatório para planos de emergência.'
      );
    }
  } else if (this.tipo === 'pontual') {
    this.dadosRegular = undefined;
    this.dadosEmergencia = undefined;
    if (!this.dadosPontual) {
      this.invalidate(
        'dadosPontual',
        'dadosPontual é obrigatório para planos pontuais.'
      );
    }
  }

  if (this.dadosRegular) {
    const r = this.dadosRegular;
    if (r.tempMin >= r.tempMax) {
      this.invalidate(
        'dadosRegular.tempMax',
        'tempMax tem de ser superior a tempMin.'
      );
    }
    if (r.humidadeMin >= r.humidadeMax) {
      this.invalidate(
        'dadosRegular.humidadeMax',
        'humidadeMax tem de ser superior a humidadeMin.'
      );
    }
    if (r.luminosidadeMin >= r.luminosidadeMax) {
      this.invalidate(
        'dadosRegular.luminosidadeMax',
        'luminosidadeMax tem de ser superior a luminosidadeMin.'
      );
    }
  }

  next();
});

planoCultivoSchema.statics.TIPOS = TIPOS;
planoCultivoSchema.statics.ERVAS = ERVAS;
planoCultivoSchema.statics.ESTADOS = ESTADOS;

module.exports = mongoose.model('PlanoCultivo', planoCultivoSchema);
