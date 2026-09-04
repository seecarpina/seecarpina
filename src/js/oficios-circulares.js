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
let todosCirculares = [];
let paginaAtual = 1;
let editando = false;
let chaveEdicao = null;
let salvando = false;
let pararEscuta = null;

const formCircular = document.getElementById("formCircular");
const inputAssunto = document.getElementById("assuntoCircular");
const btnCadastrar = document.getElementById("btnCadastrarCircular");
const botoesEdicao = document.getElementById("botoesEdicao");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicaoCircular");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicaoCircular");
const msgEdicao = document.getElementById("msgEdicao");
const tabela = document.querySelector("#tabelaCirculares tbody");
const contador = document.getElementById("contadorCirculares");
const filtroAno = document.getElementById("filtroAnoCircular");
const inputBusca = document.getElementById("buscaCircular");
const paginacao = document.getElementById("paginacaoCircular");
const btnExportar = document.getElementById("btnExportarCircular");

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

function getCircularesRef(ano = anoSelecionado) {
  return ref(rtdb, `oficiosCirculares/${ano}`);
}

function podeAlterar(circular) {
  return (
    !circular.responsavel ||
    circular.responsavel === nomeResponsavel ||
    nomeResponsavel === "Raphael"
  );
}

function obterFiltrados() {
  const termo = normalizarTexto(inputBusca?.value);

  return todosCirculares.filter((circular) => {
    const texto = normalizarTexto(
      `${circular.numero || ""} ${formatarNumero(circular.numero)} ${circular.assunto || ""}`,
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

  contador.textContent = `${filtrados.length} Ofício Circular${filtrados.length === 1 ? "" : "s"} encontrado${filtrados.length === 1 ? "" : "s"}`;

  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const registros = filtrados.slice(inicio, inicio + POR_PAGINA);

  if (!registros.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center;">
          Nenhum Ofício Circular encontrado.
        </td>
      </tr>
    `;
    renderizarPaginacao(0);
    return;
  }

  tabela.innerHTML = registros
    .map(
      (circular) => `
        <tr data-key="${escaparHtml(circular._key)}">
          <td>${formatarNumero(circular.numero)}</td>

          <td class="assunto">
            ${escaparHtml(circular.assunto || "-")}
          </td>

          <td>
            <div>
              ${
                podeAlterar(circular)
                  ? `
                    <button
                      class="edit-btn"
                      type="button"
                      title="Editar Ofício Circular"
                      data-acao="editar"
                    >
                      <span class="material-symbols-outlined">edit_note</span>
                    </button>

                    <button
                      class="cancel-btn"
                      type="button"
                      title="Cancelar Ofício Circular"
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
  formCircular.reset();
  btnCadastrar.style.display = "inline-flex";
  botoesEdicao.style.display = "none";
  msgEdicao.style.display = "none";
  msgEdicao.innerHTML = "";
  inputAssunto.focus();
}

async function cadastrarCircular() {
  const assunto = inputAssunto.value.trim();

  if (!assunto) {
    notificar("Informe o assunto do Ofício Circular.", "erro");
    inputAssunto.focus();
    return;
  }

  const registroRef = push(getCircularesRef(ANO_ATUAL));
  const chave = registroRef.key;

  if (!chave) {
    throw new Error("Não foi possível gerar o registro do Ofício Circular.");
  }

  let numeroGerado = 0;
  const agora = new Date().toISOString();

  const resultado = await runTransaction(getCircularesRef(ANO_ATUAL), (dadosAtuais) => {
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
    throw new Error("Não foi possível reservar a numeração do Ofício Circular.");
  }

  notificar(`Ofício Circular nº ${formatarNumero(numeroGerado, ANO_ATUAL)} cadastrado com sucesso!`);
  formCircular.reset();
  inputAssunto.focus();
}

formCircular?.addEventListener("submit", async (event) => {
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
    await cadastrarCircular();
  } catch (erro) {
    console.error("Erro ao cadastrar Ofício Circular:", erro);
    notificar(erro.message || "Não foi possível cadastrar o Ofício Circular.", "erro");
  } finally {
    salvando = false;
    btnCadastrar.disabled = false;
    btnCadastrar.innerHTML = conteudoOriginal;
  }
});

function iniciarEdicao(circular) {
  editando = true;
  chaveEdicao = circular._key;
  inputAssunto.value = circular.assunto || "";
  btnCadastrar.style.display = "none";
  botoesEdicao.style.display = "flex";

  msgEdicao.innerHTML = `
    <div class="edicao-oficio-info">
      <span class="material-symbols-outlined">edit_note</span>
      <div>
        <strong>Editando Ofício Circular nº ${formatarNumero(circular.numero)}</strong>
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
    notificar("Informe o assunto do Ofício Circular.", "erro");
    return;
  }

  btnSalvarEdicao.disabled = true;

  try {
    await update(ref(rtdb, `oficiosCirculares/${anoSelecionado}/${chaveEdicao}`), {
      assunto,
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: nomeResponsavel,
    });

    notificar("Ofício Circular atualizado com sucesso!");
    resetarEdicao();
  } catch (erro) {
    console.error("Erro ao editar Ofício Circular:", erro);
    notificar("Não foi possível atualizar o Ofício Circular.", "erro");
  } finally {
    btnSalvarEdicao.disabled = false;
  }
});

btnCancelarEdicao?.addEventListener("click", resetarEdicao);

async function cancelarCircular(circular) {
  if (normalizarTexto(circular.assunto) === "cancelado") {
    notificar("Este Ofício Circular já está cancelado.", "erro");
    return;
  }

  const confirmou = await window.mostrarConfirmacao({
    titulo: "Cancelar Ofício Circular",
    mensagem:
      `Deseja cancelar o Ofício Circular nº ${formatarNumero(circular.numero)}?\n\n` +
      "A numeração será preservada e o assunto ficará como CANCELADO.",
    tipo: "perigo",
    textoConfirmar: "Cancelar Ofício Circular",
    textoCancelar: "Voltar",
  });

  if (!confirmou) return;

  try {
    await update(ref(rtdb, `oficiosCirculares/${anoSelecionado}/${circular._key}`), {
      assunto: "CANCELADO",
      assuntoAnterior: circular.assunto || "",
      cancelado: true,
      canceladoEm: new Date().toISOString(),
      canceladoPor: nomeResponsavel,
      atualizadoEm: new Date().toISOString(),
    });

    notificar("Ofício Circular cancelado. A numeração foi preservada.");
  } catch (erro) {
    console.error("Erro ao cancelar Ofício Circular:", erro);
    notificar("Não foi possível cancelar o Ofício Circular.", "erro");
  }
}

tabela?.addEventListener("click", (event) => {
  const botao = event.target.closest("button[data-acao]");
  if (!botao) return;

  const linha = botao.closest("tr[data-key]");
  const circular = todosCirculares.find((item) => item._key === linha?.dataset.key);

  if (!circular) {
    notificar("Ofício Circular não localizado.", "erro");
    return;
  }

  if (botao.dataset.acao === "editar") iniciarEdicao(circular);
  if (botao.dataset.acao === "cancelar") cancelarCircular(circular);
});

function carregarCirculares() {
  if (typeof pararEscuta === "function") pararEscuta();

  tabela.innerHTML = `
    <tr>
      <td colspan="3" style="text-align:center;">
        Carregando...
      </td>
    </tr>
  `;

  pararEscuta = onValue(
    getCircularesRef(),
    (snapshot) => {
      todosCirculares = snapshot.exists()
        ? Object.entries(snapshot.val())
            .filter(([, dados]) => dados && typeof dados === "object")
            .map(([key, dados]) => ({ _key: key, ...dados }))
            .sort((a, b) => Number(b.numero || 0) - Number(a.numero || 0))
        : [];

      renderTabela();
    },
    (erro) => {
      console.error("Erro ao carregar Ofícios Circulares:", erro);
      tabela.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center;">
            Não foi possível carregar os Ofícios Circulares.
          </td>
        </tr>
      `;
      notificar("Não foi possível carregar os Ofícios Circulares.", "erro");
    },
  );
}

async function carregarAnos() {
  try {
    const snapshot = await get(ref(rtdb, "oficiosCirculares"));
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
    console.error("Erro ao carregar anos dos Ofícios Circulares:", erro);
    filtroAno.innerHTML = `<option value="${ANO_ATUAL}">${ANO_ATUAL}</option>`;
  }

  carregarCirculares();
}

filtroAno?.addEventListener("change", () => {
  anoSelecionado = filtroAno.value;
  paginaAtual = 1;
  resetarEdicao();
  carregarCirculares();
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
    notificar("Nenhum Ofício Circular encontrado para exportar.", "erro");
    return;
  }

  const dados = registros.map((circular) => ({
    Número: formatarNumero(circular.numero),
    Assunto: circular.assunto || "",
  }));

  const planilha = window.XLSX.utils.json_to_sheet(dados);
  const arquivo = window.XLSX.utils.book_new();

  window.XLSX.utils.book_append_sheet(arquivo, planilha, "Ofícios Circulares");
  window.XLSX.writeFile(arquivo, `oficios-circulares_${anoSelecionado}.xlsx`);
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
