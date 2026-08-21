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
  push,
  update,
  runTransaction,
  serverTimestamp,
  query,
  orderByChild,
  equalTo,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const nomeGestor = document.getElementById("nomeGestor");
const escolaGestor = document.getElementById("escolaGestor");
const btnSair = document.getElementById("btnSair");
const notificacao = document.getElementById("notificacao");

const form = document.getElementById("formChamadoManutencao");

const unidadeEscolar = document.getElementById("unidadeEscolar");

const gestorSolicitante = document.getElementById("gestorSolicitante");

const categoriaManutencao = document.getElementById("categoriaManutencao");

const ambienteManutencao = document.getElementById("ambienteManutencao");

const localEspecificoManutencao = document.getElementById(
  "localEspecificoManutencao",
);

const descricaoProblema = document.getElementById("descricaoProblema");

const contadorDescricaoProblema = document.getElementById(
  "contadorDescricaoProblema",
);

const impactoManutencao = document.getElementById("impactoManutencao");

const prioridadeSolicitacao = document.getElementById("prioridadeSolicitacao");

const dataIdentificacaoProblema = document.getElementById(
  "dataIdentificacaoProblema",
);

const observacoesSolicitacao = document.getElementById(
  "observacoesSolicitacao",
);

const contadorObservacoes = document.getElementById("contadorObservacoes");

const btnEnviarSolicitacao = document.getElementById("btnEnviarSolicitacao");

const listaSolicitacoes = document.getElementById("listaSolicitacoes");

const buscaSolicitacoes = document.getElementById("buscaSolicitacoes");

const filtroStatus = document.getElementById("filtroStatus");

const avisoConfirmacaoPendente = document.getElementById(
  "avisoConfirmacaoPendente",
);

const textoConfirmacaoPendente = document.getElementById(
  "textoConfirmacaoPendente",
);

const btnVerConfirmacaoPendente = document.getElementById(
  "btnVerConfirmacaoPendente",
);

let solicitacoesEscola = [];
let confirmacaoPendenteAtual = null;
let cancelarEscutaSolicitacoes = null;

let dadosGestorAtual = null;
let verificacaoConcluida = false;

const overlayDetalhes = document.getElementById("overlayDetalhes");
const drawerDetalhes = document.getElementById("drawerDetalhes");
const btnFecharDetalhes = document.getElementById("btnFecharDetalhes");
const btnFecharDetalhesRodape = document.getElementById(
  "btnFecharDetalhesRodape",
);
const btnCancelarSolicitacao = document.getElementById(
  "btnCancelarSolicitacao",
);

const btnConfirmarRecebimento = document.getElementById(
  "btnConfirmarRecebimento",
);

const iconeDetalhesSolicitacao = document.getElementById(
  "iconeDetalhesSolicitacao",
);
const protocoloDetalhes = document.getElementById("protocoloDetalhes");
const tituloDrawerDetalhes = document.getElementById("tituloDrawerDetalhes");
const statusDetalhes = document.getElementById("statusDetalhes");
const prioridadeDetalhes = document.getElementById("prioridadeDetalhes");
const categoriaDetalhes = document.getElementById("categoriaDetalhes");

const ambienteDetalhes = document.getElementById("ambienteDetalhes");

const localEspecificoDetalhes = document.getElementById(
  "localEspecificoDetalhes",
);

const impactoDetalhes = document.getElementById("impactoDetalhes");

const dataEnvioDetalhes = document.getElementById("dataEnvioDetalhes");

const dataIdentificacaoDetalhes = document.getElementById(
  "dataIdentificacaoDetalhes",
);

const descricaoProblemaDetalhes = document.getElementById(
  "descricaoProblemaDetalhes",
);
const blocoObservacoesDetalhes = document.getElementById(
  "blocoObservacoesDetalhes",
);
const observacoesDetalhes = document.getElementById("observacoesDetalhes");
const escolaDetalhes = document.getElementById("escolaDetalhes");
const gestorDetalhes = document.getElementById("gestorDetalhes");
const blocoEntregaDetalhes = document.getElementById("blocoEntregaDetalhes");

const resultadoEntregaDetalhes = document.getElementById(
  "resultadoEntregaDetalhes",
);

const dataEntregaDetalhes = document.getElementById("dataEntregaDetalhes");

const responsavelEntregaDetalhes = document.getElementById(
  "responsavelEntregaDetalhes",
);

const confirmacaoEntregaDetalhes = document.getElementById(
  "confirmacaoEntregaDetalhes",
);

const blocoObservacaoEntregaDetalhes = document.getElementById(
  "blocoObservacaoEntregaDetalhes",
);

const observacaoEntregaDetalhes = document.getElementById(
  "observacaoEntregaDetalhes",
);
const historicoDetalhes = document.getElementById("historicoDetalhes");

const overlayCancelamento = document.getElementById("overlayCancelamento");
const dialogoCancelamento = document.getElementById("dialogoCancelamento");
const motivoCancelamento = document.getElementById("motivoCancelamento");
const contadorMotivoCancelamento = document.getElementById(
  "contadorMotivoCancelamento",
);
const btnVoltarCancelamento = document.getElementById("btnVoltarCancelamento");
const btnConfirmarCancelamento = document.getElementById(
  "btnConfirmarCancelamento",
);

const overlayConfirmacaoRecebimento = document.getElementById(
  "overlayConfirmacaoRecebimento",
);

const dialogoConfirmacaoRecebimento = document.getElementById(
  "dialogoConfirmacaoRecebimento",
);

const textoConfirmacaoRecebimento = document.getElementById(
  "textoConfirmacaoRecebimento",
);

const btnVoltarConfirmacaoRecebimento = document.getElementById(
  "btnVoltarConfirmacaoRecebimento",
);

const btnConfirmarEntregaRecebida = document.getElementById(
  "btnConfirmarEntregaRecebida",
);

let solicitacaoSelecionada = null;

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

function obterDataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function configurarDataIdentificacao() {
  const hoje = obterDataLocalISO();

  dataIdentificacaoProblema.max = hoje;

  if (!dataIdentificacaoProblema.value) {
    dataIdentificacaoProblema.value = hoje;
  }
}

function atualizarPrioridadePorImpacto() {
  const impacto = impactoManutencao.value;

  if (impacto === "INTERDITA_AMBIENTE" || impacto === "RISCO_SEGURANCA") {
    prioridadeSolicitacao.value = "URGENTE";
  }
}

function atualizarContadores() {
  contadorDescricaoProblema.textContent = descricaoProblema.value.length;

  contadorObservacoes.textContent = observacoesSolicitacao.value.length;
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

  unidadeEscolar.value = nomeEscola;
  gestorSolicitante.value = nomeCompleto;

  sessionStorage.setItem("gestorEscolar", JSON.stringify(dadosGestorAtual));
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

function validarGestor(dadosUsuario) {
  if (!dadosUsuario) {
    return "CADASTRO_NAO_ENCONTRADO";
  }

  if (dadosUsuario.ativo === false) {
    return "USUARIO_DESATIVADO";
  }

  const perfil = String(dadosUsuario.perfil || "")
    .trim()
    .toUpperCase();

  if (perfil !== "GESTOR_ESCOLAR") {
    return "PERFIL_NAO_AUTORIZADO";
  }

  if (!dadosUsuario.escolaId) {
    return "ESCOLA_NAO_VINCULADA";
  }

  return null;
}

async function encerrarAcesso(motivo) {
  const mensagens = {
    CADASTRO_NAO_ENCONTRADO: "Seu cadastro não foi encontrado no sistema.",
    USUARIO_DESATIVADO: "Seu acesso ao Portal do Gestor está desativado.",
    PERFIL_NAO_AUTORIZADO: "Este ambiente é exclusivo para gestores escolares.",
    ESCOLA_NAO_VINCULADA:
      "Seu usuário ainda não está vinculado a uma unidade escolar.",
  };

  sessionStorage.removeItem("gestorEscolar");

  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erro ao encerrar sessão:", error);
  }

  sessionStorage.setItem(
    "mensagemLogin",
    mensagens[motivo] || "Não foi possível validar seu acesso.",
  );

  window.location.replace("./login.html");
}

function ativarAba(idAba) {
  document.querySelectorAll(".aba-insumos").forEach((botao) => {
    botao.classList.toggle("ativa", botao.dataset.aba === idAba);
  });

  document.querySelectorAll(".conteudo-aba-insumos").forEach((conteudo) => {
    conteudo.classList.toggle("ativo", conteudo.id === idAba);
  });

  if (idAba === "historicoSolicitacoes") {
    history.replaceState(null, "", "#historico");
  } else {
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }
}

document.querySelectorAll(".aba-insumos").forEach((botao) => {
  botao.addEventListener("click", () => {
    ativarAba(botao.dataset.aba);
  });
});

impactoManutencao.addEventListener("change", atualizarPrioridadePorImpacto);

descricaoProblema.addEventListener("input", atualizarContadores);

observacoesSolicitacao.addEventListener("input", atualizarContadores);

form.addEventListener("reset", () => {
  setTimeout(() => {
    unidadeEscolar.value = dadosGestorAtual?.escolaNome || "";
    gestorSolicitante.value = dadosGestorAtual?.nome || "";

    configurarDataIdentificacao();
    atualizarContadores();
  }, 0);
});

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escaparHtml(texto) {
  const elemento = document.createElement("div");
  elemento.textContent = texto ?? "";
  return elemento.innerHTML;
}

function formatarData(dataISO) {
  if (!dataISO) {
    return "-";
  }

  const partes = String(dataISO).split("-");

  if (partes.length !== 3) {
    return dataISO;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
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
  const statusDisponiveis = {
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
    statusDisponiveis[status] || {
      nome: status || "Sem situação",
      classe: "recebida",
    }
  );
}

function obterIconeManutencao() {
  return "construction";
}

function obterNomeCategoriaManutencao(categoria) {
  const nomes = {
    ELETRICA: "Elétrica",
    HIDRAULICA: "Hidráulica",
    SANITARIA: "Sanitária",
    ALVENARIA: "Alvenaria",
    TELHADO_COBERTURA: "Telhado e cobertura",
    PINTURA: "Pintura",
    CARPINTARIA: "Carpintaria",
    SERRALHARIA: "Serralharia",
    PORTAS_FECHADURAS: "Portas e fechaduras",
    PISO_REVESTIMENTO: "Piso e revestimento",
    OUTRO: "Outro problema",
  };

  return nomes[categoria] || categoria || "Não informada";
}

function obterNomeAmbienteManutencao(ambiente) {
  const nomes = {
    SALA_AULA: "Sala de aula",
    BANHEIRO: "Banheiro",
    COZINHA: "Cozinha",
    REFEITORIO: "Refeitório",
    SECRETARIA: "Secretaria",
    DIRETORIA: "Diretoria",
    SALA_PROFESSORES: "Sala dos professores",
    QUADRA: "Quadra",
    PATIO: "Pátio",
    MURO_AREA_EXTERNA: "Muro ou área externa",
    INSTALACAO_GERAL: "Instalação geral da escola",
    OUTRO: "Outro ambiente",
  };

  return nomes[ambiente] || ambiente || "Não informado";
}

function obterNomeImpactoManutencao(impacto) {
  const nomes = {
    SEM_IMPEDIMENTO: "Não impede o uso do ambiente",
    PREJUDICA_ATIVIDADES: "Prejudica parcialmente as atividades",
    INTERDITA_AMBIENTE: "Impede o uso do ambiente",
    RISCO_SEGURANCA: "Apresenta risco à segurança",
  };

  return nomes[impacto] || impacto || "Não informado";
}

function obterDescricaoHistorico(item) {
  if (item.descricao) {
    return item.descricao;
  }

  const status = obterDadosStatus(item.status);

  return `Situação alterada para ${status.nome}.`;
}

function renderizarHistoricoDetalhes(solicitacao) {
  const historico = Object.entries(solicitacao.historico || {})
    .map(([id, dados]) => ({
      id,
      ...dados,
    }))
    .sort((a, b) => Number(a.criadoEm || 0) - Number(b.criadoEm || 0));

  if (!historico.length) {
    historicoDetalhes.innerHTML = `
      <div class="estado-vazio">
        <span class="material-symbols-outlined">history</span>
        <strong>Nenhum histórico disponível</strong>
      </div>
    `;

    return;
  }

  historicoDetalhes.innerHTML = historico
    .map((item) => {
      const status = obterDadosStatus(item.status);

      return `
        <div class="item-historico-detalhes">
          <strong>
            ${escaparHtml(status.nome)}
          </strong>

          <p>
            ${escaparHtml(obterDescricaoHistorico(item))}
          </p>

          <p>
            Responsável:
            ${escaparHtml(item.responsavelNome || "Não informado")}
          </p>

          <time>
            ${formatarDataHora(item.criadoEm)}
          </time>
        </div>
      `;
    })
    .join("");
}

function abrirDetalhesSolicitacao(solicitacaoId) {
  const solicitacao = solicitacoesEscola.find(
    (item) => item.id === solicitacaoId,
  );

  if (!solicitacao) {
    mostrarNotificacao("Solicitação não localizada.");
    return;
  }

  solicitacaoSelecionada = solicitacao;

  const status = obterDadosStatus(solicitacao.status);
  const prioridadeUrgente = solicitacao.prioridade === "URGENTE";

  iconeDetalhesSolicitacao.textContent = obterIconeManutencao();

  protocoloDetalhes.textContent = solicitacao.protocolo || "Sem protocolo";

  tituloDrawerDetalhes.textContent = obterNomeCategoriaManutencao(
    solicitacao.categoria,
  );

  statusDetalhes.className = `status-solicitacao ${status.classe}`;

  statusDetalhes.textContent = status.nome;

  prioridadeDetalhes.className = prioridadeUrgente
    ? "prioridade-detalhes urgente"
    : "prioridade-detalhes";

  prioridadeDetalhes.textContent = prioridadeUrgente
    ? "Prioridade urgente"
    : "Prioridade normal";

  categoriaDetalhes.textContent = obterNomeCategoriaManutencao(
    solicitacao.categoria,
  );

  ambienteDetalhes.textContent = obterNomeAmbienteManutencao(
    solicitacao.ambiente,
  );

  localEspecificoDetalhes.textContent =
    solicitacao.localEspecifico || "Não informado";

  impactoDetalhes.textContent = obterNomeImpactoManutencao(solicitacao.impacto);

  dataEnvioDetalhes.textContent = formatarDataHora(solicitacao.criadoEm);

  dataIdentificacaoDetalhes.textContent = formatarData(
    solicitacao.dataIdentificacao,
  );

  descricaoProblemaDetalhes.textContent = solicitacao.descricaoProblema || "-";

  if (solicitacao.observacoes) {
    blocoObservacoesDetalhes.style.display = "";
    observacoesDetalhes.textContent = solicitacao.observacoes;
  } else {
    blocoObservacoesDetalhes.style.display = "none";
    observacoesDetalhes.textContent = "";
  }

  escolaDetalhes.textContent = solicitacao.escolaNome || "-";

  gestorDetalhes.textContent = solicitacao.solicitanteNome || "-";

  const dadosEntrega = solicitacao.confirmacaoEntrega;

  if (dadosEntrega?.tipoAtendimento) {
    blocoEntregaDetalhes.style.display = "";

    resultadoEntregaDetalhes.textContent =
      dadosEntrega.tipoAtendimento === "PARCIAL"
        ? "Serviço atendido parcialmente"
        : "Serviço concluído";

    dataEntregaDetalhes.textContent = formatarDataHora(
      dadosEntrega.informadoEm,
    );

    responsavelEntregaDetalhes.textContent =
      dadosEntrega.informadoPorNome || "Não informado";

    if (dadosEntrega.pendente === true) {
      confirmacaoEntregaDetalhes.textContent = "Aguardando confirmação";
    } else if (dadosEntrega.confirmadoEm) {
      confirmacaoEntregaDetalhes.textContent = `Confirmado por ${
        dadosEntrega.confirmadoPorNome || "gestor da unidade"
      } em ${formatarDataHora(dadosEntrega.confirmadoEm)}`;
    } else {
      confirmacaoEntregaDetalhes.textContent = "Não informada";
    }

    const possuiObservacao =
      dadosEntrega.tipoAtendimento === "PARCIAL" &&
      Boolean(String(dadosEntrega.observacao || "").trim());

    blocoObservacaoEntregaDetalhes.style.display = possuiObservacao
      ? ""
      : "none";

    observacaoEntregaDetalhes.textContent = dadosEntrega.observacao || "";
  } else {
    blocoEntregaDetalhes.style.display = "none";
    resultadoEntregaDetalhes.textContent = "-";
    dataEntregaDetalhes.textContent = "-";
    responsavelEntregaDetalhes.textContent = "-";
    confirmacaoEntregaDetalhes.textContent = "-";
    blocoObservacaoEntregaDetalhes.style.display = "none";
    observacaoEntregaDetalhes.textContent = "";
  }

  renderizarHistoricoDetalhes(solicitacao);

  const podeCancelar = solicitacao.status === "RECEBIDA";

  const podeConfirmarRecebimento =
    solicitacao.status === "AGUARDANDO_CONFIRMACAO" &&
    solicitacao.confirmacaoEntrega?.pendente === true;

  btnCancelarSolicitacao.style.display = podeCancelar ? "flex" : "none";

  btnConfirmarRecebimento.style.display = podeConfirmarRecebimento
    ? "flex"
    : "none";

  btnCancelarSolicitacao.disabled = false;
  btnCancelarSolicitacao.dataset.id = solicitacao.id;

  btnConfirmarRecebimento.disabled = false;
  btnConfirmarRecebimento.dataset.id = solicitacao.id;

  overlayDetalhes.classList.add("ativo");
  drawerDetalhes.classList.add("ativo");
  document.body.classList.add("drawer-aberto");

  overlayDetalhes.setAttribute("aria-hidden", "false");
  drawerDetalhes.setAttribute("aria-hidden", "false");
}

function abrirDialogoCancelamento() {
  if (!solicitacaoSelecionada) {
    mostrarNotificacao("Solicitação não localizada.");
    return;
  }

  if (solicitacaoSelecionada.status !== "RECEBIDA") {
    mostrarNotificacao("Esta solicitação não pode mais ser cancelada.");

    return;
  }

  motivoCancelamento.value = "";
  contadorMotivoCancelamento.textContent = "0";

  overlayCancelamento.classList.add("ativo");
  dialogoCancelamento.classList.add("ativo");

  overlayCancelamento.setAttribute("aria-hidden", "false");
  dialogoCancelamento.setAttribute("aria-hidden", "false");

  setTimeout(() => {
    motivoCancelamento.focus();
  }, 200);
}

function fecharDialogoCancelamento() {
  overlayCancelamento.classList.remove("ativo");
  dialogoCancelamento.classList.remove("ativo");

  overlayCancelamento.setAttribute("aria-hidden", "true");
  dialogoCancelamento.setAttribute("aria-hidden", "true");

  motivoCancelamento.value = "";
  contadorMotivoCancelamento.textContent = "0";
}

async function cancelarSolicitacao() {
  if (!solicitacaoSelecionada?.id) {
    throw new Error("Solicitação não localizada.");
  }

  if (!dadosGestorAtual?.uid || !dadosGestorAtual?.escolaId) {
    throw new Error("Gestor não identificado.");
  }

  const motivo = motivoCancelamento.value.trim();

  if (!motivo) {
    throw new Error("Informe o motivo do cancelamento.");
  }

  const solicitacaoId = solicitacaoSelecionada.id;

  const solicitacaoRef = ref(
    rtdb,
    `portalGestor/solicitacoes/registros/${solicitacaoId}`,
  );

  const novoHistoricoRef = push(
    ref(rtdb, `portalGestor/solicitacoes/registros/${solicitacaoId}/historico`),
  );

  const historicoId = novoHistoricoRef.key;

  if (!historicoId) {
    throw new Error("Não foi possível criar o histórico.");
  }

  let motivoFalha = "";

  const agora = Date.now();

  const resultado = await runTransaction(
    solicitacaoRef,

    (solicitacaoAtual) => {
      if (!solicitacaoAtual) {
        motivoFalha = "SOLICITACAO_NAO_ENCONTRADA";
        return;
      }

      if (
        String(solicitacaoAtual.escolaId) !== String(dadosGestorAtual.escolaId)
      ) {
        motivoFalha = "ESCOLA_NAO_AUTORIZADA";
        return;
      }

      if (solicitacaoAtual.status !== "RECEBIDA") {
        motivoFalha = "STATUS_NAO_PERMITIDO";
        return;
      }

      solicitacaoAtual.status = "CANCELADA";
      solicitacaoAtual.atualizadoEm = agora;
      solicitacaoAtual.canceladoEm = agora;
      solicitacaoAtual.canceladoPorUid = dadosGestorAtual.uid;
      solicitacaoAtual.canceladoPorNome = dadosGestorAtual.nome;
      solicitacaoAtual.motivoCancelamento = motivo;

      if (!solicitacaoAtual.historico) {
        solicitacaoAtual.historico = {};
      }

      solicitacaoAtual.historico[historicoId] = {
        status: "CANCELADA",
        statusAnterior: "RECEBIDA",
        acao: "SOLICITACAO_CANCELADA",
        descricao: `Solicitação cancelada. Motivo: ${motivo}`,
        motivo,
        responsavelUid: dadosGestorAtual.uid,
        responsavelNome: dadosGestorAtual.nome,
        criadoEm: agora,
      };

      return solicitacaoAtual;
    },
  );

  if (!resultado.committed) {
    const mensagens = {
      SOLICITACAO_NAO_ENCONTRADA: "A solicitação não foi encontrada.",

      ESCOLA_NAO_AUTORIZADA:
        "Você não possui autorização para cancelar esta solicitação.",

      STATUS_NAO_PERMITIDO:
        "A situação da solicitação foi alterada e ela não pode mais ser cancelada.",
    };

    throw new Error(
      mensagens[motivoFalha] || "Não foi possível cancelar a solicitação.",
    );
  }
}

btnCancelarSolicitacao.addEventListener("click", abrirDialogoCancelamento);

btnVoltarCancelamento.addEventListener("click", fecharDialogoCancelamento);

overlayCancelamento.addEventListener("click", fecharDialogoCancelamento);

motivoCancelamento.addEventListener("input", () => {
  contadorMotivoCancelamento.textContent = motivoCancelamento.value.length;
});

btnConfirmarCancelamento.addEventListener("click", async () => {
  const motivo = motivoCancelamento.value.trim();

  if (!motivo) {
    mostrarNotificacao("Informe o motivo do cancelamento.");

    motivoCancelamento.focus();
    return;
  }

  btnConfirmarCancelamento.disabled = true;

  btnConfirmarCancelamento.innerHTML = `
      <span class="material-symbols-outlined">
        progress_activity
      </span>

      Cancelando...
    `;

  try {
    await cancelarSolicitacao();

    fecharDialogoCancelamento();
    fecharDetalhesSolicitacao();

    mostrarNotificacao("Solicitação cancelada com sucesso.", "sucesso");
  } catch (error) {
    console.error("Erro ao cancelar solicitação:", error);

    mostrarNotificacao(
      error.message || "Não foi possível cancelar a solicitação.",
    );
  } finally {
    btnConfirmarCancelamento.disabled = false;

    btnConfirmarCancelamento.innerHTML = `
        <span class="material-symbols-outlined">cancel</span>
        Confirmar cancelamento
      `;
  }
});

function abrirDialogoConfirmacaoRecebimento() {
  if (!solicitacaoSelecionada) {
    mostrarNotificacao("Solicitação não localizada.");
    return;
  }

  const confirmacao = solicitacaoSelecionada.confirmacaoEntrega;

  if (
    solicitacaoSelecionada.status !== "AGUARDANDO_CONFIRMACAO" ||
    confirmacao?.pendente !== true
  ) {
    mostrarNotificacao("Esta solicitação não possui confirmação pendente.");

    return;
  }

  const atendimentoParcial = confirmacao.tipoAtendimento === "PARCIAL";

  textoConfirmacaoRecebimento.textContent = atendimentoParcial
    ? "O chamado foi atendido parcialmente. Confirme que o serviço descrito no histórico foi realizado na unidade escolar."
    : "O serviço foi concluído. Confirme que a manutenção foi realizada na unidade escolar.";

  overlayConfirmacaoRecebimento.classList.add("ativo");
  dialogoConfirmacaoRecebimento.classList.add("ativo");

  overlayConfirmacaoRecebimento.setAttribute("aria-hidden", "false");

  dialogoConfirmacaoRecebimento.setAttribute("aria-hidden", "false");
}

function fecharDialogoConfirmacaoRecebimento() {
  overlayConfirmacaoRecebimento.classList.remove("ativo");
  dialogoConfirmacaoRecebimento.classList.remove("ativo");

  overlayConfirmacaoRecebimento.setAttribute("aria-hidden", "true");

  dialogoConfirmacaoRecebimento.setAttribute("aria-hidden", "true");
}

function fecharDetalhesSolicitacao() {
  overlayDetalhes.classList.remove("ativo");
  drawerDetalhes.classList.remove("ativo");
  document.body.classList.remove("drawer-aberto");

  overlayDetalhes.setAttribute("aria-hidden", "true");
  drawerDetalhes.setAttribute("aria-hidden", "true");

  solicitacaoSelecionada = null;
  btnCancelarSolicitacao.dataset.id = "";
  btnConfirmarRecebimento.dataset.id = "";
}

listaSolicitacoes.addEventListener("click", (event) => {
  const botao = event.target.closest(".btn-ver-detalhes");

  if (!botao) {
    return;
  }

  abrirDetalhesSolicitacao(botao.dataset.id);
});

async function confirmarRecebimentoSolicitacao() {
  if (!solicitacaoSelecionada?.id) {
    throw new Error("Solicitação não localizada.");
  }

  if (!dadosGestorAtual?.uid || !dadosGestorAtual?.escolaId) {
    throw new Error("Gestor não identificado.");
  }

  const solicitacaoId = solicitacaoSelecionada.id;

  const solicitacaoRef = ref(
    rtdb,
    `portalGestor/solicitacoes/registros/${solicitacaoId}`,
  );

  const novoHistoricoRef = push(
    ref(rtdb, `portalGestor/solicitacoes/registros/${solicitacaoId}/historico`),
  );

  const historicoId = novoHistoricoRef.key;

  if (!historicoId) {
    throw new Error("Não foi possível registrar a confirmação.");
  }

  const agora = Date.now();
  let motivoFalha = "";

  const resultado = await runTransaction(
    solicitacaoRef,

    (solicitacaoAtual) => {
      if (!solicitacaoAtual) {
        motivoFalha = "SOLICITACAO_NAO_ENCONTRADA";
        return;
      }

      if (
        String(solicitacaoAtual.escolaId) !== String(dadosGestorAtual.escolaId)
      ) {
        motivoFalha = "ESCOLA_NAO_AUTORIZADA";
        return;
      }

      if (solicitacaoAtual.status !== "AGUARDANDO_CONFIRMACAO") {
        motivoFalha = "STATUS_NAO_PERMITIDO";
        return;
      }

      const confirmacaoAtual = solicitacaoAtual.confirmacaoEntrega;

      if (confirmacaoAtual?.pendente !== true) {
        motivoFalha = "CONFIRMACAO_NAO_PENDENTE";
        return;
      }

      const tipoAtendimento = confirmacaoAtual.tipoAtendimento;

      if (!["TOTAL", "PARCIAL"].includes(tipoAtendimento)) {
        motivoFalha = "TIPO_ATENDIMENTO_INVALIDO";
        return;
      }

      const novoStatus =
        tipoAtendimento === "PARCIAL" ? "ATENDIDA_PARCIALMENTE" : "CONCLUIDA";

      solicitacaoAtual.status = novoStatus;
      solicitacaoAtual.atualizadoEm = agora;

      solicitacaoAtual.confirmacaoEntrega.pendente = false;
      solicitacaoAtual.confirmacaoEntrega.confirmadoEm = agora;

      solicitacaoAtual.confirmacaoEntrega.confirmadoPorUid =
        dadosGestorAtual.uid;

      solicitacaoAtual.confirmacaoEntrega.confirmadoPorNome =
        dadosGestorAtual.nome;

      if (!solicitacaoAtual.historico) {
        solicitacaoAtual.historico = {};
      }

      solicitacaoAtual.historico[historicoId] = {
        status: novoStatus,
        statusAnterior: "AGUARDANDO_CONFIRMACAO",
        acao: "SERVICO_CONFIRMADO",

        descricao:
          tipoAtendimento === "PARCIAL"
            ? "Atendimento parcial confirmado pela unidade escolar."
            : "Conclusão do serviço confirmada pela unidade escolar.",

        tipoAtendimento,
        responsavelUid: dadosGestorAtual.uid,
        responsavelNome: dadosGestorAtual.nome,
        criadoEm: agora,
      };

      return solicitacaoAtual;
    },
  );

  if (!resultado.committed) {
    const mensagens = {
      SOLICITACAO_NAO_ENCONTRADA: "A solicitação não foi encontrada.",

      ESCOLA_NAO_AUTORIZADA:
        "Você não possui autorização para confirmar esta solicitação.",

      STATUS_NAO_PERMITIDO:
        "A situação da solicitação foi alterada e não permite mais confirmação.",

      CONFIRMACAO_NAO_PENDENTE: "A conclusão deste chamado já foi confirmada.",

      TIPO_ATENDIMENTO_INVALIDO:
        "O resultado do atendimento não foi identificado.",
    };

    throw new Error(
      mensagens[motivoFalha] ||
        "Não foi possível confirmar a conclusão do serviço.",
    );
  }
}

btnConfirmarEntregaRecebida.addEventListener("click", async () => {
  btnConfirmarEntregaRecebida.disabled = true;

  btnConfirmarEntregaRecebida.innerHTML = `
      <span class="material-symbols-outlined">
        progress_activity
      </span>

      Confirmando...
    `;

  try {
    await confirmarRecebimentoSolicitacao();

    fecharDialogoConfirmacaoRecebimento();
    fecharDetalhesSolicitacao();

    mostrarNotificacao(
      "Conclusão do serviço confirmada com sucesso.",
      "sucesso",
    );
  } catch (error) {
    console.error("Erro ao confirmar recebimento:", error);

    mostrarNotificacao(
      error.message || "Não foi possível confirmar a conclusão do serviço.",
    );
  } finally {
    btnConfirmarEntregaRecebida.disabled = false;

    btnConfirmarEntregaRecebida.innerHTML = `
        <span class="material-symbols-outlined">
          check_circle
        </span>

        Confirmar conclusão
      `;
  }
});

btnFecharDetalhes.addEventListener("click", fecharDetalhesSolicitacao);

btnFecharDetalhesRodape.addEventListener("click", fecharDetalhesSolicitacao);

btnConfirmarRecebimento.addEventListener(
  "click",
  abrirDialogoConfirmacaoRecebimento,
);

btnVoltarConfirmacaoRecebimento.addEventListener(
  "click",
  fecharDialogoConfirmacaoRecebimento,
);

overlayConfirmacaoRecebimento.addEventListener(
  "click",
  fecharDialogoConfirmacaoRecebimento,
);

overlayDetalhes.addEventListener("click", fecharDetalhesSolicitacao);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (dialogoConfirmacaoRecebimento.classList.contains("ativo")) {
    fecharDialogoConfirmacaoRecebimento();
    return;
  }

  if (dialogoCancelamento.classList.contains("ativo")) {
    fecharDialogoCancelamento();
    return;
  }

  if (drawerDetalhes.classList.contains("ativo")) {
    fecharDetalhesSolicitacao();
  }
});

function atualizarBloqueioNovaSolicitacao() {
  confirmacaoPendenteAtual = solicitacoesEscola.find(
    (solicitacao) =>
      solicitacao.modulo === "MANUTENCAO" &&
      solicitacao.status === "AGUARDANDO_CONFIRMACAO" &&
      solicitacao.confirmacaoEntrega?.pendente === true,
  );

  const possuiPendencia = Boolean(confirmacaoPendenteAtual);

  avisoConfirmacaoPendente.style.display = possuiPendencia ? "flex" : "none";

  btnEnviarSolicitacao.disabled = possuiPendencia;

  if (!possuiPendencia) {
    textoConfirmacaoPendente.textContent = "";
    return;
  }

  const protocolo =
    confirmacaoPendenteAtual.protocolo || "sem protocolo identificado";

  textoConfirmacaoPendente.textContent =
    `Confirme a conclusão do chamado ${protocolo} ` +
    "antes de abrir um novo chamado.";
}

function renderizarSolicitacoes() {
  const termo = normalizarTexto(buscaSolicitacoes.value);
  const statusSelecionado = filtroStatus.value;

  const filtradas = solicitacoesEscola.filter((solicitacao) => {
    const textoPesquisa = normalizarTexto(
      [
        solicitacao.protocolo,
        solicitacao.categoria,
        obterNomeCategoriaManutencao(solicitacao.categoria),
        solicitacao.ambiente,
        obterNomeAmbienteManutencao(solicitacao.ambiente),
        solicitacao.localEspecifico,
        solicitacao.descricaoProblema,
        solicitacao.status,
        obterDadosStatus(solicitacao.status).nome,
      ].join(" "),
    );

    const correspondeBusca = textoPesquisa.includes(termo);

    const correspondeStatus =
      !statusSelecionado || solicitacao.status === statusSelecionado;

    return correspondeBusca && correspondeStatus;
  });

  if (!filtradas.length) {
    listaSolicitacoes.innerHTML = `
      <div class="estado-vazio">
        <span class="material-symbols-outlined">inbox</span>

        <strong>Nenhuma solicitação encontrada</strong>

        <p>
          ${
            solicitacoesEscola.length
              ? "Nenhum pedido corresponde aos filtros informados."
              : "Os pedidos enviados pela escola aparecerão aqui."
          }
        </p>
      </div>
    `;

    return;
  }

  listaSolicitacoes.innerHTML = filtradas
    .map((solicitacao) => {
      const status = obterDadosStatus(solicitacao.status);

      return `
        <article class="card-solicitacao">
          <div class="card-solicitacao-icone">
            <span class="material-symbols-outlined">
              ${obterIconeManutencao()}
            </span>
          </div>

          <div class="card-solicitacao-conteudo">
            <div class="card-solicitacao-topo">
              <div>
                <span class="protocolo-solicitacao">
                  ${escaparHtml(solicitacao.protocolo)}
                </span>

                <h3>
                  ${escaparHtml(
                    obterNomeCategoriaManutencao(solicitacao.categoria),
                  )}
                </h3>
              </div>

              <span class="status-solicitacao ${status.classe}">
                ${escaparHtml(status.nome)}
              </span>
            </div>

            <div class="dados-solicitacao">
              <div>
                <small>Ambiente afetado</small>

                <strong>
                  ${escaparHtml(obterNomeAmbienteManutencao(solicitacao.ambiente))}
                </strong>
              </div>

              <div>
                <small>Problema identificado em</small>

                <strong>
                  ${formatarData(solicitacao.dataIdentificacao)}
                </strong>
              </div>

              <div>
                <small>Prioridade</small>

                <strong>
                  ${solicitacao.prioridade === "URGENTE" ? "Urgente" : "Normal"}
                </strong>
              </div>

              <div>
                <small>Enviado em</small>

                <strong>
                  ${formatarDataHora(solicitacao.criadoEm)}
                </strong>
              </div>
            </div>

            <div class="justificativa-card">
              <small>Descrição do problema</small>

              <p>
                ${escaparHtml(solicitacao.descricaoProblema)}
              </p>
            </div>

            <div class="acoes-card-solicitacao">
              <button
                type="button"
                class="btn-ver-detalhes"
                data-id="${escaparHtml(solicitacao.id)}"
              >
                Ver detalhes

                <span class="material-symbols-outlined">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function carregarSolicitacoesEscola() {
  if (!dadosGestorAtual?.escolaId) {
    return;
  }

  if (cancelarEscutaSolicitacoes) {
    cancelarEscutaSolicitacoes();
  }

  listaSolicitacoes.innerHTML = `
    <div class="estado-vazio">
      <span class="material-symbols-outlined">
        progress_activity
      </span>

      <strong>Carregando solicitações...</strong>
    </div>
  `;

  const registrosRef = ref(rtdb, "portalGestor/solicitacoes/registros");

  const consultaEscola = query(
    registrosRef,
    orderByChild("escolaId"),
    equalTo(dadosGestorAtual.escolaId),
  );

  cancelarEscutaSolicitacoes = onValue(
    consultaEscola,

    (snapshot) => {
      solicitacoesEscola = [];

      if (snapshot.exists()) {
        solicitacoesEscola = Object.entries(snapshot.val())
          .map(([id, dados]) => ({
            id,
            ...dados,
          }))
          .filter((solicitacao) => {
            return solicitacao.modulo === "MANUTENCAO";
          });
      }

      solicitacoesEscola.sort(
        (a, b) => Number(b.criadoEm || 0) - Number(a.criadoEm || 0),
      );

      atualizarBloqueioNovaSolicitacao();
      renderizarSolicitacoes();
    },

    (error) => {
      console.error("Erro ao carregar solicitações:", error);

      listaSolicitacoes.innerHTML = `
        <div class="estado-vazio">
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

buscaSolicitacoes.addEventListener("input", renderizarSolicitacoes);

filtroStatus.addEventListener("change", renderizarSolicitacoes);

async function gerarProtocoloManutencao() {
  const ano = new Date().getFullYear();

  const contadorRef = ref(
    rtdb,
    `portalGestor/solicitacoes/contadores/manutencao/${ano}`,
  );

  const resultado = await runTransaction(
    contadorRef,
    (numeroAtual) => Number(numeroAtual || 0) + 1,
  );

  if (!resultado.committed) {
    throw new Error("Não foi possível gerar o protocolo.");
  }

  const numero = Number(resultado.snapshot.val());

  return `MAN-${ano}-${String(numero).padStart(4, "0")}`;
}

function alterarEstadoEnvio(enviando) {
  btnEnviarSolicitacao.disabled = enviando || Boolean(confirmacaoPendenteAtual);

  if (enviando) {
    btnEnviarSolicitacao.innerHTML = `
      <span class="material-symbols-outlined">
        progress_activity
      </span>

      Enviando...
    `;

    return;
  }

  btnEnviarSolicitacao.innerHTML = `
    <span class="material-symbols-outlined">send</span>
    Enviar solicitação
  `;
}

async function salvarSolicitacao() {
  if (!dadosGestorAtual) {
    throw new Error("Gestor não identificado.");
  }

  const confirmacaoPendente = solicitacoesEscola.find(
    (solicitacao) =>
      solicitacao.modulo === "MANUTENCAO" &&
      solicitacao.status === "AGUARDANDO_CONFIRMACAO" &&
      solicitacao.confirmacaoEntrega?.pendente === true,
  );

  if (confirmacaoPendente) {
    throw new Error(
      `Confirme a conclusão do chamado ${
        confirmacaoPendente.protocolo || ""
      } antes de abrir um novo chamado.`,
    );
  }

  const categoria = categoriaManutencao.value;
  const ambiente = ambienteManutencao.value;

  const localEspecifico = localEspecificoManutencao.value.trim();

  const descricao = descricaoProblema.value.trim();
  const impacto = impactoManutencao.value;
  const prioridade = prioridadeSolicitacao.value;

  const dataIdentificacao = dataIdentificacaoProblema.value;

  const observacoes = observacoesSolicitacao.value.trim();

  if (!categoria) {
    throw new Error("Selecione a categoria do problema.");
  }

  if (!ambiente) {
    throw new Error("Selecione o ambiente afetado.");
  }

  if (descricao.length < 10) {
    throw new Error("Descreva o problema com pelo menos 10 caracteres.");
  }

  if (!impacto) {
    throw new Error("Informe o impacto do problema nas atividades.");
  }

  if (!dataIdentificacao) {
    throw new Error("Informe a data em que o problema foi identificado.");
  }

  if (dataIdentificacao > obterDataLocalISO()) {
    throw new Error("A data de identificação não pode estar no futuro.");
  }

  const categoriaNome = obterNomeCategoriaManutencao(categoria);

  const ambienteNome = obterNomeAmbienteManutencao(ambiente);

  const impactoNome = obterNomeImpactoManutencao(impacto);

  const protocolo = await gerarProtocoloManutencao();

  const novaSolicitacaoRef = push(
    ref(rtdb, "portalGestor/solicitacoes/registros"),
  );

  const solicitacaoId = novaSolicitacaoRef.key;

  if (!solicitacaoId) {
    throw new Error("Não foi possível criar o chamado.");
  }

  const novoHistoricoRef = push(
    ref(rtdb, `portalGestor/solicitacoes/registros/${solicitacaoId}/historico`),
  );

  const historicoId = novoHistoricoRef.key;

  if (!historicoId) {
    throw new Error("Não foi possível criar o histórico do chamado.");
  }

  const solicitacao = {
    modulo: "MANUTENCAO",
    protocolo,

    tipo: categoria,
    tipoNome: categoriaNome,

    categoria,
    categoriaNome,

    ambiente,
    ambienteNome,
    localEspecifico,

    descricaoProblema: descricao,

    impacto,
    impactoNome,

    prioridade,
    dataIdentificacao,
    observacoes,

    status: "RECEBIDA",

    escolaId: dadosGestorAtual.escolaId,
    escolaNome: dadosGestorAtual.escolaNome,

    solicitanteUid: dadosGestorAtual.uid,
    solicitanteNome: dadosGestorAtual.nome,
    solicitanteEmail: dadosGestorAtual.email,

    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),

    historico: {
      [historicoId]: {
        status: "RECEBIDA",
        acao: "CHAMADO_CRIADO",

        descricao:
          `Chamado de manutenção aberto para ${categoriaNome}, ` +
          `no ambiente: ${ambienteNome}.`,

        responsavelUid: dadosGestorAtual.uid,
        responsavelNome: dadosGestorAtual.nome,
        criadoEm: serverTimestamp(),
      },
    },
  };

  const atualizacoes = {};

  atualizacoes[`portalGestor/solicitacoes/registros/${solicitacaoId}`] =
    solicitacao;

  await update(ref(rtdb), atualizacoes);

  return {
    id: solicitacaoId,
    protocolo,
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) {
    return;
  }

  alterarEstadoEnvio(true);

  try {
    const resultado = await salvarSolicitacao();

    mostrarNotificacao(
      `Chamado ${resultado.protocolo} aberto com sucesso.`,
      "sucesso",
    );

    form.reset();

    setTimeout(() => {
      ativarAba("historicoSolicitacoes");
    }, 600);
  } catch (error) {
    console.error("Erro ao salvar solicitação:", error);

    mostrarNotificacao(
      error.message || "Não foi possível enviar a solicitação.",
    );
  } finally {
    alterarEstadoEnvio(false);
  }
});

btnVerConfirmacaoPendente.addEventListener("click", () => {
  if (!confirmacaoPendenteAtual?.id) {
    mostrarNotificacao("Não foi possível localizar a solicitação pendente.");

    return;
  }

  ativarAba("historicoSolicitacoes");

  setTimeout(() => {
    abrirDetalhesSolicitacao(confirmacaoPendenteAtual.id);
  }, 150);
});

btnSair.addEventListener("click", async () => {
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

onAuthStateChanged(auth, async (user) => {
  if (verificacaoConcluida) {
    return;
  }

  verificacaoConcluida = true;

  if (!user) {
    window.location.replace("./login.html");
    return;
  }

  try {
    const dadosUsuario = await buscarDadosUsuario(user.uid);
    const motivoBloqueio = validarGestor(dadosUsuario);

    if (motivoBloqueio) {
      await encerrarAcesso(motivoBloqueio);
      return;
    }

    preencherDadosGestor(user, dadosUsuario);
    configurarDataIdentificacao();
    atualizarContadores();
    carregarSolicitacoesEscola();

    if (window.location.hash === "#historico") {
      ativarAba("historicoSolicitacoes");
    }

    document.body.classList.remove("verificando-acesso");
  } catch (error) {
    console.error("Erro ao validar gestor:", error);
    await encerrarAcesso("ERRO_VALIDACAO");
  }
});
