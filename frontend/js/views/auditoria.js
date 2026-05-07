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
                  <th>Perfil</th>
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
                    <td>${escaparHTML(l.perfil || '—')}</td>
                    <td><code style="font-size: 11px;">${escaparHTML(JSON.stringify(l.detalhes || {}))}</code></td>
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
}
