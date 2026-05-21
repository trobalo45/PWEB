import {
  obterLote,
  atualizarLote,
} from '../storage/lotesStore.js';
import { obterPlano } from '../storage/planosStore.js';
import {
  listarTarefas,
  atualizarTarefa,
} from '../storage/tarefasStore.js';
import { listarMedicoes } from '../storage/medicoesStore.js';
import { registar as auditar } from '../storage/auditoriaStore.js';
import { pedido } from '../api/_http.js';

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

function rotuloOrigem(id) {
  const ehObjectId = typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);
  return ehObjectId ? 'Guardado na API' : 'Guardado localmente';
}

function classeEstado(estado) {
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

function formatarDataHora(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-PT');
  } catch {
    return iso;
  }
}

function rotuloTarefa(tarefa) {
  return tarefa.tipo || '—';
}

function tabelaMedicoes(medicoes) {
  if (!medicoes.length)
    return '<p class="aviso-carregamento">Sem medições registadas.</p>';
  return `
    <div class="tabela-planos-wrapper">
      <table class="tabela-planos">
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Temperatura</th>
            <th>Humidade</th>
            <th>Luminosidade</th>
          </tr>
        </thead>
        <tbody>
          ${medicoes
            .map(
              (m) => `
            <tr>
              <td class="mono">${escaparHTML(formatarDataHora(m.dataHora))}</td>
              <td class="mono">${escaparHTML(String(m.temperatura))} °C</td>
              <td class="mono">${escaparHTML(String(m.humidade))} %</td>
              <td class="mono">${escaparHTML(String(m.luminosidade))} lux</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function listaTarefas(tarefas) {
  if (!tarefas.length)
    return '<p class="aviso-carregamento">Sem tarefas associadas.</p>';

  const pendentes = tarefas.filter((t) => t.estado !== 'executada');
  const executadas = tarefas.filter((t) => t.estado === 'executada');

  function linhaPendente(t) {
    return `
      <li class="tarefa-item pendente" data-tarefa-id="${escaparHTML(t.id || t._id)}">
        <span class="badge-pendente">PENDENTE</span>
        <span style="flex: 1; font-weight: 500;">${escaparHTML(rotuloTarefa(t))}</span>
        <span class="mono" style="color: var(--color-text-secondary); font-size: 12px;">
          prevista ${escaparHTML(formatarData(t.dataPrevista))}
        </span>
        <button type="button" class="btn btn-primario" data-acao="executar-tarefa" style="padding: 4px 12px; font-size: 12px;">
          Marcar como executada
        </button>
      </li>
    `;
  }

  function linhaExecutada(t) {
    return `
      <li class="tarefa-item executada">
        <span class="badge-executada">EXECUTADA</span>
        <span style="flex: 1;">${escaparHTML(rotuloTarefa(t))}</span>
        <span class="mono" style="font-size: 12px;">
          executada ${escaparHTML(formatarData(t.dataExecucao || t.dataPrevista))}
        </span>
      </li>
    `;
  }

  return `
    <ul class="lista-tarefas">
      ${pendentes.map(linhaPendente).join('')}
      ${executadas.map(linhaExecutada).join('')}
    </ul>
  `;
}

function totalPerdas(lote) {
  if (!Array.isArray(lote.perdas)) return 0;
  return lote.perdas.reduce((acc, p) => acc + Number(p.quantidade || 0), 0);
}

function renderizarRegistarPerdaForm() {
  return `
    <form id="form-perda" class="cartao-formulario" style="margin-top: 16px;">
      <h3 style="margin: 0 0 12px;">Registar perda</h3>
      <div class="linha-campos">
        <div class="campo" data-campo="quantidade">
          <label for="perda-quantidade">Quantidade</label>
          <input id="perda-quantidade" name="quantidade" type="number" min="1" step="1" required />
          <p class="mensagem-erro" hidden></p>
        </div>
        <div class="campo" data-campo="motivo">
          <label for="perda-motivo">Motivo</label>
          <input id="perda-motivo" name="motivo" type="text" required />
          <p class="mensagem-erro" hidden></p>
        </div>
      </div>
      <div class="barra-acoes">
        <span></span>
        <div class="barra-acoes-direita">
          <button type="button" class="btn btn-ghost" data-acao="cancelar-perda">Cancelar</button>
          <button type="submit" class="btn btn-primario">Registar</button>
        </div>
      </div>
    </form>
  `;
}

export async function montar(elemento, _rota, params = []) {
  const id = params[0];
  if (!id) {
    elemento.innerHTML = '<p>ID em falta.</p>';
    return;
  }

  elemento.innerHTML = '<p class="aviso-carregamento">A carregar lote…</p>';

  let lote;
  try {
    lote = await obterLote(id);
  } catch (erro) {
    elemento.innerHTML = `<div class="mensagem-erro-global">${escaparHTML(erro.message)}</div><a href="#lotes" class="btn btn-secundario">← Voltar</a>`;
    return;
  }
  if (!lote) {
    elemento.innerHTML = `<div class="estado-vazio"><h2>Lote não encontrado</h2><a href="#lotes" class="btn btn-primario">Voltar à listagem</a></div>`;
    return;
  }

  const [plano, todasTarefas, todasMedicoes] = await Promise.all([
    lote.planoId
      ? obterPlano(lote.planoId).catch(() => null)
      : Promise.resolve(null),
    listarTarefas().catch(() => []),
    listarMedicoes().catch(() => []),
  ]);

  const tarefasLote = todasTarefas.filter(
    (t) => String(t.loteId) === String(lote.id)
  );
  const medicoesLote = todasMedicoes
    .filter((m) => String(m.loteId) === String(lote.id))
    .sort(
      (a, b) =>
        new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
    )
    .slice(0, 5);

  const ervaTexto = ROTULO_ERVA[lote.erva] || lote.erva;
  const perdas = totalPerdas(lote);

  function pintar() {
    elemento.innerHTML = `
      <div class="cabecalho-vista">
        <div>
          <h1>Lote · ${escaparHTML(ervaTexto)}</h1>
          <p class="subtitulo">
            <span class="chip ${classeEstado(lote.estado)}">${escaparHTML(rotuloEstado(lote.estado))}</span>
            <span class="chip">${escaparHTML(rotuloOrigem(lote.id))}</span>
          </p>
        </div>
        <a href="#lotes" class="btn btn-secundario">← Voltar</a>
      </div>

      <div class="cartao-formulario">
        <div class="revisao-seccao">
          <div class="revisao-seccao-cabecalho"><h3>Identificação</h3></div>
          <div class="revisao-itens">
            <div class="revisao-item"><span class="revisao-item-rotulo">ID</span><span class="revisao-item-valor numero">#${escaparHTML(String(lote.id))}</span></div>
            <div class="revisao-item"><span class="revisao-item-rotulo">Erva</span><span class="revisao-item-valor">${escaparHTML(ervaTexto)}</span></div>
            <div class="revisao-item"><span class="revisao-item-rotulo">Plano</span><span class="revisao-item-valor">${escaparHTML(
              plano ? `${ROTULO_ERVA[plano.erva] || plano.erva} (${plano.tipo})` : '—'
            )}</span></div>
            <div class="revisao-item"><span class="revisao-item-rotulo">Início</span><span class="revisao-item-valor numero">${escaparHTML(formatarData(lote.dataInicio))}</span></div>
            <div class="revisao-item"><span class="revisao-item-rotulo">Notas</span><span class="revisao-item-valor">${escaparHTML(lote.notas || '—')}</span></div>
          </div>
        </div>

        <div class="revisao-seccao">
          <div class="revisao-seccao-cabecalho"><h3>Produtividade</h3></div>
          <div class="revisao-itens">
            <div class="revisao-item"><span class="revisao-item-rotulo">Quantidade inicial</span><span class="revisao-item-valor numero">${escaparHTML(String(lote.quantidadeInicial ?? '—'))}</span></div>
            <div class="revisao-item"><span class="revisao-item-rotulo">Quantidade atual</span><span class="revisao-item-valor numero">${escaparHTML(String(lote.quantidadeAtual ?? lote.quantidadeInicial ?? '—'))}</span></div>
            <div class="revisao-item"><span class="revisao-item-rotulo">Perdas registadas</span><span class="revisao-item-valor numero">${escaparHTML(String(perdas))}</span></div>
          </div>
          <div id="zona-perda"></div>
        </div>

        <div class="revisao-seccao">
          <div class="revisao-seccao-cabecalho"><h3>Tarefas</h3></div>
          ${listaTarefas(tarefasLote)}
        </div>

        <div class="revisao-seccao">
          <div class="revisao-seccao-cabecalho"><h3>Últimas medições</h3></div>
          ${tabelaMedicoes(medicoesLote)}
        </div>
      </div>

      ${
        lote.estado === 'comprometido'
          ? '<p class="aviso-comprometido">Lote comprometido — operações suspensas.</p>'
          : ''
      }

      <div class="barra-acoes" style="margin-top: 16px;">
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn btn-secundario" data-acao="registar-perda" ${
            lote.estado !== 'ativo' ? 'disabled' : ''
          }>Registar perda</button>
          <button type="button" class="btn btn-secundario" data-acao="dividir" ${
            lote.estado !== 'ativo' ? 'disabled' : ''
          }>Dividir lote</button>
        </div>
        <div class="barra-acoes-direita">
          <button type="button" class="btn btn-perigo" data-acao="comprometer" ${
            lote.estado !== 'ativo' ? 'disabled' : ''
          }>Marcar como comprometido</button>
          <button type="button" class="btn btn-primario" data-acao="concluir" ${
            lote.estado !== 'ativo' ? 'disabled' : ''
          }>Concluir lote</button>
        </div>
      </div>
    `;

    ligar();
  }

  function ligar() {
    elemento
      .querySelector('[data-acao="registar-perda"]')
      ?.addEventListener('click', mostrarFormPerda);
    elemento
      .querySelector('[data-acao="concluir"]')
      ?.addEventListener('click', () => mudarEstado('concluído'));
    elemento
      .querySelector('[data-acao="comprometer"]')
      ?.addEventListener('click', () => mudarEstado('comprometido'));
    elemento
      .querySelector('[data-acao="dividir"]')
      ?.addEventListener('click', abrirModalDividir);

    elemento
      .querySelectorAll('[data-acao="executar-tarefa"]')
      .forEach((btn) => {
        btn.addEventListener('click', async () => {
          const li = btn.closest('[data-tarefa-id]');
          if (!li) return;
          const tarefaId = li.dataset.tarefaId;
          btn.disabled = true;
          btn.textContent = 'A guardar…';
          try {
            await atualizarTarefa(tarefaId, { estado: 'executada' });
            auditar('tarefa.executar', { id: tarefaId, loteId: lote.id });
            const recarregadas = await listarTarefas().catch(() => null);
            if (recarregadas) {
              tarefasLote.length = 0;
              recarregadas
                .filter((t) => String(t.loteId) === String(lote.id))
                .forEach((t) => tarefasLote.push(t));
            } else {
              const alvo = tarefasLote.find(
                (t) => String(t.id || t._id) === String(tarefaId)
              );
              if (alvo) {
                alvo.estado = 'executada';
                alvo.dataExecucao = new Date().toISOString();
              }
            }
            pintar();
          } catch (erro) {
            btn.disabled = false;
            btn.textContent = 'Marcar como executada';
            window.alert(
              'Não foi possível executar a tarefa: ' + erro.message
            );
          }
        });
      });
  }

  function abrirModalDividir() {
    const disponivel = Number(
      lote.quantidadeAtual ?? lote.quantidadeInicial ?? 0
    );
    const max = Math.max(1, disponivel - 1);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3 style="margin: 0 0 4px;">Dividir lote</h3>
        <p style="margin: 0 0 16px; color: var(--color-text-secondary); font-size: 13px;">
          Lote atual: <strong class="mono">${disponivel}</strong> plantas disponíveis.
        </p>
        <div id="msg-dividir"></div>
        <div class="campo" data-campo="quantidade">
          <label for="div-quantidade">Quantidade a separar</label>
          <input id="div-quantidade" type="number" min="1" max="${max}" step="1" required />
          <p class="mensagem-erro" hidden></p>
        </div>
        <div class="campo" data-campo="notas">
          <label for="div-notas">Notas para o novo lote (opcional)</label>
          <textarea id="div-notas" rows="3"></textarea>
        </div>
        <div class="barra-acoes">
          <button type="button" class="btn btn-ghost" data-acao="cancelar">Cancelar</button>
          <div class="barra-acoes-direita">
            <button type="button" class="btn btn-primario" data-acao="confirmar">Dividir</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const fechar = () => overlay.remove();
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fechar();
    });
    overlay
      .querySelector('[data-acao="cancelar"]')
      .addEventListener('click', fechar);

    overlay
      .querySelector('[data-acao="confirmar"]')
      .addEventListener('click', async () => {
        const qInput = overlay.querySelector('#div-quantidade');
        const notas = overlay.querySelector('#div-notas').value.trim();
        const quantidade = Number(qInput.value);
        const grupoQ = overlay.querySelector('[data-campo="quantidade"]');
        const spanErroQ = grupoQ.querySelector('.mensagem-erro');
        grupoQ.classList.remove('erro');
        spanErroQ.hidden = true;

        if (
          !Number.isFinite(quantidade) ||
          quantidade < 1 ||
          quantidade >= disponivel
        ) {
          grupoQ.classList.add('erro');
          spanErroQ.hidden = false;
          spanErroQ.textContent = `Indique um valor entre 1 e ${disponivel - 1}.`;
          return;
        }

        const botao = overlay.querySelector('[data-acao="confirmar"]');
        botao.disabled = true;
        botao.textContent = 'A dividir…';
        try {
          const resposta = await pedido(
            `/lotes/${encodeURIComponent(lote.id)}/dividir`,
            {
              method: 'POST',
              body: JSON.stringify({ quantidade, notas }),
            }
          );
          const loteOriginal = resposta?.loteOriginal;
          const loteNovo = resposta?.loteNovo;
          if (loteOriginal) {
            lote = {
              ...lote,
              quantidadeAtual: loteOriginal.quantidadeAtual,
            };
          }
          auditar('lote.dividir', {
            origem: lote.id,
            novo: loteNovo?._id,
            quantidade,
          });
          const msg = overlay.querySelector('#msg-dividir');
          msg.innerHTML = `
            <div class="mensagem-sucesso-global">
              Lote dividido com sucesso. Novo lote criado com ${quantidade} plantas.
              <a href="#detalheLote/${loteNovo?._id}" style="margin-left: 8px;">
                Ver novo lote
              </a>
            </div>
          `;
          setTimeout(() => {
            fechar();
            pintar();
          }, 2500);
        } catch (erro) {
          botao.disabled = false;
          botao.textContent = 'Dividir';
          const msg = overlay.querySelector('#msg-dividir');
          msg.innerHTML = `<div class="mensagem-erro-global">${escaparHTML(erro.message)}</div>`;
        }
      });
  }

  function mostrarFormPerda() {
    const zona = elemento.querySelector('#zona-perda');
    if (!zona) return;
    zona.innerHTML = renderizarRegistarPerdaForm();
    const form = zona.querySelector('#form-perda');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const quantidade = Number(form.quantidade.value);
      const motivo = form.motivo.value.trim();
      if (!quantidade || quantidade <= 0) return;
      if (!motivo) return;
      const novasPerdas = [
        ...(lote.perdas || []),
        { quantidade, motivo, data: new Date().toISOString() },
      ];
      const novaQuantidadeAtual = Math.max(
        0,
        Number(lote.quantidadeAtual ?? lote.quantidadeInicial ?? 0) -
          quantidade
      );
      const atualizado = await atualizarLote(lote.id, {
        perdas: novasPerdas,
        quantidadeAtual: novaQuantidadeAtual,
      });
      lote = atualizado || { ...lote, perdas: novasPerdas, quantidadeAtual: novaQuantidadeAtual };
      auditar('lote.perda', { id: lote.id, quantidade, motivo });
      pintar();
    });
    form
      .querySelector('[data-acao="cancelar-perda"]')
      .addEventListener('click', () => {
        zona.innerHTML = '';
      });
  }

  async function mudarEstado(novoEstado) {
    const ok = window.confirm(
      `Confirmar a alteração de estado para "${novoEstado}"?`
    );
    if (!ok) return;
    try {
      const atualizado = await atualizarLote(lote.id, { estado: novoEstado });
      lote = atualizado || { ...lote, estado: novoEstado };
      auditar('lote.estado', { id: lote.id, estado: novoEstado });
      pintar();
    } catch (erro) {
      window.alert('Não foi possível atualizar o lote: ' + erro.message);
    }
  }

  pintar();
}
