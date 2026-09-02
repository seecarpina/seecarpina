import { auth, db, rtdb } from "./firebaseConfig.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  ref,
  get,
  onValue,
  push,
  runTransaction,
  query,
  orderByChild,
  equalTo,
  update,
  increment,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const { jsPDF } = window.jspdf;

/* =========================================
   ELEMENTOS
========================================= */

const abasSolicitacoes = document.querySelectorAll(
  ".solicitacoes-tabs .tab-btn",
);

const abaSolicitacoesInsumos = document.getElementById(
  "abaSolicitacoesInsumos",
);

const abaSolicitacoesMateriais = document.getElementById(
  "abaSolicitacoesMateriais",
);

const abaSolicitacoesLimpeza = document.getElementById(
  "abaSolicitacoesLimpeza",
);

const abaSolicitacoesManutencao = document.getElementById(
  "abaSolicitacoesManutencao",
);

const tituloListagemSolicitacoes = document.getElementById(
  "tituloListagemSolicitacoes",
);

const contadorSolicitacoes = document.getElementById("contadorSolicitacoes");

const buscaSolicitacoes = document.getElementById("buscaSolicitacoes");

const filtroStatusSolicitacao = document.getElementById(
  "filtroStatusSolicitacao",
);

const filtroPrioridadeSolicitacao = document.getElementById(
  "filtroPrioridadeSolicitacao",
);

const listaCentralSolicitacoes = document.getElementById(
  "listaCentralSolicitacoes",
);

const totalRecebidas = document.getElementById("totalRecebidas");
const totalAtendidasParcialmente = document.getElementById(
  "totalAtendidasParcialmente",
);
const totalEmAtendimento = document.getElementById("totalEmAtendimento");
const totalConcluidas = document.getElementById("totalConcluidas");

const overlaySolicitacao = document.getElementById("overlaySolicitacao");

const drawerSolicitacao = document.getElementById("drawerSolicitacao");

const btnFecharSolicitacao = document.getElementById("btnFecharSolicitacao");

const btnFecharSolicitacaoRodape = document.getElementById(
  "btnFecharSolicitacaoRodape",
);

const btnAtualizarSolicitacao = document.getElementById(
  "btnAtualizarSolicitacao",
);

const iconeSolicitacaoDrawer = document.getElementById(
  "iconeSolicitacaoDrawer",
);

const protocoloSolicitacaoDrawer = document.getElementById(
  "protocoloSolicitacaoDrawer",
);

const tituloSolicitacaoDrawer = document.getElementById(
  "tituloSolicitacaoDrawer",
);

const conteudoSolicitacaoDrawer = document.getElementById(
  "conteudoSolicitacaoDrawer",
);

const overlayAtualizacao = document.getElementById("overlayAtualizacao");

const dialogoAtualizacao = document.getElementById("dialogoAtualizacao");

const protocoloAtualizacao = document.getElementById("protocoloAtualizacao");

const novoStatusSolicitacao = document.getElementById("novoStatusSolicitacao");

const blocoTipoAtendimento = document.getElementById("blocoTipoAtendimento");

const tipoAtendimentoEntrega = document.getElementById(
  "tipoAtendimentoEntrega",
);

const blocoQuantidadesMateriais = document.getElementById(
  "blocoQuantidadesMateriais",
);

const listaQuantidadesMateriais = document.getElementById(
  "listaQuantidadesMateriais",
);

const resumoQuantidadesMateriais = document.getElementById(
  "resumoQuantidadesMateriais",
);

const observacaoAtualizacao = document.getElementById("observacaoAtualizacao");

const contadorObservacaoAtualizacao = document.getElementById(
  "contadorObservacaoAtualizacao",
);

const avisoObservacaoObrigatoria = document.getElementById(
  "avisoObservacaoObrigatoria",
);

const btnCancelarAtualizacao = document.getElementById(
  "btnCancelarAtualizacao",
);

const btnConfirmarAtualizacao = document.getElementById(
  "btnConfirmarAtualizacao",
);

/* =========================================
   ESTADO
========================================= */

let dadosUsuarioAtual = null;
let perfilUsuarioAtual = "";
let permissaoSolicitacoesAtual = null;
let moduloSelecionado = "TODOS";
let solicitacoes = [];
let solicitacaoSelecionada = null;
let solicitacoesPorModulo = {};

/* =========================================
   UTILITÁRIOS
========================================= */

function notificar(mensagem, tipo = "sucesso") {
  if (typeof window.mostrarNotificacao === "function") {
    window.mostrarNotificacao(mensagem, tipo);
    return;
  }

  console.log(mensagem);
}

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

  return iconesPorModulo[solicitacao.modulo] || "support_agent";
}

function obterNomeModulo(modulo) {
  const nomes = {
    INSUMOS: "Água, gás e caminhão-pipa",
    MATERIAIS_EXPEDIENTE: "Material de expediente",
    MATERIAIS_LIMPEZA: "Materiais de limpeza e higiene",
    MANUTENCAO: "Chamados de manutenção",
  };

  return nomes[modulo] || modulo || "Solicitação";
}

function obterTituloSolicitacao(solicitacao) {
  return (
    solicitacao.tipoNome ||
    solicitacao.categoriaNome ||
    obterNomeModulo(solicitacao.modulo)
  );
}

/* =========================================
   PERMISSÕES
========================================= */

function obterChavePermissaoModulo(modulo) {
  const chaves = {
    INSUMOS: "insumos",
    MATERIAIS_EXPEDIENTE: "materiaisExpediente",
    MATERIAIS_LIMPEZA: "materiaisLimpeza",
    MANUTENCAO: "manutencao",
  };

  return chaves[modulo] || "";
}

function moduloPermitido(modulo) {
  if (!permissaoSolicitacoesAtual) {
    return false;
  }

  if (permissaoSolicitacoesAtual.todas === true) {
    return true;
  }

  const chave = obterChavePermissaoModulo(modulo);

  return chave && permissaoSolicitacoesAtual.modulos?.[chave] === true;
}

function configurarAbasPermitidas() {
  abaSolicitacoesInsumos.style.display = moduloPermitido("INSUMOS")
    ? ""
    : "none";

  abaSolicitacoesMateriais.style.display = moduloPermitido(
    "MATERIAIS_EXPEDIENTE",
  )
    ? ""
    : "none";

  abaSolicitacoesLimpeza.style.display = moduloPermitido("MATERIAIS_LIMPEZA")
    ? ""
    : "none";

  abaSolicitacoesManutencao.style.display = moduloPermitido("MANUTENCAO")
    ? ""
    : "none";
}

async function carregarPermissaoPerfil() {
  const permissoesRef = ref(
    rtdb,
    `configuracoes/solicitacoes/permissoes/${perfilUsuarioAtual}`,
  );

  const snapshot = await get(permissoesRef);

  permissaoSolicitacoesAtual = snapshot.exists() ? snapshot.val() : null;

  const possuiAlgumAcesso =
    permissaoSolicitacoesAtual?.todas === true ||
    Object.values(permissaoSolicitacoesAtual?.modulos || {}).some(
      (permitido) => permitido === true,
    );

  if (!possuiAlgumAcesso) {
    throw new Error("ACESSO_NAO_AUTORIZADO");
  }

  configurarAbasPermitidas();
}

/* =========================================
   INDICADORES
========================================= */

function atualizarIndicadores() {
  const permitidas = solicitacoes.filter((solicitacao) =>
    moduloPermitido(solicitacao.modulo),
  );

  totalRecebidas.textContent = permitidas.filter(
    (solicitacao) => solicitacao.status === "RECEBIDA",
  ).length;

  totalAtendidasParcialmente.textContent = permitidas.filter(
    (solicitacao) => solicitacao.status === "ATENDIDA_PARCIALMENTE",
  ).length;

  totalEmAtendimento.textContent = permitidas.filter(
    (solicitacao) => solicitacao.status === "EM_ATENDIMENTO",
  ).length;

  totalConcluidas.textContent = permitidas.filter(
    (solicitacao) => solicitacao.status === "CONCLUIDA",
  ).length;
}

/* =========================================
   FILTRO E RENDERIZAÇÃO
========================================= */

function obterSolicitacoesFiltradas() {
  const termo = normalizarTexto(buscaSolicitacoes.value);
  const status = filtroStatusSolicitacao.value;
  const prioridade = filtroPrioridadeSolicitacao.value;

  return solicitacoes.filter((solicitacao) => {
    if (!moduloPermitido(solicitacao.modulo)) {
      return false;
    }

    if (
      moduloSelecionado !== "TODOS" &&
      solicitacao.modulo !== moduloSelecionado
    ) {
      return false;
    }

    if (status && solicitacao.status !== status) {
      return false;
    }

    if (prioridade && solicitacao.prioridade !== prioridade) {
      return false;
    }

    const textoPesquisa = normalizarTexto(
      [
        solicitacao.protocolo,
        solicitacao.escolaNome,
        solicitacao.solicitanteNome,
        solicitacao.tipoNome,
        solicitacao.categoriaNome,
        solicitacao.justificativa,
        obterNomeModulo(solicitacao.modulo),
        obterDadosStatus(solicitacao.status).nome,
      ].join(" "),
    );

    return textoPesquisa.includes(termo);
  });
}

function atualizarTituloListagem() {
  const titulos = {
    TODOS: "Todas as solicitações",
    INSUMOS: "Água, gás e caminhão-pipa",
    MATERIAIS_EXPEDIENTE: "Material de expediente",
    MATERIAIS_LIMPEZA: "Materiais de limpeza e higiene",
    MANUTENCAO: "Chamados de manutenção",
  };

  tituloListagemSolicitacoes.textContent =
    titulos[moduloSelecionado] || "Solicitações";
}

function renderizarSolicitacoes() {
  const filtradas = obterSolicitacoesFiltradas();

  atualizarTituloListagem();

  contadorSolicitacoes.textContent =
    `${filtradas.length} solicitação` +
    `${filtradas.length === 1 ? "" : "ões"} encontrada` +
    `${filtradas.length === 1 ? "" : "s"}`;

  if (!filtradas.length) {
    listaCentralSolicitacoes.innerHTML = `
      <div class="estado-central-solicitacoes">
        <span class="material-symbols-outlined">
          inbox
        </span>

        <strong>Nenhuma solicitação encontrada</strong>

        <p>
          Não há registros correspondentes aos filtros informados.
        </p>
      </div>
    `;

    return;
  }

  listaCentralSolicitacoes.innerHTML = filtradas
    .map((solicitacao) => {
      const status = obterDadosStatus(solicitacao.status);
      const prioridadeUrgente = solicitacao.prioridade === "URGENTE";
      const ehManutencao = solicitacao.modulo === "MANUTENCAO";

      const rotuloDataCard = ehManutencao
        ? "Problema identificado em"
        : "Necessário em";

      const dataCard = ehManutencao
        ? solicitacao.dataIdentificacao
        : solicitacao.dataNecessidade;

      const descricaoCard = ehManutencao
        ? solicitacao.descricaoProblema
        : solicitacao.justificativa;

      return `
        <article class="card-central-solicitacao">
          <div class="icone-card-central">
            <span class="material-symbols-outlined">
              ${obterIconeSolicitacao(solicitacao)}
            </span>
          </div>

          <div class="conteudo-card-central">
            <div class="topo-card-central">
              <div>
                <span class="modulo-card-central">
                  ${escaparHtml(obterNomeModulo(solicitacao.modulo))}
                </span>

                <span class="protocolo-card-central">
                  ${escaparHtml(solicitacao.protocolo)}
                </span>

                <h3>
                  ${escaparHtml(obterTituloSolicitacao(solicitacao))}
                </h3>
              </div>

              <div class="badges-card-central">
                ${
                  prioridadeUrgente
                    ? `
                      <span class="prioridade-central urgente">
                        Urgente
                      </span>
                    `
                    : ""
                }

                <span
                  class="status-central ${status.classe}"
                >
                  ${escaparHtml(status.nome)}
                </span>
              </div>
            </div>

            <div class="dados-card-central">
              <div>
                <small>Unidade escolar</small>

                <strong>
                  ${escaparHtml(solicitacao.escolaNome || "-")}
                </strong>
              </div>

              <div>
                <small>Solicitante</small>

                <strong>
                  ${escaparHtml(solicitacao.solicitanteNome || "-")}
                </strong>
              </div>

              <div>
                <small>Enviada em</small>

                <strong>
                  ${formatarDataHora(solicitacao.criadoEm)}
                </strong>
              </div>

              <div>
                <small>${rotuloDataCard}</small>
                <strong>
                  ${formatarData(dataCard)}
                </strong>
              </div>
            </div>

            <div class="rodape-card-central">
              <p>
                ${escaparHtml(descricaoCard || "")}
              </p>

              <button
                type="button"
                class="btn-analisar-solicitacao"
                data-id="${escaparHtml(solicitacao.id)}"
              >
                Analisar solicitação

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

/* =========================================
   DETALHES DA SOLICITAÇÃO
========================================= */

function renderizarHistoricoSolicitacao(solicitacao) {
  const historico = Object.entries(solicitacao.historico || {})
    .map(([id, dados]) => ({
      id,
      ...dados,
    }))
    .sort((a, b) => Number(a.criadoEm || 0) - Number(b.criadoEm || 0));

  if (!historico.length) {
    return `
      <div class="historico-central-vazio">
        Nenhuma movimentação registrada.
      </div>
    `;
  }

  return historico
    .map((item) => {
      const status = obterDadosStatus(item.status);

      return `
        <div class="item-historico-central">
          <div class="marcador-historico-central"></div>

          <div>
            <strong>
              ${escaparHtml(status.nome)}
            </strong>

            <p>
              ${escaparHtml(
                item.descricao || `Situação alterada para ${status.nome}.`,
              )}
            </p>

            <span>
              ${escaparHtml(item.responsavelNome || "Não informado")}

              • ${formatarDataHora(item.criadoEm)}
            </span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderizarDadosEspecificos(solicitacao) {
  if (solicitacao.modulo === "INSUMOS") {
    return `
      <section class="secao-detalhe-central">
        <h3>Dados do pedido</h3>

        <div class="grade-detalhe-central">
          <div>
            <small>Item solicitado</small>

            <strong>
              ${escaparHtml(solicitacao.tipoNome || "-")}
            </strong>
          </div>

          <div>
            <small>Quantidade</small>

            <strong>
              ${escaparHtml(solicitacao.quantidade || 0)}
              ${escaparHtml(solicitacao.unidade || "")}
            </strong>
          </div>

          <div>
            <small>Data de necessidade</small>

            <strong>
              ${formatarData(solicitacao.dataNecessidade)}
            </strong>
          </div>

          <div>
            <small>Prioridade</small>

            <strong>
              ${solicitacao.prioridade === "URGENTE" ? "Urgente" : "Normal"}
            </strong>
          </div>
        </div>
      </section>
    `;
  }

  if (
    solicitacao.modulo === "MATERIAIS_EXPEDIENTE" ||
    solicitacao.modulo === "MATERIAIS_LIMPEZA"
  ) {
    const itens = Array.isArray(solicitacao.itens)
      ? solicitacao.itens.filter(Boolean)
      : Object.values(solicitacao.itens || {});

    const listaItens = itens.length
      ? itens
          .map(
            (item, indice) => `
            <div>
              <small>Material ${indice + 1}</small>

              <strong>
                ${escaparHtml(item.nome || "Material não informado")}
              </strong>

              <span>
                ${escaparHtml(item.quantidadeSolicitada || 0)}
                ${escaparHtml(item.unidade || "unidade")}
              </span>
            </div>
          `,
          )
          .join("")
      : `
        <p class="texto-detalhe-central">
          Nenhum material foi encontrado nesta solicitação.
        </p>
      `;

    return `
    <section class="secao-detalhe-central">
      <h3>
        ${
          solicitacao.modulo === "MATERIAIS_LIMPEZA"
            ? "Materiais de limpeza e higiene solicitados"
            : "Materiais de expediente solicitados"
        }
      </h3>

      <div class="grade-detalhe-central">
        ${listaItens}
      </div>

      <div class="grade-detalhe-central">
        <div>
          <small>Total de materiais diferentes</small>

          <strong>
            ${itens.length}
          </strong>
        </div>

        <div>
          <small>Quantidade total solicitada</small>

          <strong>
            ${escaparHtml(
              solicitacao.quantidadeTotal ??
                itens.reduce(
                  (total, item) =>
                    total + Number(item.quantidadeSolicitada || 0),
                  0,
                ),
            )}
          </strong>
        </div>
      </div>
    </section>
  `;
  }

  if (solicitacao.modulo === "MANUTENCAO") {
    return `
    <section class="secao-detalhe-central">
      <h3>Dados do chamado de manutenção</h3>

      <div class="grade-detalhe-central">
        <div>
          <small>Categoria</small>

          <strong>
            ${escaparHtml(
              solicitacao.categoriaNome ||
                solicitacao.tipoNome ||
                "Não informada",
            )}
          </strong>
        </div>

        <div>
          <small>Ambiente</small>

          <strong>
            ${escaparHtml(solicitacao.ambienteNome || "Não informado")}
          </strong>
        </div>

        <div>
          <small>Local específico</small>

          <strong>
            ${escaparHtml(solicitacao.localEspecifico || "Não informado")}
          </strong>
        </div>

        <div>
          <small>Data de identificação</small>

          <strong>
            ${formatarData(solicitacao.dataIdentificacao)}
          </strong>
        </div>

        <div>
          <small>Impacto nas atividades</small>

          <strong>
            ${escaparHtml(solicitacao.impactoNome || "Não informado")}
          </strong>
        </div>

        <div>
          <small>Prioridade</small>

          <strong>
            ${solicitacao.prioridade === "URGENTE" ? "Urgente" : "Normal"}
          </strong>
        </div>
      </div>

      <div class="bloco-texto-detalhe-central">
        <small>Descrição do problema</small>

        <p>
          ${escaparHtml(
            solicitacao.descricaoProblema || "Descrição não informada.",
          )}
        </p>
      </div>

      ${
        solicitacao.observacoes
          ? `
            <div class="bloco-texto-detalhe-central">
              <small>Observações</small>

              <p>
                ${escaparHtml(solicitacao.observacoes)}
              </p>
            </div>
          `
          : ""
      }
    </section>
  `;
  }

  return "";
}

function renderizarInformacoesEntrega(solicitacao) {
  const entrega = solicitacao.confirmacaoEntrega;

  if (!entrega?.tipoAtendimento) {
    return "";
  }

  const entregaParcial = entrega.tipoAtendimento === "PARCIAL";

  const ehManutencao = solicitacao.modulo === "MANUTENCAO";

  const tituloAtendimento = ehManutencao
    ? "Informações do atendimento"
    : "Informações da entrega";

  const resultadoAtendimento = ehManutencao
    ? entregaParcial
      ? "Atendimento parcial"
      : "Serviço concluído"
    : entregaParcial
      ? "Entrega parcial"
      : "Entrega completa";

  const itensEntregues = Array.isArray(entrega.itensEntregues)
    ? entrega.itensEntregues.filter(Boolean)
    : Object.values(entrega.itensEntregues || {});

  const comparativoMateriais = itensEntregues.length
    ? `
      <div class="comparativo-entrega-materiais">
        <div class="titulo-comparativo-materiais">
          <strong>Materiais entregues</strong>

          <span>
            ${itensEntregues.length}
            ${itensEntregues.length === 1 ? "material" : "materiais"}
          </span>
        </div>

        <div class="lista-comparativo-materiais">
          ${itensEntregues
            .map((item) => {
              const solicitada = Number(item.quantidadeSolicitada || 0);

              const entregue = Number(item.quantidadeEntregue || 0);

              let classeResultado = "nao-entregue";
              let textoResultado = "Não entregue";

              if (entregue >= solicitada && solicitada > 0) {
                classeResultado = "completo";
                textoResultado = "Completo";
              } else if (entregue > 0) {
                classeResultado = "parcial";
                textoResultado = "Parcial";
              }

              return `
                <div class="item-comparativo-material">
                  <div class="nome-comparativo-material">
                    <strong>
                      ${escaparHtml(item.nome || "Material")}
                    </strong>

                    <span>
                      ${escaparHtml(item.unidade || "Unidade")}
                    </span>
                  </div>

                  <div class="quantidades-comparativo-material">
                    <div>
                      <small>Solicitado</small>
                      <strong>${escaparHtml(solicitada)}</strong>
                    </div>

                    <span class="seta-comparativo material-symbols-outlined">
                      arrow_forward
                    </span>

                    <div>
                      <small>Entregue</small>
                      <strong>${escaparHtml(entregue)}</strong>
                    </div>
                  </div>

                  <span class="resultado-comparativo ${classeResultado}">
                    ${textoResultado}
                  </span>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `
    : "";

  let situacaoConfirmacao = "Aguardando confirmação da escola";

  if (entrega.pendente === false && entrega.confirmadoEm) {
    situacaoConfirmacao = `Confirmado por ${
      entrega.confirmadoPorNome || "gestor da unidade"
    } em ${formatarDataHora(entrega.confirmadoEm)}`;
  }

  return `
    <section class="secao-detalhe-central">
      <h3>${tituloAtendimento}</h3>

      <div class="grade-detalhe-central">
        <div>
          <small>Resultado informado</small>

          <strong>
            ${resultadoAtendimento}
          </strong>
        </div>

        <div>
          <small>Informado em</small>

          <strong>
            ${formatarDataHora(entrega.informadoEm)}
          </strong>
        </div>

        <div>
          <small>Responsável pelo atendimento</small>

          <strong>
            ${escaparHtml(entrega.informadoPorNome || "Não informado")}
          </strong>
        </div>

        <div>
          <small>Confirmação da escola</small>

          <strong>
            ${escaparHtml(situacaoConfirmacao)}
          </strong>
        </div>
      </div>

      ${comparativoMateriais}

      ${
        entregaParcial && String(entrega.observacao || "").trim()
          ? `
            <div class="observacao-entrega-central">
              <small>Observação da entrega parcial</small>

              <p>
                ${escaparHtml(entrega.observacao)}
              </p>
            </div>
          `
          : ""
      }
    </section>
  `;
}

const transicoesStatus = {
  RECEBIDA: ["EM_ATENDIMENTO"],

  EM_ATENDIMENTO: ["AGUARDANDO_CONFIRMACAO"],

  AGUARDANDO_CONFIRMACAO: [],
  CONCLUIDA: [],
  ATENDIDA_PARCIALMENTE: [],
  CANCELADA: [],

  // Compatibilidade com solicitações antigas
  EM_ANALISE: ["EM_ATENDIMENTO"],
  APROVADA: ["EM_ATENDIMENTO"],
  INDEFERIDA: [],
};

function obterTransicoesPermitidas(statusAtual) {
  return transicoesStatus[statusAtual] || [];
}

function preencherDrawerSolicitacao(solicitacao) {
  const status = obterDadosStatus(solicitacao.status);
  const possuiObservacoes = Boolean(
    String(solicitacao.observacoes || "").trim(),
  );

  const possuiCancelamento =
    solicitacao.status === "CANCELADA" && solicitacao.motivoCancelamento;

  iconeSolicitacaoDrawer.textContent = obterIconeSolicitacao(solicitacao);

  protocoloSolicitacaoDrawer.textContent =
    solicitacao.protocolo || "Sem protocolo";

  tituloSolicitacaoDrawer.textContent = obterTituloSolicitacao(solicitacao);

  conteudoSolicitacaoDrawer.innerHTML = `
    <div class="detalhe-solicitacao-status">
      <span class="status-central ${status.classe}">
        ${escaparHtml(status.nome)}
      </span>

      ${
        solicitacao.prioridade === "URGENTE"
          ? `
            <span class="prioridade-central urgente">
              Urgente
            </span>
          `
          : ""
      }
    </div>

    ${renderizarDadosEspecificos(solicitacao)}

    ${renderizarInformacoesEntrega(solicitacao)}

    <section class="secao-detalhe-central">
      <h3>Unidade solicitante</h3>

      <div class="grade-detalhe-central">
        <div>
          <small>Unidade escolar</small>

          <strong>
            ${escaparHtml(solicitacao.escolaNome || "-")}
          </strong>
        </div>

        <div>
          <small>Gestor solicitante</small>

          <strong>
            ${escaparHtml(solicitacao.solicitanteNome || "-")}
          </strong>
        </div>

        <div>
          <small>E-mail</small>

          <strong>
            ${escaparHtml(solicitacao.solicitanteEmail || "-")}
          </strong>
        </div>

        <div>
          <small>Enviada em</small>

          <strong>
            ${formatarDataHora(solicitacao.criadoEm)}
          </strong>
        </div>
      </div>
    </section>

    <section class="secao-detalhe-central">
      <h3>Justificativa</h3>

      <p class="texto-detalhe-central">
        ${escaparHtml(
          solicitacao.justificativa || "Nenhuma justificativa informada.",
        )}
      </p>
    </section>

    ${
      possuiObservacoes
        ? `
          <section class="secao-detalhe-central">
            <h3>Observações da escola</h3>

            <p class="texto-detalhe-central">
              ${escaparHtml(solicitacao.observacoes)}
            </p>
          </section>
        `
        : ""
    }

    ${
      possuiCancelamento
        ? `
          <section class="secao-detalhe-central cancelamento">
            <h3>Cancelamento</h3>

            <p class="texto-detalhe-central">
              ${escaparHtml(solicitacao.motivoCancelamento)}
            </p>

            <small>
              Cancelada por
              ${escaparHtml(solicitacao.canceladoPorNome || "não informado")}
              em
              ${formatarDataHora(solicitacao.canceladoEm)}
            </small>
          </section>
        `
        : ""
    }

    <section class="secao-detalhe-central">
      <h3>Histórico</h3>

      <div class="historico-central">
        ${renderizarHistoricoSolicitacao(solicitacao)}
      </div>
    </section>
  `;

  const possuiTransicoes =
    obterTransicoesPermitidas(solicitacao.status).length > 0;

  btnAtualizarSolicitacao.style.display = possuiTransicoes ? "flex" : "none";
}

function abrirDrawerSolicitacao(solicitacaoId) {
  const solicitacao = solicitacoes.find((item) => item.id === solicitacaoId);

  if (!solicitacao) {
    notificar("Solicitação não localizada.", "erro");
    return;
  }

  if (!moduloPermitido(solicitacao.modulo)) {
    notificar("Seu perfil não possui acesso a esta solicitação.", "erro");

    return;
  }

  solicitacaoSelecionada = solicitacao;

  preencherDrawerSolicitacao(solicitacao);

  overlaySolicitacao.classList.add("ativo");
  drawerSolicitacao.classList.add("ativo");

  document.body.classList.add("drawer-solicitacao-aberto");
}

function fecharDrawerSolicitacao() {
  overlaySolicitacao.classList.remove("ativo");
  drawerSolicitacao.classList.remove("ativo");

  document.body.classList.remove("drawer-solicitacao-aberto");

  solicitacaoSelecionada = null;
}

function abrirDialogoAtualizacao() {
  if (!solicitacaoSelecionada) {
    notificar("Solicitação não localizada.", "erro");
    return;
  }

  const transicoes = obterTransicoesPermitidas(solicitacaoSelecionada.status);

  if (!transicoes.length) {
    notificar("Esta solicitação não permite novas atualizações.", "erro");

    return;
  }

  protocoloAtualizacao.textContent =
    solicitacaoSelecionada.protocolo || "Sem protocolo";

  const ehManutencao = solicitacaoSelecionada.modulo === "MANUTENCAO";

  const labelTipoAtendimento = blocoTipoAtendimento.querySelector("label");

  labelTipoAtendimento.textContent = ehManutencao
    ? "Resultado do serviço"
    : "Resultado da entrega";

  tipoAtendimentoEntrega.innerHTML = ehManutencao
    ? `
      <option value="">Selecione</option>
      <option value="TOTAL">Serviço concluído</option>
      <option value="PARCIAL">Atendimento parcial</option>
    `
    : `
      <option value="">Selecione</option>
      <option value="TOTAL">Entrega completa</option>
      <option value="PARCIAL">Entrega parcial</option>
    `;

  novoStatusSolicitacao.innerHTML = `
    <option value="">
      Selecione
    </option>

    ${transicoes
      .map((status) => {
        const dadosStatus = obterDadosStatus(status);

        return `
          <option value="${status}">
            ${escaparHtml(dadosStatus.nome)}
          </option>
        `;
      })
      .join("")}
  `;

  tipoAtendimentoEntrega.value = "";
  blocoTipoAtendimento.hidden = true;
  tipoAtendimentoEntrega.required = false;
  ocultarQuantidadesMateriais();
  observacaoAtualizacao.value = "";
  contadorObservacaoAtualizacao.textContent = "0";
  avisoObservacaoObrigatoria.classList.remove("ativo");

  overlayAtualizacao.classList.add("ativo");
  dialogoAtualizacao.classList.add("ativo");
}

function fecharDialogoAtualizacao() {
  overlayAtualizacao.classList.remove("ativo");
  dialogoAtualizacao.classList.remove("ativo");

  novoStatusSolicitacao.value = "";
  tipoAtendimentoEntrega.value = "";
  blocoTipoAtendimento.hidden = true;
  tipoAtendimentoEntrega.required = false;
  ocultarQuantidadesMateriais();
  observacaoAtualizacao.value = "";
  contadorObservacaoAtualizacao.textContent = "0";

  avisoObservacaoObrigatoria.classList.remove("ativo");
}

function obterItensMateriaisSolicitacao() {
  if (!solicitacaoSelecionada) {
    return [];
  }

  const itens = solicitacaoSelecionada.itens;

  return Array.isArray(itens)
    ? itens.filter(Boolean)
    : Object.values(itens || {});
}

function ocultarQuantidadesMateriais() {
  blocoQuantidadesMateriais.hidden = true;
  listaQuantidadesMateriais.innerHTML = "";
  resumoQuantidadesMateriais.textContent = "";
}

function renderizarQuantidadesMateriais() {
  const ehPedidoMateriais = [
    "MATERIAIS_EXPEDIENTE",
    "MATERIAIS_LIMPEZA",
  ].includes(solicitacaoSelecionada?.modulo);

  const informandoEntrega =
    novoStatusSolicitacao.value === "AGUARDANDO_CONFIRMACAO";

  const tipoAtendimento = tipoAtendimentoEntrega.value;

  if (!ehPedidoMateriais || !informandoEntrega || !tipoAtendimento) {
    ocultarQuantidadesMateriais();
    return;
  }

  const itens = obterItensMateriaisSolicitacao();
  const entregaCompleta = tipoAtendimento === "TOTAL";

  blocoQuantidadesMateriais.hidden = false;

  resumoQuantidadesMateriais.textContent = `${itens.length} material${itens.length === 1 ? "" : "is"}`;

  listaQuantidadesMateriais.innerHTML = itens
    .map((item, indice) => {
      const quantidadeSolicitada = Number(item.quantidadeSolicitada || 0);

      const quantidadeEntregue = entregaCompleta ? quantidadeSolicitada : 0;

      return `
        <div class="item-quantidade-material">
          <div class="dados-item-quantidade-material">
            <strong>
              ${escaparHtml(item.nome || "Material não informado")}
            </strong>

            <span>
              Solicitado:
              ${escaparHtml(quantidadeSolicitada)}
              ${escaparHtml(item.unidade || "unidade")}
            </span>
          </div>

          <div class="campo-quantidade-entregue">
            <label for="quantidadeEntregueMaterial${indice}">
              Quantidade entregue
            </label>

            <div>
              <input
                type="number"
                id="quantidadeEntregueMaterial${indice}"
                class="quantidade-entregue-material"
                data-indice="${indice}"
                min="0"
                max="${quantidadeSolicitada}"
                step="1"
                value="${quantidadeEntregue}"
                ${entregaCompleta ? "readonly" : ""}
              />

              <span>
                ${escaparHtml(item.unidade || "unidade")}
              </span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function obterQuantidadesEntreguesMateriais(tipoAtendimento) {
  const itensSolicitados = obterItensMateriaisSolicitacao();

  if (!itensSolicitados.length) {
    throw new Error("A solicitação não possui materiais.");
  }

  const camposQuantidade = Array.from(
    listaQuantidadesMateriais.querySelectorAll(".quantidade-entregue-material"),
  );

  const itensEntregues = itensSolicitados.map((item, indice) => {
    const quantidadeSolicitada = Number(item.quantidadeSolicitada || 0);

    const campo = camposQuantidade.find(
      (elemento) => Number(elemento.dataset.indice) === indice,
    );

    const quantidadeEntregue =
      tipoAtendimento === "TOTAL"
        ? quantidadeSolicitada
        : Number(campo?.value || 0);

    if (!Number.isFinite(quantidadeEntregue) || quantidadeEntregue < 0) {
      throw new Error(
        `Informe uma quantidade válida para ${item.nome || "o material"}.`,
      );
    }

    if (quantidadeEntregue > quantidadeSolicitada) {
      throw new Error(
        `A quantidade entregue de ${item.nome || "o material"} não pode ser maior que a solicitada.`,
      );
    }

    return {
      materialId: item.materialId || "",
      nome: item.nome || "Material",
      unidade: item.unidade || "Unidade",
      quantidadeSolicitada,
      quantidadeEntregue,
    };
  });

  const quantidadeTotalEntregue = itensEntregues.reduce(
    (total, item) => total + item.quantidadeEntregue,
    0,
  );

  if (quantidadeTotalEntregue <= 0) {
    throw new Error("Informe a quantidade entregue de pelo menos um material.");
  }

  const todosEntreguesIntegralmente = itensEntregues.every(
    (item) => item.quantidadeEntregue === item.quantidadeSolicitada,
  );

  if (tipoAtendimento === "PARCIAL" && todosEntreguesIntegralmente) {
    throw new Error(
      "Todas as quantidades foram entregues. Selecione Entrega completa.",
    );
  }

  return {
    itensEntregues,
    quantidadeTotalEntregue,
  };
}


function obterNomeResponsavelRomaneio() {
  return String(dadosUsuarioAtual?.nome || "Usuário").split(" ")[0];
}

function formatarDataRomaneio(data) {
  return data ? new Date(data).toLocaleDateString("pt-BR") : "-";
}

function formatarUnidadeRomaneio(unidade, quantidade) {
  if (Number(quantidade) === 1) return unidade || "Unidade";
  const plurais = {
    Unidade: "Unidades", Caixa: "Caixas", Resma: "Resmas",
    Pacote: "Pacotes", Fardo: "Fardos", Kit: "Kits", Kg: "Kg",
    Quilograma: "Quilogramas", Grama: "Gramas", Litro: "Litros",
    Mililitro: "Mililitros", Saco: "Sacos", Lata: "Latas",
    Garrafa: "Garrafas", Pote: "Potes", Frasco: "Frascos",
    "Mão (50 unidades)": "Mãos (50 unidades)",
  };
  return plurais[unidade] || unidade || "Unidades";
}

async function prepararRomaneioSolicitacao({
  solicitacao, dadosEntregaMateriais, tipoAtendimento, observacao,
}) {
  const itensComEntrega = dadosEntregaMateriais.itensEntregues.filter(
    (item) => Number(item.quantidadeEntregue || 0) > 0,
  );

  const romaneioId = push(ref(rtdb, "movimentacoes")).key;
  if (!romaneioId) throw new Error("Não foi possível gerar o romaneio.");

  const data = new Date().toISOString();
  const responsavel = obterNomeResponsavelRomaneio();
  const atualizacoes = {};
  const itens = [];

  for (const itemEntregue of itensComEntrega) {
    const materialId = String(itemEntregue.materialId || "").trim();
    const quantidade = Number(itemEntregue.quantidadeEntregue || 0);

    if (!materialId) {
      throw new Error(`O material "${itemEntregue.nome}" não possui vínculo com o estoque.`);
    }

    const snapshot = await get(ref(rtdb, `materiais/${materialId}`));
    if (!snapshot.exists()) {
      throw new Error(`O material "${itemEntregue.nome}" não foi encontrado no estoque.`);
    }

    const material = snapshot.val();
    const estoqueAnterior = Number(material.estoque || 0);
    if (quantidade > estoqueAnterior) {
      throw new Error(
        `Estoque insuficiente para "${material.nome || itemEntregue.nome}". Disponível: ${estoqueAnterior}.`,
      );
    }

    const historicoId = push(ref(rtdb, "historicoEstoque")).key;
    if (!historicoId) throw new Error("Não foi possível registrar a saída.");

    atualizacoes[`materiais/${materialId}/estoque`] = increment(-quantidade);
    atualizacoes[`materiais/${materialId}/atualizadoEm`] = data;
    atualizacoes[`historicoEstoque/${historicoId}`] = {
      tipo: "saida",
      acao: "romaneio",
      materialId,
      material: material.nome || itemEntregue.nome || "",
      categoriaId: material.categoriaId || null,
      unidade: material.unidade || itemEntregue.unidade || "Unidade",
      quantidade,
      estoqueAnterior,
      estoquePosterior: estoqueAnterior - quantidade,
      justificativa: `Atendimento da solicitação ${solicitacao.protocolo || ""}`.trim(),
      destinoId: solicitacao.escolaId || null,
      destino: solicitacao.escolaNome || "",
      usuario: responsavel,
      data,
      romaneioId,
      solicitacaoId: solicitacao.id,
      protocolo: solicitacao.protocolo || "",
    };

    itens.push({
      nome: material.nome || itemEntregue.nome || "Material",
      categoriaId: material.categoriaId || null,
      unidade: material.unidade || itemEntregue.unidade || "Unidade",
      quantidade,
      materialId,
    });
  }

  const movimentacao = {
    destinoId: solicitacao.escolaId || null,
    destino: solicitacao.escolaNome || "Unidade escolar",
    data, observacao, itens, responsavel,
    origem: "SOLICITACAO_PORTAL_GESTOR",
    solicitacaoId: solicitacao.id,
    protocolo: solicitacao.protocolo || "",
    tipoAtendimento,
  };

  atualizacoes[`movimentacoes/${romaneioId}`] = movimentacao;
  return { romaneioId, movimentacao, atualizacoes };
}

function gerarPDFRomaneioSolicitacao(dados) {
  if (!jsPDF) {
    notificar("O gerador de PDF não foi carregado.", "erro");
    return;
  }

  const doc = new jsPDF();
  const img = new Image();
  img.src = "./src/images/papel-timbrado.png";

  img.onload = () => {
    const largura = doc.internal.pageSize.getWidth();
    const altura = doc.internal.pageSize.getHeight();
    const margem = 20;
    const larguraTexto = largura - 40;
    let pagina = 1;
    let y = 0;

    function cabecalho(primeira = false) {
      doc.addImage(img, "PNG", 0, 0, largura, altura);

      if (primeira) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("ROMANEIO DE ENTREGA", largura / 2, 48, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text(`Destino: ${dados.destino || "-"}`, margem, 68);
        doc.text(`Data: ${formatarDataRomaneio(dados.data)}`, margem, 76);
        doc.text(`Responsável: ${dados.responsavel || "-"}`, margem, 84);
        doc.text(`Solicitação: ${dados.protocolo || "-"}`, margem, 92);
        doc.setFont("helvetica", "bold");
        doc.text("ITENS:", margem, 106);
        y = 116;
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("CONTINUAÇÃO DOS ITENS:", margem, 48);
        y = 58;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Página ${pagina}`, largura - margem, altura - 10, { align: "right" });
      doc.setFontSize(12);
    }

    function novaPagina() {
      doc.addPage();
      pagina++;
      cabecalho(false);
    }

    cabecalho(true);

    dados.itens.forEach((item, indice) => {
      const descricao =
        `${indice + 1}. ${item.nome} - ${item.quantidade} ` +
        formatarUnidadeRomaneio(item.unidade, item.quantidade);
      const linhas = doc.splitTextToSize(descricao, larguraTexto);
      if (y + linhas.length * 7 > 235) novaPagina();
      doc.text(linhas, margem, y);
      y += linhas.length * 7 + 3;
    });

    if (y + 55 > altura - 20) novaPagina();
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text(
      `Total: ${dados.itens.length} ${dados.itens.length === 1 ? "item" : "itens"}`,
      margem, y,
    );

    y += 35;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.line(20, y, 85, y);
    doc.line(125, y, 190, y);
    doc.text("Responsável pela Entrega", 52, y + 7, { align: "center" });
    doc.text("Responsável pelo Recebimento", 157, y + 7, { align: "center" });

    y += 20;
    if (y + 63 > altura - 20) {
      novaPagina();
      y += 5;
    }

    doc.rect(margem, y, larguraTexto, 63);
    doc.setFont("helvetica", "bold");
    doc.text("CONFORMIDADE", margem + 5, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Conformidade:", margem + 5, y + 18);
    doc.rect(margem + 32, y + 14, 4, 4);
    doc.text("Sim", margem + 39, y + 18);
    doc.rect(margem + 55, y + 14, 4, 4);
    doc.text("Não", margem + 62, y + 18);
    doc.text("Em caso de desconformidade, descrever:", margem + 5, y + 29);
    [37, 44, 51, 58].forEach((n) => doc.line(margem + 5, y + n, largura - margem - 5, y + n));

    if (dados.observacao?.trim()) {
      y += 71;
      const linhas = doc.splitTextToSize(dados.observacao.trim(), larguraTexto - 10);
      const alturaObs = Math.max(28, linhas.length * 6 + 18);
      if (y + alturaObs > altura - 20) {
        novaPagina();
        y += 5;
      }
      doc.rect(margem, y, larguraTexto, alturaObs);
      doc.setFont("helvetica", "bold");
      doc.text("OBSERVAÇÕES", margem + 5, y + 8);
      doc.setFont("helvetica", "normal");
      doc.text(linhas, margem + 5, y + 17);
    }

    const dataArquivo = new Date(dados.data)
      .toLocaleDateString("pt-BR").replace(/\//g, ".");

    window.abrirOuBaixarPDF(
      doc,
      `Romaneio - ${dados.destino || "Unidade escolar"} - ${dataArquivo}.pdf`,
    );
  };

  img.onerror = () => {
    notificar("O romaneio foi registrado, mas o PDF não pôde ser aberto.", "erro");
  };
}

function atualizarCampoTipoAtendimento() {
  const deveExibir = novoStatusSolicitacao.value === "AGUARDANDO_CONFIRMACAO";

  blocoTipoAtendimento.hidden = !deveExibir;
  tipoAtendimentoEntrega.required = deveExibir;

  if (!deveExibir) {
    tipoAtendimentoEntrega.value = "";
  }

  renderizarQuantidadesMateriais();
  atualizarAvisoObservacao();
}

function observacaoEhObrigatoria(status, tipoAtendimento) {
  return status === "AGUARDANDO_CONFIRMACAO" && tipoAtendimento === "PARCIAL";
}

function atualizarAvisoObservacao() {
  const obrigatoria = observacaoEhObrigatoria(
    novoStatusSolicitacao.value,
    tipoAtendimentoEntrega.value,
  );

  avisoObservacaoObrigatoria.classList.toggle("ativo", obrigatoria);
}

async function salvarAtualizacaoSolicitacao() {
  if (!solicitacaoSelecionada?.id) {
    throw new Error("Solicitação não localizada.");
  }

  const novoStatus = novoStatusSolicitacao.value;
  const tipoAtendimento = tipoAtendimentoEntrega.value;
  const observacao = observacaoAtualizacao.value.trim();

  const ehPedidoMateriais = [
    "MATERIAIS_EXPEDIENTE",
    "MATERIAIS_LIMPEZA",
  ].includes(solicitacaoSelecionada.modulo);

  const ehManutencao = solicitacaoSelecionada.modulo === "MANUTENCAO";

  let dadosEntregaMateriais = null;
  let preparacaoRomaneio = null;

  if (!novoStatus) {
    throw new Error("Selecione a nova situação.");
  }
  if (novoStatus === "AGUARDANDO_CONFIRMACAO" && !tipoAtendimento) {
    throw new Error(
      ehManutencao
        ? "Informe o resultado do serviço."
        : "Informe o resultado da entrega.",
    );
  }

  if (ehPedidoMateriais && novoStatus === "AGUARDANDO_CONFIRMACAO") {
    dadosEntregaMateriais = obterQuantidadesEntreguesMateriais(tipoAtendimento);
  }

  if (ehPedidoMateriais && novoStatus === "AGUARDANDO_CONFIRMACAO") {
    preparacaoRomaneio = await prepararRomaneioSolicitacao({
      solicitacao: solicitacaoSelecionada,
      dadosEntregaMateriais,
      tipoAtendimento,
      observacao,
    });
  }

  const transicoesPermitidas = obterTransicoesPermitidas(
    solicitacaoSelecionada.status,
  );

  if (!transicoesPermitidas.includes(novoStatus)) {
    throw new Error("Esta alteração de situação não é permitida.");
  }

  if (observacaoEhObrigatoria(novoStatus, tipoAtendimento) && !observacao) {
    throw new Error("Informe na observação o que foi entregue parcialmente.");
  }

  const solicitacaoId = solicitacaoSelecionada.id;
  const statusAnterior = solicitacaoSelecionada.status;

  const solicitacaoRef = ref(
    rtdb,
    `portalGestor/solicitacoes/registros/${solicitacaoId}`,
  );

  const historicoRef = push(
    ref(rtdb, `portalGestor/solicitacoes/registros/${solicitacaoId}/historico`),
  );

  const historicoId = historicoRef.key;

  if (!historicoId) {
    throw new Error("Não foi possível criar o histórico.");
  }

  const agora = Date.now();
  let motivoFalha = "";

  const resultado = await runTransaction(
    solicitacaoRef,

    (solicitacaoAtual) => {
      if (!solicitacaoAtual) {
        motivoFalha = "NAO_ENCONTRADA";
        return;
      }

      if (!moduloPermitido(solicitacaoAtual.modulo)) {
        motivoFalha = "SEM_PERMISSAO";
        return;
      }

      if (solicitacaoAtual.status !== statusAnterior) {
        motivoFalha = "STATUS_ALTERADO";
        return;
      }

      solicitacaoAtual.status = novoStatus;
      solicitacaoAtual.atualizadoEm = agora;
      solicitacaoAtual.atualizadoPorUid = dadosUsuarioAtual.uid;

      solicitacaoAtual.atualizadoPorNome = dadosUsuarioAtual.nome || "Usuário";

      if (novoStatus === "AGUARDANDO_CONFIRMACAO") {
        solicitacaoAtual.confirmacaoEntrega = {
          pendente: true,
          tipoAtendimento,
          informadoEm: agora,
          informadoPorUid: dadosUsuarioAtual.uid,
          informadoPorNome: dadosUsuarioAtual.nome || "Usuário",
          observacao,
          romaneioId: preparacaoRomaneio?.romaneioId || null,

          ...(dadosEntregaMateriais
            ? {
                itensEntregues: dadosEntregaMateriais.itensEntregues,

                quantidadeTotalEntregue:
                  dadosEntregaMateriais.quantidadeTotalEntregue,
              }
            : {}),
        };
      }

      if (!solicitacaoAtual.historico) {
        solicitacaoAtual.historico = {};
      }

      const statusAnteriorNome = obterDadosStatus(statusAnterior).nome;

      const novoStatusNome = obterDadosStatus(novoStatus).nome;

      let descricaoAtualizacao;

      if (novoStatus === "AGUARDANDO_CONFIRMACAO") {
        if (ehManutencao) {
          descricaoAtualizacao =
            tipoAtendimento === "TOTAL"
              ? "Serviço concluído. Aguardando confirmação da unidade escolar."
              : "Chamado atendido parcialmente. Aguardando confirmação da unidade escolar." +
                (observacao ? ` Observação: ${observacao}` : "");
        } else {
          descricaoAtualizacao =
            tipoAtendimento === "TOTAL"
              ? "Entrega completa informada. Aguardando confirmação da unidade escolar."
              : "Entrega parcial informada. Aguardando confirmação da unidade escolar." +
                (observacao ? ` Observação: ${observacao}` : "");
        }
      } else {
        descricaoAtualizacao =
          `Situação alterada de ${statusAnteriorNome} para ${novoStatusNome}.` +
          (observacao ? ` Observação: ${observacao}` : "");
      }

      solicitacaoAtual.historico[historicoId] = {
        status: novoStatus,
        statusAnterior,

        acao:
          novoStatus === "AGUARDANDO_CONFIRMACAO"
            ? ehManutencao
              ? "SERVICO_INFORMADO"
              : "ENTREGA_INFORMADA"
            : "STATUS_ATUALIZADO",

        descricao: descricaoAtualizacao,
        tipoAtendimento:
          novoStatus === "AGUARDANDO_CONFIRMACAO" ? tipoAtendimento : null,

        itensEntregues:
          novoStatus === "AGUARDANDO_CONFIRMACAO" && dadosEntregaMateriais
            ? dadosEntregaMateriais.itensEntregues
            : null,

        quantidadeTotalEntregue:
          novoStatus === "AGUARDANDO_CONFIRMACAO" && dadosEntregaMateriais
            ? dadosEntregaMateriais.quantidadeTotalEntregue
            : null,

        observacao,
        romaneioId: preparacaoRomaneio?.romaneioId || null,
        responsavelUid: dadosUsuarioAtual.uid,
        responsavelNome: dadosUsuarioAtual.nome || "Usuário",
        criadoEm: agora,
      };

      return solicitacaoAtual;
    },
  );

  if (!resultado.committed) {
    const mensagens = {
      NAO_ENCONTRADA: "A solicitação não foi encontrada.",

      SEM_PERMISSAO:
        "Seu perfil não possui permissão para atualizar esta solicitação.",

      STATUS_ALTERADO:
        "A situação foi alterada por outro usuário. Atualize a página e tente novamente.",
    };

    throw new Error(
      mensagens[motivoFalha] || "Não foi possível atualizar a solicitação.",
    );
  }

  if (preparacaoRomaneio) {
    try {
      await update(ref(rtdb), preparacaoRomaneio.atualizacoes);
      gerarPDFRomaneioSolicitacao(preparacaoRomaneio.movimentacao);
    } catch (erroRomaneio) {
      console.error("Erro ao registrar o romaneio:", erroRomaneio);

      await runTransaction(solicitacaoRef, (solicitacaoAtual) => {
        if (
          !solicitacaoAtual ||
          solicitacaoAtual.status !== novoStatus ||
          solicitacaoAtual.confirmacaoEntrega?.romaneioId !==
            preparacaoRomaneio.romaneioId
        ) return;

        solicitacaoAtual.status = statusAnterior;
        solicitacaoAtual.atualizadoEm = Date.now();
        solicitacaoAtual.atualizadoPorUid = dadosUsuarioAtual.uid;
        solicitacaoAtual.atualizadoPorNome = dadosUsuarioAtual.nome || "Usuário";
        delete solicitacaoAtual.confirmacaoEntrega;
        if (solicitacaoAtual.historico?.[historicoId]) {
          delete solicitacaoAtual.historico[historicoId];
        }
        return solicitacaoAtual;
      });

      throw new Error(
        erroRomaneio.message ||
          "Não foi possível baixar o estoque e gerar o romaneio.",
      );
    }
  }

  return {
    id: solicitacaoId,
    ...resultado.snapshot.val(),
  };
}

btnAtualizarSolicitacao.addEventListener("click", abrirDialogoAtualizacao);

btnCancelarAtualizacao.addEventListener("click", fecharDialogoAtualizacao);

overlayAtualizacao.addEventListener("click", fecharDialogoAtualizacao);

novoStatusSolicitacao.addEventListener("change", atualizarCampoTipoAtendimento);

tipoAtendimentoEntrega.addEventListener("change", () => {
  atualizarAvisoObservacao();
  renderizarQuantidadesMateriais();
});

observacaoAtualizacao.addEventListener("input", () => {
  contadorObservacaoAtualizacao.textContent =
    observacaoAtualizacao.value.length;
});

btnConfirmarAtualizacao.addEventListener("click", async () => {
  btnConfirmarAtualizacao.disabled = true;

  btnConfirmarAtualizacao.innerHTML = `
      <span class="material-symbols-outlined">
        progress_activity
      </span>

      Salvando...
    `;

  try {
    const solicitacaoAtualizada = await salvarAtualizacaoSolicitacao();

    solicitacaoSelecionada = solicitacaoAtualizada;

    const indice = solicitacoes.findIndex(
      (item) => item.id === solicitacaoAtualizada.id,
    );

    if (indice !== -1) {
      solicitacoes[indice] = solicitacaoAtualizada;
    }

    fecharDialogoAtualizacao();
    preencherDrawerSolicitacao(solicitacaoAtualizada);

    atualizarIndicadores();
    renderizarSolicitacoes();

    notificar("Situação atualizada com sucesso!");
  } catch (erro) {
    console.error("Erro ao atualizar solicitação:", erro);

    notificar(
      erro.message || "Não foi possível atualizar a solicitação.",
      "erro",
    );
  } finally {
    btnConfirmarAtualizacao.disabled = false;

    btnConfirmarAtualizacao.innerHTML = `
        <span class="material-symbols-outlined">
          save
        </span>

        Salvar atualização
      `;
  }
});

/* =========================================
   EVENTOS
========================================= */

abasSolicitacoes.forEach((aba) => {
  aba.addEventListener("click", () => {
    if (aba.style.display === "none") {
      return;
    }

    abasSolicitacoes.forEach((item) => {
      item.classList.remove("active");
    });

    aba.classList.add("active");
    moduloSelecionado = aba.dataset.modulo;

    renderizarSolicitacoes();
  });
});

buscaSolicitacoes.addEventListener("input", renderizarSolicitacoes);

filtroStatusSolicitacao.addEventListener("change", renderizarSolicitacoes);

filtroPrioridadeSolicitacao.addEventListener("change", renderizarSolicitacoes);

listaCentralSolicitacoes.addEventListener("click", (event) => {
  const botao = event.target.closest(".btn-analisar-solicitacao");

  if (!botao) {
    return;
  }

  abrirDrawerSolicitacao(botao.dataset.id);
});

btnFecharSolicitacao.addEventListener("click", fecharDrawerSolicitacao);

btnFecharSolicitacaoRodape.addEventListener("click", fecharDrawerSolicitacao);

overlaySolicitacao.addEventListener("click", fecharDrawerSolicitacao);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (dialogoAtualizacao.classList.contains("ativo")) {
    fecharDialogoAtualizacao();
    return;
  }

  if (drawerSolicitacao.classList.contains("ativo")) {
    fecharDrawerSolicitacao();
  }
});

/* =========================================
   CARREGAR REGISTROS
========================================= */

function consolidarSolicitacoes() {
  solicitacoes = Object.values(solicitacoesPorModulo).flat();

  solicitacoes.sort(
    (a, b) => Number(b.criadoEm || 0) - Number(a.criadoEm || 0),
  );

  atualizarIndicadores();
  renderizarSolicitacoes();
}

function carregarSolicitacoes() {
  const registrosRef = ref(rtdb, "portalGestor/solicitacoes/registros");

  const modulosDisponiveis = [
    "INSUMOS",
    "MATERIAIS_EXPEDIENTE",
    "MATERIAIS_LIMPEZA",
    "MANUTENCAO",
  ];

  const modulosAutorizados = modulosDisponiveis.filter((modulo) =>
    moduloPermitido(modulo),
  );

  solicitacoesPorModulo = {};

  modulosAutorizados.forEach((modulo) => {
    solicitacoesPorModulo[modulo] = [];

    const consultaModulo = query(
      registrosRef,
      orderByChild("modulo"),
      equalTo(modulo),
    );

    onValue(
      consultaModulo,

      (snapshot) => {
        solicitacoesPorModulo[modulo] = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, dados]) => ({
              id,
              ...dados,
            }))
          : [];

        consolidarSolicitacoes();
      },

      (erro) => {
        console.error(`Erro ao carregar o módulo ${modulo}:`, erro);

        solicitacoesPorModulo[modulo] = [];
        consolidarSolicitacoes();

        notificar(
          `Não foi possível carregar ${obterNomeModulo(modulo)}.`,
          "erro",
        );
      },
    );
  });

  if (!modulosAutorizados.length) {
    consolidarSolicitacoes();
  }
}

/* =========================================
   AUTENTICAÇÃO E ACESSO
========================================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./login";
    return;
  }

  try {
    const usuarioSnap = await getDoc(doc(db, "usuarios", user.uid));

    if (!usuarioSnap.exists()) {
      throw new Error("USUARIO_NAO_ENCONTRADO");
    }

    dadosUsuarioAtual = {
      uid: user.uid,
      ...usuarioSnap.data(),
    };

    if (dadosUsuarioAtual.ativo === false) {
      throw new Error("USUARIO_DESATIVADO");
    }

    perfilUsuarioAtual = String(dadosUsuarioAtual.cargo || "")
      .trim()
      .toUpperCase();

    await carregarPermissaoPerfil();
    carregarSolicitacoes();
  } catch (erro) {
    console.error("Erro ao validar acesso às solicitações:", erro);

    const mensagem =
      erro.message === "ACESSO_NAO_AUTORIZADO"
        ? "Seu perfil não possui acesso à Central de Solicitações."
        : "Não foi possível validar seu acesso.";

    notificar(mensagem, "erro");

    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  }
});
