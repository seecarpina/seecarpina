// ♻️ Reutiliza tudo que já é comum no scripts.js
// scripts.js DEVE ser carregado antes deste arquivo

import { rtdb } from "./firebaseConfig.js";
import {
  ref,
  push,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ===============================
// 🔧 Utils
// ===============================
function padronizarTexto(str) {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

function mostrarSugestoes(input, lista, box) {
  const texto = input.value.toLowerCase();
  box.innerHTML = "";

  if (!texto) {
    box.style.display = "none";
    return;
  }

  const filtrados = lista.filter((v) => v.toLowerCase().includes(texto));

  if (!filtrados.length) {
    box.style.display = "none";
    return;
  }

  filtrados.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    li.onclick = () => {
      input.value = item;
      box.style.display = "none";
    };
    box.appendChild(li);
  });

  box.style.display = "block";
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

// ===============================
// 💰 Máscara de moeda (CORRETA)
// ===============================
function mascaraMoeda(input) {
  let valor = input.value.replace(/\D/g, "");

  if (!valor) {
    input.value = "";
    return;
  }

  valor = (Number(valor) / 100).toFixed(2);

  input.value = Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function moedaParaNumero(valor) {
  if (!valor) return "";
  return valor
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
}

function formatarMoedaTabela(valor) {
  if (valor === null || valor === undefined || valor === "") return "-";

  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataBR(iso) {
  if (!iso) return "-";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// ===============================
// 🔥 Firebase refs
// ===============================
const fiscaisContratoRef = ref(rtdb, "contratos/fiscais");
const modalidadesRef = ref(rtdb, "contratos/listas/modalidades");
const gestoresRef = ref(rtdb, "contratos/listas/gestores");
const fiscaisRef = ref(rtdb, "contratos/listas/fiscais");

// ===============================
// 📋 Autocomplete
// ===============================
function setupAutocomplete(inputId, boxId, dbRef, lista) {
  const input = document.getElementById(inputId);
  const box = document.getElementById(boxId);

  onValue(dbRef, (snap) => {
    lista.length = 0;
    if (snap.exists()) {
      lista.push(...new Set(Object.values(snap.val()).map(padronizarTexto)));
    }
  });

  input.addEventListener("input", () => mostrarSugestoes(input, lista, box));

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target)) box.style.display = "none";
  });
}

// ===============================
// 📌 Campos
// ===============================
const form = document.getElementById("formFiscalContrato");
const numero = document.getElementById("numero");
const credor = document.getElementById("credor");
const modalidade = document.getElementById("modalidade");
const gestor = document.getElementById("gestor");
const fiscal = document.getElementById("fiscal");
const situacao = document.getElementById("situacao");
const tipoContrato = document.getElementById("tipoContrato");
const valorGlobal = document.getElementById("valorGlobal");

const btnCadastrar = document.getElementById("btnCadastrar");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

const tabela = document.querySelector("#tabelaContratos tbody");
function mostrarLoadingTabela() {
  tabela.innerHTML = `
    <tr>
      <td colspan="10" style="text-align:center; padding:2rem">
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
}

const busca = document.getElementById("busca");
const filtroTipoContrato = document.getElementById("filtroTipoContrato");
const btnTopo = document.getElementById("btnTopo");
const msgEdicao = document.getElementById("msgEdicao");

// ===============================
// ➖ Deduções
// ===============================
const blocoDeducoes = document.getElementById("blocoDeducoes");
const deducaoData = document.getElementById("deducaoData");
const deducaoValor = document.getElementById("deducaoValor");
const deducaoDescricao = document.getElementById("deducaoDescricao");
const btnAddDeducao = document.getElementById("btnAddDeducao");
const listaDeducoes = document.getElementById("listaDeducoes");

let deducoesTemp = [];

// ===============================
// 🧠 Autocompletes
// ===============================
const modalidades = [];
const gestores = [];
const fiscais = [];

setupAutocomplete("modalidade", "autoModalidade", modalidadesRef, modalidades);
setupAutocomplete("gestor", "autoGestor", gestoresRef, gestores);
setupAutocomplete("fiscal", "autoFiscal", fiscaisRef, fiscais);

// ===============================
// 💰 Máscara no input
// ===============================
valorGlobal.addEventListener("input", () => mascaraMoeda(valorGlobal));
deducaoValor.addEventListener("input", () => mascaraMoeda(deducaoValor));

// ===============================
// 💾 Cadastro / Edição
// ===============================
let editando = false;
let chaveEdicao = null;

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (editando) return btnSalvarEdicao.click();

  const dados = {
    numero: numero.value.trim(),
    credor: credor.value.trim(),
    modalidade: padronizarTexto(modalidade.value),
    gestor: padronizarTexto(gestor.value),
    fiscal: padronizarTexto(fiscal.value),
    situacao: situacao.value,
    tipoContrato: tipoContrato.value,
    valorGlobal: moedaParaNumero(valorGlobal.value),
    responsavel: window.nomeResponsavel || "",
    criadoEm: new Date().toISOString(),
  };

  if (!dados.numero || !dados.credor)
    return mostrarNotificacao("Preencha número e credor", "erro");

  await push(fiscaisContratoRef, dados);

  if (dados.modalidade && !modalidades.includes(dados.modalidade))
    push(modalidadesRef, dados.modalidade);

  if (dados.gestor && !gestores.includes(dados.gestor))
    push(gestoresRef, dados.gestor);

  if (dados.fiscal && !fiscais.includes(dados.fiscal))
    push(fiscaisRef, dados.fiscal);

  mostrarNotificacao("Contrato cadastrado com sucesso");
  form.reset();
});

// ===============================
// 📡 Listagem
// ===============================
let contratos = [];

function calcularSaldo(contrato) {
  const valor = Number(contrato.valorGlobal || 0);
  const deducoes = contrato.deducoes
    ? Object.values(contrato.deducoes).reduce(
        (s, d) => s + Number(d.valor || 0),
        0
      )
    : 0;

  return valor - deducoes;
}

function calcularPercentualSaldo(contrato) {
  const valor = Number(contrato.valorGlobal || 0);
  if (valor <= 0) return 0;

  const saldo = calcularSaldo(contrato);
  return Math.round((saldo / valor) * 100);
}

function corSaldo(percentual) {
  if (percentual <= 0) return "vermelho";
  if (percentual < 50) return "laranja";
  if (percentual < 100) return "amarelo";
  return "verde";
}

function renderTabela() {
  const filtroTexto = busca.value.toLowerCase();
  const filtroTipo = filtroTipoContrato.value;

  let filtrados = contratos.filter((c) =>
    `${c.numero} ${c.credor} ${c.modalidade} ${c.gestor} ${c.fiscal} ${c.situacao} ${c.tipoContrato}`
      .toLowerCase()
      .includes(filtroTexto)
  );

  if (filtroTipo) {
    filtrados = filtrados.filter((c) => c.tipoContrato === filtroTipo);
  }

  tabela.innerHTML = "";

  filtrados.forEach((c) => {
    const tr = document.createElement("tr");
    const saldo = calcularSaldo(c);
    const percentual = calcularPercentualSaldo(c);
    const cor = corSaldo(percentual);

    tr.innerHTML = `
      <td title="${c.situacao}">
        <div class="bdg ${
          c.situacao === "DISTRATADO"
            ? "distratado"
            : c.situacao === "EM EXECUÇÃO"
            ? "em-execucao"
            : c.situacao === "EXECUTADO"
            ? "executado"
            : c.situacao === "FINALIZADO"
            ? "finalizado"
            : c.situacao === "ASSINADO"
            ? "assinado"
            : ""
        }"></div>

      </td>
      <td data-key="${c._key}">${c.numero}</td>
      <td>${c.credor}</td>
      <td>${c.modalidade}</td>
      <td>${c.gestor}</td>
      <td>${c.fiscal}</td>
      <td>${formatarMoedaTabela(c.valorGlobal)} <br></td>
      <td>
        <div style="font-weight:600">
          ${formatarMoedaTabela(saldo)}
        </div>

      <div class="barra-saldo">
        <div class="barra-saldo-preenchida ${cor}" style="width:${Math.max(
      0,
      Math.min(percentual, 100)
    )}%" title="${percentual}%"></div>
      </div>
      </td>

      <td style="display:none">${c.situacao}</td>
      <td>${c.tipoContrato}</td>
      <td>
        <button class="edit-btn">
          <span class="material-symbols-outlined">edit_square</span>
        </button>
      </td>
    `;
    tabela.appendChild(tr);
  });

  if (!filtrados.length) {
    tabela.innerHTML =
      '<tr><td colspan="10" style="text-align:center;">Nenhum resultado encontrado</td></tr>';
  }
}

mostrarLoadingTabela();

onValue(fiscaisContratoRef, (snap) => {
  contratos = snap.exists()
    ? Object.entries(snap.val()).map(([k, v]) => ({ ...v, _key: k }))
    : [];
  renderTabela();
});

busca.addEventListener("input", renderTabela);
filtroTipoContrato.addEventListener("change", renderTabela);

// ===============================
// ✏️ Editar
// ===============================
tabela.onclick = (e) => {
  const icone = e.target.closest("span.material-symbols-outlined");
  if (!icone) return;

  const tr = icone.closest("tr");
  const key = tr.querySelector("td[data-key]").dataset.key;
  const contrato = contratos.find((c) => c._key === key);

  editando = true;
  chaveEdicao = key;

  numero.value = contrato.numero;
  credor.value = contrato.credor;
  modalidade.value = contrato.modalidade;
  gestor.value = contrato.gestor;
  fiscal.value = contrato.fiscal;
  situacao.value = contrato.situacao;
  tipoContrato.value = contrato.tipoContrato;
  valorGlobal.value = contrato.valorGlobal
    ? formatarMoedaTabela(contrato.valorGlobal)
    : "";

  blocoDeducoes.style.display = "block";
  deducoesTemp = [];

  listaDeducoes.innerHTML = "";

  // carregar deduções existentes
  if (contrato.deducoes) {
    Object.values(contrato.deducoes).forEach((d) => {
      deducoesTemp.push(d);
    });
    renderListaDeducoes();
  }

  btnCadastrar.style.display = "none";
  document.getElementById("botoesEdicao").style.display = "flex";

  msgEdicao.textContent = `✏️ Editando ${contrato.tipoContrato} número ${contrato.numero}`;
  msgEdicao.style.display = "block";

  if (btnTopo) btnTopo.click();
};

function renderListaDeducoes() {
  listaDeducoes.innerHTML = "";

  deducoesTemp.forEach((d, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${formatarDataBR(d.data)} – ${formatarMoedaTabela(d.valor)} – ${
      d.descricao
    }
      <button data-i="${i}" style="margin-left:10px">❌</button>
    `;

    li.querySelector("button").onclick = () => {
      deducoesTemp.splice(i, 1);
      renderListaDeducoes();
    };

    listaDeducoes.appendChild(li);
  });
}

btnAddDeducao.onclick = () => {
  if (!deducaoData.value || !deducaoValor.value) {
    return mostrarNotificacao("Informe data e valor", "erro");
  }

  deducoesTemp.push({
    data: deducaoData.value,
    valor: Number(moedaParaNumero(deducaoValor.value)),
    descricao: deducaoDescricao.value.trim(),
  });

  deducaoData.value = "";
  deducaoValor.value = "";
  deducaoDescricao.value = "";

  renderListaDeducoes();
};

btnSalvarEdicao.onclick = async () => {
  if (!editando || !chaveEdicao) return;

  await update(ref(rtdb, `contratos/fiscais/${chaveEdicao}`), {
    numero: numero.value.trim(),
    credor: credor.value.trim(),
    modalidade: padronizarTexto(modalidade.value),
    gestor: padronizarTexto(gestor.value),
    fiscal: padronizarTexto(fiscal.value),
    situacao: situacao.value,
    tipoContrato: tipoContrato.value,
    valorGlobal: moedaParaNumero(valorGlobal.value),
    deducoes: deducoesTemp,
  });

  mostrarNotificacao("Contrato atualizado");
  resetarEdicao();
};

btnCancelarEdicao.onclick = resetarEdicao;

function resetarEdicao() {
  editando = false;
  chaveEdicao = null;
  form.reset();
  btnCadastrar.style.display = "block";
  document.getElementById("botoesEdicao").style.display = "none";
  msgEdicao.textContent = "";
  msgEdicao.style.display = "none";
  blocoDeducoes.style.display = "none";
  deducoesTemp = [];
  listaDeducoes.innerHTML = "";
}
