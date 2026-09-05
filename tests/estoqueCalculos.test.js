import test from "node:test";
import assert from "node:assert/strict";

import {
  calcularEstoquePosterior,
  formatarUnidade,
  obterQuantidadeNumerica,
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
