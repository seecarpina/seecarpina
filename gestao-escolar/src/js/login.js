import { auth, db } from "./firebaseConfig.js";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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
      <span class="material-symbols-outlined">progress_activity</span>
      <span>Entrando...</span>
    `;

    return;
  }

  btnEntrar.innerHTML = `
    <span class="material-symbols-outlined">login</span>
    <span>Entrar</span>
  `;
}

async function buscarDadosUsuario(uid) {
  const usuarioRef = doc(db, "usuarios", uid);
  const usuarioSnap = await getDoc(usuarioRef);

  if (!usuarioSnap.exists()) {
    return null;
  }

  return {
    uid,
    ...usuarioSnap.data(),
  };
}

function usuarioPodeAcessar(dadosUsuario) {
  if (!dadosUsuario) {
    return false;
  }

  if (dadosUsuario.ativo === false) {
    return false;
  }

  const perfil = String(dadosUsuario.perfil || "")
    .trim()
    .toUpperCase();

  return perfil === "GESTOR_ESCOLAR";
}

async function validarUsuarioLogado(user) {
  const dadosUsuario = await buscarDadosUsuario(user.uid);

  if (!dadosUsuario) {
    await signOut(auth);

    mostrarMensagem(
      "Seu usuário não possui cadastro no sistema. Entre em contato com a Secretaria de Educação.",
    );

    return false;
  }

  if (dadosUsuario.ativo === false) {
    await signOut(auth);

    mostrarMensagem(
      "Seu acesso está desativado. Entre em contato com a Secretaria de Educação.",
    );

    return false;
  }

  if (!usuarioPodeAcessar(dadosUsuario)) {
    await signOut(auth);

    mostrarMensagem("Este acesso é exclusivo para gestores escolares.");

    return false;
  }

  if (!dadosUsuario.escolaId) {
    await signOut(auth);

    mostrarMensagem(
      "Seu usuário ainda não está vinculado a uma unidade escolar.",
    );

    return false;
  }

  sessionStorage.setItem(
    "gestorEscolar",
    JSON.stringify({
      uid: user.uid,
      nome: dadosUsuario.nome || user.displayName || "Gestor",
      email: dadosUsuario.email || user.email || "",
      perfil: dadosUsuario.perfil,
      escolaId: dadosUsuario.escolaId,
      escolaNome: dadosUsuario.escolaNome || "",
    }),
  );

  return true;
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
    "auth/user-disabled":
      "Este usuário foi desativado no Firebase Authentication.",
  };

  return (
    mensagens[error.code] ||
    "Não foi possível entrar no portal. Tente novamente."
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
    const credencial = await signInWithEmailAndPassword(auth, email, senha);

    const autorizado = await validarUsuarioLogado(credencial.user);

    if (!autorizado) {
      return;
    }

    window.location.replace("./");
  } catch (error) {
    console.error("Erro ao entrar no Portal do Gestor:", error);
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

onAuthStateChanged(auth, async (user) => {
  const mensagemPendente = sessionStorage.getItem("mensagemLogin");

  if (mensagemPendente) {
    mostrarMensagem(mensagemPendente);
    sessionStorage.removeItem("mensagemLogin");
  }

  if (!user || loginEmAndamento) {
    return;
  }

  try {
    const autorizado = await validarUsuarioLogado(user);

    if (autorizado) {
      window.location.replace("./");
    }
  } catch (error) {
    console.error("Erro ao verificar usuário autenticado:", error);
    mostrarMensagem("Não foi possível verificar seu acesso.");
  }
});
