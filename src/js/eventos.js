import { rtdb } from "./firebaseConfig.js";
import {
  ref,
  push,
  onValue,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* =========================
   CONTROLE
========================= */
let editando = false;
let chaveEdicao = null;
let abaAtiva = "futuros";
let eventosCache = [];

/* =========================
   ABAS
========================= */
document.querySelectorAll(".aba").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".aba")
      .forEach((b) => b.classList.remove("ativa"));

    btn.classList.add("ativa");
    abaAtiva = btn.dataset.aba;

    renderizarEventos();
  });
});

/* =========================
   CATEGORIAS
========================= */
const selectCategoria = document.getElementById("categoria");

const categorias = [
  { value: "aniversario", label: "Aniversário" },
  { value: "eventos", label: "Eventos" },
  { value: "reuniao", label: "Reunião" },
  { value: "resposta_mp", label: "Resposta ao MP" },
  { value: "alerta", label: "Alerta" },
  { value: "audiencias", label: "Audiências" },
  { value: "outros", label: "Outros" },
];

function carregarCategorias() {
  selectCategoria.innerHTML = `<option value="">Selecione</option>`;
  categorias.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.value;
    option.textContent = cat.label;
    selectCategoria.appendChild(option);
  });
}

carregarCategorias();

function getCategoriaLabel(value) {
  const cat = categorias.find((c) => c.value === value);
  return cat ? cat.label : "-";
}

/* =========================
   ELEMENTOS
========================= */
const form = document.getElementById("formEvento");
const tbody = document.querySelector("#tabelaEventos tbody");

const btnCadastrar = document.getElementById("btnCadastrarEvento");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicaoEvento");
const botoesEdicao = document.getElementById("botoesEdicaoEvento");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicaoEvento");
const msgEdicao = document.getElementById("msgEdicao");

/* =========================
   FIREBASE
========================= */
const eventosRef = ref(rtdb, "eventos");

/* =========================
   CADASTRO
========================= */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (editando) return;

  const titulo = tituloInput().value;
  const data = dataInput().value;
  const categoria = categoriaInput().value;
  const descricao = descricaoInput().value;

  if (!titulo || !data || !categoria) {
    alert("Preencha título, data e categoria!");
    return;
  }

  await push(eventosRef, {
    titulo,
    data,
    categoria,
    descricao,
    concluido: false,
  });

  form.reset();
});

/* =========================
   LISTENER FIREBASE
========================= */
onValue(eventosRef, (snap) => {
  if (!snap.exists()) {
    eventosCache = [];
    renderizarEventos();
    return;
  }

  eventosCache = Object.entries(snap.val())
    .map(([key, val]) => ({ ...val, _key: key }))
    .sort((a, b) => a.data.localeCompare(b.data));

  renderizarEventos();
});

/* =========================
   RENDERIZAÇÃO
========================= */
function renderizarEventos() {
  tbody.innerHTML = "";

  if (eventosCache.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;">
          Nenhum evento cadastrado
        </td>
      </tr>
    `;
    return;
  }

  let exibiu = false;

  eventosCache.forEach((e) => {
    const isConcluido = Boolean(e.concluido);

    if (
      (abaAtiva === "futuros" && isConcluido) ||
      (abaAtiva === "concluidos" && !isConcluido)
    ) {
      return;
    }

    exibiu = true;

    const tr = document.createElement("tr");

    tr.appendChild(td(formatarData(e.data)));
    tr.appendChild(td(e.titulo));
    tr.appendChild(td(getCategoriaLabel(e.categoria)));
    tr.appendChild(td(e.descricao || "-"));

    const tdStatus = document.createElement("td");
    tdStatus.style.textAlign = "center";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isConcluido;
    checkbox.style.width = "18px";
    checkbox.style.height = "18px";

    checkbox.onchange = () => alternarStatusEvento(e._key, checkbox.checked);

    tdStatus.appendChild(checkbox);
    tr.appendChild(tdStatus);

    const tdAcoes = document.createElement("td");
    tdAcoes.innerHTML = `
      <button class="edit-btn">
        <span class="material-symbols-outlined">edit_square</span>
      </button>
      <button class="cancel-btn">
        <span class="material-symbols-outlined">delete</span>
      </button>
    `;

    tdAcoes.querySelector(".edit-btn").onclick = () => editarEvento(e);
    tdAcoes.querySelector(".cancel-btn").onclick = () => excluirEvento(e);

    tr.appendChild(tdAcoes);
    tbody.appendChild(tr);
  });

  if (!exibiu) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;">
          Nenhum evento nesta aba
        </td>
      </tr>
    `;
  }
}

/* =========================
   AÇÕES
========================= */
function editarEvento(e) {
  editando = true;
  chaveEdicao = e._key;

  tituloInput().value = e.titulo;
  dataInput().value = e.data;
  categoriaInput().value = e.categoria;
  descricaoInput().value = e.descricao || "";

  btnCadastrar.style.display = "none";
  botoesEdicao.style.display = "flex";
  msgEdicao.style.display = "block";
  msgEdicao.textContent = `✏️ Editando evento de ${formatarData(e.data)}`;
}

btnSalvarEdicao.addEventListener("click", async () => {
  if (!editando || !chaveEdicao) return;

  await update(ref(rtdb, `eventos/${chaveEdicao}`), {
    titulo: tituloInput().value,
    data: dataInput().value,
    categoria: categoriaInput().value,
    descricao: descricaoInput().value,
  });

  resetarFormulario();
});

function excluirEvento(e) {
  if (!confirm("Deseja excluir este evento?")) return;
  remove(ref(rtdb, `eventos/${e._key}`));
}

function alternarStatusEvento(key, status) {
  update(ref(rtdb, `eventos/${key}`), { concluido: status });
}

/* =========================
   RESET
========================= */
btnCancelarEdicao.addEventListener("click", resetarFormulario);

function resetarFormulario() {
  editando = false;
  chaveEdicao = null;
  form.reset();
  btnCadastrar.style.display = "block";
  botoesEdicao.style.display = "none";
  msgEdicao.style.display = "none";
}

/* =========================
   UTIL
========================= */
function formatarData(iso) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function td(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}

const tituloInput = () => document.getElementById("titulo");
const dataInput = () => document.getElementById("data");
const categoriaInput = () => document.getElementById("categoria");
const descricaoInput = () => document.getElementById("descricao");
