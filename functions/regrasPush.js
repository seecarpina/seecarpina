export const chavesModulos = {
  INSUMOS: "insumos",
  MATERIAIS_EXPEDIENTE: "materiaisExpediente",
  MATERIAIS_LIMPEZA: "materiaisLimpeza",
  MANUTENCAO: "manutencao",
};

export function podeReceberPedido(usuario, permissoes, modulo, solicitanteUid) {
  const chave = chavesModulos[modulo];
  if (!chave || !usuario || usuario.ativo !== true || usuario.uid === solicitanteUid) return false;
  const perfil = String(usuario.perfil || "").trim().toUpperCase();
  if (!perfil || perfil === "GESTOR_ESCOLAR") return false;
  return perfil === "ADM" || permissoes[perfil]?.todas === true || permissoes[perfil]?.modulos?.[chave] === true;
}

export function criarAvisoPedido(id, pedido, origem) {
  const url = new URL("/solicitacoes.html", origem);
  url.searchParams.set("pedido", id);
  return {
    title: "Nova solicitação escolar",
    // Não expõe escola, servidor ou conteúdo do pedido na tela bloqueada.
    body: "Há um novo pedido para atendimento. Toque para consultar.",
    url: url.href,
    tag: `solicitacao-${id}`,
  };
}
