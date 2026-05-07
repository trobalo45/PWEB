const express = require('express');
const jwt = require('jsonwebtoken');
const Utilizador = require('../models/Utilizador');

const router = express.Router();

function assinarToken(utilizador) {
  return jwt.sign(
    { sub: utilizador._id.toString(), perfil: utilizador.perfil },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

router.post('/register', async (req, res) => {
  const { nome, email, password, perfil } = req.body || {};

  if (!nome || !email || !password) {
    return res
      .status(400)
      .json({ erro: 'nome, email e password são obrigatórios.' });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ erro: 'A password tem de ter pelo menos 6 caracteres.' });
  }

  try {
    const existente = await Utilizador.findOne({
      email: String(email).toLowerCase(),
    });
    if (existente) {
      return res
        .status(400)
        .json({ erro: 'Já existe um utilizador com este email.' });
    }

    const utilizador = new Utilizador({
      nome,
      email,
      password,
      perfil: perfil || 'Técnico',
    });
    await utilizador.save();

    const token = assinarToken(utilizador);
    return res.status(201).json({
      token,
      utilizador,
    });
  } catch (erro) {
    if (erro.name === 'ValidationError') {
      return res.status(400).json({ erro: erro.message });
    }
    console.error('[register] erro:', erro);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res
      .status(400)
      .json({ erro: 'email e password são obrigatórios.' });
  }

  try {
    const utilizador = await Utilizador.findOne({
      email: String(email).toLowerCase(),
    }).select('+password');

    if (!utilizador || !utilizador.ativo) {
      return res
        .status(401)
        .json({ erro: 'Credenciais inválidas.' });
    }

    const valido = await utilizador.compararPassword(password);
    if (!valido) {
      return res
        .status(401)
        .json({ erro: 'Credenciais inválidas.' });
    }

    const token = assinarToken(utilizador);
    return res.json({
      token,
      utilizador,
    });
  } catch (erro) {
    console.error('[login] erro:', erro);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

module.exports = router;
