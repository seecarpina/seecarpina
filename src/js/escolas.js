import { rtdb } from "./firebaseConfig.js";

import {
  ref,
  push,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* =========================================
   REFERÊNCIAS
========================================= */

const escolasRef = ref(rtdb, "escolas");

const locaisRef = ref(rtdb, "servidores/locaisExercicio");

const servidoresRef = ref(rtdb, "servidores/registros");

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

let localExercicioIdSelecionado = null;
let gestorIdSelecionado = null;
let secretarioIdSelecionado = null;
let coordenadorIdSelecionado = null;

let coordenadoresSelecionados = [];

let editando = false;
let chaveEdicao = null;

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
  if (!id) return "";

  const servidor = servidores.find((item) => item.id === id);

  return servidor?.nome || "";
}

function servidorAtivo(servidor) {
  return normalizarTexto(servidor.situacao) === "ativo";
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
});

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
