import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCl69j1qpqKObNlZFSDOaJY5Ob8arFCr3k",
  authDomain: "see-carpina-2a774.firebaseapp.com",
  projectId: "see-carpina-2a774",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const formLogin = document.getElementById("formLogin");
const inputEmail = document.getElementById("email");
const inputSenha = document.getElementById("senha");
const btnEntrar = document.getElementById("btnEntrar");
const btnMostrarSenha = document.getElementById("btnMostrarSenha");
const mensagemLogin = document.getElementById("mensagemLogin");

let loginEmAndamento = false;

function mostrarMensagem(mensagem) {
  mensagemLogin.textContent = mensagem;
  mensagemLogin.classList.add("ativa");
}

function limparMensagem() {
  mensagemLogin.textContent = "";
  mensagemLogin.classList.remove("ativa");
}

function alterarCarregamento(carregando) {
  btnEntrar.disabled = carregando;

  if (carregando) {
    btnEntrar.innerHTML = `
      <span class="material-symbols-outlined">
        progress_activity
      </span>

      <span>Entrando...</span>
    `;

    return;
  }

  btnEntrar.innerHTML = `
    <span class="material-symbols-outlined">login</span>
    <span>Entrar</span>
  `;
}

function obterMensagemErro(error) {
  const mensagens = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",

    "auth/invalid-email": "Informe um endereço de e-mail válido.",

    "auth/missing-password": "Informe sua senha.",

    "auth/too-many-requests":
      "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.",

    "auth/network-request-failed":
      "Não foi possível conectar ao servidor. Verifique sua internet.",

    "auth/user-disabled": "Este usuário está desativado.",
  };

  return (
    mensagens[error.code] ||
    "Não foi possível entrar no sistema. Tente novamente."
  );
}

formLogin.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (loginEmAndamento) {
    return;
  }

  limparMensagem();

  const email = inputEmail.value.trim();
  const senha = inputSenha.value;

  if (!email || !senha) {
    mostrarMensagem("Informe seu e-mail e sua senha.");
    return;
  }

  loginEmAndamento = true;
  alterarCarregamento(true);

  try {
    await signInWithEmailAndPassword(auth, email, senha);

    window.location.replace("./");
  } catch (error) {
    console.error("Erro ao entrar no sistema:", error);

    mostrarMensagem(obterMensagemErro(error));
  } finally {
    loginEmAndamento = false;
    alterarCarregamento(false);
  }
});

btnMostrarSenha.addEventListener("click", () => {
  const senhaVisivel = inputSenha.type === "text";

  inputSenha.type = senhaVisivel ? "password" : "text";

  btnMostrarSenha.innerHTML = `
    <span class="material-symbols-outlined">
      ${senhaVisivel ? "visibility" : "visibility_off"}
    </span>
  `;

  btnMostrarSenha.title = senhaVisivel ? "Mostrar senha" : "Ocultar senha";

  btnMostrarSenha.setAttribute(
    "aria-label",
    senhaVisivel ? "Mostrar senha" : "Ocultar senha",
  );
});

onAuthStateChanged(auth, (user) => {
  if (user && !loginEmAndamento) {
    window.location.replace("./");
  }
});
