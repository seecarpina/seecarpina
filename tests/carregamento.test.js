import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

const codigo = readFileSync(new URL("../secretaria/src/js/componentes/carregamento.js", import.meta.url), "utf8");

function iniciar({ pronto = false, reduzir = false } = {}) {
  const registro = new Map();
  let eventoLoad;
  const timers = [];
  const tela = { hidden: false, atributos: {}, setAttribute(nome, valor) { this.atributos[nome] = valor; } };
  class Elemento {
    constructor() { this.atributos = {}; }
    getAttribute(nome) { return this.atributos[nome] ?? null; }
    setAttribute(nome, valor) {
      this.atributos[nome] = valor;
      if (this.constructor.observedAttributes.includes(nome)) this.attributeChangedCallback();
    }
  }
  vm.runInNewContext(codigo, {
    HTMLElement: Elemento,
    customElements: { get: nome => registro.get(nome), define: (nome, classe) => registro.set(nome, classe) },
    document: { readyState: pronto ? "complete" : "interactive", querySelectorAll: () => [tela] },
    window: { matchMedia: () => ({ matches: reduzir }), addEventListener: (nome, fn) => { assert.equal(nome, "load"); eventoLoad = fn; } },
    setTimeout: (fn, tempo) => timers.push({ fn, tempo }),
  });
  return { Spinner: registro.get("see-spinner"), tela, timers, carregar: () => eventoLoad() };
}

test("componente criado dinamicamente tem estado acessível e acompanha mudança de mensagem", () => {
  const d = iniciar();
  const spinner = new d.Spinner();
  spinner.connectedCallback();
  assert.equal(spinner.getAttribute("role"), "status");
  assert.equal(spinner.getAttribute("aria-label"), "Carregando");
  spinner.setAttribute("mensagem", "Carregando materiais");
  assert.equal(spinner.getAttribute("aria-label"), "Carregando materiais");
});

test("tela inicial é encerrada no load e ocultada ao terminar a saída", () => {
  const d = iniciar();
  assert.equal(d.timers.length, 0);
  assert.equal(d.tela.hidden, false);
  d.carregar();
  assert.equal(d.tela.atributos["data-concluido"], "");
  assert.equal(d.timers[0].tempo, 180);
  d.timers[0].fn();
  assert.equal(d.tela.hidden, true);
});

test("inicialização tardia não deixa tela presa e movimento reduzido evita atraso", () => {
  for (const reduzir of [false, true]) {
    const d = iniciar({ pronto: true, reduzir });
    assert.equal(d.timers[0].tempo, reduzir ? 0 : 180);
    d.timers[0].fn();
    assert.equal(d.tela.hidden, true);
  }
});

test("todas as páginas do portal que usam spinner carregam o componente compartilhado", () => {
  const raiz = new URL("../secretaria/", import.meta.url);
  const paginas = readdirSync(raiz).filter(nome => nome.endsWith(".html"));
  let quantidade = 0;
  for (const nome of paginas) {
    const html = readFileSync(new URL(nome, raiz), "utf8");
    if (!html.includes("<see-spinner")) continue;
    quantidade++;
    assert.match(html, /<script defer src="\.\/src\/js\/componentes\/carregamento\.js"><\/script>/, nome);
    assert.ok(!html.includes("svg-spinner"), nome);
  }
  assert.equal(quantidade, 19);
});
