require('dotenv').config();

const mongoose = require('mongoose');
const Utilizador = require('./models/Utilizador');
const PlanoCultivo = require('./models/PlanoCultivo');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/greenherb';

const UTILIZADORES = [
  {
    nome: 'Tânia Técnica',
    email: 'tecnico@greenherb.local',
    password: 'tecnico123',
    perfil: 'Técnico',
  },
  {
    nome: 'Rui Responsável',
    email: 'responsavel@greenherb.local',
    password: 'responsavel123',
    perfil: 'Responsável',
  },
  {
    nome: 'Ana Administradora',
    email: 'admin@greenherb.local',
    password: 'admin123',
    perfil: 'Administrador',
  },
];

async function arrancar() {
  await mongoose.connect(MONGODB_URI);
  console.log(`[seed] ligado a ${MONGODB_URI}`);

  await PlanoCultivo.deleteMany({});
  await Utilizador.deleteMany({});
  console.log('[seed] coleções limpas.');

  const utilizadoresCriados = [];
  for (const dados of UTILIZADORES) {
    const u = new Utilizador(dados);
    await u.save();
    utilizadoresCriados.push(u);
    console.log(`[seed] utilizador criado: ${u.email} (${u.perfil})`);
  }

  const tecnico = utilizadoresCriados.find((u) => u.perfil === 'Técnico');
  const responsavel = utilizadoresCriados.find(
    (u) => u.perfil === 'Responsável'
  );
  const admin = utilizadoresCriados.find((u) => u.perfil === 'Administrador');

  const planos = [
    {
      tipo: 'regular',
      erva: 'manjericão',
      estado: 'ativo',
      criadoPor: tecnico._id,
      dadosRegular: {
        tempMin: 18,
        tempMax: 26,
        humidadeMin: 55,
        humidadeMax: 75,
        luminosidadeMin: 8000,
        luminosidadeMax: 14000,
        duracaoCiclo: 60,
        frequenciaRega: 12,
        volumeRega: 1.5,
        frequenciaFertilizacao: 7,
      },
    },
    {
      tipo: 'emergencia',
      erva: 'hortelã',
      estado: 'ativo',
      criadoPor: responsavel._id,
      dadosEmergencia: {
        tipoIntervencao: 'Aplicação foliar de óleo de neem',
        intervaloMinimo: 24,
        dosagem: '5 ml/L',
        notas: 'Aplicar ao fim da tarde para reduzir evaporação.',
      },
    },
    {
      tipo: 'pontual',
      erva: 'alecrim',
      estado: 'ativo',
      criadoPor: admin._id,
      dadosPontual: {
        nomeResponsavel: 'Ana Administradora',
        justificacao:
          'Recolha extraordinária para análise laboratorial de qualidade.',
        dataAutorizacao: new Date(),
      },
    },
  ];

  for (const dados of planos) {
    const p = new PlanoCultivo(dados);
    await p.save();
    console.log(`[seed] plano criado: ${p.tipo} / ${p.erva}`);
  }

  await mongoose.disconnect();
  console.log('[seed] concluído.');
}

arrancar().catch((erro) => {
  console.error('[seed] erro:', erro);
  process.exit(1);
});
