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

const dia = 24 * 60 * 60 * 1000;
const dias = (n) => new Date(Date.now() - n * dia);
const futuroDias = (n) => new Date(Date.now() + n * dia);

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
    descricao: 'Erva mediterrânica de folha tenra usada em culinária.',
    tempMin: 18,
    tempMax: 28,
    humidadeMin: 60,
    humidadeMax: 80,
    luminosidadeMin: 8000,
    luminosidadeMax: 14000,
  },
  {
    nome: 'Hortelã',
    descricao: 'Planta de crescimento rápido com aroma fresco.',
    tempMin: 10,
    tempMax: 22,
    humidadeMin: 70,
    humidadeMax: 90,
    luminosidadeMin: 4000,
    luminosidadeMax: 10000,
  },
  {
    nome: 'Alecrim',
    descricao: 'Arbusto aromático resistente à seca.',
    tempMin: 15,
    tempMax: 30,
    humidadeMin: 30,
    humidadeMax: 60,
    luminosidadeMin: 10000,
    luminosidadeMax: 20000,
  },
  {
    nome: 'Tomilho',
    descricao: 'Erva mediterrânica rasteira de aroma intenso.',
    tempMin: 12,
    tempMax: 28,
    humidadeMin: 35,
    humidadeMax: 65,
    luminosidadeMin: 8000,
    luminosidadeMax: 16000,
  },
  {
    nome: 'Salva',
    descricao: 'Planta aromática de folhas aveludadas.',
    tempMin: 15,
    tempMax: 28,
    humidadeMin: 40,
    humidadeMax: 65,
    luminosidadeMin: 8000,
    luminosidadeMax: 14000,
  },
  {
    nome: 'Orégão',
    descricao: 'Erva aromática de sabor intenso.',
    tempMin: 18,
    tempMax: 30,
    humidadeMin: 40,
    humidadeMax: 70,
    luminosidadeMin: 8000,
    luminosidadeMax: 16000,
  },
  {
    nome: 'Coentros',
    descricao: 'Planta anual de aroma forte.',
    tempMin: 15,
    tempMax: 25,
    humidadeMin: 55,
    humidadeMax: 75,
    luminosidadeMin: 6000,
    luminosidadeMax: 12000,
  },
  {
    nome: 'Estragão',
    descricao: 'Erva aromática com sabor anisado.',
    tempMin: 16,
    tempMax: 24,
    humidadeMin: 50,
    humidadeMax: 70,
    luminosidadeMin: 6000,
    luminosidadeMax: 12000,
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

  /* ────────── UTILIZADORES ────────── */
  const utilizadores = [];
  for (const u of UTILIZADORES) {
    const utilizador = new Utilizador(u);
    await utilizador.save();
    utilizadores.push(utilizador);
    console.log(`[seed] utilizador: ${utilizador.email} (${utilizador.perfil})`);
  }
  const tecnico = utilizadores.find((u) => u.perfil === 'Técnico');
  const responsavel = utilizadores.find((u) => u.perfil === 'Responsável');
  const admin = utilizadores.find((u) => u.perfil === 'Administrador');

  /* ────────── ERVAS ────────── */
  for (const e of ERVAS) {
    await ErvaAromatica.create(e);
  }
  console.log(`[seed] ${ERVAS.length} ervas aromáticas criadas.`);

  /* ────────── PLANOS ────────── */
  const planoRegManjericao = await PlanoCultivo.create({
    tipo: 'regular',
    erva: 'manjericão',
    estado: 'ativo',
    criadoPor: admin._id,
    dadosRegular: {
      tempMin: 18,
      tempMax: 28,
      humidadeMin: 60,
      humidadeMax: 80,
      luminosidadeMin: 8000,
      luminosidadeMax: 14000,
      duracaoCiclo: 60,
      frequenciaRega: 12,
      volumeRega: 1.5,
      frequenciaFertilizacao: 7,
    },
  });
  const planoRegHortela = await PlanoCultivo.create({
    tipo: 'regular',
    erva: 'hortelã',
    estado: 'ativo',
    criadoPor: responsavel._id,
    dadosRegular: {
      tempMin: 10,
      tempMax: 22,
      humidadeMin: 70,
      humidadeMax: 90,
      luminosidadeMin: 4000,
      luminosidadeMax: 10000,
      duracaoCiclo: 45,
      frequenciaRega: 8,
      volumeRega: 2,
      frequenciaFertilizacao: 10,
    },
  });
  const planoRegAlecrim = await PlanoCultivo.create({
    tipo: 'regular',
    erva: 'alecrim',
    estado: 'ativo',
    criadoPor: admin._id,
    dadosRegular: {
      tempMin: 15,
      tempMax: 30,
      humidadeMin: 30,
      humidadeMax: 60,
      luminosidadeMin: 10000,
      luminosidadeMax: 20000,
      duracaoCiclo: 90,
      frequenciaRega: 24,
      volumeRega: 1,
      frequenciaFertilizacao: 14,
    },
  });
  const planoEmergHortela = await PlanoCultivo.create({
    tipo: 'emergencia',
    erva: 'hortelã',
    estado: 'ativo',
    criadoPor: responsavel._id,
    dadosEmergencia: {
      tipoIntervencao: 'Tratamento fúngico',
      intervaloMinimo: 48,
      dosagem: '5ml/L de solução antifúngica',
      notas: 'Aplicar nas horas de menor luminosidade',
    },
  });
  const planoEmergManjericao = await PlanoCultivo.create({
    tipo: 'emergencia',
    erva: 'manjericão',
    estado: 'ativo',
    criadoPor: tecnico._id,
    dadosEmergencia: {
      tipoIntervencao: 'Controlo de pragas',
      intervaloMinimo: 72,
      dosagem: '3ml/L de óleo de neem',
      notas: 'Verificar pH da água antes de aplicar',
    },
  });
  const planoPontualAlecrim = await PlanoCultivo.create({
    tipo: 'pontual',
    erva: 'alecrim',
    estado: 'ativo',
    criadoPor: responsavel._id,
    dadosPontual: {
      nomeResponsavel: 'Rui Responsável',
      justificacao:
        'Recolha extraordinária para análise laboratorial de qualidade e certificação de origem',
      dataAutorizacao: dias(5),
    },
  });
  console.log('[seed] 6 planos criados.');
  void planoEmergManjericao;
  void planoPontualAlecrim;

  /* ────────── LOTES ────────── */
  const lote1 = await LoteCultivo.create({
    erva: 'manjericão',
    planoId: planoRegManjericao._id,
    estado: 'ativo',
    dataInicio: dias(30),
    quantidadeInicial: 200,
    quantidadeAtual: 185,
    perdas: [
      {
        quantidade: 15,
        motivo: 'Ataque de pulgões na fase inicial',
        data: dias(20),
      },
    ],
    notas: 'Lote principal da época de verão',
    criadoPor: admin._id,
  });
  const lote2 = await LoteCultivo.create({
    erva: 'hortelã',
    planoId: planoRegHortela._id,
    estado: 'ativo',
    dataInicio: dias(20),
    quantidadeInicial: 150,
    quantidadeAtual: 150,
    notas: 'Crescimento dentro do esperado',
    criadoPor: responsavel._id,
  });
  const lote3 = await LoteCultivo.create({
    erva: 'alecrim',
    planoId: planoRegAlecrim._id,
    estado: 'concluído',
    dataInicio: dias(100),
    dataFim: dias(5),
    quantidadeInicial: 100,
    quantidadeAtual: 92,
    perdas: [
      {
        quantidade: 8,
        motivo: 'Stress hídrico no período seco',
        data: dias(40),
      },
    ],
    notas: 'Ciclo completo — excelente produtividade',
    criadoPor: tecnico._id,
  });
  const lote4 = await LoteCultivo.create({
    erva: 'hortelã',
    planoId: planoEmergHortela._id,
    estado: 'comprometido',
    dataInicio: dias(15),
    quantidadeInicial: 80,
    quantidadeAtual: 45,
    perdas: [
      {
        quantidade: 20,
        motivo: 'Infeção fúngica detetada',
        data: dias(10),
      },
      {
        quantidade: 15,
        motivo: 'Propagação da infeção apesar do tratamento',
        data: dias(5),
      },
    ],
    notas:
      'Lote em tratamento de emergência — monitorização diária obrigatória',
    criadoPor: responsavel._id,
  });
  const lote5 = await LoteCultivo.create({
    erva: 'manjericão',
    planoId: planoRegManjericao._id,
    estado: 'ativo',
    dataInicio: dias(10),
    quantidadeInicial: 300,
    quantidadeAtual: 300,
    notas: 'Novo lote de grande dimensão para exportação',
    criadoPor: admin._id,
  });
  console.log('[seed] 5 lotes criados.');

  /* ────────── TAREFAS ────────── */
  const tarefas = [
    {
      tipo: 'rega',
      loteId: lote1._id,
      estado: 'pendente',
      dataPrevista: futuroDias(1),
      criadoPor: tecnico._id,
    },
    {
      tipo: 'fertilização',
      loteId: lote1._id,
      estado: 'pendente',
      dataPrevista: futuroDias(3),
      criadoPor: tecnico._id,
    },
    {
      tipo: 'monitorização',
      loteId: lote1._id,
      estado: 'executada',
      dataPrevista: dias(3),
      dataExecucao: dias(2),
      criadoPor: tecnico._id,
      executadoPor: tecnico._id,
    },
    {
      tipo: 'rega',
      loteId: lote2._id,
      estado: 'pendente',
      dataPrevista: new Date(),
      criadoPor: tecnico._id,
    },
    {
      tipo: 'monitorização',
      loteId: lote2._id,
      estado: 'executada',
      dataPrevista: dias(5),
      dataExecucao: dias(4),
      criadoPor: tecnico._id,
      executadoPor: tecnico._id,
    },
    {
      tipo: 'rega',
      loteId: lote4._id,
      estado: 'pendente',
      dataPrevista: new Date(),
      criadoPor: responsavel._id,
    },
    {
      tipo: 'monitorização',
      loteId: lote4._id,
      estado: 'executada',
      dataPrevista: dias(7),
      dataExecucao: dias(6),
      criadoPor: responsavel._id,
      executadoPor: responsavel._id,
    },
    {
      tipo: 'colheita',
      loteId: lote3._id,
      estado: 'executada',
      dataPrevista: dias(6),
      dataExecucao: dias(5),
      criadoPor: tecnico._id,
      executadoPor: tecnico._id,
    },
    {
      tipo: 'rega',
      loteId: lote5._id,
      estado: 'pendente',
      dataPrevista: futuroDias(1),
      criadoPor: tecnico._id,
    },
    {
      tipo: 'fertilização',
      loteId: lote5._id,
      estado: 'pendente',
      dataPrevista: futuroDias(5),
      criadoPor: tecnico._id,
    },
  ];
  for (const t of tarefas) {
    await Tarefa.create(t);
  }
  console.log(`[seed] ${tarefas.length} tarefas criadas.`);

  /* ────────── MEDIÇÕES ────────── */
  const m1_1 = await MedicaoAmbiental.create({
    loteId: lote1._id,
    temperatura: 22,
    humidade: 68,
    luminosidade: 11000,
    dataHora: dias(10),
    registadoPor: tecnico._id,
  });
  const m1_2 = await MedicaoAmbiental.create({
    loteId: lote1._id,
    temperatura: 31,
    humidade: 58,
    luminosidade: 12000,
    dataHora: dias(7),
    registadoPor: tecnico._id,
  });
  const m1_3 = await MedicaoAmbiental.create({
    loteId: lote1._id,
    temperatura: 25,
    humidade: 85,
    luminosidade: 10000,
    dataHora: dias(4),
    registadoPor: tecnico._id,
  });
  const m1_4 = await MedicaoAmbiental.create({
    loteId: lote1._id,
    temperatura: 24,
    humidade: 72,
    luminosidade: 9500,
    dataHora: dias(1),
    registadoPor: tecnico._id,
  });

  const m2_1 = await MedicaoAmbiental.create({
    loteId: lote2._id,
    temperatura: 18,
    humidade: 75,
    luminosidade: 7000,
    dataHora: dias(8),
    registadoPor: tecnico._id,
  });
  const m2_2 = await MedicaoAmbiental.create({
    loteId: lote2._id,
    temperatura: 20,
    humidade: 68,
    luminosidade: 6000,
    dataHora: dias(5),
    registadoPor: tecnico._id,
  });
  const m2_3 = await MedicaoAmbiental.create({
    loteId: lote2._id,
    temperatura: 19,
    humidade: 78,
    luminosidade: 8500,
    dataHora: dias(2),
    registadoPor: tecnico._id,
  });

  const m4_1 = await MedicaoAmbiental.create({
    loteId: lote4._id,
    temperatura: 24,
    humidade: 65,
    luminosidade: 5000,
    dataHora: dias(12),
    registadoPor: responsavel._id,
  });
  const m4_2 = await MedicaoAmbiental.create({
    loteId: lote4._id,
    temperatura: 26,
    humidade: 60,
    luminosidade: 4500,
    dataHora: dias(9),
    registadoPor: responsavel._id,
  });
  const m4_3 = await MedicaoAmbiental.create({
    loteId: lote4._id,
    temperatura: 23,
    humidade: 63,
    luminosidade: 5500,
    dataHora: dias(6),
    registadoPor: responsavel._id,
  });

  const m5_1 = await MedicaoAmbiental.create({
    loteId: lote5._id,
    temperatura: 21,
    humidade: 65,
    luminosidade: 9000,
    dataHora: dias(5),
    registadoPor: tecnico._id,
  });
  const m5_2 = await MedicaoAmbiental.create({
    loteId: lote5._id,
    temperatura: 23,
    humidade: 70,
    luminosidade: 10000,
    dataHora: dias(2),
    registadoPor: tecnico._id,
  });
  console.log('[seed] 12 medições criadas.');
  void m1_1;
  void m1_4;
  void m2_1;
  void m2_3;
  void m5_1;
  void m5_2;

  /* ────────── ALERTAS ────────── */
  await Alerta.create({
    loteId: lote1._id,
    medicaoId: m1_2._id,
    classificacao: 'Crítico',
    mensagem: 'Temperatura fora do intervalo: 31°C (máx. permitido: 28°C)',
    estado: 'ativo',
    dataRegisto: dias(7),
  });
  await Alerta.create({
    loteId: lote1._id,
    medicaoId: m1_3._id,
    classificacao: 'Aviso',
    mensagem: 'Humidade fora do intervalo: 85% (máx. permitido: 80%)',
    estado: 'resolvido',
    resolvidoPor: responsavel._id,
    dataRegisto: dias(4),
    dataResolucao: dias(3),
  });
  await Alerta.create({
    loteId: lote2._id,
    medicaoId: m2_2._id,
    classificacao: 'Aviso',
    mensagem: 'Humidade fora do intervalo: 68% (mín. permitido: 70%)',
    estado: 'resolvido',
    resolvidoPor: tecnico._id,
    dataRegisto: dias(5),
    dataResolucao: dias(4),
  });
  await Alerta.create({
    loteId: lote4._id,
    medicaoId: m4_1._id,
    classificacao: 'Aviso',
    mensagem: 'Temperatura fora do intervalo: 24°C (máx. permitido: 22°C)',
    estado: 'ativo',
    dataRegisto: dias(12),
  });
  await Alerta.create({
    loteId: lote4._id,
    medicaoId: m4_1._id,
    classificacao: 'Aviso',
    mensagem: 'Humidade fora do intervalo: 65% (mín. permitido: 70%)',
    estado: 'ignorado',
    justificacaoIgnorar:
      'Lote já comprometido — alerta irrelevante para o tratamento em curso',
    resolvidoPor: responsavel._id,
    dataRegisto: dias(12),
    dataResolucao: dias(11),
  });
  await Alerta.create({
    loteId: lote4._id,
    medicaoId: m4_2._id,
    classificacao: 'Crítico',
    mensagem: 'Temperatura fora do intervalo: 26°C (máx. permitido: 22°C)',
    estado: 'ativo',
    dataRegisto: dias(9),
  });
  await Alerta.create({
    loteId: lote4._id,
    medicaoId: m4_2._id,
    classificacao: 'Aviso',
    mensagem: 'Humidade fora do intervalo: 60% (mín. permitido: 70%)',
    estado: 'ativo',
    dataRegisto: dias(9),
  });
  await Alerta.create({
    loteId: lote4._id,
    medicaoId: m4_3._id,
    classificacao: 'Aviso',
    mensagem: 'Humidade fora do intervalo: 63% (mín. permitido: 70%)',
    estado: 'ativo',
    dataRegisto: dias(6),
  });
  console.log('[seed] 8 alertas criados.');

  /* ────────── LOGS DE AUDITORIA ────────── */
  const logs = [
    {
      utilizadorId: admin._id,
      utilizadorNome: admin.nome,
      acao: 'login',
      entidade: 'Utilizador',
      entidadeId: String(admin._id),
      detalhes: JSON.stringify({ email: admin.email, perfil: admin.perfil }),
      dataHora: dias(2),
      ip: '127.0.0.1',
    },
    {
      utilizadorId: admin._id,
      utilizadorNome: admin.nome,
      acao: 'criar_lote',
      entidade: 'LoteCultivo',
      entidadeId: String(lote5._id),
      detalhes: JSON.stringify({
        erva: 'manjericão',
        planoId: String(planoRegManjericao._id),
      }),
      dataHora: dias(10),
      ip: '127.0.0.1',
    },
    {
      utilizadorId: tecnico._id,
      utilizadorNome: tecnico.nome,
      acao: 'criar_medicao',
      entidade: 'MedicaoAmbiental',
      entidadeId: String(m1_3._id),
      detalhes: JSON.stringify({ loteId: String(lote1._id) }),
      dataHora: dias(4),
      ip: '127.0.0.1',
    },
    {
      utilizadorId: responsavel._id,
      utilizadorNome: responsavel.nome,
      acao: 'resolver_alerta',
      entidade: 'Alerta',
      entidadeId: '',
      detalhes: JSON.stringify({ classificacao: 'Aviso', loteId: String(lote1._id) }),
      dataHora: dias(3),
      ip: '127.0.0.1',
    },
    {
      utilizadorId: tecnico._id,
      utilizadorNome: tecnico.nome,
      acao: 'executar_tarefa',
      entidade: 'Tarefa',
      entidadeId: '',
      detalhes: JSON.stringify({
        tipo: 'monitorização',
        loteId: String(lote1._id),
      }),
      dataHora: dias(2),
      ip: '127.0.0.1',
    },
    {
      utilizadorId: responsavel._id,
      utilizadorNome: responsavel.nome,
      acao: 'registar_perda',
      entidade: 'LoteCultivo',
      entidadeId: String(lote4._id),
      detalhes: JSON.stringify({
        quantidade: 15,
        motivo: 'Propagação da infeção apesar do tratamento',
      }),
      dataHora: dias(5),
      ip: '127.0.0.1',
    },
    {
      utilizadorId: responsavel._id,
      utilizadorNome: responsavel.nome,
      acao: 'mudar_estado_lote',
      entidade: 'LoteCultivo',
      entidadeId: String(lote4._id),
      detalhes: JSON.stringify({ estado: 'comprometido' }),
      dataHora: dias(14),
      ip: '127.0.0.1',
    },
    {
      utilizadorId: responsavel._id,
      utilizadorNome: responsavel.nome,
      acao: 'ignorar_alerta',
      entidade: 'Alerta',
      entidadeId: '',
      detalhes: JSON.stringify({
        justificacao:
          'Lote já comprometido — alerta irrelevante para o tratamento em curso',
      }),
      dataHora: dias(8),
      ip: '127.0.0.1',
    },
  ];
  for (const l of logs) {
    await LogAuditoria.create(l);
  }
  console.log(`[seed] ${logs.length} logs de auditoria criados.`);

  await mongoose.disconnect();
  console.log('[seed] concluído.');
}

arrancar().catch((erro) => {
  console.error('[seed] erro:', erro);
  process.exit(1);
});
