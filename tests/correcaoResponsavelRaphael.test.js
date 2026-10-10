import test from "node:test";
import assert from "node:assert/strict";
import { listarResponsaveisRaphael, corrigirNomeRaphael } from "../src/js/core/correcaoResponsavelRaphael.js";

test("localiza somente Raphael em ofícios e circulares de todos os anos", () => {
  const bases = {
    oficios: { 2024: { a: { responsavel: "Raphael", numero: 1 }, b: { responsavel: "Raphael Silva" } }, 2026: { c: { responsavel: "Raphael" }, d: { responsavel: "Luiz" }, e: { responsavel: "Raphael Souza" }, f: { responsavel: " Raphael " } } },
    oficiosCirculares: { 2025: { g: { responsavel: "Raphael" }, h: {} } },
  };
  const original = structuredClone(bases);
  assert.deepEqual(listarResponsaveisRaphael(bases).map(r => r.caminho), ["oficios/2024/a/responsavel", "oficios/2026/c/responsavel", "oficiosCirculares/2025/g/responsavel"]);
  assert.deepEqual(bases, original);
  assert.deepEqual(listarResponsaveisRaphael({}), []);
});

test("transação permite cache vazio e ignora responsável alterado ou removido", () => {
  assert.equal(corrigirNomeRaphael(null), null);
  assert.equal(corrigirNomeRaphael("Raphael"), "Raphael Silva");
  for (const nome of ["Raphael Silva", "Raphael Souza", "Maria", ""]) assert.equal(corrigirNomeRaphael(nome), undefined);
});

test("segunda execução não encontra registros já corrigidos", () => {
  assert.equal(listarResponsaveisRaphael({ oficios: { 2026: { a: { responsavel: "Raphael Silva" } } } }).length, 0);
});

import { readFileSync } from "node:fs";
import vm from "node:vm";

function prepararExecucao({ logado = true, falhar = false } = {}) {
  let gravacoes = 0;
  const contexto = {
    auth: { currentUser: logado ? { uid: "operador" } : null }, rtdb: {},
    ref: (_, caminho) => caminho,
    get: async caminho => ({ val: () => caminho === "oficios" ? { 2026: { a: { responsavel: "Raphael" } } } : null }),
    runTransaction: async (_, corrigir, opcoes) => {
      gravacoes++;
      assert.equal(opcoes.applyLocally, false);
      if (falhar) throw new Error("Permissão negada");
      assert.equal(corrigir(null), null);
      return { committed: true, snapshot: { val: () => corrigir("Raphael") } };
    },
    listarResponsaveisRaphael, corrigirNomeRaphael,
    console: { table() {}, info() {} },
  };
  const codigo = readFileSync(new URL("../src/js/corrigirResponsavelRaphael.js", import.meta.url), "utf8").replace(/^import .*;\n/gm, "").replace(/export /g, "");
  vm.runInNewContext(codigo, contexto);
  return { executar: contexto.corrigirResponsavelRaphael, gravacoes: () => gravacoes };
}

test("prévia padrão não grava e aplicação explícita corrige", async () => {
  const d = prepararExecucao();
  const previa = await d.executar();
  assert.equal(previa.encontrados, 1);
  assert.equal(d.gravacoes(), 0);
  await d.executar({ aplicar: "true" });
  assert.equal(d.gravacoes(), 0);
  const resultado = await d.executar({ aplicar: true });
  assert.equal(resultado.alterados, 1);
  assert.equal(d.gravacoes(), 1);
});

test("execução sem sessão falha e erro de permissão fica no relatório", async () => {
  const semSessao = prepararExecucao({ logado: false });
  await assert.rejects(semSessao.executar({ aplicar: true }), /Entre no sistema/);
  assert.equal(semSessao.gravacoes(), 0);
  const d = prepararExecucao({ falhar: true });
  const resultado = await d.executar({ aplicar: true });
  assert.equal(resultado.alterados, 0);
  assert.equal(resultado.falhas[0].caminho, "oficios/2026/a/responsavel");
});
