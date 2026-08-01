import { rtdb } from "./firebaseConfig.js";

import {
  ref,
  push,
  onValue,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* =========================================
   CONTROLE
========================================= */

let editando = false;
let chaveEdicao = null;
let abaAtiva = "futuros";
let eventosCache = [];

/* =========================================
   ELEMENTOS
========================================= */

const form = document.getElementById("formEvento");
const listaEventos = document.getElementById("listaEventos");
const contadorEventos = document.getElementById("contadorEventos");

const btnCadastrar = document.getElementById("btnCadastrarEvento");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicaoEvento");
const botoesEdicao = document.getElementById("botoesEdicaoEvento");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicaoEvento");
const msgEdicao = document.getElementById("msgEdicao");

const selectCategoria = document.getElementById("categoria");

/* =========================================
   FIREBASE
========================================= */

const eventosRef = ref(rtdb, "eventos");

/* =========================================
   CATEGORIAS
========================================= */

const categorias = [
  {
    value: "aniversario",
    label: "Aniversário",
    icone: "cake",
  },
  {
    value: "eventos",
    label: "Evento",
    icone: "event",
  },
  {
    value: "reuniao",
    label: "Reunião",
    icone: "groups",
  },
  {
    value: "resposta_mp",
    label: "Resposta ao MP",
    icone: "gavel",
  },
  {
    value: "alerta",
    label: "Alerta",
    icone: "warning",
  },
  {
    value: "audiencias",
    label: "Audiência",
    icone: "record_voice_over",
  },
  {
    value: "outros",
    label: "Outros",
    icone: "calendar_month",
  },
];

function carregarCategorias() {
  selectCategoria.innerHTML = `
    <option value="">Selecione</option>
  `;

  categorias.forEach((categoria) => {
    const option = document.createElement("option");

    option.value = categoria.value;
    option.textContent = categoria.label;

    selectCategoria.appendChild(option);
  });
}

function getCategoria(value) {
  return (
    categorias.find((categoria) => categoria.value === value) || {
      value: "outros",
      label: "Outros",
      icone: "calendar_month",
    }
  );
}

carregarCategorias();

/* =========================================
   ABAS
========================================= */

document.querySelectorAll(".aba").forEach((botao) => {
  botao.addEventListener("click", () => {
    document.querySelectorAll(".aba").forEach((item) => {
      item.classList.remove("ativa");
    });

    botao.classList.add("ativa");
    abaAtiva = botao.dataset.aba;

    renderizarEventos();
  });
});

/* =========================================
   CADASTRO
========================================= */

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (editando) return;

  const titulo = tituloInput().value.trim();
  const data = dataInput().value;
  const categoria = categoriaInput().value;
  const descricao = descricaoInput().value.trim();

  if (!titulo || !data || !categoria) {
    notificar("Preencha o título, a data e a categoria.", "erro");
    return;
  }

  bloquearCadastro(true);

  try {
    await push(eventosRef, {
      titulo,
      data,
      categoria,
      descricao,
      concluido: false,
      criadoEm: Date.now(),
    });

    form.reset();
    tituloInput().focus();

    notificar("Evento cadastrado com sucesso.");

    if (typeof confetti === "function") {
      confetti();
    }
  } catch (erro) {
    console.error("Erro ao cadastrar evento:", erro);
    notificar("Erro ao cadastrar evento.", "erro");
  } finally {
    bloquearCadastro(false);
  }
});

/* =========================================
   CARREGAR EVENTOS
========================================= */

onValue(
  eventosRef,
  (snapshot) => {
    eventosCache = snapshot.exists()
      ? Object.entries(snapshot.val()).map(([key, dados]) => ({
          ...dados,
          _key: key,
        }))
      : [];

    eventosCache.sort((a, b) => {
      if (a.concluido !== b.concluido) {
        return Number(a.concluido) - Number(b.concluido);
      }

      return (a.data || "").localeCompare(b.data || "");
    });

    renderizarEventos();
    atualizarCalendarioGlobal();
  },
  (erro) => {
    console.error("Erro ao carregar eventos:", erro);

    listaEventos.innerHTML = `
      <div class="eventos-vazio">
        Não foi possível carregar os eventos.
      </div>
    `;
  },
);

/* =========================================
   RENDERIZAÇÃO
========================================= */

function renderizarEventos() {
  const futuros = eventosCache.filter((evento) => !evento.concluido);

  const concluidos = eventosCache.filter((evento) => evento.concluido);

  if (contadorEventos) {
    contadorEventos.textContent =
      `${futuros.length} futuro${futuros.length === 1 ? "" : "s"} • ` +
      `${concluidos.length} concluído${concluidos.length === 1 ? "" : "s"}`;
  }

  const eventosFiltrados = eventosCache.filter((evento) => {
    if (abaAtiva === "concluidos") {
      return Boolean(evento.concluido);
    }

    return !evento.concluido;
  });

  if (!eventosFiltrados.length) {
    listaEventos.innerHTML = `
      <div class="eventos-vazio">
        ${
          abaAtiva === "concluidos"
            ? "Nenhum evento concluído."
            : "Nenhum evento futuro."
        }
      </div>
    `;

    return;
  }

  listaEventos.innerHTML = eventosFiltrados
    .map((evento) => criarCardEvento(evento))
    .join("");
}

function criarCardEvento(evento) {
  const categoria = getCategoria(evento.categoria);
  const data = separarData(evento.data);

  return `
    <article
      class="
        card-evento
        categoria-${escaparClasse(categoria.value)}
        ${evento.concluido ? "concluido" : ""}
        ${eventoAtrasado(evento) ? "atrasado" : ""}
      "
      data-id="${evento._key}"
    >
      <div class="evento-data-bloco">
        <span class="evento-dia">${data.dia}</span>
        <span class="evento-mes">${data.mes}</span>
        <span class="evento-ano">${data.ano}</span>
      </div>

      <div class="evento-conteudo">
        <div class="evento-cabecalho">
          <div>
            <span
              class="
                evento-categoria
                categoria-${escaparClasse(categoria.value)}
              "
            >
              <span class="material-symbols-outlined">
                ${categoria.icone}
              </span>

              ${escaparHtml(categoria.label)}
            </span>

            <h3 class="evento-titulo">
              ${escaparHtml(evento.titulo)}
            </h3>
          </div>

          <label
            class="evento-status"
            title="${
              evento.concluido ? "Marcar como futuro" : "Marcar como concluído"
            }"
          >
            <input
              type="checkbox"
              class="checkbox-evento"
              data-id="${evento._key}"
              ${evento.concluido ? "checked" : ""}
            />

            <span class="material-symbols-outlined">
              ${evento.concluido ? "task_alt" : "radio_button_unchecked"}
            </span>
          </label>
        </div>

        ${
          evento.descricao
            ? `
              <p class="evento-descricao">
                ${escaparHtml(evento.descricao)}
              </p>
            `
            : `
              <p class="evento-descricao sem-descricao">
                Sem descrição.
              </p>
            `
        }

        <div class="evento-rodape">
          <div class="evento-data-completa">
            <span class="material-symbols-outlined">
              calendar_today
            </span>

            ${formatarDataCompleta(evento.data)}

            ${
              eventoAtrasado(evento)
                ? `
                  <span class="evento-atrasado">
                    Evento atrasado
                  </span>
                `
                : ""
            }
          </div>

          <div class="evento-acoes">
            <button
              type="button"
              class="btn-editar-evento"
              data-id="${evento._key}"
              title="Editar evento"
              aria-label="Editar evento"
            >
              <span class="material-symbols-outlined">
                edit_square
              </span>
            </button>

            <button
              type="button"
              class="btn-excluir-evento"
              data-id="${evento._key}"
              title="Excluir evento"
              aria-label="Excluir evento"
            >
              <span class="material-symbols-outlined">
                delete
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

/* =========================================
   EVENTOS DOS CARDS
========================================= */

listaEventos.addEventListener("change", async (event) => {
  const checkbox = event.target.closest(".checkbox-evento");

  if (!checkbox) return;

  const id = checkbox.dataset.id;
  const evento = eventosCache.find((item) => item._key === id);

  if (!evento) return;

  checkbox.disabled = true;

  try {
    await alternarStatusEvento(id, checkbox.checked);
  } catch (erro) {
    console.error("Erro ao atualizar evento:", erro);

    checkbox.checked = Boolean(evento.concluido);
    checkbox.disabled = false;

    notificar("Erro ao atualizar evento.", "erro");
  }
});

listaEventos.addEventListener("click", (event) => {
  const botaoEditar = event.target.closest(".btn-editar-evento");
  const botaoExcluir = event.target.closest(".btn-excluir-evento");

  if (botaoEditar) {
    const evento = localizarEvento(botaoEditar.dataset.id);

    if (evento) {
      editarEvento(evento);
    }

    return;
  }

  if (botaoExcluir) {
    const evento = localizarEvento(botaoExcluir.dataset.id);

    if (evento) {
      excluirEvento(evento);
    }
  }
});

/* =========================================
   EDIÇÃO
========================================= */

function editarEvento(evento) {
  editando = true;
  chaveEdicao = evento._key;

  tituloInput().value = evento.titulo || "";
  dataInput().value = evento.data || "";
  categoriaInput().value = evento.categoria || "";
  descricaoInput().value = evento.descricao || "";

  btnCadastrar.style.display = "none";
  botoesEdicao.style.display = "flex";

  msgEdicao.style.display = "block";
  msgEdicao.textContent = `✏️ Editando evento de ${formatarData(evento.data)}`;

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  tituloInput().focus();
}

btnSalvarEdicao.addEventListener("click", async () => {
  if (!editando || !chaveEdicao) {
    notificar("Evento não localizado.", "erro");
    return;
  }

  const titulo = tituloInput().value.trim();
  const data = dataInput().value;
  const categoria = categoriaInput().value;
  const descricao = descricaoInput().value.trim();

  if (!titulo || !data || !categoria) {
    notificar("Preencha o título, a data e a categoria.", "erro");
    return;
  }

  btnSalvarEdicao.disabled = true;

  try {
    await update(ref(rtdb, `eventos/${chaveEdicao}`), {
      titulo,
      data,
      categoria,
      descricao,
      atualizadoEm: Date.now(),
    });

    notificar("Evento atualizado com sucesso.");
    resetarFormulario();
  } catch (erro) {
    console.error("Erro ao editar evento:", erro);
    notificar("Erro ao salvar a edição.", "erro");
  } finally {
    btnSalvarEdicao.disabled = false;
  }
});

/* =========================================
   EXCLUSÃO
========================================= */

async function excluirEvento(evento) {
  const confirmou = await window.mostrarConfirmacao({
    titulo: "Excluir evento",
    mensagem:
      `Deseja realmente excluir o evento ` +
      `"${evento.titulo}"?\n\n` +
      "Esta ação não poderá ser desfeita.",
    tipo: "perigo",
    textoConfirmar: "Excluir evento",
    textoCancelar: "Cancelar",
  });

  if (!confirmou) return;

  try {
    await remove(ref(rtdb, `eventos/${evento._key}`));

    notificar("Evento excluído.");
  } catch (erro) {
    console.error("Erro ao excluir evento:", erro);
    notificar("Erro ao excluir evento.", "erro");
  }
}

/* =========================================
   STATUS
========================================= */

async function alternarStatusEvento(key, status) {
  await update(ref(rtdb, `eventos/${key}`), {
    concluido: status,
    concluidoEm: status ? Date.now() : null,
    atualizadoEm: Date.now(),
  });
}

/* =========================================
   RESET
========================================= */

btnCancelarEdicao.addEventListener("click", resetarFormulario);

function resetarFormulario() {
  editando = false;
  chaveEdicao = null;

  form.reset();

  btnCadastrar.style.display = "block";
  botoesEdicao.style.display = "none";

  msgEdicao.style.display = "none";
  msgEdicao.textContent = "";

  tituloInput().focus();
}

/* =========================================
   CALENDÁRIO GLOBAL
========================================= */

function atualizarCalendarioGlobal() {
  const eventosPorData = {};

  eventosCache.forEach((evento) => {
    if (!evento.data) return;

    if (!eventosPorData[evento.data]) {
      eventosPorData[evento.data] = [];
    }

    eventosPorData[evento.data].push(evento);
  });

  window.dispatchEvent(
    new CustomEvent("eventosAtualizados", {
      detail: eventosPorData,
    }),
  );
}

/* =========================================
   UTILITÁRIOS
========================================= */

function bloquearCadastro(bloquear) {
  btnCadastrar.disabled = bloquear;

  if (btnCadastrar.tagName === "INPUT") {
    btnCadastrar.value = bloquear ? "Salvando..." : "Salvar evento";
  } else {
    btnCadastrar.textContent = bloquear ? "Salvando..." : "Salvar evento";
  }
}

function localizarEvento(id) {
  return eventosCache.find((evento) => evento._key === id);
}

function separarData(dataISO) {
  if (!dataISO) {
    return {
      dia: "--",
      mes: "---",
      ano: "----",
    };
  }

  const [ano, mes, dia] = dataISO.split("-");

  const meses = [
    "JAN",
    "FEV",
    "MAR",
    "ABR",
    "MAI",
    "JUN",
    "JUL",
    "AGO",
    "SET",
    "OUT",
    "NOV",
    "DEZ",
  ];

  return {
    dia,
    mes: meses[Number(mes) - 1] || "---",
    ano,
  };
}

function formatarData(dataISO) {
  if (!dataISO) return "-";

  const [ano, mes, dia] = dataISO.split("-");

  return `${dia}/${mes}/${ano}`;
}

function formatarDataCompleta(dataISO) {
  if (!dataISO) return "-";

  const data = new Date(`${dataISO}T00:00:00`);

  return data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function eventoAtrasado(evento) {
  if (!evento.data || evento.concluido) {
    return false;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataEvento = new Date(`${evento.data}T00:00:00`);

  return dataEvento < hoje;
}

function escaparHtml(texto) {
  const elemento = document.createElement("div");

  elemento.textContent = texto ?? "";

  return elemento.innerHTML;
}

function escaparClasse(texto) {
  return String(texto || "outros").replace(/[^a-zA-Z0-9_-]/g, "");
}

function notificar(mensagem, tipo = "sucesso") {
  if (typeof window.mostrarNotificacao === "function") {
    window.mostrarNotificacao(mensagem, tipo);
    return;
  }

  alert(mensagem);
}

/* =========================================
   INPUTS
========================================= */

const tituloInput = () => document.getElementById("titulo");
const dataInput = () => document.getElementById("data");
const categoriaInput = () => document.getElementById("categoria");
const descricaoInput = () => document.getElementById("descricao");
