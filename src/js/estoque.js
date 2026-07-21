import { rtdb } from "./firebaseConfig.js";

import {
  ref,
  push,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const { jsPDF } = window.jspdf;
const mostrarNotificacao = window.mostrarNotificacao;

const listaMateriais = document.getElementById("listaMateriais");
const listaHistorico = document.getElementById("listaHistorico");

const contadorMateriais = document.getElementById("contadorMateriais");
const contadorRomaneios = document.getElementById("contadorRomaneios");

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
  if (!data) return "-";

  return new Date(data).toLocaleDateString("pt-BR");
}

function escaparHtmlEstoque(texto) {
  const elemento = document.createElement("div");
  elemento.textContent = texto ?? "";
  return elemento.innerHTML;
}

function separarDataRomaneio(dataISO) {
  if (!dataISO) {
    return {
      dia: "--",
      mes: "---",
      ano: "----",
    };
  }

  const data = new Date(dataISO);

  return {
    dia: String(data.getDate()).padStart(2, "0"),
    mes: data
      .toLocaleDateString("pt-BR", {
        month: "short",
      })
      .replace(".", "")
      .toUpperCase(),
    ano: data.getFullYear(),
  };
}

/* =========================
   AUTOCOMPLETE
========================= */

function mostrarSugestoes(input, lista, box) {
  if (!input || !box) return;

  input.oninput = () => {
    const valor = input.value.toLowerCase().trim();

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

      li.addEventListener("click", () => {
        input.value = item;
        box.style.display = "none";
      });

      box.appendChild(li);
    });

    box.style.display = "block";
  };
}

document.addEventListener("click", (event) => {
  document.querySelectorAll(".autocomplete-list").forEach((box) => {
    const autocomplete = box.closest(".autocomplete");

    if (autocomplete && !autocomplete.contains(event.target)) {
      box.style.display = "none";
    }
  });
});

/* =========================
   ELEMENTOS
========================= */

const inputMaterial = document.getElementById("nomeMaterial");
const boxMaterial = document.getElementById("autocompleteMaterial");

const inputDestinoEntrega = document.getElementById("destinoEntrega");
const boxDestinoEntrega = document.getElementById("autocompleteDestinoEntrega");

const inputMaterialEntrega = document.getElementById("materialEntrega");
const boxEntrega = document.getElementById("autocompleteEntrega");

const formMaterial = document.getElementById("formMaterial");
const btnAdicionarEstoque = document.getElementById("btnAdicionarEstoque");

const btnNovaEntrega = document.getElementById("btnNovaEntrega");

const btnExportarExcel = document.getElementById("btnExportarExcel");

const btnFecharModalEntrega = document.getElementById("fecharModalEntrega");

const btnAdicionarItem = document.getElementById("btnAdicionarItem");
const btnGerarRomaneio = document.getElementById("btnGerarRomaneio");

const inputBusca = document.getElementById("busca");
const inputBuscaHistorico = document.getElementById("buscaHistorico");

/* =========================
   DESTINOS
========================= */

onValue(destinosRef, (snapshot) => {
  destinos = snapshot.exists()
    ? Object.entries(snapshot.val())
        .map(([id, dados]) => ({
          id,
          nome: padronizarTexto(
            typeof dados === "string" ? dados : dados?.nome,
          ),
        }))
        .filter((destino) => destino.nome)
        .sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR", {
            sensitivity: "base",
          }),
        )
    : [];

  const nomesDestinos = destinos.map((destino) => destino.nome);

  mostrarSugestoes(inputDestinoEntrega, nomesDestinos, boxDestinoEntrega);
});

/* =========================
   MATERIAIS
========================= */

onValue(
  materiaisRef,
  (snapshot) => {
    materiais = snapshot.exists()
      ? Object.entries(snapshot.val()).map(([key, dados]) => ({
          ...dados,
          _key: key,
        }))
      : [];

    materiais.sort((a, b) =>
      (a.nome || "").localeCompare(b.nome || "", "pt-BR"),
    );

    renderTabela();

    const nomes = materiais.map((material) => material.nome).filter(Boolean);

    mostrarSugestoes(inputMaterial, nomes, boxMaterial);

    mostrarSugestoes(inputMaterialEntrega, nomes, boxEntrega);
  },
  (erro) => {
    console.error("Erro ao carregar materiais:", erro);

    if (listaMateriais) {
      listaMateriais.innerHTML = `
        <div class="estoque-vazio">
          Não foi possível carregar os materiais.
        </div>
      `;
    }

    mostrarNotificacao("Erro ao carregar materiais.", "erro");
  },
);

/* =========================
   CADASTRO DE MATERIAL
========================= */

let salvandoMaterial = false;

formMaterial.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (salvandoMaterial) return;

  const nome = padronizarTexto(inputMaterial.value);
  const unidade = document.getElementById("unidade").value;
  const quantidade = Number(document.getElementById("quantidade").value);

  if (!nome || quantidade <= 0) {
    mostrarNotificacao("Preencha os campos corretamente.", "erro");
    return;
  }

  salvandoMaterial = true;

  btnAdicionarEstoque.disabled = true;
  btnAdicionarEstoque.value = "Salvando...";

  try {
    const existente = materiais.find((material) => material.nome === nome);

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

    formMaterial.reset();
    inputMaterial.focus();
  } catch (erro) {
    console.error("Erro ao salvar material:", erro);

    mostrarNotificacao("Erro ao salvar material.", "erro");
  } finally {
    salvandoMaterial = false;

    btnAdicionarEstoque.disabled = false;
    btnAdicionarEstoque.value = "Adicionar ao estoque";
  }
});

/* =========================
   RENDERIZAÇÃO DOS MATERIAIS
========================= */

function renderTabela() {
  if (!listaMateriais) return;

  const busca = inputBusca.value.toLowerCase().trim();

  const filtrados = materiais.filter((material) =>
    (material.nome || "").toLowerCase().includes(busca),
  );

  if (contadorMateriais) {
    const total = filtrados.length;
    const texto = total === 1 ? "material" : "materiais";

    contadorMateriais.textContent = `${total} ${texto}`;
  }

  if (!filtrados.length) {
    listaMateriais.innerHTML = `
      <div class="estoque-vazio">
        Nenhum material encontrado.
      </div>
    `;

    return;
  }

  listaMateriais.innerHTML = filtrados
    .map((material) => {
      const estoque = Number(material.estoque || 0);
      const percentual = Math.min(Math.max(estoque, 0), 100);

      let classeBarra = "";

      if (estoque <= 5) {
        classeBarra = "estoque-baixo";
      } else if (estoque <= 15) {
        classeBarra = "estoque-medio";
      }

      return `
        <article class="card-material">
          <div class="material-cabecalho">
            <div>
              <h3 class="material-nome">
                ${escaparHtmlEstoque(material.nome || "-")}
              </h3>

              <span class="material-unidade">
                ${escaparHtmlEstoque(material.unidade || "Unidade")}
              </span>
            </div>

            <div
              class="material-estoque ${estoque <= 5 ? "baixo" : ""}"
            >
              <strong>${estoque}</strong>
              <span>em estoque</span>
            </div>
          </div>

          <div class="material-barra">
            <div
              class="material-barra-preenchida ${classeBarra}"
              style="width: ${percentual}%"
            ></div>
          </div>

          <div class="material-rodape">
            <span class="material-symbols-outlined">
              update
            </span>

            Última movimentação:
            ${material.atualizadoEm ? formatarData(material.atualizadoEm) : "-"}
          </div>
        </article>
      `;
    })
    .join("");
}

inputBusca.addEventListener("input", renderTabela);

/* =========================
   EXPORTAR ESTOQUE PARA EXCEL
========================= */

btnExportarExcel?.addEventListener("click", () => {
  if (!materiais.length) {
    mostrarNotificacao("Não há materiais para exportar.", "erro");

    return;
  }

  const dadosExcel = materiais.map((material) => ({
    Material: material.nome || "",
    Unidade: material.unidade || "Unidade",
    "Quantidade em Estoque": Number(material.estoque || 0),
    "Última Movimentação": material.atualizadoEm
      ? formatarData(material.atualizadoEm)
      : "",
  }));

  const planilha = XLSX.utils.json_to_sheet(dadosExcel);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, planilha, "Estoque");

  planilha["!cols"] = [{ wch: 45 }, { wch: 15 }, { wch: 22 }, { wch: 22 }];

  const hoje = new Date();

  const dataArquivo = [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, "0"),
    String(hoje.getDate()).padStart(2, "0"),
  ].join("-");

  XLSX.writeFile(workbook, `estoque_${dataArquivo}.xlsx`);

  mostrarNotificacao("Estoque exportado com sucesso!");
});

/* =========================
   MODAL DE ENTREGA
========================= */

btnNovaEntrega.addEventListener("click", () => {
  modalEntrega.style.display = "flex";
  inputDestinoEntrega.focus();
});

btnFecharModalEntrega.addEventListener("click", () => {
  fecharModalEntrega();
});

window.addEventListener("click", (event) => {
  if (event.target === modalEntrega) {
    fecharModalEntrega();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    fecharModalEntrega();
  }
});

function fecharModalEntrega() {
  modalEntrega.style.display = "none";
}

/* =========================
   ADICIONAR ITEM À ENTREGA
========================= */

btnAdicionarItem.addEventListener("click", () => {
  const nomeMaterial = padronizarTexto(inputMaterialEntrega.value);

  const quantidade = Number(document.getElementById("quantidadeEntrega").value);

  const material = materiais.find((item) => item.nome === nomeMaterial);

  if (!material) {
    mostrarNotificacao("Material não encontrado.", "erro");
    return;
  }

  if (quantidade <= 0) {
    mostrarNotificacao("Quantidade inválida.", "erro");
    return;
  }

  const itemExistente = itensEntrega.find(
    (item) => item.materialId === material._key,
  );

  const quantidadeJaAdicionada = itemExistente?.quantidade || 0;

  const quantidadeTotal = quantidadeJaAdicionada + quantidade;

  if (quantidadeTotal > Number(material.estoque || 0)) {
    mostrarNotificacao("Estoque insuficiente.", "erro");
    return;
  }

  if (itemExistente) {
    itemExistente.quantidade = quantidadeTotal;
  } else {
    itensEntrega.push({
      nome: material.nome,
      unidade: material.unidade,
      quantidade,
      materialId: material._key,
    });
  }

  renderItensEntrega();

  inputMaterialEntrega.value = "";
  document.getElementById("quantidadeEntrega").value = "";

  inputMaterialEntrega.focus();
});

/* =========================
   RENDERIZAR ITENS DA ENTREGA
========================= */

function renderItensEntrega() {
  const tbody = document.querySelector("#tabelaItensEntrega tbody");

  if (!tbody) return;

  tbody.innerHTML = "";

  if (!itensEntrega.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center;">
          Nenhum item adicionado.
        </td>
      </tr>
    `;

    return;
  }

  itensEntrega.forEach((item, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="assunto">
        ${escaparHtmlEstoque(item.nome)}
      </td>

      <td>
        ${item.quantidade}
        ${escaparHtmlEstoque(formatarUnidade(item.unidade, item.quantidade))}
      </td>

      <td>
        <button
          class="cancel-btn btn-remover-item"
          type="button"
          data-index="${index}"
          title="Remover item"
        >
          <span class="material-symbols-outlined">
            delete
          </span>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

document
  .querySelector("#tabelaItensEntrega tbody")
  .addEventListener("click", (event) => {
    const botao = event.target.closest(".btn-remover-item");

    if (!botao) return;

    const index = Number(botao.dataset.index);

    if (Number.isNaN(index)) return;

    itensEntrega.splice(index, 1);

    renderItensEntrega();
  });

renderItensEntrega();

/* =========================
   GERAR ROMANEIO
========================= */

let gerandoRomaneio = false;

btnGerarRomaneio.addEventListener("click", async () => {
  if (gerandoRomaneio) return;

  const destino = padronizarTexto(inputDestinoEntrega.value);

  if (!destino) {
    mostrarNotificacao("Informe o destino.", "erro");
    return;
  }

  if (!itensEntrega.length) {
    mostrarNotificacao("Adicione pelo menos um item.", "erro");
    return;
  }

  for (const item of itensEntrega) {
    const material = materiais.find(
      (registro) => registro._key === item.materialId,
    );

    if (!material) {
      mostrarNotificacao(
        `O material "${item.nome}" não foi encontrado.`,
        "erro",
      );
      return;
    }

    if (Number(item.quantidade) > Number(material.estoque || 0)) {
      mostrarNotificacao(`Estoque insuficiente para "${item.nome}".`, "erro");
      return;
    }
  }

  gerandoRomaneio = true;

  btnGerarRomaneio.disabled = true;
  btnGerarRomaneio.textContent = "Gerando...";

  try {
    for (const item of itensEntrega) {
      const material = materiais.find(
        (registro) => registro._key === item.materialId,
      );

      await update(ref(rtdb, `materiais/${item.materialId}`), {
        estoque: Number(material.estoque) - Number(item.quantidade),
        atualizadoEm: new Date().toISOString(),
      });
    }

    const movimentacao = {
      destino,
      data: new Date().toISOString(),
      itens: itensEntrega.map((item) => ({
        ...item,
      })),
      responsavel: getNomeResponsavel(),
    };

    await push(movimentacoesRef, movimentacao);

    gerarPDF(movimentacao);

    itensEntrega = [];
    renderItensEntrega();

    inputDestinoEntrega.value = "";
    inputMaterialEntrega.value = "";

    document.getElementById("quantidadeEntrega").value = "";

    modalEntrega.style.display = "none";

    mostrarNotificacao("Romaneio gerado com sucesso!");
  } catch (erro) {
    console.error("Erro ao gerar romaneio:", erro);

    mostrarNotificacao("Erro ao gerar romaneio.", "erro");
  } finally {
    gerandoRomaneio = false;

    btnGerarRomaneio.disabled = false;
    btnGerarRomaneio.textContent = "Gerar Romaneio";
  }
});

/* =========================
   GERAR PDF
========================= */

function gerarPDF(dados) {
  const doc = new jsPDF();

  const img = new Image();
  img.src = "./src/images/papel-timbrado.png";

  img.onload = () => {
    const larguraPagina = doc.internal.pageSize.getWidth();

    const alturaPagina = doc.internal.pageSize.getHeight();

    const margemEsquerda = 20;
    const margemDireita = 20;

    const larguraTexto = larguraPagina - margemEsquerda - margemDireita;

    const limiteInferiorItens = 235;

    let paginaAtual = 1;
    let y = 0;

    function adicionarCabecalhoPagina(primeiraPagina = false) {
      doc.addImage(img, "PNG", 0, 0, larguraPagina, alturaPagina);

      if (primeiraPagina) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);

        doc.text("ROMANEIO DE ENTREGA", larguraPagina / 2, 48, {
          align: "center",
        });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);

        doc.text(`Destino: ${dados.destino}`, margemEsquerda, 68);

        doc.text(`Data: ${formatarData(dados.data)}`, margemEsquerda, 76);

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
        alturaPagina - 10,
        {
          align: "right",
        },
      );

      doc.setFontSize(12);
    }

    function adicionarNovaPagina() {
      doc.addPage();

      paginaAtual++;

      adicionarCabecalhoPagina(false);
    }

    adicionarCabecalhoPagina(true);

    dados.itens.forEach((item, index) => {
      const descricao =
        `${index + 1}. ${item.nome} - ` +
        `${item.quantidade} ` +
        `${formatarUnidade(item.unidade, item.quantidade)}`;

      const linhas = doc.splitTextToSize(descricao, larguraTexto);

      const alturaItem = linhas.length * 7;

      if (y + alturaItem > limiteInferiorItens) {
        adicionarNovaPagina();
      }

      doc.text(linhas, margemEsquerda, y);

      y += alturaItem + 3;
    });

    const totalVolumes = dados.itens.reduce(
      (total, item) => total + Number(item.quantidade || 0),
      0,
    );

    const espacoFinalNecessario = 55;

    if (y + espacoFinalNecessario > alturaPagina - 20) {
      adicionarNovaPagina();
    }

    y += 7;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    doc.text(`Volume total: ${totalVolumes} unidades`, margemEsquerda, y);

    y += 35;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    doc.line(20, y, 85, y);
    doc.line(125, y, 190, y);

    doc.text("Responsável pela Entrega", 52, y + 7, {
      align: "center",
    });

    doc.text("Responsável pelo Recebimento", 157, y + 7, {
      align: "center",
    });

    // ===============================
    // ÁREA DE CONFORMIDADE
    // ===============================

    y += 20;

    const alturaCaixa = 63;
    const larguraCaixa = larguraPagina - margemEsquerda - margemDireita;

    // Verifica se há espaço na página
    if (y + alturaCaixa > alturaPagina - 20) {
      adicionarNovaPagina();

      y += 5;
    }

    // Caixa externa
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);

    doc.rect(margemEsquerda, y, larguraCaixa, alturaCaixa);

    // Título
    doc.setFont("helvetica", "bold");

    doc.setFontSize(11);

    doc.text("CONFORMIDADE", margemEsquerda + 5, y + 8);

    // Opções
    doc.setFont("helvetica", "normal");

    doc.setFontSize(10);

    doc.text("Conformidade:", margemEsquerda + 5, y + 18);

    // Checkbox SIM
    doc.rect(margemEsquerda + 32, y + 14, 4, 4);

    doc.text("Sim", margemEsquerda + 39, y + 18);

    // Checkbox NÃO
    doc.rect(margemEsquerda + 55, y + 14, 4, 4);

    doc.text("Não", margemEsquerda + 62, y + 18);

    // Descrição
    doc.text(
      "Em caso de desconformidade, descrever:",
      margemEsquerda + 5,
      y + 29,
    );

    // Linhas para preenchimento
    doc.line(
      margemEsquerda + 5,
      y + 37,
      larguraPagina - margemDireita - 5,
      y + 37,
    );

    doc.line(
      margemEsquerda + 5,
      y + 44,
      larguraPagina - margemDireita - 5,
      y + 44,
    );

    doc.line(
      margemEsquerda + 5,
      y + 51,
      larguraPagina - margemDireita - 5,
      y + 51,
    );

    doc.line(
      margemEsquerda + 5,
      y + 58,
      larguraPagina - margemDireita - 5,
      y + 58,
    );

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    window.open(url, "_blank");

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  };

  img.onerror = () => {
    console.error("Não foi possível carregar o papel timbrado.");

    mostrarNotificacao("Erro ao carregar o papel timbrado do PDF.", "erro");
  };
}

/* =========================
   HISTÓRICO DE ROMANEIOS
========================= */

onValue(
  movimentacoesRef,
  (snapshot) => {
    historicoRomaneios = snapshot.exists()
      ? Object.entries(snapshot.val())
          .map(([key, dados]) => ({
            ...dados,
            _key: key,
          }))
          .sort(
            (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
          )
      : [];

    renderHistorico();
  },
  (erro) => {
    console.error("Erro ao carregar histórico:", erro);

    if (listaHistorico) {
      listaHistorico.innerHTML = `
        <div class="estoque-vazio">
          Não foi possível carregar o histórico.
        </div>
      `;
    }

    mostrarNotificacao("Erro ao carregar histórico.", "erro");
  },
);

function renderHistorico() {
  if (!listaHistorico) return;

  const busca = inputBuscaHistorico.value.toLowerCase().trim();

  const filtrados = historicoRomaneios.filter((movimentacao) => {
    const texto = `
        ${movimentacao.destino || ""}
        ${movimentacao.responsavel || ""}
        ${formatarData(movimentacao.data)}
      `.toLowerCase();

    return texto.includes(busca);
  });

  if (contadorRomaneios) {
    contadorRomaneios.textContent = `${filtrados.length} romaneio${
      filtrados.length === 1 ? "" : "s"
    }`;
  }

  if (!filtrados.length) {
    listaHistorico.innerHTML = `
      <div class="estoque-vazio">
        Nenhum romaneio encontrado.
      </div>
    `;

    return;
  }

  listaHistorico.innerHTML = filtrados
    .map((movimentacao) => {
      const data = separarDataRomaneio(movimentacao.data);

      const quantidadeItens = movimentacao.itens?.length || 0;

      return `
        <article class="card-romaneio">
          <div class="romaneio-data">
            <strong>${data.dia}</strong>
            <span>${data.mes}</span>
            <span>${data.ano}</span>
          </div>

          <div class="romaneio-conteudo">
            <h3 class="romaneio-destino">
              ${escaparHtmlEstoque(movimentacao.destino || "Sem destino")}
            </h3>

            <div class="romaneio-detalhes">
              <span>
                <span class="material-symbols-outlined">
                  inventory_2
                </span>

                ${quantidadeItens}
                item${quantidadeItens === 1 ? "" : "s"}
              </span>

              <span>
                <span class="material-symbols-outlined">
                  person
                </span>

                ${escaparHtmlEstoque(movimentacao.responsavel || "-")}
              </span>
            </div>
          </div>

          <button
            class="btn-pdf-romaneio"
            type="button"
            data-id="${movimentacao._key}"
            title="Gerar PDF"
            aria-label="Gerar PDF"
          >
            <span class="material-symbols-outlined">
              picture_as_pdf
            </span>
          </button>
        </article>
      `;
    })
    .join("");
}

listaHistorico.addEventListener("click", (event) => {
  const botao = event.target.closest(".btn-pdf-romaneio");

  if (!botao) return;

  const movimentacao = historicoRomaneios.find(
    (item) => item._key === botao.dataset.id,
  );

  if (movimentacao) {
    gerarPDF(movimentacao);
  }
});

inputBuscaHistorico.addEventListener("input", renderHistorico);

/* =========================
   ABAS
========================= */

const tabBtns = document.querySelectorAll(".tab-btn");

const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach((botao) => {
  botao.addEventListener("click", () => {
    tabBtns.forEach((item) => {
      item.classList.remove("active");
    });

    tabContents.forEach((conteudo) => {
      conteudo.classList.remove("active");
    });

    botao.classList.add("active");

    const aba = document.getElementById(botao.dataset.tab);

    if (aba) {
      aba.classList.add("active");
    }
  });
});
