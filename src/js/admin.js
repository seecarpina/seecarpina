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

const PERFIS = ["ADM", "GERENTE", "TECNICO", "LOGISTICA", "SECRETÁRIA"];

/* =========================================
   ESTADO
========================================= */

let usuarios = [];
let itensMenu = [];

let editandoMenu = false;
let chaveMenuEdicao = null;

let locaisExercicio = [];
let servidoresAdmin = [];

let editandoLocal = false;
let chaveLocalEdicao = null;

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

/* =========================================
   CARREGAR USUÁRIOS
========================================= */

async function carregarUsuarios() {
  try {
    const snapshot = await getDocs(collection(db, "usuarios"));

    usuarios = snapshot.docs.map((documento) => ({
      ...documento.data(),
      _uid: documento.id,
    }));

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

    const ativo = usuario.ativo !== false;

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
      const ativo = usuario.ativo !== false;

      const card = document.createElement("div");

      card.className = "usuario-admin-card";

      card.innerHTML = `
        <div class="usuario-admin-topo">

          <div class="usuario-admin-avatar">
            <span
              class="material-symbols-outlined"
            >
              person
            </span>
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

      const switchUsuario = card.querySelector(".switch-usuario");

      selectPerfil.addEventListener("change", async () => {
        await alterarPerfilUsuario(usuario, selectPerfil.value);
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
  const confirmou = confirm(
    `Deseja alterar o perfil de ` + `${usuario.nome} para ${novoPerfil}?`,
  );

  if (!confirmou) {
    renderUsuarios();
    return;
  }

  try {
    await updateDoc(doc(db, "usuarios", usuario._uid), {
      cargo: novoPerfil,
      atualizadoEm: new Date().toISOString(),
    });

    usuario.cargo = novoPerfil;

    notificar("Perfil atualizado com sucesso!");

    renderUsuarios();
  } catch (erro) {
    console.error("Erro ao alterar perfil:", erro);

    notificar("Erro ao alterar perfil.", "erro");

    renderUsuarios();
  }
}

/* =========================================
   ATIVAR / DESATIVAR
========================================= */

async function alterarSituacaoUsuario(usuario, ativo) {
  const acao = ativo ? "ativar" : "desativar";

  const confirmou = confirm(`Deseja ${acao} o usuário ${usuario.nome}?`);

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

const locaisExercicioRef = ref(rtdb, "servidores/locaisExercicio");

const servidoresRef = ref(rtdb, "servidores/registros");

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

  ativoMenu.checked = item.ativo !== false;

  badgeNovoMenu.checked = item.badgeNovo === true;

  acessoTodosMenu.checked = item.acessoTodos === true;

  previewIconeMenu.textContent = item.icone || "link";

  document.querySelectorAll(".perfil-menu").forEach((checkbox) => {
    checkbox.checked = item.perfis?.[checkbox.value] === true;
  });

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

  ativoMenu.checked = true;

  badgeNovoMenu.checked = false;

  ordemMenu.value = 1;

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

  const confirmou = confirm(`Deseja ${acao} o item "${item.titulo}"?`);

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
  const confirmou = confirm(
    `Tem certeza que deseja excluir ` + `"${item.titulo}" do menu?`,
  );

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
        <div
          class="local-admin-icone"
        >
          <span
            class="material-symbols-outlined"
          >
            location_on
          </span>
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
