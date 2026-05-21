import { guardarPlano, modoAtivo } from '../storage/planosStore.js';
import { listarErvas } from '../storage/ervasStore.js';

const TIPOS = [
  { id: 'regular', rotulo: 'Regular' },
  { id: 'emergencia', rotulo: 'Emergência' },
  { id: 'pontual', rotulo: 'Pontual' },
];

const ERVAS = [
  { id: 'manjericao', rotulo: 'Manjericão' },
  { id: 'hortela', rotulo: 'Hortelã' },
  { id: 'alecrim', rotulo: 'Alecrim' },
  { id: 'tomilho', rotulo: 'Tomilho' },
];

const PASSOS = [
  { numero: 1, rotulo: 'Tipo' },
  { numero: 2, rotulo: 'Condições' },
  { numero: 3, rotulo: 'Rega e fertilização' },
  { numero: 4, rotulo: 'Revisão' },
];

const SUGESTOES_OPERACAO = {
  manjericao: { duracaoCiclo: 60, freqRega: 12, volumeRega: 1.5, freqFertilizacao: 7 },
  hortela: { duracaoCiclo: 45, freqRega: 8, volumeRega: 2, freqFertilizacao: 10 },
  alecrim: { duracaoCiclo: 90, freqRega: 24, volumeRega: 1, freqFertilizacao: 14 },
  tomilho: { duracaoCiclo: 75, freqRega: 18, volumeRega: 1.2, freqFertilizacao: 12 },
};

let ervasCache = null;

function normalizar(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

async function carregarErvasCache() {
  if (ervasCache) return ervasCache;
  try {
    ervasCache = await listarErvas();
  } catch {
    ervasCache = [];
  }
  return ervasCache;
}

function ervaCorrespondente(slug, ervas) {
  const alvo = normalizar(slug);
  return ervas.find((e) => normalizar(e.nome) === alvo) || null;
}

const estado = {
  passo: 1,
  tipo: null,
  erva: null,
  sugestaoDescartada: false,
  regular: {
    tempMin: '',
    tempMax: '',
    humMin: '',
    humMax: '',
    luxMin: '',
    luxMax: '',
    cicloDias: '',
    freqRega: '',
    volumeRega: '',
    freqFertilizacao: '',
  },
  emergencia: {
    tipoIntervencao: '',
    intervaloMin: '',
    dosagem: '',
    notasAplicacao: '',
  },
  pontual: {
    responsavel: '',
    justificacao: '',
    dataHora: '',
  },
};

function repor() {
  estado.passo = 1;
  estado.tipo = null;
  estado.erva = null;
  estado.sugestaoDescartada = false;
  Object.keys(estado.regular).forEach((k) => (estado.regular[k] = ''));
  Object.keys(estado.emergencia).forEach(
    (k) => (estado.emergencia[k] = '')
  );
  Object.keys(estado.pontual).forEach((k) => (estado.pontual[k] = ''));
}

function escaparHTML(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function rotuloDestino() {
  return modoAtivo() === 'remoto' ? 'Guardado na API' : 'Guardado localmente';
}

function rotuloTipo(id) {
  const t = TIPOS.find((x) => x.id === id);
  return t ? t.rotulo : '';
}

function rotuloErva(id) {
  const e = ERVAS.find((x) => x.id === id);
  return e ? e.rotulo : '';
}

function renderizarBarraProgresso() {
  const partes = [];
  PASSOS.forEach((passo, indice) => {
    let classe = '';
    if (passo.numero < estado.passo) classe = 'completo';
    else if (passo.numero === estado.passo) classe = 'ativo';

    partes.push(`
      <div class="passo ${classe}" data-passo="${passo.numero}">
        <span class="passo-bola">${passo.numero}</span>
        <span class="passo-rotulo">${escaparHTML(passo.rotulo)}</span>
      </div>
    `);

    if (indice < PASSOS.length - 1) {
      const linhaCompleta = passo.numero < estado.passo ? 'completa' : '';
      partes.push(`<span class="passo-linha ${linhaCompleta}"></span>`);
    }
  });
  return `<div class="barra-progresso">${partes.join('')}</div>`;
}

function renderizarPasso1() {
  const pillsTipos = TIPOS.map(
    (t) => `
      <button
        type="button"
        class="pill ${estado.tipo === t.id ? 'selecionado' : ''}"
        data-tipo="${t.id}"
      >
        ${escaparHTML(t.rotulo)}
      </button>
    `
  ).join('');

  const pillsErvas = ERVAS.map(
    (e) => `
      <button
        type="button"
        class="pill ${estado.erva === e.id ? 'selecionado' : ''}"
        data-erva="${e.id}"
      >
        ${escaparHTML(e.rotulo)}
      </button>
    `
  ).join('');

  return `
    <div class="cartao-formulario">
      <h2>Tipo de plano</h2>
      <p class="descricao-passo">
        Indique o tipo de plano e a erva aromática a que se aplica.
      </p>

      <span class="rotulo-grupo">Tipo de plano</span>
      <div class="grupo-pills" data-grupo="tipo">${pillsTipos}</div>
      <p class="mensagem-erro" id="erro-tipo" hidden></p>

      <span class="rotulo-grupo" style="margin-top: 16px;">Erva aromática</span>
      <div class="grupo-pills" data-grupo="erva">${pillsErvas}</div>
      <p class="mensagem-erro" id="erro-erva" hidden></p>

      <div id="zona-sugestao"></div>
    </div>
  `;
}

function renderizarCartaoSugestao(erva, slug) {
  const op = SUGESTOES_OPERACAO[slug] || {};
  const temIntervalos =
    erva.tempMin != null &&
    erva.tempMax != null &&
    erva.humidadeMin != null &&
    erva.humidadeMax != null;
  if (!temIntervalos) return '';

  const itens = [
    `Temperatura: <span class="mono">${erva.tempMin}°C – ${erva.tempMax}°C</span>`,
    `Humidade: <span class="mono">${erva.humidadeMin}% – ${erva.humidadeMax}%</span>`,
  ];
  if (erva.luminosidadeMin != null && erva.luminosidadeMax != null) {
    itens.push(
      `Luminosidade: <span class="mono">${erva.luminosidadeMin} – ${erva.luminosidadeMax} lux</span>`
    );
  }
  if (estado.tipo === 'regular' && op.duracaoCiclo) {
    itens.push(
      `Duração sugerida: <span class="mono">${op.duracaoCiclo} dias</span>`
    );
    itens.push(
      `Rega: <span class="mono">${op.freqRega}h / ${op.volumeRega}L</span>`
    );
    itens.push(
      `Fertilização: <span class="mono">${op.freqFertilizacao} dias</span>`
    );
  }

  return `
    <div class="cartao-sugestao" data-sugestao>
      <h3>
        <i class="ti ti-leaf" aria-hidden="true"></i>
        Sugestão para ${escaparHTML(erva.nome)}
      </h3>
      <p style="margin: 0 0 4px; font-size: 12px; color: var(--color-text-secondary);">
        Com base nos dados desta erva, sugerimos os seguintes valores:
      </p>
      <ul>
        ${itens.map((i) => `<li>${i}</li>`).join('')}
      </ul>
      <div style="display: flex; gap: 8px;">
        <button type="button" class="btn btn-primario" data-acao="aplicar-sugestao">
          Aplicar sugestão
        </button>
        <button type="button" class="btn btn-ghost" data-acao="ignorar-sugestao">
          Ignorar
        </button>
      </div>
    </div>
  `;
}

async function atualizarZonaSugestao(elemento) {
  if (estado.passo !== 1) return;
  const zona = elemento.querySelector('#zona-sugestao');
  if (!zona) return;
  if (!estado.erva || estado.sugestaoDescartada) {
    zona.innerHTML = '';
    return;
  }
  const ervas = await carregarErvasCache();
  const erva = ervaCorrespondente(estado.erva, ervas);
  if (!erva) {
    zona.innerHTML = '';
    return;
  }
  zona.innerHTML = renderizarCartaoSugestao(erva, estado.erva);

  zona
    .querySelector('[data-acao="ignorar-sugestao"]')
    ?.addEventListener('click', () => {
      estado.sugestaoDescartada = true;
      zona.innerHTML = '';
    });

  zona
    .querySelector('[data-acao="aplicar-sugestao"]')
    ?.addEventListener('click', () => {
      aplicarSugestao(erva, estado.erva);
      zona.innerHTML = `
        <div class="cartao-sugestao" style="background-color: rgba(126,207,160,0.18);">
          <p style="margin: 0; font-size: 12px; color: #2b6a47;">
            ✓ Sugestão aplicada. Os valores serão pré-preenchidos no próximo passo.
          </p>
        </div>
      `;
    });
}

function aplicarSugestao(erva, slug) {
  const op = SUGESTOES_OPERACAO[slug] || {};
  if (estado.tipo === 'regular' || !estado.tipo) {
    if (erva.tempMin != null) estado.regular.tempMin = String(erva.tempMin);
    if (erva.tempMax != null) estado.regular.tempMax = String(erva.tempMax);
    if (erva.humidadeMin != null)
      estado.regular.humMin = String(erva.humidadeMin);
    if (erva.humidadeMax != null)
      estado.regular.humMax = String(erva.humidadeMax);
    if (erva.luminosidadeMin != null)
      estado.regular.luxMin = String(erva.luminosidadeMin);
    if (erva.luminosidadeMax != null)
      estado.regular.luxMax = String(erva.luminosidadeMax);
    if (op.duracaoCiclo) estado.regular.cicloDias = String(op.duracaoCiclo);
    if (op.freqRega) estado.regular.freqRega = String(op.freqRega);
    if (op.volumeRega) estado.regular.volumeRega = String(op.volumeRega);
    if (op.freqFertilizacao)
      estado.regular.freqFertilizacao = String(op.freqFertilizacao);
  }
}

function campoNumero(id, rotulo, valor, sufixo, passo) {
  return `
    <div class="campo" data-campo="${id}">
      <label for="${id}">${escaparHTML(rotulo)}${
    sufixo ? ` (${escaparHTML(sufixo)})` : ''
  }</label>
      <input
        id="${id}"
        name="${id}"
        type="number"
        step="${passo || 'any'}"
        value="${escaparHTML(valor)}"
      />
      <p class="mensagem-erro" hidden></p>
    </div>
  `;
}

function campoTexto(id, rotulo, valor) {
  return `
    <div class="campo" data-campo="${id}">
      <label for="${id}">${escaparHTML(rotulo)}</label>
      <input id="${id}" name="${id}" type="text" value="${escaparHTML(
    valor
  )}" />
      <p class="mensagem-erro" hidden></p>
    </div>
  `;
}

function campoTextarea(id, rotulo, valor) {
  return `
    <div class="campo" data-campo="${id}">
      <label for="${id}">${escaparHTML(rotulo)}</label>
      <textarea id="${id}" name="${id}">${escaparHTML(valor)}</textarea>
      <p class="mensagem-erro" hidden></p>
    </div>
  `;
}

function campoDataHora(id, rotulo, valor) {
  return `
    <div class="campo" data-campo="${id}">
      <label for="${id}">${escaparHTML(rotulo)}</label>
      <input
        id="${id}"
        name="${id}"
        type="datetime-local"
        value="${escaparHTML(valor)}"
      />
      <p class="mensagem-erro" hidden></p>
    </div>
  `;
}

function renderizarPasso2() {
  if (estado.tipo === 'regular') {
    const r = estado.regular;
    return `
      <div class="cartao-formulario">
        <h2>Condições ambientais</h2>
        <p class="descricao-passo">
          Defina os intervalos ideais para o ciclo de cultivo regular.
        </p>

        <span class="rotulo-grupo">Temperatura</span>
        <div class="linha-campos">
          ${campoNumero('tempMin', 'Mínima', r.tempMin, '°C', '0.1')}
          ${campoNumero('tempMax', 'Máxima', r.tempMax, '°C', '0.1')}
        </div>

        <span class="rotulo-grupo">Humidade</span>
        <div class="linha-campos">
          ${campoNumero('humMin', 'Mínima', r.humMin, '%', '1')}
          ${campoNumero('humMax', 'Máxima', r.humMax, '%', '1')}
        </div>

        <span class="rotulo-grupo">Luminosidade</span>
        <div class="linha-campos">
          ${campoNumero('luxMin', 'Mínima', r.luxMin, 'lux', '1')}
          ${campoNumero('luxMax', 'Máxima', r.luxMax, 'lux', '1')}
        </div>

        <span class="rotulo-grupo">Ciclo</span>
        <div class="linha-campos">
          ${campoNumero(
            'cicloDias',
            'Duração prevista',
            r.cicloDias,
            'dias',
            '1'
          )}
        </div>
      </div>
    `;
  }

  if (estado.tipo === 'emergencia') {
    const e = estado.emergencia;
    return `
      <div class="cartao-formulario">
        <h2>Intervenção de emergência</h2>
        <p class="descricao-passo">
          Indique os parâmetros da intervenção a aplicar de forma reativa.
        </p>

        ${campoTexto('tipoIntervencao', 'Tipo de intervenção', e.tipoIntervencao)}

        <div class="linha-campos">
          ${campoNumero(
            'intervaloMin',
            'Intervalo mínimo entre intervenções',
            e.intervaloMin,
            'horas',
            '1'
          )}
          ${campoTexto('dosagem', 'Dosagem ou intensidade', e.dosagem)}
        </div>
      </div>
    `;
  }

  if (estado.tipo === 'pontual') {
    const p = estado.pontual;
    return `
      <div class="cartao-formulario">
        <h2>Autorização da intervenção pontual</h2>
        <p class="descricao-passo">
          Registe quem autoriza a intervenção e o respetivo motivo.
        </p>

        ${campoTexto(
          'responsavel',
          'Responsável técnico que autoriza',
          p.responsavel
        )}
        ${campoTextarea('justificacao', 'Justificação', p.justificacao)}
        ${campoDataHora('dataHora', 'Data e hora da autorização', p.dataHora)}
      </div>
    `;
  }

  return '';
}

function renderizarPasso3() {
  if (estado.tipo === 'regular') {
    const r = estado.regular;
    return `
      <div class="cartao-formulario">
        <h2>Rega e fertilização</h2>
        <p class="descricao-passo">
          Configure a frequência de rega e o ciclo de fertilização.
        </p>

        <div class="linha-campos">
          ${campoNumero(
            'freqRega',
            'Frequência de rega',
            r.freqRega,
            'horas',
            '1'
          )}
          ${campoNumero(
            'volumeRega',
            'Volume por rega',
            r.volumeRega,
            'litros',
            '0.1'
          )}
          ${campoNumero(
            'freqFertilizacao',
            'Frequência de fertilização',
            r.freqFertilizacao,
            'dias',
            '1'
          )}
        </div>
      </div>
    `;
  }

  if (estado.tipo === 'emergencia') {
    const e = estado.emergencia;
    return `
      <div class="cartao-formulario">
        <h2>Notas de aplicação</h2>
        <p class="descricao-passo">
          Em planos de emergência, a rega segue o ciclo do plano regular
          ativo. Adicione apenas notas relevantes para esta intervenção.
        </p>

        ${campoTextarea(
          'notasAplicacao',
          'Notas de aplicação (opcional)',
          e.notasAplicacao
        )}
      </div>
    `;
  }

  if (estado.tipo === 'pontual') {
    return `
      <div class="cartao-formulario">
        <h2>Rega e fertilização</h2>
        <p class="descricao-passo">
          Os planos pontuais não envolvem planeamento de rega ou
          fertilização. Pode avançar para o passo seguinte.
        </p>
      </div>
    `;
  }

  return '';
}

function linhaRevisao(rotulo, valor, valorMono = false) {
  const valorClasse = valorMono ? 'revisao-item-valor numero' : 'revisao-item-valor';
  return `
    <div class="revisao-item">
      <span class="revisao-item-rotulo">${escaparHTML(rotulo)}</span>
      <span class="${valorClasse}">${escaparHTML(valor) || '—'}</span>
    </div>
  `;
}

function renderizarPasso4() {
  const seccoes = [];

  seccoes.push(`
    <div class="revisao-seccao">
      <div class="revisao-seccao-cabecalho">
        <h3>Tipo de plano</h3>
        <button type="button" class="btn btn-ghost" data-editar="1">
          Editar
        </button>
      </div>
      <div class="revisao-itens">
        ${linhaRevisao('Tipo', rotuloTipo(estado.tipo))}
        ${linhaRevisao('Erva aromática', rotuloErva(estado.erva))}
      </div>
    </div>
  `);

  if (estado.tipo === 'regular') {
    const r = estado.regular;
    seccoes.push(`
      <div class="revisao-seccao">
        <div class="revisao-seccao-cabecalho">
          <h3>Condições ambientais</h3>
          <button type="button" class="btn btn-ghost" data-editar="2">
            Editar
          </button>
        </div>
        <div class="revisao-itens">
          ${linhaRevisao('Temperatura mín.', r.tempMin + ' °C', true)}
          ${linhaRevisao('Temperatura máx.', r.tempMax + ' °C', true)}
          ${linhaRevisao('Humidade mín.', r.humMin + ' %', true)}
          ${linhaRevisao('Humidade máx.', r.humMax + ' %', true)}
          ${linhaRevisao('Luminosidade mín.', r.luxMin + ' lux', true)}
          ${linhaRevisao('Luminosidade máx.', r.luxMax + ' lux', true)}
          ${linhaRevisao('Duração do ciclo', r.cicloDias + ' dias', true)}
        </div>
      </div>
      <div class="revisao-seccao">
        <div class="revisao-seccao-cabecalho">
          <h3>Rega e fertilização</h3>
          <button type="button" class="btn btn-ghost" data-editar="3">
            Editar
          </button>
        </div>
        <div class="revisao-itens">
          ${linhaRevisao('Frequência de rega', r.freqRega + ' h', true)}
          ${linhaRevisao('Volume por rega', r.volumeRega + ' L', true)}
          ${linhaRevisao(
            'Frequência de fertilização',
            r.freqFertilizacao + ' dias',
            true
          )}
        </div>
      </div>
    `);
  } else if (estado.tipo === 'emergencia') {
    const e = estado.emergencia;
    seccoes.push(`
      <div class="revisao-seccao">
        <div class="revisao-seccao-cabecalho">
          <h3>Intervenção</h3>
          <button type="button" class="btn btn-ghost" data-editar="2">
            Editar
          </button>
        </div>
        <div class="revisao-itens">
          ${linhaRevisao('Tipo de intervenção', e.tipoIntervencao)}
          ${linhaRevisao(
            'Intervalo mínimo',
            e.intervaloMin + ' h',
            true
          )}
          ${linhaRevisao('Dosagem ou intensidade', e.dosagem)}
        </div>
      </div>
      <div class="revisao-seccao">
        <div class="revisao-seccao-cabecalho">
          <h3>Notas</h3>
          <button type="button" class="btn btn-ghost" data-editar="3">
            Editar
          </button>
        </div>
        <div class="revisao-itens">
          ${linhaRevisao('Notas de aplicação', e.notasAplicacao || '—')}
        </div>
      </div>
    `);
  } else if (estado.tipo === 'pontual') {
    const p = estado.pontual;
    let dataFormatada = '—';
    if (p.dataHora) {
      try {
        dataFormatada = new Date(p.dataHora).toLocaleString('pt-PT');
      } catch {
        dataFormatada = p.dataHora;
      }
    }
    seccoes.push(`
      <div class="revisao-seccao">
        <div class="revisao-seccao-cabecalho">
          <h3>Autorização</h3>
          <button type="button" class="btn btn-ghost" data-editar="2">
            Editar
          </button>
        </div>
        <div class="revisao-itens">
          ${linhaRevisao('Responsável', p.responsavel)}
          ${linhaRevisao('Justificação', p.justificacao)}
          ${linhaRevisao('Data e hora', dataFormatada, true)}
        </div>
      </div>
    `);
  }

  return `
    <div class="cartao-formulario">
      <h2>Revisão e confirmação</h2>
      <p class="descricao-passo">
        Verifique os dados antes de guardar. Os planos ficam guardados
        localmente neste dispositivo.
      </p>
      ${seccoes.join('')}
    </div>
  `;
}

function renderizarBarraAcoes() {
  const ehUltimo = estado.passo === 4;
  const ehPrimeiro = estado.passo === 1;

  return `
    <div class="barra-acoes">
      <button
        type="button"
        class="btn btn-secundario"
        data-acao="anterior"
        ${ehPrimeiro ? 'disabled' : ''}
      >
        Anterior
      </button>
      <div class="barra-acoes-direita">
        <a href="#planos" class="btn btn-ghost">Cancelar</a>
        ${
          ehUltimo
            ? '<button type="button" class="btn btn-primario" data-acao="guardar">Guardar plano</button>'
            : '<button type="button" class="btn btn-primario" data-acao="seguinte">Avançar</button>'
        }
      </div>
    </div>
  `;
}

function renderizar(elemento) {
  let conteudoPasso = '';
  if (estado.passo === 1) conteudoPasso = renderizarPasso1();
  else if (estado.passo === 2) conteudoPasso = renderizarPasso2();
  else if (estado.passo === 3) conteudoPasso = renderizarPasso3();
  else if (estado.passo === 4) conteudoPasso = renderizarPasso4();

  elemento.innerHTML = `
    <div class="cabecalho-vista">
      <div>
        <h1>Novo plano de cultivo</h1>
        <p class="subtitulo">
          Preencha os passos seguintes para registar um novo plano.
        </p>
      </div>
      <span class="chip">${escaparHTML(rotuloDestino())}</span>
    </div>

    <div class="wizard">
      ${renderizarBarraProgresso()}
      <form id="formulario-plano" novalidate>
        <div id="mensagem-global"></div>
        ${conteudoPasso}
        ${renderizarBarraAcoes()}
      </form>
    </div>
  `;

  ligarEventos(elemento);
}

function ligarEventos(elemento) {
  const formulario = elemento.querySelector('#formulario-plano');

  if (estado.passo === 1) {
    elemento
      .querySelectorAll('[data-grupo="tipo"] .pill')
      .forEach((botao) => {
        botao.addEventListener('click', () => {
          estado.tipo = botao.dataset.tipo;
          renderizar(elemento);
        });
      });

    elemento
      .querySelectorAll('[data-grupo="erva"] .pill')
      .forEach((botao) => {
        botao.addEventListener('click', () => {
          if (estado.erva !== botao.dataset.erva) {
            estado.sugestaoDescartada = false;
          }
          estado.erva = botao.dataset.erva;
          renderizar(elemento);
        });
      });

    atualizarZonaSugestao(elemento);
  }

  if (estado.passo === 2 || estado.passo === 3) {
    formulario.querySelectorAll('input, textarea').forEach((campo) => {
      campo.addEventListener('input', () => {
        guardarValor(campo.name, campo.value);
        const grupo = campo.closest('.campo');
        if (grupo) {
          grupo.classList.remove('erro');
          const erro = grupo.querySelector('.mensagem-erro');
          if (erro) {
            erro.hidden = true;
            erro.textContent = '';
          }
        }
      });
    });
  }

  const botaoAnterior = elemento.querySelector('[data-acao="anterior"]');
  if (botaoAnterior) {
    botaoAnterior.addEventListener('click', () => {
      const proximo = passoAnterior(estado.passo);
      if (proximo) {
        estado.passo = proximo;
        renderizar(elemento);
      }
    });
  }

  const botaoSeguinte = elemento.querySelector('[data-acao="seguinte"]');
  if (botaoSeguinte) {
    botaoSeguinte.addEventListener('click', () => {
      if (!validarPasso(estado.passo, elemento)) return;
      const proximo = passoSeguinte(estado.passo);
      if (proximo) {
        estado.passo = proximo;
        renderizar(elemento);
      }
    });
  }

  const botaoGuardar = elemento.querySelector('[data-acao="guardar"]');
  if (botaoGuardar) {
    botaoGuardar.addEventListener('click', async () => {
      botaoGuardar.disabled = true;
      try {
        await guardarPlanoFinal();
        repor();
        window.location.hash = '#planos';
      } catch (erro) {
        botaoGuardar.disabled = false;
        const msg = elemento.querySelector('#mensagem-global');
        msg.innerHTML = `
          <div class="mensagem-erro-global">
            Não foi possível guardar o plano: ${escaparHTML(erro.message)}
          </div>
        `;
      }
    });
  }

  elemento.querySelectorAll('[data-editar]').forEach((botao) => {
    botao.addEventListener('click', () => {
      estado.passo = Number(botao.dataset.editar);
      renderizar(elemento);
    });
  });
}

function guardarValor(nome, valor) {
  if (!nome) return;
  if (estado.tipo === 'regular' && nome in estado.regular) {
    estado.regular[nome] = valor;
  } else if (estado.tipo === 'emergencia' && nome in estado.emergencia) {
    estado.emergencia[nome] = valor;
  } else if (estado.tipo === 'pontual' && nome in estado.pontual) {
    estado.pontual[nome] = valor;
  }
}

function passoSeguinte(atual) {
  if (atual >= 4) return null;
  return atual + 1;
}

function passoAnterior(atual) {
  if (atual <= 1) return null;
  return atual - 1;
}

function mostrarErroCampo(elemento, nomeCampo, mensagem) {
  const grupo = elemento.querySelector(`[data-campo="${nomeCampo}"]`);
  if (!grupo) return;
  grupo.classList.add('erro');
  const span = grupo.querySelector('.mensagem-erro');
  if (span) {
    span.hidden = false;
    span.textContent = mensagem;
  }
}

function mostrarErroGrupo(elemento, idErro, mensagem) {
  const span = elemento.querySelector(`#${idErro}`);
  if (!span) return;
  span.hidden = false;
  span.textContent = mensagem;
}

function validarObrigatorioTexto(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function validarNumeroPositivo(valor) {
  if (valor === '' || valor === null || valor === undefined) return false;
  const n = Number(valor);
  return Number.isFinite(n) && n > 0;
}

function validarNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return false;
  return Number.isFinite(Number(valor));
}

function validarPasso(passo, elemento) {
  let valido = true;

  if (passo === 1) {
    if (!estado.tipo) {
      mostrarErroGrupo(
        elemento,
        'erro-tipo',
        'Selecione o tipo de plano para continuar.'
      );
      valido = false;
    }
    if (!estado.erva) {
      mostrarErroGrupo(
        elemento,
        'erro-erva',
        'Selecione a erva aromática a que se aplica.'
      );
      valido = false;
    }
    return valido;
  }

  if (passo === 2 && estado.tipo === 'regular') {
    const r = estado.regular;
    const camposObrigatorios = [
      ['tempMin', 'Indique a temperatura mínima.'],
      ['tempMax', 'Indique a temperatura máxima.'],
      ['humMin', 'Indique a humidade mínima.'],
      ['humMax', 'Indique a humidade máxima.'],
      ['luxMin', 'Indique a luminosidade mínima.'],
      ['luxMax', 'Indique a luminosidade máxima.'],
      ['cicloDias', 'Indique a duração prevista do ciclo.'],
    ];

    camposObrigatorios.forEach(([nome, mensagem]) => {
      if (!validarNumero(r[nome])) {
        mostrarErroCampo(elemento, nome, mensagem);
        valido = false;
      }
    });

    if (validarNumero(r.tempMin) && validarNumero(r.tempMax)) {
      if (Number(r.tempMin) >= Number(r.tempMax)) {
        mostrarErroCampo(
          elemento,
          'tempMax',
          'A temperatura máxima tem de ser superior à mínima.'
        );
        valido = false;
      }
    }
    if (validarNumero(r.humMin) && validarNumero(r.humMax)) {
      if (Number(r.humMin) < 0 || Number(r.humMax) > 100) {
        mostrarErroCampo(
          elemento,
          'humMax',
          'A humidade tem de estar entre 0 e 100 %.'
        );
        valido = false;
      } else if (Number(r.humMin) >= Number(r.humMax)) {
        mostrarErroCampo(
          elemento,
          'humMax',
          'A humidade máxima tem de ser superior à mínima.'
        );
        valido = false;
      }
    }
    if (validarNumero(r.luxMin) && validarNumero(r.luxMax)) {
      if (Number(r.luxMin) >= Number(r.luxMax)) {
        mostrarErroCampo(
          elemento,
          'luxMax',
          'A luminosidade máxima tem de ser superior à mínima.'
        );
        valido = false;
      }
    }
    if (validarNumero(r.cicloDias) && Number(r.cicloDias) <= 0) {
      mostrarErroCampo(
        elemento,
        'cicloDias',
        'A duração do ciclo tem de ser superior a zero.'
      );
      valido = false;
    }

    return valido;
  }

  if (passo === 2 && estado.tipo === 'emergencia') {
    const e = estado.emergencia;
    if (!validarObrigatorioTexto(e.tipoIntervencao)) {
      mostrarErroCampo(
        elemento,
        'tipoIntervencao',
        'Indique o tipo de intervenção.'
      );
      valido = false;
    }
    if (!validarNumeroPositivo(e.intervaloMin)) {
      mostrarErroCampo(
        elemento,
        'intervaloMin',
        'Indique um intervalo em horas superior a zero.'
      );
      valido = false;
    }
    if (!validarObrigatorioTexto(e.dosagem)) {
      mostrarErroCampo(
        elemento,
        'dosagem',
        'Indique a dosagem ou intensidade.'
      );
      valido = false;
    }
    return valido;
  }

  if (passo === 2 && estado.tipo === 'pontual') {
    const p = estado.pontual;
    if (!validarObrigatorioTexto(p.responsavel)) {
      mostrarErroCampo(
        elemento,
        'responsavel',
        'Indique o nome do responsável técnico.'
      );
      valido = false;
    }
    if (
      !validarObrigatorioTexto(p.justificacao) ||
      p.justificacao.trim().length < 10
    ) {
      mostrarErroCampo(
        elemento,
        'justificacao',
        'Apresente uma justificação com pelo menos 10 caracteres.'
      );
      valido = false;
    }
    if (!validarObrigatorioTexto(p.dataHora)) {
      mostrarErroCampo(
        elemento,
        'dataHora',
        'Indique a data e hora da autorização.'
      );
      valido = false;
    }
    return valido;
  }

  if (passo === 3 && estado.tipo === 'regular') {
    const r = estado.regular;
    if (!validarNumeroPositivo(r.freqRega)) {
      mostrarErroCampo(
        elemento,
        'freqRega',
        'Indique uma frequência em horas superior a zero.'
      );
      valido = false;
    }
    if (!validarNumeroPositivo(r.volumeRega)) {
      mostrarErroCampo(
        elemento,
        'volumeRega',
        'Indique um volume em litros superior a zero.'
      );
      valido = false;
    }
    if (!validarNumeroPositivo(r.freqFertilizacao)) {
      mostrarErroCampo(
        elemento,
        'freqFertilizacao',
        'Indique uma frequência em dias superior a zero.'
      );
      valido = false;
    }
    return valido;
  }

  return true;
}

async function guardarPlanoFinal() {
  let dadosEspecificos;

  if (estado.tipo === 'regular') {
    const r = estado.regular;
    dadosEspecificos = {
      condicoes: {
        temperatura: { min: Number(r.tempMin), max: Number(r.tempMax) },
        humidade: { min: Number(r.humMin), max: Number(r.humMax) },
        luminosidade: { min: Number(r.luxMin), max: Number(r.luxMax) },
        cicloDias: Number(r.cicloDias),
      },
      rega: {
        frequenciaHoras: Number(r.freqRega),
        volumeLitros: Number(r.volumeRega),
        frequenciaFertilizacaoDias: Number(r.freqFertilizacao),
      },
    };
  } else if (estado.tipo === 'emergencia') {
    const e = estado.emergencia;
    dadosEspecificos = {
      tipoIntervencao: e.tipoIntervencao.trim(),
      intervaloMinHoras: Number(e.intervaloMin),
      dosagem: e.dosagem.trim(),
      notasAplicacao: e.notasAplicacao.trim(),
    };
  } else if (estado.tipo === 'pontual') {
    const p = estado.pontual;
    dadosEspecificos = {
      responsavel: p.responsavel.trim(),
      justificacao: p.justificacao.trim(),
      dataHoraAutorizacao: p.dataHora,
    };
  }

  const plano = {
    tipo: estado.tipo,
    erva: estado.erva,
    dadosEspecificos,
    estado: 'ativo',
  };

  return guardarPlano(plano);
}

export async function montar(elemento) {
  repor();
  renderizar(elemento);
}
