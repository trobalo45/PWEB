import { login as apiLogin } from '../api/planosAPI.js';
import { loginLocal } from '../storage/utilizadoresStore.js';

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
    <div class="ecra-login">
      <div class="cartao-login">
        <div class="logo-login">
          <i class="ti ti-leaf logo-folha" aria-hidden="true"></i>
          <span class="logo-marca-login">
            <span class="logo-green">Green</span><span class="logo-herb-dark">Herb</span>
          </span>
        </div>

        <h1 class="login-titulo">Bem-vindo de volta</h1>
        <p class="login-subtitulo">Inicia sessão para aceder à plataforma</p>

        <form id="form-login" novalidate>
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

          <button type="submit" class="btn-login-primario">Entrar</button>
        </form>

        <p class="aviso-sem-conta">
          Não tens conta? Fala com o administrador do sistema.
        </p>
      </div>
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
      const resposta = await tentarLogin(email, password);
      guardarSessao(resposta);
      window.dispatchEvent(new CustomEvent('greenherb:auth-mudou'));
      window.location.hash = '#dashboard';
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

async function tentarLogin(email, password) {
  console.log('[login] A tentar login via API…', { email });
  try {
    const resposta = await apiLogin(email, password);
    console.log('[login] API respondeu com sucesso:', {
      utilizador: resposta?.utilizador?.email,
      perfil: resposta?.utilizador?.perfil,
      ativo: resposta?.utilizador?.ativo,
    });
    return resposta;
  } catch (erroAPI) {
    console.log('[login] Erro de login via API:', {
      estado: erroAPI?.estado,
      mensagem: erroAPI?.message,
    });
    if (erroAPI?.estado === 401) {
      const msg = String(erroAPI.message || '').toLowerCase();
      if (msg.includes('desativada')) {
        console.log('[login] Servidor sinalizou conta desativada.');
        throw new Error(
          'Conta desativada. Contacta o administrador do sistema.'
        );
      }
      console.log('[login] Servidor sinalizou credenciais inválidas.');
      throw new Error('Credenciais inválidas.');
    }
    console.log(
      '[login] API indisponível (estado:',
      erroAPI?.estado,
      ') — a usar login local…'
    );
    return await loginLocal(email, password);
  }
}
