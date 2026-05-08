require('dotenv').config();

const mongoose = require('mongoose');
const Utilizador = require('./models/Utilizador');
const PlanoCultivo = require('./models/PlanoCultivo');
const ErvaAromatica = require('./models/ErvaAromatica');
const LoteCultivo = require('./models/LoteCultivo');
const Tarefa = require('./models/Tarefa');
const MedicaoAmbiental = require('./models/MedicaoAmbiental');
const Alerta = require('./models/Alerta');
const LogAuditoria = require('./models/LogAuditoria');

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

const ERVAS = [
  {
    nome: 'Manjericão',
    descricao: 'Erva mediterrânica de folha tenra.',
    tempMin: 18,
    tempMax: 26,
    humidadeMin: 55,
    humidadeMax: 75,
    luminosidadeMin: 8000,
    luminosidadeMax: 14000,
  },
  {
    nome: 'Hortelã',
    descricao: 'Vivaz aromática, cresce em zonas frescas.',
    tempMin: 16,
    tempMax: 24,
    humidadeMin: 50,
    humidadeMax: 70,
    luminosidadeMin: 6000,
    luminosidadeMax: 12000,
  },
  {
    nome: 'Alecrim',
    descricao: 'Lenhosa rústica, tolera secura.',
    tempMin: 18,
    tempMax: 28,
    humidadeMin: 40,
    humidadeMax: 60,
    luminosidadeMin: 10000,
    luminosidadeMax: 18000,
  },
  {
    nome: 'Tomilho',
    descricao: 'Rústica, prefere ambientes secos e luminosos.',
    tempMin: 17,
    tempMax: 26,
    humidadeMin: 35,
    humidadeMax: 55,
    luminosidadeMin: 9000,
    luminosidadeMax: 16000,
  },
];

async function arrancar() {
  await mongoose.connect(MONGODB_URI);
  console.log(`[seed] ligado a ${MONGODB_URI}`);

  await Promise.all([
    Alerta.deleteMany({}),
    MedicaoAmbiental.deleteMany({}),
    Tarefa.deleteMany({}),
    LoteCultivo.deleteMany({}),
    PlanoCultivo.deleteMany({}),
    ErvaAromatica.deleteMany({}),
    Utilizador.deleteMany({}),
    LogAuditoria.deleteMany({}),
  ]);
  console.log('[seed] coleções limpas.');

  const utilizadoresCriados = [];
  for (const dados of UTILIZADORES) {
    const u = new Utilizador(dados);
    await u.save();
    utilizadoresCriados.push(u);
    console.log(`[seed] utilizador: ${u.email} (${u.perfil})`);
  }
  const tecnico = utilizadoresCriados.find((u) => u.perfil === 'Técnico');
  const responsavel = utilizadoresCriados.find(
    (u) => u.perfil === 'Responsável'
  );
  const admin = utilizadoresCriados.find((u) => u.perfil === 'Administrador');

  for (const e of ERVAS) {
    await ErvaAromatica.create(e);
    console.log(`[seed] erva: ${e.nome}`);
  }

  const planoRegular = await PlanoCultivo.create({
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
  });
  console.log('[seed] plano regular: manjericão');

  const planoEmergencia = await PlanoCultivo.create({
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
  });
  console.log('[seed] plano emergência: hortelã');

  const planoPontual = await PlanoCultivo.create({
    tipo: 'pontual',
    erva: 'alecrim',
    estado: 'ativo',
    criadoPor: admin._id,
    dadosPontual: {
      nomeResponsavel: 'Ana Administradora',
      justificacao: 'Recolha extraordinária para análise laboratorial.',
      dataAutorizacao: new Date(),
    },
  });
  console.log('[seed] plano pontual: alecrim');

  const lote1 = await LoteCultivo.create({
    erva: 'manjericão',
    planoId: planoRegular._id,
    estado: 'ativo',
    dataInicio: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    quantidadeInicial: 120,
    quantidadeAtual: 118,
    notas: 'Lote inicial de manjericão da estufa norte.',
    criadoPor: tecnico._id,
  });
  const lote2 = await LoteCultivo.create({
    erva: 'hortelã',
    planoId: planoEmergencia._id,
    estado: 'ativo',
    dataInicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    quantidadeInicial: 80,
    quantidadeAtual: 80,
    notas: 'Lote experimental de hortelã.',
    criadoPor: responsavel._id,
  });
  console.log('[seed] 2 lotes criados.');

  await Tarefa.create({
    tipo: 'rega',
    loteId: lote1._id,
    estado: 'pendente',
    dataPrevista: new Date(Date.now() + 24 * 60 * 60 * 1000),
    notas: 'Rega normal segundo o ciclo definido.',
    criadoPor: tecnico._id,
  });
  await Tarefa.create({
    tipo: 'fertilização',
    loteId: lote1._id,
    estado: 'pendente',
    dataPrevista: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    notas: 'Aplicação de adubo NPK conforme plano.',
    criadoPor: tecnico._id,
  });
  await Tarefa.create({
    tipo: 'monitorização',
    loteId: lote2._id,
    estado: 'pendente',
    dataPrevista: new Date(Date.now() + 12 * 60 * 60 * 1000),
    notas: 'Monitorização visual diária.',
    criadoPor: responsavel._id,
  });
  console.log('[seed] 3 tarefas criadas.');

  const med1 = await MedicaoAmbiental.create({
    loteId: lote1._id,
    temperatura: 22.5,
    humidade: 65,
    luminosidade: 11000,
    dataHora: new Date(Date.now() - 3 * 60 * 60 * 1000),
    registadoPor: tecnico._id,
  });
  await MedicaoAmbiental.create({
    loteId: lote1._id,
    temperatura: 31,
    humidade: 50,
    luminosidade: 16000,
    dataHora: new Date(),
    registadoPor: tecnico._id,
  });
  console.log('[seed] 2 medições criadas.');

  await Alerta.create({
    loteId: lote1._id,
    medicaoId: med1._id,
    classificacao: 'Aviso',
    mensagem:
      'Temperatura próxima do limite superior — verificar ventilação.',
    estado: 'ativo',
  });
  console.log('[seed] 1 alerta criado.');

  await mongoose.disconnect();
  console.log('[seed] concluído.');
}

arrancar().catch((erro) => {
  console.error('[seed] erro:', erro);
  process.exit(1);
});
