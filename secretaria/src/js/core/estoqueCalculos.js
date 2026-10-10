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

export function prepararItensSaidaEstoque(itens, materiais) {
  if (!Array.isArray(itens) || !itens.length) {
    throw new Error("Adicione pelo menos um item.");
  }

  const materiaisPorId = new Map(
    (materiais || []).map((material) => [
      String(material._key || material.id || ""),
      material,
    ]),
  );
  const idsProcessados = new Set();

  return itens.map((item) => {
    const materialId = String(item.materialId || "");

    if (!materialId || idsProcessados.has(materialId)) {
      throw new Error(
        idsProcessados.has(materialId)
          ? `O material "${item.nome || "Material"}" está duplicado no romaneio.`
          : "O item do romaneio não possui identificação.",
      );
    }

    idsProcessados.add(materialId);

    const material = materiaisPorId.get(materialId);

    if (!material) {
      throw new Error(
        `O material "${item.nome || "Material"}" não foi encontrado.`,
      );
    }

    const quantidade = Number(item.quantidade || 0);

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      throw new Error(
        `A quantidade de "${item.nome || material.nome || "Material"}" é inválida.`,
      );
    }

    const estoqueAnterior = Number(material.estoque || 0);
    const estoquePosterior = calcularEstoquePosterior(
      estoqueAnterior,
      quantidade,
    );

    return {
      item,
      material,
      materialId,
      quantidade,
      estoqueAnterior,
      estoquePosterior,
    };
  });
}
