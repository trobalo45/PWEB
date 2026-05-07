const API_BASE = `http://${window.location.hostname}:5000/api`;
const CHAVE_TOKEN = 'greenherb.token';

const ERVA_PARA_API = {
  manjericao: 'manjericão',
  hortela: 'hortelã',
  alecrim: 'alecrim',
  tomilho: 'tomilho',
};

const ERVA_PARA_FRONT = {
  manjericão: 'manjericao',
  hortelã: 'hortela',
  alecrim: 'alecrim',
  tomilho: 'tomilho',
};

function obterToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

function cabecalhos() {
  const headers = { 'Content-Type': 'application/json' };
  const token = obterToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function pedido(caminho, opcoes = {}) {
  const resposta = await fetch(`${API_BASE}${caminho}`, {
    ...opcoes,
    headers: { ...cabecalhos(), ...(opcoes.headers || {}) },
  });

  if (resposta.status === 204) return null;

  let corpo = null;
  const tipo = resposta.headers.get('content-type') || '';
  if (tipo.includes('application/json')) {
    corpo = await resposta.json();
  }

  if (!resposta.ok) {
    const mensagem = (corpo && corpo.erro) || `Erro ${resposta.status}.`;
    const erro = new Error(mensagem);
    erro.estado = resposta.status;
    throw erro;
  }
  return corpo;
}

function paraFrontend(plano) {
  if (!plano) return null;

  const base = {
    id: plano._id,
    tipo: plano.tipo,
    erva: ERVA_PARA_FRONT[plano.erva] || plano.erva,
    estado: plano.estado,
    dataCriacao: plano.dataCriacao,
    criadoPor: plano.criadoPor,
  };

  if (plano.tipo === 'regular' && plano.dadosRegular) {
    const r = plano.dadosRegular;
    base.dadosEspecificos = {
      condicoes: {
        temperatura: { min: r.tempMin, max: r.tempMax },
        humidade: { min: r.humidadeMin, max: r.humidadeMax },
        luminosidade: { min: r.luminosidadeMin, max: r.luminosidadeMax },
        cicloDias: r.duracaoCiclo,
      },
      rega: {
        frequenciaHoras: r.frequenciaRega,
        volumeLitros: r.volumeRega,
        frequenciaFertilizacaoDias: r.frequenciaFertilizacao,
      },
    };
  } else if (plano.tipo === 'emergencia' && plano.dadosEmergencia) {
    const e = plano.dadosEmergencia;
    base.dadosEspecificos = {
      tipoIntervencao: e.tipoIntervencao,
      intervaloMinHoras: e.intervaloMinimo,
      dosagem: e.dosagem,
      notasAplicacao: e.notas || '',
    };
  } else if (plano.tipo === 'pontual' && plano.dadosPontual) {
    const p = plano.dadosPontual;
    base.dadosEspecificos = {
      responsavel: p.nomeResponsavel,
      justificacao: p.justificacao,
      dataHoraAutorizacao: p.dataAutorizacao,
    };
  }

  return base;
}

function paraAPI(plano) {
  const corpo = {
    tipo: plano.tipo,
    erva: ERVA_PARA_API[plano.erva] || plano.erva,
    estado: plano.estado || 'ativo',
  };

  const d = plano.dadosEspecificos || {};

  if (plano.tipo === 'regular') {
    const c = d.condicoes || {};
    const r = d.rega || {};
    corpo.dadosRegular = {
      tempMin: Number(c.temperatura?.min),
      tempMax: Number(c.temperatura?.max),
      humidadeMin: Number(c.humidade?.min),
      humidadeMax: Number(c.humidade?.max),
      luminosidadeMin: Number(c.luminosidade?.min),
      luminosidadeMax: Number(c.luminosidade?.max),
      duracaoCiclo: Number(c.cicloDias),
      frequenciaRega: Number(r.frequenciaHoras),
      volumeRega: Number(r.volumeLitros),
      frequenciaFertilizacao: Number(r.frequenciaFertilizacaoDias),
    };
  } else if (plano.tipo === 'emergencia') {
    corpo.dadosEmergencia = {
      tipoIntervencao: d.tipoIntervencao,
      intervaloMinimo: Number(d.intervaloMinHoras),
      dosagem: d.dosagem,
      notas: d.notasAplicacao || '',
    };
  } else if (plano.tipo === 'pontual') {
    corpo.dadosPontual = {
      nomeResponsavel: d.responsavel,
      justificacao: d.justificacao,
      dataAutorizacao: d.dataHoraAutorizacao,
    };
  }

  return corpo;
}

export async function init() {
  return true;
}

export async function listarPlanos() {
  const lista = await pedido('/planos');
  return (lista || []).map(paraFrontend);
}

export async function obterPlano(id) {
  const plano = await pedido(`/planos/${encodeURIComponent(id)}`);
  return paraFrontend(plano);
}

export async function guardarPlano(plano) {
  const criado = await pedido('/planos', {
    method: 'POST',
    body: JSON.stringify(paraAPI(plano)),
  });
  return criado?._id;
}

export async function eliminarPlano(id) {
  await pedido(`/planos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function login(email, password) {
  return pedido('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registar(dados) {
  return pedido('/auth/register', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}
