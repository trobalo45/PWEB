import { listarPlanos, eliminarPlano } from '../storage/planosStore.js';

const CHAVE_VISTA = 'greenherb.vistaPlanos';

const ROTULO_TIPO = {
  regular: 'Regular',
  emergencia: 'Emergência',
  pontual: 'Pontual',
};

const ROTULO_ERVA = {
  manjericao: 'Manjericão',
  hortela: 'Hortelã',
  alecrim: 'Alecrim',
  tomilho: 'Tomilho',
};

function formatarData(iso) {
  try {
    const data = new Date(iso);
    return data.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function classeChipTipo(tipo) {
  if (tipo === 'emergencia') return 'chip-tipo-emergencia';
  if (tipo === 'pontual') return 'chip-tipo-pontual';
  return 'chip-tipo-regular';
}

function rotuloOrigem(id) {
  const ehObjectId = typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);
  return ehObjectId ? 'Guardado na API' : 'Guardado localmente';
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

function obterVistaGuardada() {
  try {
    const valor = localStorage.getItem(CHAVE_VISTA);
    if (valor === 'lista' || valor === 'grelha') return valor;
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

function renderizarToggle(modo) {
  return `
    <div class="toggle-vista" role="group" aria-label="Modo de visualização">
      <button
        type="button"
        class="toggle-btn ${modo === 'grelha' ? 'ativo' : ''}"
        data-vista="grelha"
        aria-pressed="${modo === 'grelha'}"
        aria-label="Vista em grelha"
        title="Vista em grelha"
      >
        ${ICONE_GRELHA}
      </button>
      <button
        type="button"
        class="toggle-btn ${modo === 'lista' ? 'ativo' : ''}"
        data-vista="lista"
        aria-pressed="${modo === 'lista'}"
        aria-label="Vista em lista"
        title="Vista em lista"
      >
        ${ICONE_LISTA}
      </button>
    </div>
  `;
}

function renderizarCartao(plano) {
  const tipoClasse = classeChipTipo(plano.tipo);
  const tipoTexto = ROTULO_TIPO[plano.tipo] || plano.tipo;
  const ervaTexto = ROTULO_ERVA[plano.erva] || plano.erva;
  const estadoTexto = plano.estado === 'ativo' ? 'Ativo' : plano.estado;

  return `
    <article
      class="cartao-plano linha-plano"
      data-id="${plano.id}"
      role="link"
      tabindex="0"
    >
      <div class="cartao-plano-cabecalho">
        <h2 class="cartao-plano-erva">${escaparHTML(ervaTexto)}</h2>
        <span class="chip chip-estado-ativo">${escaparHTML(estadoTexto)}</span>
      </div>
      <div class="cartao-plano-tipo">
        <span class="chip ${tipoClasse}">${escaparHTML(tipoTexto)}</span>
        <span class="chip">${escaparHTML(rotuloOrigem(plano.id))}</span>
      </div>
      <div class="cartao-plano-meta">
        <span>Criado em <span class="mono">${escaparHTML(
          formatarData(plano.dataCriacao)
        )}</span></span>
        <span>ID <span class="mono">#${escaparHTML(plano.id)}</span></span>
      </div>
      <div class="cartao-plano-acoes">
        <button type="button" class="btn btn-perigo" data-acao="eliminar">
          Eliminar
        </button>
      </div>
    </article>
  `;
}

function renderizarLinhaTabela(plano) {
  const tipoClasse = classeChipTipo(plano.tipo);
  const tipoTexto = ROTULO_TIPO[plano.tipo] || plano.tipo;
  const ervaTexto = ROTULO_ERVA[plano.erva] || plano.erva;
  const estadoTexto = plano.estado === 'ativo' ? 'Ativo' : plano.estado;

  return `
    <tr class="linha-plano" data-id="${plano.id}" tabindex="0">
      <td>${escaparHTML(ervaTexto)}</td>
      <td>
        <span class="chip ${tipoClasse}">${escaparHTML(tipoTexto)}</span>
      </td>
      <td class="mono">${escaparHTML(formatarData(plano.dataCriacao))}</td>
      <td>
        <span class="chip chip-estado-ativo">${escaparHTML(estadoTexto)}</span>
      </td>
      <td>
        <span class="chip">${escaparHTML(rotuloOrigem(plano.id))}</span>
      </td>
      <td class="celula-acoes">
        <button type="button" class="btn btn-perigo" data-acao="eliminar">
          Eliminar
        </button>
      </td>
    </tr>
  `;
}

function renderizarGrelha(planos) {
  return `
    <div class="lista-planos">
      ${planos.map(renderizarCartao).join('')}
    </div>
  `;
}

function renderizarTabela(planos) {
  return `
    <div class="tabela-planos-wrapper">
      <table class="tabela-planos">
        <thead>
          <tr>
            <th>Erva</th>
            <th>Tipo</th>
            <th>Data de criação</th>
            <th>Estado</th>
            <th>Origem</th>
            <th aria-label="Ações"></th>
          </tr>
        </thead>
        <tbody>
          ${planos.map(renderizarLinhaTabela).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderizarEstadoVazio() {
  return `
    <div class="estado-vazio">
      <h2>Sem planos guardados</h2>
      <p>
        Ainda não criou nenhum plano de cultivo. Crie o primeiro plano para
        começar a gerir a sua estufa.
      </p>
      <a href="#novo" class="btn btn-primario">Novo plano</a>
    </div>
  `;
}

function navegarParaDetalhe(id) {
  if (!id) return;
  window.location.hash = '#plano/' + id;
}

export async function montar(elemento) {
  let modo = obterVistaGuardada();

  elemento.innerHTML = `
    <div class="cabecalho-vista">
      <div>
        <h1>Planos de cultivo</h1>
        <p class="subtitulo">
          Gestão de planos regulares, de emergência e pontuais.
        </p>
      </div>
      <div class="cabecalho-acoes">
        <div id="toggle-vista-wrapper">${renderizarToggle(modo)}</div>
        <a href="#novo" class="btn btn-primario">+ Novo plano</a>
      </div>
    </div>

    <div id="planos-conteudo">
      <p class="aviso-carregamento">A carregar planos…</p>
    </div>
  `;

  const conteudo = elemento.querySelector('#planos-conteudo');
  const toggleWrapper = elemento.querySelector('#toggle-vista-wrapper');

  let planos;
  try {
    planos = await listarPlanos();
  } catch (erro) {
    conteudo.innerHTML = `
      <div class="mensagem-erro-global">
        Não foi possível carregar os planos: ${escaparHTML(erro.message)}
      </div>
    `;
    return;
  }

  function pintar() {
    if (!planos.length) {
      conteudo.innerHTML = renderizarEstadoVazio();
      return;
    }
    conteudo.innerHTML =
      modo === 'lista' ? renderizarTabela(planos) : renderizarGrelha(planos);
  }

  pintar();

  toggleWrapper.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-vista]');
    if (!botao) return;
    const novoModo = botao.dataset.vista;
    if (novoModo === modo) return;
    modo = novoModo;
    guardarVista(modo);
    toggleWrapper.innerHTML = renderizarToggle(modo);
    pintar();
  });

  conteudo.addEventListener('click', async (evento) => {
    const botaoEliminar = evento.target.closest(
      'button[data-acao="eliminar"]'
    );
    if (botaoEliminar) {
      evento.stopPropagation();
      const linha = botaoEliminar.closest('.linha-plano');
      const id = linha.dataset.id;
      const confirmar = window.confirm(
        'Tem a certeza de que pretende eliminar este plano?'
      );
      if (!confirmar) return;
      botaoEliminar.disabled = true;
      try {
        await eliminarPlano(id);
        planos = planos.filter((p) => String(p.id) !== String(id));
        pintar();
      } catch (erro) {
        botaoEliminar.disabled = false;
        window.alert('Não foi possível eliminar o plano: ' + erro.message);
      }
      return;
    }

    const linha = evento.target.closest('.linha-plano');
    if (linha) {
      navegarParaDetalhe(linha.dataset.id);
    }
  });

  conteudo.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Enter' && evento.key !== ' ') return;
    const linha = evento.target.closest('.linha-plano');
    if (!linha) return;
    if (evento.target.tagName === 'BUTTON') return;
    evento.preventDefault();
    navegarParaDetalhe(linha.dataset.id);
  });
}
