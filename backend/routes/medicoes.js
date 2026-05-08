const express = require('express');
const mongoose = require('mongoose');
const MedicaoAmbiental = require('../models/MedicaoAmbiental');
const LoteCultivo = require('../models/LoteCultivo');
const PlanoCultivo = require('../models/PlanoCultivo');
const Alerta = require('../models/Alerta');
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
  console.error(`[medicoes][${ctx}] erro:`, erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

function avaliarLimite(valor, min, max, unidade, nome) {
  if (!Number.isFinite(valor) || min == null || max == null) return null;
  let limite;
  let mensagem;
  if (valor > max) {
    limite = max;
    mensagem = `${nome} fora do intervalo: ${valor}${unidade} (máx. permitido: ${max}${unidade})`;
  } else if (valor < min) {
    limite = min;
    mensagem = `${nome} fora do intervalo: ${valor}${unidade} (mín. permitido: ${min}${unidade})`;
  } else {
    return null;
  }
  const denom = Math.abs(limite) || 1;
  const desvio = Math.abs(valor - limite) / denom;
  const classificacao = desvio > 0.2 ? 'Crítico' : 'Aviso';
  return { mensagem, classificacao };
}

async function gerarAlertasParaMedicao(medicao) {
  const lote = await LoteCultivo.findById(medicao.loteId);
  if (!lote || !lote.planoId) return [];
  const plano = await PlanoCultivo.findById(lote.planoId);
  if (!plano || plano.tipo !== 'regular' || !plano.dadosRegular) return [];
  const r = plano.dadosRegular;

  const candidatos = [
    avaliarLimite(
      Number(medicao.temperatura),
      r.tempMin,
      r.tempMax,
      '°C',
      'Temperatura'
    ),
    avaliarLimite(
      Number(medicao.humidade),
      r.humidadeMin,
      r.humidadeMax,
      '%',
      'Humidade'
    ),
    avaliarLimite(
      Number(medicao.luminosidade),
      r.luminosidadeMin,
      r.luminosidadeMax,
      ' lux',
      'Luminosidade'
    ),
  ].filter(Boolean);

  const guardados = [];
  for (const c of candidatos) {
    const alerta = new Alerta({
      loteId: medicao.loteId,
      medicaoId: medicao._id,
      classificacao: c.classificacao,
      mensagem: c.mensagem,
      estado: 'ativo',
    });
    try {
      await alerta.save();
      guardados.push(alerta);
    } catch (erro) {
      console.warn('[medicoes] falha a gravar alerta:', erro.message);
    }
  }
  return guardados;
}

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const filtro = {};
    if (req.query.loteId && idValido(req.query.loteId)) {
      filtro.loteId = req.query.loteId;
    }
    const lista = await MedicaoAmbiental.find(filtro)
      .populate('registadoPor', 'nome perfil')
      .sort({ dataHora: -1 });
    res.json(lista);
  } catch (erro) {
    tratarErro(res, erro, 'GET');
  }
});

router.get('/:id', async (req, res) => {
  if (!idValido(req.params.id))
    return res.status(400).json({ erro: 'Identificador inválido.' });
  try {
    const m = await MedicaoAmbiental.findById(req.params.id).populate(
      'registadoPor',
      'nome perfil'
    );
    if (!m) return res.status(404).json({ erro: 'Medição não encontrada.' });
    res.json(m);
  } catch (erro) {
    tratarErro(res, erro, 'GET-ID');
  }
});

router.post('/', async (req, res) => {
  try {
    const corpo = req.body || {};
    const medicao = new MedicaoAmbiental({
      loteId: corpo.loteId,
      temperatura: corpo.temperatura,
      humidade: corpo.humidade,
      luminosidade: corpo.luminosidade,
      dataHora: corpo.dataHora || new Date(),
      registadoPor: req.user._id,
    });
    await medicao.save();
    registarLog(req, 'criar_medicao', 'MedicaoAmbiental', medicao._id, {
      loteId: medicao.loteId,
    });

    let alertas = [];
    try {
      alertas = await gerarAlertasParaMedicao(medicao);
      if (alertas.length) {
        registarLog(req, 'gerar_alertas', 'Alerta', null, {
          medicaoId: medicao._id,
          quantidade: alertas.length,
        });
      }
    } catch (erro) {
      console.warn('[medicoes] erro a gerar alertas:', erro.message);
    }

    res.status(201).json({ medicao, alertas });
  } catch (erro) {
    tratarErro(res, erro, 'POST');
  }
});

router.delete('/:id', checkRole('Administrador'), async (req, res) => {
  if (!idValido(req.params.id))
    return res.status(400).json({ erro: 'Identificador inválido.' });
  try {
    const apagada = await MedicaoAmbiental.findByIdAndDelete(req.params.id);
    if (!apagada)
      return res.status(404).json({ erro: 'Medição não encontrada.' });
    registarLog(req, 'eliminar_medicao', 'MedicaoAmbiental', apagada._id, null);
    res.status(204).end();
  } catch (erro) {
    tratarErro(res, erro, 'DELETE');
  }
});

module.exports = router;
