import { rtdb } from "./firebaseConfig.js";

import {
  ref,
  push,
  onValue,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* =========================================
   REFERÊNCIAS
========================================= */

const escolasRef = ref(rtdb, "escolas");

const locaisRef = ref(rtdb, "servidores/locaisExercicio");

const servidoresRef = ref(rtdb, "servidores/registros");

const turmasRef = ref(rtdb, "turmas");

/* =========================================
   ELEMENTOS
========================================= */

const formEscola = document.getElementById("formEscola");

const inputLocalExercicio = document.getElementById("localExercicio");

const boxLocalExercicio = document.getElementById("autocompleteLocalExercicio");

const inputCodigoInep = document.getElementById("codigoInep");

const inputEndereco = document.getElementById("endereco");

const inputGestor = document.getElementById("gestor");

const boxGestor = document.getElementById("autocompleteGestor");

const inputSecretario = document.getElementById("secretario");

const boxSecretario = document.getElementById("autocompleteSecretario");

const inputCoordenador = document.getElementById("coordenadorSelect");

const boxCoordenador = document.getElementById("autocompleteCoordenador");

const btnAdicionarCoordenador = document.getElementById(
  "btnAdicionarCoordenador",
);

const listaCoordenadoresSelecionados = document.getElementById(
  "listaCoordenadoresSelecionados",
);

const modalidadeCreche = document.getElementById("modalidadeCreche");

const modalidadeEducacaoInfantil = document.getElementById(
  "modalidadeEducacaoInfantil",
);

const modalidadeFundamentalI = document.getElementById(
  "modalidadeFundamentalI",
);

const modalidadeFundamentalII = document.getElementById(
  "modalidadeFundamentalII",
);

const modalidadeEja = document.getElementById("modalidadeEja");

const btnSalvarEscola = document.getElementById("btnSalvarEscola");

const btnCancelarEdicaoEscola = document.getElementById(
  "btnCancelarEdicaoEscola",
);

const tituloFormularioEscola = document.getElementById(
  "tituloFormularioEscola",
);

const msgEdicaoEscola = document.getElementById("msgEdicaoEscola");

const listaEscolas = document.getElementById("listaEscolas");

const contadorEscolas = document.getElementById("contadorEscolas");

const inputBusca = document.getElementById("buscaEscolas");

const btnExportarExcel = document.getElementById("btnExportarExcel");

/* =========================================
   ELEMENTOS - TURMAS
========================================= */

const selectEscolaTurmas = document.getElementById("escolaTurmas");

const btnNovaTurma = document.getElementById("btnNovaTurma");

const resumoTurmasEscola = document.getElementById("resumoTurmasEscola");

const nomeEscolaTurmas = document.getElementById("nomeEscolaTurmas");

const contadorTurmasEscola = document.getElementById("contadorTurmasEscola");

const listaTurmasEscola = document.getElementById("listaTurmasEscola");

const formularioTurmaContainer = document.getElementById(
  "formularioTurmaContainer",
);

const formTurma = document.getElementById("formTurma");

const tituloFormularioTurma = document.getElementById("tituloFormularioTurma");

const inputNomeTurma = document.getElementById("nomeTurma");

const selectTurnoTurma = document.getElementById("turnoTurma");

const inputQuantidadeAlunosTurma = document.getElementById(
  "quantidadeAlunosTurma",
);

const selectProfessorTurma = document.getElementById("professorTurma");

const btnAdicionarProfessorTurma = document.getElementById(
  "btnAdicionarProfessorTurma",
);

const listaProfessoresTurma = document.getElementById("listaProfessoresTurma");

const msgEdicaoTurma = document.getElementById("msgEdicaoTurma");

const btnCancelarTurma = document.getElementById("btnCancelarTurma");

/* =========================================
   ABAS
========================================= */

const botoesAbas = document.querySelectorAll(".escolas-tab");

const conteudosAbas = document.querySelectorAll(".escolas-tab-content");

/* =========================================
   ESTADO
========================================= */

let escolas = [];
let locais = [];
let servidores = [];
let turmas = [];

let localExercicioIdSelecionado = null;
let gestorIdSelecionado = null;
let secretarioIdSelecionado = null;
let coordenadorIdSelecionado = null;

let coordenadoresSelecionados = [];

let editando = false;
let chaveEdicao = null;

let escolaTurmasIdSelecionada = null;

let professoresTurmaSelecionados = [];

let editandoTurma = false;
let chaveTurmaEdicao = null;

/* =========================================
   AUXILIARES
========================================= */

function notificar(mensagem, tipo = "sucesso") {
  if (typeof window.mostrarNotificacao === "function") {
    window.mostrarNotificacao(mensagem, tipo);

    return;
  }

  alert(mensagem);
}

function escaparHtml(texto) {
  const elemento = document.createElement("div");

  elemento.textContent = texto ?? "";

  return elemento.innerHTML;
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function obterGrupoTurma(nomeTurma) {
  const nome = normalizarTexto(nomeTurma);

  if (nome.includes("creche")) {
    return 1;
  }

  if (
    nome.includes("pre ") ||
    nome.startsWith("pre") ||
    nome.includes("pré ") ||
    nome.startsWith("pré")
  ) {
    return 2;
  }

  if (/^\d/.test(nome)) {
    return 3;
  }

  if (nome.includes("eja")) {
    return 4;
  }

  if (nome.includes("aee")) {
    return 5;
  }

  return 6;
}

function compararTurmas(a, b) {
  const grupoA = obterGrupoTurma(a?.nome);
  const grupoB = obterGrupoTurma(b?.nome);

  if (grupoA !== grupoB) {
    return grupoA - grupoB;
  }

  return String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR", {
    sensitivity: "base",
    numeric: true,
  });
}

function mostrarSugestoesAutocomplete(
  input,
  box,
  itens,
  obterNome,
  aoSelecionar,
) {
  if (!input || !box) return;

  const termo = normalizarTexto(input.value);

  box.innerHTML = "";

  if (!termo) {
    box.style.display = "none";
    return;
  }

  const filtrados = itens
    .filter((item) => normalizarTexto(obterNome(item)).includes(termo))
    .slice(0, 10);

  filtrados.forEach((item) => {
    const nome = obterNome(item);

    const li = document.createElement("li");

    li.textContent = nome;

    li.addEventListener("click", () => {
      input.value = nome;

      aoSelecionar(item);

      box.style.display = "none";
    });

    box.appendChild(li);
  });

  box.style.display = filtrados.length ? "block" : "none";
}

function obterNomeLocal(id) {
  if (!id) return "";

  const local = locais.find((item) => item.id === id);

  return local?.nome || "";
}

function obterNomeServidor(id) {
  if (id === null || id === undefined || id === "") {
    return "";
  }

  const servidor = servidores.find((item) => String(item.id) === String(id));

  return servidor?.nome || "";
}

function obterEscolaPorId(escolaId) {
  if (!escolaId) return null;

  return escolas.find((escola) => escola.id === escolaId) || null;
}

function obterServidorPorId(servidorId) {
  if (servidorId === null || servidorId === undefined || servidorId === "") {
    return null;
  }

  return (
    servidores.find(
      (servidor) => String(servidor.id || servidor._key) === String(servidorId),
    ) || null
  );
}

function servidorAtivo(servidor) {
  return normalizarTexto(servidor.situacao) === "ativo";
}

function servidorEhProfessor(servidor) {
  const cargo = normalizarTexto(servidor?.cargo);

  return (
    cargo.includes("professor") ||
    cargo.includes("tutor") ||
    cargo.includes("instrutor de informatica") ||
    cargo.includes("instrutor informatica") ||
    cargo.includes("instrutor de libras") ||
    cargo.includes("instrutor libras") ||
    cargo.includes("estagio") ||
    cargo.includes("estagiario") ||
    cargo.includes("estagiaria")
  );
}

function obterProfessoresDisponiveisDaEscola(escola) {
  if (!escola?.localExercicioId) {
    return [];
  }

  return servidores
    .filter((servidor) => {
      const mesmoLocal =
        String(servidor.localExercicioId || "") ===
        String(escola.localExercicioId || "");

      const professor = servidorEhProfessor(servidor);

      const emSala = servidor.foraSala !== true;

      return mesmoLocal && professor && emSala;
    })
    .sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
        sensitivity: "base",
      }),
    );
}

/* =========================================
   ABRIR ABA
========================================= */

function abrirAbaEscola(idAba) {
  botoesAbas.forEach((botao) => {
    botao.classList.toggle("active", botao.dataset.tab === idAba);
  });

  conteudosAbas.forEach((conteudo) => {
    conteudo.classList.toggle("active", conteudo.id === idAba);
  });
}

botoesAbas.forEach((botao) => {
  botao.addEventListener("click", () => {
    abrirAbaEscola(botao.dataset.tab);
  });
});

/* =========================================
   LOCAIS DE EXERCÍCIO
========================================= */

onValue(locaisRef, (snapshot) => {
  locais = snapshot.exists()
    ? Object.entries(snapshot.val())
        .map(([id, dados]) => ({
          id,

          nome: typeof dados === "string" ? dados : dados?.nome || "",
        }))
        .filter((local) => local.nome)
        .sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR", {
            sensitivity: "base",
          }),
        )
    : [];

  renderEscolas();
  atualizarSelectEscolasTurmas();
});

inputLocalExercicio?.addEventListener("input", () => {
  localExercicioIdSelecionado = null;

  mostrarSugestoesAutocomplete(
    inputLocalExercicio,
    boxLocalExercicio,
    locais,
    (local) => local.nome,
    (local) => {
      localExercicioIdSelecionado = local.id;
    },
  );
});

/* =========================================
   SERVIDORES
========================================= */

onValue(servidoresRef, (snapshot) => {
  servidores = snapshot.exists()
    ? Object.entries(snapshot.val())
        .map(([id, dados]) => ({
          id,
          ...dados,
        }))
        .filter(servidorAtivo)
        .sort((a, b) =>
          (a.nome || "").localeCompare(b.nome || "", "pt-BR", {
            sensitivity: "base",
          }),
        )
    : [];

  renderCoordenadoresSelecionados();

  renderEscolas();
});

inputGestor?.addEventListener("input", () => {
  gestorIdSelecionado = null;

  mostrarSugestoesAutocomplete(
    inputGestor,
    boxGestor,
    servidores,
    (servidor) => servidor.nome || "",
    (servidor) => {
      gestorIdSelecionado = servidor.id;
    },
  );
});

inputSecretario?.addEventListener("input", () => {
  secretarioIdSelecionado = null;

  mostrarSugestoesAutocomplete(
    inputSecretario,
    boxSecretario,
    servidores,
    (servidor) => servidor.nome || "",
    (servidor) => {
      secretarioIdSelecionado = servidor.id;
    },
  );
});

inputCoordenador?.addEventListener("input", () => {
  coordenadorIdSelecionado = null;

  mostrarSugestoesAutocomplete(
    inputCoordenador,
    boxCoordenador,
    servidores,
    (servidor) => servidor.nome || "",
    (servidor) => {
      coordenadorIdSelecionado = servidor.id;
    },
  );
});

/* =========================================
   COORDENADORES
========================================= */

btnAdicionarCoordenador?.addEventListener("click", () => {
  const servidorId = coordenadorIdSelecionado;

  if (!servidorId) {
    notificar("Selecione um coordenador entre as sugestões.", "erro");

    inputCoordenador.focus();

    return;
  }

  if (coordenadoresSelecionados.includes(servidorId)) {
    notificar("Este coordenador já foi adicionado.", "erro");

    return;
  }

  if (servidorId === gestorIdSelecionado) {
    notificar("O gestor não pode ser adicionado como coordenador.", "erro");

    return;
  }

  if (servidorId === secretarioIdSelecionado) {
    notificar("O secretário não pode ser adicionado como coordenador.", "erro");

    return;
  }

  coordenadoresSelecionados.push(servidorId);

  inputCoordenador.value = "";

  coordenadorIdSelecionado = null;

  if (boxCoordenador) {
    boxCoordenador.style.display = "none";
  }

  renderCoordenadoresSelecionados();
});

document.addEventListener("click", (event) => {
  const autocompletes = [
    [inputLocalExercicio, boxLocalExercicio],
    [inputGestor, boxGestor],
    [inputSecretario, boxSecretario],
    [inputCoordenador, boxCoordenador],
  ];

  autocompletes.forEach(([input, box]) => {
    if (
      input &&
      box &&
      !input.contains(event.target) &&
      !box.contains(event.target)
    ) {
      box.style.display = "none";
    }
  });
});

function renderCoordenadoresSelecionados() {
  if (!listaCoordenadoresSelecionados) {
    return;
  }

  listaCoordenadoresSelecionados.innerHTML = "";

  coordenadoresSelecionados.forEach((servidorId) => {
    const nome = obterNomeServidor(servidorId);

    const item = document.createElement("div");

    item.className = "coordenador-selecionado";

    item.innerHTML = `
        <span>
          ${escaparHtml(nome || "Servidor")}
        </span>

        <button
          type="button"
          title="Remover coordenador"
        >
          <span
            class="material-symbols-outlined"
          >
            close
          </span>
        </button>
      `;

    item.querySelector("button")?.addEventListener("click", () => {
      coordenadoresSelecionados = coordenadoresSelecionados.filter(
        (id) => id !== servidorId,
      );

      renderCoordenadoresSelecionados();
    });

    listaCoordenadoresSelecionados.appendChild(item);
  });
}

/* =========================================
   ESCOLAS
========================================= */

onValue(escolasRef, (snapshot) => {
  escolas = snapshot.exists()
    ? Object.entries(snapshot.val()).map(([id, dados]) => ({
        id,
        ...dados,
      }))
    : [];

  renderEscolas();
  atualizarSelectEscolasTurmas();
  renderTurmasEscola();
});

/* =========================================
   CARREGAR TURMAS
========================================= */

onValue(turmasRef, (snapshot) => {
  turmas = snapshot.exists()
    ? Object.entries(snapshot.val()).map(([id, dados]) => ({
        id,
        ...dados,
      }))
    : [];

  renderTurmasEscola();
});

function atualizarSelectEscolasTurmas() {
  if (!selectEscolaTurmas) return;

  const valorAtual = selectEscolaTurmas.value;

  selectEscolaTurmas.innerHTML = `
    <option value="">
      Selecione uma escola
    </option>
  `;

  const escolasOrdenadas = [...escolas].sort((a, b) =>
    obterNomeLocal(a.localExercicioId).localeCompare(
      obterNomeLocal(b.localExercicioId),
      "pt-BR",
      {
        sensitivity: "base",
      },
    ),
  );

  escolasOrdenadas.forEach((escola) => {
    const nomeEscola =
      obterNomeLocal(escola.localExercicioId) || "Escola sem nome";

    const option = document.createElement("option");

    option.value = escola.id;
    option.textContent = nomeEscola;

    selectEscolaTurmas.appendChild(option);
  });

  if (valorAtual && escolas.some((escola) => escola.id === valorAtual)) {
    selectEscolaTurmas.value = valorAtual;
  }
}

function obterTurmasDaEscolaSelecionada() {
  if (!escolaTurmasIdSelecionada) {
    return [];
  }

  return turmas
    .filter(
      (turma) =>
        String(turma.escolaId || "") ===
        String(escolaTurmasIdSelecionada || ""),
    )
    .sort(compararTurmas);
}

function obterIdsProfessoresTurma(turma) {
  const professores = turma?.professores;

  if (!professores) {
    return [];
  }

  if (Array.isArray(professores)) {
    return professores
      .map((valor, indice) => {
        if (typeof valor === "string") {
          return valor;
        }

        if (valor === true) {
          return String(indice);
        }

        if (typeof valor === "object" && valor?.servidorId) {
          return String(valor.servidorId);
        }

        return null;
      })
      .filter(Boolean);
  }

  return Object.entries(professores)
    .map(([servidorId, dados]) => {
      if (dados === false || dados === null) {
        return null;
      }

      if (typeof dados === "object" && dados?.servidorId) {
        return String(dados.servidorId);
      }

      return String(servidorId);
    })
    .filter(Boolean);
}

function montarProfessoresTurmaFirebase() {
  return [...professoresTurmaSelecionados];
}

function renderTurmasEscola() {
  if (!listaTurmasEscola) return;

  if (!escolaTurmasIdSelecionada) {
    resumoTurmasEscola.style.display = "none";

    btnNovaTurma.disabled = true;

    listaTurmasEscola.innerHTML = `
      <div class="turmas-escola-vazio">
        Selecione uma escola para visualizar as turmas.
      </div>
    `;

    return;
  }

  const escola = obterEscolaPorId(escolaTurmasIdSelecionada);

  if (!escola) {
    resumoTurmasEscola.style.display = "none";
    btnNovaTurma.disabled = true;

    listaTurmasEscola.innerHTML = `
      <div class="turmas-escola-vazio">
        Escola não encontrada.
      </div>
    `;

    return;
  }

  const nomeEscola = obterNomeLocal(escola.localExercicioId) || "Escola";

  const turmasEscola = obterTurmasDaEscolaSelecionada();

  nomeEscolaTurmas.textContent = nomeEscola;

  contadorTurmasEscola.textContent = `${turmasEscola.length} turma${
    turmasEscola.length === 1 ? "" : "s"
  } cadastrada${turmasEscola.length === 1 ? "" : "s"}`;

  resumoTurmasEscola.style.display = "flex";

  btnNovaTurma.disabled = false;

  if (!turmasEscola.length) {
    listaTurmasEscola.innerHTML = `
      <div class="turmas-escola-vazio">
        Nenhuma turma cadastrada para esta escola.
      </div>
    `;

    return;
  }

  listaTurmasEscola.innerHTML = turmasEscola
    .map((turma) => {
      const professores = obterIdsProfessoresTurma(turma)
        .map(obterNomeServidor)
        .filter(Boolean);

      return `
        <article class="card-turma-escola">
          <div>
            <h3>
              ${escaparHtml(turma.nome || "Turma")}
            </h3>
          </div>

          <div class="card-turma-dados">
            <span>
              <strong>Turno:</strong>
              ${escaparHtml(turma.turno || "-")}
            </span>

            <span>
              <strong>Quantidade de alunos:</strong>
              ${escaparHtml(String(turma.quantidadeAlunos ?? "-"))}
            </span>
          </div>

          <div class="card-turma-professores">
            ${
              professores.length
                ? professores
                    .map(
                      (nomeProfessor) => `
                        <span class="card-turma-professor">
                          ${escaparHtml(nomeProfessor)}
                        </span>
                      `,
                    )
                    .join("")
                : `
                    <span class="card-turma-professor">
                      Nenhum professor vinculado
                    </span>
                  `
            }
          </div>

          <div class="card-turma-acoes">
            <button
              type="button"
              class="btn-editar-turma"
              data-id="${turma.id}"
              title="Editar turma"
            >
              <span class="material-symbols-outlined">
                edit_note
              </span>
            </button>

            <button
              type="button"
              class="btn-excluir-turma"
              data-id="${turma.id}"
              title="Excluir turma"
            >
              <span class="material-symbols-outlined">
                delete
              </span>
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

listaTurmasEscola?.addEventListener("click", async (event) => {
  const btnEditar = event.target.closest(".btn-editar-turma");

  const btnExcluir = event.target.closest(".btn-excluir-turma");

  if (!btnEditar && !btnExcluir) {
    return;
  }

  const turmaId = btnEditar?.dataset.id || btnExcluir?.dataset.id;

  const turma = turmas.find((item) => item.id === turmaId);

  if (!turma) {
    notificar("Turma não encontrada.", "erro");
    return;
  }

  if (btnEditar) {
    editarTurma(turma);
    return;
  }

  if (btnExcluir) {
    await excluirTurma(turma);
  }
});

selectEscolaTurmas?.addEventListener("change", () => {
  escolaTurmasIdSelecionada = selectEscolaTurmas.value || null;

  fecharFormularioTurma();

  renderTurmasEscola();
});

function atualizarSelectProfessoresTurma() {
  if (!selectProfessorTurma) return;

  const escola = obterEscolaPorId(escolaTurmasIdSelecionada);

  const professoresDisponiveis = obterProfessoresDisponiveisDaEscola(
    escola,
  ).filter((servidor) => !professoresTurmaSelecionados.includes(servidor.id));

  selectProfessorTurma.innerHTML = `
    <option value="">
      ${
        professoresDisponiveis.length
          ? "Selecione um professor"
          : "Nenhum professor disponível"
      }
    </option>
  `;

  professoresDisponiveis.forEach((servidor) => {
    const option = document.createElement("option");

    option.value = servidor.id;
    option.textContent = servidor.nome || "Professor";

    selectProfessorTurma.appendChild(option);
  });

  selectProfessorTurma.disabled = professoresDisponiveis.length === 0;
}

function abrirFormularioNovaTurma() {
  if (!escolaTurmasIdSelecionada) {
    notificar("Selecione uma escola.", "erro");
    return;
  }

  editandoTurma = false;
  chaveTurmaEdicao = null;

  professoresTurmaSelecionados = [];

  formTurma.reset();

  tituloFormularioTurma.textContent = "Nova turma";

  msgEdicaoTurma.style.display = "none";
  msgEdicaoTurma.innerHTML = "";

  atualizarSelectProfessoresTurma();

  renderProfessoresTurmaSelecionados();

  formularioTurmaContainer.style.display = "block";

  inputNomeTurma.focus();
}

function fecharFormularioTurma() {
  editandoTurma = false;
  chaveTurmaEdicao = null;

  professoresTurmaSelecionados = [];

  formTurma?.reset();

  if (formularioTurmaContainer) {
    formularioTurmaContainer.style.display = "none";
  }

  if (msgEdicaoTurma) {
    msgEdicaoTurma.style.display = "none";
    msgEdicaoTurma.innerHTML = "";
  }

  renderProfessoresTurmaSelecionados();

  const btnSalvarTurma = document.getElementById("btnSalvarTurma");

  if (btnSalvarTurma) {
    btnSalvarTurma.innerHTML = `
    <span class="material-symbols-outlined">
      save
    </span>

    Salvar turma
  `;
  }
}

btnNovaTurma?.addEventListener("click", abrirFormularioNovaTurma);

btnCancelarTurma?.addEventListener("click", fecharFormularioTurma);

function renderProfessoresTurmaSelecionados() {
  if (!listaProfessoresTurma) return;

  listaProfessoresTurma.innerHTML = "";

  professoresTurmaSelecionados.forEach((servidorId) => {
    const servidor = obterServidorPorId(servidorId);

    if (!servidor) return;

    const item = document.createElement("div");

    item.className = "professor-turma-item";

    item.innerHTML = `
      <span>
        ${escaparHtml(servidor.nome || "Professor")}
      </span>

      <button
        type="button"
        title="Remover professor"
      >
        <span class="material-symbols-outlined">
          close
        </span>
      </button>
    `;

    item.querySelector("button").addEventListener("click", () => {
      professoresTurmaSelecionados = professoresTurmaSelecionados.filter(
        (id) => id !== servidorId,
      );

      renderProfessoresTurmaSelecionados();
      atualizarSelectProfessoresTurma();
    });

    listaProfessoresTurma.appendChild(item);
  });
}

btnAdicionarProfessorTurma?.addEventListener("click", () => {
  const servidorId = String(selectProfessorTurma.value || "");

  if (!servidorId) {
    notificar("Selecione um professor.", "erro");
    return;
  }

  if (professoresTurmaSelecionados.includes(servidorId)) {
    notificar("Este professor já foi adicionado.", "erro");
    return;
  }

  professoresTurmaSelecionados.push(servidorId);

  renderProfessoresTurmaSelecionados();
  atualizarSelectProfessoresTurma();
});

formTurma?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!escolaTurmasIdSelecionada) {
    notificar("Selecione uma escola.", "erro");
    return;
  }

  const escola = obterEscolaPorId(escolaTurmasIdSelecionada);

  if (!escola) {
    notificar("Escola não encontrada.", "erro");
    return;
  }

  const nome = inputNomeTurma.value.trim();

  const turno = selectTurnoTurma.value;

  const quantidadeAlunos = Number(inputQuantidadeAlunosTurma.value);

  if (!nome) {
    notificar("Informe o nome da turma.", "erro");

    inputNomeTurma.focus();
    return;
  }

  if (!turno) {
    notificar("Selecione o turno.", "erro");

    selectTurnoTurma.focus();
    return;
  }

  if (!Number.isInteger(quantidadeAlunos) || quantidadeAlunos < 0) {
    notificar("Informe uma quantidade de alunos válida.", "erro");

    inputQuantidadeAlunosTurma.focus();
    return;
  }

  /*
   * Impede duas turmas com mesmo nome e turno
   * dentro da mesma escola.
   */
  const turmaDuplicada = turmas.find((turma) => {
    const mesmaEscola = turma.escolaId === escolaTurmasIdSelecionada;

    const mesmoNome = normalizarTexto(turma.nome) === normalizarTexto(nome);

    const mesmoTurno = normalizarTexto(turma.turno) === normalizarTexto(turno);

    const outraTurma = turma.id !== chaveTurmaEdicao;

    return mesmaEscola && mesmoNome && mesmoTurno && outraTurma;
  });

  if (turmaDuplicada) {
    notificar(
      "Já existe uma turma com este nome e turno nesta escola.",
      "erro",
    );

    return;
  }

  const dadosTurma = {
    escolaId: escola.id,

    /*
     * Mantemos também o localExercicioId porque
     * o quadros.js já consegue localizar as turmas
     * por este campo.
     */
    localExercicioId: escola.localExercicioId,

    nome,

    turno,

    quantidadeAlunos,

    professores: montarProfessoresTurmaFirebase(),

    atualizadoEm: new Date().toISOString(),
  };

  const btnSalvarTurma = document.getElementById("btnSalvarTurma");

  const conteudoOriginal = btnSalvarTurma.innerHTML;

  btnSalvarTurma.disabled = true;

  btnSalvarTurma.innerHTML = `
    <span class="material-symbols-outlined">
      hourglass_top
    </span>

    Salvando...
  `;

  try {
    if (editandoTurma && chaveTurmaEdicao) {
      await update(ref(rtdb, `turmas/${chaveTurmaEdicao}`), dadosTurma);

      notificar("Turma atualizada com sucesso!");
    } else {
      await push(turmasRef, {
        ...dadosTurma,
        criadoEm: new Date().toISOString(),
      });

      notificar("Turma cadastrada com sucesso!");
    }

    fecharFormularioTurma();
  } catch (erro) {
    console.error("Erro ao salvar turma:", erro);

    notificar("Não foi possível salvar a turma.", "erro");
  } finally {
    btnSalvarTurma.disabled = false;
    btnSalvarTurma.innerHTML = conteudoOriginal;
  }
});

function editarTurma(turma) {
  if (!turma) return;

  editandoTurma = true;
  chaveTurmaEdicao = turma.id;

  escolaTurmasIdSelecionada = turma.escolaId;

  selectEscolaTurmas.value = turma.escolaId;

  inputNomeTurma.value = turma.nome || "";

  selectTurnoTurma.value = turma.turno || "";

  inputQuantidadeAlunosTurma.value = turma.quantidadeAlunos ?? 0;

  professoresTurmaSelecionados = obterIdsProfessoresTurma(turma).map(String);

  tituloFormularioTurma.textContent = "Editar turma";

  const btnSalvarTurma = document.getElementById("btnSalvarTurma");

  btnSalvarTurma.innerHTML = `
  <span class="material-symbols-outlined">
    save
  </span>

  Salvar alterações
`;

  msgEdicaoTurma.style.display = "block";

  msgEdicaoTurma.innerHTML = `
    Editando:
    <strong>
      ${escaparHtml(turma.nome || "Turma")}
    </strong>
  `;

  atualizarSelectProfessoresTurma();

  renderProfessoresTurmaSelecionados();

  formularioTurmaContainer.style.display = "block";

  formularioTurmaContainer.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  inputNomeTurma.focus();
}

async function excluirTurma(turma) {
  if (!turma?.id) return;

  const confirmou = await window.mostrarConfirmacao({
    titulo: "Excluir turma",
    mensagem:
      `Deseja realmente excluir a turma ` +
      `"${turma.nome || "Turma"}"?\n\n` +
      "Esta ação não poderá ser desfeita.",
    tipo: "perigo",
    textoConfirmar: "Excluir turma",
    textoCancelar: "Cancelar",
  });

  if (!confirmou) return;

  try {
    await remove(ref(rtdb, `turmas/${turma.id}`));

    notificar("Turma excluída com sucesso!");

    if (chaveTurmaEdicao === turma.id) {
      fecharFormularioTurma();
    }
  } catch (erro) {
    console.error("Erro ao excluir turma:", erro);

    notificar("Não foi possível excluir a turma.", "erro");
  }
}

/* =========================================
   CADASTRAR / EDITAR
========================================= */

formEscola?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const localExercicioId = localExercicioIdSelecionado;

  const codigoInep = inputCodigoInep.value.trim();

  const endereco = inputEndereco.value.trim();

  const gestorId = gestorIdSelecionado;

  const secretarioId = secretarioIdSelecionado;

  /* =====================================
       VALIDAÇÕES
    ===================================== */

  if (!localExercicioId) {
    notificar("Selecione um local de exercício entre as sugestões.", "erro");

    inputLocalExercicio.focus();

    return;
  }

  if (!codigoInep) {
    notificar("Informe o código INEP.", "erro");

    inputCodigoInep.focus();

    return;
  }

  if (inputGestor.value.trim() && !gestorId) {
    notificar("Selecione o gestor entre as sugestões.", "erro");

    inputGestor.focus();

    return;
  }

  if (inputSecretario.value.trim() && !secretarioId) {
    notificar("Selecione o secretário entre as sugestões.", "erro");

    inputSecretario.focus();

    return;
  }

  if (!/^\d{8}$/.test(codigoInep)) {
    notificar("Informe um código INEP válido com 8 dígitos.", "erro");

    inputCodigoInep.focus();

    return;
  }

  const escolaMesmoLocal = escolas.find(
    (escola) =>
      escola.localExercicioId === localExercicioId && escola.id !== chaveEdicao,
  );

  if (escolaMesmoLocal) {
    notificar(
      "Este local de exercício já possui uma escola cadastrada.",
      "erro",
    );

    return;
  }

  const escolaMesmoInep = escolas.find(
    (escola) =>
      String(escola.codigoInep || "") === codigoInep &&
      escola.id !== chaveEdicao,
  );

  if (escolaMesmoInep) {
    notificar("Já existe uma escola cadastrada com este código INEP.", "erro");

    return;
  }

  if (gestorId && secretarioId && gestorId === secretarioId) {
    notificar(
      "O gestor e o secretário não podem ser o mesmo servidor.",
      "erro",
    );

    return;
  }

  if (gestorId && coordenadoresSelecionados.includes(gestorId)) {
    notificar("O gestor não pode também ser coordenador.", "erro");

    return;
  }

  if (secretarioId && coordenadoresSelecionados.includes(secretarioId)) {
    notificar("O secretário não pode também ser coordenador.", "erro");

    return;
  }

  /* =====================================
       DADOS
    ===================================== */

  const dados = {
    localExercicioId,

    codigoInep,

    endereco,

    gestorId,

    secretarioId,

    coordenadoresIds: [...coordenadoresSelecionados],

    modalidades: {
      creche: modalidadeCreche.checked,

      educacaoInfantil: modalidadeEducacaoInfantil.checked,

      fundamentalI: modalidadeFundamentalI.checked,

      fundamentalII: modalidadeFundamentalII.checked,

      eja: modalidadeEja.checked,
    },

    atualizadoEm: new Date().toISOString(),
  };

  btnSalvarEscola.disabled = true;

  try {
    if (editando && chaveEdicao) {
      await update(ref(rtdb, `escolas/${chaveEdicao}`), dados);

      notificar("Escola atualizada com sucesso!");
    } else {
      await push(escolasRef, {
        ...dados,

        criadoEm: new Date().toISOString(),
      });

      notificar("Escola cadastrada com sucesso!");
    }

    resetarFormulario();

    abrirAbaEscola("listaEscolasTab");
  } catch (erro) {
    console.error("Erro ao salvar escola:", erro);

    notificar("Não foi possível salvar a escola.", "erro");
  } finally {
    btnSalvarEscola.disabled = false;
  }
});

/* =========================================
   MODALIDADES
========================================= */

function obterModalidades(modalidades = {}) {
  const lista = [];

  if (modalidades.creche) {
    lista.push("Creche");
  }

  if (modalidades.educacaoInfantil) {
    lista.push("Educação Infantil");
  }

  if (modalidades.fundamentalI) {
    lista.push("Fundamental I");
  }

  if (modalidades.fundamentalII) {
    lista.push("Fundamental II");
  }

  if (modalidades.eja) {
    lista.push("EJA");
  }

  return lista;
}

/* =========================================
   RENDERIZAÇÃO
========================================= */

function obterEscolasFiltradas() {
  const termo = normalizarTexto(inputBusca?.value || "");

  return escolas
    .filter((escola) => {
      const nomeEscola = obterNomeLocal(escola.localExercicioId);

      const nomeGestor = obterNomeServidor(escola.gestorId);

      const nomeSecretario = obterNomeServidor(escola.secretarioId);

      const coordenadores = (escola.coordenadoresIds || [])
        .map(obterNomeServidor)
        .join(" ");

      const texto = normalizarTexto(`
          ${nomeEscola}
          ${escola.codigoInep || ""}
          ${nomeGestor}
          ${nomeSecretario}
          ${coordenadores}
          ${escola.endereco || ""}
        `);

      return texto.includes(termo);
    })
    .sort((a, b) =>
      obterNomeLocal(a.localExercicioId).localeCompare(
        obterNomeLocal(b.localExercicioId),
        "pt-BR",
        {
          sensitivity: "base",
        },
      ),
    );
}

function renderEscolas() {
  if (!listaEscolas) return;

  const filtradas = obterEscolasFiltradas();

  if (contadorEscolas) {
    contadorEscolas.textContent = `${filtradas.length} escola${
      filtradas.length === 1 ? "" : "s"
    }`;
  }

  if (!filtradas.length) {
    listaEscolas.innerHTML = `
      <div class="escolas-vazio">
        Nenhuma escola encontrada.
      </div>
    `;

    return;
  }

  listaEscolas.innerHTML = filtradas
    .map((escola) => {
      const nomeEscola = obterNomeLocal(escola.localExercicioId) || "-";

      const gestor = obterNomeServidor(escola.gestorId) || "-";

      const secretario = obterNomeServidor(escola.secretarioId) || "-";

      const coordenadores = (escola.coordenadoresIds || [])
        .map(obterNomeServidor)
        .filter(Boolean);

      const modalidades = obterModalidades(escola.modalidades);

      return `
          <article class="card-escola">
            <div class="card-escola-topo">
              <div>
                <h3>
                  ${escaparHtml(nomeEscola)}
                </h3>

                <span class="escola-inep">
                  INEP:
                  ${escaparHtml(escola.codigoInep || "-")}
                </span>
              </div>
            </div>

            <div class="escola-dados">
              <span>
                <strong>
                  Endereço:
                </strong>

                ${escaparHtml(escola.endereco || "-")}
              </span>

              <span>
                <strong>
                  Gestor:
                </strong>

                ${escaparHtml(gestor)}
              </span>

              <span>
                <strong>
                  Secretário:
                </strong>

                ${escaparHtml(secretario)}
              </span>

              <span>
                <strong>
                  Coordenadores:
                </strong>

                ${escaparHtml(
                  coordenadores.length ? coordenadores.join(", ") : "-",
                )}
              </span>
            </div>

            ${
              modalidades.length
                ? `
                  <div class="escola-modalidades">
                    ${modalidades
                      .map(
                        (modalidade) => `
                          <span class="escola-modalidade">
                            ${escaparHtml(modalidade)}
                          </span>
                        `,
                      )
                      .join("")}
                  </div>
                `
                : ""
            }

            <div class="escola-acoes">
              <button
                type="button"
                class="btn-editar-escola"
                data-id="${escola.id}"
                title="Editar escola"
              >
                <span class="material-symbols-outlined">
                  edit_note
                </span>
              </button>
            </div>
          </article>
        `;
    })
    .join("");
}

/* =========================================
   EDITAR ESCOLA
========================================= */

listaEscolas?.addEventListener("click", (event) => {
  const botao = event.target.closest(".btn-editar-escola");

  if (!botao) return;

  const escola = escolas.find((item) => item.id === botao.dataset.id);

  if (!escola) return;

  editarEscola(escola);
});

function editarEscola(escola) {
  editando = true;

  chaveEdicao = escola.id;

  localExercicioIdSelecionado = escola.localExercicioId || null;

  gestorIdSelecionado = escola.gestorId || null;

  secretarioIdSelecionado = escola.secretarioId || null;

  coordenadorIdSelecionado = null;

  inputLocalExercicio.value = obterNomeLocal(escola.localExercicioId);

  inputCodigoInep.value = escola.codigoInep || "";

  inputEndereco.value = escola.endereco || "";

  inputGestor.value = obterNomeServidor(escola.gestorId);

  inputSecretario.value = obterNomeServidor(escola.secretarioId);

  inputCoordenador.value = "";

  coordenadoresSelecionados = Array.isArray(escola.coordenadoresIds)
    ? [...escola.coordenadoresIds]
    : [];

  modalidadeCreche.checked = escola.modalidades?.creche === true;

  modalidadeEducacaoInfantil.checked =
    escola.modalidades?.educacaoInfantil === true;

  modalidadeFundamentalI.checked = escola.modalidades?.fundamentalI === true;

  modalidadeFundamentalII.checked = escola.modalidades?.fundamentalII === true;

  modalidadeEja.checked = escola.modalidades?.eja === true;

  renderCoordenadoresSelecionados();

  tituloFormularioEscola.textContent = "Editar escola";

  btnSalvarEscola.innerHTML = `
    <span class="material-symbols-outlined">
      save
    </span>

    Salvar alterações
  `;

  btnCancelarEdicaoEscola.style.display = "inline-flex";

  msgEdicaoEscola.style.display = "block";

  msgEdicaoEscola.innerHTML = `
    Editando:
    <strong>
      ${escaparHtml(obterNomeLocal(escola.localExercicioId))}
    </strong>
  `;

  abrirAbaEscola("cadastroEscolaTab");

  document.getElementById("btnTopo")?.click();
}

/* =========================================
   RESET
========================================= */

btnCancelarEdicaoEscola?.addEventListener("click", () => {
  resetarFormulario();

  abrirAbaEscola("listaEscolasTab");
});

function resetarFormulario() {
  editando = false;

  chaveEdicao = null;

  localExercicioIdSelecionado = null;

  gestorIdSelecionado = null;

  secretarioIdSelecionado = null;

  coordenadorIdSelecionado = null;

  coordenadoresSelecionados = [];

  formEscola.reset();

  [boxLocalExercicio, boxGestor, boxSecretario, boxCoordenador].forEach(
    (box) => {
      if (box) {
        box.style.display = "none";
        box.innerHTML = "";
      }
    },
  );

  renderCoordenadoresSelecionados();

  tituloFormularioEscola.textContent = "Nova escola";

  btnSalvarEscola.innerHTML = `
    <span class="material-symbols-outlined">
      add_circle
    </span>

    Cadastrar escola
  `;

  btnCancelarEdicaoEscola.style.display = "none";

  msgEdicaoEscola.style.display = "none";

  msgEdicaoEscola.innerHTML = "";
}

/* =========================================
   BUSCA
========================================= */

inputBusca?.addEventListener("input", renderEscolas);

/* =========================================
   EXPORTAR EXCEL
========================================= */

btnExportarExcel?.addEventListener("click", () => {
  const escolasExportar = obterEscolasFiltradas();

  if (!escolasExportar.length) {
    notificar("Não há escolas para exportar.", "erro");

    return;
  }

  const dadosExcel = escolasExportar.map((escola) => {
    const coordenadores = (escola.coordenadoresIds || [])
      .map(obterNomeServidor)
      .filter(Boolean)
      .join(", ");

    const modalidades = obterModalidades(escola.modalidades).join(", ");

    return {
      Escola: obterNomeLocal(escola.localExercicioId) || "",

      "Código INEP": escola.codigoInep || "",

      Endereço: escola.endereco || "",

      Gestor: obterNomeServidor(escola.gestorId) || "",

      Secretário: obterNomeServidor(escola.secretarioId) || "",

      Coordenadores: coordenadores,

      "Modalidades de Ensino": modalidades,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(dadosExcel);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Escolas");

  worksheet["!cols"] = [
    { wch: 45 },
    { wch: 15 },
    { wch: 45 },
    { wch: 35 },
    { wch: 35 },
    { wch: 55 },
    { wch: 50 },
  ];

  const hoje = new Date();

  const dataArquivo = [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, "0"),
    String(hoje.getDate()).padStart(2, "0"),
  ].join("-");

  XLSX.writeFile(workbook, `escolas_${dataArquivo}.xlsx`);

  notificar("Escolas exportadas com sucesso!");
});
