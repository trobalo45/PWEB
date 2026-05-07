import {
  listarAlertas,
  guardarAlerta,
  atualizarAlerta,
} from '../storage/alertasStore.js';
import { listarLotes } from '../storage/lotesStore.js';
import { registar as auditar } from '../storage/auditoriaStore.js';

const CHAVE_MODO_AUTOMACAO = 'greenherb.modoAutomacao';

const FILTROS = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'ativo', rotulo: 'Ativos' },
  { id: 'resolvido', rotulo: 'Resolvidos' },
  { id: 'ignorado', rotulo: 'Ignorados' },
];

const ROTULO_ERVA = {
  manjericao: 'Manjericão',
  hortela: 'Hortelã',
  alecrim: 'Alecrim',
  tomilho: 'Tomilho',
};

function escaparHTML(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatarDataHora(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-PT');
  } catch {
    return iso;
  }
}

function classificacaoCSS(c) {
  if (c === 'crítico' || c === 'critico') return 'chip-classificacao-critico';
  if (c === 'aviso') return 'chip-classificacao-aviso';
  return 'chip-classificacao-info';
}

function rotuloEstado(e) {
  if (e === 'resolvido') return 'Resolvido';
  if (e === 'ignorado') return 'Ignorado';
  return 'Ativo';
}

function classeChipEstado(e) {
  if (e === 'resolvido') return 'chip-estado-concluido';
  if (e === 'ignorado') return 'chip-estado-rascunho';
  return 'chip-estado-ativo';
}

function rotuloLote(lote) {
  if (!lote) return '—';
  const erva = ROTULO_ERVA[lote.erva] || lote.erva;
  return `${erva} #${lote.id}`;
}

function lerModoAutomacao() {
  try {
    return localStorage.getItem(CHAVE_MODO_AUTOMACAO) === 'auto'
      ? 'auto'
      : 'manual';
  } catch {
    return 'manual';
  }
}

function escreverModoAutomacao(modo) {
  try {
    localStorage.setItem(CHAVE_MODO_AUTOMACAO, modo);
  } catch {
    /* ignorar */
  }
}

export async function montar(elemento) {
  let alertas = [];
  let lotes = [];
  try {
    [alertas, lotes] = await Promise.all([listarAlertas(), listarLotes()]);
  } catch (erro) {
    elemento.innerHTML = `<div class="mensagem-erro-global">${escaparHTML(erro.message)}</div>`;
    return;
  }

  const mapaLotes = new Map(lotes.map((l) => [String(l.id), l]));

  let filtro = 'todos';
  let modo = lerModoAutomacao();

  function pintar() {
    const lista = alertas.filter((a) => {
      if (filtro === 'todos') return true;
      return (a.estado || 'ativo') === filtro;
    });

    elemento.innerHTML = `
      <div class="cabecalho-vista">
        <div>
          <h1>Alertas</h1>
          <p class="subtitulo">Monitorização e gestão de eventos da estufa.</p>
        </div>
        <div class="cabecalho-acoes">
          <div class="toggle-vista" role="group" aria-label="Modo de automação">
            <button type="button" class="toggle-btn ${modo === 'manual' ? 'ativo' : ''}" data-modo="manual">Manual</button>
            <button type="button" class="toggle-btn ${modo === 'auto' ? 'ativo' : ''}" data-modo="auto">Automático</button>
          </div>
          <button type="button" class="btn btn-primario" data-acao="abrir-form">+ Novo alerta</button>
        </div>
      </div>

      ${
        modo === 'auto'
          ? `<div class="mensagem-sucesso-global">Modo automático: o sistema pode sugerir ou executar ações automaticamente em resposta a alertas críticos.</div>`
          : ''
      }

      <div class="grupo-pills" style="margin-top: 12px;">
        ${FILTROS.map(
          (f) => `
          <button type="button" class="pill ${filtro === f.id ? 'selecionado' : ''}" data-filtro="${f.id}">
            ${escaparHTML(f.rotulo)}
          </button>
        `
        ).join('')}
      </div>

      <div id="zona-form"></div>

      ${
        lista.length
          ? `<div class="tabela-planos-wrapper" style="margin-top: 16px;">
              <table class="tabela-planos">
                <thead>
                  <tr>
                    <th>Classificação</th>
                    <th>Mensagem</th>
                    <th>Lote</th>
                    <th>Data</th>
                    <th>Estado</th>
                    <th aria-label="Ações"></th>
                  </tr>
                </thead>
                <tbody>
                  ${lista
                    .map(
                      (a) => `
                    <tr data-id="${a.id}">
                      <td><span class="chip ${classificacaoCSS(a.classificacao)}">${escaparHTML(a.classificacao || 'informativo')}</span></td>
                      <td>${escaparHTML(a.mensagem || '—')}</td>
                      <td>${escaparHTML(rotuloLote(mapaLotes.get(String(a.loteId))))}</td>
                      <td class="mono">${escaparHTML(formatarDataHora(a.dataCriacao))}</td>
                      <td><span class="chip ${classeChipEstado(a.estado)}">${escaparHTML(rotuloEstado(a.estado))}</span></td>
                      <td class="celula-acoes">
                        ${
                          (a.estado || 'ativo') === 'ativo'
                            ? `
                          <button type="button" class="btn btn-primario" data-acao="resolver">Resolver</button>
                          <button type="button" class="btn btn-secundario" data-acao="ignorar">Ignorar</button>
                        `
                            : ''
                        }
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
          : '<div class="estado-vazio" style="margin-top: 16px;"><h2>Sem alertas</h2><p>Não existem alertas no filtro selecionado.</p></div>'
      }
    `;

    elemento.querySelectorAll('[data-modo]').forEach((b) => {
      b.addEventListener('click', () => {
        modo = b.dataset.modo;
        escreverModoAutomacao(modo);
        pintar();
      });
    });

    elemento.querySelectorAll('[data-filtro]').forEach((b) => {
      b.addEventListener('click', () => {
        filtro = b.dataset.filtro;
        pintar();
      });
    });

    elemento
      .querySelector('[data-acao="abrir-form"]')
      ?.addEventListener('click', mostrarFormAlerta);

    elemento.querySelectorAll('tr[data-id]').forEach((tr) => {
      const id = tr.dataset.id;
      tr.querySelector('[data-acao="resolver"]')?.addEventListener(
        'click',
        async () => {
          await atualizarAlerta(id, { estado: 'resolvido' });
          auditar('alerta.resolver', { id });
          alertas = alertas.map((a) =>
            String(a.id) === String(id) ? { ...a, estado: 'resolvido' } : a
          );
          pintar();
        }
      );
      tr.querySelector('[data-acao="ignorar"]')?.addEventListener(
        'click',
        () => abrirModalIgnorar(id)
      );
    });
  }

  function mostrarFormAlerta() {
    const zona = elemento.querySelector('#zona-form');
    if (!zona) return;
    zona.innerHTML = `
      <form id="form-alerta" class="cartao-formulario" style="margin-top: 16px;">
        <h3 style="margin: 0 0 12px;">Novo alerta</h3>
        <div class="linha-campos">
          <div class="campo" data-campo="classificacao">
            <label for="classificacao">Classificação</label>
            <select id="classificacao" name="classificacao" required>
              <option value="informativo">Informativo</option>
              <option value="aviso">Aviso</option>
              <option value="crítico">Crítico</option>
            </select>
          </div>
          <div class="campo" data-campo="loteId">
            <label for="loteId">Lote</label>
            <select id="loteId" name="loteId">
              <option value="">— sem lote —</option>
              ${lotes.map((l) => `<option value="${escaparHTML(l.id)}">${escaparHTML(rotuloLote(l))}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="campo" data-campo="mensagem">
          <label for="mensagem">Mensagem</label>
          <input type="text" id="mensagem" name="mensagem" required />
          <p class="mensagem-erro" hidden></p>
        </div>
        <div class="barra-acoes">
          <button type="button" class="btn btn-ghost" data-acao="fechar">Cancelar</button>
          <div class="barra-acoes-direita">
            <button type="submit" class="btn btn-primario">Guardar alerta</button>
          </div>
        </div>
      </form>
    `;

    const form = zona.querySelector('#form-alerta');
    form.querySelector('[data-acao="fechar"]').addEventListener('click', () => {
      zona.innerHTML = '';
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const mensagem = form.mensagem.value.trim();
      if (!mensagem) return;
      const novo = {
        classificacao: form.classificacao.value,
        loteId: form.loteId.value || null,
        mensagem,
        estado: 'ativo',
      };
      const id = await guardarAlerta(novo);
      auditar('alerta.criar', { id, classificacao: novo.classificacao });
      alertas = await listarAlertas();
      zona.innerHTML = '';
      pintar();
    });
  }

  function abrirModalIgnorar(id) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3 style="margin: 0 0 8px;">Ignorar alerta</h3>
        <p style="margin: 0 0 12px; color: var(--color-text-secondary); font-size: 13px;">
          Indique a justificação (mínimo 10 caracteres).
        </p>
        <div class="campo" data-campo="justificacao">
          <textarea id="justificacao" rows="4"></textarea>
          <p class="mensagem-erro" hidden></p>
        </div>
        <div class="barra-acoes">
          <button type="button" class="btn btn-ghost" data-acao="cancelar">Cancelar</button>
          <div class="barra-acoes-direita">
            <button type="button" class="btn btn-primario" data-acao="confirmar">Ignorar alerta</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const fechar = () => overlay.remove();
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fechar();
    });
    overlay.querySelector('[data-acao="cancelar"]').addEventListener('click', fechar);
    overlay.querySelector('[data-acao="confirmar"]').addEventListener(
      'click',
      async () => {
        const just = overlay.querySelector('#justificacao').value.trim();
        if (just.length < 10) {
          const grupo = overlay.querySelector('[data-campo="justificacao"]');
          grupo.classList.add('erro');
          const span = grupo.querySelector('.mensagem-erro');
          span.hidden = false;
          span.textContent =
            'A justificação tem de ter pelo menos 10 caracteres.';
          return;
        }
        await atualizarAlerta(id, {
          estado: 'ignorado',
          justificacao: just,
        });
        auditar('alerta.ignorar', { id, justificacao: just });
        alertas = alertas.map((a) =>
          String(a.id) === String(id)
            ? { ...a, estado: 'ignorado', justificacao: just }
            : a
        );
        fechar();
        pintar();
      }
    );
  }

  pintar();
}
