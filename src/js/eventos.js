import { rtdb, auth } from "./firebaseConfig.js";

import {
  ref,
  push,
  onValue,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

/* =========================
   CONTROLE
========================= */
let editando = false;
let chaveEdicao = null;

/* =========================
   CATEGORIAS DOS EVENTOS
========================= */

const selectCategoria = document.getElementById("categoria");

const categorias = [
  { value: "aniversario", label: "Aniversário" },
  { value: "eventos", label: "Eventos" },
  { value: "reuniao", label: "Reunião" },
  { value: "resposta_mp", label: "Resposta ao MP" },
  { value: "alerta", label: "Alerta" },
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
   LOADING
========================= */
tbody.innerHTML = `
  <tr>
    <td colspan="5" style="text-align:center;">
      <svg class="svg-spinner" viewBox="0 0 50 50">
        <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4"/>
      </svg>
    </td>
  </tr>
`;

/* =========================
   CADASTRO
========================= */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (editando) return;

  const titulo = document.getElementById("titulo").value.trim();
  const data = document.getElementById("data").value;
  const descricao = document.getElementById("descricao").value.trim();
  const categoria = document.getElementById("categoria").value;

  if (!titulo || !data || !categoria) {
    mostrarNotificacao("Preencha título, data e categoria!", "erro");
    return;
  }

  try {
    await push(eventosRef, {
      titulo,
      data,
      categoria,
      descricao,
    });

    mostrarNotificacao("Evento cadastrado com sucesso!");
    form.reset();
  } catch {
    mostrarNotificacao("Erro ao cadastrar evento!", "erro");
  }
});

/* =========================
   SALVAR EDIÇÃO
========================= */
btnSalvarEdicao.addEventListener("click", async () => {
  if (!editando || !chaveEdicao) return;

  const titulo = document.getElementById("titulo").value.trim();
  const data = document.getElementById("data").value;
  const categoria = document.getElementById("categoria").value;
  const descricao = document.getElementById("descricao").value.trim();

  if (!titulo || !data) {
    mostrarNotificacao("Preencha título e data!", "erro");
    return;
  }

  try {
    await update(ref(rtdb, `eventos/${chaveEdicao}`), {
      titulo,
      data,
      categoria,
      descricao,
    });

    mostrarNotificacao("Evento atualizado com sucesso!");
    resetarFormularioEdicao();
  } catch {
    mostrarNotificacao("Erro ao salvar edição!", "erro");
  }
});

/* =========================
   LISTAGEM
========================= */
onValue(eventosRef, (snap) => {
  tbody.innerHTML = "";

  const eventosPorData = {};

  if (!snap.exists()) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;">
          Nenhum evento cadastrado
        </td>
      </tr>
    `;

    // 🔔 informa calendário global
    window.dispatchEvent(new CustomEvent("eventosAtualizados", { detail: {} }));
    return;
  }

  const eventos = Object.entries(snap.val())
    .map(([key, val]) => ({ ...val, _key: key }))
    .sort((a, b) => a.data.localeCompare(b.data));

  eventos.forEach((e) => {
    if (!eventosPorData[e.data]) {
      eventosPorData[e.data] = [];
    }

    eventosPorData[e.data].push({
      titulo: e.titulo,
    });

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatarData(e.data)}</td>
      <td>${e.titulo}</td>
      <td>${getCategoriaLabel(e.categoria)}</td>
      <td>${e.descricao || "-"}</td>
      <td>
        <button class="edit-btn">
          <span class="material-symbols-outlined">edit_square</span>
        </button>
        <button class="cancel-btn">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </td>
    `;

    tr.querySelector(".edit-btn").onclick = () => editarEvento(e);
    tr.querySelector(".cancel-btn").onclick = () => excluirEvento(e);

    tbody.appendChild(tr);
  });
});

/* =========================
   AÇÕES
========================= */
function editarEvento(e) {
  editando = true;
  chaveEdicao = e._key;

  document.getElementById("titulo").value = e.titulo;
  document.getElementById("data").value = e.data;
  document.getElementById("categoria").value = e.categoria || "";
  document.getElementById("descricao").value = e.descricao ?? "";

  btnCadastrar.style.display = "none";
  botoesEdicao.style.display = "flex";

  msgEdicao.textContent = `✏️ Editando evento de ${formatarData(e.data)}`;
  msgEdicao.style.display = "block";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function excluirEvento(e) {
  if (!confirm("Deseja excluir este evento?")) return;

  remove(ref(rtdb, `eventos/${e._key}`))
    .then(() => mostrarNotificacao("Evento excluído com sucesso!"))
    .catch(() => mostrarNotificacao("Erro ao excluir evento!", "erro"));
}

/* =========================
   RESET
========================= */
btnCancelarEdicao.addEventListener("click", resetarFormularioEdicao);

function resetarFormularioEdicao() {
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
