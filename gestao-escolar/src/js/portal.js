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
const saudacaoGestor = document.getElementById("saudacaoGestor");
const nomeEscolaPainel = document.getElementById("nomeEscolaPainel");
const btnSair = document.getElementById("btnSair");
const notificacao = document.getElementById("notificacao");

const listaSolicitacoesRecentes = document.getElementById(
  "listaSolicitacoesRecentes",
);

let verificacaoConcluida = false;

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

function obterPrimeiroNome(nomeCompleto) {
  const nome = String(nomeCompleto || "").trim();

  if (!nome) {
    return "Gestor";
  }

  return nome.split(/\s+/)[0];
}

function obterSaudacao() {
  const hora = new Date().getHours();

  if (hora >= 5 && hora < 12) {
    return "Bom dia";
  }

  if (hora >= 12 && hora < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
}

function escaparHtml(texto) {
  const elemento = document.createElement("div");
  elemento.textContent = texto ?? "";
  return elemento.innerHTML;
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

function obterStatusSolicitacao(status) {
  const opcoes = {
    RECEBIDA: {
      nome: "Recebida",
      classe: "recebida",
    },

    EM_ANALISE: {
      nome: "Em análise",
      classe: "em-analise",
    },

    APROVADA: {
      nome: "Aprovada",
      classe: "aprovada",
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

    INDEFERIDA: {
      nome: "Indeferida",
      classe: "indeferida",
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

function obterIconeSolicitacao(solicitacao) {
  const iconesPorTipo = {
    AGUA_MINERAL: "water_drop",
    GAS_P13: "propane_tank",
    GAS_P45: "propane_tank",
    GAS_COZINHA: "propane_tank",
    CAMINHAO_PIPA: "local_shipping",
  };

  if (iconesPorTipo[solicitacao.tipo]) {
    return iconesPorTipo[solicitacao.tipo];
  }

  const iconesPorModulo = {
    INSUMOS: "water_drop",
    MATERIAIS_EXPEDIENTE: "inventory_2",
    MATERIAIS_LIMPEZA: "cleaning_services",
    MANUTENCAO: "construction",
  };

  return iconesPorModulo[solicitacao.modulo] || "description";
}

function obterLinkSolicitacao(solicitacao) {
  const links = {
    INSUMOS: "./insumos.html#historico",
    MATERIAIS_EXPEDIENTE: "./materiais-expediente.html#historico",
    MATERIAIS_LIMPEZA: "./materiais-limpeza.html#historico",
    MANUTENCAO: "./manutencao.html#historico",
  };

  return links[solicitacao.modulo] || "./minhas-solicitacoes.html";
}

function renderizarSolicitacoesRecentes(solicitacoes) {
  if (!solicitacoes.length) {
    listaSolicitacoesRecentes.innerHTML = `
      <div class="estado-vazio">
        <span class="material-symbols-outlined">inbox</span>

        <strong>Nenhuma solicitação encontrada</strong>

        <p>
          As solicitações recentes da escola aparecerão aqui.
        </p>
      </div>
    `;

    return;
  }

  listaSolicitacoesRecentes.innerHTML = solicitacoes
    .slice(0, 3)
    .map((solicitacao) => {
      const status = obterStatusSolicitacao(solicitacao.status);

      return `
        <a
          href="${obterLinkSolicitacao(solicitacao)}"
          class="item-solicitacao-recente"
        >
          <div class="solicitacao-recente-icone">
            <span class="material-symbols-outlined">
              ${obterIconeSolicitacao(solicitacao)}
            </span>
          </div>

          <div class="solicitacao-recente-conteudo">
            <span>
              ${escaparHtml(solicitacao.protocolo)}
            </span>

            <strong>
              ${escaparHtml(solicitacao.tipoNome)}
            </strong>

            <small>
              ${escaparHtml(solicitacao.escolaNome || "Unidade não informada")} •
              ${formatarDataHora(solicitacao.criadoEm)}
            </small>
          </div>

          <span class="status-recente ${status.classe}">
            ${escaparHtml(status.nome)}
          </span>

          <span class="material-symbols-outlined seta-recente">
            chevron_right
          </span>
        </a>
      `;
    })
    .join("");
}

function carregarSolicitacoesRecentes(solicitanteUid) {
  if (!solicitanteUid) {
    return;
  }

  listaSolicitacoesRecentes.innerHTML = `
    <div class="estado-vazio">
      <span class="material-symbols-outlined">
        progress_activity
      </span>

      <strong>Carregando solicitações...</strong>
    </div>
  `;

  const registrosRef = ref(rtdb, "portalGestor/solicitacoes/registros");

  const consultaUsuario = query(
    registrosRef,
    orderByChild("solicitanteUid"),
    equalTo(solicitanteUid),
  );

  onValue(
    consultaUsuario,

    (snapshot) => {
      let solicitacoes = [];

      if (snapshot.exists()) {
        solicitacoes = Object.entries(snapshot.val()).map(([id, dados]) => ({
          id,
          ...dados,
        }));
      }

      solicitacoes.sort(
        (a, b) => Number(b.criadoEm || 0) - Number(a.criadoEm || 0),
      );

      renderizarSolicitacoesRecentes(solicitacoes);
    },

    (error) => {
      console.error("Erro ao carregar solicitações recentes:", error);

      listaSolicitacoesRecentes.innerHTML = `
        <div class="estado-vazio">
          <span class="material-symbols-outlined">error</span>

          <strong>Não foi possível carregar</strong>

          <p>Tente novamente em alguns instantes.</p>
        </div>
      `;
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

  const primeiroNome = obterPrimeiroNome(nomeCompleto);

  const nomeEscola =
    dadosUsuario.escolaNome || "Unidade escolar não identificada";

  if (nomeGestor) {
    nomeGestor.textContent = nomeCompleto;
    nomeGestor.title = nomeCompleto;
  }

  if (escolaGestor) {
    escolaGestor.textContent = nomeEscola;
    escolaGestor.title = nomeEscola;
  }

  if (saudacaoGestor) {
    saudacaoGestor.textContent = `${obterSaudacao()}, ${primeiroNome}!`;
  }

  if (nomeEscolaPainel) {
    nomeEscolaPainel.textContent = nomeEscola;
  }

  sessionStorage.setItem(
    "gestorEscolar",
    JSON.stringify({
      uid: user.uid,
      nome: nomeCompleto,
      email: dadosUsuario.email || user.email || "",
      perfil: dadosUsuario.perfil,
      escolaId: dadosUsuario.escolaId,
      escolaNome: nomeEscola,
    }),
  );
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
  };

  const mensagem = mensagens[motivo] || "Não foi possível validar seu acesso.";

  sessionStorage.setItem("mensagemLogin", mensagem);

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
    carregarSolicitacoesRecentes(user.uid);

    document.body.classList.remove("verificando-acesso");
  } catch (error) {
    console.error("Erro ao validar acesso ao portal:", error);

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
