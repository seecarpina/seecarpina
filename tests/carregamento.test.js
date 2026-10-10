import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

const codigo = readFileSync(new URL("../src/js/componentes/carregamento.js", import.meta.url), "utf8");

function iniciar({ pronto = false, reduzir = false, aguardar = "", concluidos = [] } = {}) {
  const registro = new Map();
  let eventoLoad;
  const timers = [];
  const tela = { hidden: false, atributos: {}, getAttribute: nome => nome === "data-aguardar" ? aguardar : null, setAttribute(nome, valor) { this.atributos[nome] = valor; } };
  class Elemento {
    constructor() { this.atributos = {}; }
    getAttribute(nome) { return this.atributos[nome] ?? null; }
    setAttribute(nome, valor) {
      this.atributos[nome] = valor;
      if (this.constructor.observedAttributes.includes(nome)) this.attributeChangedCallback();
    }
  }
  const janela = { carregamentosConcluidos: concluidos, matchMedia: () => ({ matches: reduzir }), addEventListener: (nome, fn) => { assert.equal(nome, "load"); eventoLoad = fn; } };
  vm.runInNewContext(codigo, {
    HTMLElement: Elemento,
    customElements: { get: nome => registro.get(nome), define: (nome, classe) => registro.set(nome, classe) },
    document: { readyState: pronto ? "complete" : "interactive", querySelectorAll: () => [tela] },
    window: janela,
    console: { warn() {} },
    clearTimeout: id => { if (id !== undefined) timers[id].cancelado = true; },
    setTimeout: (fn, tempo) => { timers.push({ fn, tempo }); return timers.length - 1; },
  });
  return { Spinner: registro.get("see-spinner"), tela, timers, carregar: () => eventoLoad(), concluir: nome => janela.carregamentoPagina.concluir(nome), liberar: () => janela.carregamentoPagina.liberar() };
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
  const raiz = new URL("../", import.meta.url);
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


test("load aguarda os gráficos e links; respostas repetidas não encerram duas vezes", () => {
  const d = iniciar({ aguardar: "oficios contratos links" });
  d.carregar();
  d.concluir("oficios");
  d.concluir("oficios");
  d.concluir("contratos");
  assert.equal(d.tela.atributos["data-concluido"], undefined);
  d.concluir("links");
  assert.equal(d.tela.atributos["data-concluido"], "");
  assert.equal(d.timers[0].cancelado, true);
  d.concluir("links");
  assert.equal(d.timers.length, 2);
});

test("dados prontos antes do load ainda aguardam a página e conclusões anteriores ao componente são preservadas", () => {
  const d = iniciar({ aguardar: "datas links", concluidos: ["datas"] });
  d.concluir("links");
  assert.equal(d.tela.atributos["data-concluido"], undefined);
  d.carregar();
  assert.equal(d.tela.atributos["data-concluido"], "");
});

test("serviço sem resposta libera a tela no limite de segurança", () => {
  const d = iniciar({ pronto: true, aguardar: "links" });
  assert.equal(d.timers[0].tempo, 30000);
  assert.equal(d.tela.atributos["data-concluido"], undefined);
  d.timers[0].fn();
  d.timers[1].fn();
  assert.equal(d.tela.hidden, true);
});

test("home declara as áreas de dados que devem estar prontas", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const nomes = html.match(/class="loading" data-aguardar="([^"]+)"/)[1].split(" ");
  assert.deepEqual(nomes.sort(), ["usuario", "lateral", "links", "frase", "datas", "calendario-datas", "calendario-eventos", "contratos", "oficios", "atendimento"].sort());
});


test("aviso que exige interação pode liberar a tela sem aguardar os dados", () => {
  const d = iniciar({ aguardar: "usuario links" });
  d.liberar();
  assert.equal(d.tela.atributos["data-concluido"], "");
  assert.equal(d.timers[0].cancelado, true);
});

test("sinalizador guarda conclusões antes do componente e encaminha as seguintes", () => {
  const janela = {};
  const helper = readFileSync(new URL("../src/js/core/carregamentoPagina.js", import.meta.url), "utf8").replace("export function", "function");
  const contexto = { window: janela };
  vm.runInNewContext(helper, contexto);
  contexto.concluirCarregamento("datas");
  assert.equal(janela.carregamentosConcluidos[0], "datas");
  const nomes = [];
  janela.carregamentoPagina = { concluir: nome => nomes.push(nome) };
  contexto.concluirCarregamento("links");
  assert.deepEqual(nomes, ["links"]);
});
