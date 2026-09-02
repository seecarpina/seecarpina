import { auth, db, rtdb } from "./firebaseConfig.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  ref,
  query,
  orderByChild,
  equalTo,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const nomeGestor = document.getElementById("nomeGestor");
const escolaGestor = document.getElementById("escolaGestor");
const btnSair = document.getElementById("btnSair");
const notificacao = document.getElementById("notificacao");
const totalSolicitacoes = document.getElementById("totalSolicitacoes");

const totalEmAndamento = document.getElementById("totalEmAndamento");

const totalAguardandoConfirmacao = document.getElementById(
  "totalAguardandoConfirmacao",
);

const totalFinalizadas = document.getElementById("totalFinalizadas");

const contadorSolicitacoes = document.getElementById("contadorSolicitacoes");

const buscaSolicitacoes = document.getElementById("buscaSolicitacoes");

const filtroModuloSolicitacoes = document.getElementById(
  "filtroModuloSolicitacoes",
);

const filtroStatusSolicitacoes = document.getElementById(
  "filtroStatusSolicitacoes",
);

const listaMinhasSolicitacoes = document.getElementById(
  "listaMinhasSolicitacoes",
);

let verificacaoConcluida = false;
let dadosGestorAtual = null;
let solicitacoesEscola = [];
let cancelarEscutaSolicitacoes = null;

function mostrarNotificacao(mensagem, tipo = "erro") {
  if (!notificacao) {
    return;
  }

  const elemento = document.createElement("div");

  elemento.className = `notificacao-item ${tipo}`;
  elemento.textContent = mensagem;

  notificacao.appendChild(elemento);

  setTimeout(() => {
    elemento.classList.add("saindo");

    setTimeout(() => {
      elemento.remove();
    }, 300);
  }, 4500);
}

function escaparHtml(texto) {
  const elemento = document.createElement("div");

  elemento.textContent = texto ?? "";

  return elemento.innerHTML;
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarDataHora(timestamp) {
  const numero = Number(timestamp);

  if (!Number.isFinite(numero)) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(numero));
}

function obterDadosStatus(status) {
  const opcoes = {
    RECEBIDA: {
      nome: "Recebida",
      classe: "recebida",
    },

    EM_ATENDIMENTO: {
      nome: "Em atendimento",
      classe: "em-atendimento",
    },

    AGUARDANDO_CONFIRMACAO: {
      nome: "Aguardando confirmação",
      classe: "aguardando-confirmacao",
    },

    CONCLUIDA: {
      nome: "Concluída",
      classe: "concluida",
    },

    ATENDIDA_PARCIALMENTE: {
      nome: "Atendida parcialmente",
      classe: "parcial",
    },

    CANCELADA: {
      nome: "Cancelada",
      classe: "cancelada",
    },
  };

  return (
    opcoes[status] || {
      nome: status || "Sem situação",
      classe: "recebida",
    }
  );
}

function obterDadosModulo(modulo) {
  const modulos = {
    INSUMOS: {
      nome: "Água, gás e caminhão-pipa",
      icone: "water_drop",
      link: "./insumos.html#historico",
    },

    MATERIAIS_EXPEDIENTE: {
      nome: "Material de expediente",
      icone: "inventory_2",
      link: "./materiais-expediente.html#historico",
    },

    MATERIAIS_LIMPEZA: {
      nome: "Materiais de limpeza e higiene",
      icone: "cleaning_services",
      link: "./materiais-limpeza.html#historico",
    },

    MANUTENCAO: {
      nome: "Chamado de manutenção",
      icone: "construction",
      link: "./manutencao.html#historico",
    },
  };

  return (
    modulos[modulo] || {
      nome: "Solicitação",
      icone: "description",
      link: "#",
    }
  );
}

function normalizarItensSolicitacao(itens) {
  return Array.isArray(itens)
    ? itens.filter(Boolean)
    : Object.values(itens || {});
}

function obterTituloSolicitacao(solicitacao) {
  if (
    solicitacao.modulo === "MATERIAIS_EXPEDIENTE" ||
    solicitacao.modulo === "MATERIAIS_LIMPEZA"
  ) {
    const itens = normalizarItensSolicitacao(solicitacao.itens);

    if (!itens.length) {
      return solicitacao.modulo === "MATERIAIS_LIMPEZA"
        ? "Materiais de limpeza e higiene"
        : "Material de expediente";
    }

    const primeiroMaterial = itens[0]?.nome || "Material de expediente";

    if (itens.length === 1) {
      return primeiroMaterial;
    }

    return `${primeiroMaterial} e mais ${itens.length - 1}`;
  }

  return (
    solicitacao.tipoNome ||
    solicitacao.categoriaNome ||
    obterDadosModulo(solicitacao.modulo).nome
  );
}

function atualizarIndicadores() {
  const emAndamento = solicitacoesEscola.filter((solicitacao) =>
    ["RECEBIDA", "EM_ATENDIMENTO"].includes(solicitacao.status),
  ).length;

  const aguardando = solicitacoesEscola.filter(
    (solicitacao) => solicitacao.status === "AGUARDANDO_CONFIRMACAO",
  ).length;

  const finalizadas = solicitacoesEscola.filter((solicitacao) =>
    ["CONCLUIDA", "ATENDIDA_PARCIALMENTE"].includes(solicitacao.status),
  ).length;

  totalSolicitacoes.textContent = solicitacoesEscola.length;
  totalEmAndamento.textContent = emAndamento;
  totalAguardandoConfirmacao.textContent = aguardando;
  totalFinalizadas.textContent = finalizadas;
}

function obterSolicitacoesFiltradas() {
  const termo = normalizarTexto(buscaSolicitacoes.value);
  const modulo = filtroModuloSolicitacoes.value;
  const status = filtroStatusSolicitacoes.value;

  return solicitacoesEscola.filter((solicitacao) => {
    const itens = normalizarItensSolicitacao(solicitacao.itens);

    const nomesItens = itens.map((item) => item.nome || "").join(" ");

    const textoPesquisa = normalizarTexto(
      [
        solicitacao.protocolo,
        solicitacao.tipoNome,
        solicitacao.categoriaNome,
        solicitacao.justificativa,
        solicitacao.observacoes,
        solicitacao.escolaNome,
        solicitacao.status,
        obterDadosStatus(solicitacao.status).nome,
        obterDadosModulo(solicitacao.modulo).nome,
        nomesItens,
      ].join(" "),
    );

    const correspondePesquisa = !termo || textoPesquisa.includes(termo);

    const correspondeModulo = !modulo || solicitacao.modulo === modulo;

    const correspondeStatus = !status || solicitacao.status === status;

    return correspondePesquisa && correspondeModulo && correspondeStatus;
  });
}

function renderizarSolicitacoes() {
  const solicitacoesFiltradas = obterSolicitacoesFiltradas();

  contadorSolicitacoes.textContent =
    `${solicitacoesFiltradas.length} solicitação` +
    `${solicitacoesFiltradas.length === 1 ? "" : "ões"} encontrada` +
    `${solicitacoesFiltradas.length === 1 ? "" : "s"}`;

  if (!solicitacoesFiltradas.length) {
    listaMinhasSolicitacoes.innerHTML = `
      <div class="estado-minhas-solicitacoes">
        <span class="material-symbols-outlined">inbox</span>

        <strong>Nenhuma solicitação encontrada</strong>

        <p>
          Não há registros correspondentes aos filtros informados.
        </p>
      </div>
    `;

    return;
  }

  listaMinhasSolicitacoes.innerHTML = solicitacoesFiltradas
    .map((solicitacao) => {
      const modulo = obterDadosModulo(solicitacao.modulo);
      const status = obterDadosStatus(solicitacao.status);

      return `
        <a
          href="${modulo.link}"
          class="card-minha-solicitacao"
        >
          <div class="icone-card-minha-solicitacao">
            <span class="material-symbols-outlined">
              ${modulo.icone}
            </span>
          </div>

          <div class="conteudo-card-minha-solicitacao">
            <div class="topo-card-minha-solicitacao">
              <div>
                <span class="modulo-card-minha-solicitacao">
                  ${escaparHtml(modulo.nome)}
                </span>

                <span class="protocolo-card-minha-solicitacao">
                  ${escaparHtml(solicitacao.protocolo || "Sem protocolo")}
                </span>
              </div>

              <span class="status-minha-solicitacao ${status.classe}">
                ${escaparHtml(status.nome)}
              </span>
            </div>

            <h3>
              ${escaparHtml(obterTituloSolicitacao(solicitacao))}
            </h3>

            <span class="escola-card-minha-solicitacao">
              <span class="material-symbols-outlined">location_on</span>
              ${escaparHtml(solicitacao.escolaNome || "Unidade não informada")}
            </span>

            <div class="rodape-card-minha-solicitacao">
              <span>
                ${formatarDataHora(solicitacao.criadoEm)}
              </span>

              <span class="abrir-card-minha-solicitacao">
                Ver detalhes
                <span class="material-symbols-outlined">
                  arrow_forward
                </span>
              </span>
            </div>
          </div>
        </a>
      `;
    })
    .join("");
}

function carregarSolicitacoes(solicitanteUid) {
  if (!solicitanteUid) {
    return;
  }

  const registrosRef = ref(rtdb, "portalGestor/solicitacoes/registros");

  const consultaUsuario = query(
    registrosRef,
    orderByChild("solicitanteUid"),
    equalTo(solicitanteUid),
  );

  cancelarEscutaSolicitacoes = onValue(
    consultaUsuario,

    (snapshot) => {
      solicitacoesEscola = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([id, dados]) => ({
            id,
            ...dados,
          }))
        : [];

      solicitacoesEscola.sort(
        (a, b) => Number(b.criadoEm || 0) - Number(a.criadoEm || 0),
      );

      atualizarIndicadores();
      renderizarSolicitacoes();
    },

    (error) => {
      console.error("Erro ao carregar solicitações:", error);

      contadorSolicitacoes.textContent = "Não foi possível carregar";

      listaMinhasSolicitacoes.innerHTML = `
        <div class="estado-minhas-solicitacoes">
          <span class="material-symbols-outlined">error</span>

          <strong>Não foi possível carregar as solicitações</strong>

          <p>Tente novamente em alguns instantes.</p>
        </div>
      `;

      mostrarNotificacao(
        "Não foi possível carregar as solicitações da escola.",
      );
    },
  );
}

async function buscarDadosUsuario(uid) {
  const usuarioRef = doc(db, "usuarios", uid);
  const usuarioSnap = await getDoc(usuarioRef);

  if (!usuarioSnap.exists()) {
    return null;
  }

  return {
    uid,
    ...usuarioSnap.data(),
  };
}

function validarPerfilGestor(dadosUsuario) {
  if (!dadosUsuario) {
    return {
      autorizado: false,
      motivo: "CADASTRO_NAO_ENCONTRADO",
    };
  }

  if (dadosUsuario.ativo === false) {
    return {
      autorizado: false,
      motivo: "USUARIO_DESATIVADO",
    };
  }

  const perfil = String(dadosUsuario.perfil || "")
    .trim()
    .toUpperCase();

  if (perfil !== "GESTOR_ESCOLAR") {
    return {
      autorizado: false,
      motivo: "PERFIL_NAO_AUTORIZADO",
    };
  }

  if (!dadosUsuario.escolaId) {
    return {
      autorizado: false,
      motivo: "ESCOLA_NAO_VINCULADA",
    };
  }

  return {
    autorizado: true,
    motivo: null,
  };
}

function preencherDadosGestor(user, dadosUsuario) {
  const nomeCompleto =
    dadosUsuario.nome || user.displayName || "Gestor escolar";

  const nomeEscola =
    dadosUsuario.escolaNome || "Unidade escolar não identificada";

  dadosGestorAtual = {
    uid: user.uid,
    nome: nomeCompleto,
    email: dadosUsuario.email || user.email || "",
    perfil: dadosUsuario.perfil,
    escolaId: dadosUsuario.escolaId,
    escolaNome: nomeEscola,
  };

  nomeGestor.textContent = nomeCompleto;
  nomeGestor.title = nomeCompleto;

  escolaGestor.textContent = nomeEscola;
  escolaGestor.title = nomeEscola;

  sessionStorage.setItem("gestorEscolar", JSON.stringify(dadosGestorAtual));
}

async function encerrarAcesso(motivo) {
  sessionStorage.removeItem("gestorEscolar");

  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erro ao encerrar sessão:", error);
  }

  const mensagens = {
    CADASTRO_NAO_ENCONTRADO: "Seu cadastro não foi encontrado no sistema.",

    USUARIO_DESATIVADO: "Seu acesso ao Portal do Gestor está desativado.",

    PERFIL_NAO_AUTORIZADO: "Este ambiente é exclusivo para gestores escolares.",

    ESCOLA_NAO_VINCULADA:
      "Seu usuário ainda não está vinculado a uma unidade escolar.",

    ERRO_VALIDACAO: "Não foi possível validar seu acesso.",
  };

  sessionStorage.setItem(
    "mensagemLogin",
    mensagens[motivo] || "Não foi possível validar seu acesso.",
  );

  window.location.replace("./login.html");
}

onAuthStateChanged(auth, async (user) => {
  if (verificacaoConcluida) {
    return;
  }

  verificacaoConcluida = true;

  if (!user) {
    sessionStorage.removeItem("gestorEscolar");
    window.location.replace("./login.html");
    return;
  }

  try {
    const dadosUsuario = await buscarDadosUsuario(user.uid);
    const validacao = validarPerfilGestor(dadosUsuario);

    if (!validacao.autorizado) {
      await encerrarAcesso(validacao.motivo);
      return;
    }

    preencherDadosGestor(user, dadosUsuario);

    carregarSolicitacoes(user.uid);

    document.body.classList.remove("verificando-acesso");
  } catch (error) {
    console.error("Erro ao validar acesso:", error);

    mostrarNotificacao("Não foi possível carregar os dados do seu acesso.");

    await encerrarAcesso("ERRO_VALIDACAO");
  }
});

btnSair?.addEventListener("click", async () => {
  btnSair.disabled = true;

  try {
    sessionStorage.removeItem("gestorEscolar");

    await signOut(auth);

    window.location.replace("./login.html");
  } catch (error) {
    console.error("Erro ao sair:", error);

    mostrarNotificacao("Não foi possível sair do portal. Tente novamente.");

    btnSair.disabled = false;
  }
});

buscaSolicitacoes.addEventListener("input", renderizarSolicitacoes);

filtroModuloSolicitacoes.addEventListener("change", renderizarSolicitacoes);

filtroStatusSolicitacoes.addEventListener("change", renderizarSolicitacoes);

window.addEventListener("beforeunload", () => {
  if (typeof cancelarEscutaSolicitacoes === "function") {
    cancelarEscutaSolicitacoes();
  }
});
