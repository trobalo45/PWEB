import {
  listarUtilizadores,
  guardarUtilizador,
  atualizarUtilizador,
  desativarUtilizador,
  ativarUtilizador,
  eliminarUtilizador,
} from '../storage/utilizadoresStore.js';
import { registar as auditar } from '../storage/auditoriaStore.js';

const PERFIS = ['Técnico', 'Responsável', 'Administrador'];

function escaparHTML(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  if (utilizador?.perfil !== 'Administrador') {
    elemento.innerHTML = `
      <div class="cabecalho-vista">
        <div>
          <h1>Gestão de utilizadores</h1>
          <p class="subtitulo">Administração de contas da plataforma.</p>
        </div>
      </div>
      <div class="estado-vazio">
        <h2>Acesso restrito</h2>
        <p>Apenas administradores podem aceder a esta vista.</p>
      </div>
    `;
    return;
  }

  let utilizadores = [];
  try {
    utilizadores = await listarUtilizadores();
  } catch (erro) {
    elemento.innerHTML = `<div class="mensagem-erro-global">${escaparHTML(erro.message)}</div>`;
    return;
  }

  function pintar() {
    elemento.innerHTML = `
      <div class="cabecalho-vista">
        <div>
          <h1>Gestão de utilizadores</h1>
          <p class="subtitulo">${utilizadores.length} ${utilizadores.length === 1 ? 'utilizador' : 'utilizadores'} registados.</p>
        </div>
        <button type="button" class="btn btn-primario" data-acao="abrir-form">+ Novo utilizador</button>
      </div>

      <div id="zona-form"></div>

      <div class="tabela-planos-wrapper" style="margin-top: 16px;">
        <table class="tabela-planos">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Perfil</th>
              <th>Estado</th>
              <th aria-label="Ações"></th>
            </tr>
          </thead>
          <tbody>
            ${utilizadores
              .map(
                (u) => `
              <tr data-id="${u.id}">
                <td>${escaparHTML(u.nome)}</td>
                <td>${escaparHTML(u.email)}</td>
                <td>${escaparHTML(u.perfil)}</td>
                <td>
                  <span class="chip ${u.ativo ? 'chip-estado-ativo' : 'chip-estado-rascunho'}">
                    ${u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td class="celula-acoes">
                  <button type="button" class="btn btn-secundario" data-acao="editar">Editar</button>
                  ${
                    u.ativo
                      ? '<button type="button" class="btn btn-secundario" data-acao="desativar">Desativar</button>'
                      : '<button type="button" class="btn btn-secundario" data-acao="ativar">Ativar</button>'
                  }
                  <button type="button" class="btn btn-perigo" data-acao="eliminar">Eliminar</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    elemento
      .querySelector('[data-acao="abrir-form"]')
      .addEventListener('click', mostrarForm);

    elemento.querySelectorAll('tr[data-id]').forEach((tr) => {
      const id = tr.dataset.id;
      tr.querySelector('[data-acao="desativar"]')?.addEventListener(
        'click',
        async () => {
          if (!window.confirm('Desativar este utilizador?')) return;
          await desativarUtilizador(id);
          auditar('utilizador.desativar', { id });
          utilizadores = utilizadores.map((u) =>
            String(u.id) === String(id) ? { ...u, ativo: false } : u
          );
          pintar();
        }
      );
      tr.querySelector('[data-acao="ativar"]')?.addEventListener(
        'click',
        async () => {
          await ativarUtilizador(id);
          auditar('utilizador.ativar', { id });
          utilizadores = utilizadores.map((u) =>
            String(u.id) === String(id) ? { ...u, ativo: true } : u
          );
          pintar();
        }
      );
      tr.querySelector('[data-acao="editar"]')?.addEventListener(
        'click',
        () => {
          const utilizador = utilizadores.find(
            (u) => String(u.id) === String(id)
          );
          if (utilizador) abrirModalEditar(utilizador);
        }
      );
      tr.querySelector('[data-acao="eliminar"]')?.addEventListener(
        'click',
        () => {
          const alvo = utilizadores.find(
            (u) => String(u.id) === String(id)
          );
          if (alvo) abrirModalEliminar(alvo);
        }
      );
    });
  }

  function abrirModalEliminar(u) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3 style="margin: 0 0 8px;">Eliminar conta</h3>
        <p style="margin: 0 0 16px; color: var(--color-text-secondary); font-size: 13px;">
          Tens a certeza que queres eliminar a conta de <strong>${escaparHTML(u.nome || '')}</strong>?
          Esta ação é irreversível.
        </p>
        <div class="barra-acoes">
          <button type="button" class="btn btn-ghost" data-acao="cancelar">Cancelar</button>
          <div class="barra-acoes-direita">
            <button type="button" class="btn btn-perigo" data-acao="confirmar">
              Eliminar definitivamente
            </button>
          </div>
        </div>
        <div id="msg-eliminar" style="margin-top: 12px;"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const fechar = () => overlay.remove();
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fechar();
    });
    overlay.querySelector('[data-acao="cancelar"]').addEventListener('click', fechar);
    overlay
      .querySelector('[data-acao="confirmar"]')
      .addEventListener('click', async () => {
        const botao = overlay.querySelector('[data-acao="confirmar"]');
        const msg = overlay.querySelector('#msg-eliminar');
        botao.disabled = true;
        botao.textContent = 'A eliminar…';
        try {
          await eliminarUtilizador(u.id);
          auditar('utilizador.eliminar', { id: u.id, email: u.email });
          utilizadores = utilizadores.filter(
            (x) => String(x.id) !== String(u.id)
          );
          fechar();
          pintar();
        } catch (erro) {
          botao.disabled = false;
          botao.textContent = 'Eliminar definitivamente';
          msg.innerHTML = `<div class="mensagem-erro-global">${escaparHTML(erro.message || 'Não foi possível eliminar.')}</div>`;
        }
      });
  }

  function abrirModalEditar(u) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3 style="margin: 0 0 12px;">Editar utilizador</h3>
        <form id="form-editar" novalidate>
          <div class="linha-campos">
            <div class="campo" data-campo="nome">
              <label for="edit-nome">Nome</label>
              <input id="edit-nome" name="nome" type="text" value="${escaparHTML(u.nome || '')}" required />
              <p class="mensagem-erro" hidden></p>
            </div>
            <div class="campo" data-campo="email">
              <label for="edit-email">Email</label>
              <input id="edit-email" name="email" type="email" value="${escaparHTML(u.email || '')}" required />
              <p class="mensagem-erro" hidden></p>
            </div>
          </div>
          <div class="linha-campos">
            <div class="campo" data-campo="perfil">
              <label for="edit-perfil">Perfil</label>
              <select id="edit-perfil" name="perfil" required>
                ${PERFIS.map(
                  (p) =>
                    `<option value="${p}" ${
                      u.perfil === p ? 'selected' : ''
                    }>${escaparHTML(p)}</option>`
                ).join('')}
              </select>
              <p class="mensagem-erro" hidden></p>
            </div>
            <div class="campo" data-campo="ativo">
              <label for="edit-ativo">Estado</label>
              <label class="toggle-ativo">
                <input id="edit-ativo" name="ativo" type="checkbox" ${u.ativo ? 'checked' : ''} />
                <span class="toggle-ativo-rotulo" data-on="Ativo" data-off="Inativo">${u.ativo ? 'Ativo' : 'Inativo'}</span>
              </label>
            </div>
          </div>
          <div class="barra-acoes">
            <button type="button" class="btn btn-ghost" data-acao="cancelar">Cancelar</button>
            <div class="barra-acoes-direita">
              <button type="submit" class="btn btn-primario">Guardar alterações</button>
            </div>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    const fechar = () => overlay.remove();
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fechar();
    });
    overlay.querySelector('[data-acao="cancelar"]').addEventListener('click', fechar);

    const checkbox = overlay.querySelector('#edit-ativo');
    const rotulo = overlay.querySelector('.toggle-ativo-rotulo');
    checkbox.addEventListener('change', () => {
      rotulo.textContent = checkbox.checked ? 'Ativo' : 'Inativo';
    });

    overlay.querySelector('#form-editar').addEventListener(
      'submit',
      async (evento) => {
        evento.preventDefault();
        const nome = overlay.querySelector('#edit-nome').value.trim();
        const email = overlay
          .querySelector('#edit-email')
          .value.trim()
          .toLowerCase();
        const perfil = overlay.querySelector('#edit-perfil').value;
        const ativo = Boolean(overlay.querySelector('#edit-ativo').checked);
        if (!nome || !email || !perfil) return;

        const alteracoes = { nome, email, perfil, ativo };
        await atualizarUtilizador(u.id, alteracoes);
        auditar('utilizador.editar', { id: u.id, alteracoes });
        utilizadores = utilizadores.map((x) =>
          String(x.id) === String(u.id) ? { ...x, ...alteracoes } : x
        );
        fechar();
        pintar();
      }
    );
  }

  function mostrarForm() {
    const zona = elemento.querySelector('#zona-form');
    if (!zona) return;
    zona.innerHTML = `
      <form id="form-utilizador" class="cartao-formulario" style="margin-top: 16px;">
        <h3 style="margin: 0 0 12px;">Novo utilizador</h3>
        <div class="linha-campos">
          <div class="campo" data-campo="nome">
            <label for="nome">Nome</label>
            <input id="nome" name="nome" type="text" required />
            <p class="mensagem-erro" hidden></p>
          </div>
          <div class="campo" data-campo="email">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" required />
            <p class="mensagem-erro" hidden></p>
          </div>
        </div>
        <div class="linha-campos">
          <div class="campo" data-campo="password">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" required minlength="6" />
            <p class="mensagem-erro" hidden></p>
          </div>
          <div class="campo" data-campo="perfil">
            <label for="perfil">Perfil</label>
            <select id="perfil" name="perfil" required>
              ${PERFIS.map((p) => `<option value="${p}">${escaparHTML(p)}</option>`).join('')}
            </select>
            <p class="mensagem-erro" hidden></p>
          </div>
        </div>
        <div class="barra-acoes">
          <button type="button" class="btn btn-ghost" data-acao="fechar">Cancelar</button>
          <div class="barra-acoes-direita">
            <button type="submit" class="btn btn-primario">Guardar utilizador</button>
          </div>
        </div>
      </form>
    `;

    const form = zona.querySelector('#form-utilizador');
    form.querySelector('[data-acao="fechar"]').addEventListener('click', () => {
      zona.innerHTML = '';
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = form.nome.value.trim();
      const email = form.email.value.trim().toLowerCase();
      const password = form.password.value;
      const perfil = form.perfil.value;

      if (!nome || !email || !password || !perfil) return;
      if (password.length < 6) return;

      const novo = {
        nome,
        email,
        password,
        perfil,
        ativo: true,
      };
      try {
        const id = await guardarUtilizador(novo);
        auditar('utilizador.criar', { id, email, perfil });
        utilizadores = await listarUtilizadores();
        zona.innerHTML = '';
        pintar();
      } catch (erro) {
        const grupo = form.querySelector('[data-campo="email"]');
        grupo.classList.add('erro');
        const span = grupo.querySelector('.mensagem-erro');
        if (span) {
          span.hidden = false;
          span.textContent = erro.message || 'Não foi possível criar o utilizador.';
        }
      }
    });
  }

  pintar();
}
