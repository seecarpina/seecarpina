import { db } from "./firebaseConfig.js";

import {
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ===============================
   ELEMENTOS
=============================== */

const inputNome = document.getElementById("userNome");

const inputCargo = document.getElementById("userCargo");

const inputEmail = document.getElementById("userEmail");

const inputFoto = document.getElementById("userFoto");

const previewFoto = document.getElementById("previewFoto");

const fotoPlaceholder = document.getElementById("fotoPlaceholder");

const seletorTema = document.getElementById("temaCores");

const btnSalvar = document.getElementById("btnSalvar");

/* ===============================
   NOTIFICAÇÃO
=============================== */

function notificar(mensagem, tipo = "sucesso") {
  if (typeof window.mostrarNotificacao === "function") {
    window.mostrarNotificacao(mensagem, tipo);

    return;
  }

  alert(mensagem);
}

/* ===============================
   TEMA
=============================== */

document.addEventListener("DOMContentLoaded", () => {
  const temaSalvo = localStorage.getItem("temaCores");

  if (temaSalvo) {
    seletorTema.value = temaSalvo;
  }
});

seletorTema?.addEventListener("change", function () {
  document.body.classList.remove(
    "paleta_1",
    "paleta_2",
    "paleta_3",
    "paleta_4",
  );

  const temaEscolhido = this.value;

  if (temaEscolhido) {
    document.body.classList.add(temaEscolhido);
  }

  localStorage.setItem("temaCores", temaEscolhido);
});

/* ===============================
   CARREGAR USUÁRIO
=============================== */

document.addEventListener("DOMContentLoaded", () => {
  const intervalo = setInterval(() => {
    if (!window.dadosUsuario) {
      return;
    }

    clearInterval(intervalo);

    const usuario = window.dadosUsuario;

    inputNome.value = usuario.nome || "";

    inputEmail.value = usuario.email || window.usuarioAuth?.email || "";

    inputCargo.value = usuario.cargo || "";

    if (usuario.foto) {
      previewFoto.src = usuario.foto;

      previewFoto.style.display = "block";

      fotoPlaceholder.style.display = "none";
    }
  }, 100);
});

/* ===============================
   PREVIEW FOTO
=============================== */

inputFoto?.addEventListener("change", function () {
  const arquivo = this.files?.[0];

  if (!arquivo) return;

  const reader = new FileReader();

  reader.onload = (event) => {
    previewFoto.src = event.target.result;

    previewFoto.style.display = "block";

    fotoPlaceholder.style.display = "none";
  };

  reader.readAsDataURL(arquivo);
});

/* ===============================
   SALVAR
=============================== */

btnSalvar?.addEventListener("click", async () => {
  if (!window.usuarioAuth) {
    notificar("Usuário não autenticado.", "erro");

    return;
  }

  const novoNome = inputNome.value.trim();

  const novoCargo = inputCargo.value.trim();

  if (!novoNome) {
    notificar("O nome não pode estar vazio.", "erro");

    inputNome.focus();
    return;
  }

  const preview = previewFoto.src;

  const novaFoto = preview.startsWith("data:image")
    ? preview
    : window.dadosUsuario?.foto || null;

  btnSalvar.disabled = true;

  const textoOriginal = btnSalvar.innerHTML;

  btnSalvar.innerHTML = `
      <span class="material-symbols-outlined">
        hourglass_top
      </span>

      Salvando...
    `;

  try {
    const refUsuario = doc(db, "usuarios", window.usuarioAuth.uid);

    await updateDoc(refUsuario, {
      nome: novoNome,
      cargo: novoCargo,
      foto: novaFoto,
      atualizadoEm: new Date().toISOString(),
    });

    if (window.dadosUsuario) {
      window.dadosUsuario.nome = novoNome;

      window.dadosUsuario.cargo = novoCargo;

      window.dadosUsuario.foto = novaFoto;
    }

    const fotoTopo = document.querySelector(".profile-photo img");

    if (fotoTopo && novaFoto) {
      fotoTopo.src = novaFoto;
    }

    notificar("Dados atualizados com sucesso!");
  } catch (erro) {
    console.error("Erro ao atualizar usuário:", erro);

    notificar("Não foi possível atualizar os dados.", "erro");
  } finally {
    btnSalvar.disabled = false;

    btnSalvar.innerHTML = textoOriginal;
  }
});
