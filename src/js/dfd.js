import { auth, db, rtdb } from "./firebaseConfig.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  ref,
  get,
  onValue,
  push,
  runTransaction,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const ANO_ATUAL = String(new Date().getFullYear());
const POR_PAGINA = 25;

let anoSelecionado = ANO_ATUAL;
let nomeResponsavel = "Usuário";
let todosDfds = [];
let paginaAtual = 1;
let editando = false;
let chaveEdicao = null;
let salvando = false;
let pararEscuta = null;

const formDfd = document.getElementById("formDfd");
const inputAssunto = document.getElementById("assuntoDfd");
const btnCadastrar = document.getElementById("btnCadastrarDfd");
const botoesEdicao = document.getElementById("botoesEdicao");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicaoDfd");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicaoDfd");
const msgEdicao = document.getElementById("msgEdicao");
const tabela = document.querySelector("#tabelaDfds tbody");
const contador = document.getElementById("contadorDfds");
const filtroAno = document.getElementById("filtroAnoDfd");
const inputBusca = document.getElementById("buscaDfd");
const paginacao = document.getElementById("paginacaoDfd");
const btnExportar = document.getElementById("btnExportarDfd");

function notificar(mensagem, tipo = "sucesso") {
  if (typeof window.mostrarNotificacao === "function") {
    window.mostrarNotificacao(mensagem, tipo);
    return;
  }

  alert(mensagem);
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escaparHtml(texto) {
  const elemento = document.createElement("div");
  elemento.textContent = texto ?? "";
  return elemento.innerHTML;
}

function formatarNumero(numero, ano = anoSelecionado) {
  const valor = Number(numero);
  if (!Number.isFinite(valor) || valor <= 0) return "-";
  return `${String(valor).padStart(3, "0")}/${ano}`;
}

function getDfdsRef(ano = anoSelecionado) {
  return ref(rtdb, `dfds/${ano}`);
}

function podeAlterar(dfd) {
  return (
    !dfd.responsavel ||
    dfd.responsavel === nomeResponsavel ||
    nomeResponsavel === "Raphael"
  );
}

function obterFiltrados() {
  const termo = normalizarTexto(inputBusca?.value);

  return todosDfds.filter((dfd) => {
    const texto = normalizarTexto(
      `${dfd.numero || ""} ${formatarNumero(dfd.numero)} ${dfd.assunto || ""}`,
    );

    return texto.includes(termo);
  });
}

function renderizarPaginacao(totalPaginas) {
  paginacao.innerHTML = "";

  if (totalPaginas <= 1) return;

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

  const inicio = Math.max(1, paginaAtual - 2);
  const fim = Math.min(totalPaginas, inicio + 9);

  for (let numero = inicio; numero <= fim; numero++) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = numero;

    if (numero === paginaAtual) botao.classList.add("ativo");

    botao.addEventListener("click", () => {
      paginaAtual = numero;
      renderTabela();
    });

    paginacao.appendChild(botao);
  }

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

function renderTabela() {
  const filtrados = obterFiltrados();
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);

  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas || 1;

  contador.textContent = `${filtrados.length} DFD${filtrados.length === 1 ? "" : "s"} encontrado${filtrados.length === 1 ? "" : "s"}`;

  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const registros = filtrados.slice(inicio, inicio + POR_PAGINA);

  if (!registros.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center;">
          Nenhum DFD encontrado.
        </td>
      </tr>
    `;
    renderizarPaginacao(0);
    return;
  }

  tabela.innerHTML = registros
    .map(
      (dfd) => `
        <tr data-key="${escaparHtml(dfd._key)}">
          <td>${formatarNumero(dfd.numero)}</td>

          <td class="assunto">
            ${escaparHtml(dfd.assunto || "-")}
          </td>

          <td>
            <div>
              ${
                podeAlterar(dfd)
                  ? `
                    <button
                      class="edit-btn"
                      type="button"
                      title="Editar DFD"
                      data-acao="editar"
                    >
                      <span class="material-symbols-outlined">edit_note</span>
                    </button>

                    <button
                      class="cancel-btn"
                      type="button"
                      title="Cancelar DFD"
                      data-acao="cancelar"
                    >
                      <span class="material-symbols-outlined">cancel</span>
                    </button>
                  `
                  : ""
              }
            </div>
          </td>
        </tr>
      `,
    )
    .join("");

  renderizarPaginacao(totalPaginas);
}

function resetarEdicao() {
  editando = false;
  chaveEdicao = null;
  formDfd.reset();
  btnCadastrar.style.display = "inline-flex";
  botoesEdicao.style.display = "none";
  msgEdicao.style.display = "none";
  msgEdicao.innerHTML = "";
  inputAssunto.focus();
}

async function cadastrarDfd() {
  const assunto = inputAssunto.value.trim();

  if (!assunto) {
    notificar("Informe o assunto do DFD.", "erro");
    inputAssunto.focus();
    return;
  }

  const registroRef = push(getDfdsRef(ANO_ATUAL));
  const chave = registroRef.key;

  if (!chave) {
    throw new Error("Não foi possível gerar o registro do DFD.");
  }

  let numeroGerado = 0;
  const agora = new Date().toISOString();

  const resultado = await runTransaction(getDfdsRef(ANO_ATUAL), (dadosAtuais) => {
    const dados = dadosAtuais || {};

    const maiorNumero = Object.values(dados).reduce((maior, item) => {
      const numero = Number(item?.numero || 0);
      return numero > maior ? numero : maior;
    }, 0);

    numeroGerado = maiorNumero + 1;

    dados[chave] = {
      numero: numeroGerado,
      assunto,
      responsavel: nomeResponsavel,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    return dados;
  });

  if (!resultado.committed) {
    throw new Error("Não foi possível reservar a numeração do DFD.");
  }

  notificar(`DFD nº ${formatarNumero(numeroGerado, ANO_ATUAL)} cadastrado com sucesso!`);
  formDfd.reset();
  inputAssunto.focus();
}

formDfd?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (editando) {
    btnSalvarEdicao.click();
    return;
  }

  if (salvando) return;

  salvando = true;
  btnCadastrar.disabled = true;
  const conteudoOriginal = btnCadastrar.innerHTML;

  btnCadastrar.innerHTML = `
    <span class="material-symbols-outlined">hourglass_top</span>
    Salvando...
  `;

  try {
    await cadastrarDfd();
  } catch (erro) {
    console.error("Erro ao cadastrar DFD:", erro);
    notificar(erro.message || "Não foi possível cadastrar o DFD.", "erro");
  } finally {
    salvando = false;
    btnCadastrar.disabled = false;
    btnCadastrar.innerHTML = conteudoOriginal;
  }
});

function iniciarEdicao(dfd) {
  editando = true;
  chaveEdicao = dfd._key;
  inputAssunto.value = dfd.assunto || "";
  btnCadastrar.style.display = "none";
  botoesEdicao.style.display = "flex";

  msgEdicao.innerHTML = `
    <div class="edicao-oficio-info">
      <span class="material-symbols-outlined">edit_note</span>
      <div>
        <strong>Editando DFD nº ${formatarNumero(dfd.numero)}</strong>
        <span>Altere o assunto e salve.</span>
      </div>
    </div>
  `;

  msgEdicao.style.display = "block";
  document.getElementById("btnTopo")?.click();
  inputAssunto.focus();
}

btnSalvarEdicao?.addEventListener("click", async () => {
  if (!editando || !chaveEdicao) return;

  const assunto = inputAssunto.value.trim();

  if (!assunto) {
    notificar("Informe o assunto do DFD.", "erro");
    return;
  }

  btnSalvarEdicao.disabled = true;

  try {
    await update(ref(rtdb, `dfds/${anoSelecionado}/${chaveEdicao}`), {
      assunto,
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: nomeResponsavel,
    });

    notificar("DFD atualizado com sucesso!");
    resetarEdicao();
  } catch (erro) {
    console.error("Erro ao editar DFD:", erro);
    notificar("Não foi possível atualizar o DFD.", "erro");
  } finally {
    btnSalvarEdicao.disabled = false;
  }
});

btnCancelarEdicao?.addEventListener("click", resetarEdicao);

async function cancelarDfd(dfd) {
  if (normalizarTexto(dfd.assunto) === "cancelado") {
    notificar("Este DFD já está cancelado.", "erro");
    return;
  }

  const confirmou = await window.mostrarConfirmacao({
    titulo: "Cancelar DFD",
    mensagem:
      `Deseja cancelar o DFD nº ${formatarNumero(dfd.numero)}?\n\n` +
      "A numeração será preservada e o assunto ficará como CANCELADO.",
    tipo: "perigo",
    textoConfirmar: "Cancelar DFD",
    textoCancelar: "Voltar",
  });

  if (!confirmou) return;

  try {
    await update(ref(rtdb, `dfds/${anoSelecionado}/${dfd._key}`), {
      assunto: "CANCELADO",
      assuntoAnterior: dfd.assunto || "",
      cancelado: true,
      canceladoEm: new Date().toISOString(),
      canceladoPor: nomeResponsavel,
      atualizadoEm: new Date().toISOString(),
    });

    notificar("DFD cancelado. A numeração foi preservada.");
  } catch (erro) {
    console.error("Erro ao cancelar DFD:", erro);
    notificar("Não foi possível cancelar o DFD.", "erro");
  }
}

tabela?.addEventListener("click", (event) => {
  const botao = event.target.closest("button[data-acao]");
  if (!botao) return;

  const linha = botao.closest("tr[data-key]");
  const dfd = todosDfds.find((item) => item._key === linha?.dataset.key);

  if (!dfd) {
    notificar("DFD não localizado.", "erro");
    return;
  }

  if (botao.dataset.acao === "editar") iniciarEdicao(dfd);
  if (botao.dataset.acao === "cancelar") cancelarDfd(dfd);
});

function carregarDfds() {
  if (typeof pararEscuta === "function") pararEscuta();

  tabela.innerHTML = `
    <tr>
      <td colspan="3" style="text-align:center;">
        Carregando...
      </td>
    </tr>
  `;

  pararEscuta = onValue(
    getDfdsRef(),
    (snapshot) => {
      todosDfds = snapshot.exists()
        ? Object.entries(snapshot.val())
            .filter(([, dados]) => dados && typeof dados === "object")
            .map(([key, dados]) => ({ _key: key, ...dados }))
            .sort((a, b) => Number(b.numero || 0) - Number(a.numero || 0))
        : [];

      renderTabela();
    },
    (erro) => {
      console.error("Erro ao carregar DFDs:", erro);
      tabela.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center;">
            Não foi possível carregar os DFDs.
          </td>
        </tr>
      `;
      notificar("Não foi possível carregar os DFDs.", "erro");
    },
  );
}

async function carregarAnos() {
  try {
    const snapshot = await get(ref(rtdb, "dfds"));
    const anos = snapshot.exists()
      ? Object.keys(snapshot.val()).filter((ano) => /^\d{4}$/.test(ano))
      : [];

    if (!anos.includes(ANO_ATUAL)) anos.push(ANO_ATUAL);

    anos.sort((a, b) => Number(b) - Number(a));

    filtroAno.innerHTML = anos
      .map((ano) => `<option value="${ano}">${ano}</option>`)
      .join("");

    filtroAno.value = anoSelecionado;
  } catch (erro) {
    console.error("Erro ao carregar anos dos DFDs:", erro);
    filtroAno.innerHTML = `<option value="${ANO_ATUAL}">${ANO_ATUAL}</option>`;
  }

  carregarDfds();
}

filtroAno?.addEventListener("change", () => {
  anoSelecionado = filtroAno.value;
  paginaAtual = 1;
  resetarEdicao();
  carregarDfds();
});

inputBusca?.addEventListener("input", () => {
  paginaAtual = 1;
  renderTabela();
});

btnExportar?.addEventListener("click", () => {
  if (typeof window.XLSX === "undefined") {
    notificar("A biblioteca de exportação não foi carregada.", "erro");
    return;
  }

  const registros = [...obterFiltrados()].sort(
    (a, b) => Number(a.numero || 0) - Number(b.numero || 0),
  );

  if (!registros.length) {
    notificar("Nenhum DFD encontrado para exportar.", "erro");
    return;
  }

  const dados = registros.map((dfd) => ({
    Número: formatarNumero(dfd.numero),
    Assunto: dfd.assunto || "",
  }));

  const planilha = window.XLSX.utils.json_to_sheet(dados);
  const arquivo = window.XLSX.utils.book_new();

  window.XLSX.utils.book_append_sheet(arquivo, planilha, "DFDs");
  window.XLSX.writeFile(arquivo, `dfds_${anoSelecionado}.xlsx`);
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./login";
    return;
  }

  try {
    const cache = JSON.parse(localStorage.getItem("usuarioCache") || "null");
    if (cache?.nome) nomeResponsavel = cache.nome.split(" ")[0];
  } catch (erro) {
    console.error("Erro ao ler usuário em cache:", erro);
  }

  try {
    const snapshot = await getDoc(doc(db, "usuarios", user.uid));

    if (snapshot.exists()) {
      nomeResponsavel = snapshot.data().nome?.split(" ")[0] || nomeResponsavel;
    } else if (user.displayName) {
      nomeResponsavel = user.displayName.split(" ")[0];
    }
  } catch (erro) {
    console.error("Erro ao identificar usuário:", erro);
  }

  renderTabela();
});

botoesEdicao.style.display = "none";
carregarAnos();
