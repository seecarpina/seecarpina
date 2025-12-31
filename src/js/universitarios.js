import { rtdb } from "./firebaseConfig.js";
import {
  ref,
  push,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* ===============================
   ELEMENTOS
================================ */
const form = document.getElementById("formUniversitario");
const tabela = document.querySelector("#tabelaUniversitarios tbody");

const btnCancelar = document.getElementById("cancelarEdicao");

const inputNome = document.getElementById("nome");
const inputNascimento = document.getElementById("dataNascimento");
const inputCPF = document.getElementById("cpf");
const inputFaculdade = document.getElementById("faculdade");
const inputPeriodo = document.getElementById("periodo");
const inputMae = document.getElementById("nomeMae");
const inputRota = document.getElementById("rota");

const inputFoto = document.getElementById("foto");
const previewFoto = document.getElementById("previewFoto");
const btnCamera = document.getElementById("btnCamera");
const listaFaculdades = document.getElementById("listaFaculdades");

const busca = document.getElementById("buscaUniversitario");
const paginacao = document.getElementById("paginacaoUniversitarios");

let paginaAtual = 1;
const itensPorPagina = 100;

/* ===============================
   FIREBASE
================================ */
const registrosRef = ref(rtdb, "universitarios/registros");
const faculdadesRef = ref(rtdb, "universitarios/faculdades");

/* ===============================
   VARIÁVEIS
================================ */
let universitarios = [];
let faculdades = [];
let editando = false;
let chaveEdicao = null;
let fotoBase64 = "";
let streamCamera = null;

/* ===============================
   UTILIDADES
================================ */
function padronizarTexto(texto) {
  return texto ? texto.trim() : "";
}

function formatarCPF(valor) {
  return valor
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/* ===============================
   CPF MASK
================================ */
inputCPF.addEventListener("input", () => {
  inputCPF.value = formatarCPF(inputCPF.value);
});

/* ===============================
   AUTOCOMPLETE FACULDADE
================================ */
onValue(faculdadesRef, (snap) => {
  faculdades = snap.exists() ? Object.values(snap.val()) : [];
});

inputFaculdade.addEventListener("input", () => {
  const termo = inputFaculdade.value.toLowerCase().trim();
  listaFaculdades.innerHTML = "";

  if (!termo) {
    listaFaculdades.style.display = "none";
    return;
  }

  const filtrados = faculdades.filter((f) => f.toLowerCase().includes(termo));

  filtrados.forEach((f) => {
    const li = document.createElement("li");
    li.textContent = f;
    li.onclick = () => {
      inputFaculdade.value = f;
      listaFaculdades.style.display = "none";
    };
    listaFaculdades.appendChild(li);
  });

  listaFaculdades.style.display = filtrados.length ? "block" : "none";
});

document.addEventListener("click", (e) => {
  if (!inputFaculdade.contains(e.target)) {
    listaFaculdades.style.display = "none";
  }
});

/* ===============================
   FOTO (UPLOAD)
================================ */
inputFoto.addEventListener("change", () => {
  const file = inputFoto.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    fotoBase64 = e.target.result;
    previewFoto.src = fotoBase64;
    previewFoto.style.display = "block";
  };
  reader.readAsDataURL(file);
});

/* ===============================
   CÂMERA
================================ */
btnCamera.addEventListener("click", async () => {
  const video = document.createElement("video");
  video.autoplay = true;

  streamCamera = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = streamCamera;

  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0,0,0,.8)";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";

  const btnCapturar = document.createElement("button");
  btnCapturar.textContent = "📸 Capturar";
  btnCapturar.className = "btn";

  modal.appendChild(video);
  modal.appendChild(btnCapturar);
  document.body.appendChild(modal);

  btnCapturar.onclick = () => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.getContext("2d").drawImage(video, 0, 0);
    fotoBase64 = canvas.toDataURL("image/png");

    previewFoto.src = fotoBase64;
    previewFoto.style.display = "block";

    streamCamera.getTracks().forEach((t) => t.stop());
    modal.remove();
  };
});

/* ===============================
   LISTAGEM
================================ */
tabela.innerHTML = `
  <tr>
    <td colspan="7" style="text-align:center;">
      <svg class="svg-spinner" viewBox="0 0 50 50" width="40">
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

onValue(registrosRef, (snap) => {
  tabela.innerHTML = "";

  if (!snap.exists()) {
    tabela.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center">
          Nenhum universitário cadastrado
        </td>
      </tr>
    `;
    return;
  }

  universitarios = Object.entries(snap.val()).map(([k, v]) => ({
    ...v,
    _key: k,
  }));

  renderTabela();
});

function renderTabela() {
  tabela.innerHTML = "";

  const termo = busca.value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const filtrados = universitarios.filter((u) =>
    `${u.nome} ${u.cpf} ${u.faculdade} ${u.periodo} ${u.rota}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(termo)
  );

  const totalPaginas = Math.ceil(filtrados.length / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;

  const pagina = filtrados.slice(inicio, fim);

  if (!pagina.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center">
          Nenhum universitário encontrado
        </td>
      </tr>`;
  } else {
    pagina.forEach((u) => {
      const foto = u.foto
        ? `<img src="${u.foto}">`
        : `<img src="./src/images/profile.webp">`;

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td class="col-foto" id="profile-photo">${foto}</td>
        <td>${u.nome}</td>
        <td>${u.cpf}</td>
        <td>${u.faculdade}</td>
        <td>${u.periodo}</td>
        <td>${u.rota}</td>
        <td>
          <button class="edit-btn">
            <span class="material-symbols-outlined">edit_square</span>
          </button>
          <button class="edit-btn print-btn">
            <span class="material-symbols-outlined">picture_as_pdf</span>
          </button>
        </td>
      `;

      tr.querySelector(".edit-btn").onclick = () => editarUniversitario(u);
      tr.querySelector(".print-btn").onclick = () => gerarPDF(u);

      tabela.appendChild(tr);
    });
  }

  renderPaginacao(totalPaginas);
}

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

busca.addEventListener("input", () => {
  paginaAtual = 1;
  renderTabela();
});

function formatarDataBR(dataISO) {
  if (!dataISO) return "-";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function gerarPDF(u) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  // ================================
  // PAPEL TIMBRADO
  // ================================
  const imgTimbrado = new Image();
  imgTimbrado.src = "./src/images/papel-timbrado.png";

  imgTimbrado.onload = () => {
    doc.addImage(imgTimbrado, "PNG", 0, 0, 210, 297);

    // ================================
    // TÍTULO
    // ================================
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Ficha Cadastral de Estudante Universitário", 105, 50, {
      align: "center",
    });

    // ================================
    // FOTO 3x4
    // ================================
    if (u.foto) {
      doc.addImage(
        u.foto,
        "JPEG",
        90, // centralizado
        60, // maisabaixo do título
        30, // largura
        40 // altura
      );
    }

    // ================================
    // DADOS DO ALUNO
    // ================================
    let y = 115;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(12);

    const dados = [
      ["Nome:", u.nome],
      ["CPF:", u.cpf],
      ["Data de Nascimento:", formatarDataBR(u.nascimento)],
      ["Nome da Mãe:", u.nomeMae],
      ["Faculdade:", u.faculdade],
      ["Período:", u.periodo],
      ["Rota:", u.rota],
    ];

    dados.forEach(([label, valor]) => {
      doc.text(label, 30, y);
      doc.text(valor || "-", 80, y);
      y += 8;
    });

    // ================================
    // ASSINATURA
    // ================================
    y += 25;

    doc.line(60, y, 150, y);
    doc.text("Assinatura do Responsável", 105, y + 6, {
      align: "center",
    });

    // ================================
    // DATA DE GERAÇÃO
    // ================================
    const agora = new Date();

    const dia = String(agora.getDate()).padStart(2, "0");
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const ano = agora.getFullYear();

    const hora = String(agora.getHours()).padStart(2, "0");
    const minuto = String(agora.getMinutes()).padStart(2, "0");
    const segundo = String(agora.getSeconds()).padStart(2, "0");

    const dataHoraFormatada = `${dia}/${mes}/${ano} às ${hora}h ${minuto}m ${segundo}s`;

    doc.setFontSize(10);
    doc.text(`Gerado em: ${dataHoraFormatada}`, 105, 270, {
      align: "center",
    });

    // ================================
    // ABRIR EM NOVA ABA COM TÍTULO
    // ================================
    const pdfBlob = doc.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    const novaAba = window.open(url);
    novaAba.document.title = `Ficha Cadastral`;
  };
}

/* ===============================
   SALVAR / EDITAR
================================ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const dados = {
    nome: padronizarTexto(inputNome.value),
    nascimento: inputNascimento.value,
    cpf: inputCPF.value,
    faculdade: padronizarTexto(inputFaculdade.value),
    periodo: inputPeriodo.value,
    nomeMae: padronizarTexto(inputMae.value),
    rota: padronizarTexto(inputRota.value),
    foto: fotoBase64,
  };

  if (!dados.nome || !dados.cpf) {
    return mostrarNotificacao("Preencha os campos obrigatórios", "erro");
  }

  try {
    if (editando && chaveEdicao) {
      await update(ref(rtdb, `universitarios/registros/${chaveEdicao}`), dados);
      mostrarNotificacao("Cadastro atualizado!");
    } else {
      await push(registrosRef, dados);
      mostrarNotificacao("Universitário cadastrado!");
    }

    if (dados.faculdade && !faculdades.includes(dados.faculdade)) {
      push(faculdadesRef, dados.faculdade);
    }

    resetarFormulario();
  } catch {
    mostrarNotificacao("Erro ao salvar", "erro");
  }
});

/* ===============================
   EDITAR
================================ */
function editarUniversitario(u) {
  btnTopo.click();
  editando = true;
  chaveEdicao = u._key;

  inputNome.value = u.nome;
  inputNascimento.value = u.nascimento;
  inputCPF.value = u.cpf;
  inputFaculdade.value = u.faculdade;
  inputPeriodo.value = u.periodo;
  inputMae.value = u.nomeMae;
  inputRota.value = u.rota;

  document.getElementById("btnCadastrar").style.display = "none";
  document.getElementById("botoesEdicao").style.display = "flex";

  const msg = document.getElementById("msgEdicao");
  msg.textContent = `✏️ Editando estudante ${u.nome}`;
  msg.style.display = "block";

  if (u.foto) {
    fotoBase64 = u.foto;
    previewFoto.src = u.foto;
    previewFoto.style.display = "block";
  }
}

/* ===============================
   CANCELAR / RESET
================================ */
btnCancelar.addEventListener("click", () => resetarFormulario());

function resetarFormulario() {
  editando = false;
  chaveEdicao = null;

  form.reset();
  fotoBase64 = "";
  previewFoto.style.display = "none";

  document.getElementById("btnCadastrar").style.display = "block";
  document.getElementById("botoesEdicao").style.display = "none";
  document.getElementById("msgEdicao").style.display = "none";
}

// Exportar para Excel
const btnExportarUniversitarios = document.getElementById(
  "btnExportarUniversitarios"
);

if (btnExportarUniversitarios) {
  btnExportarUniversitarios.addEventListener("click", () => {
    if (!universitarios.length) {
      mostrarNotificacao("Nenhum universitário para exportar", "erro");
      return;
    }

    const termo = busca.value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    // Aplica o mesmo filtro da tabela
    const filtrados = universitarios.filter((u) =>
      `${u.nome} ${u.cpf} ${u.faculdade} ${u.periodo} ${u.rota}`
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
    const dadosExcel = filtrados.map((u) => ({
      Nome: u.nome,
      CPF: u.cpf,
      "Data de Nascimento": formatarDataBR(u.nascimento),
      Faculdade: u.faculdade,
      Período: u.periodo,
      Rota: u.rota,
    }));

    // Gera planilha
    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Universitários");

    const nomeArquivo = `universitarios_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    XLSX.writeFile(workbook, nomeArquivo);
  });
}
