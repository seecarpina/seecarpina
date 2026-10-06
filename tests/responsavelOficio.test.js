import test from "node:test";
import assert from "node:assert/strict";
import { primeiroEUltimoNome, podeEditarOficio } from "../src/js/core/responsavelOficio.js";

test("responsável usa primeiro e último nome e normaliza espaços", () => {
  assert.equal(primeiroEUltimoNome("  Luiz   Carlos da Silva  "), "Luiz Silva");
  assert.equal(primeiroEUltimoNome("Maria\n de Souza"), "Maria Souza");
  assert.equal(primeiroEUltimoNome("Adriana"), "Adriana");
  assert.equal(primeiroEUltimoNome(null), "Usuário");
  assert.equal(primeiroEUltimoNome("   "), "Usuário");
});

test("novos registros identificam autor pelo UID mesmo com nomes iguais", () => {
  const registro = {responsavel: "Luiz Silva", responsavelUid: "autor"};
  assert.equal(podeEditarOficio(registro, "Luiz Silva", "autor"), true);
  assert.equal(podeEditarOficio(registro, "Luiz Silva", "outro"), false);
  assert.equal(podeEditarOficio(registro, "Luiz Silva", null), false);
});

test("preserva edição legada e exceção existente de Raphael", () => {
  assert.equal(podeEditarOficio({responsavel: "Maria"}, "Maria Souza", "uid"), true);
  assert.equal(podeEditarOficio({responsavel: "Maria Souza"}, "Maria Souza", "uid"), true);
  assert.equal(podeEditarOficio({responsavel: "Luiz"}, "Maria Souza", "uid"), false);
  assert.equal(podeEditarOficio({}, "Maria Souza", "uid"), true);
  assert.equal(podeEditarOficio({responsavelUid: "outro"}, "Raphael Cardoso", "uid"), true);
});
