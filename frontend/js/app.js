import { init as initStore } from './storage/planosStore.js';
import * as vistaPlanos from './views/planos.js';
import * as vistaNovoPlano from './views/novoPlano.js';
import * as vistaDetalhePlano from './views/detalhePlano.js';
import * as vistaLogin from './views/login.js';
import * as vistaLotes from './views/lotes.js';
import * as vistaNovoLote from './views/novoLote.js';
import * as vistaDetalheLote from './views/detalheLote.js';
import * as vistaTarefas from './views/tarefas.js';
import * as vistaMedicoes from './views/medicoes.js';
import * as vistaAlertas from './views/alertas.js';
import * as vistaRelatorios from './views/relatorios.js';
import * as vistaAuditoria from './views/auditoria.js';
import * as vistaUtilizadores from './views/utilizadores.js';
import * as vistaDashboard from './views/dashboard.js';

const CHAVE_ULTIMA_VISTA = 'greenherb.ultimaVista';
const CHAVE_MODO_UI = 'greenherb.modoUI';
const CHAVE_TOKEN = 'greenherb.token';
const CHAVE_UTILIZADOR = 'greenherb.utilizador';

const ROTAS = {
  dashboard: {
    rotulo: 'Dashboard',
    grupo: 'Geral',
    montar: vistaDashboard.montar,
  },
  planos: {
    rotulo: 'Planos',
    grupo: 'Gestão',
    montar: vistaPlanos.montar,
  },
  novo: {
    rotulo: 'Novo plano',
    grupo: 'Gestão',
    paiNav: 'planos',
    montar: vistaNovoPlano.montar,
  },
  plano: {
    rotulo: 'Detalhe do plano',
    grupo: 'Gestão',
    paiNav: 'planos',
    montar: vistaDetalhePlano.montar,
  },
  lotes: {
    rotulo: 'Lotes',
    grupo: 'Gestão',
    montar: vistaLotes.montar,
  },
  novoLote: {
    rotulo: 'Novo lote',
    grupo: 'Gestão',
    paiNav: 'lotes',
    montar: vistaNovoLote.montar,
  },
  detalheLote: {
    rotulo: 'Detalhe do lote',
    grupo: 'Gestão',
    paiNav: 'lotes',
    montar: vistaDetalheLote.montar,
  },
  tarefas: {
    rotulo: 'Tarefas',
    grupo: 'Gestão',
    montar: vistaTarefas.montar,
  },
  medicoes: {
    rotulo: 'Medições',
    grupo: 'Gestão',
    montar: vistaMedicoes.montar,
  },
  alertas: {
    rotulo: 'Alertas',
    grupo: 'Sistema',
    montar: vistaAlertas.montar,
  },
  relatorios: {
    rotulo: 'Relatórios',
    grupo: 'Sistema',
    montar: vistaRelatorios.montar,
  },
  auditoria: {
    rotulo: 'Auditoria',
    grupo: 'Sistema',
    montar: vistaAuditoria.montar,
  },
  utilizadores: {
    rotulo: 'Utilizadores',
    grupo: 'Sistema',
    montar: vistaUtilizadores.montar,
    apenasAdmin: true,
  },
  login: {
    rotulo: 'Iniciar sessão',
    grupo: 'Sistema',
    montar: vistaLogin.montar,
    semChrome: true,
  },
};

const ROTA_INICIAL = 'dashboard';

function obterRota() {
  const hash = window.location.hash.replace(/^#/, '').trim();
  if (!hash) return null;
  const partes = hash.split('/').filter(Boolean);
  const nome = partes[0];
  if (!nome || !ROTAS[nome]) return null;
  return { nome, params: partes.slice(1) };
}

function atualizarBreadcrumb(rota) {
  const lista = document.getElementById('breadcrumb-lista');
  if (!lista) return;
  const config = ROTAS[rota];
  if (!config) {
    lista.innerHTML = '';
    return;
  }
  lista.innerHTML = `
    <li>${escapar(config.grupo)}</li>
    <li aria-current="page">${escapar(config.rotulo)}</li>
  `;
}

function atualizarNavAtiva(rota) {
  const itemAtivo = ROTAS[rota]?.paiNav || rota;
  document.querySelectorAll('.grupo-nav a').forEach((link) => {
    if (link.dataset.rota === itemAtivo) {
      link.classList.add('ativo');
    } else {
      link.classList.remove('ativo');
    }
  });
}

function atualizarTitulo(rota) {
  const config = ROTAS[rota];
  if (config) {
    document.title = `${config.rotulo} — GreenHerb`;
  }
}

function escapar(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function aplicarChrome(nomeRota) {
  const config = ROTAS[nomeRota];
  if (config?.semChrome) {
    document.body.dataset.semChrome = 'true';
  } else {
    delete document.body.dataset.semChrome;
  }
}

async function navegar() {
  const rotaAtual = obterRota();
  const nome = rotaAtual?.nome || ROTA_INICIAL;
  const params = rotaAtual?.params || [];

  if (!ROTAS[nome]) {
    window.location.hash = `#${ROTA_INICIAL}`;
    return;
  }

  if (!temToken() && nome !== 'login') {
    window.location.hash = '#login';
    return;
  }

  if (ROTAS[nome].apenasAdmin) {
    const u = obterUtilizadorGuardado();
    if (u?.perfil !== 'Administrador') {
      window.location.hash = `#${ROTA_INICIAL}`;
      return;
    }
  }

  const conteudo = document.getElementById('conteudo');
  if (!conteudo) return;

  aplicarChrome(nome);
  atualizarBreadcrumb(nome);
  atualizarNavAtiva(nome);
  atualizarTitulo(nome);

  try {
    localStorage.setItem(
      CHAVE_ULTIMA_VISTA,
      window.location.hash.replace(/^#/, '')
    );
  } catch {
    /* localStorage indisponível, ignorar */
  }

  conteudo.innerHTML = '<p class="aviso-carregamento">A carregar…</p>';
  conteudo.focus({ preventScroll: true });

  try {
    await ROTAS[nome].montar(conteudo, nome, params);
  } catch (erro) {
    conteudo.innerHTML = `
      <div class="mensagem-erro-global">
        Ocorreu um erro ao carregar a vista: ${escapar(erro.message)}
      </div>
    `;
  }
}

function configurarIndicadorLigacao() {
  const elemento = document.getElementById('estado-ligacao');
  if (!elemento) return;
  const texto = elemento.querySelector('.estado-texto');
  const icone = elemento.querySelector('.icone-wifi');

  function atualizar() {
    const online = navigator.onLine;
    if (online) {
      elemento.classList.remove('offline');
      if (texto) texto.textContent = 'Online';
      if (icone) {
        icone.innerHTML = `
          <path
            d="M5 12.55a11 11 0 0114 0M8.5 16.05a6 6 0 017 0M12 20h.01M2 8.82a15 15 0 0120 0"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        `;
      }
    } else {
      elemento.classList.add('offline');
      if (texto) texto.textContent = 'Offline';
      if (icone) {
        icone.innerHTML = `
          <path
            d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        `;
      }
    }
  }

  window.addEventListener('online', atualizar);
  window.addEventListener('offline', atualizar);
  atualizar();
}

function obterIniciais(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function obterUtilizadorGuardado() {
  try {
    const json = localStorage.getItem(CHAVE_UTILIZADOR);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function temToken() {
  try {
    return Boolean(localStorage.getItem(CHAVE_TOKEN));
  } catch {
    return false;
  }
}

function terminarSessao() {
  try {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_UTILIZADOR);
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new CustomEvent('greenherb:auth-mudou'));
  if (window.location.hash !== '#login') {
    window.location.hash = '#login';
  } else {
    navegar();
  }
}

function configurarAreaUtilizador() {
  const container = document.querySelector('.topbar-right');
  if (!container) return;

  const avatar = container.querySelector('.avatar');
  if (avatar) avatar.remove();
  const antigo = container.querySelector('[data-area-utilizador]');
  if (antigo) antigo.remove();

  const wrapper = document.createElement('div');
  wrapper.dataset.areaUtilizador = 'true';
  wrapper.style.display = 'inline-flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '8px';

  if (temToken()) {
    const utilizador = obterUtilizadorGuardado();
    const iniciais = obterIniciais(utilizador?.nome || 'Utilizador');
    const nomeTitulo = utilizador
      ? `${utilizador.nome} (${utilizador.perfil})`
      : 'Sessão iniciada';

    wrapper.innerHTML = `
      <span
        class="avatar"
        title="${escapar(nomeTitulo)}"
        aria-label="${escapar(nomeTitulo)}"
      >${escapar(iniciais)}</span>
      <button
        type="button"
        class="btn btn-ghost"
        data-acao="terminar-sessao"
        style="color: rgba(255,255,255,0.85); border-color: rgba(255,255,255,0.25);"
      >
        Sair
      </button>
    `;
    container.appendChild(wrapper);
    wrapper
      .querySelector('[data-acao="terminar-sessao"]')
      .addEventListener('click', terminarSessao);
  } else {
    wrapper.innerHTML = `
      <a
        href="#login"
        class="btn btn-primario"
        style="background-color: var(--color-accent); color: var(--color-topbar-sidebar); border-color: var(--color-accent);"
      >
        Entrar
      </a>
    `;
    container.appendChild(wrapper);
  }
}

function configurarItensApenasAdmin() {
  const utilizador = obterUtilizadorGuardado();
  const ehAdmin = utilizador?.perfil === 'Administrador';
  document.querySelectorAll('.apenas-admin').forEach((el) => {
    if (ehAdmin) {
      el.removeAttribute('hidden');
    } else {
      el.setAttribute('hidden', '');
    }
  });
}

function carregarPreferenciasUI() {
  try {
    const modo = localStorage.getItem(CHAVE_MODO_UI);
    if (modo) {
      document.documentElement.dataset.modoUi = modo;
    }
  } catch {
    /* localStorage indisponível, ignorar */
  }
}

function definirRotaInicial() {
  if (window.location.hash) return;
  if (!temToken()) {
    window.location.hash = '#login';
    return;
  }
  try {
    const ultima = localStorage.getItem(CHAVE_ULTIMA_VISTA);
    if (ultima) {
      const nome = ultima.split('/')[0];
      if (ROTAS[nome] && nome !== 'login') {
        window.location.hash = `#${ultima}`;
        return;
      }
    }
  } catch {
    /* localStorage indisponível, ignorar */
  }
  window.location.hash = `#${ROTA_INICIAL}`;
}

async function arrancar() {
  carregarPreferenciasUI();
  configurarIndicadorLigacao();
  configurarAreaUtilizador();
  configurarItensApenasAdmin();

  try {
    await initStore();
  } catch (erro) {
    console.error('Falha ao inicializar o armazenamento:', erro);
  }

  window.addEventListener('hashchange', navegar);
  window.addEventListener('greenherb:auth-mudou', () => {
    configurarAreaUtilizador();
    configurarItensApenasAdmin();
    navegar();
  });

  definirRotaInicial();
  await navegar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', arrancar);
} else {
  arrancar();
}
