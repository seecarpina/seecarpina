import test from "node:test";
import assert from "node:assert/strict";

import {
  observacaoEhObrigatoria,
  obterTransicoesPermitidas,
  validarEntregaMateriais,
} from "../src/js/core/solicitacoesRegras.js";

const itens = [
  { materialId: "papel", nome: "Papel", unidade: "Resma", quantidadeSolicitada: 10 },
  { materialId: "caneta", nome: "Caneta", unidade: "Caixa", quantidadeSolicitada: 5 },
];

test("permite somente as transições previstas no fluxo", () => {
  assert.deepEqual(obterTransicoesPermitidas("RECEBIDA"), ["EM_ATENDIMENTO"]);
  assert.deepEqual(
    obterTransicoesPermitidas("EM_ATENDIMENTO"),
    ["AGUARDANDO_CONFIRMACAO"],
  );
  assert.deepEqual(obterTransicoesPermitidas("CONCLUIDA"), []);
  assert.deepEqual(obterTransicoesPermitidas("DESCONHECIDA"), []);
});

test("entrega total usa integralmente as quantidades solicitadas", () => {
  const resultado = validarEntregaMateriais({
    itensSolicitados: itens,
    tipoAtendimento: "TOTAL",
  });

  assert.equal(resultado.quantidadeTotalEntregue, 15);
  assert.deepEqual(
    resultado.itensEntregues.map((item) => item.quantidadeEntregue),
    [10, 5],
  );
});

test("entrega parcial aceita quantidades menores", () => {
  const resultado = validarEntregaMateriais({
    itensSolicitados: itens,
    quantidadesInformadas: [6, 2],
    tipoAtendimento: "PARCIAL",
  });

  assert.equal(resultado.quantidadeTotalEntregue, 8);
});

test("bloqueia entrega acima do solicitado", () => {
  assert.throws(
    () =>
      validarEntregaMateriais({
        itensSolicitados: itens,
        quantidadesInformadas: [11, 0],
        tipoAtendimento: "PARCIAL",
      }),
    /não pode ser maior/,
  );
});

test("bloqueia entrega parcial vazia ou integral", () => {
  assert.throws(
    () =>
      validarEntregaMateriais({
        itensSolicitados: itens,
        quantidadesInformadas: [0, 0],
        tipoAtendimento: "PARCIAL",
      }),
    /pelo menos um material/,
  );

  assert.throws(
    () =>
      validarEntregaMateriais({
        itensSolicitados: itens,
        quantidadesInformadas: [10, 5],
        tipoAtendimento: "PARCIAL",
      }),
    /Entrega completa/,
  );
});

test("exige observação somente no atendimento parcial pendente", () => {
  assert.equal(
    observacaoEhObrigatoria("AGUARDANDO_CONFIRMACAO", "PARCIAL"),
    true,
  );
  assert.equal(
    observacaoEhObrigatoria("AGUARDANDO_CONFIRMACAO", "TOTAL"),
    false,
  );
  assert.equal(observacaoEhObrigatoria("EM_ATENDIMENTO", "PARCIAL"), false);
});
