import { auth, rtdb } from "./firebaseConfig.js";

import {
  ref,
  push,
  onValue,
  update,
  increment,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const { jsPDF } = window.jspdf;
const mostrarNotificacao = window.mostrarNotificacao;

const listaMateriais = document.getElementById("listaMateriais");
const listaHistorico = document.getElementById("listaHistorico");

const contadorMateriais = document.getElementById("contadorMateriais");
const contadorRomaneios = document.getElementById("contadorRomaneios");

const materiaisRef = ref(rtdb, "materiais");
const movimentacoesRef = ref(rtdb, "movimentacoes");
const historicoEstoqueRef = ref(rtdb, "historicoEstoque");
const destinosRef = ref(rtdb, "servidores/locaisExercicio");

const categoriasEstoqueRef = ref(rtdb, "configuracoes/estoque/categorias");

const permissoesEstoqueRef = ref(rtdb, "configuracoes/estoque/permissoes");

let materiais = [];
let historicoRomaneios = [];
let historicoEstoque = [];
let destinos = [];
let itensEntrega = [];

let destinoIdSelecionado = null;
let materialCadastroSelecionadoId = null;
let materialEmEdicaoId = null;

let categoriasEstoque = [];
let permissoesEstoque = {};

let perfilUsuario = "";
let permissaoEstoqueUsuario = null;

/* =========================
   FUNÇÕES AUXILIARES
========================= */

function normalizarBusca(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarQuantidadeInput(input) {
  let valor = input.value.replace(/\D/g, "");

  if (!valor) {
    input.value = "";
    return;
  }

  valor = String(Number(valor));

  input.value = Number(valor).toLocaleString("pt-BR");
}

function obterQuantidadeNumerica(valor) {
  return Number(String(valor || "").replace(/\./g, ""));
}

function getNomeResponsavel() {
  return window.dadosUsuario?.nome?.split(" ")[0] || "Usuário";
}

const EMAIL_EXCLUSAO_ROMANEIO = "raphaelcardoso@email.com";

function usuarioPodeExcluirRomaneio() {
  return (
    String(auth.currentUser?.email || "").trim().toLowerCase() ===
    EMAIL_EXCLUSAO_ROMANEIO
  );
}

async function registrarMovimentacaoEstoque({
  tipo,
  acao,
  materialId,
  material,
  categoriaId,
  unidade,
  quantidade,
  estoqueAnterior,
  estoquePosterior,
  justificativa = "",
  destinoId = null,
  destino = "",
  romaneioId = null,
  solicitacaoId = null,
  protocolo = "",
}) {
  await push(historicoEstoqueRef, {
    tipo,
    acao,

    materialId: materialId || null,

    material: material || "",

    categoriaId: categoriaId || null,

    unidade: unidade || "Unidade",

    quantidade: Number(quantidade || 0),

    estoqueAnterior: Number(estoqueAnterior || 0),

    estoquePosterior: Number(estoquePosterior || 0),

    justificativa: justificativa.trim(),

    destinoId,
    destino,
    romaneioId,
    solicitacaoId,
    protocolo,

    usuario: getNomeResponsavel(),

    data: new Date().toISOString(),
  });
}

function obterNomeDestino(destinoId) {
  if (!destinoId) {
    return "";
  }

  const destino = destinos.find(
    (item) => String(item.id) === String(destinoId),
  );

  return destino?.nome || "";
}

function obterDestinoRomaneio(movimentacao) {
  if (!movimentacao) {
    return "-";
  }

  /*
   * Romaneios novos:
   * usa destinoId como referência.
   */
  if (movimentacao.destinoId) {
    const nomeAtual = obterNomeDestino(movimentacao.destinoId);

    if (nomeAtual) {
      return nomeAtual;
    }
  }

  /*
   * Romaneios antigos ou caso
   * o local tenha sido removido:
   * usa o nome histórico salvo.
   */
  return movimentacao.destino || "-";
}

function formatarUnidade(unidade, quantidade) {
  if (quantidade === 1) {
    return unidade;
  }

  const plurais = {
    Unidade: "Unidades",
    Caixa: "Caixas",
    Resma: "Resmas",
    Pacote: "Pacotes",
    Fardo: "Fardos",
    Kit: "Kits",
    Kg: "Kg",
    Quilograma: "Quilogramas",
    Grama: "Gramas",
    Litro: "Litros",
    Mililitro: "Mililitros",
    Saco: "Sacos",
    Lata: "Latas",
    Garrafa: "Garrafas",
    Pote: "Potes",
    Frasco: "Frascos",
    "Mão (50 unidades)": "Mãos (50 unidades)",
  };

  return plurais[unidade] || unidade;
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
   PERMISSÕES DO ESTOQUE
========================= */

function atualizarPerfilUsuario() {
  perfilUsuario = String(window.dadosUsuario?.cargo || "")
    .trim()
    .toUpperCase();

  permissaoEstoqueUsuario = permissoesEstoque[perfilUsuario] || null;
}

function categoriaPermitida(categoriaId) {
  if (!categoriaId) return false;

  atualizarPerfilUsuario();

  if (!permissaoEstoqueUsuario) {
    return false;
  }

  if (permissaoEstoqueUsuario.todas === true) {
    return true;
  }

  return permissaoEstoqueUsuario.categorias?.[categoriaId] === true;
}

function obterCategoriasPermitidas() {
  atualizarPerfilUsuario();

  if (!permissaoEstoqueUsuario) {
    return [];
  }

  if (permissaoEstoqueUsuario.todas === true) {
    return [...categoriasEstoque];
  }

  return categoriasEstoque.filter(
    (categoria) => permissaoEstoqueUsuario.categorias?.[categoria.id] === true,
  );
}

function obterMateriaisPermitidos() {
  return materiais.filter((material) =>
    categoriaPermitida(material.categoriaId),
  );
}

function obterNomeCategoria(categoriaId) {
  const categoria = categoriasEstoque.find((item) => item.id === categoriaId);

  return categoria?.nome || "-";
}

function obterIconeCategoria(categoriaId) {
  const nome = obterNomeCategoria(categoriaId).trim().toUpperCase();

  const icones = {
    ALIMENTAÇÃO: "restaurant",
    BANDA: "music_note",
    EXPEDIENTE: "attach_file",
    FARDAMENTO: "apparel",
    LIMPEZA: "cleaning_services",
    MOBILIÁRIO: "chair",
    PEDAGÓGICO: "menu_book",
    UTENSÍLIOS: "flatware",
  };

  return icones[nome] || "inventory_2";
}

function preencherCategoriasMaterial() {
  if (!selectCategoriaMaterial) return;

  const valorAtual = selectCategoriaMaterial.value;

  const categoriasPermitidas = obterCategoriasPermitidas();

  selectCategoriaMaterial.innerHTML = `
    <option value="">
      Selecione a categoria
    </option>
  `;

  categoriasPermitidas.forEach((categoria) => {
    const option = document.createElement("option");

    option.value = categoria.id;

    option.textContent = categoria.nome;

    selectCategoriaMaterial.appendChild(option);
  });

  if (
    valorAtual &&
    categoriasPermitidas.some((categoria) => categoria.id === valorAtual)
  ) {
    selectCategoriaMaterial.value = valorAtual;
  }
}

function preencherFiltroCategoriasEstoque() {
  if (!filtroCategoriaEstoque) return;

  const valorAtual = filtroCategoriaEstoque.value;
  const categoriasPermitidas = obterCategoriasPermitidas();

  filtroCategoriaEstoque.innerHTML = `
    <option value="">Todas as categorias</option>
  `;

  categoriasPermitidas.forEach((categoria) => {
    const option = document.createElement("option");

    option.value = categoria.id;
    option.textContent = categoria.nome;

    filtroCategoriaEstoque.appendChild(option);
  });

  if (
    valorAtual &&
    categoriasPermitidas.some((categoria) => categoria.id === valorAtual)
  ) {
    filtroCategoriaEstoque.value = valorAtual;
  }
}

function selecionarMaterialCadastro(valorSelecionado) {
  if (materialEmEdicaoId) return;

  const valorNormalizado = normalizarBusca(valorSelecionado);

  const material = obterMateriaisPermitidos().find(
    (item) =>
      normalizarBusca(item.nome) === valorNormalizado ||
      normalizarBusca(item.codigo) === valorNormalizado,
  );

  if (!material) {
    materialCadastroSelecionadoId = null;
    return;
  }

  materialCadastroSelecionadoId = material._key;

  inputMaterial.value = material.nome || "";
  inputCodigoMaterial.value = material.codigo || "";

  selectCategoriaMaterial.value = material.categoriaId || "";
  selectUnidadeMaterial.value = material.unidade || "Unidade";

  selectCategoriaMaterial.disabled = true;
  selectUnidadeMaterial.disabled = true;
}

function liberarDadosMaterialCadastro() {
  if (materialEmEdicaoId) return;

  materialCadastroSelecionadoId = null;

  selectCategoriaMaterial.disabled = false;
  selectUnidadeMaterial.disabled = false;

  if (!inputMaterial.value.trim()) {
    selectCategoriaMaterial.value = "";
    selectUnidadeMaterial.value = "Unidade";
  }
}

/* =========================
   AUTOCOMPLETE
========================= */

function mostrarSugestoes(
  input,
  lista,
  box,
  aoSelecionar = null,
  aoDigitar = null,
) {
  if (!input || !box) return;

  input.oninput = () => {
    if (typeof aoDigitar === "function") {
      aoDigitar();
    }

    const valor = normalizarBusca(input.value);

    box.innerHTML = "";

    if (!valor) {
      box.style.display = "none";
      return;
    }

    const filtrados = lista.filter((item) =>
      normalizarBusca(item).includes(valor),
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

        if (typeof aoSelecionar === "function") {
          aoSelecionar(item);
        }
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
const inputCodigoMaterial = document.getElementById("codigoMaterial");
const boxMaterial = document.getElementById("autocompleteMaterial");
const selectCategoriaMaterial = document.getElementById("categoriaMaterial");
const selectUnidadeMaterial = document.getElementById("unidade");

const inputQuantidade = document.getElementById("quantidade");
const inputJustificativaEntrada = document.getElementById(
  "justificativaEntrada",
);

const campoJustificativaEntrada = document.getElementById(
  "campoJustificativaEntrada",
);
const inputQuantidadeEntrega = document.getElementById("quantidadeEntrega");
inputQuantidade?.addEventListener("input", () => {
  formatarQuantidadeInput(inputQuantidade);
});

inputQuantidadeEntrega?.addEventListener("input", () => {
  formatarQuantidadeInput(inputQuantidadeEntrega);
});

const inputDestinoEntrega = document.getElementById("destinoEntrega");
const boxDestinoEntrega = document.getElementById("autocompleteDestinoEntrega");
const inputObservacaoEntrega = document.getElementById("observacaoEntrega");

const inputMaterialEntrega = document.getElementById("materialEntrega");
const boxEntrega = document.getElementById("autocompleteEntrega");

const formMaterial = document.getElementById("formMaterial");
const btnAdicionarEstoque = document.getElementById("btnAdicionarEstoque");

const btnCancelarEdicaoMaterial = document.getElementById(
  "btnCancelarEdicaoMaterial",
);

const btnNovaEntrega = document.getElementById("btnNovaEntrega");

const btnExportarExcel = document.getElementById("btnExportarExcel");

const drawerEntrega = document.getElementById("drawerEntrega");

const drawerOverlay = document.getElementById("drawerOverlay");

const btnFecharDrawerEntrega = document.getElementById("fecharDrawerEntrega");

const btnAdicionarItem = document.getElementById("btnAdicionarItem");
const btnGerarRomaneio = document.getElementById("btnGerarRomaneio");

const inputBusca = document.getElementById("busca");
const filtroCategoriaEstoque = document.getElementById(
  "filtroCategoriaEstoque",
);
const inputBuscaHistorico = document.getElementById("buscaHistorico");
const inputBuscaMovimentacoes = document.getElementById("buscaMovimentacoes");

const filtroTipoMovimentacao = document.getElementById(
  "filtroTipoMovimentacao",
);

const listaMovimentacoes = document.getElementById("listaMovimentacoes");

const contadorMovimentacoes = document.getElementById("contadorMovimentacoes");

/* =========================
   CATEGORIAS E PERMISSÕES
========================= */

onValue(categoriasEstoqueRef, (snapshot) => {
  categoriasEstoque = snapshot.exists()
    ? Object.entries(snapshot.val()).map(([id, dados]) => ({
        id,
        ...dados,
      }))
    : [];

  categoriasEstoque.sort((a, b) =>
    String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
      sensitivity: "base",
    }),
  );

  preencherCategoriasMaterial();

  preencherFiltroCategoriasEstoque();

  renderTabela();
});

onValue(permissoesEstoqueRef, (snapshot) => {
  permissoesEstoque = snapshot.exists() ? snapshot.val() : {};

  atualizarPerfilUsuario();

  preencherCategoriasMaterial();

  preencherFiltroCategoriasEstoque();

  renderTabela();

  atualizarAutocompletesMateriais();

  renderHistorico();
});

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

  mostrarSugestoes(
    inputDestinoEntrega,
    nomesDestinos,
    boxDestinoEntrega,

    (nomeSelecionado) => {
      const destino = destinos.find((item) => item.nome === nomeSelecionado);

      destinoIdSelecionado = destino?.id || null;
    },

    () => {
      destinoIdSelecionado = null;
    },
  );
});

function atualizarAutocompletesMateriais() {
  const permitidos = obterMateriaisPermitidos();

  const nomesECodigos = permitidos.flatMap((material) => {
    const valores = [];

    if (material.nome) {
      valores.push(material.nome);
    }

    if (material.codigo) {
      valores.push(material.codigo);
    }

    return valores;
  });

  /* CADASTRO / ENTRADA NO ESTOQUE */
  mostrarSugestoes(
    inputMaterial,
    nomesECodigos,
    boxMaterial,

    (valorSelecionado) => {
      selecionarMaterialCadastro(valorSelecionado);
    },

    () => {
      liberarDadosMaterialCadastro();
    },
  );

  /* ROMANEIO */
  mostrarSugestoes(
    inputMaterialEntrega,
    nomesECodigos,
    boxEntrega,

    (valorSelecionado) => {
      const valorNormalizado = normalizarBusca(valorSelecionado);

      const material = permitidos.find(
        (item) =>
          normalizarBusca(item.nome) === valorNormalizado ||
          normalizarBusca(item.codigo) === valorNormalizado,
      );

      if (material) {
        inputMaterialEntrega.value = material.nome || "";
      }
    },
  );
}

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

    atualizarAutocompletesMateriais();
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

function encerrarEdicaoMaterial() {
  materialEmEdicaoId = null;

  formMaterial.reset();
  liberarDadosMaterialCadastro();

  inputQuantidade.disabled = false;
  inputQuantidade.required = true;

  inputJustificativaEntrada.disabled = false;
  inputJustificativaEntrada.required = true;
  campoJustificativaEntrada.hidden = false;

  selectUnidadeMaterial.disabled = false;

  btnAdicionarEstoque.value = "Adicionar ao estoque";

  if (btnCancelarEdicaoMaterial) {
    btnCancelarEdicaoMaterial.hidden = true;
  }
}

function editarMaterial(materialId) {
  const material = obterMateriaisPermitidos().find(
    (item) => item._key === materialId,
  );

  if (!material) {
    mostrarNotificacao("Material não encontrado.", "erro");
    return;
  }

  materialEmEdicaoId = material._key;
  materialCadastroSelecionadoId = null;

  inputMaterial.value = material.nome || "";
  inputCodigoMaterial.value = material.codigo || "";
  selectCategoriaMaterial.value = material.categoriaId || "";
  selectUnidadeMaterial.value = material.unidade || "Unidade";
  inputQuantidade.value = "";

  selectCategoriaMaterial.disabled = false;
  selectUnidadeMaterial.disabled = true;

  inputQuantidade.disabled = true;
  inputQuantidade.required = false;

  inputJustificativaEntrada.value = "";
  inputJustificativaEntrada.disabled = true;
  inputJustificativaEntrada.required = false;
  campoJustificativaEntrada.hidden = true;

  btnAdicionarEstoque.value = "Salvar alterações";

  if (btnCancelarEdicaoMaterial) {
    btnCancelarEdicaoMaterial.hidden = false;
  }

  formMaterial.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  inputMaterial.focus();
}

btnCancelarEdicaoMaterial?.addEventListener("click", () => {
  encerrarEdicaoMaterial();
  inputMaterial.focus();
});

formMaterial.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (salvandoMaterial) return;

  const nome = padronizarTexto(inputMaterial.value);

  const codigo = inputCodigoMaterial.value.trim().replace(/\s+/g, "");

  const categoriaId = selectCategoriaMaterial.value;

  const unidade = document.getElementById("unidade").value;

  const quantidade = obterQuantidadeNumerica(inputQuantidade.value);

  const justificativa = inputJustificativaEntrada.value.trim();

  if (
    !nome ||
    !categoriaId ||
    (!materialEmEdicaoId && (quantidade <= 0 || !justificativa))
  ) {
    mostrarNotificacao(
      "Informe o material, a quantidade e a justificativa da entrada.",
      "erro",
    );

    return;
  }

  if (!categoriaPermitida(categoriaId)) {
    mostrarNotificacao(
      "Você não possui permissão para esta categoria.",
      "erro",
    );

    return;
  }

  salvandoMaterial = true;

  btnAdicionarEstoque.disabled = true;
  btnAdicionarEstoque.value = "Salvando...";

  try {
    if (materialEmEdicaoId) {
      const materialEmEdicao = materiais.find(
        (material) => material._key === materialEmEdicaoId,
      );

      if (!materialEmEdicao) {
        mostrarNotificacao("Material não encontrado.", "erro");
        return;
      }

      const nomeDuplicado = materiais.some(
        (material) =>
          material._key !== materialEmEdicaoId &&
          normalizarBusca(material.nome) === normalizarBusca(nome),
      );

      if (nomeDuplicado) {
        mostrarNotificacao(
          "Já existe outro material cadastrado com esse nome.",
          "erro",
        );

        return;
      }

      const codigoDuplicado = codigo
        ? materiais.some(
            (material) =>
              material._key !== materialEmEdicaoId &&
              String(material.codigo || "").trim() === codigo,
          )
        : false;

      if (codigoDuplicado) {
        mostrarNotificacao(
          "Este código já está vinculado a outro material.",
          "erro",
        );

        inputCodigoMaterial.focus();
        return;
      }

      await update(ref(rtdb, `materiais/${materialEmEdicaoId}`), {
        nome,
        codigo: codigo || null,
        categoriaId,
        atualizadoEm: new Date().toISOString(),
      });

      mostrarNotificacao("Material atualizado com sucesso!");

      encerrarEdicaoMaterial();
      inputMaterial.focus();

      return;
    }

    const existente = materialCadastroSelecionadoId
      ? materiais.find(
          (material) => material._key === materialCadastroSelecionadoId,
        )
      : materiais.find(
          (material) =>
            normalizarBusca(material.nome) === normalizarBusca(nome),
        );

    const materialComMesmoCodigo = codigo
      ? materiais.find(
          (material) =>
            String(material.codigo || "").trim() === codigo &&
            material._key !== existente?._key,
        )
      : null;

    if (materialComMesmoCodigo) {
      mostrarNotificacao(
        `Este código já pertence ao material "${materialComMesmoCodigo.nome}".`,
        "erro",
      );

      inputCodigoMaterial.focus();
      return;
    }

    if (existente && existente.unidade !== unidade) {
      mostrarNotificacao(
        `Este material já está cadastrado com a unidade "${existente.unidade}".`,
        "erro",
      );

      return;
    }

    if (existente) {
      const estoqueAnterior = Number(existente.estoque || 0);

      const estoquePosterior = estoqueAnterior + quantidade;

      await update(ref(rtdb, `materiais/${existente._key}`), {
        codigo: codigo || existente.codigo || null,
        estoque: estoquePosterior,
        atualizadoEm: new Date().toISOString(),
      });

      await registrarMovimentacaoEstoque({
        tipo: "entrada",
        acao: "adicao",

        materialId: existente._key,
        material: existente.nome,
        categoriaId: existente.categoriaId,
        unidade: existente.unidade,

        quantidade,
        estoqueAnterior,
        estoquePosterior,
        justificativa,
      });
    } else {
      const novoMaterialRef = await push(materiaisRef, {
        nome,
        codigo: codigo || null,
        categoriaId,
        unidade,
        estoque: quantidade,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      });

      await registrarMovimentacaoEstoque({
        tipo: "entrada",
        acao: "cadastro",

        materialId: novoMaterialRef.key,
        material: nome,
        categoriaId,
        unidade,

        quantidade,
        estoqueAnterior: 0,
        estoquePosterior: quantidade,
        justificativa,
      });
    }

    mostrarNotificacao("Material salvo com sucesso!");

    formMaterial.reset();
    liberarDadosMaterialCadastro();
    inputMaterial.focus();
  } catch (erro) {
    console.error("Erro ao salvar material:", erro);

    mostrarNotificacao("Erro ao salvar material.", "erro");
  } finally {
    salvandoMaterial = false;

    btnAdicionarEstoque.disabled = false;
    btnAdicionarEstoque.value = materialEmEdicaoId
      ? "Salvar alterações"
      : "Adicionar ao estoque";
  }
});

/* =========================
   RENDERIZAÇÃO DOS MATERIAIS
========================= */

function renderTabela() {
  if (!listaMateriais) return;

  const busca = normalizarBusca(inputBusca.value);
  const categoriaSelecionada = filtroCategoriaEstoque?.value || "";

  const filtrados = obterMateriaisPermitidos()
    .filter((material) => {
      const nome = normalizarBusca(material.nome);
      const codigo = normalizarBusca(material.codigo);

      return nome.includes(busca) || codigo.includes(busca);
    })
    .filter(
      (material) =>
        !categoriaSelecionada || material.categoriaId === categoriaSelecionada,
    )
    .sort((a, b) => {
      const estoqueA = Number(a.estoque) || 0;
      const estoqueB = Number(b.estoque) || 0;

      // Sem estoque sempre por último
      if (estoqueA === 0 && estoqueB > 0) {
        return 1;
      }

      if (estoqueA > 0 && estoqueB === 0) {
        return -1;
      }

      // Dentro de cada grupo, ordem alfabética
      return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
        sensitivity: "base",
      });
    });

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
            <div class="material-identificacao">
              <h3 class="material-nome">
                ${escaparHtmlEstoque(material.nome || "-")}
              </h3>

              ${
                material.codigo
                  ? `
                    <span class="material-codigo">
                      <span class="material-symbols-outlined">
                        barcode
                      </span>

                      <span>
                        ${escaparHtmlEstoque(material.codigo)}
                      </span>
                    </span>
                  `
                  : ""
              }
            </div>

            <div
              class="material-estoque ${estoque <= 5 ? "baixo" : ""}"
            >
              <strong>
                ${estoque}
              </strong>
            </div>
          </div>

          <div class="material-info">
            <div class="material-categoria">
              <span class="material-symbols-outlined">
                ${obterIconeCategoria(material.categoriaId)}
              </span>

              <span>
                ${escaparHtmlEstoque(obterNomeCategoria(material.categoriaId))}
              </span>
            </div>

            <div class="material-unidade-estoque">
              <span>
                ${escaparHtmlEstoque(
                  formatarUnidade(material.unidade || "Unidade", estoque),
                )}
              </span>

              <small>em estoque</small>
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
              history
            </span>

            <span>
              Última movimentação:
              ${material.atualizadoEm ? formatarData(material.atualizadoEm) : "-"}
            </span>
          </div>

          <button
            type="button"
            class="btn-editar-material"
            data-material-id="${escaparHtmlEstoque(material._key)}"
            title="Editar material"
            aria-label="Editar material"
          >
            <span class="material-symbols-outlined">edit</span>
          </button>
        </article>
      `;
    })
    .join("");
}

inputBusca.addEventListener("input", renderTabela);

filtroCategoriaEstoque?.addEventListener("change", renderTabela);

listaMateriais?.addEventListener("click", (event) => {
  const botaoEditar = event.target.closest(".btn-editar-material");

  if (!botaoEditar) return;

  editarMaterial(botaoEditar.dataset.materialId);
});

/* =========================
   EXPORTAR ESTOQUE PARA EXCEL
========================= */

btnExportarExcel?.addEventListener("click", () => {
  const materiaisExportar = obterMateriaisPermitidos();

  if (!materiaisExportar.length) {
    mostrarNotificacao("Não há materiais disponíveis para exportar.", "erro");

    return;
  }

  const dadosExcel = materiaisExportar.map((material) => ({
    Material: material.nome || "",
    Código: material.codigo || "",
    Categoria: obterNomeCategoria(material.categoriaId),
    Unidade: material.unidade || "Unidade",
    "Quantidade em Estoque": Number(material.estoque || 0),
    "Última Movimentação": material.atualizadoEm
      ? formatarData(material.atualizadoEm)
      : "",
  }));

  const planilha = XLSX.utils.json_to_sheet(dadosExcel);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, planilha, "Estoque");

  planilha["!cols"] = [
    { wch: 45 }, // Material
    { wch: 20 }, // Código
    { wch: 22 }, // Categoria
    { wch: 15 }, // Unidade
    { wch: 22 }, // Quantidade
    { wch: 22 }, // Última movimentação
  ];

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
   DRAWER DE ENTREGA
========================= */

function abrirDrawerEntrega() {
  drawerEntrega?.classList.add("ativo");
  drawerOverlay?.classList.add("ativo");

  document.body.classList.add("drawer-aberto");

  setTimeout(() => {
    inputDestinoEntrega?.focus();
  }, 250);
}

function fecharDrawerEntrega() {
  drawerEntrega?.classList.remove("ativo");
  drawerOverlay?.classList.remove("ativo");

  document.body.classList.remove("drawer-aberto");
}

btnNovaEntrega?.addEventListener("click", abrirDrawerEntrega);

btnFecharDrawerEntrega?.addEventListener("click", fecharDrawerEntrega);

drawerOverlay?.addEventListener("click", fecharDrawerEntrega);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && drawerEntrega?.classList.contains("ativo")) {
    fecharDrawerEntrega();
  }
});

/* =========================
   ADICIONAR ITEM À ENTREGA
========================= */

btnAdicionarItem.addEventListener("click", () => {
  const nomeMaterial = inputMaterialEntrega.value.trim();

  const quantidade = obterQuantidadeNumerica(inputQuantidadeEntrega.value);

  const valorPesquisado = normalizarBusca(nomeMaterial);

  const material = obterMateriaisPermitidos().find(
    (item) =>
      normalizarBusca(item.nome) === valorPesquisado ||
      normalizarBusca(item.codigo) === valorPesquisado,
  );

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
      categoriaId: material.categoriaId,
      unidade: material.unidade,
      quantidade,
      materialId: material._key,
    });
  }

  renderItensEntrega();

  inputMaterialEntrega.value = "";
  inputQuantidadeEntrega.value = "";

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
  const observacao = inputObservacaoEntrega.value.trim();

  if (!destino) {
    mostrarNotificacao("Informe o destino.", "erro");

    inputDestinoEntrega.focus();

    return;
  }

  if (!destinoIdSelecionado) {
    mostrarNotificacao("Selecione o destino entre as sugestões.", "erro");

    inputDestinoEntrega.focus();

    return;
  }

  const destinoSelecionado = destinos.find(
    (item) => String(item.id) === String(destinoIdSelecionado),
  );

  if (!destinoSelecionado) {
    mostrarNotificacao("O destino selecionado não foi encontrado.", "erro");

    destinoIdSelecionado = null;

    inputDestinoEntrega.focus();

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

    if (!categoriaPermitida(material.categoriaId)) {
      mostrarNotificacao(
        `Você não possui permissão para movimentar "${item.nome}".`,
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
    const movimentacaoRef = push(movimentacoesRef);
    const romaneioId = movimentacaoRef.key;

    if (!romaneioId) {
      throw new Error("Não foi possível gerar o identificador do romaneio.");
    }

    for (const item of itensEntrega) {
      const material = materiais.find(
        (registro) => registro._key === item.materialId,
      );

      const estoqueAnterior = Number(material.estoque || 0);

      const estoquePosterior = estoqueAnterior - Number(item.quantidade);

      await update(ref(rtdb, `materiais/${item.materialId}`), {
        estoque: estoquePosterior,
        atualizadoEm: new Date().toISOString(),
      });

      await registrarMovimentacaoEstoque({
        tipo: "saida",
        acao: "romaneio",
        materialId: material._key,
        material: material.nome,
        categoriaId: material.categoriaId,
        unidade: material.unidade,
        quantidade: item.quantidade,
        estoqueAnterior,
        estoquePosterior,
        destinoId: destinoSelecionado.id,
        destino: destinoSelecionado.nome,
        romaneioId,
      });
    }

    const movimentacao = {
      destinoId: destinoSelecionado.id,

      destino: destinoSelecionado.nome,

      data: new Date().toISOString(),

      observacao,

      itens: itensEntrega.map((item) => ({
        ...item,
      })),

      responsavel: getNomeResponsavel(),
    };

    await update(movimentacaoRef, movimentacao);

    gerarPDF(movimentacao);

    itensEntrega = [];
    renderItensEntrega();

    inputDestinoEntrega.value = "";
    inputMaterialEntrega.value = "";
    inputObservacaoEntrega.value = "";
    destinoIdSelecionado = null;

    inputQuantidadeEntrega.value = "";

    fecharDrawerEntrega();

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

      if (dados.cancelado === true) {
        doc.saveGraphicsState();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(42);
        doc.setTextColor(210, 210, 210);

        doc.text("CANCELADO", larguraPagina / 2, alturaPagina / 2, {
          align: "center",
          angle: 45,
        });

        doc.restoreGraphicsState();
      }

      if (primeiraPagina) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);

        doc.text("ROMANEIO DE ENTREGA", larguraPagina / 2, 48, {
          align: "center",
        });

        let yCabecalho = 68;

        // ===============================
        // AVISO DE ROMANEIO CANCELADO
        // ===============================

        if (dados.cancelado === true) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);

          doc.text("ROMANEIO CANCELADO", larguraPagina / 2, yCabecalho, {
            align: "center",
          });

          yCabecalho += 8;

          if (dados.motivoCancelamento) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);

            const linhasMotivo = doc.splitTextToSize(
              `Motivo: ${dados.motivoCancelamento}`,
              larguraTexto,
            );

            doc.text(linhasMotivo, margemEsquerda, yCabecalho);

            yCabecalho += linhasMotivo.length * 5 + 5;
          }
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);

        doc.text(
          `Destino: ${obterDestinoRomaneio(dados)}`,
          margemEsquerda,
          yCabecalho,
        );

        yCabecalho += 8;

        doc.text(
          `Data: ${formatarData(dados.data)}`,
          margemEsquerda,
          yCabecalho,
        );

        yCabecalho += 8;

        doc.text(
          `Responsável: ${dados.responsavel || "-"}`,
          margemEsquerda,
          yCabecalho,
        );

        yCabecalho += 18;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);

        doc.text("ITENS:", margemEsquerda, yCabecalho);

        y = yCabecalho + 10;
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

    const totalItens = dados.itens.length;

    const espacoFinalNecessario = 55;

    if (y + espacoFinalNecessario > alturaPagina - 20) {
      adicionarNovaPagina();
    }

    y += 7;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    doc.text(
      `Total: ${totalItens} ${totalItens === 1 ? "item" : "itens"}`,
      margemEsquerda,
      y,
    );

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

    // ===============================
    // OBSERVAÇÕES DO ROMANEIO
    // ===============================

    if (dados.observacao?.trim()) {
      y += alturaCaixa + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);

      const tituloObservacao = "OBSERVAÇÕES";

      const textoObservacao = doc.splitTextToSize(
        dados.observacao.trim(),
        larguraCaixa - 10,
      );

      const alturaTexto = textoObservacao.length * 6;

      const alturaCaixaObservacao = Math.max(28, alturaTexto + 18);

      // Cria nova página caso a observação não caiba
      if (y + alturaCaixaObservacao > alturaPagina - 20) {
        adicionarNovaPagina();

        y += 5;
      }

      doc.setDrawColor(0);
      doc.setLineWidth(0.3);

      doc.rect(margemEsquerda, y, larguraCaixa, alturaCaixaObservacao);

      doc.text(tituloObservacao, margemEsquerda + 5, y + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(textoObservacao, margemEsquerda + 5, y + 17);
    }

    const dataArquivo = new Date(dados.data)
      .toLocaleDateString("pt-BR")
      .replace(/\//g, ".");

    window.abrirOuBaixarPDF(
      doc,
      `Romaneio - ${obterDestinoRomaneio(dados)} - ${dataArquivo}.pdf`,
    );
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


/* =========================
   EXCLUIR ROMANEIO
========================= */

let excluindoRomaneio = false;

async function excluirRomaneio(romaneioId) {
  if (excluindoRomaneio) return;

  if (!usuarioPodeExcluirRomaneio()) {
    mostrarNotificacao("Você não possui permissão para excluir romaneios.", "erro");
    return;
  }

  const movimentacao = historicoRomaneios.find(
    (item) => item._key === romaneioId,
  );

  if (!movimentacao) {
    mostrarNotificacao("Romaneio não encontrado.", "erro");
    return;
  }

  if (!Array.isArray(movimentacao.itens) || !movimentacao.itens.length) {
    mostrarNotificacao("Este romaneio não possui itens.", "erro");
    return;
  }

  const confirmou = await window.mostrarConfirmacao({
    titulo: "Excluir romaneio permanentemente",
    mensagem:
      `Deseja excluir o romaneio destinado à "${obterDestinoRomaneio(movimentacao)}"?\n\n` +
      "Os itens serão devolvidos ao estoque e as movimentações vinculadas serão removidas.",
    tipo: "perigo",
    textoConfirmar: "Excluir definitivamente",
    textoCancelar: "Voltar",
  });

  if (!confirmou) return;

  excluindoRomaneio = true;

  try {
    const atualizacoes = {};
    const agora = new Date().toISOString();

    for (const item of movimentacao.itens) {
      const quantidade = Number(item.quantidade || 0);

      if (!item.materialId || quantidade <= 0) {
        throw new Error(`Item inválido no romaneio: ${item.nome || "-"}`);
      }

      atualizacoes[`materiais/${item.materialId}/estoque`] = increment(quantidade);
      atualizacoes[`materiais/${item.materialId}/atualizadoEm`] = agora;
    }

    historicoEstoque
      .filter((registro) => registro.romaneioId === romaneioId)
      .forEach((registro) => {
        atualizacoes[`historicoEstoque/${registro._key}`] = null;
      });

    atualizacoes[`movimentacoes/${romaneioId}`] = null;

    await update(ref(rtdb), atualizacoes);

    mostrarNotificacao(
      "Romaneio excluído e itens devolvidos ao estoque com sucesso!",
    );
  } catch (erro) {
    console.error("Erro ao excluir romaneio:", erro);
    mostrarNotificacao(erro.message || "Erro ao excluir romaneio.", "erro");
  } finally {
    excluindoRomaneio = false;
  }
}

/* =========================
   CANCELAR ROMANEIO
========================= */

let cancelandoRomaneio = false;

async function cancelarRomaneio(romaneioId) {
  if (cancelandoRomaneio) return;

  const movimentacao = historicoRomaneios.find(
    (item) => item._key === romaneioId,
  );

  if (!movimentacao) {
    mostrarNotificacao("Romaneio não encontrado.", "erro");
    return;
  }

  if (movimentacao.cancelado === true) {
    mostrarNotificacao("Este romaneio já foi cancelado.", "erro");
    return;
  }

  if (!Array.isArray(movimentacao.itens) || !movimentacao.itens.length) {
    mostrarNotificacao("Este romaneio não possui itens.", "erro");
    return;
  }

  // Confere permissão para todos os itens
  for (const item of movimentacao.itens) {
    if (!categoriaPermitida(item.categoriaId)) {
      mostrarNotificacao(
        `Você não possui permissão para cancelar a movimentação de "${item.nome}".`,
        "erro",
      );
      return;
    }
  }

  const destino = obterDestinoRomaneio(movimentacao);

  const confirmou = await window.mostrarConfirmacao({
    titulo: "Cancelar romaneio",
    mensagem:
      `Deseja realmente cancelar o romaneio para "${destino}"?\n\n` +
      "Todos os itens serão devolvidos ao estoque.",
    tipo: "perigo",
    textoConfirmar: "Cancelar romaneio",
    textoCancelar: "Voltar",
  });

  if (!confirmou) return;

  const motivoCancelamento = await window.mostrarPrompt({
    titulo: "Motivo do cancelamento",
    mensagem: "Informe o motivo do cancelamento deste romaneio.",
    tipo: "informacao",
    placeholder: "Digite o motivo do cancelamento...",
    textoConfirmar: "Confirmar cancelamento",
    textoCancelar: "Voltar",
    obrigatorio: true,
  });

  if (motivoCancelamento === null) return;

  const motivo = motivoCancelamento.trim();

  if (!motivo) {
    mostrarNotificacao("Informe o motivo do cancelamento.", "erro");
    return;
  }

  cancelandoRomaneio = true;

  try {
    const agora = new Date().toISOString();

    /*
     * Uma única atualização no Firebase:
     * - devolve todos os itens;
     * - marca o romaneio como cancelado;
     * - atualiza os materiais;
     * - registra o estorno no histórico.
     */
    const atualizacoes = {};

    for (const item of movimentacao.itens) {
      const quantidade = Number(item.quantidade || 0);

      if (!item.materialId || quantidade <= 0) {
        throw new Error(`Item inválido no romaneio: ${item.nome || "-"}`);
      }

      const material = materiais.find(
        (registro) => registro._key === item.materialId,
      );

      if (!material) {
        throw new Error(
          `O material "${item.nome}" não foi encontrado no estoque.`,
        );
      }

      atualizacoes[`materiais/${item.materialId}/estoque`] =
        increment(quantidade);

      atualizacoes[`materiais/${item.materialId}/atualizadoEm`] = agora;
    }

    const historicoRef = push(historicoEstoqueRef);
    const historicoId = historicoRef.key;

    atualizacoes[`historicoEstoque/${historicoId}`] = {
      tipo: "entrada",
      acao: "cancelamento_romaneio",

      romaneioId,

      destinoId: movimentacao.destinoId || null,
      destino: movimentacao.destino || destino,

      motivo,

      itens: movimentacao.itens.map((item) => ({
        materialId: item.materialId,
        material: item.nome || "",
        categoriaId: item.categoriaId || null,
        unidade: item.unidade || "Unidade",
        quantidade: Number(item.quantidade || 0),
      })),

      usuario: getNomeResponsavel(),

      data: agora,
    };

    // Marca o romaneio como cancelado
    atualizacoes[`movimentacoes/${romaneioId}/cancelado`] = true;
    atualizacoes[`movimentacoes/${romaneioId}/canceladoEm`] = agora;
    atualizacoes[`movimentacoes/${romaneioId}/canceladoPor`] =
      getNomeResponsavel();
    atualizacoes[`movimentacoes/${romaneioId}/motivoCancelamento`] = motivo;

    await update(ref(rtdb), atualizacoes);

    mostrarNotificacao("Romaneio cancelado e itens devolvidos ao estoque!");
  } catch (erro) {
    console.error("Erro ao cancelar romaneio:", erro);

    mostrarNotificacao(erro.message || "Erro ao cancelar romaneio.", "erro");
  } finally {
    cancelandoRomaneio = false;
  }
}

function renderHistorico() {
  if (!listaHistorico) return;

  const busca = normalizarBusca(inputBuscaHistorico.value);

  const filtrados = historicoRomaneios
    .filter((movimentacao) => {
      if (permissaoEstoqueUsuario?.todas === true) {
        return true;
      }

      if (!Array.isArray(movimentacao.itens)) {
        return false;
      }

      return movimentacao.itens.some((item) =>
        categoriaPermitida(item.categoriaId),
      );
    })
    .filter((movimentacao) => {
      const texto = normalizarBusca(`
        ${obterDestinoRomaneio(movimentacao)}
        ${movimentacao.responsavel || ""}
        ${movimentacao.motivoCancelamento || ""}
        ${formatarData(movimentacao.data)}
      `);

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

      const itensVisiveis =
        permissaoEstoqueUsuario?.todas === true
          ? movimentacao.itens || []
          : (movimentacao.itens || []).filter((item) =>
              categoriaPermitida(item.categoriaId),
            );

      const quantidadeItens = itensVisiveis.length;

      return `
        <article class="card-romaneio">
          <div class="romaneio-data">
            <strong>${data.dia}</strong>
            <span>${data.mes}</span>
            <span>${data.ano}</span>
          </div>

          <div class="romaneio-conteudo">
            <h3 class="romaneio-destino">
              ${escaparHtmlEstoque(obterDestinoRomaneio(movimentacao))}
            </h3>

            <div class="romaneio-detalhes">
              <span>
                <span class="material-symbols-outlined">
                  inventory_2
                </span>

                ${quantidadeItens}
                item${quantidadeItens === 1 ? "" : "s"}
              </span>

              <div class="romaneio-cancelamento-info">
                <span class="romaneio-responsavel">
                  <span class="material-symbols-outlined">
                    person
                  </span>

                  ${escaparHtmlEstoque(movimentacao.responsavel || "-")}
                </span>

                ${
                  movimentacao.cancelado === true
                    ? `
                      <div class="romaneio-cancelamento-detalhes">
                        <span class="romaneio-status-cancelado">
                          <span class="material-symbols-outlined">
                            cancel
                          </span>

                          Cancelado
                        </span>

                        ${
                          movimentacao.motivoCancelamento
                            ? `
                              <span class="romaneio-motivo-cancelamento">
                                <strong>Motivo:</strong>
                                ${escaparHtmlEstoque(movimentacao.motivoCancelamento)}
                              </span>
                            `
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
              </div>
            </div>
          </div>

          <div class="romaneio-acoes">
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

            ${
              usuarioPodeExcluirRomaneio()
                ? `
                  <button
                    class="btn-cancelar-romaneio btn-excluir-romaneio"
                    type="button"
                    data-id="${movimentacao._key}"
                    title="Excluir romaneio permanentemente"
                    aria-label="Excluir romaneio permanentemente"
                  >
                    <span class="material-symbols-outlined">
                      delete_forever
                    </span>
                  </button>
                `
                : ""
            }

            ${
              movimentacao.cancelado !== true
                ? `
                  <button
                    class="btn-cancelar-romaneio"
                    type="button"
                    data-id="${movimentacao._key}"
                    title="Cancelar romaneio"
                    aria-label="Cancelar romaneio"
                  >
                    <span class="material-symbols-outlined">
                      cancel
                    </span>
                  </button>
                `
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}

listaHistorico.addEventListener("click", async (event) => {
  /* =========================
     EXCLUIR ROMANEIO
  ========================= */

  const btnExcluir = event.target.closest(".btn-excluir-romaneio");

  if (btnExcluir) {
    await excluirRomaneio(btnExcluir.dataset.id);
    return;
  }

  /* =========================
     CANCELAR ROMANEIO
  ========================= */

  const btnCancelar = event.target.closest(".btn-cancelar-romaneio");

  if (btnCancelar) {
    await cancelarRomaneio(btnCancelar.dataset.id);
    return;
  }

  /* =========================
     GERAR PDF
  ========================= */

  const btnPDF = event.target.closest(".btn-pdf-romaneio");

  if (!btnPDF) return;

  const movimentacao = historicoRomaneios.find(
    (item) => item._key === btnPDF.dataset.id,
  );

  if (!movimentacao) return;

  if (permissaoEstoqueUsuario?.todas === true) {
    gerarPDF(movimentacao);
    return;
  }

  const itensPermitidos = (movimentacao.itens || []).filter((item) =>
    categoriaPermitida(item.categoriaId),
  );

  if (!itensPermitidos.length) {
    mostrarNotificacao(
      "Você não possui permissão para visualizar os itens deste romaneio.",
      "erro",
    );

    return;
  }

  gerarPDF({
    ...movimentacao,
    itens: itensPermitidos,
  });
});

inputBuscaHistorico.addEventListener("input", renderHistorico);

/* =========================
   HISTÓRICO DE MOVIMENTAÇÕES
========================= */

onValue(
  historicoEstoqueRef,
  (snapshot) => {
    historicoEstoque = snapshot.exists()
      ? Object.entries(snapshot.val())
          .map(([key, dados]) => ({
            ...dados,
            _key: key,
          }))
          .sort(
            (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
          )
      : [];

    renderMovimentacoes();
  },
  (erro) => {
    console.error("Erro ao carregar movimentações:", erro);

    if (listaMovimentacoes) {
      listaMovimentacoes.innerHTML = `
        <div class="estoque-vazio">
          Não foi possível carregar as movimentações.
        </div>
      `;
    }
  },
);

function renderMovimentacoes() {
  if (!listaMovimentacoes) return;

  const busca = normalizarBusca(inputBuscaMovimentacoes?.value);

  const tipo = filtroTipoMovimentacao?.value || "";

  const filtrados = historicoEstoque
    .filter((movimentacao) => {
      if (movimentacao.acao === "cancelamento_romaneio") {
        return (movimentacao.itens || []).some((item) =>
          categoriaPermitida(item.categoriaId),
        );
      }

      return categoriaPermitida(movimentacao.categoriaId);
    })
    .filter((movimentacao) => {
      if (tipo && movimentacao.tipo !== tipo) {
        return false;
      }

      const nomesItens = (movimentacao.itens || [])
        .map((item) => item.material || item.nome || "")
        .join(" ");

      const texto = normalizarBusca(`
        ${obterDestinoRomaneio(movimentacao)}
        ${movimentacao.usuario || ""}
        ${movimentacao.responsavel || ""}
        ${movimentacao.material || ""}
        ${movimentacao.justificativa || ""}
        ${nomesItens}
        ${formatarData(movimentacao.data)}
      `);

      return texto.includes(busca);
    });

  if (contadorMovimentacoes) {
    contadorMovimentacoes.textContent = `${filtrados.length} movimentação${
      filtrados.length === 1 ? "" : "ões"
    }`;
  }

  if (!filtrados.length) {
    listaMovimentacoes.innerHTML = `
      <div class="estoque-vazio">
        Nenhuma movimentação encontrada.
      </div>
    `;

    return;
  }

  listaMovimentacoes.innerHTML = filtrados
    .map((movimentacao) => {
      const data = new Date(movimentacao.data);

      const dataFormatada = data.toLocaleDateString("pt-BR");

      const horaFormatada = data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      if (movimentacao.acao === "cancelamento_romaneio") {
        const itensPermitidos = (movimentacao.itens || []).filter((item) =>
          categoriaPermitida(item.categoriaId),
        );

        const listaItens = itensPermitidos
          .map((item) => {
            const quantidade = Number(item.quantidade || 0);

            return `
        <li>
          <strong>
            ${quantidade}
            ${escaparHtmlEstoque(
              formatarUnidade(item.unidade || "Unidade", quantidade),
            )}
          </strong>
          de
          <strong>
            ${escaparHtmlEstoque(item.material || item.nome || "-")}
          </strong>
        </li>
      `;
          })
          .join("");

        return `
    <article class="card-movimentacao movimentacao-cancelamento">
      <div class="movimentacao-icone cancelamento">
        <span class="material-symbols-outlined">
          undo
        </span>
      </div>

      <div class="movimentacao-conteudo">
        <div class="movimentacao-topo">
          <strong>
            ${escaparHtmlEstoque(movimentacao.usuario || "Usuário")}
          </strong>

          <span>
            ${dataFormatada}
            às
            ${horaFormatada}
          </span>
        </div>

        <p>
          cancelou o romaneio destinado à
          <strong>
            ${escaparHtmlEstoque(obterDestinoRomaneio(movimentacao))}
          </strong>,
          devolvendo ao estoque:
        </p>

        <ul class="movimentacao-itens-devolvidos">
          ${listaItens}
        </ul>

        ${
          movimentacao.motivo
            ? `
      <p>
        <strong>Motivo:</strong>
        ${escaparHtmlEstoque(movimentacao.motivo)}
      </p>
    `
            : ""
        }
      </div>
    </article>
  `;
      }

      const entrada = movimentacao.tipo === "entrada";

      const verbo =
        movimentacao.acao === "cadastro"
          ? "cadastrou"
          : entrada
            ? "adicionou"
            : "retirou";

      return `
            <article class="card-movimentacao">
              <div
                class="movimentacao-icone ${entrada ? "entrada" : "saida"}"
              >
                <span
                  class="material-symbols-outlined"
                >
                  ${entrada ? "south" : "north"}
                </span>
              </div>

              <div class="movimentacao-conteudo">
                <div class="movimentacao-topo">
                  <strong>
                    ${escaparHtmlEstoque(movimentacao.usuario || "Usuário")}
                  </strong>

                  <span>
                    ${dataFormatada}
                    às
                    ${horaFormatada}
                  </span>
                </div>

                <p>
                  ${verbo}
                  <strong>
                    ${movimentacao.quantidade}
                    ${escaparHtmlEstoque(
                      formatarUnidade(
                        movimentacao.unidade || "Unidade",
                        Number(movimentacao.quantidade || 0),
                      ),
                    )}
                  </strong>
                  de
                  <strong>
                    ${escaparHtmlEstoque(movimentacao.material || "-")}
                  </strong>.
                </p>

                ${
                  movimentacao.justificativa
                    ? `
                      <p>
                        <strong>Justificativa:</strong>
                        ${escaparHtmlEstoque(movimentacao.justificativa)}
                      </p>
                    `
                    : ""
                }

                <div class="movimentacao-detalhes">
                  <span>
                    Estoque:
                    ${Number(movimentacao.estoqueAnterior || 0)}
                    →
                    ${Number(movimentacao.estoquePosterior || 0)}
                  </span>

                  ${
                    movimentacao.destino
                      ? `
                        <span>
                          Destino:
                          ${escaparHtmlEstoque(movimentacao.destino)}
                        </span>
                      `
                      : ""
                  }
                </div>
              </div>
            </article>
          `;
    })
    .join("");
}

inputBuscaMovimentacoes?.addEventListener("input", renderMovimentacoes);

filtroTipoMovimentacao?.addEventListener("change", renderMovimentacoes);

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
