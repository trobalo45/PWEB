import { listarPlanos } from '../storage/planosStore.js';
import { listarLotes } from '../storage/lotesStore.js';
import { listarTarefas } from '../storage/tarefasStore.js';
import { listarMedicoes } from '../storage/medicoesStore.js';
import { listarAlertas } from '../storage/alertasStore.js';

const ROTULO_ERVA = {
  manjericao: 'Manjericão',
  hortela: 'Hortelã',
  alecrim: 'Alecrim',
  tomilho: 'Tomilho',
  manjericão: 'Manjericão',
  hortelã: 'Hortelã',
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

function classeChipClassificacao(c) {
  if (c === 'crítico' || c === 'critico')
    return 'chip-classificacao-critico';
  if (c === 'aviso') return 'chip-classificacao-aviso';
  return 'chip-classificacao-info';
}

function ehHoje(iso) {
  if (!iso) return false;
  try {
    const d = new Date(iso);
    const hoje = new Date();
    return (
      d.getFullYear() === hoje.getFullYear() &&
      d.getMonth() === hoje.getMonth() &&
      d.getDate() === hoje.getDate()
    );
  } catch {
    return false;
  }
}

function metricCard(opts) {
  return `
    <article class="metric-card">
      <span class="metric-icon ${opts.cor}">
        <i class="ti ${opts.icone}" aria-hidden="true"></i>
      </span>
      <div>
        <p class="metric-rotulo">${escaparHTML(opts.rotulo)}</p>
        <p class="metric-numero">${escaparHTML(String(opts.valor))}</p>
      </div>
    </article>
  `;
}

function corCardAlertas(alertasAtivos) {
  if (alertasAtivos.some(
    (a) => a.classificacao === 'crítico' || a.classificacao === 'critico'
  ))
    return 'metric-icon-vermelho';
  if (alertasAtivos.some((a) => a.classificacao === 'aviso'))
    return 'metric-icon-ambar';
  return 'metric-icon-verde';
}

function listaAlertasResumo(alertasAtivos, mapaLotes) {
  if (!alertasAtivos.length) {
    return '<p class="aviso-carregamento">Sem alertas ativos.</p>';
  }
  const top = alertasAtivos.slice(0, 5);
  return `
    <ul class="lista-tarefas">
      ${top
        .map(
          (a) => `
        <li>
          <span class="chip ${classeChipClassificacao(a.classificacao)}">${escaparHTML(a.classificacao || 'informativo')}</span>
          <span style="flex: 1;">${escaparHTML(a.mensagem || '—')}</span>
          <span style="font-size: 12px; color: var(--color-text-secondary);">
            ${escaparHTML(rotuloLote(mapaLotes.get(String(a.loteId))))}
          </span>
          <span class="mono" style="font-size: 12px; color: var(--color-text-secondary);">
            ${escaparHTML(formatarData(a.dataCriacao || a.dataRegisto))}
          </span>
        </li>
      `
        )
        .join('')}
    </ul>
  `;
}

function listaTarefasResumo(tarefasPendentes, mapaLotes) {
  if (!tarefasPendentes.length) {
    return '<p class="aviso-carregamento" style="color: #2b6a47;">Sem tarefas pendentes — tudo em dia.</p>';
  }
  const top = tarefasPendentes.slice(0, 5);
  return `
    <ul class="lista-tarefas">
      ${top
        .map(
          (t) => `
        <li>
          <span class="chip chip-estado-rascunho">${escaparHTML(t.tipo || 'tarefa')}</span>
          <span style="flex: 1;">${escaparHTML(rotuloLote(mapaLotes.get(String(t.loteId))))}</span>
          <span class="mono" style="font-size: 12px; color: var(--color-text-secondary);">
            ${escaparHTML(formatarData(t.dataPrevista))}
          </span>
        </li>
      `
        )
        .join('')}
    </ul>
  `;
}

function listaLotesRisco(lotesRisco) {
  if (!lotesRisco.length) {
    return '<p class="aviso-carregamento" style="color: #2b6a47;">Todos os lotes estão operacionais.</p>';
  }
  return `
    <ul class="lista-tarefas">
      ${lotesRisco
        .map(
          (l) => `
        <li>
          <span class="chip chip-estado-comprometido">Comprometido</span>
          <span style="flex: 1;">${escaparHTML(rotuloLote(l))}</span>
          <a href="#detalheLote/${escaparHTML(l.id)}" class="btn btn-ghost" style="font-size: 12px; padding: 4px 10px;">Ver lote</a>
        </li>
      `
        )
        .join('')}
    </ul>
  `;
}

function tabelaUltimasMedicoes(medicoes, mapaLotes) {
  if (!medicoes.length) {
    return '<p class="aviso-carregamento">Sem medições registadas.</p>';
  }
  return `
    <div class="tabela-planos-wrapper">
      <table class="tabela-planos">
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Lote</th>
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
              <td>${escaparHTML(rotuloLote(mapaLotes.get(String(m.loteId))))}</td>
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

export async function montar(elemento) {
  elemento.innerHTML =
    '<p class="aviso-carregamento">A carregar dashboard…</p>';

  const [planos, lotes, tarefas, medicoes, alertas] = await Promise.all([
    listarPlanos().catch(() => []),
    listarLotes().catch(() => []),
    listarTarefas().catch(() => []),
    listarMedicoes().catch(() => []),
    listarAlertas().catch(() => []),
  ]);

  const mapaLotes = new Map(lotes.map((l) => [String(l.id), l]));

  const lotesAtivos = lotes.filter((l) => l.estado === 'ativo');
  const lotesRisco = lotes.filter((l) => l.estado === 'comprometido');

  const medicoesHoje = medicoes.filter((m) => ehHoje(m.dataHora));
  const ultimasMedicoes = [...medicoes]
    .sort((a, b) =>
      new Date(b.dataHora || 0).getTime() -
      new Date(a.dataHora || 0).getTime()
    )
    .slice(0, 5);

  const alertasAtivos = alertas
    .filter((a) => (a.estado || 'ativo') === 'ativo')
    .sort(
      (a, b) =>
        new Date(b.dataCriacao || b.dataRegisto || 0).getTime() -
        new Date(a.dataCriacao || a.dataRegisto || 0).getTime()
    );

  const tarefasPendentes = tarefas
    .filter((t) => t.estado !== 'executada')
    .sort(
      (a, b) =>
        new Date(a.dataPrevista || 0).getTime() -
        new Date(b.dataPrevista || 0).getTime()
    );

  const modoAutomacao =
    (() => {
      try {
        return localStorage.getItem('greenherb.modoAutomacao') === 'auto'
          ? 'auto'
          : 'manual';
      } catch {
        return 'manual';
      }
    })();

  const online = navigator.onLine;

  elemento.innerHTML = `
    <div class="cabecalho-vista">
      <div>
        <h1>Dashboard</h1>
        <p class="subtitulo">Resumo da operação da estufa em tempo real.</p>
      </div>
    </div>

    <div class="metricas-grelha">
      ${metricCard({
        icone: 'ti-packages',
        cor: 'metric-icon-verde',
        rotulo: 'Lotes ativos',
        valor: lotesAtivos.length,
      })}
      ${metricCard({
        icone: 'ti-clipboard-list',
        cor: 'metric-icon-azul',
        rotulo: 'Planos criados',
        valor: planos.length,
      })}
      ${metricCard({
        icone: 'ti-thermometer',
        cor: 'metric-icon-azul',
        rotulo: 'Medições registadas hoje',
        valor: medicoesHoje.length,
      })}
      ${metricCard({
        icone: 'ti-bell',
        cor: corCardAlertas(alertasAtivos),
        rotulo: 'Alertas ativos',
        valor: alertasAtivos.length,
      })}
    </div>

    <section class="cartao-formulario">
      <div class="revisao-seccao-cabecalho" style="margin-bottom: 12px;">
        <h2 style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-secondary);">
          Alertas ativos
        </h2>
        <a href="#alertas" class="btn btn-ghost" style="font-size: 12px;">Ver todos os alertas</a>
      </div>
      ${listaAlertasResumo(alertasAtivos, mapaLotes)}
    </section>

    <section class="cartao-formulario" style="margin-top: 16px;">
      <div class="revisao-seccao-cabecalho" style="margin-bottom: 12px;">
        <h2 style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-secondary);">
          Tarefas pendentes
        </h2>
        <a href="#tarefas" class="btn btn-ghost" style="font-size: 12px;">Ver todas as tarefas</a>
      </div>
      ${listaTarefasResumo(tarefasPendentes, mapaLotes)}
    </section>

    <section class="cartao-formulario" style="margin-top: 16px;">
      <div class="revisao-seccao-cabecalho" style="margin-bottom: 12px;">
        <h2 style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-secondary);">
          Lotes em risco
        </h2>
        <a href="#lotes" class="btn btn-ghost" style="font-size: 12px;">Ver lotes</a>
      </div>
      ${listaLotesRisco(lotesRisco)}
    </section>

    <section class="cartao-formulario" style="margin-top: 16px;">
      <div class="revisao-seccao-cabecalho" style="margin-bottom: 12px;">
        <h2 style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-secondary);">
          Últimas medições
        </h2>
        <a href="#medicoes" class="btn btn-ghost" style="font-size: 12px;">Ver medições</a>
      </div>
      ${tabelaUltimasMedicoes(ultimasMedicoes, mapaLotes)}
    </section>

    <div class="estado-sistema">
      <span class="chip ${
        modoAutomacao === 'auto'
          ? 'chip-classificacao-aviso'
          : 'chip-estado-rascunho'
      }">${modoAutomacao === 'auto' ? 'Modo Automático' : 'Modo Manual'}</span>
      <span class="chip ${online ? 'chip-estado-ativo' : 'chip-classificacao-aviso'}">${online ? 'Online' : 'Offline'}</span>
    </div>
  `;
}
