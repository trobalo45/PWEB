import {
  listarMedicoes,
  guardarMedicao,
  eliminarMedicao,
} from '../storage/medicoesStore.js';
import { listarLotes } from '../storage/lotesStore.js';
import { listarPlanos } from '../storage/planosStore.js';
import { guardarAlerta } from '../storage/alertasStore.js';
import { registar as auditar } from '../storage/auditoriaStore.js';

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

function rotuloLote(lote) {
  if (!lote) return '—';
  const erva = ROTULO_ERVA[lote.erva] || lote.erva;
  return `${erva} #${lote.id}`;
}

function mostrarErro(form, nome, mensagem) {
  const grupo = form.querySelector(`[data-campo="${nome}"]`);
  if (!grupo) return;
  grupo.classList.add('erro');
  const span = grupo.querySelector('.mensagem-erro');
  if (span) {
    span.hidden = false;
    span.textContent = mensagem;
  }
}

function limpar(form) {
  form.querySelectorAll('.campo.erro').forEach((g) => {
    g.classList.remove('erro');
    const span = g.querySelector('.mensagem-erro');
    if (span) {
      span.hidden = true;
      span.textContent = '';
    }
  });
}

function renderizarNotificacao(alertas) {
  if (!alertas?.length) return '';
  const temCritico = alertas.some(
    (a) => a.classificacao === 'crítico' || a.classificacao === 'critico'
  );
  const classe = temCritico
    ? 'chip-classificacao-critico'
    : 'chip-classificacao-aviso';
  const total = alertas.length;
  const palavra = total === 1 ? 'alerta gerado' : 'alertas gerados';
  return `
    <div class="notificacao-alertas">
      <span class="chip ${classe}">${total} ${palavra}</span>
      <span style="font-size: 12px; color: var(--color-text-secondary);">
        a partir da última medição registada.
      </span>
    </div>
  `;
}

function avaliarLimite(valor, min, max, unidade, nome) {
  const v = Number(valor);
  if (!Number.isFinite(v)) return null;
  if (min == null && max == null) return null;
  let limite;
  let mensagem;
  if (max != null && v > max) {
    limite = max;
    mensagem = `${nome} fora do intervalo: ${v}${unidade} (máx. permitido: ${max}${unidade})`;
  } else if (min != null && v < min) {
    limite = min;
    mensagem = `${nome} fora do intervalo: ${v}${unidade} (mín. permitido: ${min}${unidade})`;
  } else {
    return null;
  }
  const denom = Math.abs(limite) || 1;
  const excedente = Math.abs(v - limite) / denom;
  const classificacao = excedente > 0.2 ? 'crítico' : 'aviso';
  return { mensagem, classificacao };
}

async function gerarAlertasPorMedicao(medicao, lote, plano) {
  if (!lote || !plano || plano.tipo !== 'regular') return [];
  const c = plano.dadosEspecificos?.condicoes;
  if (!c) return [];

  const candidatos = [
    avaliarLimite(
      medicao.temperatura,
      c.temperatura?.min,
      c.temperatura?.max,
      '°C',
      'Temperatura'
    ),
    avaliarLimite(
      medicao.humidade,
      c.humidade?.min,
      c.humidade?.max,
      '%',
      'Humidade'
    ),
    avaliarLimite(
      medicao.luminosidade,
      c.luminosidade?.min,
      c.luminosidade?.max,
      ' lux',
      'Luminosidade'
    ),
  ].filter(Boolean);

  const guardados = [];
  for (const c1 of candidatos) {
    const alerta = {
      classificacao: c1.classificacao,
      mensagem: c1.mensagem,
      estado: 'ativo',
      loteId: lote.id,
      dataRegisto: new Date().toISOString(),
    };
    try {
      await guardarAlerta(alerta);
      guardados.push(alerta);
    } catch (erro) {
      console.warn('[medicoes] erro ao gerar alerta:', erro.message);
    }
  }
  return guardados;
}

export async function montar(elemento) {
  let medicoes = [];
  let lotes = [];
  let planos = [];
  try {
    [medicoes, lotes, planos] = await Promise.all([
      listarMedicoes(),
      listarLotes(),
      listarPlanos().catch(() => []),
    ]);
  } catch (erro) {
    elemento.innerHTML = `<div class="mensagem-erro-global">${escaparHTML(erro.message)}</div>`;
    return;
  }

  const mapaLotes = new Map(lotes.map((l) => [String(l.id), l]));
  const mapaPlanos = new Map(planos.map((p) => [String(p.id), p]));
  let notificacaoAlertas = null;

  function pintar() {
    elemento.innerHTML = `
      <div class="cabecalho-vista">
        <div>
          <h1>Medições ambientais</h1>
          <p class="subtitulo">Registo de temperatura, humidade e luminosidade por lote.</p>
        </div>
        <button type="button" class="btn btn-primario" data-acao="abrir-form">+ Nova medição</button>
      </div>

      <div id="zona-notificacao"></div>
      <div id="zona-form"></div>

      <div class="tabela-planos-wrapper" style="margin-top: 16px;">
        <table class="tabela-planos">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Lote</th>
              <th>Temperatura</th>
              <th>Humidade</th>
              <th>Luminosidade</th>
              <th aria-label="Ações"></th>
            </tr>
          </thead>
          <tbody>
            ${
              medicoes.length
                ? medicoes
                    .map(
                      (m) => `
              <tr data-id="${m.id}">
                <td class="mono">${escaparHTML(formatarDataHora(m.dataHora))}</td>
                <td>${escaparHTML(rotuloLote(mapaLotes.get(String(m.loteId))))}</td>
                <td class="mono">${escaparHTML(String(m.temperatura))} °C</td>
                <td class="mono">${escaparHTML(String(m.humidade))} %</td>
                <td class="mono">${escaparHTML(String(m.luminosidade))} lux</td>
                <td class="celula-acoes">
                  <button type="button" class="btn btn-perigo" data-acao="eliminar">Eliminar</button>
                </td>
              </tr>
            `
                    )
                    .join('')
                : '<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--color-text-secondary);">Sem medições registadas.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    `;

    if (notificacaoAlertas) {
      const zona = elemento.querySelector('#zona-notificacao');
      if (zona) zona.innerHTML = renderizarNotificacao(notificacaoAlertas);
    }

    elemento
      .querySelector('[data-acao="abrir-form"]')
      .addEventListener('click', mostrarForm);

    elemento.querySelectorAll('tr[data-id]').forEach((tr) => {
      tr.querySelector('[data-acao="eliminar"]')?.addEventListener(
        'click',
        async () => {
          if (!window.confirm('Eliminar esta medição?')) return;
          await eliminarMedicao(tr.dataset.id);
          auditar('medicao.eliminar', { id: tr.dataset.id });
          medicoes = medicoes.filter(
            (m) => String(m.id) !== String(tr.dataset.id)
          );
          pintar();
        }
      );
    });
  }

  function mostrarForm() {
    const zona = elemento.querySelector('#zona-form');
    if (!zona) return;
    const agora = new Date();
    const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    zona.innerHTML = `
      <form id="form-medicao" class="cartao-formulario" style="margin-top: 16px;">
        <h3 style="margin: 0 0 12px;">Nova medição</h3>
        <div class="linha-campos">
          <div class="campo" data-campo="loteId">
            <label for="loteId">Lote</label>
            <select id="loteId" name="loteId" required>
              <option value="" disabled selected>Selecione</option>
              ${lotes.map((l) => `<option value="${escaparHTML(l.id)}">${escaparHTML(rotuloLote(l))}</option>`).join('')}
            </select>
            <p class="mensagem-erro" hidden></p>
          </div>
          <div class="campo" data-campo="dataHora">
            <label for="dataHora">Data e hora</label>
            <input id="dataHora" name="dataHora" type="datetime-local" value="${local}" required />
            <p class="mensagem-erro" hidden></p>
          </div>
        </div>
        <div class="linha-campos">
          <div class="campo" data-campo="temperatura">
            <label for="temperatura">Temperatura (°C)</label>
            <input id="temperatura" name="temperatura" type="number" step="0.1" required />
            <p class="mensagem-erro" hidden></p>
          </div>
          <div class="campo" data-campo="humidade">
            <label for="humidade">Humidade (%)</label>
            <input id="humidade" name="humidade" type="number" min="0" max="100" step="1" required />
            <p class="mensagem-erro" hidden></p>
          </div>
          <div class="campo" data-campo="luminosidade">
            <label for="luminosidade">Luminosidade (lux)</label>
            <input id="luminosidade" name="luminosidade" type="number" min="0" step="1" required />
            <p class="mensagem-erro" hidden></p>
          </div>
        </div>
        <div class="barra-acoes">
          <button type="button" class="btn btn-ghost" data-acao="fechar">Cancelar</button>
          <div class="barra-acoes-direita">
            <button type="submit" class="btn btn-primario">Guardar medição</button>
          </div>
        </div>
      </form>
    `;

    const form = zona.querySelector('#form-medicao');
    form
      .querySelector('[data-acao="fechar"]')
      .addEventListener('click', () => {
        zona.innerHTML = '';
      });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      limpar(form);
      const loteId = form.loteId.value;
      const dataHora = form.dataHora.value;
      const temperatura = Number(form.temperatura.value);
      const humidade = Number(form.humidade.value);
      const luminosidade = Number(form.luminosidade.value);

      let valido = true;
      if (!loteId) {
        mostrarErro(form, 'loteId', 'Selecione um lote.');
        valido = false;
      }
      if (!dataHora) {
        mostrarErro(form, 'dataHora', 'Indique a data e hora.');
        valido = false;
      }
      if (!Number.isFinite(temperatura)) {
        mostrarErro(form, 'temperatura', 'Indique a temperatura.');
        valido = false;
      }
      if (
        !Number.isFinite(humidade) ||
        humidade < 0 ||
        humidade > 100
      ) {
        mostrarErro(form, 'humidade', 'Humidade entre 0 e 100%.');
        valido = false;
      }
      if (!Number.isFinite(luminosidade) || luminosidade < 0) {
        mostrarErro(form, 'luminosidade', 'Luminosidade tem de ser positiva.');
        valido = false;
      }
      if (!valido) return;

      const medicao = {
        loteId,
        dataHora: new Date(dataHora).toISOString(),
        temperatura,
        humidade,
        luminosidade,
      };
      const id = await guardarMedicao(medicao);
      auditar('medicao.criar', { id, loteId });

      const lote = mapaLotes.get(String(loteId));
      const plano = lote ? mapaPlanos.get(String(lote.planoId)) : null;
      try {
        const gerados = await gerarAlertasPorMedicao(medicao, lote, plano);
        notificacaoAlertas = gerados.length ? gerados : null;
      } catch {
        notificacaoAlertas = null;
      }

      medicoes = await listarMedicoes();
      zona.innerHTML = '';
      pintar();
    });
  }

  pintar();
}
