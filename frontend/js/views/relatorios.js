import { listarPlanos } from '../storage/planosStore.js';
import { listarLotes } from '../storage/lotesStore.js';
import { listarMedicoes } from '../storage/medicoesStore.js';

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

function escaparCSV(valor) {
  if (valor === null || valor === undefined) return '';
  const str = String(valor);
  if (/[",;\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function descreverDadosPlano(plano) {
  const d = plano.dadosEspecificos || {};
  if (plano.tipo === 'regular') {
    const c = d.condicoes || {};
    const r = d.rega || {};
    return [
      `T:${c.temperatura?.min}-${c.temperatura?.max}°C`,
      `H:${c.humidade?.min}-${c.humidade?.max}%`,
      `L:${c.luminosidade?.min}-${c.luminosidade?.max}lux`,
      `Ciclo:${c.cicloDias}d`,
      `Rega:${r.frequenciaHoras}h/${r.volumeLitros}L`,
      `Fert:${r.frequenciaFertilizacaoDias}d`,
    ].join(' | ');
  }
  if (plano.tipo === 'emergencia') {
    return `${d.tipoIntervencao || ''} | dose:${d.dosagem || ''} | min:${d.intervaloMinHoras || ''}h`;
  }
  if (plano.tipo === 'pontual') {
    return `${d.responsavel || ''} | ${d.justificacao || ''}`;
  }
  return '';
}

function gerarCSVPlanos(planos) {
  const cabecalho = [
    'id',
    'tipo',
    'erva',
    'estado',
    'dataCriacao',
    'detalhes',
  ];
  const linhas = [cabecalho.map(escaparCSV).join(';')];
  planos.forEach((p) => {
    linhas.push(
      [
        p.id,
        p.tipo,
        ROTULO_ERVA[p.erva] || p.erva,
        p.estado,
        p.dataCriacao,
        descreverDadosPlano(p),
      ]
        .map(escaparCSV)
        .join(';')
    );
  });
  return linhas.join('\n');
}

function descarregarFicheiro(nome, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let sheetJSPromise = null;
function carregarSheetJS() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (sheetJSPromise) return sheetJSPromise;
  sheetJSPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error('Não foi possível carregar SheetJS.'));
    document.head.appendChild(script);
  });
  return sheetJSPromise;
}

async function exportarExcel(planos) {
  const XLSX = await carregarSheetJS();
  const dados = planos.map((p) => ({
    id: p.id,
    tipo: p.tipo,
    erva: ROTULO_ERVA[p.erva] || p.erva,
    estado: p.estado,
    dataCriacao: p.dataCriacao,
    detalhes: descreverDadosPlano(p),
  }));
  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Planos');
  XLSX.writeFile(wb, 'greenherb-planos.xlsx');
}

function media(numeros) {
  const validos = numeros.filter((n) => Number.isFinite(n));
  if (!validos.length) return null;
  return validos.reduce((a, b) => a + b, 0) / validos.length;
}

function compararRealVsPlano(planos, lotes, medicoes) {
  const linhas = [];
  lotes.forEach((lote) => {
    const plano = planos.find((p) => String(p.id) === String(lote.planoId));
    if (!plano || plano.tipo !== 'regular') return;
    const medsLote = medicoes.filter(
      (m) => String(m.loteId) === String(lote.id)
    );
    const c = plano.dadosEspecificos?.condicoes || {};
    const tempReal = media(medsLote.map((m) => Number(m.temperatura)));
    const humReal = media(medsLote.map((m) => Number(m.humidade)));
    const luxReal = media(medsLote.map((m) => Number(m.luminosidade)));

    linhas.push({
      lote: `${ROTULO_ERVA[lote.erva] || lote.erva} #${lote.id}`,
      tempPlano: c.temperatura
        ? `${c.temperatura.min}-${c.temperatura.max}`
        : '—',
      tempReal: tempReal != null ? tempReal.toFixed(1) : '—',
      humPlano: c.humidade ? `${c.humidade.min}-${c.humidade.max}` : '—',
      humReal: humReal != null ? humReal.toFixed(0) : '—',
      luxPlano: c.luminosidade
        ? `${c.luminosidade.min}-${c.luminosidade.max}`
        : '—',
      luxReal: luxReal != null ? luxReal.toFixed(0) : '—',
      amostras: medsLote.length,
    });
  });
  return linhas;
}

export async function montar(elemento) {
  let planos = [];
  let lotes = [];
  let medicoes = [];
  try {
    [planos, lotes, medicoes] = await Promise.all([
      listarPlanos(),
      listarLotes(),
      listarMedicoes(),
    ]);
  } catch (erro) {
    elemento.innerHTML = `<div class="mensagem-erro-global">${escaparHTML(erro.message)}</div>`;
    return;
  }

  const comparacao = compararRealVsPlano(planos, lotes, medicoes);

  elemento.innerHTML = `
    <div class="cabecalho-vista">
      <div>
        <h1>Relatórios</h1>
        <p class="subtitulo">Exportação de dados e análise comparativa.</p>
      </div>
    </div>

    <div class="cartao-formulario">
      <h2>Exportar dados</h2>
      <p class="descricao-passo">Exportação dos planos de cultivo registados (${planos.length} ${planos.length === 1 ? 'plano' : 'planos'}).</p>
      <div class="barra-acoes-direita" style="justify-content: flex-start;">
        <button type="button" class="btn btn-primario" data-acao="csv">Exportar CSV</button>
        <button type="button" class="btn btn-secundario" data-acao="excel">Exportar Excel</button>
      </div>
      <p id="estado-exportacao" style="margin-top: 12px; font-size: 12px; color: var(--color-text-secondary);"></p>
    </div>

    <div class="cartao-formulario" style="margin-top: 16px;">
      <h2>Comparação real vs. plano</h2>
      <p class="descricao-passo">Médias das medições registadas por lote vs. intervalos definidos no plano regular associado.</p>
      ${
        comparacao.length
          ? `<div class="tabela-planos-wrapper">
              <table class="tabela-planos">
                <thead>
                  <tr>
                    <th>Lote</th>
                    <th>Temperatura plano</th>
                    <th>Temperatura real (média)</th>
                    <th>Humidade plano</th>
                    <th>Humidade real (média)</th>
                    <th>Luminosidade plano</th>
                    <th>Luminosidade real (média)</th>
                    <th>Amostras</th>
                  </tr>
                </thead>
                <tbody>
                  ${comparacao
                    .map(
                      (l) => `
                    <tr>
                      <td>${escaparHTML(l.lote)}</td>
                      <td class="mono">${escaparHTML(l.tempPlano)} °C</td>
                      <td class="mono">${escaparHTML(l.tempReal)} °C</td>
                      <td class="mono">${escaparHTML(l.humPlano)} %</td>
                      <td class="mono">${escaparHTML(l.humReal)} %</td>
                      <td class="mono">${escaparHTML(l.luxPlano)} lux</td>
                      <td class="mono">${escaparHTML(l.luxReal)} lux</td>
                      <td class="mono">${escaparHTML(String(l.amostras))}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
          : '<p class="aviso-carregamento">Sem lotes regulares com medições para comparar.</p>'
      }
    </div>
  `;

  const estado = elemento.querySelector('#estado-exportacao');

  elemento.querySelector('[data-acao="csv"]').addEventListener('click', () => {
    if (!planos.length) {
      estado.textContent = 'Sem planos para exportar.';
      return;
    }
    const csv = gerarCSVPlanos(planos);
    descarregarFicheiro(
      'greenherb-planos.csv',
      '﻿' + csv,
      'text/csv;charset=utf-8;'
    );
    estado.textContent = `CSV gerado com ${planos.length} ${planos.length === 1 ? 'plano' : 'planos'}.`;
  });

  elemento
    .querySelector('[data-acao="excel"]')
    .addEventListener('click', async () => {
      if (!planos.length) {
        estado.textContent = 'Sem planos para exportar.';
        return;
      }
      estado.textContent = 'A carregar SheetJS…';
      try {
        await exportarExcel(planos);
        estado.textContent = `Excel gerado com ${planos.length} ${planos.length === 1 ? 'plano' : 'planos'}.`;
      } catch (erro) {
        estado.textContent = 'Erro: ' + erro.message;
      }
    });
}
