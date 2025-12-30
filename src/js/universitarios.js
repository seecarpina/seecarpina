import { rtdb } from "./firebaseConfig.js";
import {
  ref,
  push,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* ===============================
   ELEMENTOS
================================ */
const form = document.getElementById("formUniversitario");
const tabela = document.querySelector("#tabelaUniversitarios tbody");

const btnCancelar = document.getElementById("cancelarEdicao");

const inputNome = document.getElementById("nome");
const inputNascimento = document.getElementById("dataNascimento");
const inputCPF = document.getElementById("cpf");
const inputFaculdade = document.getElementById("faculdade");
const inputPeriodo = document.getElementById("periodo");
const inputMae = document.getElementById("nomeMae");
const inputRota = document.getElementById("rota");

const inputFoto = document.getElementById("foto");
const previewFoto = document.getElementById("previewFoto");
const btnCamera = document.getElementById("btnCamera");
const listaFaculdades = document.getElementById("listaFaculdades");

/* ===============================
   FIREBASE
================================ */
const registrosRef = ref(rtdb, "universitarios/registros");
const faculdadesRef = ref(rtdb, "universitarios/faculdades");

/* ===============================
   VARIÁVEIS
================================ */
let universitarios = [];
let faculdades = [];
let editando = false;
let chaveEdicao = null;
let fotoBase64 = "";
let streamCamera = null;

/* ===============================
   UTILIDADES
================================ */
function padronizarTexto(texto) {
  return texto ? texto.trim() : "";
}

function formatarCPF(valor) {
  return valor
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/* ===============================
   CPF MASK
================================ */
inputCPF.addEventListener("input", () => {
  inputCPF.value = formatarCPF(inputCPF.value);
});

/* ===============================
   AUTOCOMPLETE FACULDADE
================================ */
onValue(faculdadesRef, (snap) => {
  faculdades = snap.exists() ? Object.values(snap.val()) : [];
});

inputFaculdade.addEventListener("input", () => {
  const termo = inputFaculdade.value.toLowerCase().trim();
  listaFaculdades.innerHTML = "";

  if (!termo) {
    listaFaculdades.style.display = "none";
    return;
  }

  const filtrados = faculdades.filter((f) => f.toLowerCase().includes(termo));

  filtrados.forEach((f) => {
    const li = document.createElement("li");
    li.textContent = f;
    li.onclick = () => {
      inputFaculdade.value = f;
      listaFaculdades.style.display = "none";
    };
    listaFaculdades.appendChild(li);
  });

  listaFaculdades.style.display = filtrados.length ? "block" : "none";
});

document.addEventListener("click", (e) => {
  if (!inputFaculdade.contains(e.target)) {
    listaFaculdades.style.display = "none";
  }
});

/* ===============================
   FOTO (UPLOAD)
================================ */
inputFoto.addEventListener("change", () => {
  const file = inputFoto.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    fotoBase64 = e.target.result;
    previewFoto.src = fotoBase64;
    previewFoto.style.display = "block";
  };
  reader.readAsDataURL(file);
});

/* ===============================
   CÂMERA
================================ */
btnCamera.addEventListener("click", async () => {
  const video = document.createElement("video");
  video.autoplay = true;

  streamCamera = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = streamCamera;

  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0,0,0,.8)";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";

  const btnCapturar = document.createElement("button");
  btnCapturar.textContent = "📸 Capturar";
  btnCapturar.className = "btn";

  modal.appendChild(video);
  modal.appendChild(btnCapturar);
  document.body.appendChild(modal);

  btnCapturar.onclick = () => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.getContext("2d").drawImage(video, 0, 0);
    fotoBase64 = canvas.toDataURL("image/png");

    previewFoto.src = fotoBase64;
    previewFoto.style.display = "block";

    streamCamera.getTracks().forEach((t) => t.stop());
    modal.remove();
  };
});

/* ===============================
   LISTAGEM
================================ */
onValue(registrosRef, (snap) => {
  tabela.innerHTML = "";

  if (!snap.exists()) {
    tabela.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center">
          Nenhum universitário cadastrado
        </td>
      </tr>`;
    return;
  }

  universitarios = Object.entries(snap.val()).map(([k, v]) => ({
    ...v,
    _key: k,
  }));

  universitarios.forEach((u) => {
    const foto = u.foto
      ? `<img src="${u.foto}">`
      : `<img src="./src/images/profile.webp">`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-foto" id="profile-photo">${foto}</td>
      <td>${u.nome}</td>
      <td>${u.cpf}</td>
      <td>${u.faculdade}</td>
      <td>${u.periodo}</td>
      <td>${u.rota}</td>
      <td>
        <button class="edit-btn">
          <span class="material-symbols-outlined">edit_square</span>
        </button>
      </td>
    `;

    tr.querySelector(".edit-btn").onclick = () => editarUniversitario(u);
    tabela.appendChild(tr);
  });
});

/* ===============================
   SALVAR / EDITAR
================================ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const dados = {
    nome: padronizarTexto(inputNome.value),
    nascimento: inputNascimento.value,
    cpf: inputCPF.value,
    faculdade: padronizarTexto(inputFaculdade.value),
    periodo: inputPeriodo.value,
    nomeMae: padronizarTexto(inputMae.value),
    rota: padronizarTexto(inputRota.value),
    foto: fotoBase64,
  };

  if (!dados.nome || !dados.cpf) {
    return mostrarNotificacao("Preencha os campos obrigatórios", "erro");
  }

  try {
    if (editando && chaveEdicao) {
      await update(ref(rtdb, `universitarios/registros/${chaveEdicao}`), dados);
      mostrarNotificacao("Cadastro atualizado!");
    } else {
      await push(registrosRef, dados);
      mostrarNotificacao("Universitário cadastrado!");
    }

    if (dados.faculdade && !faculdades.includes(dados.faculdade)) {
      push(faculdadesRef, dados.faculdade);
    }

    resetarFormulario();
  } catch {
    mostrarNotificacao("Erro ao salvar", "erro");
  }
});

/* ===============================
   EDITAR
================================ */
function editarUniversitario(u) {
  editando = true;
  chaveEdicao = u._key;

  inputNome.value = u.nome;
  inputNascimento.value = u.nascimento;
  inputCPF.value = u.cpf;
  inputFaculdade.value = u.faculdade;
  inputPeriodo.value = u.periodo;
  inputMae.value = u.nomeMae;
  inputRota.value = u.rota;

  if (u.foto) {
    fotoBase64 = u.foto;
    previewFoto.src = u.foto;
    previewFoto.style.display = "block";
  }

  btnCancelar.style.display = "inline-block";
}

/* ===============================
   CANCELAR / RESET
================================ */
btnCancelar.addEventListener("click", () => resetarFormulario());

function resetarFormulario() {
  editando = false;
  chaveEdicao = null;

  form.reset();
  fotoBase64 = "";
  previewFoto.style.display = "none";

  btnCancelar.style.display = "none";
}
