import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Exclusivamente emulador local e namespace de demonstração, sem dados reais.
const base = "http://127.0.0.1:9109";
const ns = "demo-estoque-lotes";
async function request(path, method, body, admin = false) {
  return fetch(`${base}/${path}.json?ns=${ns}${admin ? "" : `&auth_variable_override=${encodeURIComponent(JSON.stringify({ uid: "operador", token: { email: "operador@example.test" } }))}`}`, {
    method, headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const regras = JSON.parse(readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"));
assert.equal((await request(".settings/rules", "PUT", regras, true)).status, 200);
const lote = saldo => ({ codigo: "Teste", saldo, quantidadeInicial: saldo, validade: "2099-12-31", entradaEm: "2026-10-08" });
assert.equal((await request("", "PUT", {
  controleAcesso: { usuarios: { operador: { ativo: true, perfil: "ADM" } } },
  materiais: { arroz: { nome: "Arroz", categoriaId: "comida", estoque: 15, controleLotes: true, lotes: { a: lote(10), b: lote(5) } } },
}, true)).status, 200);

const incremento = valor => ({ ".sv": { increment: valor } });
const saida = id => ({
  "materiais/arroz/estoque": incremento(-8),
  "materiais/arroz/lotes/a/saldo": incremento(-8),
  [`movimentacoes/${id}`]: { data: id, itens: [{ materialId: "arroz", quantidade: 8, lotes: [{ loteId: "a", quantidade: 8 }] }] },
  [`historicoEstoque/${id}`]: { tipo: "saida", quantidade: 8 },
});
const resultados = await Promise.all([request("", "PATCH", saida("um")), request("", "PATCH", saida("dois"))]);
assert.deepEqual(resultados.map(r => r.status).sort(), [200, 401]);
const salvo = await (await request("", "GET", undefined, true)).json();
assert.equal(salvo.materiais.arroz.estoque, 7);
assert.equal(salvo.materiais.arroz.lotes.a.saldo, 2);
assert.equal(Object.keys(salvo.movimentacoes).length, 1);
assert.equal(Object.keys(salvo.historicoEstoque).length, 1);

const id = Object.keys(salvo.movimentacoes)[0];
const estorno = {
  "materiais/arroz/estoque": incremento(8), "materiais/arroz/lotes/a/saldo": incremento(8),
  [`movimentacoes/${id}/cancelado`]: true,
};
assert.equal((await request("", "PATCH", estorno)).status, 200);
assert.equal((await request("", "PATCH", estorno)).status, 401);
const final = await (await request("materiais/arroz", "GET", undefined, true)).json();
assert.equal(final.estoque, 15);
assert.equal(final.lotes.a.saldo, 10);

assert.equal((await request("materiais/arroz/lotes/invalido", "PUT", { ...lote(1), validade: "inválida" })).status, 401);
console.log("Emulador: regras compiladas; concorrência, gravação atômica, estorno único e validação de lotes aprovados.");
