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

const ROTULO_TIPO = {
  regular: 'Regular',
  emergencia: 'Emergência',
  pontual: 'Pontual',
};

function formatarDataPT(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  } catch {
    return '';
  }
}

function nomeFicheiroExcel() {
  const d = new Date();
  const aaaa = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `greenherb-planos-${aaaa}-${mm}-${dd}.xlsx`;
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
  if (window.XLSX && window.XLSX.utils && window.XLSX.utils.encode_cell) {
    return Promise.resolve(window.XLSX);
  }
  if (sheetJSPromise) return sheetJSPromise;
  sheetJSPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
    script.onload = () => resolve(window.XLSX);
    script.onerror = () =>
      reject(new Error('Não foi possível carregar XLSX-JS-Style.'));
    document.head.appendChild(script);
  });
  return sheetJSPromise;
}

const COLUNAS_EXCEL = [
  { titulo: 'ID', chave: 'id' },
  { titulo: 'Tipo', chave: 'tipo' },
  { titulo: 'Erva', chave: 'erva' },
  { titulo: 'Estado', chave: 'estado' },
  { titulo: 'Data de Criação', chave: 'dataCriacao' },
  { titulo: 'Temp.Mín(°C)', chave: 'tempMin' },
  { titulo: 'Temp.Máx(°C)', chave: 'tempMax' },
  { titulo: 'Humidade Mín(%)', chave: 'humMin' },
  { titulo: 'Humidade Máx(%)', chave: 'humMax' },
  { titulo: 'Luminosidade Mín(lux)', chave: 'luxMin' },
  { titulo: 'Luminosidade Máx(lux)', chave: 'luxMax' },
  { titulo: 'Duração(dias)', chave: 'cicloDias' },
  { titulo: 'Freq.Rega(h)', chave: 'freqRega' },
  { titulo: 'Volume Rega(L)', chave: 'volumeRega' },
  { titulo: 'Freq.Fertilização(dias)', chave: 'freqFert' },
  { titulo: 'Tipo Intervenção', chave: 'tipoIntervencao' },
  { titulo: 'Intervalo Mínimo(h)', chave: 'intervaloMinimo' },
  { titulo: 'Dosagem', chave: 'dosagem' },
  { titulo: 'Responsável', chave: 'responsavel' },
  { titulo: 'Justificação', chave: 'justificacao' },
  { titulo: 'Data Autorização', chave: 'dataAutorizacao' },
];

function planoParaLinha(p) {
  const linha = {
    id: p.id,
    tipo: ROTULO_TIPO[p.tipo] || p.tipo,
    erva: ROTULO_ERVA[p.erva] || p.erva,
    estado: p.estado,
    dataCriacao: formatarDataPT(p.dataCriacao),
  };

  const d = p.dadosEspecificos || {};
  if (p.tipo === 'regular') {
    const c = d.condicoes || {};
    const r = d.rega || {};
    linha.tempMin = c.temperatura?.min;
    linha.tempMax = c.temperatura?.max;
    linha.humMin = c.humidade?.min;
    linha.humMax = c.humidade?.max;
    linha.luxMin = c.luminosidade?.min;
    linha.luxMax = c.luminosidade?.max;
    linha.cicloDias = c.cicloDias;
    linha.freqRega = r.frequenciaHoras;
    linha.volumeRega = r.volumeLitros;
    linha.freqFert = r.frequenciaFertilizacaoDias;
  } else if (p.tipo === 'emergencia') {
    linha.tipoIntervencao = d.tipoIntervencao;
    linha.intervaloMinimo = d.intervaloMinHoras;
    linha.dosagem = d.dosagem;
  } else if (p.tipo === 'pontual') {
    linha.responsavel = d.responsavel;
    linha.justificacao = d.justificacao;
    linha.dataAutorizacao = formatarDataPT(d.dataHoraAutorizacao);
  }

  return linha;
}

const ESTILO_CABECALHO = {
  fill: { patternType: 'solid', fgColor: { rgb: '1A3A2A' } },
  font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 11 },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: '1A3A2A' } },
    bottom: { style: 'thin', color: { rgb: '1A3A2A' } },
    left: { style: 'thin', color: { rgb: '1A3A2A' } },
    right: { style: 'thin', color: { rgb: '1A3A2A' } },
  },
};

const ESTILO_LINHA_BRANCA = {
  fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
  alignment: { vertical: 'center', wrapText: true },
  border: {
    top: { style: 'hair', color: { rgb: 'D8E4DC' } },
    bottom: { style: 'hair', color: { rgb: 'D8E4DC' } },
    left: { style: 'hair', color: { rgb: 'D8E4DC' } },
    right: { style: 'hair', color: { rgb: 'D8E4DC' } },
  },
};

const ESTILO_LINHA_VERDE = {
  ...ESTILO_LINHA_BRANCA,
  fill: { patternType: 'solid', fgColor: { rgb: 'F4F9F6' } },
};

async function exportarExcel(planos) {
  const XLSX = await carregarSheetJS();

  const linhas = planos.map(planoParaLinha);
  const matriz = [
    COLUNAS_EXCEL.map((c) => c.titulo),
    ...linhas.map((linha) =>
      COLUNAS_EXCEL.map((c) => {
        const v = linha[c.chave];
        return v === undefined || v === null ? '' : v;
      })
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(matriz);
  const numColunas = COLUNAS_EXCEL.length;
  const numLinhas = matriz.length;

  for (let c = 0; c < numColunas; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[ref]) ws[ref] = { v: COLUNAS_EXCEL[c].titulo, t: 's' };
    ws[ref].s = ESTILO_CABECALHO;
  }

  for (let r = 1; r < numLinhas; r++) {
    const estilo = r % 2 === 1 ? ESTILO_LINHA_BRANCA : ESTILO_LINHA_VERDE;
    for (let c = 0; c < numColunas; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { v: '', t: 's' };
      ws[ref].s = estilo;
    }
  }

  ws['!cols'] = COLUNAS_EXCEL.map((col) => {
    let max = col.titulo.length;
    linhas.forEach((linha) => {
      const v = linha[col.chave];
      if (v != null && v !== '') {
        const len = String(v).length;
        if (len > max) max = len;
      }
    });
    return { wch: Math.min(Math.max(max + 2, 8), 40) };
  });

  ws['!rows'] = [{ hpt: 20 }];

  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  ws['!sheetView'] = {
    state: 'frozen',
    topLeftCell: 'A2',
    xSplit: 0,
    ySplit: 1,
  };

  const ultimaCol = XLSX.utils.encode_col(numColunas - 1);
  ws['!autofilter'] = { ref: `A1:${ultimaCol}1` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Planos de Cultivo');

  XLSX.writeFile(wb, nomeFicheiroExcel());
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
