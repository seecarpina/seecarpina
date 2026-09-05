/**
 * Funções puras usadas pelo módulo de estoque.
 *
 * Este arquivo não acessa DOM nem Firebase, o que permite validar as regras
 * essenciais do estoque automaticamente e reutilizá-las em outras telas.
 */

export function obterQuantidadeNumerica(valor) {
  return Number(String(valor || "").replace(/\./g, ""));
}

export function calcularEstoquePosterior(estoqueAtual, quantidadeMovimentada) {
  const estoque = Number(estoqueAtual || 0);
  const quantidade = Number(quantidadeMovimentada || 0);

  if (!Number.isFinite(estoque) || !Number.isFinite(quantidade)) {
    throw new TypeError("Estoque e quantidade devem ser números válidos.");
  }

  if (quantidade < 0) {
    throw new RangeError("A quantidade movimentada não pode ser negativa.");
  }

  if (quantidade > estoque) {
    throw new RangeError("Estoque insuficiente.");
  }

  return estoque - quantidade;
}

export function formatarUnidade(unidade, quantidade) {
  if (Number(quantidade) === 1) {
    return unidade;
  }

  const plurais = {
    Unidade: "Unidades",
    Caixa: "Caixas",
    Resma: "Resmas",
    Pacote: "Pacotes",
    Fardo: "Fardos",
    Kit: "Kits",
    Kg: "Kg",
    Quilograma: "Quilogramas",
    Grama: "Gramas",
    Litro: "Litros",
    Mililitro: "Mililitros",
    Saco: "Sacos",
    Lata: "Latas",
    Garrafa: "Garrafas",
    Pote: "Potes",
    Frasco: "Frascos",
    "Mão (50 unidades)": "Mãos (50 unidades)",
  };

  return plurais[unidade] || unidade;
}
