import { guardarLote } from '../storage/lotesStore.js';
import { listarPlanos } from '../storage/planosStore.js';
import { registar as auditar } from '../storage/auditoriaStore.js';

const ERVAS = [
  { id: 'manjericao', rotulo: 'Manjericão' },
  { id: 'hortela', rotulo: 'Hortelã' },
  { id: 'alecrim', rotulo: 'Alecrim' },
  { id: 'tomilho', rotulo: 'Tomilho' },
];

function escaparHTML(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function rotuloPlano(plano) {
  const erva = plano.erva || '';
  return `${erva} · ${plano.tipo} (${plano.id})`;
}

function mostrarErroCampo(formulario, nome, mensagem) {
  const grupo = formulario.querySelector(`[data-campo="${nome}"]`);
  if (!grupo) return;
  grupo.classList.add('erro');
  const span = grupo.querySelector('.mensagem-erro');
  if (span) {
    span.hidden = false;
    span.textContent = mensagem;
  }
}

function limparErros(formulario) {
  formulario.querySelectorAll('.campo.erro').forEach((g) => {
    g.classList.remove('erro');
    const span = g.querySelector('.mensagem-erro');
    if (span) {
      span.hidden = true;
      span.textContent = '';
    }
  });
}

export async function montar(elemento) {
  let planos = [];
  try {
    planos = await listarPlanos();
  } catch {
    planos = [];
  }

  const opcoesErva = ERVAS.map(
    (e) => `<option value="${e.id}">${escaparHTML(e.rotulo)}</option>`
  ).join('');

  const opcoesPlano = planos.length
    ? planos
        .map(
          (p) =>
            `<option value="${escaparHTML(p.id)}">${escaparHTML(rotuloPlano(p))}</option>`
        )
        .join('')
    : '<option value="" disabled>Sem planos disponíveis — crie um primeiro</option>';

  elemento.innerHTML = `
    <div class="cabecalho-vista">
      <div>
        <h1>Novo lote</h1>
        <p class="subtitulo">Registo de um novo lote em produção.</p>
      </div>
      <a href="#lotes" class="btn btn-secundario">← Voltar</a>
    </div>

    <div class="wizard">
      <form id="form-lote" novalidate>
        <div class="cartao-formulario">
          <div id="mensagem-global"></div>

          <div class="campo" data-campo="erva">
            <label for="erva">Erva aromática</label>
            <select id="erva" name="erva" required>
              <option value="" disabled selected>Selecione a erva</option>
              ${opcoesErva}
            </select>
            <p class="mensagem-erro" hidden></p>
          </div>

          <div class="campo" data-campo="planoId">
            <label for="planoId">Plano de cultivo associado</label>
            <select id="planoId" name="planoId" required>
              <option value="" disabled selected>Selecione um plano</option>
              ${opcoesPlano}
            </select>
            <p class="mensagem-erro" hidden></p>
          </div>

          <div class="linha-campos">
            <div class="campo" data-campo="dataInicio">
              <label for="dataInicio">Data de início</label>
              <input type="date" id="dataInicio" name="dataInicio" required />
              <p class="mensagem-erro" hidden></p>
            </div>
            <div class="campo" data-campo="quantidadeInicial">
              <label for="quantidadeInicial">Quantidade inicial (plantas)</label>
              <input type="number" id="quantidadeInicial" name="quantidadeInicial" min="1" step="1" required />
              <p class="mensagem-erro" hidden></p>
            </div>
          </div>

          <div class="campo" data-campo="notas">
            <label for="notas">Notas (opcional)</label>
            <textarea id="notas" name="notas"></textarea>
            <p class="mensagem-erro" hidden></p>
          </div>
        </div>

        <div class="barra-acoes">
          <a href="#lotes" class="btn btn-ghost">Cancelar</a>
          <div class="barra-acoes-direita">
            <button type="submit" class="btn btn-primario">Guardar lote</button>
          </div>
        </div>
      </form>
    </div>
  `;

  const formulario = elemento.querySelector('#form-lote');
  const mensagem = elemento.querySelector('#mensagem-global');

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros(formulario);

    const erva = formulario.erva.value;
    const planoId = formulario.planoId.value;
    const dataInicio = formulario.dataInicio.value;
    const quantidade = formulario.quantidadeInicial.value;
    const notas = formulario.notas.value.trim();

    let valido = true;
    if (!erva) {
      mostrarErroCampo(formulario, 'erva', 'Selecione a erva.');
      valido = false;
    }
    if (!planoId) {
      mostrarErroCampo(formulario, 'planoId', 'Selecione um plano associado.');
      valido = false;
    }
    if (!dataInicio) {
      mostrarErroCampo(formulario, 'dataInicio', 'Indique a data de início.');
      valido = false;
    }
    if (!quantidade || Number(quantidade) <= 0) {
      mostrarErroCampo(
        formulario,
        'quantidadeInicial',
        'Indique uma quantidade superior a zero.'
      );
      valido = false;
    }
    if (!valido) return;

    const botao = formulario.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      const lote = {
        erva,
        planoId,
        dataInicio,
        quantidadeInicial: Number(quantidade),
        quantidadeAtual: Number(quantidade),
        perdas: [],
        notas,
        estado: 'ativo',
      };
      const id = await guardarLote(lote);
      auditar('lote.criar', { id, erva, planoId });
      window.location.hash = '#lotes';
    } catch (erro) {
      botao.disabled = false;
      mensagem.innerHTML = `<div class="mensagem-erro-global">${escaparHTML(erro.message)}</div>`;
    }
  });
}
