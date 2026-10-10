// Guarda conclusões ocorridas antes da inicialização do componente com defer.
export function concluirCarregamento(nome) {
  if (window.carregamentoPagina) window.carregamentoPagina.concluir(nome);
  else (window.carregamentosConcluidos ??= []).push(nome);
}
