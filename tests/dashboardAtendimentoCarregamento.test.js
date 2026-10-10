import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function iniciar({ modulos = ["INSUMOS", "MANUTENCAO"], falhaPerfil = false } = {}) {
  let autenticar;
  let liberarPerfil;
  const perfil = new Promise(resolve => { liberarPerfil = resolve; });
  const consultas = [];
  const elementos = new Map();
  function elemento(id) {
    if (!elementos.has(id)) elementos.set(id, {
      hidden: false, atributos: {}, innerHTML: "", textContent: "",
      setAttribute(nome, valor) { this.atributos[nome] = valor; },
      replaceChildren() { this.innerHTML = ""; }, append() {},
    });
    return elementos.get(id);
  }
  const codigo = readFileSync(new URL("../src/js/dashboardAtendimento.js", import.meta.url), "utf8")
    .replace(/import[\s\S]*?from\s+['"][^'"]+['"];/g, "");
  vm.runInNewContext(codigo, {
    auth: {}, db: {}, rtdb: {},
    onAuthStateChanged: (_, fn) => { autenticar = fn; },
    doc() {}, ref() {}, orderByChild() {}, equalTo() {}, query() {},
    getDoc: async () => {
      await perfil;
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
  return { autenticar, liberarPerfil, consultas, elementos };
}

test("cards mostram carregamento durante perfil e consultas, sem antecipar o resumo", async () => {
  const d = iniciar();
  const autenticacao = d.autenticar({ uid: "teste" });
  const painel = d.elementos.get("dashboardAtendimento");
  const lista = d.elementos.get("dashboardPedidosAtencao");
  assert.equal(painel.hidden, false);
  assert.equal(painel.atributos["aria-busy"], "true");
  assert.match(d.elementos.get("dashboard-recebidas").innerHTML, /see-spinner/);
  assert.match(lista.innerHTML, /see-spinner/);
  d.liberarPerfil();
  await autenticacao;
  d.consultas[0].receber({ val: () => ({}) });
  assert.equal(painel.atributos["aria-busy"], "true");
  d.consultas[1].receber({ val: () => ({}) });
  assert.equal(painel.atributos["aria-busy"], "false");
  assert.equal(d.elementos.get("dashboard-recebidas").textContent, 0);
  assert.equal(lista.innerHTML, "");
});

test("falhas encerram os indicadores e exibem mensagem", async () => {
  for (const falhaPerfil of [false, true]) {
    const d = iniciar({ falhaPerfil });
    d.liberarPerfil();
    await d.autenticar({ uid: "teste" });
    if (!falhaPerfil) {
      d.consultas[0].receber({ val: () => ({}) });
      d.consultas[1].falhar();
    }
    assert.equal(d.elementos.get("dashboardAtendimento").atributos["aria-busy"], "false");
    assert.equal(d.elementos.get("dashboard-recebidas").textContent, "—");
    assert.equal(d.elementos.get("dashboardPedidosAtencao").innerHTML, "");
  }
});

test("sem permissão oculta o painel e respostas de autenticação anterior não o reabrem", async () => {
  const d = iniciar({ modulos: [] });
  d.liberarPerfil();
  await d.autenticar({ uid: "teste" });
  assert.equal(d.elementos.get("dashboardAtendimento").hidden, true);
  assert.equal(d.consultas.length, 0);
  const outra = iniciar();
  const anterior = outra.autenticar({ uid: "teste" });
  await outra.autenticar(null);
  outra.liberarPerfil();
  await anterior;
  assert.equal(outra.elementos.get("dashboardAtendimento").hidden, true);
  assert.equal(outra.consultas.length, 0);
});
