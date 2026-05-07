import { listarLotes } from '../storage/lotesStore.js';
import { listarPlanos } from '../storage/planosStore.js';

const CHAVE_VISTA = 'greenherb.vistaLotes';

const ROTULO_ERVA = {
  manjericao: 'Manjericão',
  hortela: 'Hortelã',
  alecrim: 'Alecrim',
  tomilho: 'Tomilho',
};

const ICONE_GRELHA = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="16" height="16">
    <rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>
    <rect x="14" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>
    <rect x="3" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>
    <rect x="14" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>
  </svg>
`;

const ICONE_LISTA = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="16" height="16">
    <line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="4" cy="6" r="1.4" fill="currentColor"/>
    <circle cx="4" cy="12" r="1.4" fill="currentColor"/>
    <circle cx="4" cy="18" r="1.4" fill="currentColor"/>
  </svg>
`;

function escaparHTML(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatarData(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function rotuloOrigem(id) {
  const ehObjectId = typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);
  return ehObjectId ? 'Guardado na API' : 'Guardado localmente';
}

function classeChipEstado(estado) {
  if (estado === 'concluído' || estado === 'concluido')
    return 'chip-estado-concluido';
  if (estado === 'comprometido') return 'chip-estado-comprometido';
  return 'chip-estado-ativo';
}

function rotuloEstado(estado) {
  if (estado === 'concluído' || estado === 'concluido') return 'Concluído';
  if (estado === 'comprometido') return 'Comprometido';
  return 'Ativo';
}

function obterVistaGuardada() {
  try {
    const v = localStorage.getItem(CHAVE_VISTA);
    if (v === 'lista' || v === 'grelha') return v;
  } catch {
    /* ignorar */
  }
  return 'grelha';
}

function guardarVista(modo) {
  try {
    localStorage.setItem(CHAVE_VISTA, modo);
  } catch {
    /* ignorar */
  }
}

function renderizarToggle(modo) {
  return `
    <div class="toggle-vista" role="group" aria-label="Modo de visualização">
      <button type="button" class="toggle-btn ${
        modo === 'grelha' ? 'ativo' : ''
      }" data-vista="grelha" aria-pressed="${modo === 'grelha'}" title="Vista em grelha">${ICONE_GRELHA}</button>
      <button type="button" class="toggle-btn ${
        modo === 'lista' ? 'ativo' : ''
      }" data-vista="lista" aria-pressed="${modo === 'lista'}" title="Vista em lista">${ICONE_LISTA}</button>
    </div>
  `;
}

function descricaoPlano(plano) {
  if (!plano) return '—';
  const erva = ROTULO_ERVA[plano.erva] || plano.erva;
  const tipo = plano.tipo;
  return `${erva} (${tipo})`;
}

function renderizarCartao(lote, mapaPlanos) {
  const erva = ROTULO_ERVA[lote.erva] || lote.erva;
  const plano = mapaPlanos.get(String(lote.planoId));
  return `
    <article class="cartao-plano linha-plano" data-id="${lote.id}" tabindex="0" role="link">
      <div class="cartao-plano-cabecalho">
        <h2 class="cartao-plano-erva">${escaparHTML(erva)}</h2>
        <span class="chip ${classeChipEstado(lote.estado)}">${escaparHTML(rotuloEstado(lote.estado))}</span>
      </div>
      <div class="cartao-plano-tipo">
        <span class="chip">Plano: ${escaparHTML(descricaoPlano(plano))}</span>
        <span class="chip">${escaparHTML(rotuloOrigem(lote.id))}</span>
      </div>
      <div class="cartao-plano-meta">
        <span>Início <span class="mono">${escaparHTML(formatarData(lote.dataInicio))}</span></span>
        <span>Quantidade <span class="mono">${escaparHTML(String(lote.quantidadeAtual ?? lote.quantidadeInicial ?? '—'))}</span> plantas</span>
      </div>
    </article>
  `;
}

function renderizarLinha(lote, mapaPlanos) {
  const erva = ROTULO_ERVA[lote.erva] || lote.erva;
  const plano = mapaPlanos.get(String(lote.planoId));
  return `
    <tr class="linha-plano" data-id="${lote.id}" tabindex="0">
      <td>${escaparHTML(erva)}</td>
      <td>${escaparHTML(descricaoPlano(plano))}</td>
      <td class="mono">${escaparHTML(formatarData(lote.dataInicio))}</td>
      <td>
        <span class="chip ${classeChipEstado(lote.estado)}">${escaparHTML(rotuloEstado(lote.estado))}</span>
      </td>
      <td>
        <span class="chip">${escaparHTML(rotuloOrigem(lote.id))}</span>
      </td>
    </tr>
  `;
}

function renderizarGrelha(lotes, mapaPlanos) {
  return `<div class="lista-planos">${lotes
    .map((l) => renderizarCartao(l, mapaPlanos))
    .join('')}</div>`;
}

function renderizarTabela(lotes, mapaPlanos) {
  return `
    <div class="tabela-planos-wrapper">
      <table class="tabela-planos">
        <thead>
          <tr>
            <th>Erva</th>
            <th>Plano</th>
            <th>Início</th>
            <th>Estado</th>
            <th>Origem</th>
          </tr>
        </thead>
        <tbody>${lotes.map((l) => renderizarLinha(l, mapaPlanos)).join('')}</tbody>
      </table>
    </div>
  `;
}

function estadoVazio() {
  return `
    <div class="estado-vazio">
      <h2>Sem lotes registados</h2>
      <p>Crie o primeiro lote para começar a acompanhar a produção.</p>
      <a href="#novoLote" class="btn btn-primario">Novo lote</a>
    </div>
  `;
}

export async function montar(elemento) {
  let modo = obterVistaGuardada();

  elemento.innerHTML = `
    <div class="cabecalho-vista">
      <div>
        <h1>Lotes de cultivo</h1>
        <p class="subtitulo">Acompanhamento dos lotes em produção.</p>
      </div>
      <div class="cabecalho-acoes">
        <div id="toggle-vista-wrapper">${renderizarToggle(modo)}</div>
        <a href="#novoLote" class="btn btn-primario">+ Novo lote</a>
      </div>
    </div>
    <div id="lotes-conteudo"><p class="aviso-carregamento">A carregar lotes…</p></div>
  `;

  const conteudo = elemento.querySelector('#lotes-conteudo');
  const toggleWrapper = elemento.querySelector('#toggle-vista-wrapper');

  let lotes = [];
  let planos = [];
  try {
    [lotes, planos] = await Promise.all([listarLotes(), listarPlanos()]);
  } catch (erro) {
    conteudo.innerHTML = `<div class="mensagem-erro-global">Não foi possível carregar os dados: ${escaparHTML(erro.message)}</div>`;
    return;
  }

  const mapaPlanos = new Map(planos.map((p) => [String(p.id), p]));

  function pintar() {
    if (!lotes.length) {
      conteudo.innerHTML = estadoVazio();
      return;
    }
    conteudo.innerHTML =
      modo === 'lista'
        ? renderizarTabela(lotes, mapaPlanos)
        : renderizarGrelha(lotes, mapaPlanos);
  }
  pintar();

  toggleWrapper.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-vista]');
    if (!botao) return;
    const novo = botao.dataset.vista;
    if (novo === modo) return;
    modo = novo;
    guardarVista(modo);
    toggleWrapper.innerHTML = renderizarToggle(modo);
    pintar();
  });

  conteudo.addEventListener('click', (evento) => {
    const linha = evento.target.closest('.linha-plano');
    if (linha) window.location.hash = '#detalheLote/' + linha.dataset.id;
  });

  conteudo.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Enter' && evento.key !== ' ') return;
    const linha = evento.target.closest('.linha-plano');
    if (!linha) return;
    if (evento.target.tagName === 'BUTTON') return;
    evento.preventDefault();
    window.location.hash = '#detalheLote/' + linha.dataset.id;
  });
}
