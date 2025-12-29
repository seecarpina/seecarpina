import { rtdb } from "./firebaseConfig.js";
import {
  ref,
  push,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* ===============================
   UTILIDADES
================================ */
function padronizarTexto(str) {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

function formatarCPF(cpf) {
  return cpf
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatarDataBR(iso) {
  if (!iso) return "-";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/* ===============================
   FIREBASE
================================ */
const registrosRef = ref(rtdb, "servidores/registros");
const cargosRef = ref(rtdb, "servidores/cargos");
const vinculosRef = ref(rtdb, "servidores/vinculos");
const locaisRef = ref(rtdb, "servidores/locaisExercicio");

/* ===============================
   ELEMENTOS DOM
================================ */
const form = document.getElementById("formServidor");
const tabela = document.querySelector("#tabelaServidores tbody");
const busca = document.getElementById("buscaServidor");

const msgEdicao = document.getElementById("msgEdicao");

const blocoCadastro = document.getElementById("botoesCadastroServidor");
const blocoEdicao = document.getElementById("botoesEdicaoServidor");

const btnSalvarEdicao = document.getElementById("btnSalvarServidor");
const btnCancelar = document.getElementById("btnCancelarServidor");

const inputCPF = document.getElementById("cpf");
const inputCargo = document.getElementById("cargo");
const boxCargo = document.getElementById("autocompleteCargo");
const inputVinculo = document.getElementById("vinculo");
const boxVinculo = document.getElementById("autocompleteVinculo");
const inputLocal = document.getElementById("localExercicio");
const boxLocal = document.getElementById("autocompleteLocal");

/* ===============================
   CONTROLE DE EDIÇÃO
================================ */
let editando = false;
let chaveEdicao = null;

/* ===============================
   MÁSCARA CPF
================================ */
inputCPF.addEventListener("input", () => {
  inputCPF.value = formatarCPF(inputCPF.value);
});
inputCPF.maxLength = 14;

/* ===============================
   AUTOCOMPLETE (DADOS)
================================ */
let cargos = [];
let vinculos = [];
let locais = [];

onValue(cargosRef, (s) => {
  cargos = s.exists() ? Object.values(s.val()).map(padronizarTexto) : [];
});
onValue(vinculosRef, (s) => {
  vinculos = s.exists() ? Object.values(s.val()).map(padronizarTexto) : [];
});
onValue(locaisRef, (s) => {
  locais = s.exists() ? Object.values(s.val()).map(padronizarTexto) : [];
});

/* ===============================
   AUTOCOMPLETE (UI)
================================ */
function mostrarSugestoes(input, lista, box) {
  const texto = input.value.toLowerCase();
  box.innerHTML = "";

  if (!texto) {
    box.style.display = "none";
    return;
  }

  lista
    .filter((i) => i.toLowerCase().includes(texto))
    .forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      li.addEventListener("mousedown", () => {
        input.value = item;
        box.style.display = "none";
      });
      box.appendChild(li);
    });

  box.style.display = box.children.length ? "block" : "none";
}

inputCargo.addEventListener("input", () =>
  mostrarSugestoes(inputCargo, cargos, boxCargo)
);
inputVinculo.addEventListener("input", () =>
  mostrarSugestoes(inputVinculo, vinculos, boxVinculo)
);
inputLocal.addEventListener("input", () =>
  mostrarSugestoes(inputLocal, locais, boxLocal)
);

document.addEventListener("click", (e) => {
  if (!inputCargo.contains(e.target) && !boxCargo.contains(e.target))
    boxCargo.style.display = "none";
  if (!inputVinculo.contains(e.target) && !boxVinculo.contains(e.target))
    boxVinculo.style.display = "none";
  if (!inputLocal.contains(e.target) && !boxLocal.contains(e.target))
    boxLocal.style.display = "none";
});

/* ===============================
   SALVAR / EDITAR
================================ */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  salvarServidor();
});

btnSalvarEdicao.addEventListener("click", salvarServidor);
btnCancelar.addEventListener("click", resetarFormulario);

async function salvarServidor() {
  const servidor = {
    codigo: codigo.value.trim(),
    nome: padronizarTexto(nome.value),
    cpf: inputCPF.value.replace(/\D/g, ""),
    cargo: padronizarTexto(inputCargo.value),
    vinculo: padronizarTexto(inputVinculo.value),
    localExercicio: padronizarTexto(inputLocal.value),
    dataAdmissao: dataAdmissao.value,
    situacao: situacao.value,
  };

  if (!servidor.codigo || !servidor.nome || !servidor.cpf) {
    return mostrarNotificacao("Preencha os campos obrigatórios", "erro");
  }

  try {
    if (editando && chaveEdicao) {
      await update(ref(rtdb, `servidores/registros/${chaveEdicao}`), servidor);
      mostrarNotificacao("Servidor atualizado com sucesso!");
    } else {
      await push(registrosRef, servidor);
      mostrarNotificacao("Servidor cadastrado com sucesso!");
    }

    resetarFormulario();
  } catch (err) {
    mostrarNotificacao("Erro ao salvar: " + err.message, "erro");
  }
}

/* ===============================
   LISTAGEM + BUSCA
================================ */
let servidores = [];

onValue(registrosRef, (s) => {
  servidores = s.exists()
    ? Object.entries(s.val()).map(([k, v]) => ({ ...v, _key: k }))
    : [];
  renderTabela();
});

// 🔥 LISTENER DA BUSCA (FALTAVA)
busca.addEventListener("input", renderTabela);

function renderTabela() {
  tabela.innerHTML = "";

  const termo = busca.value.toLowerCase();

  const filtrados = servidores.filter((s) =>
    `${s.codigo} ${s.nome} ${s.cpf} ${s.cargo} ${s.vinculo} ${s.localExercicio}`
      .toLowerCase()
      .includes(termo)
  );

  filtrados.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.codigo}</td>
      <td>${s.nome}</td>
      <td>${formatarCPF(s.cpf)}</td>
      <td>${s.cargo}</td>
      <td>${s.vinculo}</td>
      <td>${formatarDataBR(s.dataAdmissao)}</td>
      <td>${s.situacao}</td>
      <td>${s.localExercicio}</td>
      <td>
        <button class="edit-btn">
          <span class="material-symbols-outlined">edit_square</span>
        </button>
      </td>
    `;
    tr.querySelector(".edit-btn").onclick = () => editarServidor(s);
    tabela.appendChild(tr);
  });

  if (!filtrados.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center">
          Nenhum servidor encontrado
        </td>
      </tr>`;
  }
}

/* ===============================
   EDITAR
================================ */
function editarServidor(s) {
  editando = true;
  chaveEdicao = s._key;

  codigo.value = s.codigo;
  nome.value = s.nome;
  inputCPF.value = formatarCPF(s.cpf);
  inputCargo.value = s.cargo;
  inputVinculo.value = s.vinculo;
  inputLocal.value = s.localExercicio;
  dataAdmissao.value = s.dataAdmissao;
  situacao.value = s.situacao;

  blocoCadastro.style.display = "none";
  blocoEdicao.style.display = "flex";

  msgEdicao.textContent = `✏️ Editando servidor ${s.nome}`;
  msgEdicao.style.display = "block";
}

/* ===============================
   RESET / CANCELAR
================================ */
function resetarFormulario() {
  editando = false;
  chaveEdicao = null;
  form.reset();

  blocoCadastro.style.display = "block";
  blocoEdicao.style.display = "none";

  msgEdicao.textContent = "";
  msgEdicao.classList.remove("edicao");
}
