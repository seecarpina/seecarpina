import { auth, db, rtdb } from "./firebaseConfig.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  ref,
  push,
  onValue,
  get,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* =========================================
   CONFIGURAÇÕES E ESTADO
========================================= */

const ANO_ATUAL = String(new Date().getFullYear());

let anoSelecionado = ANO_ATUAL;
let nomeResponsavel = "Usuário";

let carregandoOficios = true;

let todosOficios = [];
let destinos = [];

let destinoIdSelecionado = null;
let copiaIdSelecionado = null;

let paginaAtual = 1;
const porPagina = 25;
let pararEscutaOficios = null;

let editando = false;
let chaveEdicao = null;

const checkboxSistemaCarpinaDigital = document.getElementById(
  "sistemaCarpinaDigital",
);

const inputNumeroProcesso = document.getElementById("numeroProcesso");

/* =========================================
   ELEMENTOS
========================================= */

const formOficio = document.getElementById("formOficio");

const inputAssunto = document.getElementById("assunto");
const inputDestino = document.getElementById("destino");
const inputCopia = document.getElementById("copia");
const inputResponsavel = document.getElementById("responsavel");

const boxDestino = document.getElementById("autocompleteDestino");

const boxCopia = document.getElementById("autocompleteCopia");

const tabela = document.querySelector("#tabelaOficios tbody");

const paginacao = document.getElementById("paginacao");

const inputBusca = document.getElementById("busca");

const filtroDisponiveis = document.getElementById("filtroDisponiveis");

const filtroAno = document.getElementById("filtroAno");

const filtroDataInicio = document.getElementById("filtroDataInicio");

const filtroDataFim = document.getElementById("filtroDataFim");

const contadorOficios = document.getElementById("contadorOficios");

const btnCadastrar = document.getElementById("btnCadastrar");

const botoesEdicao = document.getElementById("botoesEdicao");

const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");

const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

const msgEdicao = document.getElementById("msgEdicao");

const btnExportar = document.getElementById("btnExportarExcel");

const destinosRef = ref(rtdb, "destinos");

/* =========================================
   NOTIFICAÇÕES
========================================= */

function notificar(mensagem, tipo = "sucesso") {
  if (typeof window.mostrarNotificacao === "function") {
    window.mostrarNotificacao(mensagem, tipo);
    return;
  }

  alert(mensagem);
}

/* =========================================
   USUÁRIO LOGADO
========================================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./login";
    return;
  }

  // ==============================
  // USA CACHE PRIMEIRO
  // ==============================

  try {
    const cache = localStorage.getItem("usuarioCache");

    if (cache) {
      const dadosCache = JSON.parse(cache);

      if (dadosCache?.nome) {
        nomeResponsavel = dadosCache.nome.split(" ")[0];

        if (inputResponsavel) {
          inputResponsavel.value = nomeResponsavel;
        }
      }
    }
  } catch (erro) {
    console.error("Erro ao ler cache do usuário:", erro);
  }

  // ==============================
  // ATUALIZA PELO FIRESTORE
  // ==============================

  try {
    const usuarioSnap = await getDoc(doc(db, "usuarios", user.uid));

    if (usuarioSnap.exists()) {
      nomeResponsavel = usuarioSnap.data().nome?.split(" ")[0] || "Usuário";
    } else if (user.displayName) {
      nomeResponsavel = user.displayName.split(" ")[0];
    }

    if (inputResponsavel) {
      inputResponsavel.value = nomeResponsavel;
    }

    // Atualiza permissões dos botões
    // caso o nome tenha chegado depois
    if (!carregandoOficios) {
      renderTabela();
    }
  } catch (erro) {
    console.error("Erro ao identificar responsável:", erro);

    if (nomeResponsavel === "Usuário") {
      nomeResponsavel = user.displayName?.split(" ")[0] || "Usuário";
    }

    if (inputResponsavel) {
      inputResponsavel.value = nomeResponsavel;
    }
  }
});

/* =========================================
   FUNÇÕES AUXILIARES
========================================= */

function padronizarTexto(texto) {
  if (!texto) return "";

  return texto
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(^\w|\s\w)/g, (letra) => letra.toUpperCase());
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function obterNomeDestino(id) {
  if (!id) return "";

  const destino = destinos.find((item) => item.id === id);

  return destino?.nome || "";
}

function obterDestinoOficio(oficio) {
  if (!oficio?.destinoId) return "";

  return obterNomeDestino(oficio.destinoId);
}

function obterCopiaOficio(oficio) {
  if (!oficio?.copiaId) return "";

  return obterNomeDestino(oficio.copiaId);
}

function mostrarSugestoesDestinos(input, box, aoSelecionar) {
  if (!input || !box) return;

  const termo = normalizarTexto(input.value);

  box.innerHTML = "";

  if (!termo) {
    box.style.display = "none";
    return;
  }

  const filtrados = destinos.filter((destino) =>
    normalizarTexto(destino.nome).includes(termo),
  );

  filtrados.forEach((destino) => {
    const li = document.createElement("li");

    li.textContent = destino.nome;

    li.addEventListener("click", () => {
      input.value = destino.nome;

      aoSelecionar(destino.id);

      box.style.display = "none";
    });

    box.appendChild(li);
  });

  box.style.display = filtrados.length ? "block" : "none";
}

async function obterOuCriarDestinoId(nome) {
  if (!nome) return null;

  const existente = destinos.find(
    (destino) => normalizarTexto(destino.nome) === normalizarTexto(nome),
  );

  if (existente) {
    return existente.id;
  }

  const novaRef = push(destinosRef);

  await update(novaRef, {
    nome: padronizarTexto(nome),
  });

  return novaRef.key;
}

function escaparHtml(texto) {
  const elemento = document.createElement("div");

  elemento.textContent = texto ?? "";

  return elemento.innerHTML;
}

function formatarDataBR(dataISO) {
  if (!dataISO) return "-";

  const [ano, mes, dia] = dataISO.split("-");

  if (!ano || !mes || !dia) return "-";

  return `${dia}/${mes}/${ano}`;
}

function formatarNumeroOficio(numero, ano) {
  if (!numero) return "-";

  return `${String(numero).padStart(3, "0")}/${ano}`;
}

function getOficiosRef() {
  return ref(rtdb, `oficios/${anoSelecionado}`);
}

function oficioDisponivel(oficio) {
  const assunto = String(oficio.assunto || "").trim();

  return assunto === "" || assunto.toLowerCase() === "undefined";
}

function atualizarCampoNumeroProcesso() {
  const ativo = checkboxSistemaCarpinaDigital.checked;

  inputNumeroProcesso.disabled = !ativo;

  inputNumeroProcesso.required = ativo;

  if (!ativo) {
    inputNumeroProcesso.value = "";
  }
}

checkboxSistemaCarpinaDigital?.addEventListener(
  "change",
  atualizarCampoNumeroProcesso,
);

atualizarCampoNumeroProcesso();

/* =========================================
   DESTINOS E AUTOCOMPLETE
========================================= */
onValue(destinosRef, (snapshot) => {
  destinos = snapshot.exists()
    ? Object.entries(snapshot.val())
        .map(([id, valor]) => ({
          id,
          nome: padronizarTexto(
            typeof valor === "string" ? valor : valor?.nome,
          ),
        }))
        .filter((destino) => destino.nome)
        .sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR", {
            sensitivity: "base",
          }),
        )
    : [];

  renderTabela();
});

inputDestino?.addEventListener("input", () => {
  destinoIdSelecionado = null;

  mostrarSugestoesDestinos(inputDestino, boxDestino, (id) => {
    destinoIdSelecionado = id;
  });
});

inputCopia?.addEventListener("input", () => {
  copiaIdSelecionado = null;

  mostrarSugestoesDestinos(inputCopia, boxCopia, (id) => {
    copiaIdSelecionado = id;
  });
});

document.addEventListener("click", (event) => {
  if (
    inputDestino &&
    boxDestino &&
    !inputDestino.contains(event.target) &&
    !boxDestino.contains(event.target)
  ) {
    boxDestino.style.display = "none";
  }

  if (
    inputCopia &&
    boxCopia &&
    !inputCopia.contains(event.target) &&
    !boxCopia.contains(event.target)
  ) {
    boxCopia.style.display = "none";
  }
});

/* =========================================
   CADASTRO
========================================= */

let cadastrandoOficio = false;

formOficio?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (editando) {
    btnSalvarEdicao?.click();
    return;
  }

  if (cadastrandoOficio) return;

  const assunto = inputAssunto.value.trim();

  const destino = padronizarTexto(inputDestino.value);

  const copia = padronizarTexto(inputCopia.value);

  const sistemaCarpinaDigital = checkboxSistemaCarpinaDigital.checked;

  const numeroProcesso = sistemaCarpinaDigital
    ? inputNumeroProcesso.value.trim()
    : "";

  if (!assunto) {
    notificar("Preencha o campo de assunto.", "erro");

    inputAssunto.focus();
    return;
  }

  if (!destino) {
    notificar("Informe o destino.", "erro");

    inputDestino.focus();
    return;
  }

  if (sistemaCarpinaDigital && !numeroProcesso) {
    notificar("Informe o número do processo.", "erro");

    inputNumeroProcesso.focus();
    return;
  }

  /* Só cria/busca IDs depois das validações */

  const destinoId =
    destinoIdSelecionado || (await obterOuCriarDestinoId(destino));

  const copiaId = copia
    ? copiaIdSelecionado || (await obterOuCriarDestinoId(copia))
    : null;

  cadastrandoOficio = true;

  btnCadastrar.disabled = true;

  const textoOriginal = btnCadastrar.innerHTML;

  btnCadastrar.innerHTML = `
      <span class="material-symbols-outlined">
        hourglass_top
      </span>
      Salvando...
    `;

  try {
    const oficiosRef = ref(rtdb, `oficios/${ANO_ATUAL}`);

    const snapshot = await get(oficiosRef);

    const dados = snapshot.exists() ? snapshot.val() : {};

    let maiorNumero = 0;

    Object.values(dados).forEach((oficio) => {
      const numero = Number(oficio?.numero);

      if (!Number.isNaN(numero) && numero > maiorNumero) {
        maiorNumero = numero;
      }
    });

    const numeroGerado = maiorNumero + 1;

    const hoje = new Date().toLocaleDateString("sv-SE");

    await push(oficiosRef, {
      numero: numeroGerado,
      assunto,
      data: hoje,
      destinoId,
      copiaId,
      sistemaCarpinaDigital,
      numeroProcesso,
      responsavel: nomeResponsavel,
      criadoEm: new Date().toISOString(),
    });

    notificar(`Ofício nº ${numeroGerado} cadastrado com sucesso!`);

    formOficio.reset();
    destinoIdSelecionado = null;

    copiaIdSelecionado = null;
    atualizarCampoNumeroProcesso();

    if (inputResponsavel) {
      inputResponsavel.value = nomeResponsavel;
    }

    inputAssunto.focus();
  } catch (erro) {
    console.error("Erro ao cadastrar ofício:", erro);

    notificar(`Erro ao cadastrar: ${erro.message}`, "erro");
  } finally {
    cadastrandoOficio = false;

    btnCadastrar.disabled = false;
    btnCadastrar.innerHTML = textoOriginal;
  }
});

/* =========================================
   FILTROS
========================================= */

function obterOficiosFiltrados() {
  const termo = normalizarTexto(inputBusca?.value || "");

  const dataInicio = filtroDataInicio?.value || "";
  const dataFim = filtroDataFim?.value || "";

  let filtrados = todosOficios.filter((oficio) => {
    const texto = normalizarTexto(`
      ${oficio.numero || ""}
      ${formatarNumeroOficio(oficio.numero, anoSelecionado)}
      ${oficio.assunto || ""}
      ${oficio.data || ""}
      ${formatarDataBR(oficio.data)}
      ${obterDestinoOficio(oficio)}
      ${obterCopiaOficio(oficio)}
      ${oficio.responsavel || ""}
    `);

    return texto.includes(termo);
  });

  // Data inicial
  if (dataInicio) {
    filtrados = filtrados.filter((oficio) => {
      return oficio.data && oficio.data >= dataInicio;
    });
  }

  // Data final
  if (dataFim) {
    filtrados = filtrados.filter((oficio) => {
      return oficio.data && oficio.data <= dataFim;
    });
  }

  // Somente disponíveis
  if (filtroDisponiveis?.checked) {
    filtrados = filtrados.filter(oficioDisponivel);
  }

  return filtrados;
}

/* =========================================
   RENDERIZAÇÃO DA TABELA
========================================= */

function renderTabela() {
  if (!tabela) {
    return;
  }

  // ==============================
  // CARREGANDO
  // ==============================

  if (carregandoOficios) {
    tabela.innerHTML = `
      <tr>
        <td
          colspan="7"
          style="text-align:center;"
        >
          <svg
            class="svg-spinner"
            viewBox="0 0 50 50"
          >
            <circle
              class="path"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke-width="4"
            />
          </svg>
        </td>
      </tr>
    `;

    if (contadorOficios) {
      contadorOficios.textContent = "";
    }

    return;
  }

  // ==============================
  // FILTROS E BUSCA
  // ==============================

  const filtrados = obterOficiosFiltrados();

  // ==============================
  // CONTADOR
  // ==============================

  if (contadorOficios) {
    const total = filtrados.length;

    contadorOficios.textContent = `${total} ofício${
      total === 1 ? "" : "s"
    } encontrado${total === 1 ? "" : "s"}`;
  }

  // ==============================
  // PAGINAÇÃO LOCAL
  // ==============================

  const totalPaginas = Math.ceil(filtrados.length / porPagina);

  if (paginaAtual > totalPaginas) {
    paginaAtual = totalPaginas || 1;
  }

  const inicio = (paginaAtual - 1) * porPagina;

  const pagina = filtrados.slice(inicio, inicio + porPagina);

  tabela.innerHTML = "";

  // ==============================
  // NENHUM RESULTADO
  // ==============================

  if (!pagina.length) {
    tabela.innerHTML = `
      <tr>
        <td
          colspan="7"
          style="text-align:center;"
        >
          Nenhum ofício encontrado.
        </td>
      </tr>
    `;

    renderizarPaginacao(0);

    return;
  }

  // ==============================
  // RENDERIZAÇÃO
  // ==============================

  pagina.forEach((oficio) => {
    const tr = document.createElement("tr");

    tr.dataset.key = oficio._key;

    const assuntoFormatado = formatarAssunto(oficio);

    const podeEditar =
      oficio.responsavel === nomeResponsavel ||
      nomeResponsavel === "Raphael" ||
      !oficio.responsavel;

    tr.innerHTML = `
        <td>
          ${formatarNumeroOficio(oficio.numero, anoSelecionado)}
        </td>

        <td class="assunto">
          ${assuntoFormatado}
        </td>

        <td>
          ${formatarDataBR(oficio.data)}
        </td>

        <td>
          ${escaparHtml(obterDestinoOficio(oficio) || "-")}
        </td>

        <td>
          ${escaparHtml(obterCopiaOficio(oficio) || "-")}
        </td>

        <td>
          ${escaparHtml(oficio.responsavel || "-")}
        </td>

        <td>
          <div>

            ${
              podeEditar
                ? `
                  <button
                    class="edit-btn"
                    type="button"
                    title="Editar ofício"
                  >
                    <span
                      class="material-symbols-outlined"
                    >
                      edit_note
                    </span>
                  </button>

                  <button
                    class="cancel-btn"
                    type="button"
                    title="Cancelar ofício"
                  >
                    <span
                      class="material-symbols-outlined"
                    >
                      cancel
                    </span>
                  </button>
                `
                : ""
            }

          </div>
        </td>
      `;

    tabela.appendChild(tr);
  });

  renderizarPaginacao(totalPaginas);
}

function formatarAssunto(oficio) {
  const assunto = String(oficio.assunto || "");

  const assuntoEscapado = escaparHtml(assunto);

  if (oficio.sistemaCarpinaDigital === true && oficio.numeroProcesso) {
    const numeroProcesso = String(oficio.numeroProcesso).trim();

    const link =
      "https://digital.carpina.pe.gov.br/" +
      `app/processos/manage/${encodeURIComponent(numeroProcesso)}`;

    return `
      <a
        href="${link}"
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir processo nº ${escaparHtml(numeroProcesso)}"
      >
        ${assuntoEscapado}

        <span
          class="material-symbols-outlined"
        >
          link_2
        </span>
      </a>
    `;
  }

  return assuntoEscapado;
}

/* =========================================
   PAGINAÇÃO
========================================= */

function renderizarPaginacao(totalPaginas) {
  if (!paginacao) {
    return;
  }

  paginacao.innerHTML = "";

  if (totalPaginas <= 1) {
    return;
  }

  const maxPaginasVisiveis = 10;

  let inicioPagina = Math.max(1, paginaAtual - 2);

  let fimPagina = Math.min(totalPaginas, inicioPagina + maxPaginasVisiveis - 1);

  if (fimPagina - inicioPagina + 1 < maxPaginasVisiveis) {
    inicioPagina = Math.max(1, fimPagina - maxPaginasVisiveis + 1);
  }

  // ANTERIOR

  if (paginaAtual > 1) {
    const anterior = document.createElement("button");

    anterior.type = "button";

    anterior.textContent = "‹";

    anterior.title = "Página anterior";

    anterior.addEventListener("click", () => {
      paginaAtual--;

      renderTabela();
    });

    paginacao.appendChild(anterior);
  }

  // NÚMEROS

  for (let pagina = inicioPagina; pagina <= fimPagina; pagina++) {
    const botao = document.createElement("button");

    botao.type = "button";

    botao.textContent = pagina;

    if (pagina === paginaAtual) {
      botao.classList.add("ativo");
    }

    botao.addEventListener("click", () => {
      paginaAtual = pagina;

      renderTabela();
    });

    paginacao.appendChild(botao);
  }

  // PRÓXIMA

  if (paginaAtual < totalPaginas) {
    const proxima = document.createElement("button");

    proxima.type = "button";

    proxima.textContent = "›";

    proxima.title = "Próxima página";

    proxima.addEventListener("click", () => {
      paginaAtual++;

      renderTabela();
    });

    paginacao.appendChild(proxima);
  }
}

/* =========================================
   AÇÕES DA TABELA
========================================= */

tabela?.addEventListener("click", async (event) => {
  const linha = event.target.closest("tr");

  if (!linha?.dataset.key) return;

  const chave = linha.dataset.key;

  const oficio = todosOficios.find((item) => item._key === chave);

  if (!oficio) return;

  const btnEditar = event.target.closest(".edit-btn");

  const btnCancelar = event.target.closest(".cancel-btn");

  if (btnEditar) {
    iniciarEdicao(oficio);
    return;
  }

  if (btnCancelar) {
    await cancelarOficio(oficio);
    return;
  }
});

/* =========================================
   EDIÇÃO
========================================= */

function iniciarEdicao(oficio) {
  editando = true;
  chaveEdicao = oficio._key;

  inputAssunto.value = oficio.assunto || "";
  inputDestino.value = obterDestinoOficio(oficio);

  inputCopia.value = obterCopiaOficio(oficio);

  destinoIdSelecionado = oficio.destinoId || null;

  copiaIdSelecionado = oficio.copiaId || null;

  checkboxSistemaCarpinaDigital.checked = oficio.sistemaCarpinaDigital === true;

  inputNumeroProcesso.value = oficio.numeroProcesso || "";

  atualizarCampoNumeroProcesso();

  btnCadastrar.style.display = "none";
  botoesEdicao.style.display = "flex";

  msgEdicao.innerHTML = `
  <div class="edicao-oficio-info">
    <span class="material-symbols-outlined">
      edit_note
    </span>

    <div>
      <strong>Modo de edição</strong>
      <span>
        Ofício nº ${formatarNumeroOficio(oficio.numero, anoSelecionado)}
      </span>
    </div>
  </div>
`;

  msgEdicao.style.display = "block";

  msgEdicao.style.display = "block";

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  btnTopo.click();
}

btnSalvarEdicao?.addEventListener("click", async () => {
  if (!editando || !chaveEdicao) {
    notificar("Erro ao localizar o ofício.", "erro");

    return;
  }

  const assunto = inputAssunto.value.trim();

  const destino = padronizarTexto(inputDestino.value);

  const copia = padronizarTexto(inputCopia.value);

  const sistemaCarpinaDigital = checkboxSistemaCarpinaDigital.checked;

  const numeroProcesso = sistemaCarpinaDigital
    ? inputNumeroProcesso.value.trim()
    : "";

  if (!assunto) {
    notificar("Preencha o campo de assunto.", "erro");

    inputAssunto.focus();
    return;
  }

  if (!destino) {
    notificar("Informe o destino.", "erro");

    inputDestino.focus();
    return;
  }

  if (sistemaCarpinaDigital && !numeroProcesso) {
    notificar("Informe o número do processo.", "erro");

    inputNumeroProcesso.focus();
    return;
  }

  /* Só cria/busca IDs depois das validações */

  const destinoId =
    destinoIdSelecionado || (await obterOuCriarDestinoId(destino));

  const copiaId = copia
    ? copiaIdSelecionado || (await obterOuCriarDestinoId(copia))
    : null;

  const oficioOriginal = todosOficios.find(
    (oficio) => oficio._key === chaveEdicao,
  );

  if (!oficioOriginal) {
    notificar("Erro ao localizar o ofício.", "erro");

    return;
  }

  btnSalvarEdicao.disabled = true;

  try {
    await update(ref(rtdb, `oficios/${anoSelecionado}/${chaveEdicao}`), {
      assunto,
      destinoId,
      copiaId,
      sistemaCarpinaDigital,
      numeroProcesso,
      numero: oficioOriginal.numero,
      data: oficioOriginal.data,
      responsavel: oficioOriginal.responsavel?.trim()
        ? oficioOriginal.responsavel
        : nomeResponsavel,
      atualizadoEm: new Date().toISOString(),
    });

    notificar("Ofício atualizado com sucesso!");

    resetarFormularioEdicao();
  } catch (erro) {
    console.error("Erro ao atualizar ofício:", erro);

    notificar("Erro ao salvar a edição.", "erro");
  } finally {
    btnSalvarEdicao.disabled = false;
  }
});

btnCancelarEdicao?.addEventListener("click", resetarFormularioEdicao);

function resetarFormularioEdicao() {
  editando = false;
  chaveEdicao = null;

  formOficio.reset();

  destinoIdSelecionado = null;

  copiaIdSelecionado = null;

  atualizarCampoNumeroProcesso();

  if (inputResponsavel) {
    inputResponsavel.value = nomeResponsavel;
  }

  msgEdicao.style.display = "none";
  msgEdicao.textContent = "";

  btnCadastrar.style.display = "inline-flex";
  botoesEdicao.style.display = "none";

  inputAssunto.focus();
}

/* =========================================
   CANCELAMENTO
========================================= */

async function cancelarOficio(oficio) {
  const confirmou = await window.mostrarConfirmacao({
    titulo: "Cancelar ofício",
    mensagem:
      `Tem certeza que deseja cancelar o ofício nº ` +
      `${formatarNumeroOficio(oficio.numero, anoSelecionado)}?\n\n` +
      "O ofício será marcado como cancelado e poderá ser utilizado por outros usuários.",
    tipo: "perigo",
    textoConfirmar: "Cancelar ofício",
    textoCancelar: "Voltar",
  });

  if (!confirmou) return;

  try {
    await update(ref(rtdb, `oficios/${anoSelecionado}/${oficio._key}`), {
      assunto: "",
      destinoId: null,
      copiaId: null,
      sistemaCarpinaDigital: false,
      numeroProcesso: "",
      responsavel: "",
      atualizadoEm: new Date().toISOString(),
    });

    notificar(
      `Ofício nº ${formatarNumeroOficio(
        oficio.numero,
        anoSelecionado,
      )} cancelado.`,
    );
  } catch (erro) {
    console.error("Erro ao cancelar ofício:", erro);

    notificar("Erro ao cancelar o ofício.", "erro");
  }
}

/* =========================================
   ANOS
========================================= */

function carregarAnosDisponiveis() {
  if (!filtroAno) return;

  const anoAtual = new Date().getFullYear();

  // Primeiro ano do sistema
  const primeiroAno = 2025;

  const anos = [];

  for (let ano = anoAtual; ano >= primeiroAno; ano--) {
    anos.push(String(ano));
  }

  filtroAno.innerHTML = "";

  anos.forEach((ano) => {
    const option = document.createElement("option");

    option.value = ano;
    option.textContent = ano;

    if (ano === ANO_ATUAL) {
      option.selected = true;
    }

    filtroAno.appendChild(option);
  });

  anoSelecionado = filtroAno.value || ANO_ATUAL;

  atualizarLimitesPeriodo();

  const hoje = new Date().toLocaleDateString("sv-SE");

  if (filtroDataFim && anoSelecionado === ANO_ATUAL) {
    filtroDataFim.value = hoje;
  }

  carregarOficiosPorAno();
}

filtroAno?.addEventListener("change", () => {
  anoSelecionado = filtroAno.value;

  paginaAtual = 1;

  if (filtroDataInicio) {
    filtroDataInicio.value = "";
  }

  if (filtroDataFim) {
    filtroDataFim.value = "";
  }

  atualizarLimitesPeriodo();

  resetarFormularioEdicao();

  carregarOficiosPorAno();
});

function atualizarLimitesPeriodo() {
  if (!filtroDataInicio || !filtroDataFim) {
    return;
  }

  const inicioAno = `${anoSelecionado}-01-01`;

  const fimAno = `${anoSelecionado}-12-31`;

  filtroDataInicio.min = inicioAno;

  filtroDataInicio.max = fimAno;

  filtroDataFim.min = inicioAno;

  filtroDataFim.max = fimAno;
}

/* =========================================
   CARREGAMENTO POR ANO
========================================= */

function carregarOficiosPorAno() {
  // Encerra a escuta do ano anterior
  if (typeof pararEscutaOficios === "function") {
    pararEscutaOficios();
  }

  carregandoOficios = true;

  paginaAtual = 1;

  renderTabela();

  pararEscutaOficios = onValue(
    getOficiosRef(),

    (snapshot) => {
      todosOficios = snapshot.exists()
        ? Object.entries(snapshot.val())
            .filter(([, valor]) => typeof valor === "object" && valor !== null)
            .map(([key, dados]) => ({
              ...dados,
              _key: key,
            }))
            .sort((a, b) => Number(b.numero) - Number(a.numero))
        : [];

      carregandoOficios = false;

      renderTabela();
    },

    (erro) => {
      console.error("Erro ao carregar ofícios:", erro);

      carregandoOficios = false;

      tabela.innerHTML = `
        <tr>
          <td
            colspan="7"
            style="text-align:center;"
          >
            Não foi possível carregar os ofícios.
          </td>
        </tr>
      `;

      notificar("Erro ao carregar os ofícios.", "erro");
    },
  );
}

function validarPeriodo() {
  const inicio = filtroDataInicio?.value;

  const fim = filtroDataFim?.value;

  if (inicio && fim && inicio > fim) {
    notificar("A data inicial não pode ser posterior à data final.", "erro");

    return false;
  }

  return true;
}

/* =========================================
   BUSCA E FILTROS
========================================= */

inputBusca?.addEventListener("input", () => {
  paginaAtual = 1;
  renderTabela();
});

filtroDisponiveis?.addEventListener("change", () => {
  paginaAtual = 1;
  renderTabela();
});

filtroDataInicio?.addEventListener("change", () => {
  if (!validarPeriodo()) {
    filtroDataInicio.value = "";
  }

  paginaAtual = 1;

  renderTabela();
});

filtroDataFim?.addEventListener("change", () => {
  if (!validarPeriodo()) {
    filtroDataFim.value = "";
  }

  paginaAtual = 1;

  renderTabela();
});

/* =========================================
   EXPORTAÇÃO PARA EXCEL
========================================= */

btnExportar?.addEventListener("click", () => {
  if (typeof window.XLSX === "undefined") {
    notificar("A biblioteca de exportação não foi carregada.", "erro");

    return;
  }

  const dadosFiltrados = obterOficiosFiltrados();

  if (!dadosFiltrados.length) {
    notificar("Nenhum registro encontrado para exportar.", "erro");

    return;
  }

  const dadosOrdenados = [...dadosFiltrados].sort(
    (a, b) => Number(a.numero) - Number(b.numero),
  );

  const dadosExcel = dadosOrdenados.map((oficio) => ({
    Número: formatarNumeroOficio(oficio.numero, anoSelecionado),
    Assunto: oficio.assunto || "",
    Data: formatarDataBR(oficio.data),
    Destino: obterDestinoOficio(oficio),
    Cópia: obterCopiaOficio(oficio),
    "Encaminhado ao Carpina Digital":
      oficio.sistemaCarpinaDigital === true ? "Sim" : "Não",
    "Número do Processo":
      oficio.sistemaCarpinaDigital === true ? oficio.numeroProcesso || "" : "",
    Responsável: oficio.responsavel || "",
  }));

  const worksheet = window.XLSX.utils.json_to_sheet(dadosExcel);

  const workbook = window.XLSX.utils.book_new();

  window.XLSX.utils.book_append_sheet(workbook, worksheet, "Ofícios");

  window.XLSX.writeFile(workbook, `oficios_${anoSelecionado}.xlsx`);
});

/* =========================================
   INICIALIZAÇÃO
========================================= */

carregarAnosDisponiveis();
