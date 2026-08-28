import { rtdb } from "./firebaseConfig.js";
import {
  ref,
  push,
  onValue,
  update,
  get,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* ===============================
   ELEMENTOS
================================ */
const tabela = document.querySelector("#tabelaServidores tbody");
const busca = document.getElementById("buscaServidor");
const paginacao = document.getElementById("paginacaoServidores");
const menuAcoesServidor = document.getElementById("menuAcoesServidor");

const menuEditarServidor = document.getElementById("menuEditarServidor");

const menuFichaFuncional = document.getElementById("menuFichaFuncional");

const menuCartaEncaminhamento = document.getElementById(
  "menuCartaEncaminhamento",
);

const menuTransferirServidor = document.getElementById(
  "menuTransferirServidor",
);

const menuDesligarServidor = document.getElementById("menuDesligarServidor");

const divisorMenuServidor = document.getElementById("divisorMenuServidor");

const form = document.getElementById("formServidor");

const blocoCadastro = document.getElementById("botoesCadastroServidor");
const blocoEdicao = document.getElementById("botoesEdicaoServidor");
const msgEdicao = document.getElementById("msgEdicao");

const btnSalvarEdicao = document.getElementById("btnSalvarServidor");
const btnCancelar = document.getElementById("btnCancelarServidor");

const inputCargo = document.getElementById("cargo");
const inputHabilitacao = document.getElementById("habilitacao");
const inputVinculo = document.getElementById("vinculo");
const inputLocal = document.getElementById("localExercicio");

const boxCargo = document.getElementById("autocompleteCargo");
const boxVinculo = document.getElementById("autocompleteVinculo");
const boxLocal = document.getElementById("autocompleteLocal");

const contadorServidores = document.getElementById("contadorServidores");

const listaHistoricoTransferencias = document.getElementById(
  "listaHistoricoTransferencias",
);

const buscaHistoricoTransferencias = document.getElementById(
  "buscaHistoricoTransferencias",
);

const contadorHistoricoTransferencias = document.getElementById(
  "contadorHistoricoTransferencias",
);

const inputForaSala = document.getElementById("foraSala");

const blocoProfessorForaSala = document.getElementById(
  "blocoProfessorForaSala",
);

const idsCamposComplementares = [
  "endereco",
  "numero",
  "complemento",
  "bairro",
  "cep",
  "cidade",
  "uf",
  "telefone",
  "dataNascimento",
  "sexo",
  "cor",
  "estadoCivil",
  "conjuge",
  "email",
  "pcd",
  "rg",
  "orgaoEmissorRg",
  "ufRg",
  "dataEmissaoRg",
  "nacionalidade",
  "naturalidade",
  "ufNaturalidade",
  "ctps",
  "serieCtps",
  "orgaoEmissorCtps",
  "ufCtps",
  "pis",
  "tituloEleitor",
  "secaoEleitoral",
  "zonaEleitoral",
  "pai",
  "mae",
  "banco",
  "agencia",
  "conta",
];

const camposComplementares = Object.fromEntries(
  idsCamposComplementares.map((id) => [id, document.getElementById(id)]),
);

const acordeaoDadosComplementares = document.getElementById(
  "acordeaoDadosComplementares",
);

/* ===============================
   PREENCHIMENTO AUTOMÁTICO DO CEP
================================ */

const inputCep = camposComplementares.cep;

function formatarCepInput(valor) {
  const numeros = String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 8);

  if (numeros.length > 5) {
    return numeros.replace(/^(\d{5})(\d{1,3})$/, "$1-$2");
  }

  return numeros;
}

async function consultarCep() {
  const cep = String(inputCep?.value || "").replace(/\D/g, "");

  if (!cep) return;

  if (cep.length !== 8) {
    mostrarNotificacao("Informe um CEP com 8 números.", "erro");

    return;
  }

  const campoEndereco = camposComplementares.endereco;

  const campoBairro = camposComplementares.bairro;

  const campoCidade = camposComplementares.cidade;

  const campoUf = camposComplementares.uf;

  const campoComplemento = camposComplementares.complemento;

  inputCep.disabled = true;

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (!resposta.ok) {
      throw new Error("Erro ao consultar CEP");
    }

    const dados = await resposta.json();

    if (dados.erro) {
      mostrarNotificacao("CEP não encontrado.", "erro");

      return;
    }

    inputCep.value = formatarCepInput(dados.cep || cep);

    if (campoEndereco) {
      campoEndereco.value = String(dados.logradouro || "").toUpperCase();
    }

    if (campoBairro) {
      campoBairro.value = String(dados.bairro || "").toUpperCase();
    }

    if (campoCidade) {
      campoCidade.value = String(dados.localidade || "").toUpperCase();
    }

    if (campoUf) {
      campoUf.value = String(dados.uf || "").toUpperCase();
    }

    if (
      campoComplemento &&
      !campoComplemento.value.trim() &&
      dados.complemento
    ) {
      campoComplemento.value = String(dados.complemento).toUpperCase();
    }

    camposComplementares.numero?.focus();
  } catch (erro) {
    console.error("Erro ao consultar o CEP:", erro);

    mostrarNotificacao("Não foi possível consultar o CEP.", "erro");
  } finally {
    inputCep.disabled = false;
  }
}

inputCep?.addEventListener("input", (event) => {
  const campo = event.target;

  campo.value = formatarCepInput(campo.value);

  const cepNumerico = campo.value.replace(/\D/g, "");

  if (cepNumerico.length === 8) {
    consultarCep();
  }
});

/* ===============================
   FORMATAÇÃO DO TELEFONE
================================ */

const inputTelefone = camposComplementares.telefone;

function formatarTelefone(valor) {
  const numeros = String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 11);

  if (numeros.length === 0) {
    return "";
  }

  if (numeros.length <= 2) {
    return `(${numeros}`;
  }

  if (numeros.length <= 7) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

inputTelefone?.addEventListener("input", (event) => {
  event.target.value = formatarTelefone(event.target.value);
});

/* ===============================
   FORMATAÇÃO DO RG
================================ */

const inputRg = camposComplementares.rg;

function formatarRg(valor) {
  const numeros = String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 11);

  if (!numeros) {
    return "";
  }

  // RG antigo: até 7 números
  if (numeros.length <= 7) {
    return numeros
      .replace(/^(\d{1})(\d)/, "$1.$2")
      .replace(/^(\d{1})\.(\d{3})(\d)/, "$1.$2.$3");
  }

  // Nova identificação com
  // a mesma numeração do CPF
  return numeros
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

inputRg?.addEventListener("input", (event) => {
  event.target.value = formatarRg(event.target.value);
});

/* ===============================
   FORMATAÇÃO DO E-MAIL
================================ */

const inputEmail = camposComplementares.email;

inputEmail?.addEventListener("blur", (event) => {
  setTimeout(() => {
    event.target.value = String(event.target.value || "")
      .trim()
      .toLowerCase();
  }, 0);
});

/* ===============================
   FIREBASE
================================ */
const registrosRef = ref(rtdb, "servidores/registros");
const cargosRef = ref(rtdb, "servidores/cargos");
const vinculosRef = ref(rtdb, "servidores/vinculos");
const locaisRef = ref(rtdb, "servidores/locaisExercicio");
const transferenciasRef = ref(rtdb, "servidores/transferencias");

/* ===============================
   VARIÁVEIS
================================ */
let servidores = [];
let paginaAtual = 1;
const itensPorPagina = 100;
let editando = false;
let chaveEdicao = null;
let servidorMenuSelecionado = null;
let botaoMenuSelecionado = null;

let cargos = [];
let vinculos = [];
let locais = [];
let historicoTransferencias = [];

onValue(cargosRef, (s) => {
  cargos = s.exists() ? Object.values(s.val()).map(padronizarTexto) : [];
});

onValue(vinculosRef, (s) => {
  vinculos = s.exists() ? Object.values(s.val()).map(padronizarTexto) : [];
});

onValue(locaisRef, (snapshot) => {
  if (!snapshot.exists()) {
    locais = [];
    return;
  }

  locais = Object.entries(snapshot.val())
    .map(([id, valor]) => ({
      id,
      nome: padronizarTexto(valor?.nome),
    }))
    .filter((local) => local.nome)
    .sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", {
        sensitivity: "base",
      }),
    );

  renderTabela();
});

/* ===============================
   UTILITÁRIOS
================================ */
document.querySelectorAll(".servidores-tabs .tab-btn").forEach((botao) => {
  botao.addEventListener("click", () => {
    document
      .querySelectorAll(".servidores-tabs .tab-btn")
      .forEach((item) => item.classList.remove("active"));

    document
      .querySelectorAll("#servidoresTab, #historicoServidoresTab")
      .forEach((aba) => aba.classList.remove("active"));

    botao.classList.add("active");

    const aba = document.getElementById(botao.dataset.tab);

    aba?.classList.add("active");
  });
});

function formatarCPF(cpf) {
  return cpf
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

const inputCPF = document.getElementById("cpf");

inputCPF.addEventListener("input", () => {
  inputCPF.value = formatarCPF(inputCPF.value);
});

inputCPF.maxLength = 14;

function mostrarSugestoes(input, lista, box) {
  const texto = input.value.toLowerCase();
  box.innerHTML = "";

  if (!texto) {
    box.style.display = "none";
    return;
  }

  const filtrados = lista.filter((item) => item.toLowerCase().includes(texto));

  filtrados.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    li.onclick = () => {
      input.value = item;
      box.style.display = "none";
    };
    box.appendChild(li);
  });

  box.style.display = filtrados.length ? "block" : "none";
}

function mostrarSugestoesLocais() {
  const texto = normalizarTextoLocal(inputLocal.value);

  boxLocal.innerHTML = "";

  if (!texto) {
    boxLocal.style.display = "none";
    return;
  }

  const filtrados = locais.filter((local) =>
    normalizarTextoLocal(local.nome).includes(texto),
  );

  filtrados.forEach((local) => {
    const li = document.createElement("li");

    li.textContent = local.nome;

    li.addEventListener("click", () => {
      inputLocal.value = local.nome;

      localExercicioIdSelecionado = local.id;

      boxLocal.style.display = "none";
    });

    boxLocal.appendChild(li);
  });

  boxLocal.style.display = filtrados.length ? "block" : "none";
}

function normalizarTextoLocal(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

inputCargo.addEventListener("input", () => {
  mostrarSugestoes(inputCargo, cargos, boxCargo);

  atualizarCampoProfessorForaSala();
});

inputVinculo.addEventListener("input", () =>
  mostrarSugestoes(inputVinculo, vinculos, boxVinculo),
);

let localExercicioIdSelecionado = null;

inputLocal.addEventListener("input", () => {
  localExercicioIdSelecionado = null;

  mostrarSugestoesLocais();
});
document.addEventListener("click", (e) => {
  if (!inputCargo.contains(e.target)) boxCargo.style.display = "none";
  if (!inputVinculo.contains(e.target)) boxVinculo.style.display = "none";
  if (!inputLocal.contains(e.target)) boxLocal.style.display = "none";
});

function formatarDataBR(data) {
  if (!data) return "";
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

function padronizarTexto(txt) {
  return txt ? txt.toString().trim() : "";
}

function escaparHtmlServidor(texto) {
  const elemento = document.createElement("div");

  elemento.textContent = texto ?? "";

  return elemento.innerHTML;
}

function atualizarCampoProfessorForaSala() {
  const cargo = normalizarTextoLocal(inputCargo.value);

  const ehProfessor = cargo.includes("professor");

  blocoProfessorForaSala.style.display = ehProfessor ? "block" : "none";

  if (!ehProfessor) {
    inputForaSala.checked = false;
  }
}

function obterNomeLocal(localId) {
  if (!localId) return "";

  const local = locais.find((item) => item.id === localId);

  return local?.nome || "";
}

function obterLocalServidor(servidor) {
  if (!servidor?.localExercicioId) return "";

  return obterNomeLocal(servidor.localExercicioId);
}

function mostrarNotificacao(msg, tipo = "sucesso") {
  const c = document.getElementById("notificacao");
  if (!c) return alert(msg);

  const div = document.createElement("div");
  div.className = `msg ${tipo}`;
  div.textContent = msg;
  c.appendChild(div);

  setTimeout(() => {
    div.style.animation = "desaparecer 0.4s forwards";
    setTimeout(() => div.remove(), 400);
  }, 5000);
}

/* ===============================
   LOADING (IGUAL OFÍCIOS)
================================ */
tabela.innerHTML = `
  <tr>
    <td colspan="9" style="text-align:center;">
      <svg class="svg-spinner" viewBox="0 0 50 50">
        <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4"/>
      </svg>
    </td>
  </tr>
`;

/* ===============================
   FIREBASE LISTENER
================================ */
onValue(registrosRef, (snap) => {
  requestAnimationFrame(() => {
    tabela.innerHTML = "";

    if (!snap.exists()) {
      tabela.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center">
            Nenhum servidor encontrado
          </td>
        </tr>
      `;
      return;
    }

    servidores = Object.entries(snap.val()).map(([k, v]) => ({
      ...v,
      _key: k,
    }));

    renderTabela();
  });
});

/* ===============================
   HISTÓRICO DE TRANSFERÊNCIAS
================================ */

onValue(transferenciasRef, (snapshot) => {
  historicoTransferencias = [];

  if (snapshot.exists()) {
    Object.entries(snapshot.val()).forEach(([servidorId, transferencias]) => {
      Object.entries(transferencias || {}).forEach(
        ([transferenciaId, dados]) => {
          historicoTransferencias.push({
            ...dados,

            _key: transferenciaId,

            servidorId: dados.servidorId || servidorId,
          });
        },
      );
    });
  }

  historicoTransferencias.sort((a, b) => {
    const dataA = new Date(a.criadoEm || a.data || 0).getTime();
    const dataB = new Date(b.criadoEm || b.data || 0).getTime();

    return dataB - dataA;
  });

  renderHistoricoTransferencias();
});

function renderHistoricoTransferencias() {
  if (!listaHistoricoTransferencias) return;

  const busca = normalizarTextoLocal(buscaHistoricoTransferencias?.value || "");

  const filtrados = historicoTransferencias.filter((movimentacao) => {
    const servidorAtual = servidores.find(
      (servidor) => servidor._key === movimentacao.servidorId,
    );

    const nomeServidor = movimentacao.servidorNome || servidorAtual?.nome || "";

    const cpfServidor = movimentacao.servidorCPF || servidorAtual?.cpf || "";

    const codigoServidor =
      movimentacao.servidorCodigo || servidorAtual?.codigo || "";

    const textoBusca = normalizarTextoLocal(`
      ${movimentacao.protocolo || ""}
      ${nomeServidor}
      ${cpfServidor}
      ${codigoServidor}
      ${movimentacao.de || ""}
      ${movimentacao.para || ""}
      ${movimentacao.usuario || ""}
      ${movimentacao.observacao || ""}
      ${movimentacao.data || ""}
    `);

    return textoBusca.includes(busca);
  });

  if (contadorHistoricoTransferencias) {
    const total = filtrados.length;

    contadorHistoricoTransferencias.textContent = `${total} movimentação${total === 1 ? "" : "ões"}`;
  }

  if (!filtrados.length) {
    listaHistoricoTransferencias.innerHTML = `
      <div class="historico-transferencias-vazio">
        Nenhuma movimentação encontrada.
      </div>
    `;

    return;
  }

  listaHistoricoTransferencias.innerHTML = filtrados
    .map((movimentacao) => {
      const servidorAtual = servidores.find(
        (servidor) => servidor._key === movimentacao.servidorId,
      );

      const nomeServidor =
        movimentacao.servidorNome || servidorAtual?.nome || "Servidor";

      const cpfServidor = movimentacao.servidorCPF || servidorAtual?.cpf || "";

      const codigoServidor =
        movimentacao.servidorCodigo || servidorAtual?.codigo || "";

      const cpfFormatado = cpfServidor ? formatarCPF(String(cpfServidor)) : "-";

      const dataTransferencia = movimentacao.data
        ? formatarDataBR(movimentacao.data)
        : "-";

      return `
        <article class="card-historico-transferencia">
          <div class="historico-transferencia-icone">
            <span class="material-symbols-outlined">
              swap_horiz
            </span>
          </div>

          <div class="historico-transferencia-conteudo">
            <div class="historico-transferencia-topo">
              <div class="historico-transferencia-servidor">
                <span class="historico-transferencia-badge">
                  Transferência
                </span>

                <strong>
                  ${escaparHtmlServidor(nomeServidor)}
                </strong>

                <span>
                  Código: ${escaparHtmlServidor(codigoServidor || "-")}
                  ·
                  CPF: ${escaparHtmlServidor(cpfFormatado)}
                </span>
              </div>

              <span class="historico-transferencia-data">
                ${escaparHtmlServidor(dataTransferencia)}
              </span>
            </div>

            <p class="historico-transferencia-rota">
              <strong>
                ${escaparHtmlServidor(movimentacao.de || "-")}
              </strong>

              <span class="material-symbols-outlined">
                arrow_forward
              </span>

              <strong>
                ${escaparHtmlServidor(movimentacao.para || "-")}
              </strong>
            </p>

            <div class="historico-transferencia-detalhes">
              <span>
                <strong>Protocolo:</strong>
                ${escaparHtmlServidor(movimentacao.protocolo || "-")}
              </span>
            </div>

            ${
              movimentacao.observacao
                ? `
                  <p class="historico-transferencia-observacao">
                    <strong>Observação:</strong>
                    ${escaparHtmlServidor(movimentacao.observacao)}
                  </p>
                `
                : ""
            }

            <div class="historico-transferencia-responsavel">
              Realizado por
              <strong>
                ${escaparHtmlServidor(movimentacao.usuario || "Não informado")}
              </strong>
            </div>
          </div>

          <div class="historico-transferencia-acoes">
            <button
              type="button"
              class="btn-pdf-transferencia"
              data-transferencia-id="${escaparHtmlServidor(movimentacao._key)}"
              data-servidor-id="${escaparHtmlServidor(movimentacao.servidorId)}"
              title="Abrir PDF da transferência"
            >
              <span class="material-symbols-outlined">
                picture_as_pdf
              </span>
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

buscaHistoricoTransferencias?.addEventListener(
  "input",
  renderHistoricoTransferencias,
);

listaHistoricoTransferencias?.addEventListener("click", (event) => {
  const botao = event.target.closest(".btn-pdf-transferencia");

  if (!botao) return;

  const transferenciaId = botao.dataset.transferenciaId;
  const servidorId = botao.dataset.servidorId;

  const movimentacao = historicoTransferencias.find(
    (item) => item._key === transferenciaId && item.servidorId === servidorId,
  );

  if (!movimentacao) {
    mostrarNotificacao("Transferência não localizada.", "erro");
    return;
  }

  const servidorAtual = servidores.find(
    (servidor) => servidor._key === movimentacao.servidorId,
  );

  const usuarioTransferencia = window.dadosUsuario?.nome || "USUÁRIO";
  const criadoEmTransferencia = new Date().toISOString();

  gerarPDFTransferencia({
    nome: movimentacao.servidorNome || servidorAtual?.nome || "",

    codigo: movimentacao.servidorCodigo || servidorAtual?.codigo || "",

    cpf: movimentacao.servidorCPF || servidorAtual?.cpf || "",

    cargo: movimentacao.servidorCargo || servidorAtual?.cargo || "",

    vinculo: movimentacao.servidorVinculo || servidorAtual?.vinculo || "",

    novoLocal: movimentacao.para || "",
    dataTransferencia: movimentacao.data || "",
    protocolo: movimentacao.protocolo || "",
    observacao: movimentacao.observacao || "",

    usuario: movimentacao.usuario || "",
    criadoEm: movimentacao.criadoEm || "",
  });
});

/* ===============================
   RENDER TABELA
================================ */
function renderTabela() {
  tabela.innerHTML = "";

  const termo = normalizarTextoLocal(busca.value);

  const filtrados = servidores
    .filter((s) => {
      const nomeLocal = obterLocalServidor(s);

      const textoBusca = normalizarTextoLocal(`
      ${s.codigo || ""}
      ${s.nome || ""}
      ${s.cpf || ""}
      ${s.cargo || ""}
      ${s.vinculo || ""}
      ${nomeLocal || ""}
    `);

      return textoBusca.includes(termo);
    })
    .sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
    );

  if (contadorServidores) {
    const total = filtrados.length;

    contadorServidores.textContent = `${total} servidor${
      total === 1 ? "" : "es"
    } encontrado${total === 1 ? "" : "s"}`;
  }

  const totalPaginas = Math.ceil(filtrados.length / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;

  const pagina = filtrados.slice(inicio, fim);

  if (!pagina.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center">
          Nenhum servidor encontrado
        </td>
      </tr>`;
  } else {
    pagina.forEach((s) => {
      const tr = document.createElement("tr");

      const classeSituacao =
        String(s.situacao || "").toLowerCase() === "ativo"
          ? "ativo"
          : "inativo";

      tr.innerHTML = `
    <td>${s.codigo || "-"}</td>

    <td>${s.nome || "-"}</td>

    <td>${formatarCPF(s.cpf || "")}</td>

    <td>${s.cargo || "-"}</td>

    <td>${s.vinculo || "-"}</td>

    <td>${formatarDataBR(s.dataAdmissao)}</td>

    <td>
      <span class="status-servidor ${classeSituacao}">
        ${s.situacao || "-"}
      </span>
    </td>

    <td>${obterLocalServidor(s) || "-"}</td>

    <td>
      <div class="acoes-servidor">
        <button
          class="btn-menu-acoes"
          type="button"
          title="Ações do servidor"
          aria-label="Abrir ações de ${s.nome || "servidor"}"
          aria-haspopup="menu"
          aria-expanded="false"
        >
          <span class="material-symbols-outlined">
            more_vert
          </span>
        </button>
      </div>
    </td>
  `;

      tr.querySelector(".btn-menu-acoes").addEventListener("click", (event) => {
        event.stopPropagation();

        abrirMenuAcoesServidor(s, event.currentTarget);
      });

      tabela.appendChild(tr);
    });
  }

  renderPaginacao(totalPaginas);
}

/* ===============================
   MENU DE AÇÕES DO SERVIDOR
================================ */

function fecharMenuAcoesServidor() {
  if (!menuAcoesServidor) return;

  menuAcoesServidor.hidden = true;

  botaoMenuSelecionado?.classList.remove("menu-aberto");
  botaoMenuSelecionado?.setAttribute("aria-expanded", "false");

  servidorMenuSelecionado = null;
  botaoMenuSelecionado = null;
}

function abrirMenuAcoesServidor(servidor, botao) {
  if (!menuAcoesServidor) return;

  const mesmoBotao =
    botaoMenuSelecionado === botao && !menuAcoesServidor.hidden;

  if (mesmoBotao) {
    fecharMenuAcoesServidor();
    return;
  }

  fecharMenuAcoesServidor();

  servidorMenuSelecionado = servidor;
  botaoMenuSelecionado = botao;

  const servidorAtivo =
    String(servidor.situacao || "").toLowerCase() === "ativo";

  menuTransferirServidor.hidden = !servidorAtivo;
  menuDesligarServidor.hidden = !servidorAtivo;
  divisorMenuServidor.hidden = !servidorAtivo;

  menuAcoesServidor.hidden = false;

  botao.classList.add("menu-aberto");
  botao.setAttribute("aria-expanded", "true");

  const posicaoBotao = botao.getBoundingClientRect();
  const larguraMenu = menuAcoesServidor.offsetWidth;
  const alturaMenu = menuAcoesServidor.offsetHeight;
  const margem = 8;

  let esquerda = posicaoBotao.right - larguraMenu;

  esquerda = Math.max(
    margem,
    Math.min(esquerda, window.innerWidth - larguraMenu - margem),
  );

  let topo = posicaoBotao.bottom + margem;

  if (topo + alturaMenu > window.innerHeight - margem) {
    topo = posicaoBotao.top - alturaMenu - margem;
  }

  menuAcoesServidor.style.left = `${esquerda}px`;
  menuAcoesServidor.style.top = `${Math.max(margem, topo)}px`;
}

menuEditarServidor?.addEventListener("click", () => {
  const servidor = servidorMenuSelecionado;

  fecharMenuAcoesServidor();

  if (servidor) {
    editarServidor(servidor);
  }
});

menuFichaFuncional?.addEventListener("click", () => {
  const servidor = servidorMenuSelecionado;

  fecharMenuAcoesServidor();

  if (servidor) {
    gerarPDFFichaFuncional(servidor);
  }
});

menuCartaEncaminhamento?.addEventListener("click", () => {
  const servidor = servidorMenuSelecionado;

  fecharMenuAcoesServidor();

  if (!servidor?._key) {
    mostrarNotificacao("Servidor não localizado.", "erro");

    return;
  }

  // O histórico já está ordenado
  // do mais recente para o mais antigo.
  const transferencia = historicoTransferencias.find((item) => {
    return String(item.servidorId) === String(servidor._key);
  });

  if (!transferencia) {
    mostrarNotificacao(
      "Este servidor não possui carta de encaminhamento registrada.",
      "erro",
    );

    return;
  }

  gerarPDFTransferencia({
    nome: transferencia.servidorNome || servidor.nome || "",

    codigo: transferencia.servidorCodigo || servidor.codigo || "",

    cpf: transferencia.servidorCPF || servidor.cpf || "",

    cargo: transferencia.servidorCargo || servidor.cargo || "",

    vinculo: transferencia.servidorVinculo || servidor.vinculo || "",

    novoLocal: transferencia.para || "",

    dataTransferencia: transferencia.data || "",

    protocolo: transferencia.protocolo || "",

    observacao: transferencia.observacao || "",

    usuario: transferencia.usuario || "",

    criadoEm: transferencia.criadoEm || "",
  });
});

menuTransferirServidor?.addEventListener("click", () => {
  const servidor = servidorMenuSelecionado;

  fecharMenuAcoesServidor();

  if (servidor) {
    abrirTransferencia(servidor);
  }
});

menuDesligarServidor?.addEventListener("click", async () => {
  const servidor = servidorMenuSelecionado;

  if (!servidor) return;

  await desligarServidor(servidor, menuDesligarServidor);

  fecharMenuAcoesServidor();
});

document.addEventListener("click", (event) => {
  if (
    !menuAcoesServidor?.hidden &&
    !menuAcoesServidor.contains(event.target) &&
    !event.target.closest(".btn-menu-acoes")
  ) {
    fecharMenuAcoesServidor();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    fecharMenuAcoesServidor();
  }
});

window.addEventListener("resize", fecharMenuAcoesServidor);

window.addEventListener("scroll", fecharMenuAcoesServidor, true);

/* ===============================
   PAGINAÇÃO
================================ */
function renderPaginacao(totalPaginas) {
  paginacao.innerHTML = "";

  if (totalPaginas <= 1) return;

  const maxPaginasVisiveis = 10;

  let inicioPagina = Math.max(1, paginaAtual - 2);

  let fimPagina = Math.min(totalPaginas, inicioPagina + maxPaginasVisiveis - 1);

  if (fimPagina - inicioPagina + 1 < maxPaginasVisiveis) {
    inicioPagina = Math.max(1, fimPagina - maxPaginasVisiveis + 1);
  }

  if (paginaAtual > 1) {
    const btnAnterior = document.createElement("button");

    btnAnterior.type = "button";
    btnAnterior.textContent = "‹";
    btnAnterior.title = "Página anterior";

    btnAnterior.addEventListener("click", () => {
      paginaAtual--;
      renderTabela();
    });

    paginacao.appendChild(btnAnterior);
  }

  for (let pagina = inicioPagina; pagina <= fimPagina; pagina++) {
    const btn = document.createElement("button");

    btn.type = "button";
    btn.textContent = pagina;

    if (pagina === paginaAtual) {
      btn.classList.add("ativo");
    }

    btn.addEventListener("click", () => {
      paginaAtual = pagina;
      renderTabela();
    });

    paginacao.appendChild(btn);
  }

  if (paginaAtual < totalPaginas) {
    const btnProxima = document.createElement("button");

    btnProxima.type = "button";
    btnProxima.textContent = "›";
    btnProxima.title = "Próxima página";

    btnProxima.addEventListener("click", () => {
      paginaAtual++;
      renderTabela();
    });

    paginacao.appendChild(btnProxima);
  }
}

/* ===============================
   BUSCA
================================ */
busca.addEventListener("input", () => {
  paginaAtual = 1;
  renderTabela();
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
  const nomeLocal = padronizarTexto(localExercicio.value);

  const localId = await obterOuCriarLocalId(nomeLocal);

  const servidor = {
    codigo: codigo.value.trim(),
    nome: padronizarTexto(nome.value),
    cpf: cpf.value.replace(/\D/g, ""),
    cargo: padronizarTexto(cargo.value),
    habilitacao: padronizarTexto(inputHabilitacao.value),
    vinculo: padronizarTexto(vinculo.value),
    foraSala: inputForaSala.checked,
    localExercicioId: localId,
    dataAdmissao: dataAdmissao.value,
    situacao: situacao.value,
  };
  idsCamposComplementares.forEach((id) => {
    const campo = camposComplementares[id];

    const valor = campo?.value?.trim() || "";

    const camposMaiusculos = [
      "endereco",
      "complemento",
      "bairro",
      "cidade",
      "uf",
      "ufRg",
      "ufNaturalidade",
      "ufCtps",
    ];

    if (camposMaiusculos.includes(id)) {
      servidor[id] = valor.toUpperCase();
    } else if (id === "email") {
      servidor[id] = valor.toLowerCase();
    } else {
      servidor[id] = valor;
    }
  });

  if (!servidor.codigo || !servidor.nome) return;

  await salvarSeNaoExistir(cargosRef, servidor.cargo);
  await salvarSeNaoExistir(vinculosRef, servidor.vinculo);

  if (editando && chaveEdicao) {
    await update(ref(rtdb, `servidores/registros/${chaveEdicao}`), servidor);
    mostrarNotificacao("Servidor atualizado com sucesso");
  } else {
    await push(registrosRef, servidor);
    mostrarNotificacao("Servidor cadastrado com sucesso");
  }

  resetarFormulario();
}

async function obterOuCriarLocalId(nomeLocal) {
  if (!nomeLocal) return null;

  // Se o usuário selecionou
  // pelo autocomplete
  if (localExercicioIdSelecionado) {
    return localExercicioIdSelecionado;
  }

  // Procura um local com o
  // mesmo nome
  const existente = locais.find(
    (local) =>
      normalizarTextoLocal(local.nome) === normalizarTextoLocal(nomeLocal),
  );

  if (existente) {
    return existente.id;
  }

  // Se não existir, cria
  const novoLocalRef = push(locaisRef);

  await update(novoLocalRef, {
    nome: nomeLocal,
  });

  return novoLocalRef.key;
}

/* ===============================
   EDITAR
================================ */
function editarServidor(s) {
  editando = true;
  chaveEdicao = s._key;

  codigo.value = s.codigo;
  nome.value = s.nome;
  cpf.value = formatarCPF(s.cpf);
  cargo.value = s.cargo;
  inputHabilitacao.value = s.habilitacao || "";
  vinculo.value = s.vinculo;
  inputForaSala.checked = !!s.foraSala;
  atualizarCampoProfessorForaSala();
  localExercicio.value = obterLocalServidor(s);

  localExercicioIdSelecionado = s.localExercicioId || null;
  dataAdmissao.value = s.dataAdmissao;
  situacao.value = s.situacao;

  idsCamposComplementares.forEach((id) => {
    const campo = camposComplementares[id];

    if (!campo) return;

    const valor = String(s[id] || "");

    campo.value = id === "email" ? valor.toLowerCase() : valor;
  });

  if (acordeaoDadosComplementares) {
    acordeaoDadosComplementares.open = idsCamposComplementares.some((id) => {
      return String(s[id] || "").trim() !== "";
    });
  }

  blocoCadastro.style.display = "none";
  blocoEdicao.style.display = "flex";
  msgEdicao.innerHTML = `
  <div class="edicao-servidor-info">
    <span class="material-symbols-outlined">
      edit_note
    </span>

    <div>
      <strong>Modo de edição</strong>
      <span>${s.nome}</span>
    </div>
  </div>
`;

  msgEdicao.style.display = "block";

  btnTopo.click();
}

/* ===============================
   TRANSFERÊNCIA
================================ */

async function desligarServidor(servidor, botao) {
  if (!servidor?._key) {
    mostrarNotificacao("Servidor não localizado.", "erro");

    return;
  }

  if (String(servidor.situacao || "").toLowerCase() === "inativo") {
    mostrarNotificacao("Este servidor já está inativo.", "erro");

    return;
  }

  const confirmou = await window.mostrarConfirmacao({
    titulo: "Desligar servidor",
    mensagem:
      `Confirma o desligamento do servidor "${servidor.nome}"?\n\n` +
      "Ao confirmar:\n" +
      "• A situação do servidor será alterada para Inativo;\n" +
      "• Será cadastrado automaticamente um ofício de desligamento destinado ao RH.",
    tipo: "perigo",
    textoConfirmar: "Desligar servidor",
    textoCancelar: "Cancelar",
  });

  if (!confirmou) return;

  const conteudoOriginal = botao.innerHTML;

  botao.disabled = true;

  botao.innerHTML = `
    <span class="material-symbols-outlined">
      hourglass_top
    </span>
  `;

  try {
    const anoAtual = String(new Date().getFullYear());

    const oficiosAnoRef = ref(rtdb, `oficios/${anoAtual}`);

    const snapshotOficios = await get(oficiosAnoRef);

    const oficiosExistentes = snapshotOficios.exists()
      ? snapshotOficios.val()
      : {};

    let maiorNumero = 0;

    Object.values(oficiosExistentes).forEach((oficio) => {
      const numero = Number(oficio?.numero);

      if (!Number.isNaN(numero) && numero > maiorNumero) {
        maiorNumero = numero;
      }
    });

    const numeroOficio = maiorNumero + 1;

    const novoOficioRef = push(oficiosAnoRef);

    const agora = new Date();

    const dataISO = agora.toLocaleDateString("sv-SE");

    const responsavel = window.dadosUsuario?.nome?.split(" ")[0] || "Usuário";

    const assunto = `SOLICITA DESLIGAMENTO DE ${servidor.nome}`
      .trim()
      .toUpperCase();

    const atualizacoes = {};

    atualizacoes[`servidores/registros/${servidor._key}/situacao`] = "Inativo";

    atualizacoes[`servidores/registros/${servidor._key}/atualizadoEm`] =
      agora.toISOString();

    atualizacoes[`servidores/registros/${servidor._key}/desligadoEm`] =
      agora.toISOString();

    atualizacoes[`servidores/registros/${servidor._key}/oficioDesligamento`] =
      `${String(numeroOficio).padStart(3, "0")}/${anoAtual}`;

    atualizacoes[`oficios/${anoAtual}/${novoOficioRef.key}`] = {
      numero: numeroOficio,
      assunto,
      data: dataISO,
      destinoId: "29",
      responsavel,
      criadoEm: agora.toISOString(),
      origem: "DESLIGAMENTO_SERVIDOR",
      servidorId: servidor._key,
      servidorCodigo: servidor.codigo || "",
      servidorCPF: servidor.cpf || "",
    };

    await update(ref(rtdb), atualizacoes);

    mostrarNotificacao(
      `Servidor desligado e Ofício nº ${String(numeroOficio).padStart(
        3,
        "0",
      )}/${anoAtual} cadastrado com sucesso!`,
    );
  } catch (erro) {
    console.error("Erro ao desligar servidor:", erro);

    mostrarNotificacao("Não foi possível concluir o desligamento.", "erro");

    botao.disabled = false;
    botao.innerHTML = conteudoOriginal;
  }
}

/* ===============================
   RESET
================================ */
function resetarFormulario() {
  editando = false;
  chaveEdicao = null;
  localExercicioIdSelecionado = null;

  form.reset();
  inputForaSala.checked = false;

  if (acordeaoDadosComplementares) {
    acordeaoDadosComplementares.open = false;
  }

  atualizarCampoProfessorForaSala();
  blocoCadastro.style.display = "block";
  blocoEdicao.style.display = "none";
  msgEdicao.innerHTML = "";
  msgEdicao.style.display = "none";
}

/* ===============================
   AUXILIAR
================================ */
async function salvarSeNaoExistir(refBase, valor) {
  if (!valor) return;

  const snap = await get(refBase);
  const lista = snap.exists() ? Object.values(snap.val()) : [];

  if (!lista.includes(valor)) {
    await push(refBase, valor);
  }
}

// ===============================
// 📊 EXPORTAR SERVIDORES PARA EXCEL
// ===============================
const btnExportarExcel = document.getElementById("btnExportarServidores");

if (btnExportarExcel) {
  btnExportarExcel.addEventListener("click", () => {
    if (!servidores.length) {
      mostrarNotificacao("Nenhum servidor para exportar", "erro");
      return;
    }

    const termo = busca.value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    // Aplica o mesmo filtro da tabela
    const filtrados = servidores.filter((s) =>
      `${s.codigo} ${s.nome} ${s.cpf} ${s.cargo} ${s.vinculo} ${obterLocalServidor(s)}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(termo),
    );

    if (!filtrados.length) {
      mostrarNotificacao("Nenhum registro encontrado", "erro");
      return;
    }

    // Ordena por nome
    filtrados.sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
    );

    // Monta planilha
    const dadosExcel = filtrados.map((s) => ({
      Código: s.codigo,
      Nome: s.nome,
      CPF: formatarCPF(s.cpf),
      Cargo: s.cargo,
      Vínculo: s.vinculo,
      "Data de Admissão": formatarDataBR(s.dataAdmissao),
      Situação: s.situacao,
      "Local de Exercício": obterLocalServidor(s),
    }));

    // Gera Excel
    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Servidores");

    const nomeArquivo = `servidores_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    XLSX.writeFile(workbook, nomeArquivo);
  });
}

let servidorSelecionado = null;

const drawerTransferencia = document.getElementById("drawerTransferencia");

const transferenciaOverlay = document.getElementById("transferenciaOverlay");

const btnFecharTransferencia = document.getElementById(
  "btnFecharTransferencia",
);

const btnCancelarTransferencia = document.getElementById(
  "btnCancelarTransferencia",
);

const inputNovoLocal = document.getElementById("inputNovoLocal");

const boxNovoLocal = document.getElementById("autocompleteNovoLocal");

let novoLocalIdSelecionado = null;

const inputDataTransferencia = document.getElementById("dataTransferencia");

const inputObsTransferencia = document.getElementById("obsTransferencia");

const nomeServidorTransferencia = document.getElementById(
  "nomeServidorTransferencia",
);

function mostrarSugestoesNovoLocal() {
  const texto = normalizarTextoLocal(inputNovoLocal.value);

  boxNovoLocal.innerHTML = "";

  /*
   * Ao digitar novamente, desfaz a seleção anterior.
   * O ID só volta a existir quando o usuário clicar
   * em uma opção válida.
   */
  novoLocalIdSelecionado = null;

  if (!texto) {
    boxNovoLocal.style.display = "none";

    return;
  }

  const filtrados = locais.filter((local) => {
    const mesmoLocalAtual =
      String(local.id) === String(servidorSelecionado?.localExercicioId || "");

    return !mesmoLocalAtual && normalizarTextoLocal(local.nome).includes(texto);
  });

  filtrados.forEach((local) => {
    const li = document.createElement("li");

    li.textContent = local.nome;

    li.addEventListener("click", () => {
      inputNovoLocal.value = local.nome;

      novoLocalIdSelecionado = local.id;

      boxNovoLocal.style.display = "none";
    });

    boxNovoLocal.appendChild(li);
  });

  boxNovoLocal.style.display = filtrados.length ? "block" : "none";
}

inputNovoLocal?.addEventListener("input", mostrarSugestoesNovoLocal);

document.addEventListener("click", (event) => {
  const autocomplete = boxNovoLocal?.closest(".autocomplete");

  if (autocomplete && !autocomplete.contains(event.target)) {
    boxNovoLocal.style.display = "none";
  }
});

function abrirTransferencia(servidor) {
  servidorSelecionado = servidor;

  novoLocalIdSelecionado = null;

  nomeServidorTransferencia.textContent = servidor.nome || "Servidor";

  inputNovoLocal.value = "";
  boxNovoLocal.innerHTML = "";
  boxNovoLocal.style.display = "none";

  inputDataTransferencia.value = new Date().toLocaleDateString("sv-SE");

  inputObsTransferencia.value = "";

  drawerTransferencia?.classList.add("ativo");
  transferenciaOverlay?.classList.add("ativo");

  document.body.classList.add("drawer-transferencia-aberto");

  setTimeout(() => {
    inputNovoLocal?.focus();
  }, 250);
}

function fecharDrawerTransferencia() {
  drawerTransferencia?.classList.remove("ativo");

  transferenciaOverlay?.classList.remove("ativo");

  document.body.classList.remove("drawer-transferencia-aberto");

  inputNovoLocal.value = "";

  boxNovoLocal.innerHTML = "";
  boxNovoLocal.style.display = "none";

  novoLocalIdSelecionado = null;
  inputDataTransferencia.value = "";
  inputObsTransferencia.value = "";

  nomeServidorTransferencia.textContent = "";

  servidorSelecionado = null;
}

btnFecharTransferencia?.addEventListener("click", fecharDrawerTransferencia);

btnCancelarTransferencia?.addEventListener("click", fecharDrawerTransferencia);

transferenciaOverlay?.addEventListener("click", fecharDrawerTransferencia);

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    drawerTransferencia?.classList.contains("ativo")
  ) {
    fecharDrawerTransferencia();
  }
});

document.getElementById("btnGerarTransferencia").onclick = async () => {
  await transferirServidor();
};

async function transferirServidor() {
  if (!servidorSelecionado) return;

  const novoLocalId = novoLocalIdSelecionado;

  const dataTransferencia = inputDataTransferencia.value;

  const observacao = inputObsTransferencia.value.trim();

  if (!inputNovoLocal.value.trim()) {
    mostrarNotificacao("Digite o novo local de exercício.", "erro");

    inputNovoLocal.focus();

    return;
  }

  if (!novoLocalId) {
    mostrarNotificacao("Selecione um local válido na lista.", "erro");

    inputNovoLocal.focus();

    return;
  }

  if (!dataTransferencia) {
    mostrarNotificacao("Informe a data da transferência.", "erro");

    inputDataTransferencia.focus();

    return;
  }

  if (
    String(novoLocalId) === String(servidorSelecionado.localExercicioId || "")
  ) {
    mostrarNotificacao(
      "Selecione um local diferente da lotação atual.",
      "erro",
    );

    return;
  }

  const novoLocal = obterNomeLocal(novoLocalId);
  const protocolo = gerarNumeroProtocolo();

  const usuarioTransferencia = window.dadosUsuario?.nome || "USUÁRIO";

  const criadoEmTransferencia = new Date().toISOString();

  const servidorRef = ref(
    rtdb,
    `servidores/registros/${servidorSelecionado._key}`,
  );

  // 🔄 Atualiza o local do servidor
  await update(servidorRef, {
    localExercicioId: novoLocalId,
  });

  // 📜 Histórico (opcional, mas recomendado)
  const historicoRef = ref(
    rtdb,
    `servidores/transferencias/${servidorSelecionado._key}`,
  );

  await push(historicoRef, {
    tipo: "transferencia",

    protocolo,

    servidorId: servidorSelecionado._key,
    servidorCodigo: servidorSelecionado.codigo || "",
    servidorNome: servidorSelecionado.nome || "",
    servidorCPF: servidorSelecionado.cpf || "",
    servidorCargo: servidorSelecionado.cargo || "",
    servidorVinculo: servidorSelecionado.vinculo || "",

    de: obterLocalServidor(servidorSelecionado),
    para: novoLocal,

    data: dataTransferencia,
    observacao,

    usuario: usuarioTransferencia,
    criadoEm: criadoEmTransferencia,
  });

  // 🧾 Gera PDF
  gerarPDFTransferencia({
    nome: servidorSelecionado.nome || "",
    codigo: servidorSelecionado.codigo || "",
    cpf: servidorSelecionado.cpf || "",
    cargo: servidorSelecionado.cargo || "",
    vinculo: servidorSelecionado.vinculo || "",
    novoLocal,
    dataTransferencia,
    protocolo,
    observacao,
    usuario: usuarioTransferencia,
    criadoEm: criadoEmTransferencia,
  });

  // Atualiza visualmente
  servidorSelecionado.localExercicioId = novoLocalId;

  fecharDrawerTransferencia();

  mostrarNotificacao("Transferência realizada com sucesso!");
}

function gerarNumeroProtocolo() {
  const agora = new Date();

  const data = agora.toISOString().slice(0, 10).replace(/-/g, "");

  const hora = agora.toTimeString().slice(0, 8).replace(/:/g, "");

  const aleatorio = Math.floor(1000 + Math.random() * 9000);

  return `${data}-${hora}-${aleatorio}`;
}

/* ===============================
   FICHA FUNCIONAL
================================ */

function gerarPDFFichaFuncional(servidor) {
  if (!window.jspdf?.jsPDF) {
    mostrarNotificacao("Não foi possível carregar o gerador de PDF.", "erro");

    return;
  }

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF("portrait", "mm", "a4");

  const larguraPagina = 210;
  const alturaPagina = 297;
  const margem = 14;
  const larguraUtil = larguraPagina - margem * 2;

  function primeiroValor(...valores) {
    const valor = valores.find((item) => {
      return item !== undefined && item !== null && String(item).trim() !== "";
    });

    if (valor === undefined) {
      return "";
    }

    return String(valor).trim();
  }

  function dataFicha(...valores) {
    const valor = primeiroValor(...valores);

    if (!valor) {
      return "";
    }

    return formatarDataBR(valor);
  }

  function valorSimNao(valor) {
    const texto = String(valor ?? "")
      .trim()
      .toLowerCase();

    if (valor === true || texto === "sim" || texto === "true") {
      return "Sim";
    }

    if (
      valor === false ||
      texto === "não" ||
      texto === "nao" ||
      texto === "false"
    ) {
      return "Não";
    }

    return primeiroValor(valor);
  }

  function desenharConteudo() {
    let y = 34;

    doc.setTextColor(34, 39, 52);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);

    doc.text("FICHA FUNCIONAL", larguraPagina / 2, y, {
      align: "center",
    });

    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(95, 101, 116);

    doc.text(
      `Documento emitido em ${new Date().toLocaleDateString("pt-BR")}`,
      larguraPagina / 2,
      y,
      {
        align: "center",
      },
    );

    function desenharSecao(titulo) {
      y += 6;

      doc.setFillColor(70, 64, 145);

      doc.roundedRect(margem, y, larguraUtil, 8, 1.5, 1.5, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      doc.text(titulo, margem + 4, y + 5.3);

      y += 8;
    }

    function desenharLinha(campos, altura = 11) {
      let x = margem;

      campos.forEach((campo) => {
        const largura = larguraUtil * campo.fracao;

        doc.setDrawColor(211, 214, 222);
        doc.setLineWidth(0.25);

        doc.rect(x, y, largura, altura);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(90, 96, 110);

        doc.text(campo.rotulo.toUpperCase(), x + 2.5, y + 3.4);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.3);
        doc.setTextColor(28, 32, 42);

        const texto = doc.splitTextToSize(
          primeiroValor(campo.valor),
          largura - 5,
        );

        doc.text(texto.slice(0, 2), x + 2.5, y + 7.7);

        x += largura;
      });

      y += altura;
    }

    desenharSecao("DADOS DO SERVIDOR");

    desenharLinha([
      {
        rotulo: "Código/Matrícula",
        valor: servidor.codigo,
        fracao: 0.25,
      },
      {
        rotulo: "CPF",
        valor: formatarCPF(servidor.cpf || ""),
        fracao: 0.3,
      },
      {
        rotulo: "Nome",
        valor: servidor.nome,
        fracao: 0.45,
      },
    ]);

    desenharLinha([
      {
        rotulo: "Endereço",
        valor: servidor.endereco,
        fracao: 0.55,
      },
      {
        rotulo: "Número",
        valor: servidor.numero,
        fracao: 0.15,
      },
      {
        rotulo: "Complemento",
        valor: servidor.complemento,
        fracao: 0.3,
      },
    ]);

    desenharLinha([
      {
        rotulo: "Bairro",
        valor: servidor.bairro,
        fracao: 0.3,
      },
      {
        rotulo: "CEP",
        valor: servidor.cep,
        fracao: 0.2,
      },
      {
        rotulo: "Cidade",
        valor: servidor.cidade,
        fracao: 0.3,
      },
      {
        rotulo: "UF",
        valor: servidor.uf,
        fracao: 0.2,
      },
    ]);

    desenharLinha([
      {
        rotulo: "Telefone",
        valor: primeiroValor(servidor.telefone, servidor.fone),
        fracao: 0.25,
      },
      {
        rotulo: "Data de nascimento",
        valor: dataFicha(servidor.dataNascimento),
        fracao: 0.25,
      },
      {
        rotulo: "Sexo",
        valor: servidor.sexo,
        fracao: 0.25,
      },
      {
        rotulo: "Cor/Raça",
        valor: primeiroValor(servidor.cor, servidor.raca),
        fracao: 0.25,
      },
    ]);

    desenharLinha([
      {
        rotulo: "Estado civil",
        valor: servidor.estadoCivil,
        fracao: 0.3,
      },
      {
        rotulo: "Cônjuge",
        valor: servidor.conjuge,
        fracao: 0.35,
      },
      {
        rotulo: "E-mail",
        valor: servidor.email,
        fracao: 0.35,
      },
    ]);

    desenharLinha([
      {
        rotulo: "Escolaridade",
        valor: primeiroValor(servidor.habilitacao, servidor.escolaridade),
        fracao: 0.5,
      },
      {
        rotulo: "Pessoa com deficiência",
        valor: valorSimNao(
          primeiroValor(servidor.pcd, servidor.possuiDeficiencia),
        ),
        fracao: 0.5,
      },
    ]);

    desenharLinha([
      {
        rotulo: "RG",
        valor: servidor.rg,
        fracao: 0.25,
      },
      {
        rotulo: "Órgão emissor",
        valor: primeiroValor(servidor.orgaoEmissorRg, servidor.orgaoEmissor),
        fracao: 0.25,
      },
      {
        rotulo: "UF",
        valor: servidor.ufRg,
        fracao: 0.15,
      },
      {
        rotulo: "Data de emissão",
        valor: dataFicha(servidor.dataEmissaoRg),
        fracao: 0.35,
      },
    ]);

    desenharLinha([
      {
        rotulo: "Nacionalidade",
        valor: servidor.nacionalidade,
        fracao: 0.35,
      },
      {
        rotulo: "Naturalidade",
        valor: servidor.naturalidade,
        fracao: 0.45,
      },
      {
        rotulo: "UF",
        valor: servidor.ufNaturalidade,
        fracao: 0.2,
      },
    ]);

    desenharLinha([
      {
        rotulo: "CTPS",
        valor: servidor.ctps,
        fracao: 0.25,
      },
      {
        rotulo: "Série",
        valor: servidor.serieCtps,
        fracao: 0.2,
      },
      {
        rotulo: "Órgão emissor",
        valor: servidor.orgaoEmissorCtps,
        fracao: 0.35,
      },
      {
        rotulo: "UF",
        valor: servidor.ufCtps,
        fracao: 0.2,
      },
    ]);

    desenharLinha([
      {
        rotulo: "PIS/PASEP/NIS",
        valor: primeiroValor(servidor.pis, servidor.pasep, servidor.nis),
        fracao: 0.3,
      },
      {
        rotulo: "Título de eleitor",
        valor: servidor.tituloEleitor,
        fracao: 0.3,
      },
      {
        rotulo: "Seção",
        valor: servidor.secaoEleitoral,
        fracao: 0.2,
      },
      {
        rotulo: "Zona",
        valor: servidor.zonaEleitoral,
        fracao: 0.2,
      },
    ]);

    desenharLinha([
      {
        rotulo: "Pai",
        valor: servidor.pai,
        fracao: 0.5,
      },
      {
        rotulo: "Mãe",
        valor: servidor.mae,
        fracao: 0.5,
      },
    ]);

    desenharLinha([
      {
        rotulo: "Banco",
        valor: servidor.banco,
        fracao: 0.3,
      },
      {
        rotulo: "Agência",
        valor: servidor.agencia,
        fracao: 0.25,
      },
      {
        rotulo: "Conta",
        valor: servidor.conta,
        fracao: 0.25,
      },
      {
        rotulo: "Tipo de vínculo",
        valor: servidor.vinculo,
        fracao: 0.2,
      },
    ]);

    desenharSecao("RELATÓRIO FUNCIONAL");

    desenharLinha([
      {
        rotulo: "Data de admissão",
        valor: dataFicha(servidor.dataAdmissao),
        fracao: 0.35,
      },
      {
        rotulo: "Situação funcional",
        valor: servidor.situacao,
        fracao: 0.35,
      },
      {
        rotulo: "Tipo de vínculo",
        valor: servidor.vinculo,
        fracao: 0.3,
      },
    ]);

    desenharLinha([
      {
        rotulo: "Secretaria",
        valor: primeiroValor(
          servidor.secretaria,
          "SECRETARIA MUNICIPAL DE EDUCAÇÃO E ESPORTES",
        ).toUpperCase(),
        fracao: 0.5,
      },
      {
        rotulo: "Unidade/Local de exercício",
        valor: obterLocalServidor(servidor),
        fracao: 0.5,
      },
    ]);

    desenharLinha([
      {
        rotulo: "Cargo/Função",
        valor: servidor.cargo,
        fracao: 0.5,
      },
      {
        rotulo: "Habilitação",
        valor: servidor.habilitacao,
        fracao: 0.5,
      },
    ]);

    y += 16;

    doc.setDrawColor(90, 96, 110);

    doc.line(margem + 8, y, margem + 78, y);

    doc.line(larguraPagina - margem - 78, y, larguraPagina - margem - 8, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 75, 88);

    doc.text("SERVIDOR(A)", margem + 43, y + 4, {
      align: "center",
    });

    doc.text("RESPONSÁVEL PELA EMISSÃO", larguraPagina - margem - 43, y + 4, {
      align: "center",
    });

    const anoAtual = new Date().getFullYear();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 44, 54);

    doc.text(
      `Carpina, ______ de ____________________ de ${anoAtual}.`,
      larguraPagina / 2,
      y + 15,
      {
        align: "center",
      },
    );

    doc.setFontSize(6.5);
    doc.setTextColor(110, 115, 125);

    doc.text(
      "Secretaria de Educação e Esportes - Prefeitura Municipal de Carpina",
      larguraPagina / 2,
      alturaPagina - 10,
      {
        align: "center",
      },
    );

    const nomeArquivo = primeiroValor(servidor.nome, "Servidor")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    window.abrirOuBaixarPDF(doc, `Ficha Funcional - ${nomeArquivo}.pdf`);
  }

  const imgTimbrado = new Image();

  let finalizado = false;

  function finalizar(comTimbrado) {
    if (finalizado) return;

    finalizado = true;

    if (comTimbrado) {
      doc.addImage(imgTimbrado, "PNG", 0, 0, larguraPagina, alturaPagina);
    }

    desenharConteudo();
  }

  imgTimbrado.onload = () => {
    finalizar(true);
  };

  imgTimbrado.onerror = () => {
    finalizar(false);
  };

  imgTimbrado.src = "./src/images/papel-timbrado.png";
}

function gerarPDFTransferencia(dados) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("landscape", "mm", "a4");

  const larguraPagina = 297;
  const alturaPagina = 210;
  const margem = 15;
  const colunaLargura = larguraPagina / 2 - 25;

  const imgTimbrado = new Image();
  imgTimbrado.src = "./src/images/papel-timbrado.png";

  imgTimbrado.onload = () => {
    // Fundo
    doc.addImage(imgTimbrado, "PNG", 0, 0, larguraPagina / 2, alturaPagina);
    doc.addImage(
      imgTimbrado,
      "PNG",
      larguraPagina / 2,
      0,
      larguraPagina / 2,
      alturaPagina,
    );

    // Linha pontilhada central
    doc.setLineDash([1, 1]);
    doc.line(larguraPagina / 2, 10, larguraPagina / 2, alturaPagina - 10);
    doc.setLineDash([]);

    function desenharVia(xInicial) {
      let y = 35;

      // Título
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.text("ENCAMINHAMENTO", xInicial + colunaLargura / 2, y, {
        align: "center",
      });

      y += 14;
      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");

      doc.text("Da: SECRETARIA MUNICIPAL DE EDUCAÇÃO E ESPORTES", xInicial, y);
      y += 6;

      doc.text(`À Direção da: ${dados.novoLocal}`, xInicial, y);
      y += 8;

      doc.text(`Encaminhamos o(a) servidor(a): ${dados.nome}`, xInicial, y);

      y += 6;
      doc.text(
        `Matrícula: ${
          dados.codigo
        } para ser lotado(a) nesta Unidade de Ensino a partir de ${formatarDataBR(
          dados.dataTransferencia,
        )}.`,
        xInicial,
        y,
      );

      // Caixa servidor
      y += 10;
      doc.rect(xInicial, y, colunaLargura, 45);

      y += 7;
      doc.setFont("Helvetica", "bold");
      doc.text(
        "DADOS FUNCIONAIS DO SERVIDOR(A)",
        xInicial + colunaLargura / 2,
        y,
        {
          align: "center",
        },
      );

      y += 8;
      doc.setFont("Helvetica", "normal");
      doc.text(`VÍNCULO: ${dados.vinculo}`, xInicial + 5, y);

      y += 6;
      doc.text(`CARGO/FUNÇÃO: ${dados.cargo}`, xInicial + 5, y);

      y += 8;
      doc.text("HORÁRIO:", xInicial + 5, y);
      doc.text("[  ] Manhã    [  ] Tarde    [  ] Noite", xInicial + 40, y);

      y += 8;
      doc.text("OBS.:", xInicial + 5, y);

      if (dados.observacao) {
        const textoObs = doc.splitTextToSize(
          dados.observacao,
          colunaLargura - 10,
        );

        y += 6;
        doc.text(textoObs, xInicial + 5, y);
      }

      // Assinatura (subida)
      y = alturaPagina - 60;

      const dataGeracao = dados.criadoEm
        ? new Date(dados.criadoEm)
        : new Date();

      doc.text(
        `Carpina, ${dataGeracao.toLocaleDateString("pt-BR")}.`,
        xInicial + colunaLargura / 2,
        y,
        { align: "center" },
      );

      y += 15;
      doc.line(xInicial + 25, y, xInicial + colunaLargura - 25, y);

      y += 6;
      doc.setFontSize(9);
      doc.setFont("Helvetica", "bold");

      const nomeUsuario =
        dados.usuario || window.dadosUsuario?.nome || "USUÁRIO";

      doc.text(nomeUsuario.toUpperCase(), xInicial + colunaLargura / 2, y, {
        align: "center",
      });

      y += 4;

      doc.setFont("Helvetica", "normal");

      doc.text(
        "Secretaria Municipal de Educação e Esportes",
        xInicial + colunaLargura / 2,
        y,
        {
          align: "center",
        },
      );

      // Rodapé
      const protocolo = dados.protocolo;

      doc.setFontSize(7);
      doc.text(
        `Protocolo nº ${protocolo} gerado por ${nomeUsuario} em ${dataGeracao.toLocaleString(
          "pt-BR",
        )}`,
        xInicial + colunaLargura / 2,
        alturaPagina - 20,
        { align: "center" },
      );
    }

    // Duas vias
    desenharVia(10);
    desenharVia(larguraPagina / 2 + 5);

    window.abrirOuBaixarPDF(
      doc,
      `Encaminhamento de Servidor - ${dados.nome}.pdf`,
    );
  };
}
