const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const xlsx = require('xlsx');
const ErvaAromatica = require('../models/ErvaAromatica');
const { verifyToken, checkRole } = require('../middleware/auth');
const { registarLog } = require('../middleware/auditoria');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function idValido(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function tratarErro(res, erro, contexto) {
  if (erro.name === 'ValidationError') {
    return res.status(400).json({ erro: erro.message });
  }
  if (erro.code === 11000) {
    return res
      .status(400)
      .json({ erro: 'Já existe uma erva com esse nome.' });
  }
  console.error(`[ervas][${contexto}] erro:`, erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

function escaparCSV(valor) {
  if (valor === null || valor === undefined) return '';
  const s = String(valor);
  return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function parseCSV(texto) {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!linhas.length) return [];
  const sep = linhas[0].includes(';') ? ';' : ',';
  const cabecalho = linhas[0].split(sep).map((c) => c.trim());
  return linhas.slice(1).map((linha) => {
    const valores = linha.split(sep).map((v) => v.trim());
    const obj = {};
    cabecalho.forEach((c, i) => {
      obj[c] = valores[i];
    });
    return obj;
  });
}

function paraNumero(v) {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

router.get('/', async (_req, res) => {
  try {
    const lista = await ErvaAromatica.find().sort({ nome: 1 });
    res.json(lista);
  } catch (erro) {
    tratarErro(res, erro, 'GET');
  }
});

router.get('/exportar', async (_req, res) => {
  try {
    const lista = await ErvaAromatica.find().sort({ nome: 1 });
    const cabecalho = [
      'nome',
      'descricao',
      'tempMin',
      'tempMax',
      'humidadeMin',
      'humidadeMax',
      'luminosidadeMin',
      'luminosidadeMax',
    ];
    const linhas = [cabecalho.join(',')];
    lista.forEach((e) => {
      linhas.push(
        cabecalho.map((c) => escaparCSV(e[c] ?? '')).join(',')
      );
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="ervas.csv"'
    );
    res.send('﻿' + linhas.join('\n'));
  } catch (erro) {
    tratarErro(res, erro, 'EXPORTAR');
  }
});

router.post(
  '/',
  verifyToken,
  checkRole('Administrador'),
  async (req, res) => {
    try {
      const erva = new ErvaAromatica(req.body || {});
      await erva.save();
      registarLog(req, 'criar_erva', 'ErvaAromatica', erva._id, {
        nome: erva.nome,
      });
      res.status(201).json(erva);
    } catch (erro) {
      tratarErro(res, erro, 'POST');
    }
  }
);

router.put(
  '/:id',
  verifyToken,
  checkRole('Administrador'),
  async (req, res) => {
    if (!idValido(req.params.id)) {
      return res.status(400).json({ erro: 'Identificador inválido.' });
    }
    try {
      const erva = await ErvaAromatica.findByIdAndUpdate(
        req.params.id,
        req.body || {},
        { new: true, runValidators: true }
      );
      if (!erva) return res.status(404).json({ erro: 'Erva não encontrada.' });
      registarLog(req, 'editar_erva', 'ErvaAromatica', erva._id, req.body);
      res.json(erva);
    } catch (erro) {
      tratarErro(res, erro, 'PUT');
    }
  }
);

router.delete(
  '/:id',
  verifyToken,
  checkRole('Administrador'),
  async (req, res) => {
    if (!idValido(req.params.id)) {
      return res.status(400).json({ erro: 'Identificador inválido.' });
    }
    try {
      const apagada = await ErvaAromatica.findByIdAndDelete(req.params.id);
      if (!apagada)
        return res.status(404).json({ erro: 'Erva não encontrada.' });
      registarLog(req, 'eliminar_erva', 'ErvaAromatica', apagada._id, {
        nome: apagada.nome,
      });
      res.status(204).end();
    } catch (erro) {
      tratarErro(res, erro, 'DELETE');
    }
  }
);

router.post(
  '/importar',
  verifyToken,
  checkRole('Administrador'),
  upload.single('ficheiro'),
  async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ erro: 'Envie o ficheiro no campo "ficheiro".' });
    }

    let registos = [];
    const nome = (req.file.originalname || '').toLowerCase();
    const ehExcel =
      nome.endsWith('.xlsx') ||
      nome.endsWith('.xls') ||
      req.file.mimetype.includes('sheet');

    try {
      if (ehExcel) {
        const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        registos = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      } else {
        const texto = req.file.buffer.toString('utf-8').replace(/^﻿/, '');
        registos = parseCSV(texto);
      }
    } catch (erro) {
      return res
        .status(400)
        .json({ erro: 'Não foi possível ler o ficheiro: ' + erro.message });
    }

    let inseridas = 0;
    let ignoradas = 0;
    const erros = [];

    for (const r of registos) {
      const dados = {
        nome: String(r.nome || '').trim(),
        descricao: String(r.descricao || '').trim(),
        tempMin: paraNumero(r.tempMin),
        tempMax: paraNumero(r.tempMax),
        humidadeMin: paraNumero(r.humidadeMin),
        humidadeMax: paraNumero(r.humidadeMax),
        luminosidadeMin: paraNumero(r.luminosidadeMin),
        luminosidadeMax: paraNumero(r.luminosidadeMax),
      };
      if (!dados.nome) {
        erros.push({ linha: r, motivo: 'Nome em falta.' });
        continue;
      }
      try {
        const existente = await ErvaAromatica.findOne({ nome: dados.nome });
        if (existente) {
          ignoradas++;
          continue;
        }
        await ErvaAromatica.create(dados);
        inseridas++;
      } catch (erro) {
        erros.push({ linha: r, motivo: erro.message });
      }
    }

    registarLog(req, 'importar_ervas', 'ErvaAromatica', null, {
      inseridas,
      ignoradas,
      total: registos.length,
    });

    res.json({ inseridas, ignoradas, erros });
  }
);

module.exports = router;
