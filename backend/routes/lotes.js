const express = require('express');
const mongoose = require('mongoose');
const LoteCultivo = require('../models/LoteCultivo');
const { verifyToken, checkRole } = require('../middleware/auth');
const { registarLog } = require('../middleware/auditoria');

const router = express.Router();

function idValido(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function tratarErro(res, erro, ctx) {
  if (erro.name === 'ValidationError') {
    return res.status(400).json({ erro: erro.message });
  }
  console.error(`[lotes][${ctx}] erro:`, erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

router.use(verifyToken);

router.get('/', async (_req, res) => {
  try {
    const lotes = await LoteCultivo.find()
      .populate('criadoPor', 'nome email perfil')
      .sort({ dataCriacao: -1 });
    res.json(lotes);
  } catch (erro) {
    tratarErro(res, erro, 'GET');
  }
});

router.get('/:id', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ erro: 'Identificador inválido.' });
  }
  try {
    const lote = await LoteCultivo.findById(req.params.id).populate(
      'criadoPor',
      'nome email perfil'
    );
    if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });
    res.json(lote);
  } catch (erro) {
    tratarErro(res, erro, 'GET-ID');
  }
});

router.post('/', async (req, res) => {
  try {
    const corpo = req.body || {};
    const lote = new LoteCultivo({
      erva: corpo.erva,
      planoId: corpo.planoId || undefined,
      estado: corpo.estado || 'ativo',
      dataInicio: corpo.dataInicio,
      quantidadeInicial: corpo.quantidadeInicial,
      quantidadeAtual:
        corpo.quantidadeAtual != null
          ? corpo.quantidadeAtual
          : corpo.quantidadeInicial,
      perdas: corpo.perdas || [],
      notas: corpo.notas || '',
      criadoPor: req.user._id,
    });
    await lote.save();
    registarLog(req, 'criar_lote', 'LoteCultivo', lote._id, {
      erva: lote.erva,
      planoId: lote.planoId,
    });
    res.status(201).json(lote);
  } catch (erro) {
    tratarErro(res, erro, 'POST');
  }
});

router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ erro: 'Identificador inválido.' });
  }
  try {
    const lote = await LoteCultivo.findById(req.params.id);
    if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });

    const ehCriador =
      lote.criadoPor && lote.criadoPor.toString() === req.user._id.toString();
    const ehAdmin = req.user.perfil === 'Administrador';
    if (!ehCriador && !ehAdmin) {
      return res
        .status(403)
        .json({ erro: 'Apenas o criador ou um Administrador pode editar.' });
    }

    const camposEditaveis = [
      'erva',
      'planoId',
      'estado',
      'dataInicio',
      'dataFim',
      'quantidadeInicial',
      'quantidadeAtual',
      'perdas',
      'notas',
    ];
    camposEditaveis.forEach((c) => {
      if (c in (req.body || {})) lote[c] = req.body[c];
    });
    await lote.save();
    registarLog(req, 'editar_lote', 'LoteCultivo', lote._id, req.body);
    res.json(lote);
  } catch (erro) {
    tratarErro(res, erro, 'PUT');
  }
});

router.delete('/:id', checkRole('Administrador'), async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ erro: 'Identificador inválido.' });
  }
  try {
    const apagado = await LoteCultivo.findByIdAndDelete(req.params.id);
    if (!apagado) return res.status(404).json({ erro: 'Lote não encontrado.' });
    registarLog(req, 'eliminar_lote', 'LoteCultivo', apagado._id, {
      erva: apagado.erva,
    });
    res.status(204).end();
  } catch (erro) {
    tratarErro(res, erro, 'DELETE');
  }
});

router.post('/:id/perda', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ erro: 'Identificador inválido.' });
  }
  const { quantidade, motivo } = req.body || {};
  if (!quantidade || Number(quantidade) <= 0 || !motivo) {
    return res
      .status(400)
      .json({ erro: 'quantidade (>0) e motivo são obrigatórios.' });
  }
  try {
    const lote = await LoteCultivo.findById(req.params.id);
    if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });
    lote.perdas.push({
      quantidade: Number(quantidade),
      motivo: String(motivo).trim(),
      data: new Date(),
    });
    lote.quantidadeAtual = Math.max(
      0,
      Number(lote.quantidadeAtual ?? lote.quantidadeInicial) -
        Number(quantidade)
    );
    await lote.save();
    registarLog(req, 'registar_perda', 'LoteCultivo', lote._id, {
      quantidade,
      motivo,
    });
    res.json(lote);
  } catch (erro) {
    tratarErro(res, erro, 'PERDA');
  }
});

router.put('/:id/estado', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ erro: 'Identificador inválido.' });
  }
  const { estado } = req.body || {};
  if (!LoteCultivo.ESTADOS.includes(estado)) {
    return res.status(400).json({ erro: 'Estado inválido.' });
  }
  try {
    const lote = await LoteCultivo.findById(req.params.id);
    if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });
    lote.estado = estado;
    if (estado === 'concluído') lote.dataFim = new Date();
    await lote.save();
    registarLog(req, 'mudar_estado_lote', 'LoteCultivo', lote._id, { estado });
    res.json(lote);
  } catch (erro) {
    tratarErro(res, erro, 'ESTADO');
  }
});

module.exports = router;
