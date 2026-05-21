const express = require('express');
const jwt = require('jsonwebtoken');
const Utilizador = require('../models/Utilizador');
const { registarLog } = require('../middleware/auditoria');
const { verifyToken } = require('./../middleware/auth');

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

    if (!utilizador) {
      console.log('[login] Utilizador não encontrado para email:', email);
      registarLog(
        req,
        'login_falhado',
        'Utilizador',
        null,
        { motivo: 'utilizador inexistente', emailTentado: email },
        {
          utilizadorId: null,
          utilizadorNome: `(${String(email).trim()})`,
        }
      );
      return res
        .status(401)
        .json({ erro: 'Credenciais inválidas.' });
    }

    const valido = await utilizador.compararPassword(password);
    if (!valido) {
      console.log('[login] Password inválida para:', utilizador.email);
      registarLog(
        req,
        'login_falhado',
        'Utilizador',
        utilizador._id,
        { motivo: 'password incorreta', emailTentado: utilizador.email },
        {
          utilizadorId: null,
          utilizadorNome: `(${utilizador.email})`,
        }
      );
      return res
        .status(401)
        .json({ erro: 'Credenciais inválidas.' });
    }

    console.log(
      '[login] Utilizador encontrado:',
      utilizador.email,
      'ativo:',
      utilizador.ativo,
      'tipo:',
      typeof utilizador.ativo
    );

    if (!utilizador.ativo) {
      console.log('[login] Login bloqueado — conta desativada');
      registarLog(
        req,
        'login_falhado',
        'Utilizador',
        utilizador._id,
        { motivo: 'conta desativada', emailTentado: utilizador.email },
        {
          utilizadorId: null,
          utilizadorNome: `(${utilizador.email})`,
        }
      );
      return res.status(401).json({
        erro: 'Conta desativada. Contacta o administrador do sistema.',
      });
    }

    console.log('[login] Login autorizado para:', utilizador.email);

    const token = assinarToken(utilizador);
    req.user = utilizador;
    registarLog(req, 'login', 'Utilizador', utilizador._id, {
      email: utilizador.email,
      perfil: utilizador.perfil,
    });
    return res.json({
      token,
      utilizador,
    });
  } catch (erro) {
    console.error('[login] erro:', erro);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

router.put('/password', verifyToken, async (req, res) => {
  const { passwordAtual, novaPassword } = req.body || {};
  if (!passwordAtual || !novaPassword) {
    return res
      .status(400)
      .json({ erro: 'passwordAtual e novaPassword são obrigatórios.' });
  }
  if (String(novaPassword).length < 6) {
    return res
      .status(400)
      .json({ erro: 'A nova password tem de ter pelo menos 6 caracteres.' });
  }

  try {
    const utilizador = await Utilizador.findById(req.user._id).select(
      '+password'
    );
    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado.' });
    }
    const valida = await utilizador.compararPassword(passwordAtual);
    if (!valida) {
      return res.status(400).json({ erro: 'Password atual incorreta.' });
    }
    utilizador.password = novaPassword;
    await utilizador.save();
    registarLog(req, 'alterar_password', 'Utilizador', utilizador._id, null);
    return res.json({ ok: true });
  } catch (erro) {
    if (erro.name === 'ValidationError') {
      return res.status(400).json({ erro: erro.message });
    }
    console.error('[password] erro:', erro);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

module.exports = router;
