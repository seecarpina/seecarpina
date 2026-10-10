export function listarResponsaveisRaphael(bases) {
  const registros = [];
  for (const raiz of ["oficios", "oficiosCirculares"]) {
    for (const [ano, documentos] of Object.entries(bases[raiz] || {})) {
      for (const [id, documento] of Object.entries(documentos || {})) {
        if (documento?.responsavel !== "Raphael") continue;
        registros.push({ caminho: `${raiz}/${ano}/${id}/responsavel`, tipo: raiz, ano, numero: documento.numero ?? "", responsavel: "Raphael", novoResponsavel: "Raphael Silva" });
      }
    }
  }
  return registros;
}

export function corrigirNomeRaphael(atual) {
  // null permite consultar o servidor quando o cache da transação ainda está vazio.
  // Se o campo foi removido, null mantém a ausência, sem recriar o registro.
  if (atual === null) return null;
  return atual === "Raphael" ? "Raphael Silva" : undefined;
}
