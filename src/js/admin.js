import { auth, db, rtdb } from "./firebaseConfig.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  ref,
  push,
  onValue,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* =========================================
   CONFIGURAÇÕES
========================================= */

let PERFIS = ["ADM"];

/* =========================================
   ESTADO
========================================= */

let categoriasEstoque = [];
let permissoesEstoque = {};
let permissoesSolicitacoes = {};

let configuracaoCategoriasMateriais = {
  todas: false,
  categorias: {},
};

let configuracaoCategoriasMateriaisLimpeza = {
  todas: false,
  categorias: {},
};

let editandoCategoriaEstoque = false;
let chaveCategoriaEstoqueEdicao = null;

let usuarios = [];
let itensMenu = [];

let gruposMenu = [];

let editandoGrupoMenu = false;
let chaveGrupoMenuEdicao = null;

let editandoMenu = false;
let chaveMenuEdicao = null;

let locaisExercicio = [];
let servidoresAdmin = [];

let editandoLocal = false;
let chaveLocalEdicao = null;

let destinosOficios = [];
let oficiosAdmin = [];

let editandoDestino = false;
let chaveDestinoEdicao = null;

/* =========================================
   ELEMENTOS - ABAS
========================================= */

const tabs = document.querySelectorAll(".admin-tab");

const tabContents = document.querySelectorAll(".admin-tab-content");

/* =========================================
   ELEMENTOS - USUÁRIOS
========================================= */

const listaUsuarios = document.getElementById("listaUsuariosAdmin");

const buscaUsuario = document.getElementById("buscaUsuarioAdmin");

const filtroPerfil = document.getElementById("filtroPerfilUsuario");

const filtroSituacao = document.getElementById("filtroSituacaoUsuario");

const contadorUsuarios = document.getElementById("contadorUsuarios");

/* =========================================
   ELEMENTOS - MENU
========================================= */

const grupoMenu = document.getElementById("grupoMenu");

const perfisMenuContainer = document.getElementById("perfisMenuContainer");

/* =========================================
   ELEMENTOS - GRUPOS DO MENU
========================================= */

const formGrupoMenuAdmin = document.getElementById("formGrupoMenuAdmin");

const tituloGrupoMenu = document.getElementById("tituloGrupoMenu");

const ordemGrupoMenu = document.getElementById("ordemGrupoMenu");

const listaGruposMenuAdmin = document.getElementById("listaGruposMenuAdmin");

const contadorGruposMenuAdmin = document.getElementById(
  "contadorGruposMenuAdmin",
);

const tituloFormularioGrupoMenu = document.getElementById(
  "tituloFormularioGrupoMenu",
);

const btnCancelarEdicaoGrupoMenu = document.getElementById(
  "btnCancelarEdicaoGrupoMenu",
);

const msgEdicaoGrupoMenu = document.getElementById("msgEdicaoGrupoMenu");

const formMenu = document.getElementById("formMenuAdmin");

const tituloMenu = document.getElementById("tituloMenu");

const linkMenu = document.getElementById("linkMenu");

const iconeMenu = document.getElementById("iconeMenu");

const ordemMenu = document.getElementById("ordemMenu");

const ativoMenu = document.getElementById("ativoMenu");

const badgeNovoMenu = document.getElementById("badgeNovoMenu");

const acessoTodosMenu = document.getElementById("acessoTodosMenu");

const previewIconeMenu = document.getElementById("previewIconeMenu");

const blocoPerfisMenu = document.getElementById("blocoPerfisMenu");

const listaMenuAdmin = document.getElementById("listaMenuAdmin");

const contadorItensMenu = document.getElementById("contadorItensMenu");

const btnCancelarEdicaoMenu = document.getElementById("btnCancelarEdicaoMenu");

const tituloFormularioMenu = document.getElementById("tituloFormularioMenu");

const msgEdicaoMenu = document.getElementById("msgEdicaoMenu");

/* =========================================
   ELEMENTOS - LOCAIS
========================================= */

const formLocalAdmin = document.getElementById("formLocalAdmin");

const nomeLocalAdmin = document.getElementById("nomeLocalAdmin");

const buscaLocalAdmin = document.getElementById("buscaLocalAdmin");

const listaLocaisAdmin = document.getElementById("listaLocaisAdmin");

const contadorLocaisAdmin = document.getElementById("contadorLocaisAdmin");

const tituloFormularioLocal = document.getElementById("tituloFormularioLocal");

const btnCancelarEdicaoLocal = document.getElementById(
  "btnCancelarEdicaoLocal",
);

const msgEdicaoLocal = document.getElementById("msgEdicaoLocal");

/* =========================================
   ELEMENTOS - DESTINOS
========================================= */

const formDestinoAdmin = document.getElementById("formDestinoAdmin");

const nomeDestinoAdmin = document.getElementById("nomeDestinoAdmin");

const buscaDestinoAdmin = document.getElementById("buscaDestinoAdmin");

const listaDestinosAdmin = document.getElementById("listaDestinosAdmin");

const contadorDestinosAdmin = document.getElementById("contadorDestinosAdmin");

const tituloFormularioDestino = document.getElementById(
  "tituloFormularioDestino",
);

const btnCancelarEdicaoDestino = document.getElementById(
  "btnCancelarEdicaoDestino",
);

const msgEdicaoDestino = document.getElementById("msgEdicaoDestino");

const destinosOficiosRef = ref(rtdb, "destinos");

const categoriasEstoqueRef = ref(rtdb, "configuracoes/estoque/categorias");

const permissoesEstoqueRef = ref(rtdb, "configuracoes/estoque/permissoes");

const permissoesSolicitacoesRef = ref(
  rtdb,
  "configuracoes/solicitacoes/permissoes",
);

const categoriasMateriaisGestoresRef = ref(
  rtdb,
  "configuracoes/solicitacoes/catalogos/materiaisExpediente",
);

const categoriasMateriaisLimpezaRef = ref(
  rtdb,
  "configuracoes/solicitacoes/catalogos/materiaisLimpeza",
);

const oficiosAdminRef = ref(rtdb, "oficios");

/* =========================================
   ELEMENTOS - CATEGORIAS DO ESTOQUE
========================================= */

const formCategoriaEstoqueAdmin = document.getElementById(
  "formCategoriaEstoqueAdmin",
);

const nomeCategoriaEstoque = document.getElementById("nomeCategoriaEstoque");

const buscaCategoriaEstoque = document.getElementById("buscaCategoriaEstoque");

const listaCategoriasEstoque = document.getElementById(
  "listaCategoriasEstoque",
);

const contadorCategoriasEstoque = document.getElementById(
  "contadorCategoriasEstoque",
);

const tituloFormularioCategoriaEstoque = document.getElementById(
  "tituloFormularioCategoriaEstoque",
);

const btnCancelarEdicaoCategoriaEstoque = document.getElementById(
  "btnCancelarEdicaoCategoriaEstoque",
);

const msgEdicaoCategoriaEstoque = document.getElementById(
  "msgEdicaoCategoriaEstoque",
);

/* =========================================
   ELEMENTOS - PERMISSÕES DO ESTOQUE
========================================= */

const perfilPermissaoEstoque = document.getElementById(
  "perfilPermissaoEstoque",
);

const configuracaoPermissaoEstoque = document.getElementById(
  "configuracaoPermissaoEstoque",
);

const todasCategoriasEstoque = document.getElementById(
  "todasCategoriasEstoque",
);

const blocoCategoriasPermitidasEstoque = document.getElementById(
  "blocoCategoriasPermitidasEstoque",
);

const categoriasPermitidasEstoque = document.getElementById(
  "categoriasPermitidasEstoque",
);

const btnSalvarPermissoesEstoque = document.getElementById(
  "btnSalvarPermissoesEstoque",
);

/* =========================================
   ELEMENTOS - PERMISSÕES DAS SOLICITAÇÕES
========================================= */

const perfilPermissaoSolicitacoes = document.getElementById(
  "perfilPermissaoSolicitacoes",
);

const configuracaoPermissaoSolicitacoes = document.getElementById(
  "configuracaoPermissaoSolicitacoes",
);

const todosModulosSolicitacoes = document.getElementById(
  "todosModulosSolicitacoes",
);

const blocoModulosPermitidosSolicitacoes = document.getElementById(
  "blocoModulosPermitidosSolicitacoes",
);

const modulosPermitidosSolicitacoes = document.getElementById(
  "modulosPermitidosSolicitacoes",
);

const btnSalvarPermissoesSolicitacoes = document.getElementById(
  "btnSalvarPermissoesSolicitacoes",
);

const todasCategoriasMateriaisGestores = document.getElementById(
  "todasCategoriasMateriaisGestores",
);

const blocoCategoriasMateriaisGestores = document.getElementById(
  "blocoCategoriasMateriaisGestores",
);

const listaCategoriasMateriaisGestores = document.getElementById(
  "listaCategoriasMateriaisGestores",
);

const btnSalvarCategoriasMateriaisGestores = document.getElementById(
  "btnSalvarCategoriasMateriaisGestores",
);

const todasCategoriasMateriaisLimpeza = document.getElementById(
  "todasCategoriasMateriaisLimpeza",
);

const blocoCategoriasMateriaisLimpeza = document.getElementById(
  "blocoCategoriasMateriaisLimpeza",
);

const listaCategoriasMateriaisLimpeza = document.getElementById(
  "listaCategoriasMateriaisLimpeza",
);

const btnSalvarCategoriasMateriaisLimpeza = document.getElementById(
  "btnSalvarCategoriasMateriaisLimpeza",
);

/* =========================================
   CATEGORIAS DO ESTOQUE
========================================= */

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

  renderCategoriasEstoque();
  renderPermissoesEstoque();
  renderCategoriasMateriaisGestores();
  renderCategoriasMateriaisLimpeza();
});

onValue(permissoesEstoqueRef, (snapshot) => {
  permissoesEstoque = snapshot.exists() ? snapshot.val() : {};

  renderPermissoesEstoque();
});

onValue(permissoesSolicitacoesRef, (snapshot) => {
  permissoesSolicitacoes = snapshot.exists() ? snapshot.val() : {};

  renderPermissoesSolicitacoes();
});

onValue(categoriasMateriaisGestoresRef, (snapshot) => {
  configuracaoCategoriasMateriais = snapshot.exists()
    ? snapshot.val()
    : {
        todas: false,
        categorias: {},
      };

  renderCategoriasMateriaisGestores();
});

onValue(categoriasMateriaisLimpezaRef, (snapshot) => {
  configuracaoCategoriasMateriaisLimpeza = snapshot.exists()
    ? snapshot.val()
    : {
        todas: false,
        categorias: {},
      };

  renderCategoriasMateriaisLimpeza();
});

function renderCategoriasEstoque() {
  if (!listaCategoriasEstoque) return;

  const termo = normalizarTexto(buscaCategoriaEstoque?.value || "");

  const filtradas = categoriasEstoque.filter((categoria) =>
    normalizarTexto(categoria.nome).includes(termo),
  );

  contadorCategoriasEstoque.textContent = `${filtradas.length} categoria${
    filtradas.length === 1 ? "" : "s"
  } encontrada${filtradas.length === 1 ? "" : "s"}`;

  listaCategoriasEstoque.innerHTML = "";

  if (!filtradas.length) {
    listaCategoriasEstoque.innerHTML = `
      <p>
        Nenhuma categoria encontrada.
      </p>
    `;

    return;
  }

  filtradas.forEach((categoria) => {
    const card = document.createElement("div");

    card.className = "local-admin-card";

    card.innerHTML = `
        <div
          class="local-admin-icone local-admin-inicial"
        >
          ${escaparHtml(categoria.nome?.charAt(0).toUpperCase() || "?")}
        </div>

        <div class="local-admin-dados">
          <strong>
            ${escaparHtml(categoria.nome)}
          </strong>
        </div>

        <div class="local-admin-acoes">
          <button
            type="button"
            class="editar-categoria-estoque-btn"
            title="Editar categoria"
          >
            <span
              class="material-symbols-outlined"
            >
              edit_note
            </span>
          </button>

          <button
            type="button"
            class="excluir-categoria-estoque-btn"
            title="Excluir categoria"
          >
            <span
              class="material-symbols-outlined"
            >
              delete
            </span>
          </button>
        </div>
      `;

    card
      .querySelector(".editar-categoria-estoque-btn")
      .addEventListener("click", () => editarCategoriaEstoque(categoria));

    card
      .querySelector(".excluir-categoria-estoque-btn")
      .addEventListener("click", () => excluirCategoriaEstoque(categoria));

    listaCategoriasEstoque.appendChild(card);
  });
}

buscaCategoriaEstoque?.addEventListener("input", renderCategoriasEstoque);

formCategoriaEstoqueAdmin?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nome = nomeCategoriaEstoque.value.trim();

  if (!nome) {
    notificar("Informe o nome da categoria.", "erro");

    return;
  }

  const duplicada = categoriasEstoque.find(
    (categoria) =>
      normalizarTexto(categoria.nome) === normalizarTexto(nome) &&
      categoria.id !== chaveCategoriaEstoqueEdicao,
  );

  if (duplicada) {
    notificar("Já existe uma categoria com este nome.", "erro");

    return;
  }

  try {
    if (editandoCategoriaEstoque && chaveCategoriaEstoqueEdicao) {
      await update(
        ref(
          rtdb,
          `configuracoes/estoque/categorias/${chaveCategoriaEstoqueEdicao}`,
        ),
        {
          nome,
          atualizadoEm: new Date().toISOString(),
        },
      );

      notificar("Categoria atualizada com sucesso!");
    } else {
      await push(categoriasEstoqueRef, {
        nome,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      });

      notificar("Categoria cadastrada com sucesso!");
    }

    resetarFormularioCategoriaEstoque();
  } catch (erro) {
    console.error("Erro ao salvar categoria:", erro);

    notificar("Não foi possível salvar a categoria.", "erro");
  }
});

function editarCategoriaEstoque(categoria) {
  editandoCategoriaEstoque = true;

  chaveCategoriaEstoqueEdicao = categoria.id;

  nomeCategoriaEstoque.value = categoria.nome || "";

  tituloFormularioCategoriaEstoque.textContent = "Editar categoria do estoque";

  btnCancelarEdicaoCategoriaEstoque.style.display = "inline-flex";

  msgEdicaoCategoriaEstoque.innerHTML = `
    <div class="edicao-menu-info">
      <span
        class="material-symbols-outlined"
      >
        edit_note
      </span>

      <div>
        <strong>
          Modo de edição
        </strong>

        <span>
          ${escaparHtml(categoria.nome)}
        </span>
      </div>
    </div>
  `;

  msgEdicaoCategoriaEstoque.style.display = "block";

  document.getElementById("btnTopo")?.click();

  nomeCategoriaEstoque.focus();
}

btnCancelarEdicaoCategoriaEstoque?.addEventListener(
  "click",
  resetarFormularioCategoriaEstoque,
);

function resetarFormularioCategoriaEstoque() {
  editandoCategoriaEstoque = false;

  chaveCategoriaEstoqueEdicao = null;

  formCategoriaEstoqueAdmin.reset();

  tituloFormularioCategoriaEstoque.textContent = "Nova categoria do estoque";

  btnCancelarEdicaoCategoriaEstoque.style.display = "none";

  msgEdicaoCategoriaEstoque.style.display = "none";

  msgEdicaoCategoriaEstoque.innerHTML = "";
}

async function excluirCategoriaEstoque(categoria) {
  const confirmou = await window.mostrarConfirmacao({
    titulo: "Excluir categoria",
    mensagem:
      `Tem certeza que deseja excluir a categoria ` +
      `"${categoria.nome}"?\n\n` +
      "Esta ação não poderá ser desfeita.",
    tipo: "perigo",
    textoConfirmar: "Excluir categoria",
    textoCancelar: "Cancelar",
  });

  if (!confirmou) return;

  try {
    await remove(ref(rtdb, `configuracoes/estoque/categorias/${categoria.id}`));

    notificar("Categoria excluída com sucesso!");

    if (chaveCategoriaEstoqueEdicao === categoria.id) {
      resetarFormularioCategoriaEstoque();
    }
  } catch (erro) {
    console.error("Erro ao excluir categoria:", erro);

    notificar("Não foi possível excluir a categoria.", "erro");
  }
}

/* =========================================
   PERMISSÕES DO ESTOQUE
========================================= */

function renderPermissoesEstoque() {
  if (
    !perfilPermissaoEstoque ||
    !configuracaoPermissaoEstoque ||
    !categoriasPermitidasEstoque
  ) {
    return;
  }

  const perfil = perfilPermissaoEstoque.value;

  if (!perfil) {
    configuracaoPermissaoEstoque.style.display = "none";

    return;
  }

  configuracaoPermissaoEstoque.style.display = "block";

  const permissao = permissoesEstoque[perfil] || {};

  const acessoTodas = permissao.todas === true;

  todasCategoriasEstoque.checked = acessoTodas;

  categoriasPermitidasEstoque.innerHTML = "";

  categoriasEstoque.forEach((categoria) => {
    const label = document.createElement("label");

    label.className = "perfil-check";

    const permitido = permissao.categorias?.[categoria.id] === true;

    label.innerHTML = `
        <input
          type="checkbox"
          class="categoria-permissao-estoque"
          value="${escaparHtml(categoria.id)}"
          ${permitido ? "checked" : ""}
          ${acessoTodas ? "disabled" : ""}
        />

        <span>
          ${escaparHtml(categoria.nome)}
        </span>
      `;

    categoriasPermitidasEstoque.appendChild(label);
  });

  blocoCategoriasPermitidasEstoque.style.opacity = acessoTodas ? "0.5" : "1";
}

perfilPermissaoEstoque?.addEventListener("change", renderPermissoesEstoque);

todasCategoriasEstoque?.addEventListener("change", () => {
  const acessoTodas = todasCategoriasEstoque.checked;

  document
    .querySelectorAll(".categoria-permissao-estoque")
    .forEach((checkbox) => {
      checkbox.disabled = acessoTodas;
    });

  blocoCategoriasPermitidasEstoque.style.opacity = acessoTodas ? "0.5" : "1";
});

btnSalvarPermissoesEstoque?.addEventListener("click", async () => {
  const perfil = perfilPermissaoEstoque.value;

  if (!perfil) {
    notificar("Selecione um perfil.", "erro");

    return;
  }

  const todas = todasCategoriasEstoque.checked;

  const categorias = {};

  if (!todas) {
    document
      .querySelectorAll(".categoria-permissao-estoque:checked")
      .forEach((checkbox) => {
        categorias[checkbox.value] = true;
      });

    if (!Object.keys(categorias).length) {
      notificar("Selecione pelo menos uma categoria.", "erro");

      return;
    }
  }

  try {
    await update(ref(rtdb, `configuracoes/estoque/permissoes/${perfil}`), {
      todas,
      categorias: todas ? null : categorias,
      atualizadoEm: new Date().toISOString(),
    });

    notificar("Permissões do estoque salvas com sucesso!");
  } catch (erro) {
    console.error("Erro ao salvar permissões do estoque:", erro);

    notificar("Não foi possível salvar as permissões.", "erro");
  }
});

/* =========================================
   PERMISSÕES DAS SOLICITAÇÕES
========================================= */

function renderPermissoesSolicitacoes() {
  if (
    !perfilPermissaoSolicitacoes ||
    !configuracaoPermissaoSolicitacoes ||
    !modulosPermitidosSolicitacoes
  ) {
    return;
  }

  const perfil = perfilPermissaoSolicitacoes.value;

  if (!perfil) {
    configuracaoPermissaoSolicitacoes.style.display = "none";
    return;
  }

  configuracaoPermissaoSolicitacoes.style.display = "block";

  const permissao = permissoesSolicitacoes[perfil] || {};
  const acessoTodos = permissao.todas === true;

  todosModulosSolicitacoes.checked = acessoTodos;

  document
    .querySelectorAll(".modulo-permissao-solicitacoes")
    .forEach((checkbox) => {
      checkbox.checked = permissao.modulos?.[checkbox.value] === true;

      checkbox.disabled = acessoTodos;
    });

  blocoModulosPermitidosSolicitacoes.style.opacity = acessoTodos ? "0.5" : "1";
}

perfilPermissaoSolicitacoes?.addEventListener(
  "change",
  renderPermissoesSolicitacoes,
);

todosModulosSolicitacoes?.addEventListener("change", () => {
  const acessoTodos = todosModulosSolicitacoes.checked;

  document
    .querySelectorAll(".modulo-permissao-solicitacoes")
    .forEach((checkbox) => {
      checkbox.disabled = acessoTodos;
    });

  blocoModulosPermitidosSolicitacoes.style.opacity = acessoTodos ? "0.5" : "1";
});

btnSalvarPermissoesSolicitacoes?.addEventListener("click", async () => {
  const perfil = perfilPermissaoSolicitacoes.value;

  if (!perfil) {
    notificar("Selecione um perfil.", "erro");
    return;
  }

  const todas = todosModulosSolicitacoes.checked;
  const modulos = {};

  if (!todas) {
    document
      .querySelectorAll(".modulo-permissao-solicitacoes:checked")
      .forEach((checkbox) => {
        modulos[checkbox.value] = true;
      });

    if (!Object.keys(modulos).length) {
      notificar("Selecione pelo menos um módulo de solicitações.", "erro");

      return;
    }
  }

  try {
    await update(ref(rtdb, `configuracoes/solicitacoes/permissoes/${perfil}`), {
      todas,
      modulos: todas ? null : modulos,
      atualizadoEm: new Date().toISOString(),
    });

    notificar("Permissões das solicitações salvas com sucesso!");
  } catch (erro) {
    console.error("Erro ao salvar permissões das solicitações:", erro);

    notificar("Não foi possível salvar as permissões.", "erro");
  }
});

function renderCategoriasMateriaisGestores() {
  if (!listaCategoriasMateriaisGestores) {
    return;
  }

  const acessoTodas = configuracaoCategoriasMateriais.todas === true;

  todasCategoriasMateriaisGestores.checked = acessoTodas;

  blocoCategoriasMateriaisGestores.style.opacity = acessoTodas ? "0.5" : "1";

  if (!categoriasEstoque.length) {
    listaCategoriasMateriaisGestores.innerHTML = `
      <div class="estado-vazio">
        Nenhuma categoria cadastrada.
      </div>
    `;

    return;
  }

  listaCategoriasMateriaisGestores.innerHTML = categoriasEstoque
    .map(
      (categoria) => `
          <label class="perfil-check">
            <input
              type="checkbox"
              class="categoria-material-gestor"
              value="${escaparHtml(categoria.id)}"
              ${
                configuracaoCategoriasMateriais.categorias?.[categoria.id] ===
                true
                  ? "checked"
                  : ""
              }
              ${acessoTodas ? "disabled" : ""}
            />

            <span>
              ${escaparHtml(categoria.nome)}
            </span>
          </label>
        `,
    )
    .join("");
}

function renderCategoriasMateriaisLimpeza() {
  if (
    !listaCategoriasMateriaisLimpeza ||
    !todasCategoriasMateriaisLimpeza ||
    !blocoCategoriasMateriaisLimpeza
  ) {
    return;
  }

  const acessoTodas = configuracaoCategoriasMateriaisLimpeza.todas === true;

  todasCategoriasMateriaisLimpeza.checked = acessoTodas;

  blocoCategoriasMateriaisLimpeza.style.opacity = acessoTodas ? "0.5" : "1";

  if (!categoriasEstoque.length) {
    listaCategoriasMateriaisLimpeza.innerHTML = `
      <div class="estado-vazio">
        Nenhuma categoria cadastrada.
      </div>
    `;

    return;
  }

  listaCategoriasMateriaisLimpeza.innerHTML = categoriasEstoque
    .map(
      (categoria) => `
        <label class="perfil-check">
          <input
            type="checkbox"
            class="categoria-material-limpeza"
            value="${escaparHtml(categoria.id)}"
            ${
              configuracaoCategoriasMateriaisLimpeza.categorias?.[
                categoria.id
              ] === true
                ? "checked"
                : ""
            }
            ${acessoTodas ? "disabled" : ""}
          />

          <span>
            ${escaparHtml(categoria.nome)}
          </span>
        </label>
      `,
    )
    .join("");
}

todasCategoriasMateriaisGestores?.addEventListener("change", () => {
  const acessoTodas = todasCategoriasMateriaisGestores.checked;

  blocoCategoriasMateriaisGestores.style.opacity = acessoTodas ? "0.5" : "1";

  document
    .querySelectorAll(".categoria-material-gestor")
    .forEach((checkbox) => {
      checkbox.disabled = acessoTodas;
    });
});

todasCategoriasMateriaisLimpeza?.addEventListener("change", () => {
  const acessoTodas = todasCategoriasMateriaisLimpeza.checked;

  blocoCategoriasMateriaisLimpeza.style.opacity = acessoTodas ? "0.5" : "1";

  document
    .querySelectorAll(".categoria-material-limpeza")
    .forEach((checkbox) => {
      checkbox.disabled = acessoTodas;
    });
});

btnSalvarCategoriasMateriaisGestores?.addEventListener("click", async () => {
  const todas = todasCategoriasMateriaisGestores.checked;

  const categorias = {};

  if (!todas) {
    document
      .querySelectorAll(".categoria-material-gestor:checked")
      .forEach((checkbox) => {
        categorias[checkbox.value] = true;
      });

    if (!Object.keys(categorias).length) {
      notificar("Selecione pelo menos uma categoria.", "erro");

      return;
    }
  }

  btnSalvarCategoriasMateriaisGestores.disabled = true;

  try {
    await update(categoriasMateriaisGestoresRef, {
      todas,
      categorias: todas ? null : categorias,
      atualizadoEm: new Date().toISOString(),
    });

    notificar("Categorias disponíveis para solicitação salvas com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar categorias do Portal do Gestor:", error);

    notificar("Não foi possível salvar as categorias.", "erro");
  } finally {
    btnSalvarCategoriasMateriaisGestores.disabled = false;
  }
});

btnSalvarCategoriasMateriaisLimpeza?.addEventListener("click", async () => {
  const todas = todasCategoriasMateriaisLimpeza.checked;
  const categorias = {};

  if (!todas) {
    document
      .querySelectorAll(".categoria-material-limpeza:checked")
      .forEach((checkbox) => {
        categorias[checkbox.value] = true;
      });

    if (!Object.keys(categorias).length) {
      notificar("Selecione pelo menos uma categoria de limpeza.", "erro");

      return;
    }
  }

  btnSalvarCategoriasMateriaisLimpeza.disabled = true;

  try {
    await update(categoriasMateriaisLimpezaRef, {
      todas,
      categorias: todas ? null : categorias,
      atualizadoEm: new Date().toISOString(),
    });

    notificar("Categorias de limpeza salvas com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar categorias de limpeza:", error);

    notificar("Não foi possível salvar as categorias de limpeza.", "erro");
  } finally {
    btnSalvarCategoriasMateriaisLimpeza.disabled = false;
  }
});

/* =========================================
   UTILITÁRIOS
========================================= */

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escaparHtml(texto) {
  const div = document.createElement("div");

  div.textContent = String(texto || "");

  return div.innerHTML;
}

function notificar(mensagem, tipo = "sucesso") {
  if (typeof window.mostrarNotificacao === "function") {
    window.mostrarNotificacao(mensagem, tipo);

    return;
  }

  alert(mensagem);
}

/* =========================================
   PROTEGER PÁGINA ADM
========================================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./login";

    return;
  }

  try {
    const snap = await getDoc(doc(db, "usuarios", user.uid));

    if (!snap.exists()) {
      window.location.href = "/";
      return;
    }

    const dados = snap.data();

    const perfil = String(dados.cargo || "").toUpperCase();

    if (perfil !== "ADM") {
      notificar("Você não possui permissão para acessar esta página.", "erro");

      setTimeout(() => {
        window.location.href = "/";
      }, 1000);

      return;
    }

    await carregarUsuarios();
  } catch (erro) {
    console.error("Erro ao validar administrador:", erro);
  }
});

/* =========================================
   ABAS
========================================= */

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));

    tabContents.forEach((content) => content.classList.remove("active"));

    tab.classList.add("active");

    document.getElementById(tab.dataset.tab)?.classList.add("active");
  });
});

function atualizarPerfisDisponiveis() {
  const perfisEncontrados = new Set(["ADM"]);

  usuarios.forEach((usuario) => {
    const cargo = String(usuario.cargo || "").trim();

    if (cargo) {
      perfisEncontrados.add(cargo);
    }
  });

  PERFIS = Array.from(perfisEncontrados).sort((a, b) =>
    a.localeCompare(b, "pt-BR", {
      sensitivity: "base",
    }),
  );

  atualizarFiltroPerfis();

  renderPerfisMenu();

  atualizarSelectPerfisEstoque();
  atualizarSelectPerfisSolicitacoes();
}

function atualizarFiltroPerfis() {
  if (!filtroPerfil) return;

  const valorAtual = filtroPerfil.value;

  filtroPerfil.innerHTML = `
    <option value="">
      Todos os perfis
    </option>
  `;

  PERFIS.forEach((perfil) => {
    const option = document.createElement("option");

    option.value = perfil;

    option.textContent = perfil;

    filtroPerfil.appendChild(option);
  });

  if (valorAtual && PERFIS.includes(valorAtual)) {
    filtroPerfil.value = valorAtual;
  }
}

function atualizarSelectPerfisEstoque() {
  if (!perfilPermissaoEstoque) return;

  const valorAtual = perfilPermissaoEstoque.value;

  perfilPermissaoEstoque.innerHTML = `
    <option value="">
      Selecione um perfil
    </option>
  `;

  PERFIS.forEach((perfil) => {
    const option = document.createElement("option");

    option.value = perfil;
    option.textContent = perfil;

    perfilPermissaoEstoque.appendChild(option);
  });

  if (valorAtual && PERFIS.includes(valorAtual)) {
    perfilPermissaoEstoque.value = valorAtual;
  }
}

function atualizarSelectPerfisSolicitacoes() {
  if (!perfilPermissaoSolicitacoes) {
    return;
  }

  const valorAtual = perfilPermissaoSolicitacoes.value;

  perfilPermissaoSolicitacoes.innerHTML = `
    <option value="">
      Selecione um perfil
    </option>
  `;

  PERFIS.forEach((perfil) => {
    const option = document.createElement("option");

    option.value = perfil;
    option.textContent = perfil;

    perfilPermissaoSolicitacoes.appendChild(option);
  });

  if (valorAtual && PERFIS.includes(valorAtual)) {
    perfilPermissaoSolicitacoes.value = valorAtual;
  }

  renderPermissoesSolicitacoes();
}

function obterPerfisMenuMarcados() {
  return Array.from(document.querySelectorAll(".perfil-menu:checked")).map(
    (checkbox) => checkbox.value,
  );
}

function renderPerfisMenu(perfisSelecionados = null) {
  if (!perfisMenuContainer) {
    return;
  }

  const selecionados = perfisSelecionados || obterPerfisMenuMarcados();

  perfisMenuContainer.innerHTML = "";

  PERFIS.forEach((perfil) => {
    const label = document.createElement("label");

    label.className = "perfil-check";

    const marcado = selecionados.includes(perfil);

    label.innerHTML = `
      <input
        type="checkbox"
        value="${escaparHtml(perfil)}"
        class="perfil-menu"
        ${marcado ? "checked" : ""}
      />

      <span>
        ${escaparHtml(perfil)}
      </span>
    `;

    perfisMenuContainer.appendChild(label);
  });
}

/* =========================================
   CARREGAR USUÁRIOS
========================================= */
async function sincronizarControleAcessoUsuarios() {
  if (!usuarios.length) {
    return;
  }

  const atualizacoes = {};
  const agora = new Date().toISOString();

  usuarios.forEach((usuario) => {
    if (!usuario._uid) {
      return;
    }

    const perfilPortal = String(usuario.perfil || "")
      .trim()
      .toUpperCase();

    const cargo = String(usuario.cargo || "")
      .trim()
      .toUpperCase();

    const perfilAcesso =
      perfilPortal === "GESTOR_ESCOLAR" ? "GESTOR_ESCOLAR" : cargo;

    atualizacoes[`controleAcesso/usuarios/${usuario._uid}`] = {
      nome: usuario.nome || "",
      perfil: perfilAcesso,
      cargo,
      ativo: usuario.ativo === true,
      escolaId: usuario.escolaId || null,
      atualizadoEm: agora,
    };
  });

  await update(ref(rtdb), atualizacoes);
}

async function sincronizarUsuarioControleAcesso(usuario) {
  if (!usuario?._uid) {
    return;
  }

  const perfilPortal = String(usuario.perfil || "")
    .trim()
    .toUpperCase();

  const cargo = String(usuario.cargo || "")
    .trim()
    .toUpperCase();

  const perfilAcesso =
    perfilPortal === "GESTOR_ESCOLAR" ? "GESTOR_ESCOLAR" : cargo;

  await update(ref(rtdb, `controleAcesso/usuarios/${usuario._uid}`), {
    nome: usuario.nome || "",
    perfil: perfilAcesso,
    cargo,
    ativo: usuario.ativo === true,
    escolaId: usuario.escolaId || null,
    atualizadoEm: new Date().toISOString(),
  });
}

async function carregarUsuarios() {
  try {
    const snapshot = await getDocs(collection(db, "usuarios"));

    usuarios = snapshot.docs.map((documento) => ({
      ...documento.data(),
      _uid: documento.id,
    }));

    try {
      await sincronizarControleAcessoUsuarios();
    } catch (erro) {
      console.error("Erro ao sincronizar o controle de acesso:", erro);

      notificar(
        "Os usuários foram carregados, mas o controle de acesso não pôde ser sincronizado.",
        "erro",
      );
    }

    atualizarPerfisDisponiveis();

    renderUsuarios();
  } catch (erro) {
    console.error("Erro ao carregar usuários:", erro);

    listaUsuarios.innerHTML = `
      <p>
        Não foi possível carregar
        os usuários.
      </p>
    `;
  }
}

/* =========================================
   FILTRAR USUÁRIOS
========================================= */

function obterUsuariosFiltrados() {
  const termo = normalizarTexto(buscaUsuario.value);

  const perfil = filtroPerfil.value;

  const situacao = filtroSituacao.value;

  return usuarios.filter((usuario) => {
    const texto = normalizarTexto(`
          ${usuario.nome || ""}
          ${usuario.email || ""}
        `);

    if (termo && !texto.includes(termo)) {
      return false;
    }

    if (perfil && usuario.cargo !== perfil) {
      return false;
    }

    const ativo = usuario.ativo === true;

    if (situacao === "ativo" && !ativo) {
      return false;
    }

    if (situacao === "inativo" && ativo) {
      return false;
    }

    return true;
  });
}

/* =========================================
   RENDER USUÁRIOS
========================================= */

function renderUsuarios() {
  const filtrados = obterUsuariosFiltrados();

  contadorUsuarios.textContent = `${filtrados.length} usuário${
    filtrados.length === 1 ? "" : "s"
  } encontrado${filtrados.length === 1 ? "" : "s"}`;

  listaUsuarios.innerHTML = "";

  if (!filtrados.length) {
    listaUsuarios.innerHTML = `
      <p>
        Nenhum usuário encontrado.
      </p>
    `;

    return;
  }

  filtrados
    .sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"),
    )
    .forEach((usuario) => {
      const ativo = usuario.ativo === true;

      const gestorEscolar =
        String(usuario.cargo || "").trim().toUpperCase() === "GESTOR" ||
        String(usuario.perfil || "").trim().toUpperCase() === "GESTOR_ESCOLAR";

      const escolasOrdenadas = [...locaisExercicio].sort((a, b) =>
        String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
          sensitivity: "base",
        }),
      );

      const escolaAtualForaDaLista =
        usuario.escolaId &&
        !escolasOrdenadas.some((escola) => escola.id === usuario.escolaId);

      const card = document.createElement("div");

      card.className = "usuario-admin-card";

      card.innerHTML = `
        <div class="usuario-admin-topo">

          <div class="usuario-admin-avatar">
            <img src="${escaparHtml(usuario.foto || "./src/images/profile.webp")}">
          </div>

          <div class="usuario-admin-dados">
            <strong>
              ${escaparHtml(usuario.nome || "Usuário")}
            </strong>

            <span>
              ${escaparHtml(usuario.email || "")}
            </span>
          </div>

        </div>

        <div class="usuario-admin-info">

          <div class="usuario-admin-campo">

            <label>
              Perfil de acesso
            </label>

            <select
              class="select-perfil-usuario"
            >
              ${PERFIS.map(
                (perfil) => `
                  <option
                    value="${perfil}"
                    ${usuario.cargo === perfil ? "selected" : ""}
                  >
                    ${perfil}
                  </option>
                `,
              ).join("")}
            </select>

          </div>

          ${
            gestorEscolar
              ? `
                <div class="usuario-admin-campo usuario-admin-campo-escola">
                  <label>Unidade escolar</label>

                  <select class="select-escola-usuario">
                    <option value="">Selecione uma unidade escolar</option>

                    ${
                      escolaAtualForaDaLista
                        ? `
                          <option value="${escaparHtml(usuario.escolaId)}" selected>
                            ${escaparHtml(usuario.escolaNome || "Unidade vinculada")}
                          </option>
                        `
                        : ""
                    }

                    ${escolasOrdenadas
                      .map(
                        (escola) => `
                          <option
                            value="${escaparHtml(escola.id)}"
                            ${usuario.escolaId === escola.id ? "selected" : ""}
                          >
                            ${escaparHtml(escola.nome)}
                          </option>
                        `,
                      )
                      .join("")}
                  </select>

                  ${
                    !usuario.escolaId
                      ? `<small class="usuario-admin-aviso">Vincule uma escola para liberar o Portal do Gestor.</small>`
                      : ""
                  }
                </div>
              `
              : ""
          }

        </div>

        <div class="usuario-admin-footer">

          <span
            class="status-usuario ${ativo ? "ativo" : "inativo"}"
          >
            ${ativo ? "Ativo" : "Inativo"}
          </span>

          <label class="switch">

            <input
              type="checkbox"
              class="switch-usuario"
              ${ativo ? "checked" : ""}
            />

            <span
              class="slider"
            ></span>

          </label>

        </div>
      `;

      const selectPerfil = card.querySelector(".select-perfil-usuario");

      const selectEscola = card.querySelector(".select-escola-usuario");

      const switchUsuario = card.querySelector(".switch-usuario");

      selectPerfil.addEventListener("change", async () => {
        await alterarPerfilUsuario(usuario, selectPerfil.value);
      });

      selectEscola?.addEventListener("change", async () => {
        await alterarEscolaUsuario(usuario, selectEscola.value);
      });

      switchUsuario.addEventListener("change", async () => {
        await alterarSituacaoUsuario(usuario, switchUsuario.checked);
      });

      listaUsuarios.appendChild(card);
    });
}

/* =========================================
   ALTERAR PERFIL
========================================= */

async function alterarPerfilUsuario(usuario, novoPerfil) {
  const confirmou = await window.mostrarConfirmacao({
    titulo: "Alterar perfil",
    mensagem:
      `Deseja alterar o perfil de "${usuario.nome}" ` + `para "${novoPerfil}"?`,
    tipo: "alerta",
    textoConfirmar: "Alterar perfil",
    textoCancelar: "Cancelar",
  });

  if (!confirmou) {
    renderUsuarios();
    return;
  }

  try {
    const dadosAtualizacao = {
      cargo: novoPerfil,
      atualizadoEm: new Date().toISOString(),
    };

    if (String(novoPerfil).trim().toUpperCase() !== "GESTOR") {
      dadosAtualizacao.perfil = null;
      dadosAtualizacao.escolaId = null;
      dadosAtualizacao.escolaNome = null;
    }

    await updateDoc(doc(db, "usuarios", usuario._uid), dadosAtualizacao);

    usuario.cargo = novoPerfil;

    if (String(novoPerfil).trim().toUpperCase() !== "GESTOR") {
      usuario.perfil = null;
      usuario.escolaId = null;
      usuario.escolaNome = null;
    }

    await sincronizarUsuarioControleAcesso(usuario);

    atualizarPerfisDisponiveis();

    notificar("Perfil atualizado com sucesso!");

    renderUsuarios();
  } catch (erro) {
    console.error("Erro ao alterar perfil:", erro);

    notificar("Erro ao alterar perfil.", "erro");

    renderUsuarios();
  }
}

/* =========================================
   VINCULAR ESCOLA AO GESTOR
========================================= */

async function alterarEscolaUsuario(usuario, escolaId) {
  const escola = locaisExercicio.find((item) => item.id === escolaId) || null;
  const escolaNome = escola?.nome || "";
  const removendoVinculo = !escolaId;

  const confirmou = await window.mostrarConfirmacao({
    titulo: removendoVinculo ? "Remover vínculo" : "Vincular escola",
    mensagem: removendoVinculo
      ? `Deseja remover a unidade escolar vinculada a "${usuario.nome}"?`
      : `Deseja vincular "${usuario.nome}" à unidade "${escolaNome}"?`,
    tipo: "alerta",
    textoConfirmar: removendoVinculo ? "Remover vínculo" : "Vincular escola",
    textoCancelar: "Cancelar",
  });

  if (!confirmou) {
    renderUsuarios();
    return;
  }

  try {
    const atualizadoEm = new Date().toISOString();

    await updateDoc(doc(db, "usuarios", usuario._uid), {
      perfil: removendoVinculo ? null : "GESTOR_ESCOLAR",
      escolaId: removendoVinculo ? null : escolaId,
      escolaNome: removendoVinculo ? null : escolaNome,
      atualizadoEm,
    });

    usuario.perfil = removendoVinculo ? null : "GESTOR_ESCOLAR";
    usuario.escolaId = removendoVinculo ? null : escolaId;
    usuario.escolaNome = removendoVinculo ? null : escolaNome;
    usuario.atualizadoEm = atualizadoEm;

    await sincronizarUsuarioControleAcesso(usuario);

    notificar(
      removendoVinculo
        ? "Vínculo com a escola removido."
        : "Escola vinculada ao gestor com sucesso!",
    );

    renderUsuarios();
  } catch (erro) {
    console.error("Erro ao vincular escola ao usuário:", erro);

    notificar("Não foi possível atualizar a escola do gestor.", "erro");

    renderUsuarios();
  }
}

/* =========================================
   ATIVAR / DESATIVAR
========================================= */

async function alterarSituacaoUsuario(usuario, ativo) {
  const acao = ativo ? "ativar" : "desativar";

  const confirmou = await window.mostrarConfirmacao({
    titulo: `${acao.charAt(0).toUpperCase() + acao.slice(1)} usuário`,
    mensagem: `Deseja ${acao} o usuário "${usuario.nome}"?`,
    tipo: "alerta",
    textoConfirmar: `${acao.charAt(0).toUpperCase() + acao.slice(1)}`,
    textoCancelar: "Cancelar",
  });

  if (!confirmou) {
    renderUsuarios();
    return;
  }

  try {
    await updateDoc(doc(db, "usuarios", usuario._uid), {
      ativo,
      atualizadoEm: new Date().toISOString(),
    });

    usuario.ativo = ativo;

    await sincronizarUsuarioControleAcesso(usuario);

    notificar(
      ativo
        ? "Usuário ativado com sucesso!"
        : "Usuário desativado com sucesso!",
    );

    renderUsuarios();
  } catch (erro) {
    console.error("Erro ao alterar usuário:", erro);

    notificar("Não foi possível alterar o usuário.", "erro");

    renderUsuarios();
  }
}

/* =========================================
   FILTROS USUÁRIOS
========================================= */

buscaUsuario.addEventListener("input", renderUsuarios);

filtroPerfil.addEventListener("change", renderUsuarios);

filtroSituacao.addEventListener("change", renderUsuarios);

/* =========================================
   MENU FIREBASE
========================================= */

const menuRef = ref(rtdb, "configuracoes/sidebar");

const gruposMenuRef = ref(rtdb, "configuracoes/sidebarGrupos");

const locaisExercicioRef = ref(rtdb, "servidores/locaisExercicio");

const servidoresRef = ref(rtdb, "servidores/registros");

onValue(gruposMenuRef, (snapshot) => {
  gruposMenu = snapshot.exists()
    ? Object.entries(snapshot.val()).map(([id, dados]) => ({
        id,
        ...dados,
      }))
    : [];

  gruposMenu.sort((a, b) => Number(a.ordem || 999) - Number(b.ordem || 999));

  atualizarSelectGruposMenu();

  renderGruposMenu();
});

onValue(menuRef, (snapshot) => {
  itensMenu = snapshot.exists()
    ? Object.entries(snapshot.val()).map(([key, dados]) => ({
        ...dados,
        _key: key,
      }))
    : [];

  renderMenu();
});

/* =========================================
   RENDER MENU
========================================= */

function atualizarSelectGruposMenu() {
  if (!grupoMenu) return;

  const valorAtual = grupoMenu.value;

  grupoMenu.innerHTML = `
    <option value="">
      Sem grupo
    </option>
  `;

  gruposMenu
    .filter((grupo) => grupo.ativo !== false)
    .forEach((grupo) => {
      const option = document.createElement("option");

      option.value = grupo.id;

      option.textContent = grupo.titulo;

      grupoMenu.appendChild(option);
    });

  if (valorAtual && gruposMenu.some((grupo) => grupo.id === valorAtual)) {
    grupoMenu.value = valorAtual;
  }
}

function renderMenu() {
  listaMenuAdmin.innerHTML = "";

  const ordenados = [...itensMenu].sort(
    (a, b) => Number(a.ordem || 999) - Number(b.ordem || 999),
  );

  contadorItensMenu.textContent = `${ordenados.length} item${
    ordenados.length === 1 ? "" : "ns"
  } cadastrado${ordenados.length === 1 ? "" : "s"}`;

  if (!ordenados.length) {
    listaMenuAdmin.innerHTML = `
      <p>
        Nenhum item de menu cadastrado.
      </p>
    `;

    return;
  }

  ordenados.forEach((item) => {
    const perfis = item.acessoTodos
      ? ["Todos"]
      : Object.entries(item.perfis || {})
          .filter(([, permitido]) => permitido === true)
          .map(([perfil]) => perfil);

    const card = document.createElement("div");

    card.className = "menu-admin-card";

    card.innerHTML = `
      <div
        class="menu-admin-icone"
      >
        <span
          class="material-symbols-outlined"
        >
          ${escaparHtml(item.icone || "link")}
        </span>
      </div>

      <div
        class="menu-admin-dados"
      >

        <strong>
          ${escaparHtml(item.titulo || "Sem título")}
        </strong>

        <span
          class="menu-admin-link"
        >
          ${escaparHtml(item.link || "")}
        </span>

        <div
          class="menu-admin-meta"
        >

          <span
            class="menu-admin-tag"
          >
            Ordem:
            ${item.ordem || "-"}
          </span>

          <span
            class="menu-admin-tag"
          >
            ${item.ativo ? "Ativo" : "Inativo"}
          </span>

          ${
            item.badgeNovo
              ? `
                <span class="menu-admin-tag">
                    Badge: Novo
                </span>
                `
              : ""
          }

          ${perfis
            .map(
              (perfil) => `
                <span
                  class="menu-admin-tag"
                >
                  ${perfil}
                </span>
              `,
            )
            .join("")}

        </div>

      </div>

      <div
        class="menu-admin-acoes"
      >

        <button
          type="button"
          class="toggle-menu-btn"
          title="${item.ativo ? "Desativar" : "Ativar"}"
        >

          <span
            class="material-symbols-outlined"
          >
            ${item.ativo ? "visibility_off" : "visibility"}
          </span>

        </button>

        <button
          type="button"
          class="editar-menu-btn"
          title="Editar"
        >

          <span
            class="material-symbols-outlined"
          >
            edit_note
          </span>

        </button>

        <button
          type="button"
          class="excluir-menu-btn"
          title="Excluir"
        >

          <span
            class="material-symbols-outlined"
          >
            delete
          </span>

        </button>

      </div>
    `;

    card.querySelector(".toggle-menu-btn").addEventListener("click", () => {
      alternarMenu(item);
    });

    card.querySelector(".editar-menu-btn").addEventListener("click", () => {
      editarMenu(item);
    });

    card.querySelector(".excluir-menu-btn").addEventListener("click", () => {
      excluirMenu(item);
    });

    listaMenuAdmin.appendChild(card);
  });
}

/* =========================================
   PREVIEW ÍCONE
========================================= */

iconeMenu.addEventListener("input", () => {
  previewIconeMenu.textContent = iconeMenu.value.trim() || "link";
});

previewIconeMenu.addEventListener("click", () => {
  const icone = iconeMenu.value.trim();

  window.open(
    `https://fonts.google.com/icons?icon.query=${encodeURIComponent(icone)}`,
    "_blank",
  );
});
/* =========================================
   ACESSO TODOS
========================================= */

acessoTodosMenu.addEventListener("change", () => {
  blocoPerfisMenu.style.display = acessoTodosMenu.checked ? "none" : "block";
});

/* =========================================
   SALVAR MENU
========================================= */

formMenu.addEventListener("submit", async (event) => {
  event.preventDefault();

  const titulo = tituloMenu.value.trim();

  const link = linkMenu.value.trim();

  const icone = iconeMenu.value.trim();

  const ordem = Number(ordemMenu.value);

  const grupoId = grupoMenu.value || null;

  const ativo = ativoMenu.checked;

  const badgeNovo = badgeNovoMenu.checked;

  const acessoTodos = acessoTodosMenu.checked;

  const perfis = {};

  document.querySelectorAll(".perfil-menu").forEach((checkbox) => {
    if (checkbox.checked) {
      perfis[checkbox.value] = true;
    }
  });

  if (!titulo || !link || !icone) {
    notificar("Preencha os campos obrigatórios.", "erro");

    return;
  }

  if (!acessoTodos && !Object.keys(perfis).length) {
    notificar("Selecione pelo menos um perfil.", "erro");

    return;
  }

  const dados = {
    titulo,
    link,
    icone,
    ordem,
    grupoId,
    ativo,
    badgeNovo,
    acessoTodos,
    perfis: acessoTodos ? {} : perfis,
    atualizadoEm: new Date().toISOString(),
  };

  try {
    if (editandoMenu && chaveMenuEdicao) {
      await update(
        ref(rtdb, `configuracoes/sidebar/${chaveMenuEdicao}`),
        dados,
      );

      notificar("Item atualizado com sucesso!");
    } else {
      await push(menuRef, {
        ...dados,

        criadoEm: new Date().toISOString(),
      });

      notificar("Item criado com sucesso!");
    }

    resetarFormularioMenu();
  } catch (erro) {
    console.error("Erro ao salvar menu:", erro);

    notificar("Erro ao salvar item do menu.", "erro");
  }
});

/* =========================================
   EDITAR MENU
========================================= */

function editarMenu(item) {
  editandoMenu = true;

  chaveMenuEdicao = item._key;

  tituloMenu.value = item.titulo || "";

  linkMenu.value = item.link || "";

  iconeMenu.value = item.icone || "";

  ordemMenu.value = item.ordem || 1;

  grupoMenu.value = item.grupoId || "";

  ativoMenu.checked = item.ativo !== false;

  badgeNovoMenu.checked = item.badgeNovo === true;

  acessoTodosMenu.checked = item.acessoTodos === true;

  previewIconeMenu.textContent = item.icone || "link";

  const perfisSelecionados = Object.entries(item.perfis || {})
    .filter(([, permitido]) => permitido === true)
    .map(([perfil]) => perfil);

  renderPerfisMenu(perfisSelecionados);

  blocoPerfisMenu.style.display = acessoTodosMenu.checked ? "none" : "block";

  tituloFormularioMenu.textContent = "Editar item do menu";

  btnCancelarEdicaoMenu.style.display = "inline-flex";

  msgEdicaoMenu.innerHTML = `
    <div
      class="edicao-menu-info"
    >

      <span
        class="material-symbols-outlined"
      >
        edit_note
      </span>

      <div>

        <strong>
          Modo de edição
        </strong>

        <span>
          ${escaparHtml(item.titulo)}
        </span>

      </div>

    </div>
  `;

  msgEdicaoMenu.style.display = "block";

  btnTopo.click();
}

/* =========================================
   CANCELAR EDIÇÃO
========================================= */

btnCancelarEdicaoMenu.addEventListener("click", resetarFormularioMenu);

function resetarFormularioMenu() {
  editandoMenu = false;

  chaveMenuEdicao = null;

  formMenu.reset();

  renderPerfisMenu([]);

  ativoMenu.checked = true;

  badgeNovoMenu.checked = false;

  ordemMenu.value = 1;

  grupoMenu.value = "";

  previewIconeMenu.textContent = "link";

  blocoPerfisMenu.style.display = "block";

  tituloFormularioMenu.textContent = "Novo item do menu";

  btnCancelarEdicaoMenu.style.display = "none";

  msgEdicaoMenu.style.display = "none";

  msgEdicaoMenu.innerHTML = "";
}

/* =========================================
   ATIVAR / DESATIVAR MENU
========================================= */

async function alternarMenu(item) {
  const novoStatus = !item.ativo;

  const acao = novoStatus ? "ativar" : "desativar";

  const confirmou = await window.mostrarConfirmacao({
    titulo: `${acao.charAt(0).toUpperCase() + acao.slice(1)} item`,
    mensagem: `Deseja ${acao} o menu "${item.titulo}"?`,
    tipo: "alerta",
    textoConfirmar: `${acao.charAt(0).toUpperCase() + acao.slice(1)}`,
    textoCancelar: "Cancelar",
  });

  if (!confirmou) return;

  try {
    await update(ref(rtdb, `configuracoes/sidebar/${item._key}`), {
      ativo: novoStatus,

      atualizadoEm: new Date().toISOString(),
    });

    notificar(novoStatus ? "Item ativado." : "Item desativado.");
  } catch (erro) {
    console.error("Erro ao alterar item:", erro);

    notificar("Erro ao alterar o item.", "erro");
  }
}

/* =========================================
   EXCLUIR MENU
========================================= */

async function excluirMenu(item) {
  const confirmou = await window.mostrarConfirmacao({
    titulo: "Excluir item do menu",
    mensagem:
      `Tem certeza que deseja excluir o item ` +
      `"${item.titulo}" do menu?\n\n` +
      "Esta ação não poderá ser desfeita.",
    tipo: "perigo",
    textoConfirmar: "Excluir item",
    textoCancelar: "Cancelar",
  });

  if (!confirmou) return;

  try {
    await remove(ref(rtdb, `configuracoes/sidebar/${item._key}`));

    notificar("Item excluído com sucesso!");

    if (chaveMenuEdicao === item._key) {
      resetarFormularioMenu();
    }
  } catch (erro) {
    console.error("Erro ao excluir item:", erro);

    notificar("Erro ao excluir item.", "erro");
  }
}

/* =========================================
   GRUPOS DO MENU
========================================= */

function renderGruposMenu() {
  if (!listaGruposMenuAdmin) return;

  listaGruposMenuAdmin.innerHTML = "";

  contadorGruposMenuAdmin.textContent = `${gruposMenu.length} grupo${
    gruposMenu.length === 1 ? "" : "s"
  } cadastrado${gruposMenu.length === 1 ? "" : "s"}`;

  if (!gruposMenu.length) {
    listaGruposMenuAdmin.innerHTML = `
      <p>
        Nenhum grupo cadastrado.
      </p>
    `;

    return;
  }

  gruposMenu.forEach((grupo) => {
    const totalLinks = itensMenu.filter(
      (item) => item.grupoId === grupo.id,
    ).length;

    const card = document.createElement("div");

    card.className = "local-admin-card";

    card.innerHTML = `
      <div
        class="local-admin-icone local-admin-inicial"
      >
        ${escaparHtml(grupo.titulo?.charAt(0).toUpperCase() || "?")}
      </div>

      <div
        class="local-admin-dados"
      >
        <strong>
          ${escaparHtml(grupo.titulo)}
        </strong>

        <span>
          Ordem:
          ${grupo.ordem || "-"}
          •
          ${totalLinks}
          link${totalLinks === 1 ? "" : "s"}
        </span>
      </div>

      <div
        class="local-admin-acoes"
      >
        <button
          type="button"
          class="editar-grupo-menu-btn"
          title="Editar grupo"
        >
          <span
            class="material-symbols-outlined"
          >
            edit_note
          </span>
        </button>

        <button
          type="button"
          class="excluir-grupo-menu-btn"
          title="Excluir grupo"
        >
          <span
            class="material-symbols-outlined"
          >
            delete
          </span>
        </button>
      </div>
    `;

    card
      .querySelector(".editar-grupo-menu-btn")
      .addEventListener("click", () => editarGrupoMenu(grupo));

    card
      .querySelector(".excluir-grupo-menu-btn")
      .addEventListener("click", () => excluirGrupoMenu(grupo, totalLinks));

    listaGruposMenuAdmin.appendChild(card);
  });
}

formGrupoMenuAdmin?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const titulo = tituloGrupoMenu.value.trim();

  const ordem = Number(ordemGrupoMenu.value);

  if (!titulo) {
    notificar("Informe o título do grupo.", "erro");

    return;
  }

  const duplicado = gruposMenu.find(
    (grupo) =>
      normalizarTexto(grupo.titulo) === normalizarTexto(titulo) &&
      grupo.id !== chaveGrupoMenuEdicao,
  );

  if (duplicado) {
    notificar("Já existe um grupo com este título.", "erro");

    return;
  }

  try {
    if (editandoGrupoMenu && chaveGrupoMenuEdicao) {
      await update(
        ref(rtdb, `configuracoes/sidebarGrupos/${chaveGrupoMenuEdicao}`),
        {
          titulo,
          ordem,
          ativo: true,
        },
      );

      notificar("Grupo atualizado com sucesso!");
    } else {
      await push(gruposMenuRef, {
        titulo,
        ordem,
        ativo: true,
      });

      notificar("Grupo criado com sucesso!");
    }

    resetarFormularioGrupoMenu();
  } catch (erro) {
    console.error("Erro ao salvar grupo:", erro);

    notificar("Não foi possível salvar o grupo.", "erro");
  }
});

function editarGrupoMenu(grupo) {
  editandoGrupoMenu = true;

  chaveGrupoMenuEdicao = grupo.id;

  tituloGrupoMenu.value = grupo.titulo || "";

  ordemGrupoMenu.value = grupo.ordem || 1;

  tituloFormularioGrupoMenu.textContent = "Editar grupo do menu";

  btnCancelarEdicaoGrupoMenu.style.display = "inline-flex";

  msgEdicaoGrupoMenu.innerHTML = `
    <div
      class="edicao-menu-info"
    >
      <span
        class="material-symbols-outlined"
      >
        edit_note
      </span>

      <div>
        <strong>
          Modo de edição
        </strong>

        <span>
          ${escaparHtml(grupo.titulo)}
        </span>
      </div>
    </div>
  `;

  msgEdicaoGrupoMenu.style.display = "block";

  document.getElementById("btnTopo")?.click();

  tituloGrupoMenu.focus();
}

btnCancelarEdicaoGrupoMenu?.addEventListener(
  "click",
  resetarFormularioGrupoMenu,
);

function resetarFormularioGrupoMenu() {
  editandoGrupoMenu = false;

  chaveGrupoMenuEdicao = null;

  formGrupoMenuAdmin.reset();

  ordemGrupoMenu.value = 1;

  tituloFormularioGrupoMenu.textContent = "Novo grupo do menu";

  btnCancelarEdicaoGrupoMenu.style.display = "none";

  msgEdicaoGrupoMenu.style.display = "none";

  msgEdicaoGrupoMenu.innerHTML = "";
}

async function excluirGrupoMenu(grupo, totalLinks) {
  if (totalLinks > 0) {
    notificar(
      `Não é possível excluir "${grupo.titulo}", pois existem ${totalLinks} link${
        totalLinks === 1 ? "" : "s"
      } vinculado${totalLinks === 1 ? "" : "s"} a este grupo.`,
      "erro",
    );

    return;
  }

  const confirmou = await window.mostrarConfirmacao({
    titulo: "Excluir grupo",
    mensagem:
      `Tem certeza que deseja excluir o grupo ` +
      `"${grupo.titulo}"?\n\n` +
      "Esta ação não poderá ser desfeita.",
    tipo: "perigo",
    textoConfirmar: "Excluir grupo",
    textoCancelar: "Cancelar",
  });

  if (!confirmou) return;

  try {
    await remove(ref(rtdb, `configuracoes/sidebarGrupos/${grupo.id}`));

    notificar("Grupo excluído com sucesso!");

    if (chaveGrupoMenuEdicao === grupo.id) {
      resetarFormularioGrupoMenu();
    }
  } catch (erro) {
    console.error("Erro ao excluir grupo:", erro);

    notificar("Não foi possível excluir o grupo.", "erro");
  }
}

/* =========================================
   LOCAIS DE EXERCÍCIO
========================================= */

onValue(locaisExercicioRef, (snapshot) => {
  locaisExercicio = snapshot.exists()
    ? Object.entries(snapshot.val())
        .map(([id, dados]) => ({
          id,
          nome: dados?.nome || "",
        }))
        .filter((local) => local.nome)
    : [];

  renderLocais();

  renderUsuarios();
});

onValue(servidoresRef, (snapshot) => {
  servidoresAdmin = snapshot.exists() ? Object.values(snapshot.val()) : [];

  renderLocais();
});

function renderLocais() {
  if (!listaLocaisAdmin) return;

  const termo = normalizarTexto(buscaLocalAdmin?.value || "");

  const filtrados = locaisExercicio
    .filter((local) => normalizarTexto(local.nome).includes(termo))
    .sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", {
        sensitivity: "base",
      }),
    );

  contadorLocaisAdmin.textContent = `${filtrados.length} local${
    filtrados.length === 1 ? "" : "is"
  } encontrado${filtrados.length === 1 ? "" : "s"}`;

  listaLocaisAdmin.innerHTML = "";

  if (!filtrados.length) {
    listaLocaisAdmin.innerHTML = `
      <p>
        Nenhum local encontrado.
      </p>
    `;

    return;
  }

  filtrados.forEach((local) => {
    const totalServidores = servidoresAdmin.filter(
      (servidor) => servidor.localExercicioId === local.id,
    ).length;

    const card = document.createElement("div");

    card.className = "local-admin-card";

    card.innerHTML = `
        <div class="local-admin-icone local-admin-inicial">
          ${escaparHtml(local.nome.charAt(0).toUpperCase())}
        </div>

        <div
          class="local-admin-dados"
        >
          <strong>
            ${escaparHtml(local.nome)}
          </strong>

          <span>
            ${totalServidores}
            servidor${totalServidores === 1 ? "" : "es"}
            vinculado${totalServidores === 1 ? "" : "s"}
          </span>
        </div>

        <div
          class="local-admin-acoes"
        >
          <button
            type="button"
            class="editar-local-btn"
            title="Editar local"
          >
            <span
              class="material-symbols-outlined"
            >
              edit_note
            </span>
          </button>
        </div>
      `;

    card.querySelector(".editar-local-btn").addEventListener("click", () => {
      editarLocal(local);
    });

    listaLocaisAdmin.appendChild(card);
  });
}

buscaLocalAdmin?.addEventListener("input", renderLocais);

formLocalAdmin?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nome = nomeLocalAdmin.value.trim();

  if (!nome) {
    notificar("Informe o nome do local.", "erro");

    return;
  }

  const duplicado = locaisExercicio.find(
    (local) =>
      normalizarTexto(local.nome) === normalizarTexto(nome) &&
      local.id !== chaveLocalEdicao,
  );

  if (duplicado) {
    notificar("Já existe um local com este nome.", "erro");

    return;
  }

  try {
    if (editandoLocal && chaveLocalEdicao) {
      await update(
        ref(rtdb, `servidores/locaisExercicio/${chaveLocalEdicao}`),
        {
          nome,
        },
      );

      notificar("Local atualizado com sucesso!");
    } else {
      await push(locaisExercicioRef, {
        nome,
      });

      notificar("Local cadastrado com sucesso!");
    }

    resetarFormularioLocal();
  } catch (erro) {
    console.error("Erro ao salvar local:", erro);

    notificar("Não foi possível salvar o local.", "erro");
  }
});

function editarLocal(local) {
  editandoLocal = true;

  chaveLocalEdicao = local.id;

  nomeLocalAdmin.value = local.nome;

  tituloFormularioLocal.textContent = "Editar local de exercício";

  btnCancelarEdicaoLocal.style.display = "inline-flex";

  msgEdicaoLocal.innerHTML = `
    <div
      class="edicao-menu-info"
    >
      <span
        class="material-symbols-outlined"
      >
        edit_note
      </span>

      <div>
        <strong>
          Modo de edição
        </strong>

        <span>
          ${escaparHtml(local.nome)}
        </span>
      </div>
    </div>
  `;

  msgEdicaoLocal.style.display = "block";

  document.getElementById("btnTopo")?.click();

  nomeLocalAdmin.focus();
}

btnCancelarEdicaoLocal?.addEventListener("click", resetarFormularioLocal);

function resetarFormularioLocal() {
  editandoLocal = false;

  chaveLocalEdicao = null;

  formLocalAdmin.reset();

  tituloFormularioLocal.textContent = "Novo local de exercício";

  btnCancelarEdicaoLocal.style.display = "none";

  msgEdicaoLocal.style.display = "none";

  msgEdicaoLocal.innerHTML = "";
}

/* =========================================
   DESTINOS DE OFÍCIOS
========================================= */

onValue(destinosOficiosRef, (snapshot) => {
  destinosOficios = snapshot.exists()
    ? Object.entries(snapshot.val())
        .map(([id, valor]) => ({
          id,
          nome: typeof valor === "string" ? valor : valor?.nome || "",
        }))
        .filter((destino) => destino.nome)
        .sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR", {
            sensitivity: "base",
          }),
        )
    : [];

  renderDestinos();
});

onValue(oficiosAdminRef, (snapshot) => {
  oficiosAdmin = [];

  if (snapshot.exists()) {
    Object.values(snapshot.val()).forEach((registrosAno) => {
      if (!registrosAno || typeof registrosAno !== "object") {
        return;
      }

      Object.values(registrosAno).forEach((oficio) => {
        if (oficio && typeof oficio === "object") {
          oficiosAdmin.push(oficio);
        }
      });
    });
  }

  renderDestinos();
});

function renderDestinos() {
  if (!listaDestinosAdmin) return;

  const termo = normalizarTexto(buscaDestinoAdmin?.value || "");

  const filtrados = destinosOficios
    .filter((destino) => normalizarTexto(destino.nome).includes(termo))
    .sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", {
        sensitivity: "base",
      }),
    );

  contadorDestinosAdmin.textContent = `${filtrados.length} destino${
    filtrados.length === 1 ? "" : "s"
  } encontrado${filtrados.length === 1 ? "" : "s"}`;

  listaDestinosAdmin.innerHTML = "";

  if (!filtrados.length) {
    listaDestinosAdmin.innerHTML = `
      <p>
        Nenhum destino encontrado.
      </p>
    `;

    return;
  }

  filtrados.forEach((destino) => {
    const totalOficios = oficiosAdmin.filter((oficio) => {
      const usadoComoDestino = oficio.destinoId === destino.id;

      const usadoComoCopia = oficio.copiaId === destino.id;

      return usadoComoDestino || usadoComoCopia;
    }).length;

    const card = document.createElement("div");

    card.className = "local-admin-card";

    card.innerHTML = `
        <div class="local-admin-icone local-admin-inicial">
          ${escaparHtml(destino.nome.charAt(0).toUpperCase())}
        </div>

        <div
          class="local-admin-dados"
        >
          <strong>
            ${escaparHtml(destino.nome)}
          </strong>

          <span>
            ${totalOficios}
            ofício${totalOficios === 1 ? "" : "s"}
            vinculado${totalOficios === 1 ? "" : "s"}
          </span>
        </div>

        <div
          class="local-admin-acoes"
        >
          <button
            type="button"
            class="editar-destino-btn"
            title="Editar destino"
          >
            <span
              class="material-symbols-outlined"
            >
              edit_note
            </span>
          </button>

          <button
            type="button"
            class="excluir-destino-btn"
            title="Excluir destino"
          >
            <span
              class="material-symbols-outlined"
            >
              delete
            </span>
          </button>
        </div>
      `;

    card.querySelector(".editar-destino-btn").addEventListener("click", () => {
      editarDestino(destino);
    });

    card.querySelector(".excluir-destino-btn").addEventListener("click", () => {
      excluirDestino(destino, totalOficios);
    });

    listaDestinosAdmin.appendChild(card);
  });
}

buscaDestinoAdmin?.addEventListener("input", renderDestinos);

formDestinoAdmin?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nome = nomeDestinoAdmin.value.trim();

  if (!nome) {
    notificar("Informe o nome do destino.", "erro");

    return;
  }

  const duplicado = destinosOficios.find(
    (destino) =>
      normalizarTexto(destino.nome) === normalizarTexto(nome) &&
      destino.id !== chaveDestinoEdicao,
  );

  if (duplicado) {
    notificar("Já existe um destino com este nome.", "erro");

    return;
  }

  try {
    if (editandoDestino && chaveDestinoEdicao) {
      await update(ref(rtdb, `destinos/${chaveDestinoEdicao}`), {
        nome,
      });

      notificar("Destino atualizado com sucesso!");
    } else {
      await push(destinosOficiosRef, {
        nome,
      });

      notificar("Destino cadastrado com sucesso!");
    }

    resetarFormularioDestino();
  } catch (erro) {
    console.error("Erro ao salvar destino:", erro);

    notificar("Não foi possível salvar o destino.", "erro");
  }
});

function editarDestino(destino) {
  editandoDestino = true;

  chaveDestinoEdicao = destino.id;

  nomeDestinoAdmin.value = destino.nome;

  tituloFormularioDestino.textContent = "Editar destino de ofício";

  btnCancelarEdicaoDestino.style.display = "inline-flex";

  msgEdicaoDestino.innerHTML = `
    <div
      class="edicao-menu-info"
    >
      <span
        class="material-symbols-outlined"
      >
        edit_note
      </span>

      <div>
        <strong>
          Modo de edição
        </strong>

        <span>
          ${escaparHtml(destino.nome)}
        </span>
      </div>
    </div>
  `;

  msgEdicaoDestino.style.display = "block";

  document.getElementById("btnTopo")?.click();

  nomeDestinoAdmin.focus();
}

async function excluirDestino(destino, totalOficios) {
  if (totalOficios > 0) {
    notificar(
      `Não é possível excluir "${destino.nome}", pois existem ${totalOficios} ofício${
        totalOficios === 1 ? "" : "s"
      } vinculado${totalOficios === 1 ? "" : "s"} a este destino.`,
      "erro",
    );

    return;
  }

  const confirmou = await window.mostrarConfirmacao({
    titulo: "Excluir destino",
    mensagem:
      `Tem certeza que deseja excluir o destino ` +
      `"${destino.nome}"?\n\n` +
      "Esta ação não poderá ser desfeita.",
    tipo: "perigo",
    textoConfirmar: "Excluir destino",
    textoCancelar: "Cancelar",
  });

  if (!confirmou) return;

  try {
    await remove(ref(rtdb, `destinos/${destino.id}`));

    notificar("Destino excluído com sucesso!");

    if (chaveDestinoEdicao === destino.id) {
      resetarFormularioDestino();
    }
  } catch (erro) {
    console.error("Erro ao excluir destino:", erro);

    notificar("Não foi possível excluir o destino.", "erro");
  }
}

btnCancelarEdicaoDestino?.addEventListener("click", resetarFormularioDestino);

function resetarFormularioDestino() {
  editandoDestino = false;

  chaveDestinoEdicao = null;

  formDestinoAdmin.reset();

  tituloFormularioDestino.textContent = "Novo destino de ofício";

  btnCancelarEdicaoDestino.style.display = "none";

  msgEdicaoDestino.style.display = "none";

  msgEdicaoDestino.innerHTML = "";
}
