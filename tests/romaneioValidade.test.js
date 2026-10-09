import test from "node:test";
import assert from "node:assert/strict";
import { linhasValidadeRomaneio } from "../src/js/core/estoqueLotes.js";

const lote = { loteId: "legado", codigo: "Estoque anterior", quantidade: 2, saldo: 900, quantidadeInicial: 1000, validade: "2027-03-15" };

test("romaneio de alimentação mostra somente validade e quantidade entregue", () => {
  const linhas = linhasValidadeRomaneio({ alimentacao: true, unidade: "Kg", lotes: [lote] });
  assert.deepEqual(linhas, ["Validade: 15/03/2027 - Quantidade entregue: 2 Kg"]);
  assert.doesNotMatch(linhas.join(" "), /Estoque anterior|legado|900|1000/);
});

test("materiais não alimentares não exibem validade nem identificação de lote", () => {
  assert.deepEqual(linhasValidadeRomaneio({ alimentacao: false, lotes: [lote] }), []);
  assert.deepEqual(linhasValidadeRomaneio({ lotes: [lote] }), []);
});

test("lotes com a mesma validade são agrupados pela quantidade efetivamente entregue", () => {
  assert.deepEqual(linhasValidadeRomaneio({ alimentacao: true, unidade: "Kg", lotes: [lote, { ...lote, codigo: "Lote XYZ", quantidade: 3 }, { ...lote, quantidade: 1, validade: "2027-06-01" }] }), [
    "Validade: 15/03/2027 - Quantidade entregue: 5 Kg",
    "Validade: 01/06/2027 - Quantidade entregue: 1 Kg",
  ]);
});

test("reimpressão pode identificar alimentação pela categoria do material antigo", () => {
  assert.equal(linhasValidadeRomaneio({ unidade: "Kg", lotes: [lote] }, true).length, 1);
  assert.deepEqual(linhasValidadeRomaneio({ alimentacao: true, lotes: [] }), []);
});
