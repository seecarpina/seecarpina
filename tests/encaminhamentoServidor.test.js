import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const fonte = readFileSync(new URL("../src/js/servidores.js", import.meta.url), "utf8");
const inicio = fonte.indexOf("function gerarCartaRegistradaDoServidor(");
const fim = fonte.indexOf("function calcularPreenchimentoFicha(", inicio);
const codigo = fonte.slice(inicio, fim);

test("ver encaminhamento preserva o turno da transferência mesmo se o cadastro atual mudou", () => {
  for (const horario of ["MANHÃ", "TARDE", "NOITE", "INTEGRAL"]) {
    let dadosPDF;
    const contexto = {
      obterTransferenciaMaisRecente: () => ({ horario, para: "Escola de destino" }),
      gerarPDFTransferencia: dados => { dadosPDF = dados; },
      mostrarNotificacao: () => assert.fail("Carta registrada deveria ser encontrada"),
    };
    vm.runInNewContext(codigo, contexto);
    contexto.gerarCartaRegistradaDoServidor({ _key: "servidor-1", horario: "OUTRO TURNO" });
    assert.equal(dadosPDF.horario, horario);
  }
});

test("carta antiga sem turno registrado não assume o turno atual do servidor", () => {
  let dadosPDF;
  const contexto = {
    obterTransferenciaMaisRecente: () => ({ para: "Escola de destino" }),
    gerarPDFTransferencia: dados => { dadosPDF = dados; },
  };
  vm.runInNewContext(codigo, contexto);
  contexto.gerarCartaRegistradaDoServidor({ _key: "servidor-1", horario: "TARDE" });
  assert.equal(dadosPDF.horario, "");
});
