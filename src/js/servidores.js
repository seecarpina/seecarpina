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
  mostrarSugestoes(inputCargo, cargos, boxCargo)
);

inputVinculo.addEventListener("input", () =>
  mostrarSugestoes(inputVinculo, vinculos, boxVinculo)
);

inputLocal.addEventListener("input", () =>
  mostrarSugestoes(inputLocal, locais, boxLocal)
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
        .includes(termo)
    )
    .sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
    );

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

      tr.innerHTML = `
        <td>${s.codigo}</td>
        <td>${s.nome}</td>
        <td>${formatarCPF(s.cpf)}</td>
        <td>${s.cargo}</td>
        <td>${s.vinculo}</td>
        <td>${formatarDataBR(s.dataAdmissao)}</td>
        <td>${s.situacao}</td>
        <td>${s.localExercicio}</td>
        <td>
          <button class="edit-btn">
            <span class="material-symbols-outlined">edit_square</span>
          </button>
          <button class="edit-btn transfer-btn">
            <span class="material-symbols-outlined">swap_horiz</span>
          </button>
        </td>
      `;

      tr.querySelector(".edit-btn").onclick = () => editarServidor(s);
      tr.querySelector(".transfer-btn").onclick = () => abrirTransferencia(s);
      tabela.appendChild(tr);
    });
  }

  renderPaginacao(totalPaginas);
}

/* ===============================
   PAGINAÇÃO
================================ */
function renderPaginacao(total) {
  paginacao.innerHTML = "";
  if (total <= 1) return;

  for (let i = 1; i <= total; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.classList.toggle("ativo", i === paginaAtual);

    btn.onclick = () => {
      paginaAtual = i;
      renderTabela();
    };

    paginacao.appendChild(btn);
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
  msgEdicao.textContent = `✏️ Editando servidor ${s.nome}`;
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
  msgEdicao.textContent = "";
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
        .includes(termo)
    );

    if (!filtrados.length) {
      mostrarNotificacao("Nenhum registro encontrado", "erro");
      return;
    }

    // Ordena por nome
    filtrados.sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
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

document.getElementById("btnCancelarTransferencia").onclick = () => {
  document.getElementById("modalTransferencia").style.display = "none";
};

document.getElementById("btnGerarTransferencia").onclick = async () => {
  await transferirServidor();
};

async function transferirServidor() {
  if (!servidorSelecionado) return;

  const novoLocal = document.getElementById("selectNovoLocal").value;
  const dataTransferencia = document.getElementById("dataTransferencia").value;

  if (!novoLocal || !dataTransferencia) {
    alert("Preencha todos os campos.");
    return;
  }

  const servidorRef = ref(
    rtdb,
    `servidores/registros/${servidorSelecionado._key}`
  );

  // 🔄 Atualiza o local do servidor
  await update(servidorRef, {
    localExercicio: novoLocal,
  });

  // 📜 Histórico (opcional, mas recomendado)
  const historicoRef = ref(
    rtdb,
    `servidores/transferencias/${servidorSelecionado._key}`
  );

  await push(historicoRef, {
    de: servidorSelecionado.localExercicio,
    para: novoLocal,
    data: dataTransferencia,
    criadoEm: new Date().toISOString(),
  });

  // 🧾 Gera PDF
  gerarPDFTransferencia({
    ...servidorSelecionado,
    novoLocal,
    dataTransferencia,
  });

  // Atualiza visualmente
  servidorSelecionado.localExercicio = novoLocal;

  // Fecha modal
  document.getElementById("modalTransferencia").style.display = "none";

  mostrarNotificacao("Transferência realizada com sucesso!");
}
function gerarPDFTransferencia(dados) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  const imgTimbrado = new Image();
  imgTimbrado.src = "./src/images/papel-timbrado.png";

  imgTimbrado.onload = () => {
    doc.addImage(imgTimbrado, "PNG", 0, 0, 210, 297);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("TERMO DE TRANSFERÊNCIA DE SERVIDOR", 105, 45, {
      align: "center",
    });

    let y = 70;
    doc.setFontSize(12);
    doc.setFont("Helvetica", "normal");

    const campos = [
      ["Nome:", dados.nome],
      ["CPF:", dados.cpf],
      ["Cargo:", dados.cargo],
      ["Local anterior:", dados.localExercicio],
      ["Novo local:", dados.novoLocal],
      ["Data da transferência:", formatarDataBR(dados.dataTransferencia)],
    ];

    campos.forEach(([label, valor]) => {
      doc.text(label, 30, y);
      doc.text(valor || "-", 95, y);
      y += 10;
    });

    y += 30;
    doc.line(60, y, 150, y);
    doc.text("Assinatura do Responsável", 105, y + 6, {
      align: "center",
    });

    const agora = new Date().toLocaleString("pt-BR");
    doc.setFontSize(10);
    doc.text(`Gerado em: ${agora}`, 105, 270, {
      align: "center",
    });

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url);
  };
}
