const express = require('express');
const mongoose = require('mongoose');
const Tarefa = require('../models/Tarefa');
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
  console.error(`[tarefas][${ctx}] erro:`, erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const filtro = {};
    if (req.query.loteId && idValido(req.query.loteId)) {
      filtro.loteId = req.query.loteId;
    }
    if (req.query.estado) filtro.estado = req.query.estado;
    const lista = await Tarefa.find(filtro)
      .populate('criadoPor', 'nome perfil')
      .populate('executadoPor', 'nome perfil')
      .sort({ dataPrevista: 1 });
    res.json(lista);
  } catch (erro) {
    tratarErro(res, erro, 'GET');
  }
});

router.get('/:id', async (req, res) => {
  if (!idValido(req.params.id))
    return res.status(400).json({ erro: 'Identificador inválido.' });
  try {
    const tarefa = await Tarefa.findById(req.params.id)
      .populate('criadoPor', 'nome perfil')
      .populate('executadoPor', 'nome perfil');
    if (!tarefa)
      return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    res.json(tarefa);
  } catch (erro) {
    tratarErro(res, erro, 'GET-ID');
  }
});

router.post('/', async (req, res) => {
  try {
    const corpo = req.body || {};
    const tarefa = new Tarefa({
      tipo: corpo.tipo,
      loteId: corpo.loteId,
      dataPrevista: corpo.dataPrevista,
      notas: corpo.notas || '',
      estado: corpo.estado || 'pendente',
      criadoPor: req.user._id,
    });
    await tarefa.save();
    registarLog(req, 'criar_tarefa', 'Tarefa', tarefa._id, {
      tipo: tarefa.tipo,
      loteId: tarefa.loteId,
    });
    res.status(201).json(tarefa);
  } catch (erro) {
    tratarErro(res, erro, 'POST');
  }
});

router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id))
    return res.status(400).json({ erro: 'Identificador inválido.' });
  try {
    const tarefa = await Tarefa.findById(req.params.id);
    if (!tarefa)
      return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    const camposEditaveis = [
      'tipo',
      'loteId',
      'estado',
      'dataPrevista',
      'dataExecucao',
      'notas',
    ];
    camposEditaveis.forEach((c) => {
      if (c in (req.body || {})) tarefa[c] = req.body[c];
    });
    await tarefa.save();
    registarLog(req, 'editar_tarefa', 'Tarefa', tarefa._id, req.body);
    res.json(tarefa);
  } catch (erro) {
    tratarErro(res, erro, 'PUT');
  }
});

router.delete('/:id', checkRole('Administrador'), async (req, res) => {
  if (!idValido(req.params.id))
    return res.status(400).json({ erro: 'Identificador inválido.' });
  try {
    const apagada = await Tarefa.findByIdAndDelete(req.params.id);
    if (!apagada)
      return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    registarLog(req, 'eliminar_tarefa', 'Tarefa', apagada._id, null);
    res.status(204).end();
  } catch (erro) {
    tratarErro(res, erro, 'DELETE');
  }
});

router.put('/:id/executar', async (req, res) => {
  if (!idValido(req.params.id))
    return res.status(400).json({ erro: 'Identificador inválido.' });
  try {
    const tarefa = await Tarefa.findById(req.params.id);
    if (!tarefa)
      return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    tarefa.estado = 'executada';
    tarefa.dataExecucao = new Date();
    tarefa.executadoPor = req.user._id;
    await tarefa.save();
    registarLog(req, 'executar_tarefa', 'Tarefa', tarefa._id, {
      tipo: tarefa.tipo,
    });
    res.json(tarefa);
  } catch (erro) {
    tratarErro(res, erro, 'EXECUTAR');
  }
});

module.exports = router;
