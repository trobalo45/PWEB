const express = require('express');
const mongoose = require('mongoose');
const LogAuditoria = require('../models/LogAuditoria');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

function idValido(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

router.use(verifyToken, checkRole('Responsável', 'Administrador'));

router.get('/', async (req, res) => {
  try {
    const filtro = {};
    if (req.query.utilizadorId && idValido(req.query.utilizadorId)) {
      filtro.utilizadorId = req.query.utilizadorId;
    }
    if (req.query.acao) filtro.acao = req.query.acao;

    const limite = Math.min(
      Math.max(Number(req.query.limite) || 50, 1),
      500
    );
    const logs = await LogAuditoria.find(filtro)
      .sort({ dataHora: -1 })
      .limit(limite);
    res.json(logs);
  } catch (erro) {
    console.error('[auditoria][GET] erro:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

module.exports = router;
