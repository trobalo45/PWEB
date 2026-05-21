import { listarLogs } from '../storage/auditoriaStore.js';

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

function obterUtilizadorAtual() {
  try {
    const json = localStorage.getItem('greenherb.utilizador');
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

function escaparCSV(valor) {
  if (valor === null || valor === undefined) return '';
  const s = String(valor);
  return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function detalhesParaCSV(detalhes) {
  if (detalhes == null) return '';
  if (typeof detalhes === 'string') return detalhes;
  try {
    return JSON.stringify(detalhes);
  } catch {
    return String(detalhes);
  }
}

function nomeFicheiroCSV() {
  const d = new Date();
  const aaaa = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `greenherb-auditoria-${aaaa}-${mm}-${dd}.csv`;
}

function gerarCSV(logs) {
  const cabecalho = [
    'Data/Hora',
    'Utilizador',
    'Ação',
    'Entidade',
    'ID Entidade',
    'Detalhes',
    'IP',
  ];
  const linhas = [cabecalho.map(escaparCSV).join(';')];
  logs.forEach((l) => {
    linhas.push(
      [
        formatarDataHora(l.dataCriacao || l.dataHora),
        l.utilizadorNome || '',
        l.acao || '',
        l.entidade || '',
        l.entidadeId || '',
        detalhesParaCSV(l.detalhes),
        l.ip || '',
      ]
        .map(escaparCSV)
        .join(';')
    );
  });
  return linhas.join('\n');
}

function descarregarCSV(nome, conteudo) {
  const blob = new Blob(['﻿' + conteudo], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function montar(elemento) {
  const utilizador = obterUtilizadorAtual();
  const perfil = utilizador?.perfil;
  const permitido = perfil === 'Responsável' || perfil === 'Administrador';

  if (!permitido) {
    elemento.innerHTML = `
      <div class="cabecalho-vista">
        <div>
          <h1>Auditoria</h1>
          <p class="subtitulo">Histórico de ações sobre os dados.</p>
        </div>
      </div>
      <div class="estado-vazio">
        <h2>Acesso restrito</h2>
        <p>Esta secção só está disponível para perfis Responsável e Administrador.</p>
      </div>
    `;
    return;
  }

  let logs = [];
  try {
    logs = await listarLogs();
  } catch (erro) {
    elemento.innerHTML = `<div class="mensagem-erro-global">${escaparHTML(erro.message)}</div>`;
    return;
  }

  elemento.innerHTML = `
    <div class="cabecalho-vista">
      <div>
        <h1>Auditoria</h1>
        <p class="subtitulo">Histórico de ações sobre os dados (${logs.length} ${logs.length === 1 ? 'entrada' : 'entradas'}).</p>
      </div>
      <div class="cabecalho-acoes">
        <button type="button" class="btn btn-secundario" data-acao="exportar-csv" ${logs.length ? '' : 'disabled'}>
          Exportar CSV
        </button>
      </div>
    </div>

    ${
      logs.length
        ? `<div class="tabela-planos-wrapper">
            <table class="tabela-planos">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Ação</th>
                  <th>Utilizador</th>
                  <th>Entidade</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                ${logs
                  .map(
                    (l) => `
                  <tr>
                    <td class="mono">${escaparHTML(formatarDataHora(l.dataCriacao))}</td>
                    <td><code>${escaparHTML(l.acao || '—')}</code></td>
                    <td>${escaparHTML(l.utilizadorNome || '—')}</td>
                    <td>${escaparHTML(l.entidade || '—')}</td>
                    <td><code style="font-size: 11px;">${escaparHTML(detalhesParaCSV(l.detalhes))}</code></td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>`
        : '<div class="estado-vazio"><h2>Sem registos</h2><p>Nenhuma ação registada ainda.</p></div>'
    }
  `;

  elemento
    .querySelector('[data-acao="exportar-csv"]')
    ?.addEventListener('click', () => {
      if (!logs.length) return;
      const csv = gerarCSV(logs);
      descarregarCSV(nomeFicheiroCSV(), csv);
    });
}
