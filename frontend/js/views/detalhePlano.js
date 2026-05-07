import { obterPlano } from '../storage/planosDB.js';

const ROTULO_TIPO = {
  regular: 'Regular',
  emergencia: 'Emergência',
  pontual: 'Pontual',
};

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

function classeChipTipo(tipo) {
  if (tipo === 'emergencia') return 'chip-tipo-emergencia';
  if (tipo === 'pontual') return 'chip-tipo-pontual';
  return 'chip-tipo-regular';
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

function linhaItem(rotulo, valor, comoNumero = false) {
  const classe = comoNumero
    ? 'revisao-item-valor numero'
    : 'revisao-item-valor';
  const conteudo =
    valor === '' || valor === null || valor === undefined ? '—' : valor;
  return `
    <div class="revisao-item">
      <span class="revisao-item-rotulo">${escaparHTML(rotulo)}</span>
      <span class="${classe}">${escaparHTML(conteudo)}</span>
    </div>
  `;
}

function seccaoIdentificacao(plano) {
  return `
    <div class="revisao-seccao">
      <div class="revisao-seccao-cabecalho">
        <h3>Identificação</h3>
      </div>
      <div class="revisao-itens">
        ${linhaItem('Identificador', '#' + plano.id, true)}
        ${linhaItem('Tipo', ROTULO_TIPO[plano.tipo] || plano.tipo)}
        ${linhaItem('Erva aromática', ROTULO_ERVA[plano.erva] || plano.erva)}
        ${linhaItem('Estado', plano.estado === 'ativo' ? 'Ativo' : plano.estado)}
        ${linhaItem('Criado em', formatarData(plano.dataCriacao), true)}
      </div>
    </div>
  `;
}

function seccoesEspecificas(plano) {
  const d = plano.dadosEspecificos || {};

  if (plano.tipo === 'regular') {
    const c = d.condicoes || {};
    const r = d.rega || {};
    const t = c.temperatura || {};
    const h = c.humidade || {};
    const l = c.luminosidade || {};
    return `
      <div class="revisao-seccao">
        <div class="revisao-seccao-cabecalho">
          <h3>Condições ambientais</h3>
        </div>
        <div class="revisao-itens">
          ${linhaItem('Temperatura mín.', t.min + ' °C', true)}
          ${linhaItem('Temperatura máx.', t.max + ' °C', true)}
          ${linhaItem('Humidade mín.', h.min + ' %', true)}
          ${linhaItem('Humidade máx.', h.max + ' %', true)}
          ${linhaItem('Luminosidade mín.', l.min + ' lux', true)}
          ${linhaItem('Luminosidade máx.', l.max + ' lux', true)}
          ${linhaItem('Duração do ciclo', c.cicloDias + ' dias', true)}
        </div>
      </div>
      <div class="revisao-seccao">
        <div class="revisao-seccao-cabecalho">
          <h3>Rega e fertilização</h3>
        </div>
        <div class="revisao-itens">
          ${linhaItem('Frequência de rega', r.frequenciaHoras + ' h', true)}
          ${linhaItem('Volume por rega', r.volumeLitros + ' L', true)}
          ${linhaItem(
            'Frequência de fertilização',
            r.frequenciaFertilizacaoDias + ' dias',
            true
          )}
        </div>
      </div>
    `;
  }

  if (plano.tipo === 'emergencia') {
    return `
      <div class="revisao-seccao">
        <div class="revisao-seccao-cabecalho">
          <h3>Intervenção</h3>
        </div>
        <div class="revisao-itens">
          ${linhaItem('Tipo de intervenção', d.tipoIntervencao)}
          ${linhaItem('Intervalo mínimo', d.intervaloMinHoras + ' h', true)}
          ${linhaItem('Dosagem ou intensidade', d.dosagem)}
          ${linhaItem('Notas de aplicação', d.notasAplicacao || '—')}
        </div>
      </div>
    `;
  }

  if (plano.tipo === 'pontual') {
    return `
      <div class="revisao-seccao">
        <div class="revisao-seccao-cabecalho">
          <h3>Autorização</h3>
        </div>
        <div class="revisao-itens">
          ${linhaItem('Responsável', d.responsavel)}
          ${linhaItem('Justificação', d.justificacao)}
          ${linhaItem(
            'Data e hora',
            formatarDataHora(d.dataHoraAutorizacao),
            true
          )}
        </div>
      </div>
    `;
  }

  return '';
}

function renderizarNaoEncontrado(elemento, id) {
  elemento.innerHTML = `
    <div class="cabecalho-vista">
      <div>
        <h1>Plano não encontrado</h1>
        <p class="subtitulo">
          Não foi possível localizar um plano com o identificador
          indicado.
        </p>
      </div>
      <a href="#planos" class="btn btn-secundario">← Voltar</a>
    </div>
    <div class="estado-vazio">
      <h2>Sem registo</h2>
      <p>
        O plano com identificador
        <span class="mono">#${escaparHTML(id)}</span>
        não existe ou foi entretanto eliminado.
      </p>
      <a href="#planos" class="btn btn-primario">Ver listagem</a>
    </div>
  `;
}

export async function montar(elemento, _rota, params = []) {
  const id = params[0];

  if (!id) {
    renderizarNaoEncontrado(elemento, '');
    return;
  }

  elemento.innerHTML = `<p class="aviso-carregamento">A carregar plano…</p>`;

  let plano;
  try {
    plano = await obterPlano(id);
  } catch (erro) {
    elemento.innerHTML = `
      <div class="mensagem-erro-global">
        Não foi possível carregar o plano: ${escaparHTML(erro.message)}
      </div>
      <a href="#planos" class="btn btn-secundario">← Voltar</a>
    `;
    return;
  }

  if (!plano) {
    renderizarNaoEncontrado(elemento, id);
    return;
  }

  const tipoTexto = ROTULO_TIPO[plano.tipo] || plano.tipo;
  const ervaTexto = ROTULO_ERVA[plano.erva] || plano.erva;

  elemento.innerHTML = `
    <div class="cabecalho-vista">
      <div>
        <h1>${escaparHTML(ervaTexto)}</h1>
        <p class="subtitulo">
          <span class="chip ${classeChipTipo(plano.tipo)}">${escaparHTML(
    tipoTexto
  )}</span>
          <span class="chip">Guardado localmente</span>
        </p>
      </div>
      <a href="#planos" class="btn btn-secundario">← Voltar</a>
    </div>

    <div class="cartao-formulario">
      ${seccaoIdentificacao(plano)}
      ${seccoesEspecificas(plano)}
    </div>
  `;
}
