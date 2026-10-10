import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function iniciar({ modulos = ["INSUMOS", "MANUTENCAO"], falhaPerfil = false } = {}) {
  let autenticar;
  const concluidos = [];
  const consultas = [];
  const elementos = new Map();
  function elemento(id) {
    if (!elementos.has(id)) elementos.set(id, {
      hidden: true, textContent: "", replaceChildren() {}, append() {},
    });
    return elementos.get(id);
  }
  const codigo = readFileSync(new URL("../src/js/dashboardAtendimento.js", import.meta.url), "utf8")
    .replace(/import[\s\S]*?from\s+['"][^'"]+['"];/g, "");
  vm.runInNewContext(codigo, {
    auth: {}, db: {}, rtdb: {},
    concluirCarregamento: nome => concluidos.push(nome),
    onAuthStateChanged: (_, fn) => { autenticar = fn; },
    doc() {}, ref() {}, orderByChild() {}, equalTo() {}, query() {},
    getDoc: async () => {
      if (falhaPerfil) throw new Error("Perfil indisponível");
      return { exists: () => true, data: () => ({ cargo: "ADMINISTRADOR", ativo: true }) };
    },
    get: async () => ({ val: () => ({}) }),
    modulosDashboardPermitidos: () => modulos,
    onValue: (_, receber, falhar) => { consultas.push({ receber, falhar }); return () => {}; },
    resumirAtendimento: () => ({ totalAberto: 0, atencao: [], recebidas: 0, atendimento: 0, confirmacao: 0, urgentes: 0 }),
    document: { getElementById: elemento, createElement: () => elemento(Symbol()) },
    console: { error() {} },
  });
  return { autenticar, consultas, concluidos, elementos };
}

test("atendimento aguarda todos os módulos, inclusive quando uma consulta falha", async () => {
  const d = iniciar();
  await d.autenticar({ uid: "teste" });
  assert.deepEqual(d.concluidos, []);
  d.consultas[0].receber({ val: () => ({}) });
  assert.deepEqual(d.concluidos, []);
  d.consultas[1].falhar();
  assert.deepEqual(d.concluidos, ["atendimento"]);
  assert.match(d.elementos.get("dashboardAtendimentoMensagem").textContent, /Não foi possível/);
});

test("atendimento sinaliza prontidão após renderizar o resumo", async () => {
  const d = iniciar();
  await d.autenticar({ uid: "teste" });
  for (const consulta of d.consultas) consulta.receber({ val: () => ({}) });
  assert.deepEqual(d.concluidos, ["atendimento"]);
  assert.match(d.elementos.get("dashboardAtendimentoMensagem").textContent, /0 pedidos/);
});

test("sem permissão ou com falha de perfil a home não espera consultas que não vão iniciar", async () => {
  for (const opcoes of [{ modulos: [] }, { falhaPerfil: true }]) {
    const d = iniciar(opcoes);
    await d.autenticar({ uid: "teste" });
    assert.equal(d.consultas.length, 0);
    assert.deepEqual(d.concluidos, ["atendimento"]);
  }
});
