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

const form = document.getElementById("formServidor");

const blocoCadastro = document.getElementById("botoesCadastroServidor");
const blocoEdicao = document.getElementById("botoesEdicaoServidor");
const msgEdicao = document.getElementById("msgEdicao");

const btnSalvarEdicao = document.getElementById("btnSalvarServidor");
const btnCancelar = document.getElementById("btnCancelarServidor");

const inputCargo = document.getElementById("cargo");
const inputVinculo = document.getElementById("vinculo");
const inputLocal = document.getElementById("localExercicio");

const boxCargo = document.getElementById("autocompleteCargo");
const boxVinculo = document.getElementById("autocompleteVinculo");
const boxLocal = document.getElementById("autocompleteLocal");

const contadorServidores = document.getElementById("contadorServidores");

/* ===============================
   FIREBASE
================================ */
const registrosRef = ref(rtdb, "servidores/registros");
const cargosRef = ref(rtdb, "servidores/cargos");
const vinculosRef = ref(rtdb, "servidores/vinculos");
const locaisRef = ref(rtdb, "servidores/locaisExercicio");

/* ===============================
   VARIÁVEIS
================================ */
let servidores = [];
let paginaAtual = 1;
const itensPorPagina = 100;
let editando = false;
let chaveEdicao = null;

let cargos = [];
let vinculos = [];
let locais = [];

onValue(cargosRef, (s) => {
  cargos = s.exists() ? Object.values(s.val()).map(padronizarTexto) : [];
});

onValue(vinculosRef, (s) => {
  vinculos = s.exists() ? Object.values(s.val()).map(padronizarTexto) : [];
});

onValue(locaisRef, (s) => {
  locais = s.exists() ? Object.values(s.val()).map(padronizarTexto) : [];
});

/* ===============================
   UTILITÁRIOS
================================ */
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

inputCargo.addEventListener("input", () =>
  mostrarSugestoes(inputCargo, cargos, boxCargo),
);

inputVinculo.addEventListener("input", () =>
  mostrarSugestoes(inputVinculo, vinculos, boxVinculo),
);

inputLocal.addEventListener("input", () =>
  mostrarSugestoes(inputLocal, locais, boxLocal),
);

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
   RENDER TABELA
================================ */
function renderTabela() {
  tabela.innerHTML = "";

  const termo = busca.value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const filtrados = servidores
    .filter((s) =>
      `${s.codigo} ${s.nome} ${s.cpf} ${s.cargo} ${s.vinculo} ${s.localExercicio}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(termo),
    )
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

    <td>${s.localExercicio || "-"}</td>

    <td>
      <div class="acoes-servidor">
        <button
          class="edit-btn"
          type="button"
          title="Editar servidor"
        >
          <span class="material-symbols-outlined">
            edit_note
          </span>
        </button>

        <button
          class="transfer-btn"
          type="button"
          title="Transferir servidor"
        >
          <span class="material-symbols-outlined">
            transfer_within_a_station
          </span>
        </button>
      </div>
    </td>
  `;

      tr.querySelector(".edit-btn").addEventListener("click", () => {
        editarServidor(s);
      });

      tr.querySelector(".transfer-btn").addEventListener("click", () => {
        abrirTransferencia(s);
      });

      tabela.appendChild(tr);
    });
  }

  renderPaginacao(totalPaginas);
}

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
  const servidor = {
    codigo: codigo.value.trim(),
    nome: padronizarTexto(nome.value),
    cpf: cpf.value.replace(/\D/g, ""),
    cargo: padronizarTexto(cargo.value),
    vinculo: padronizarTexto(vinculo.value),
    localExercicio: padronizarTexto(localExercicio.value),
    dataAdmissao: dataAdmissao.value,
    situacao: situacao.value,
  };

  if (!servidor.codigo || !servidor.nome) return;

  await salvarSeNaoExistir(cargosRef, servidor.cargo);
  await salvarSeNaoExistir(vinculosRef, servidor.vinculo);
  await salvarSeNaoExistir(locaisRef, servidor.localExercicio);

  if (editando && chaveEdicao) {
    await update(ref(rtdb, `servidores/registros/${chaveEdicao}`), servidor);
    mostrarNotificacao("Servidor atualizado com sucesso");
  } else {
    await push(registrosRef, servidor);
    mostrarNotificacao("Servidor cadastrado com sucesso");
  }

  resetarFormulario();
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
  vinculo.value = s.vinculo;
  localExercicio.value = s.localExercicio;
  dataAdmissao.value = s.dataAdmissao;
  situacao.value = s.situacao;

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
   RESET
================================ */
function resetarFormulario() {
  editando = false;
  chaveEdicao = null;
  form.reset();

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
      `${s.codigo} ${s.nome} ${s.cpf} ${s.cargo} ${s.vinculo} ${s.localExercicio}`
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
      "Local de Exercício": s.localExercicio,
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

function abrirTransferencia(servidor) {
  servidorSelecionado = servidor;

  document.getElementById("modalTransferencia").style.display = "flex";
  document.getElementById("nomeServidorTransferencia").textContent =
    servidor.nome;

  // Preencher locais
  const select = document.getElementById("selectNovoLocal");
  select.innerHTML = "";

  locais.forEach((local) => {
    const opt = document.createElement("option");
    opt.value = local;
    opt.textContent = local;
    select.appendChild(opt);
  });

  select.value = servidor.localExercicio;

  // Data atual
  document.getElementById("dataTransferencia").value = new Date()
    .toISOString()
    .split("T")[0];
}

const btnFecharTransferencia = document.getElementById(
  "btnFecharTransferencia",
);

function fecharModalTransferencia() {
  document.getElementById("modalTransferencia").style.display = "none";

  document.getElementById("obsTransferencia").value = "";

  servidorSelecionado = null;
}

btnFecharTransferencia?.addEventListener("click", fecharModalTransferencia);

document.getElementById("btnCancelarTransferencia").onclick =
  fecharModalTransferencia;

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    fecharModalTransferencia();
  }
});

document.getElementById("btnGerarTransferencia").onclick = async () => {
  await transferirServidor();
};

async function transferirServidor() {
  if (!servidorSelecionado) return;

  const novoLocal = document.getElementById("selectNovoLocal").value;
  const dataTransferencia = document.getElementById("dataTransferencia").value;
  const observacao = document.getElementById("obsTransferencia").value.trim();
  const protocolo = gerarNumeroProtocolo();

  if (!novoLocal || !dataTransferencia) {
    alert("Preencha todos os campos.");
    return;
  }

  const servidorRef = ref(
    rtdb,
    `servidores/registros/${servidorSelecionado._key}`,
  );

  // 🔄 Atualiza o local do servidor
  await update(servidorRef, {
    localExercicio: novoLocal,
  });

  // 📜 Histórico (opcional, mas recomendado)
  const historicoRef = ref(
    rtdb,
    `servidores/transferencias/${servidorSelecionado._key}`,
  );

  await push(historicoRef, {
    protocolo: protocolo,
    de: servidorSelecionado.localExercicio,
    para: novoLocal,
    data: dataTransferencia,
    observacao: observacao,
    criadoEm: new Date().toISOString(),
  });

  // 🧾 Gera PDF
  gerarPDFTransferencia({
    ...servidorSelecionado,
    novoLocal,
    dataTransferencia,
    protocolo,
    observacao,
  });

  // Atualiza visualmente
  servidorSelecionado.localExercicio = novoLocal;

  // Fecha modal
  document.getElementById("modalTransferencia").style.display = "none";

  mostrarNotificacao("Transferência realizada com sucesso!");
}

function gerarNumeroProtocolo() {
  const agora = new Date();

  const data = agora.toISOString().slice(0, 10).replace(/-/g, "");

  const hora = agora.toTimeString().slice(0, 8).replace(/:/g, "");

  const aleatorio = Math.floor(1000 + Math.random() * 9000);

  return `${data}-${hora}-${aleatorio}`;
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

      doc.text("Da: SECRETARIA DE EDUCAÇÃO", xInicial, y);
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

      doc.text(
        `Carpina, ${new Date().toLocaleDateString("pt-BR")}.`,
        xInicial + colunaLargura / 2,
        y,
        { align: "center" },
      );

      y += 15;
      doc.line(xInicial + 25, y, xInicial + colunaLargura - 25, y);

      y += 6;
      doc.setFontSize(9);
      doc.text("ROSEJARA RAMOS DE OLIVEIRA", xInicial + colunaLargura / 2, y, {
        align: "center",
      });

      y += 4;
      doc.text(
        "Secretária Municipal de Educação e Esportes",
        xInicial + colunaLargura / 2,
        y,
        { align: "center" },
      );

      // Rodapé
      const usuario = window.dadosUsuario?.nome || "USUÁRIO";
      const protocolo = dados.protocolo;

      doc.setFontSize(7);
      doc.text(
        `Protocolo nº ${protocolo} gerado por ${usuario} em ${new Date().toLocaleString(
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

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url);
  };
}
