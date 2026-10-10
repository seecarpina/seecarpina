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
  bloco.querySelector(".dashboard-grafico-carregando").hidden = true;
  bloco.setAttribute("aria-busy", "false");
  bloco.querySelector(".dashboard-grafico-erro")?.remove();
  canvas.hidden = false;
  if (canvas.id === "graficoOficiosMes") filtroAno.disabled = false;
  bloco.hidden = false;
  document.getElementById("dashboardGraficos").hidden = false;
}

function mostrarErroGrafico(idCanvas) {
  const canvas = document.getElementById(idCanvas);
  if (!canvas) return;
  const bloco = canvas.closest(".card");
  canvas.hidden = true;
  bloco.querySelector(".dashboard-grafico-carregando").hidden = true;
  bloco.setAttribute("aria-busy", "false");
  bloco.querySelector(".dashboard-grafico-erro")?.remove();
  const mensagem = document.createElement("p");
  mensagem.className = "dashboard-grafico-erro";
  mensagem.setAttribute("role", "status");
  mensagem.textContent = "Não foi possível carregar este resumo. Tente atualizar a página.";
  bloco.appendChild(mensagem);
  document.getElementById(idCanvas === "graficoOficiosMes" ? "totalOficios" : "totalContratos").hidden = true;
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
  graficoContratos = null;

  const total = document.getElementById("totalContratos");
  total.querySelector("strong").textContent = cnpj1 + cnpj2 + atas;
  total.hidden = false;
  mostrarBloco(canvas);
  graficoContratos = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: [
        "Contratos CNPJ 30.784.957/0001-37",
        "Contratos CNPJ 59.593.430/0001-07",
        "ARPs",
      ],
      datasets: [
        {
          data: [cnpj1, cnpj2, atas],
          borderWidth: 2,
          borderColor: cssVar("--clr-white"),
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
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: cssVar("--clr-dark-variant"), usePointStyle: true, boxWidth: 8, padding: 14, font: { size: 11 } },
        },
        tooltip: {
          ...coresTooltip(),
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
  graficoOficiosMes = null;

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
          borderRadius: 5,
          maxBarThickness: 28,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: cssVar("--clr-dark-variant"), font: { size: 11 } }, grid: { display: false }, border: { display: false } },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            color: cssVar("--clr-dark-variant"),
          },
          grid: { color: cssVar("--clr-light") },
          border: { display: false },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          ...coresTooltip(),
          callbacks: {
            label: (ctx) => `${ctx.raw} ofício(s)`,
          },
        },
      },
    },
  });
}


function coresTooltip() {
  return {
    backgroundColor: cssVar("--clr-white"),
    titleColor: cssVar("--clr-dark"),
    bodyColor: cssVar("--clr-dark"),
    borderColor: cssVar("--clr-light"),
    borderWidth: 1,
    padding: 12,
  };
}

// Recolore as instâncias existentes ao trocar tema ou paleta, sem consultar o banco novamente.
function atualizarTemaGraficos() {
  for (const grafico of [graficoOficiosMes, graficoContratos]) {
    if (!grafico) continue;
    Object.assign(grafico.options.plugins.tooltip, coresTooltip());
    const dataset = grafico.data.datasets[0];
    if (grafico === graficoContratos) {
      dataset.backgroundColor = [cssVar("--clr-success"), cssVar("--clr-danger"), cssVar("--clr-primary")];
      dataset.borderColor = cssVar("--clr-white");
      grafico.options.plugins.legend.labels.color = cssVar("--clr-dark-variant");
    } else {
      dataset.backgroundColor = cssVar("--clr-primary");
      grafico.options.scales.x.ticks.color = cssVar("--clr-dark-variant");
      grafico.options.scales.y.ticks.color = cssVar("--clr-dark-variant");
      grafico.options.scales.y.grid.color = cssVar("--clr-light");
    }
    grafico.update("none");
  }
}

const observarTemaGraficos = new MutationObserver(atualizarTemaGraficos);
observarTemaGraficos.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
