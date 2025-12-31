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

  desenharGraficoContratos(totalCnpj1, totalCnpj2, totalAtas);
});

// ===============================
// 🥧 Gráfico de pizza — Contratos
// ===============================
function desenharGraficoContratos(cnpj1, cnpj2, atas) {
  const canvas = document.getElementById("graficoContratos");
  if (!canvas) return;

  if (graficoContratos) graficoContratos.destroy();

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
  if (!snap.exists()) return;

  const dados = snap.val();

  // extrai anos válidos
  const anos = Object.keys(dados).filter((a) => /^\d{4}$/.test(a));

  // popula select
  popularSelectAnos(anos);

  // ano selecionado (default: atual)
  const anoAtual = new Date().getFullYear().toString();
  const anoSelecionado = filtroAno.value || anoAtual;

  // pega os ofícios do ano
  const oficiosAno = dados[anoSelecionado]
    ? Object.values(dados[anoSelecionado])
    : [];

  todosOficios = oficiosAno;

  atualizarTotalGeralOficios();
  atualizarGraficoOficios();
});

// ===============================
// 🔢 Total geral de ofícios
// ===============================
function atualizarTotalGeralOficios() {
  const el = document.querySelector("#totalOficios strong");
  if (!el) return;

  el.textContent = todosOficios.length;
}

// ===============================
// 🔽 Select de anos
// ===============================
const filtroAno = document.getElementById("filtroAno");

filtroAno.addEventListener("change", () => {
  const ano = filtroAno.value;

  const refAno = ref(rtdb, `oficios/${ano}`);

  onValue(refAno, (snap) => {
    todosOficios = snap.exists() ? Object.values(snap.val()) : [];
    atualizarTotalGeralOficios();
    atualizarGraficoOficios();
  });
});

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

filtroAno?.addEventListener("change", atualizarGraficoOficios);

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
