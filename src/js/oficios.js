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

let todosOficios = [];
let destinos = [];

let paginaAtual = 1;
const porPagina = 25;

let editando = false;
let chaveEdicao = null;

let pararEscutaOficios = null;

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

    renderTabela();
  } catch (erro) {
    console.error("Erro ao identificar responsável:", erro);

    nomeResponsavel = user.displayName?.split(" ")[0] || "Usuário";

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

/* =========================================
   DESTINOS E AUTOCOMPLETE
========================================= */

onValue(destinosRef, (snapshot) => {
  destinos = snapshot.exists()
    ? [
        ...new Set(
          Object.values(snapshot.val())
            .filter(Boolean)
            .map((destino) => padronizarTexto(destino)),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR"))
    : [];
});

function mostrarSugestoes(input, lista, box) {
  if (!input || !box) return;

  const termo = normalizarTexto(input.value);

  box.innerHTML = "";

  if (!termo) {
    box.style.display = "none";
    return;
  }

  const filtrados = lista.filter((item) =>
    normalizarTexto(item).includes(termo),
  );

  if (!filtrados.length) {
    box.style.display = "none";
    return;
  }

  filtrados.forEach((item) => {
    const li = document.createElement("li");

    li.textContent = item;

    li.addEventListener("click", () => {
      input.value = item;
      box.style.display = "none";
    });

    box.appendChild(li);
  });

  box.style.display = "block";
}

inputDestino?.addEventListener("input", () => {
  mostrarSugestoes(inputDestino, destinos, boxDestino);
});

inputCopia?.addEventListener("input", () => {
  mostrarSugestoes(inputCopia, destinos, boxCopia);
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
      destino,
      copia,
      responsavel: nomeResponsavel,
      criadoEm: new Date().toISOString(),
    });

    if (
      destino &&
      !destinos.some(
        (item) => normalizarTexto(item) === normalizarTexto(destino),
      )
    ) {
      await push(destinosRef, destino);
    }

    if (
      copia &&
      !destinos.some((item) => normalizarTexto(item) === normalizarTexto(copia))
    ) {
      await push(destinosRef, copia);
    }

    notificar(`Ofício nº ${numeroGerado} cadastrado com sucesso!`);

    formOficio.reset();

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

  let filtrados = todosOficios.filter((oficio) => {
    const texto = normalizarTexto(`
        ${oficio.numero || ""}
        ${formatarNumeroOficio(oficio.numero, anoSelecionado)}
        ${oficio.assunto || ""}
        ${oficio.data || ""}
        ${formatarDataBR(oficio.data)}
        ${oficio.destino || ""}
        ${oficio.copia || ""}
        ${oficio.responsavel || ""}
      `);

    return texto.includes(termo);
  });

  if (filtroDisponiveis?.checked) {
    filtrados = filtrados.filter(oficioDisponivel);
  }

  return filtrados;
}

/* =========================================
   RENDERIZAÇÃO DA TABELA
========================================= */

function renderTabela() {
  if (!tabela) return;

  const filtrados = obterOficiosFiltrados();

  if (contadorOficios) {
    const total = filtrados.length;

    contadorOficios.textContent =
      `${total} ofício${total === 1 ? "" : "s"} ` +
      `encontrado${total === 1 ? "" : "s"}`;
  }

  const totalPaginas = Math.ceil(filtrados.length / porPagina);

  if (paginaAtual > totalPaginas) {
    paginaAtual = totalPaginas || 1;
  }

  const inicio = (paginaAtual - 1) * porPagina;

  const pagina = filtrados.slice(inicio, inicio + porPagina);

  tabela.innerHTML = "";

  if (!pagina.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;">
          <svg
        class="svg-spinner"
        viewBox="0 0 50 50"
        role="img"
        aria-label="Carregando"
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

    renderizarPaginacao(0);
    return;
  }

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
        ${escaparHtml(oficio.destino || "-")}
      </td>

      <td>
        ${escaparHtml(oficio.copia || "-")}
      </td>

      <td>
        ${escaparHtml(oficio.responsavel || "-")}
      </td>

      <td>
        <div>
          <label
            class="icon-btn upload-btn"
            title="Enviar PDF"
          >
            <input
              type="file"
              accept="application/pdf"
              hidden
              class="input-pdf"
            />

            <span class="material-symbols-outlined">
              upload_file
            </span>
          </label>

          <button
            class="icon-btn view-btn"
            type="button"
            title="Visualizar PDF"
            ${oficio.pdf ? "" : "disabled"}
          >
            <span class="material-symbols-outlined">
              picture_as_pdf
            </span>
          </button>

          ${
            podeEditar
              ? `
                <button
                  class="edit-btn"
                  type="button"
                  title="Editar ofício"
                >
                  <span class="material-symbols-outlined">
                    edit_square
                  </span>
                </button>

                <button
                  class="cancel-btn"
                  type="button"
                  title="Cancelar ofício"
                >
                  <span class="material-symbols-outlined">
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

  if (
    normalizarTexto(assunto).includes("processo") &&
    normalizarTexto(oficio.copia) === "sistema carpina digital"
  ) {
    const correspondencia = assunto.match(/processo\s*(?:n[º°o.]*)?\s*(\d+)/i);

    if (correspondencia?.[1]) {
      const numeroProcesso = correspondencia[1];

      const link =
        "https://digital.carpina.pe.gov.br/" +
        `app/processos/manage/${numeroProcesso}`;

      return `
        <a
          href="${link}"
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir processo"
        >
          ${assuntoEscapado}

          <span class="material-symbols-outlined">
            link_2
          </span>
        </a>
      `;
    }
  }

  return assuntoEscapado;
}

/* =========================================
   PAGINAÇÃO
========================================= */

function renderizarPaginacao(totalPaginas) {
  if (!paginacao) return;

  paginacao.innerHTML = "";

  if (totalPaginas <= 1) return;

  const maxPaginasVisiveis = 10;

  let inicioPagina = Math.max(1, paginaAtual - 2);

  let fimPagina = Math.min(totalPaginas, inicioPagina + maxPaginasVisiveis - 1);

  if (fimPagina - inicioPagina + 1 < maxPaginasVisiveis) {
    inicioPagina = Math.max(1, fimPagina - maxPaginasVisiveis + 1);
  }

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

  const btnVisualizar = event.target.closest(".view-btn");

  if (btnEditar) {
    iniciarEdicao(oficio);
    return;
  }

  if (btnCancelar) {
    await cancelarOficio(oficio);
    return;
  }

  if (btnVisualizar) {
    visualizarPdf(oficio);
  }
});

tabela?.addEventListener("change", async (event) => {
  const inputArquivo = event.target.closest(".input-pdf");

  if (!inputArquivo) return;

  const linha = inputArquivo.closest("tr");

  const chave = linha?.dataset.key;

  if (!chave) return;

  const arquivo = inputArquivo.files?.[0];

  if (!arquivo) return;

  if (arquivo.type !== "application/pdf") {
    notificar("Envie apenas arquivos PDF.", "erro");

    inputArquivo.value = "";
    return;
  }

  await enviarPdf(chave, arquivo);

  inputArquivo.value = "";
});

/* =========================================
   EDIÇÃO
========================================= */

function iniciarEdicao(oficio) {
  editando = true;
  chaveEdicao = oficio._key;

  inputAssunto.value = oficio.assunto || "";
  inputDestino.value = oficio.destino || "";
  inputCopia.value = oficio.copia || "";

  btnCadastrar.style.display = "none";
  botoesEdicao.style.display = "flex";

  msgEdicao.textContent = `✏️ Editando ofício nº ${formatarNumeroOficio(
    oficio.numero,
    anoSelecionado,
  )}`;

  msgEdicao.style.display = "block";

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  inputAssunto.focus();
}

btnSalvarEdicao?.addEventListener("click", async () => {
  if (!editando || !chaveEdicao) {
    notificar("Erro ao localizar o ofício.", "erro");

    return;
  }

  const assunto = inputAssunto.value.trim();

  const destino = padronizarTexto(inputDestino.value);

  const copia = padronizarTexto(inputCopia.value);

  if (!assunto) {
    notificar("Preencha o campo de assunto.", "erro");

    return;
  }

  if (!destino) {
    notificar("Informe o destino.", "erro");

    return;
  }

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
      destino,
      copia,
      numero: oficioOriginal.numero,
      data: oficioOriginal.data,
      responsavel: oficioOriginal.responsavel?.trim()
        ? oficioOriginal.responsavel
        : nomeResponsavel,
      atualizadoEm: new Date().toISOString(),
    });

    if (
      destino &&
      !destinos.some(
        (item) => normalizarTexto(item) === normalizarTexto(destino),
      )
    ) {
      await push(destinosRef, destino);
    }

    if (
      copia &&
      !destinos.some((item) => normalizarTexto(item) === normalizarTexto(copia))
    ) {
      await push(destinosRef, copia);
    }

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
  const confirmou = confirm(
    `Tem certeza que deseja cancelar o ofício nº ` +
      `${formatarNumeroOficio(oficio.numero, anoSelecionado)}?`,
  );

  if (!confirmou) return;

  try {
    await update(ref(rtdb, `oficios/${anoSelecionado}/${oficio._key}`), {
      assunto: "",
      destino: "",
      copia: "",
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
   PDF
========================================= */

async function enviarPdf(chave, arquivo) {
  try {
    const base64 = await arquivoParaBase64(arquivo);

    await update(ref(rtdb, `oficios/${anoSelecionado}/${chave}`), {
      pdf: base64,
      pdfAtualizadoEm: new Date().toISOString(),
    });

    notificar("PDF enviado com sucesso!");
  } catch (erro) {
    console.error("Erro ao enviar PDF:", erro);

    notificar("Erro ao enviar o PDF.", "erro");
  }
}

function arquivoParaBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = () => {
      const resultado = String(leitor.result);

      resolve(resultado.split(",")[1]);
    };

    leitor.onerror = () => {
      reject(new Error("Não foi possível ler o arquivo."));
    };

    leitor.readAsDataURL(arquivo);
  });
}

function visualizarPdf(oficio) {
  if (!oficio.pdf) return;

  try {
    const caracteres = atob(oficio.pdf);

    const numeros = new Uint8Array(caracteres.length);

    for (let indice = 0; indice < caracteres.length; indice++) {
      numeros[indice] = caracteres.charCodeAt(indice);
    }

    const blob = new Blob([numeros], {
      type: "application/pdf",
    });

    const url = URL.createObjectURL(blob);

    window.open(url, "_blank");

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  } catch (erro) {
    console.error("Erro ao abrir o PDF:", erro);

    notificar("Não foi possível abrir o PDF.", "erro");
  }
}

/* =========================================
   ANOS
========================================= */

async function carregarAnosDisponiveis() {
  if (!filtroAno) return;

  try {
    const snapshot = await get(ref(rtdb, "oficios"));

    const anos = snapshot.exists()
      ? Object.keys(snapshot.val())
          .filter((ano) => /^\d{4}$/.test(ano))
          .sort((a, b) => Number(b) - Number(a))
      : [];

    if (!anos.includes(ANO_ATUAL)) {
      anos.unshift(ANO_ATUAL);
    }

    filtroAno.innerHTML = "";

    anos.forEach((ano) => {
      const option = document.createElement("option");

      option.value = ano;
      option.textContent = ano;
      option.selected = ano === ANO_ATUAL;

      filtroAno.appendChild(option);
    });

    anoSelecionado = filtroAno.value || ANO_ATUAL;

    carregarOficiosPorAno();
  } catch (erro) {
    console.error("Erro ao carregar anos:", erro);

    filtroAno.innerHTML = `
      <option value="${ANO_ATUAL}">
        ${ANO_ATUAL}
      </option>
    `;

    anoSelecionado = ANO_ATUAL;

    carregarOficiosPorAno();
  }
}

filtroAno?.addEventListener("change", () => {
  anoSelecionado = filtroAno.value;
  paginaAtual = 1;

  resetarFormularioEdicao();
  carregarOficiosPorAno();
});

/* =========================================
   CARREGAMENTO POR ANO
========================================= */

function carregarOficiosPorAno() {
  if (typeof pararEscutaOficios === "function") {
    pararEscutaOficios();
  }

  if (tabela) {
    tabela.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;">
          <svg class="svg-spinner" viewBox="0 0 50 50">
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
  }

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

      renderTabela();
    },
    (erro) => {
      console.error("Erro ao carregar ofícios:", erro);

      tabela.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;">
            Não foi possível carregar os ofícios.
          </td>
        </tr>
      `;

      notificar("Erro ao carregar os ofícios.", "erro");
    },
  );
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
    Destino: oficio.destino || "",
    Cópia: oficio.copia || "",
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
