import test from "node:test";
import assert from "node:assert/strict";

import {
  calcularEstoquePosterior,
  formatarUnidade,
  obterQuantidadeNumerica,
  prepararItensSaidaEstoque,
} from "../src/js/core/estoqueCalculos.js";

test("converte quantidade formatada em pt-BR", () => {
  assert.equal(obterQuantidadeNumerica("1.250"), 1250);
  assert.equal(obterQuantidadeNumerica("15"), 15);
  assert.equal(obterQuantidadeNumerica(""), 0);
});

test("deduz uma saída válida do estoque", () => {
  assert.equal(calcularEstoquePosterior(50, 10), 40);
  assert.equal(calcularEstoquePosterior("20", "20"), 0);
});

test("impede saída maior que o estoque", () => {
  assert.throws(
    () => calcularEstoquePosterior(5, 6),
    /Estoque insuficiente/,
  );
});

test("impede quantidade negativa ou inválida", () => {
  assert.throws(
    () => calcularEstoquePosterior(10, -1),
    /não pode ser negativa/,
  );
  assert.throws(
    () => calcularEstoquePosterior("inválido", 1),
    /números válidos/,
  );
});

test("mantém singular e aplica plural das unidades conhecidas", () => {
  assert.equal(formatarUnidade("Caixa", 1), "Caixa");
  assert.equal(formatarUnidade("Caixa", 2), "Caixas");
  assert.equal(formatarUnidade("Kg", 2), "Kg");
  assert.equal(formatarUnidade("Bobina", 2), "Bobina");
});

test("prepara todos os itens de um romaneio sem alterar os materiais", () => {
  const materiais = [
    { _key: "papel", nome: "Papel", estoque: 20 },
    { _key: "caneta", nome: "Caneta", estoque: 8 },
  ];

  const resultado = prepararItensSaidaEstoque(
    [
      { materialId: "papel", nome: "Papel", quantidade: 5 },
      { materialId: "caneta", nome: "Caneta", quantidade: 3 },
    ],
    materiais,
  );

  assert.deepEqual(
    resultado.map((registro) => registro.estoquePosterior),
    [15, 5],
  );
  assert.equal(materiais[0].estoque, 20);
});

test("bloqueia material inexistente no romaneio", () => {
  assert.throws(
    () =>
      prepararItensSaidaEstoque(
        [{ materialId: "inexistente", nome: "Item", quantidade: 1 }],
        [],
      ),
    /não foi encontrado/,
  );
});

test("bloqueia o mesmo material duplicado", () => {
  const material = { _key: "papel", nome: "Papel", estoque: 20 };

  assert.throws(
    () =>
      prepararItensSaidaEstoque(
        [
          { materialId: "papel", quantidade: 2 },
          { materialId: "papel", quantidade: 3 },
        ],
        [material],
      ),
    /duplicado/,
  );
});
