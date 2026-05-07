import {
  listarTarefas,
  guardarTarefa,
  atualizarTarefa,
  eliminarTarefa,
} from '../storage/tarefasStore.js';
import { listarLotes } from '../storage/lotesStore.js';
import { registar as auditar } from '../storage/auditoriaStore.js';

const TIPOS = ['rega', 'fertilização', 'colheita', 'monitorização'];

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

function rotuloLote(lote) {
  if (!lote) return '—';
  const erva = ROTULO_ERVA[lote.erva] || lote.erva;
  return `${erva} #${lote.id}`;
}

function renderizarTarefa(tarefa, mapaLotes) {
  const lote = mapaLotes.get(String(tarefa.loteId));
  const ehPendente = tarefa.estado !== 'executada';
  return `
    <article class="cartao-plano" data-id="${tarefa.id}">
      <div class="cartao-plano-cabecalho">
        <h2 class="cartao-plano-erva">${escaparHTML(tarefa.tipo)}</h2>
        <span class="chip ${
          ehPendente ? 'chip-estado-rascunho' : 'chip-estado-concluido'
        }">${ehPendente ? 'Pendente' : 'Executada'}</span>
      </div>
      <div class="cartao-plano-meta">
        <span>Lote: <strong>${escaparHTML(rotuloLote(lote))}</strong></span>
        <span>Data prevista <span class="mono">${escaparHTML(formatarData(tarefa.dataPrevista))}</span></span>
        ${tarefa.notas ? `<span>${escaparHTML(tarefa.notas)}</span>` : ''}
      </div>
      <div class="cartao-plano-acoes">
        ${
          ehPendente
            ? '<button type="button" class="btn btn-primario" data-acao="executar">Marcar executada</button>'
            : ''
        }
        <button type="button" class="btn btn-perigo" data-acao="eliminar">Eliminar</button>
      </div>
    </article>
  `;
}

function seccao(titulo, lista, mapaLotes) {
  return `
    <section style="margin-top: 24px;">
      <h2 style="font-size: 14px; font-weight: 600; margin: 0 0 12px; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.04em;">
        ${escaparHTML(titulo)} (${lista.length})
      </h2>
      ${
        lista.length
          ? `<div class="lista-planos">${lista.map((t) => renderizarTarefa(t, mapaLotes)).join('')}</div>`
          : '<p class="aviso-carregamento">Nenhuma tarefa nesta secção.</p>'
      }
    </section>
  `;
}

export async function montar(elemento) {
  let tarefas = [];
  let lotes = [];
  try {
    [tarefas, lotes] = await Promise.all([listarTarefas(), listarLotes()]);
  } catch (erro) {
    elemento.innerHTML = `<div class="mensagem-erro-global">${escaparHTML(erro.message)}</div>`;
    return;
  }

  const mapaLotes = new Map(lotes.map((l) => [String(l.id), l]));

  function pintar() {
    const pendentes = tarefas.filter((t) => t.estado !== 'executada');
    const executadas = tarefas.filter((t) => t.estado === 'executada');

    elemento.innerHTML = `
      <div class="cabecalho-vista">
        <div>
          <h1>Tarefas operacionais</h1>
          <p class="subtitulo">Planeamento de rega, fertilização, colheita e monitorização.</p>
        </div>
        <button type="button" class="btn btn-primario" data-acao="abrir-form">+ Nova tarefa</button>
      </div>

      <div id="zona-form"></div>

      ${seccao('Pendentes', pendentes, mapaLotes)}
      ${seccao('Executadas', executadas, mapaLotes)}
    `;

    elemento
      .querySelector('[data-acao="abrir-form"]')
      .addEventListener('click', mostrarForm);

    elemento.querySelectorAll('.cartao-plano').forEach((art) => {
      const id = art.dataset.id;
      art
        .querySelector('[data-acao="executar"]')
        ?.addEventListener('click', async () => {
          await atualizarTarefa(id, { estado: 'executada' });
          auditar('tarefa.executar', { id });
          tarefas = tarefas.map((t) =>
            String(t.id) === String(id) ? { ...t, estado: 'executada' } : t
          );
          pintar();
        });
      art
        .querySelector('[data-acao="eliminar"]')
        ?.addEventListener('click', async () => {
          if (!window.confirm('Eliminar esta tarefa?')) return;
          await eliminarTarefa(id);
          auditar('tarefa.eliminar', { id });
          tarefas = tarefas.filter((t) => String(t.id) !== String(id));
          pintar();
        });
    });
  }

  function mostrarForm() {
    const zona = elemento.querySelector('#zona-form');
    if (!zona) return;
    zona.innerHTML = `
      <form id="form-tarefa" class="cartao-formulario" style="margin-top: 16px;">
        <h3 style="margin: 0 0 12px;">Nova tarefa</h3>
        <div class="linha-campos">
          <div class="campo" data-campo="tipo">
            <label for="tipo">Tipo</label>
            <select id="tipo" name="tipo" required>
              <option value="" disabled selected>Selecione</option>
              ${TIPOS.map((t) => `<option value="${t}">${escaparHTML(t)}</option>`).join('')}
            </select>
            <p class="mensagem-erro" hidden></p>
          </div>
          <div class="campo" data-campo="loteId">
            <label for="loteId">Lote</label>
            <select id="loteId" name="loteId" required>
              <option value="" disabled selected>Selecione</option>
              ${lotes.map((l) => `<option value="${escaparHTML(l.id)}">${escaparHTML(rotuloLote(l))}</option>`).join('')}
            </select>
            <p class="mensagem-erro" hidden></p>
          </div>
          <div class="campo" data-campo="dataPrevista">
            <label for="dataPrevista">Data prevista</label>
            <input type="date" id="dataPrevista" name="dataPrevista" required />
            <p class="mensagem-erro" hidden></p>
          </div>
        </div>
        <div class="campo" data-campo="notas">
          <label for="notas">Notas</label>
          <textarea id="notas" name="notas"></textarea>
          <p class="mensagem-erro" hidden></p>
        </div>
        <div class="barra-acoes">
          <button type="button" class="btn btn-ghost" data-acao="fechar-form">Cancelar</button>
          <div class="barra-acoes-direita">
            <button type="submit" class="btn btn-primario">Guardar tarefa</button>
          </div>
        </div>
      </form>
    `;

    const form = zona.querySelector('#form-tarefa');
    form
      .querySelector('[data-acao="fechar-form"]')
      .addEventListener('click', () => {
        zona.innerHTML = '';
      });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tipo = form.tipo.value;
      const loteId = form.loteId.value;
      const dataPrevista = form.dataPrevista.value;
      const notas = form.notas.value.trim();

      if (!tipo || !loteId || !dataPrevista) return;

      const tarefa = {
        tipo,
        loteId,
        dataPrevista,
        notas,
        estado: 'pendente',
      };
      const id = await guardarTarefa(tarefa);
      auditar('tarefa.criar', { id, tipo, loteId });
      tarefas = await listarTarefas();
      zona.innerHTML = '';
      pintar();
    });
  }

  pintar();
}
