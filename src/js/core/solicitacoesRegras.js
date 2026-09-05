const TRANSICOES_STATUS = Object.freeze({
  RECEBIDA: ["EM_ATENDIMENTO"],
  EM_ATENDIMENTO: ["AGUARDANDO_CONFIRMACAO"],
  AGUARDANDO_CONFIRMACAO: [],
  CONCLUIDA: [],
  ATENDIDA_PARCIALMENTE: [],
  CANCELADA: [],

  // Compatibilidade com solicitações antigas.
  EM_ANALISE: ["EM_ATENDIMENTO"],
  APROVADA: ["EM_ATENDIMENTO"],
  INDEFERIDA: [],
});

export function obterTransicoesPermitidas(statusAtual) {
  return [...(TRANSICOES_STATUS[statusAtual] || [])];
}

export function observacaoEhObrigatoria(status, tipoAtendimento) {
  return status === "AGUARDANDO_CONFIRMACAO" && tipoAtendimento === "PARCIAL";
}

export function validarEntregaMateriais({
  itensSolicitados,
  quantidadesInformadas = [],
  tipoAtendimento,
}) {
  if (!Array.isArray(itensSolicitados) || !itensSolicitados.length) {
    throw new Error("A solicitação não possui materiais.");
  }

  const itensEntregues = itensSolicitados.map((item, indice) => {
    const quantidadeSolicitada = Number(item.quantidadeSolicitada || 0);
    const quantidadeEntregue =
      tipoAtendimento === "TOTAL"
        ? quantidadeSolicitada
        : Number(quantidadesInformadas[indice] || 0);

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
