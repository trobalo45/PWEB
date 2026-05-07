const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PERFIS = ['Técnico', 'Responsável', 'Administrador'];

const utilizadorSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'O nome é obrigatório.'],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, 'O email é obrigatório.'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido.'],
    },
    password: {
      type: String,
      required: [true, 'A password é obrigatória.'],
      minlength: 6,
      select: false,
    },
    perfil: {
      type: String,
      enum: {
        values: PERFIS,
        message: 'Perfil inválido.',
      },
      default: 'Técnico',
    },
    ativo: {
      type: Boolean,
      default: true,
    },
    dataCriacao: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

utilizadorSchema.pre('save', async function preSave(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (erro) {
    next(erro);
  }
});

utilizadorSchema.methods.compararPassword = function compararPassword(
  candidata
) {
  return bcrypt.compare(candidata, this.password);
};

utilizadorSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

utilizadorSchema.statics.PERFIS = PERFIS;

module.exports = mongoose.model('Utilizador', utilizadorSchema);
