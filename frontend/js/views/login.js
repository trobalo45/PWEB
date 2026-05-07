import { login as apiLogin } from '../api/planosAPI.js';

const CHAVE_TOKEN = 'greenherb.token';
const CHAVE_UTILIZADOR = 'greenherb.utilizador';

function escapar(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function guardarSessao(resposta) {
  try {
    localStorage.setItem(CHAVE_TOKEN, resposta.token);
    if (resposta.utilizador) {
      localStorage.setItem(
        CHAVE_UTILIZADOR,
        JSON.stringify(resposta.utilizador)
      );
    }
  } catch {
    /* localStorage indisponível */
  }
}

export async function montar(elemento) {
  elemento.innerHTML = `
    <div class="cabecalho-vista">
      <div>
        <h1>Iniciar sessão</h1>
        <p class="subtitulo">
          Acesso à API GreenHerb. Sem sessão, os planos ficam apenas neste
          dispositivo.
        </p>
      </div>
    </div>

    <div class="wizard">
      <form id="form-login" novalidate>
        <div class="cartao-formulario">
          <div id="mensagem-login"></div>

          <div class="campo" data-campo="email">
            <label for="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="username"
              required
            />
            <p class="mensagem-erro" hidden></p>
          </div>

          <div class="campo" data-campo="password">
            <label for="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
            />
            <p class="mensagem-erro" hidden></p>
          </div>
        </div>

        <div class="barra-acoes">
          <a href="#planos" class="btn btn-ghost">Cancelar</a>
          <div class="barra-acoes-direita">
            <button type="submit" class="btn btn-primario">Entrar</button>
          </div>
        </div>
      </form>
    </div>
  `;

  const formulario = elemento.querySelector('#form-login');
  const mensagem = elemento.querySelector('#mensagem-login');

  function mostrarErroCampo(nome, texto) {
    const grupo = formulario.querySelector(`[data-campo="${nome}"]`);
    if (!grupo) return;
    grupo.classList.add('erro');
    const span = grupo.querySelector('.mensagem-erro');
    if (span) {
      span.hidden = false;
      span.textContent = texto;
    }
  }

  function limparErros() {
    formulario.querySelectorAll('.campo.erro').forEach((g) => {
      g.classList.remove('erro');
      const span = g.querySelector('.mensagem-erro');
      if (span) {
        span.hidden = true;
        span.textContent = '';
      }
    });
    mensagem.innerHTML = '';
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros();

    const email = formulario.email.value.trim();
    const password = formulario.password.value;

    let valido = true;
    if (!email) {
      mostrarErroCampo('email', 'Indique o email.');
      valido = false;
    }
    if (!password) {
      mostrarErroCampo('password', 'Indique a password.');
      valido = false;
    }
    if (!valido) return;

    const botao = formulario.querySelector('button[type="submit"]');
    botao.disabled = true;
    botao.textContent = 'A entrar…';

    try {
      const resposta = await apiLogin(email, password);
      guardarSessao(resposta);
      window.dispatchEvent(new CustomEvent('greenherb:auth-mudou'));
      window.location.hash = '#planos';
    } catch (erro) {
      botao.disabled = false;
      botao.textContent = 'Entrar';
      mensagem.innerHTML = `
        <div class="mensagem-erro-global">
          ${escapar(erro.message || 'Não foi possível iniciar sessão.')}
        </div>
      `;
    }
  });
}
