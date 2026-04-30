import { rtdb } from "./firebaseConfig.js";
import {
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const selectLocal = document.getElementById("selectLocal");
const btnGerar = document.getElementById("btnGerarQuadro");

let servidores = [];
let locais = [];

// ===============================
// 🔄 ESTADO INICIAL (CARREGANDO)
// ===============================
selectLocal.innerHTML = `<option>Carregando...</option>`;
selectLocal.disabled = true;

// ===============================
// 🔥 CARREGAR SERVIDORES
// ===============================
onValue(ref(rtdb, "servidores/registros"), (snap) => {
  if (!snap.exists()) return;

  servidores = Object.values(snap.val());
});

// ===============================
// 🔥 CARREGAR LOCAIS
// ===============================
onValue(ref(rtdb, "servidores/locaisExercicio"), (snap) => {
  selectLocal.innerHTML = "";

  if (!snap.exists()) {
    selectLocal.innerHTML = `<option>Nenhuma lotação encontrada</option>`;
    selectLocal.disabled = true;
    return;
  }

  locais = Object.values(snap.val());

  // opção padrão
  const optDefault = document.createElement("option");
  optDefault.value = "";
  optDefault.textContent = "Selecione uma lotação";
  optDefault.disabled = true;
  optDefault.selected = true;
  selectLocal.appendChild(optDefault);

  // opções
  locais.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l;
    opt.textContent = l;
    selectLocal.appendChild(opt);
  });

  selectLocal.disabled = false;
});

// ===============================
// 📄 GERAR PDF
// ===============================
btnGerar.addEventListener("click", () => {
  const local = selectLocal.value;

  if (!local) {
    mostrarNotificacao("Selecione uma lotação.", "erro");
    return;
  }

  const filtrados = servidores.filter(
    (s) => s.localExercicio === local && s.situacao === "Ativo",
  );

  if (!filtrados.length) {
    mostrarNotificacao("Nenhum servidor encontrado.", "erro");
    return;
  }

  gerarPDF(local, filtrados);
});

// ===============================
// 🧾 FUNÇÃO PDF
// ===============================
function gerarPDF(local, lista) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  const largura = 210;
  const altura = 297;

  const img = new Image();
  img.src = "./src/images/papel-timbrado.png";

  img.onload = () => {
    const MARGEM_TOPO = 40;
    let y = MARGEM_TOPO;

    const hoje = new Date().toLocaleDateString("pt-BR");

    function novaPagina() {
      doc.addPage();
      doc.addImage(img, "PNG", 0, 0, largura, altura);
      y = MARGEM_TOPO;
    }

    // primeira página
    doc.addImage(img, "PNG", 0, 0, largura, altura);

    // título
    doc.setFontSize(14);
    doc.text("QUADRO DE SERVIDORES", 105, y, { align: "center" });

    y += 8;
    doc.setFontSize(11);
    doc.text(local, 105, y, { align: "center" });

    y += 6;
    doc.setFontSize(9);
    doc.text(`Gerado em ${hoje}`, 105, y, { align: "center" });

    y += 10;

    // agrupar por cargo
    const grupos = {};
    lista.forEach((s) => {
      if (!grupos[s.cargo]) grupos[s.cargo] = [];
      grupos[s.cargo].push(s);
    });

    Object.keys(grupos)
      .sort()
      .forEach((cargo) => {
        y += 8;

        if (y > 260) novaPagina();

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(cargo.toUpperCase(), 10, y);

        y += 4;
        doc.setFont(undefined, "normal");

        grupos[cargo]
          .sort((a, b) => a.nome.localeCompare(b.nome))
          .forEach((s) => {
            y += 6;

            if (y > 260) novaPagina();

            // cor do vínculo
            if (s.vinculo.toLowerCase().includes("efetivo")) {
              doc.setFillColor(144, 238, 144);
            } else {
              doc.setFillColor(255, 255, 153);
            }

            doc.rect(10, y - 4, 190, 6, "F");
            doc.text(s.nome, 12, y);
          });
      });

    // =========================
    // 📌 RODAPÉ
    // =========================
    const totalPaginas = doc.getNumberOfPages();

    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);

      let yRodape = altura - 10;

      doc.setFontSize(9);

      // verde
      doc.setFillColor(144, 238, 144);
      doc.rect(10, yRodape - 4, 5, 5, "F");
      doc.text("Efetivos", 17, yRodape);

      // amarelo
      doc.setFillColor(255, 255, 153);
      doc.rect(60, yRodape - 4, 5, 5, "F");
      doc.text("Contratos", 67, yRodape);

      // paginação
      doc.text(`Página ${i} de ${totalPaginas}`, largura - 20, yRodape, {
        align: "right",
      });
    }

    // abrir em nova aba
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };
}
