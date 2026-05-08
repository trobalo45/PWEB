require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const rotasAuth = require('./routes/auth');
const rotasPlanos = require('./routes/planos');
const rotasUtilizadores = require('./routes/utilizadores');
const rotasErvas = require('./routes/ervas');
const rotasLotes = require('./routes/lotes');
const rotasTarefas = require('./routes/tarefas');
const rotasMedicoes = require('./routes/medicoes');
const rotasAlertas = require('./routes/alertas');
const rotasAuditoria = require('./routes/auditoria');

const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/greenherb';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

function configurarOrigemCors(valor) {
  if (!valor || valor === '*') return '*';
  const lista = valor
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return lista.length > 1 ? lista : lista[0] || '*';
}

const app = express();

app.use(
  cors({
    origin: configurarOrigemCors(CORS_ORIGIN),
    credentials: false,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  const ligacao =
    mongoose.connection.readyState === 1 ? 'ligado' : 'desligado';
  res.json({ estado: 'ok', mongo: ligacao });
});

app.use('/api/auth', rotasAuth);
app.use('/api/planos', rotasPlanos);
app.use('/api/utilizadores', rotasUtilizadores);
app.use('/api/ervas', rotasErvas);
app.use('/api/lotes', rotasLotes);
app.use('/api/tarefas', rotasTarefas);
app.use('/api/medicoes', rotasMedicoes);
app.use('/api/alertas', rotasAlertas);
app.use('/api/auditoria', rotasAuditoria);

app.use((_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use((erro, _req, res, _next) => {
  console.error('[erro não tratado]', erro);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

async function arrancar() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[mongo] ligado a ${MONGODB_URI}`);
  } catch (erro) {
    console.error('[mongo] falha na ligação:', erro.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[api] a escutar em http://localhost:${PORT}`);
    console.log(`[api] CORS permitido para ${CORS_ORIGIN}`);
  });
}

if (require.main === module) {
  arrancar();
}

module.exports = app;
