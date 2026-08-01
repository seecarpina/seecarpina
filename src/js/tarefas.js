import { auth, rtdb } from "./firebaseConfig.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  ref,
  push,
  onValue,
  update,
  remove,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const formTarefa = document.getElementById("formTarefa");
const inputTitulo = document.getElementById("tituloTarefa");
const btnAdicionar = document.getElementById("btnAdicionarTarefa");
const listaTarefas = document.getElementById("listaTarefas");
const contadorTarefas = document.getElementById("contadorTarefas");
const botoesFiltro = document.querySelectorAll(".filtro-tarefa");
const inputPrazo = document.getElementById("prazoTarefa");
const selectPrioridade = document.getElementById("prioridadeTarefa");

let usuarioAtual = null;
let tarefas = [];
let filtroAtual = "todas";
let pararEscutaTarefas = null;

// ==========================================
// IDENTIFICAR USUÁRIO LOGADO
// ==========================================

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "./login";
    return;
  }

  usuarioAtual = user;
  iniciarEscutaTarefas();
});

// ==========================================
// CARREGAR TAREFAS DO USUÁRIO
// ==========================================

function iniciarEscutaTarefas() {
  if (!usuarioAtual) return;

  if (typeof pararEscutaTarefas === "function") {
    pararEscutaTarefas();
  }

  const tarefasRef = ref(rtdb, `tarefas/${usuarioAtual.uid}`);

  pararEscutaTarefas = onValue(
    tarefasRef,
    (snapshot) => {
      tarefas = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([id, dados]) => ({
            id,
            ...dados,
          }))
        : [];

      tarefas.sort((a, b) => {
        if (a.concluida !== b.concluida) {
          return Number(a.concluida) - Number(b.concluida);
        }

        const pesosPrioridade = {
          alta: 3,
          media: 2,
          baixa: 1,
        };

        const prioridadeA = pesosPrioridade[a.prioridade] || 2;
        const prioridadeB = pesosPrioridade[b.prioridade] || 2;

        if (prioridadeA !== prioridadeB) {
          return prioridadeB - prioridadeA;
        }

        if (a.prazo && b.prazo) {
          return a.prazo.localeCompare(b.prazo);
        }

        if (a.prazo) return -1;
        if (b.prazo) return 1;

        return (b.criadaEm || 0) - (a.criadaEm || 0);
      });

      renderizarTarefas();
    },
    (erro) => {
      console.error("Erro ao carregar tarefas:", erro);

      listaTarefas.innerHTML = `
        <div class="tarefas-vazio">
          Não foi possível carregar as tarefas.
        </div>
      `;

      notificar("Erro ao carregar tarefas.", "erro");
    },
  );
}

// ==========================================
// CADASTRAR NOVA TAREFA
// ==========================================

formTarefa.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!usuarioAtual) {
    notificar("Usuário não identificado.", "erro");
    return;
  }

  const titulo = inputTitulo.value.trim();

  if (!titulo) {
    notificar("Digite uma tarefa.", "erro");
    inputTitulo.focus();
    return;
  }

  bloquearCadastro(true);

  try {
    await push(ref(rtdb, `tarefas/${usuarioAtual.uid}`), {
      titulo,
      prazo: inputPrazo.value || null,
      prioridade: selectPrioridade.value,
      concluida: false,
      criadaEm: serverTimestamp(),
      atualizadaEm: serverTimestamp(),
    });

    formTarefa.reset();
    selectPrioridade.value = "media";
    inputTitulo.focus();

    notificar("Tarefa adicionada.");
  } catch (erro) {
    console.error("Erro ao cadastrar tarefa:", erro);
    notificar("Erro ao adicionar tarefa.", "erro");
  } finally {
    bloquearCadastro(false);
  }
});

// ==========================================
// FILTRAR TAREFAS
// ==========================================

botoesFiltro.forEach((botao) => {
  botao.addEventListener("click", () => {
    filtroAtual = botao.dataset.filtro;

    botoesFiltro.forEach((item) => {
      item.classList.toggle("ativo", item === botao);
    });

    renderizarTarefas();
  });
});

// ==========================================
// MARCAR COMO CONCLUÍDA OU EM ABERTO
// ==========================================

listaTarefas.addEventListener("change", async (event) => {
  const checkbox = event.target.closest(".checkbox-tarefa");

  if (!checkbox || !usuarioAtual) return;

  const id = checkbox.dataset.id;
  const tarefa = tarefas.find((item) => item.id === id);

  if (!tarefa) return;

  checkbox.disabled = true;

  try {
    await update(ref(rtdb, `tarefas/${usuarioAtual.uid}/${id}`), {
      concluida: checkbox.checked,
      concluidaEm: checkbox.checked ? serverTimestamp() : null,
      atualizadaEm: serverTimestamp(),
    });
  } catch (erro) {
    console.error("Erro ao atualizar tarefa:", erro);

    checkbox.checked = Boolean(tarefa.concluida);
    checkbox.disabled = false;

    notificar("Erro ao atualizar tarefa.", "erro");
  }
});

// ==========================================
// EXCLUIR TAREFA
// ==========================================

listaTarefas.addEventListener("click", async (event) => {
  const botaoExcluir = event.target.closest(".btn-excluir-tarefa");

  if (!botaoExcluir || !usuarioAtual) return;

  const id = botaoExcluir.dataset.id;
  const tarefa = tarefas.find((item) => item.id === id);

  if (!tarefa) return;

  const confirmou = await window.mostrarConfirmacao({
    titulo: "Excluir tarefa",
    mensagem:
      `Deseja realmente excluir a tarefa ` +
      `"${tarefa.titulo}"?\n\n` +
      "Esta ação não poderá ser desfeita.",
    tipo: "perigo",
    textoConfirmar: "Excluir tarefa",
    textoCancelar: "Cancelar",
  });

  if (!confirmou) return;

  botaoExcluir.disabled = true;

  try {
    await remove(ref(rtdb, `tarefas/${usuarioAtual.uid}/${id}`));

    notificar("Tarefa excluída.");
  } catch (erro) {
    console.error("Erro ao excluir tarefa:", erro);

    botaoExcluir.disabled = false;

    notificar("Erro ao excluir tarefa.", "erro");
  }
});

// ==========================================
// EXIBIR TAREFAS
// ==========================================

function renderizarTarefas() {
  const abertas = tarefas.filter((tarefa) => !tarefa.concluida).length;
  const concluidas = tarefas.length - abertas;

  contadorTarefas.textContent =
    `${abertas} em aberto • ` +
    `${concluidas} concluída${concluidas === 1 ? "" : "s"}`;

  const tarefasFiltradas = tarefas.filter((tarefa) => {
    if (filtroAtual === "abertas") {
      return !tarefa.concluida;
    }

    if (filtroAtual === "concluidas") {
      return tarefa.concluida;
    }

    return true;
  });

  if (!tarefasFiltradas.length) {
    const mensagens = {
      todas: "Você ainda não cadastrou nenhuma tarefa.",
      abertas: "Nenhuma tarefa em aberto.",
      concluidas: "Nenhuma tarefa concluída.",
    };

    listaTarefas.innerHTML = `
      <div class="tarefas-vazio">
        ${mensagens[filtroAtual]}
      </div>
    `;

    return;
  }

  listaTarefas.innerHTML = tarefasFiltradas
    .map(
      (tarefa) => `
        <article
            class="item-tarefa
                ${tarefa.concluida ? "concluida" : ""}
                prioridade-${tarefa.prioridade || "media"}
                ${estaAtrasada(tarefa) ? "atrasada" : ""}
            "
            >
            <input
                class="checkbox-tarefa"
                type="checkbox"
                data-id="${tarefa.id}"
                aria-label="${
                  tarefa.concluida
                    ? "Marcar tarefa como não concluída"
                    : "Marcar tarefa como concluída"
                }"
                ${tarefa.concluida ? "checked" : ""}
            />

            <div class="tarefa-conteudo">
                <span class="tarefa-titulo">
                ${escaparHtml(tarefa.titulo)}
                </span>

                <div class="tarefa-informacoes">
                <span class="prioridade-badge prioridade-${tarefa.prioridade || "media"}">
                    ${formatarPrioridade(tarefa.prioridade)}
                </span>

                ${
                  tarefa.prazo
                    ? `
                        <small class="tarefa-prazo">
                        ${estaAtrasada(tarefa) ? "⚠️ Atrasada: " : "📅 Prazo: "}
                        ${formatarPrazo(tarefa.prazo)}
                        </small>
                    `
                    : ""
                }
                </div>

                <small class="tarefa-data">
                Criada em ${formatarData(tarefa.criadaEm)}
                </small>
            </div>

            <button
                class="btn-excluir-tarefa"
                type="button"
                data-id="${tarefa.id}"
                title="Excluir tarefa"
                aria-label="Excluir tarefa"
            >
                <span class="material-symbols-outlined">
                delete
                </span>
            </button>
            </article>
      `,
    )
    .join("");
}

// ==========================================
// BLOQUEAR BOTÃO DURANTE O CADASTRO
// ==========================================

function bloquearCadastro(bloquear) {
  inputTitulo.disabled = bloquear;
  btnAdicionar.disabled = bloquear;

  btnAdicionar.innerHTML = bloquear
    ? `
      <span class="material-symbols-outlined">
        hourglass_top
      </span>
      Salvando...
    `
    : `
      <span class="material-symbols-outlined">
        add_task
      </span>
      Adicionar
    `;
}

// ==========================================
// FORMATAR DATA
// ==========================================

function formatarData(timestamp) {
  if (!timestamp || typeof timestamp !== "number") {
    return "agora";
  }

  return new Date(timestamp).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ==========================================
// EVITAR INSERÇÃO DE HTML NO TÍTULO
// ==========================================

function escaparHtml(texto) {
  const div = document.createElement("div");

  div.textContent = texto ?? "";

  return div.innerHTML;
}

// ==========================================
// NOTIFICAÇÕES
// ==========================================

function notificar(mensagem, tipo = "sucesso") {
  if (typeof window.mostrarNotificacao === "function") {
    window.mostrarNotificacao(mensagem, tipo);
    return;
  }

  alert(mensagem);
}

function formatarPrioridade(prioridade) {
  const nomes = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
  };

  return nomes[prioridade] || "Média";
}

function formatarPrazo(dataISO) {
  if (!dataISO) return "";

  const [ano, mes, dia] = dataISO.split("-");

  return `${dia}/${mes}/${ano}`;
}

function estaAtrasada(tarefa) {
  if (!tarefa.prazo || tarefa.concluida) {
    return false;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const prazo = new Date(`${tarefa.prazo}T00:00:00`);

  return prazo < hoje;
}
