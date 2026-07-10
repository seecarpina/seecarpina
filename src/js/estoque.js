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

function formatarUnidade(unidade, quantidade) {
  if (quantidade === 1) return unidade;

  const plurais = {
    Unidade: "Unidades",
    Resma: "Resmas",
    Pacote: "Pacotes",
    Fardo: "Fardos",
    Caixa: "Caixas",
    Kit: "Kits",
  };

  return plurais[unidade] || `${unidade}s`;
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

const formMaterial = document.getElementById("formMaterial");

let salvandoMaterial = false;

formMaterial.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (salvandoMaterial) return;

  salvandoMaterial = true;

  const btnSubmit = formMaterial.querySelector("button[type='submit']");

  btnSubmit.disabled = true;
  btnSubmit.textContent = "Salvando...";

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
  } finally {
    salvandoMaterial = false;

    btnSubmit.disabled = false;
    btnSubmit.textContent = "Adicionar ao estoque";
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
        ${formatarUnidade(item.unidade, item.quantidade)}
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
const btnGerarRomaneio = document.getElementById("btnGerarRomaneio");

let gerandoRomaneio = false;

btnGerarRomaneio.addEventListener("click", async () => {
  if (gerandoRomaneio) return;

  gerandoRomaneio = true;

  btnGerarRomaneio.disabled = true;
  btnGerarRomaneio.textContent = "Gerando...";

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
  } finally {
    gerandoRomaneio = false;

    btnGerarRomaneio.disabled = false;
    btnGerarRomaneio.textContent = "Gerar Romaneio";
  }
});

/* =========================
   PDF
========================= */

function gerarPDF(dados) {
  const doc = new jsPDF();

  const img = new Image();
  img.src = "./src/images/papel-timbrado.png";

  img.onload = () => {
    const larguraPagina = doc.internal.pageSize.getWidth();
    const alturaPagina = doc.internal.pageSize.getHeight();

    // Limites do conteúdo
    const margemEsquerda = 20;
    const margemDireita = 20;
    const larguraTexto =
      larguraPagina - margemEsquerda - margemDireita;

    // A lista de itens não deverá ultrapassar esta posição
    const limiteInferiorItens = 235;

    let paginaAtual = 1;
    let y = 0;

    /* =========================
       CRIAR CABEÇALHO DA PÁGINA
    ========================= */
function adicionarCabecalhoPagina(primeiraPagina = false) {
  // Papel timbrado em todas as páginas
  doc.addImage(
    img,
    "PNG",
    0,
    0,
    larguraPagina,
    alturaPagina,
  );

  if (primeiraPagina) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);

    doc.text(
      "ROMANEIO DE ENTREGA",
      larguraPagina / 2,
      48,
      {
        align: "center",
      },
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    doc.text(
      `Destino: ${dados.destino}`,
      margemEsquerda,
      68,
    );

    doc.text(
      `Data: ${formatarData(dados.data)}`,
      margemEsquerda,
      76,
    );

    doc.text(
      `Responsável: ${dados.responsavel || "-"}`,
      margemEsquerda,
      84,
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    doc.text("ITENS:", margemEsquerda, 102);

    y = 112;
  } else {
    // Nas páginas seguintes, começa mais próximo do topo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    doc.text("CONTINUAÇÃO DOS ITENS:", margemEsquerda, 48);

    y = 58;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.text(
    `Página ${paginaAtual}`,
    larguraPagina - margemDireita,
    alturaPagina - 15,
    {
      align: "right",
    },
  );

  doc.setFontSize(12);
}

    /* =========================
       CRIAR NOVA PÁGINA
    ========================= */
function adicionarNovaPagina() {
  doc.addPage();

  paginaAtual++;

  adicionarCabecalhoPagina(false);
}

    // Cabeçalho da primeira página
    adicionarCabecalhoPagina(true);

    /* =========================
       LISTA DE ITENS
    ========================= */
    dados.itens.forEach((item, index) => {
      const descricao = `${index + 1}. ${item.nome} - ${
        item.quantidade
      } ${formatarUnidade(
        item.unidade,
        item.quantidade,
      )}`;

      // Divide nomes grandes em mais de uma linha
      const linhas = doc.splitTextToSize(
        descricao,
        larguraTexto,
      );

      const alturaItem = linhas.length * 7;

      // Verifica se o item cabe na página atual
      if (y + alturaItem > limiteInferiorItens) {
        adicionarNovaPagina();
      }

      doc.text(linhas, margemEsquerda, y);

      y += alturaItem + 3;
    });

    /* =========================
       TOTAL DE VOLUMES
    ========================= */
    const totalVolumes = dados.itens.reduce(
      (total, item) =>
        total + Number(item.quantidade || 0),
      0,
    );

    // Espaço necessário para total e assinaturas
    const espacoFinalNecessario = 55;

    if (y + espacoFinalNecessario > alturaPagina - 20) {
      adicionarNovaPagina();
    }

    y += 7;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    doc.text(
      `Volume total: ${totalVolumes} unidades`,
      margemEsquerda,
      y,
    );

    /* =========================
       ASSINATURAS
    ========================= */
    y += 35;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    doc.line(20, y, 85, y);
    doc.line(125, y, 190, y);

    doc.text(
      "Responsável pela Entrega",
      52,
      y + 7,
      {
        align: "center",
      },
    );

    doc.text(
      "Responsável pelo Recebimento",
      157,
      y + 7,
      {
        align: "center",
      },
    );

    /* =========================
       ABRIR PDF
    ========================= */
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    window.open(url, "_blank");

    // Libera a URL temporária após algum tempo
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  };

  img.onerror = () => {
    console.error(
      "Não foi possível carregar o papel timbrado.",
    );

    mostrarNotificacao(
      "Erro ao carregar o papel timbrado do PDF",
      "erro",
    );
  };
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
