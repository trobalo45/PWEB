const express = require('express');
const mongoose = require('mongoose');
const Utilizador = require('../models/Utilizador');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, checkRole('Administrador'));

function idValido(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

router.get('/', async (_req, res) => {
  try {
    const lista = await Utilizador.find().sort({ dataCriacao: -1 });
    res.json(lista);
  } catch (erro) {
    console.error('[utilizadores][GET] erro:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

router.post('/', async (req, res) => {
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
    res.status(201).json(utilizador);
  } catch (erro) {
    if (erro.name === 'ValidationError') {
      return res.status(400).json({ erro: erro.message });
    }
    console.error('[utilizadores][POST] erro:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ erro: 'Identificador inválido.' });
  }

  if (req.user._id.toString() === String(req.params.id)) {
    return res.status(403).json({
      erro: 'Não é permitido alterar a própria conta por esta via.',
    });
  }

  try {
    const utilizador = await Utilizador.findById(req.params.id);
    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado.' });
    }

    const corpo = req.body || {};
    const camposEditaveis = ['nome', 'email', 'perfil', 'ativo'];
    camposEditaveis.forEach((campo) => {
      if (campo in corpo) {
        utilizador[campo] = corpo[campo];
      }
    });

    await utilizador.save();
    res.json(utilizador);
  } catch (erro) {
    if (erro.name === 'ValidationError') {
      return res.status(400).json({ erro: erro.message });
    }
    console.error('[utilizadores][PUT] erro:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

module.exports = router;
