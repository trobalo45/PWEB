const express = require('express');
const mongoose = require('mongoose');
const PlanoCultivo = require('../models/PlanoCultivo');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

function idValido(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function tratarErroValidacao(res, erro) {
  if (erro.name === 'ValidationError') {
    return res.status(400).json({ erro: erro.message, detalhes: erro.errors });
  }
  console.error('[planos] erro:', erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

router.use(verifyToken);

router.get('/', async (_req, res) => {
  try {
    const planos = await PlanoCultivo.find()
      .populate('criadoPor', 'nome email perfil')
      .sort({ dataCriacao: -1 });
    res.json(planos);
  } catch (erro) {
    tratarErroValidacao(res, erro);
  }
});

router.get('/:id', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ erro: 'Identificador inválido.' });
  }
  try {
    const plano = await PlanoCultivo.findById(req.params.id).populate(
      'criadoPor',
      'nome email perfil'
    );
    if (!plano) {
      return res.status(404).json({ erro: 'Plano não encontrado.' });
    }
    res.json(plano);
  } catch (erro) {
    tratarErroValidacao(res, erro);
  }
});

router.post('/', async (req, res) => {
  const corpo = req.body || {};
  const novoPlano = new PlanoCultivo({
    tipo: corpo.tipo,
    erva: corpo.erva,
    estado: corpo.estado || 'ativo',
    dadosRegular: corpo.dadosRegular,
    dadosEmergencia: corpo.dadosEmergencia,
    dadosPontual: corpo.dadosPontual,
    criadoPor: req.user._id,
  });

  try {
    await novoPlano.save();
    const populado = await novoPlano.populate(
      'criadoPor',
      'nome email perfil'
    );
    res.status(201).json(populado);
  } catch (erro) {
    tratarErroValidacao(res, erro);
  }
});

router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ erro: 'Identificador inválido.' });
  }
  try {
    const plano = await PlanoCultivo.findById(req.params.id);
    if (!plano) {
      return res.status(404).json({ erro: 'Plano não encontrado.' });
    }

    const ehCriador =
      plano.criadoPor && plano.criadoPor.toString() === req.user._id.toString();
    const ehAdministrador = req.user.perfil === 'Administrador';
    if (!ehCriador && !ehAdministrador) {
      return res
        .status(403)
        .json({ erro: 'Apenas o criador ou um Administrador pode editar.' });
    }

    const corpo = req.body || {};
    const camposEditaveis = [
      'tipo',
      'erva',
      'estado',
      'dadosRegular',
      'dadosEmergencia',
      'dadosPontual',
    ];
    camposEditaveis.forEach((campo) => {
      if (campo in corpo) {
        plano[campo] = corpo[campo];
      }
    });

    await plano.save();
    const populado = await plano.populate('criadoPor', 'nome email perfil');
    res.json(populado);
  } catch (erro) {
    tratarErroValidacao(res, erro);
  }
});

router.delete('/:id', checkRole('Administrador'), async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ erro: 'Identificador inválido.' });
  }
  try {
    const apagado = await PlanoCultivo.findByIdAndDelete(req.params.id);
    if (!apagado) {
      return res.status(404).json({ erro: 'Plano não encontrado.' });
    }
    res.status(204).end();
  } catch (erro) {
    tratarErroValidacao(res, erro);
  }
});

module.exports = router;
