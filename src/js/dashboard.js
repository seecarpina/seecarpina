// ===============================
// 📊 DASHBOARD
// ===============================

import { rtdb } from "./firebaseConfig.js";
import {
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ===============================
// 🔗 Firebase refs
// ===============================
const contratosRef = ref(rtdb, "contratos/fiscais");
const oficiosRef = ref(rtdb, "oficios");

// ===============================
// Controles
// ===============================
function cssVar(nome) {
  return getComputedStyle(document.body)
    .getPropertyValue(nome)
    .trim();
}

// ===============================
// 🎯 Identificadores
// ===============================
const CNPJ_1 = "30.784.957/0001-37";
const CNPJ_2 = "59.593.430/0001-07";

// ===============================
// 📈 Instâncias
// ===============================
let graficoContratos = null;
let graficoOficiosMes = null;
let todosOficios = [];
let dadosOficios = {};
const filtroAno = document.getElementById("filtroAno");

function mostrarBloco(canvas) {
  const bloco = canvas.closest(".card");
  bloco.querySelector(".dashboard-grafico-erro")?.remove();
  canvas.hidden = false;
  bloco.hidden = false;
  document.getElementById("dashboardGraficos").hidden = false;
}

function mostrarErroGrafico(idCanvas) {
  const canvas = document.getElementById(idCanvas);
  if (!canvas) return;
  const bloco = canvas.closest(".card");
  canvas.hidden = true;
  bloco.querySelector(".dashboard-grafico-erro")?.remove();
  const mensagem = document.createElement("p");
  mensagem.className = "dashboard-grafico-erro";
  mensagem.setAttribute("role", "status");
  mensagem.textContent = "Não foi possível carregar este resumo. Tente atualizar a página.";
  bloco.appendChild(mensagem);
  if (idCanvas === "graficoOficiosMes") document.getElementById("totalOficios").hidden = true;
  bloco.hidden = false;
  document.getElementById("dashboardGraficos").hidden = false;
}

// ===============================
// 🥧 GRÁFICO 1 — TOTAL CONTRATOS
// ===============================
onValue(contratosRef, (snap) => {
  let totalCnpj1 = 0;
  let totalCnpj2 = 0;
  let totalAtas = 0;

  if (snap.exists()) {
    Object.values(snap.val()).forEach((c) => {
      const tipo = (c.tipoContrato || "").toUpperCase();

      if (tipo.includes(CNPJ_1)) totalCnpj1++;
      if (tipo.includes(CNPJ_2)) totalCnpj2++;
      if (tipo.includes("ARPS")) totalAtas++;
    });
  }

  try {
    desenharGraficoContratos(totalCnpj1, totalCnpj2, totalAtas);
  } catch (erro) {
    console.error("Erro ao desenhar resumo de contratos:", erro);
    mostrarErroGrafico("graficoContratos");
  }
}, () => mostrarErroGrafico("graficoContratos"));

// ===============================
// 🥧 Gráfico de pizza — Contratos
// ===============================
function desenharGraficoContratos(cnpj1, cnpj2, atas) {
  const canvas = document.getElementById("graficoContratos");
  if (!canvas) return;

  if (graficoContratos) graficoContratos.destroy();

  mostrarBloco(canvas);
  graficoContratos = new Chart(canvas, {
    type: "pie",
    data: {
      labels: [
        "Contratos CNPJ 30.784.957/0001-37",
        "Contratos CNPJ 59.593.430/0001-07",
        "ARPS",
      ],
      datasets: [
        {
          data: [cnpj1, cnpj2, atas],
          backgroundColor: [
            cssVar("--clr-success"),
            cssVar("--clr-danger"),
            cssVar("--clr-primary"),
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.raw}`,
          },
        },
      },
    },
  });
}

// ===============================
// 📊 GRÁFICO 2 — OFÍCIOS POR MÊS
// ===============================
onValue(oficiosRef, (snap) => {
  dadosOficios = snap.exists() ? snap.val() : {};
  const anos = Object.keys(dadosOficios).filter((a) => /^\d{4}$/.test(a));
  const selecionado = filtroAno.value;
  const atual = new Date().getFullYear().toString();
  // Mesmo sem ofícios, exibe um gráfico válido com total zero.
  popularSelectAnos(anos.length ? anos : [atual]);
  if (anos.includes(selecionado)) filtroAno.value = selecionado;
  carregarOficiosSelecionados();
}, () => mostrarErroGrafico("graficoOficiosMes"));

function carregarOficiosSelecionados() {
  todosOficios = Object.values(dadosOficios[filtroAno.value] || {});
  try {
    atualizarTotalGeralOficios();
    atualizarGraficoOficios();
  } catch (erro) {
    console.error("Erro ao desenhar resumo de ofícios:", erro);
    mostrarErroGrafico("graficoOficiosMes");
  }
}

// ===============================
// 🔢 Total geral de ofícios
// ===============================
function atualizarTotalGeralOficios() {
  const el = document.querySelector("#totalOficios strong");
  if (!el) return;

  el.textContent = todosOficios.length;
  document.getElementById("totalOficios").hidden = false;
}

// ===============================
// 🔽 Select de anos
// ===============================
filtroAno?.addEventListener("change", carregarOficiosSelecionados);

function popularSelectAnos(anos) {
  if (!filtroAno) return;

  filtroAno.innerHTML = "";

  anos
    .sort((a, b) => b - a)
    .forEach((ano) => {
      const opt = document.createElement("option");
      opt.value = ano;
      opt.textContent = ano;
      filtroAno.appendChild(opt);
    });

  // seleciona o ano atual, se existir
  const atual = new Date().getFullYear().toString();
  if (anos.includes(atual)) {
    filtroAno.value = atual;
  }
}


// ===============================
// 🔄 Atualiza gráfico mensal
// ===============================
function atualizarGraficoOficios() {
  const ano = Number(filtroAno.value);
  const meses = Array(12).fill(0);

  todosOficios.forEach((o) => {
    if (!o.data) return;

    const [a, m] = o.data.split("-").map(Number);
    if (a === ano) meses[m - 1]++;
  });

  desenharGraficoOficiosMes(meses, ano);
}

// ===============================
// 📈 Gráfico de colunas — Ofícios
// ===============================
function desenharGraficoOficiosMes(valores, ano) {
  const canvas = document.getElementById("graficoOficiosMes");
  if (!canvas) return;

  if (graficoOficiosMes) graficoOficiosMes.destroy();

  mostrarBloco(canvas);
  graficoOficiosMes = new Chart(canvas, {
    type: "bar",
    data: {
      labels: [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ],
      datasets: [
        {
          label: `Ofícios enviados em ${ano}`,
          data: valores,
          backgroundColor: cssVar("--clr-primary"),
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw} ofício(s)`,
          },
        },
      },
    },
  });
}
