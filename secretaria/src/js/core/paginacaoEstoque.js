export function paginarRegistros(registros, paginaAtual = 1, tamanho = 30) {
  const total = registros.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const pagina = Math.max(1, Math.min(totalPaginas, Math.trunc(paginaAtual) || 1));
  const inicio = (pagina - 1) * tamanho;
  return {
    registros: registros.slice(inicio, inicio + tamanho),
    pagina, totalPaginas, total,
    primeiro: total ? inicio + 1 : 0,
    ultimo: Math.min(inicio + tamanho, total),
  };
}
