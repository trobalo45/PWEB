import { init as initDB } from './storage/planosDB.js';
import * as vistaPlanos from './views/planos.js';
import * as vistaNovoPlano from './views/novoPlano.js';
import * as vistaDetalhePlano from './views/detalhePlano.js';

const CHAVE_ULTIMA_VISTA = 'greenherb.ultimaVista';
const CHAVE_MODO_UI = 'greenherb.modoUI';

const ROTAS = {
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
    montar: montarEmDesenvolvimento,
  },
  medicoes: {
    rotulo: 'Medições',
    grupo: 'Gestão',
    montar: montarEmDesenvolvimento,
  },
  alertas: {
    rotulo: 'Alertas',
    grupo: 'Sistema',
    montar: montarEmDesenvolvimento,
  },
  relatorios: {
    rotulo: 'Relatórios',
    grupo: 'Sistema',
    montar: montarEmDesenvolvimento,
  },
  auditoria: {
    rotulo: 'Auditoria',
    grupo: 'Sistema',
    montar: montarEmDesenvolvimento,
  },
};

const ROTA_INICIAL = 'planos';

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

async function montarEmDesenvolvimento(elemento, rota) {
  const config = ROTAS[rota];
  elemento.innerHTML = `
    <div class="cabecalho-vista">
      <div>
        <h1>${escapar(config?.rotulo || 'Em desenvolvimento')}</h1>
        <p class="subtitulo">Esta secção será disponibilizada num próximo sprint.</p>
      </div>
    </div>
    <div class="em-desenvolvimento">
      <h1>Em desenvolvimento</h1>
      <p>
        A funcionalidade de ${escapar(
          (config?.rotulo || '').toLowerCase()
        )} ainda não está implementada nesta versão.
      </p>
    </div>
  `;
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

async function navegar() {
  const rotaAtual = obterRota();
  const nome = rotaAtual?.nome || ROTA_INICIAL;
  const params = rotaAtual?.params || [];

  if (!ROTAS[nome]) {
    window.location.hash = `#${ROTA_INICIAL}`;
    return;
  }

  const conteudo = document.getElementById('conteudo');
  if (!conteudo) return;

  atualizarBreadcrumb(nome);
  atualizarNavAtiva(nome);
  atualizarTitulo(nome);

  try {
    localStorage.setItem(CHAVE_ULTIMA_VISTA, window.location.hash.replace(/^#/, ''));
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
  try {
    const ultima = localStorage.getItem(CHAVE_ULTIMA_VISTA);
    if (ultima) {
      const nome = ultima.split('/')[0];
      if (ROTAS[nome]) {
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

  try {
    await initDB();
  } catch (erro) {
    console.error('Falha ao inicializar a base de dados local:', erro);
  }

  window.addEventListener('hashchange', navegar);
  definirRotaInicial();
  await navegar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', arrancar);
} else {
  arrancar();
}
