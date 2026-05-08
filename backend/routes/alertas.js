const express = require('express');
const mongoose = require('mongoose');
const Alerta = require('../models/Alerta');
const { verifyToken } = require('../middleware/auth');
const { registarLog } = require('../middleware/auditoria');

const router = express.Router();

function idValido(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function tratarErro(res, erro, ctx) {
  if (erro.name === 'ValidationError') {
    return res.status(400).json({ erro: erro.message });
  }
  console.error(`[alertas][${ctx}] erro:`, erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const filtro = {};
    if (req.query.estado) filtro.estado = req.query.estado;
    if (req.query.loteId && idValido(req.query.loteId)) {
      filtro.loteId = req.query.loteId;
    }
    const lista = await Alerta.find(filtro)
      .populate('resolvidoPor', 'nome perfil')
      .sort({ dataRegisto: -1 });
    res.json(lista);
  } catch (erro) {
    tratarErro(res, erro, 'GET');
  }
});

router.get('/:id', async (req, res) => {
  if (!idValido(req.params.id))
    return res.status(400).json({ erro: 'Identificador inválido.' });
  try {
    const a = await Alerta.findById(req.params.id).populate(
      'resolvidoPor',
      'nome perfil'
    );
    if (!a) return res.status(404).json({ erro: 'Alerta não encontrado.' });
    res.json(a);
  } catch (erro) {
    tratarErro(res, erro, 'GET-ID');
  }
});

router.put('/:id/resolver', async (req, res) => {
  if (!idValido(req.params.id))
    return res.status(400).json({ erro: 'Identificador inválido.' });
  try {
    const alerta = await Alerta.findById(req.params.id);
    if (!alerta)
      return res.status(404).json({ erro: 'Alerta não encontrado.' });
    alerta.estado = 'resolvido';
    alerta.resolvidoPor = req.user._id;
    alerta.dataResolucao = new Date();
    await alerta.save();
    registarLog(req, 'resolver_alerta', 'Alerta', alerta._id, {
      mensagem: alerta.mensagem,
    });
    res.json(alerta);
  } catch (erro) {
    tratarErro(res, erro, 'RESOLVER');
  }
});

router.put('/:id/ignorar', async (req, res) => {
  if (!idValido(req.params.id))
    return res.status(400).json({ erro: 'Identificador inválido.' });
  const just = String(req.body?.justificacao || '').trim();
  if (just.length < 10) {
    return res.status(400).json({
      erro: 'A justificação é obrigatória (mínimo 10 caracteres).',
    });
  }
  try {
    const alerta = await Alerta.findById(req.params.id);
    if (!alerta)
      return res.status(404).json({ erro: 'Alerta não encontrado.' });
    alerta.estado = 'ignorado';
    alerta.justificacaoIgnorar = just;
    alerta.resolvidoPor = req.user._id;
    alerta.dataResolucao = new Date();
    await alerta.save();
    registarLog(req, 'ignorar_alerta', 'Alerta', alerta._id, {
      justificacao: just,
    });
    res.json(alerta);
  } catch (erro) {
    tratarErro(res, erro, 'IGNORAR');
  }
});

module.exports = router;
