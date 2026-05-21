import { pedido } from '../api/_http.js';

const CHAVE_UTILIZADOR = 'greenherb.utilizador';

function escaparHTML(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function obterUtilizador() {
  try {
    const json = localStorage.getItem(CHAVE_UTILIZADOR);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

function guardarUtilizador(u) {
  try {
    localStorage.setItem(CHAVE_UTILIZADOR, JSON.stringify(u));
  } catch {
    /* ignorar */
  }
}

function mostrarMensagem(container, classe, texto) {
  if (!container) return;
  container.innerHTML = `<div class="${classe}">${escaparHTML(texto)}</div>`;
}

export async function montar(elemento) {
  const utilizador = obterUtilizador();
  if (!utilizador) {
    elemento.innerHTML = `
      <div class="cabecalho-vista">
        <div>
          <h1>Definições da conta</h1>
          <p class="subtitulo">Sessão não iniciada.</p>
        </div>
      </div>
    `;
    return;
  }

  elemento.innerHTML = `
    <div class="cabecalho-vista">
      <div>
        <h1>Definições da conta</h1>
        <p class="subtitulo">Gestão da informação pessoal e segurança da conta.</p>
      </div>
    </div>

    <div class="cartao-formulario" id="cartao-info">
      <h2>Informação pessoal</h2>
      <p class="descricao-passo">Atualiza o teu nome de exibição. O email não pode ser alterado.</p>
      <div id="msg-info"></div>

      <div class="linha-campos">
        <div class="campo" data-campo="nome">
          <label for="def-nome">Nome</label>
          <input id="def-nome" type="text" value="${escaparHTML(utilizador.nome || '')}" />
          <p class="mensagem-erro" hidden></p>
        </div>
        <div class="campo" data-campo="email">
          <label for="def-email">Email</label>
          <input id="def-email" type="email" value="${escaparHTML(utilizador.email || '')}" readonly disabled />
        </div>
      </div>

      <div class="barra-acoes">
        <span style="font-size: 12px; color: var(--color-text-secondary);">
          Perfil atual: <strong>${escaparHTML(utilizador.perfil || '')}</strong>
        </span>
        <div class="barra-acoes-direita">
          <button type="button" class="btn btn-primario" data-acao="guardar-info">
            Guardar alterações
          </button>
        </div>
      </div>
    </div>

    <div class="cartao-formulario" style="margin-top: 16px;" id="cartao-password">
      <h2>Alterar password</h2>
      <p class="descricao-passo">Para a segurança da conta, indica a password atual antes de definir uma nova.</p>
      <div id="msg-password"></div>

      <div class="campo" data-campo="passwordAtual">
        <label for="def-password-atual">Password atual</label>
        <input id="def-password-atual" type="password" autocomplete="current-password" />
        <p class="mensagem-erro" hidden></p>
      </div>

      <div class="linha-campos">
        <div class="campo" data-campo="novaPassword">
          <label for="def-nova-password">Nova password</label>
          <input id="def-nova-password" type="password" autocomplete="new-password" />
          <p class="mensagem-erro" hidden></p>
        </div>
        <div class="campo" data-campo="confirmar">
          <label for="def-confirmar">Confirmar nova password</label>
          <input id="def-confirmar" type="password" autocomplete="new-password" />
          <p class="mensagem-erro" hidden></p>
        </div>
      </div>

      <div class="barra-acoes">
        <span></span>
        <div class="barra-acoes-direita">
          <button type="button" class="btn btn-primario" data-acao="alterar-password">
            Alterar password
          </button>
        </div>
      </div>
    </div>
  `;

  function mostrarErroCampo(seletor, nome, mensagem) {
    const grupo = elemento.querySelector(`${seletor} [data-campo="${nome}"]`);
    if (!grupo) return;
    grupo.classList.add('erro');
    const span = grupo.querySelector('.mensagem-erro');
    if (span) {
      span.hidden = false;
      span.textContent = mensagem;
    }
  }

  function limparErros(seletor) {
    elemento.querySelectorAll(`${seletor} .campo.erro`).forEach((g) => {
      g.classList.remove('erro');
      const span = g.querySelector('.mensagem-erro');
      if (span) {
        span.hidden = true;
        span.textContent = '';
      }
    });
  }

  const botaoGuardarInfo = elemento.querySelector(
    '[data-acao="guardar-info"]'
  );
  const msgInfo = elemento.querySelector('#msg-info');

  botaoGuardarInfo.addEventListener('click', async () => {
    limparErros('#cartao-info');
    const nome = elemento.querySelector('#def-nome').value.trim();
    if (nome.length < 2) {
      mostrarErroCampo('#cartao-info', 'nome', 'O nome tem de ter pelo menos 2 caracteres.');
      return;
    }
    botaoGuardarInfo.disabled = true;
    const textoOriginal = botaoGuardarInfo.textContent;
    botaoGuardarInfo.textContent = 'A guardar…';
    try {
      const atualizado = await pedido(
        `/utilizadores/${encodeURIComponent(utilizador._id || utilizador.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ nome }),
        }
      );
      const novo = { ...utilizador, ...atualizado, nome };
      guardarUtilizador(novo);
      window.dispatchEvent(new CustomEvent('greenherb:auth-mudou'));
      mostrarMensagem(
        msgInfo,
        'mensagem-sucesso-global',
        'Nome atualizado com sucesso.'
      );
    } catch (erro) {
      mostrarMensagem(
        msgInfo,
        'mensagem-erro-global',
        erro.message || 'Não foi possível guardar.'
      );
    } finally {
      botaoGuardarInfo.disabled = false;
      botaoGuardarInfo.textContent = textoOriginal;
    }
  });

  const botaoAlterarPassword = elemento.querySelector(
    '[data-acao="alterar-password"]'
  );
  const msgPassword = elemento.querySelector('#msg-password');

  botaoAlterarPassword.addEventListener('click', async () => {
    limparErros('#cartao-password');
    msgPassword.innerHTML = '';
    const passwordAtual = elemento.querySelector('#def-password-atual').value;
    const novaPassword = elemento.querySelector('#def-nova-password').value;
    const confirmar = elemento.querySelector('#def-confirmar').value;

    let valido = true;
    if (!passwordAtual) {
      mostrarErroCampo('#cartao-password', 'passwordAtual', 'Indica a password atual.');
      valido = false;
    }
    if (!novaPassword || novaPassword.length < 6) {
      mostrarErroCampo(
        '#cartao-password',
        'novaPassword',
        'A nova password tem de ter pelo menos 6 caracteres.'
      );
      valido = false;
    }
    if (novaPassword !== confirmar) {
      mostrarErroCampo(
        '#cartao-password',
        'confirmar',
        'A confirmação não coincide com a nova password.'
      );
      valido = false;
    }
    if (!valido) return;

    botaoAlterarPassword.disabled = true;
    const textoOriginal = botaoAlterarPassword.textContent;
    botaoAlterarPassword.textContent = 'A alterar…';
    try {
      await pedido('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ passwordAtual, novaPassword }),
      });
      mostrarMensagem(
        msgPassword,
        'mensagem-sucesso-global',
        'Password alterada com sucesso.'
      );
      elemento.querySelector('#def-password-atual').value = '';
      elemento.querySelector('#def-nova-password').value = '';
      elemento.querySelector('#def-confirmar').value = '';
    } catch (erro) {
      mostrarMensagem(
        msgPassword,
        'mensagem-erro-global',
        erro.message || 'Não foi possível alterar a password.'
      );
    } finally {
      botaoAlterarPassword.disabled = false;
      botaoAlterarPassword.textContent = textoOriginal;
    }
  });
}
