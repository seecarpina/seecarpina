const modulosMateriais = new Set(["MATERIAIS_EXPEDIENTE", "MATERIAIS_LIMPEZA"]);
const situacoesAbertas = new Set(["RECEBIDA", "EM_ANALISE", "APROVADA", "EM_ATENDIMENTO", "AGUARDANDO_CONFIRMACAO"]);

export function obterPedidoMaterialAberto(solicitacoes, modulo, escolaId) {
  if (!modulosMateriais.has(modulo) || !escolaId) return null;
  return solicitacoes.find(solicitacao =>
    solicitacao.modulo === modulo &&
    String(solicitacao.escolaId) === String(escolaId) &&
    situacoesAbertas.has(solicitacao.status),
  ) || null;
}
