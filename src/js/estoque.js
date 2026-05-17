import { rtdb } from "./firebaseConfig.js";

import {
  ref,
  push,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const { jsPDF } = window.jspdf;
const mostrarNotificacao = window.mostrarNotificacao;

const tabela = document.querySelector("#tabelaMateriais tbody");

const tabelaHistorico = document.querySelector("#tabelaHistorico tbody");

// Spinner inicial enquanto carrega Firebase
if (tabela) {
  tabela.innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center;">
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

if (tabelaHistorico) {
  tabelaHistorico.innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center;">
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

const materiaisRef = ref(rtdb, "materiais");

const movimentacoesRef = ref(rtdb, "movimentacoes");

const destinosRef = ref(rtdb, "servidores/locaisExercicio");

const modalEntrega = document.getElementById("modalEntrega");

let materiais = [];

let historicoRomaneios = [];

let destinos = [];

let itensEntrega = [];

/* =========================
   FUNÇÕES AUXILIARES
========================= */
function getNomeResponsavel() {
  return window.dadosUsuario?.nome?.split(" ")[0] || "Usuário";
}

function padronizarTexto(str) {
  if (!str) return "";

  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

function formatarData(data) {
  return new Date(data).toLocaleDateString("pt-BR");
}

/* =========================
   AUTOCOMPLETE
========================= */

function mostrarSugestoes(input, lista, box) {
  if (!input || !box) return;

  input.oninput = () => {
    const valor = input.value.toLowerCase();

    box.innerHTML = "";

    if (!valor) {
      box.style.display = "none";
      return;
    }

    const filtrados = lista.filter((item) =>
      item.toLowerCase().includes(valor),
    );

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
  };

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !box.contains(e.target)) {
      box.style.display = "none";
    }
  });
}

/* =========================
   INPUTS
========================= */

const inputMaterial = document.getElementById("nomeMaterial");

const boxMaterial = document.getElementById("autocompleteMaterial");

const inputDestinoEntrega = document.getElementById("destinoEntrega");

const boxDestinoEntrega = document.getElementById("autocompleteDestinoEntrega");

const inputMaterialEntrega = document.getElementById("materialEntrega");

const boxEntrega = document.getElementById("autocompleteEntrega");

/* =========================
   DESTINOS
========================= */

onValue(destinosRef, (snap) => {
  destinos = snap.exists()
    ? [
        ...new Set(
          Object.values(snap.val())
            .filter(Boolean)
            .map((d) => padronizarTexto(d)),
        ),
      ].sort()
    : [];

  mostrarSugestoes(inputDestinoEntrega, destinos, boxDestinoEntrega);
});

/* =========================
   MATERIAIS
========================= */

onValue(materiaisRef, (snap) => {
  materiais = snap.exists()
    ? Object.entries(snap.val()).map(([key, val]) => ({
        ...val,
        _key: key,
      }))
    : [];

  renderTabela();

  const nomes = materiais.map((m) => m.nome);

  mostrarSugestoes(inputMaterial, nomes, boxMaterial);

  mostrarSugestoes(inputMaterialEntrega, nomes, boxEntrega);
});

/* =========================
   CADASTRO MATERIAL
========================= */

document
  .getElementById("formMaterial")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = padronizarTexto(inputMaterial.value);

    const unidade = document.getElementById("unidade").value;

    const quantidade = Number(document.getElementById("quantidade").value);

    if (!nome || quantidade <= 0) {
      return mostrarNotificacao("Preencha os campos corretamente", "erro");
    }

    try {
      const existente = materiais.find((m) => m.nome === nome);

      if (existente) {
        await update(ref(rtdb, `materiais/${existente._key}`), {
          estoque: Number(existente.estoque || 0) + quantidade,

          atualizadoEm: new Date().toISOString(),
        });
      } else {
        await push(materiaisRef, {
          nome,
          unidade,
          estoque: quantidade,
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
        });
      }

      mostrarNotificacao("Material salvo com sucesso!");

      e.target.reset();
    } catch (err) {
      console.error(err);

      mostrarNotificacao("Erro ao salvar material", "erro");
    }
  });

/* =========================
   TABELA
========================= */

function renderTabela() {
  tabela.innerHTML = "";

  const busca = document.getElementById("busca").value.toLowerCase();

  const filtrados = materiais.filter((m) =>
    m.nome.toLowerCase().includes(busca),
  );

  filtrados.forEach((m) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="assunto">
        ${m.nome}
      </td>

      <td>
        ${m.unidade}
      </td>

      <td>
        ${
          m.estoque <= 5
            ? `
              <span class="danger">
                ${m.estoque}
              </span>
            `
            : m.estoque
        }

        <div class="barra-saldo">
          <div
            class="barra-saldo-preenchida ${
              m.estoque > 20
                ? "verde"
                : m.estoque > 10
                  ? "amarelo"
                  : m.estoque > 5
                    ? "laranja"
                    : "vermelho"
            }"
            style="width:${Math.min(m.estoque, 100)}%"
          ></div>
        </div>
      </td>

      <td>
        ${m.atualizadoEm ? formatarData(m.atualizadoEm) : "-"}
      </td>
    `;

    tabela.appendChild(tr);
  });
}

document.getElementById("busca").addEventListener("input", renderTabela);

/* =========================
   MODAL
========================= */

document.getElementById("btnNovaEntrega").addEventListener("click", () => {
  modalEntrega.style.display = "flex";
});

document.getElementById("fecharModalEntrega").addEventListener("click", () => {
  modalEntrega.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === modalEntrega) {
    modalEntrega.style.display = "none";
  }
});

/* =========================
   ADICIONAR ITEM ENTREGA
========================= */

document.getElementById("btnAdicionarItem").addEventListener("click", () => {
  const material = inputMaterialEntrega.value;

  const quantidade = Number(document.getElementById("quantidadeEntrega").value);

  const item = materiais.find((m) => m.nome === material);

  if (!item) {
    return mostrarNotificacao("Material não encontrado", "erro");
  }

  if (quantidade <= 0) {
    return mostrarNotificacao("Quantidade inválida", "erro");
  }

  if (quantidade > item.estoque) {
    return mostrarNotificacao("Estoque insuficiente", "erro");
  }

  const jaExiste = itensEntrega.find((i) => i.materialId === item._key);

  if (jaExiste) {
    jaExiste.quantidade += quantidade;
  } else {
    itensEntrega.push({
      nome: item.nome,
      unidade: item.unidade,
      quantidade,
      materialId: item._key,
    });
  }

  renderItensEntrega();

  inputMaterialEntrega.value = "";

  document.getElementById("quantidadeEntrega").value = "";
});

/* =========================
   RENDER ITENS ENTREGA
========================= */

function renderItensEntrega() {
  const tbody = document.querySelector("#tabelaItensEntrega tbody");

  tbody.innerHTML = "";

  itensEntrega.forEach((item, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="assunto">
        ${item.nome}
      </td>

      <td>
        ${item.quantidade}
        ${item.unidade}
      </td>

      <td>
        <button
          class="cancel-btn"
          onclick="removerItem(${index})"
        >
          ❌
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

window.removerItem = function (index) {
  itensEntrega.splice(index, 1);

  renderItensEntrega();
};

/* =========================
   GERAR ROMANEIO
========================= */

document
  .getElementById("btnGerarRomaneio")
  .addEventListener("click", async () => {
    const destino = padronizarTexto(inputDestinoEntrega.value);

    if (!destino) {
      return mostrarNotificacao("Informe o destino", "erro");
    }

    if (!itensEntrega.length) {
      return mostrarNotificacao("Adicione itens", "erro");
    }

    try {
      for (const item of itensEntrega) {
        const material = materiais.find((m) => m._key === item.materialId);

        await update(ref(rtdb, `materiais/${item.materialId}`), {
          estoque: Number(material.estoque) - item.quantidade,

          atualizadoEm: new Date().toISOString(),
        });
      }

      const movimentacao = {
        destino,
        data: new Date().toISOString(),
        itens: itensEntrega,
        responsavel: getNomeResponsavel(),
      };

      await push(movimentacoesRef, movimentacao);

      gerarPDF(movimentacao);

      itensEntrega = [];

      renderItensEntrega();

      modalEntrega.style.display = "none";

      mostrarNotificacao("Romaneio gerado com sucesso!");
    } catch (err) {
      console.error(err);

      mostrarNotificacao("Erro ao gerar romaneio", "erro");
    }
  });

/* =========================
   PDF
========================= */

function gerarPDF(dados) {
  const doc = new jsPDF();

  doc.setFontSize(18);

  doc.text("ROMANEIO DE ENTREGA", 20, 20);

  doc.setFontSize(12);

  doc.text(`Destino: ${dados.destino}`, 20, 40);

  doc.text(`Data: ${formatarData(dados.data)}`, 20, 50);

  let y = 70;

  doc.text("ITENS:", 20, y);

  y += 10;

  dados.itens.forEach((item) => {
    doc.text(`${item.nome} - ${item.quantidade} ${item.unidade}`, 20, y);

    y += 10;
  });

  y += 20;

  doc.text("________________________________", 20, y);

  doc.text("Assinatura", 45, y + 10);

  const blob = doc.output("blob");

  const url = URL.createObjectURL(blob);

  window.open(url, "_blank");
}

/* =========================
   HISTÓRICO
========================= */

onValue(movimentacoesRef, (snap) => {
  tabelaHistorico.innerHTML = "";

  if (!snap.exists()) return;

  historicoRomaneios = Object.entries(snap.val())
    .map(([key, val]) => ({
      ...val,
      _key: key,
    }))
    .reverse();

  renderHistorico();
  const tr = document.createElement("tr");

  tr.innerHTML = `
      <td>
        ${formatarData(mov.data)}
      </td>

      <td class="assunto">
        ${mov.destino}
      </td>

      <td>
        ${mov.itens.length}
      </td>

      <td>
        ${mov.responsavel || "-"}
      </td>

      <td>
        <button
          class="view-btn"
          data-id="${mov._key}"
        >
          <span class="material-symbols-outlined">picture_as_pdf</span>
        </button>
      </td>
    `;

  tabelaHistorico.appendChild(tr);
});

function renderHistorico() {
  tabelaHistorico.innerHTML = "";

  const busca = document.getElementById("buscaHistorico").value.toLowerCase();

  const filtrados = historicoRomaneios.filter((mov) => {
    return (
      mov.destino?.toLowerCase().includes(busca) ||
      mov.responsavel?.toLowerCase().includes(busca) ||
      formatarData(mov.data).includes(busca)
    );
  });

  filtrados.forEach((mov) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        ${formatarData(mov.data)}
      </td>

      <td class="assunto">
        ${mov.destino}
      </td>

      <td>
        ${mov.itens.length}
      </td>

      <td>
        ${mov.responsavel || "-"}
      </td>

      <td>
        <button
          class="view-btn"
          data-id="${mov._key}"
        >
          <span class="material-symbols-outlined">picture_as_pdf</span>
        </button>
      </td>
    `;

    tabelaHistorico.appendChild(tr);
  });

  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mov = historicoRomaneios.find((m) => m._key === btn.dataset.id);

      gerarPDF(mov);
    });
  });
}

document.querySelectorAll(".view-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mov = lista.find((m) => m._key === btn.dataset.id);

    gerarPDF(mov);
  });
});

const tabBtns = document.querySelectorAll(".tab-btn");

const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));

    tabContents.forEach((tab) => tab.classList.remove("active"));

    btn.classList.add("active");

    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

document
  .getElementById("buscaHistorico")
  .addEventListener("input", renderHistorico);
