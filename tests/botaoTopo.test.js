import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const fonte = readFileSync(new URL("../src/js/scripts.js", import.meta.url), "utf8");
const inicio = fonte.indexOf('const btnTopo = document.getElementById("btnTopo");');
const fim = fonte.indexOf('const inputData =', inicio);

function preparar(scrollY = 0) {
  const atributos = {};
  const classes = new Set();
  const eventos = {};
  let quadro;
  const botao = {
    classList: { toggle: (nome, ativar) => ativar ? classes.add(nome) : classes.delete(nome) },
    setAttribute: (nome, valor) => atributos[nome] = valor,
    addEventListener: (nome, fn) => eventos[nome] = fn,
    blur: () => contexto.document.activeElement = null,
  };
  const contexto = {
    document: { getElementById: () => botao, activeElement: null },
    window: { scrollY, addEventListener: (_, fn) => eventos.scroll = fn, scrollTo: (_, y) => contexto.window.scrollY = y },
    performance: { now: () => 0 },
    requestAnimationFrame: fn => quadro = fn,
  };
  vm.runInNewContext(fonte.slice(inicio, fim), contexto);
  return { contexto, botao, atributos, classes, eventos, terminarAnimacao: () => quadro(800) };
}

test("botão inicia oculto e sem foco, e aparece somente após 300 pixels", () => {
  const d = preparar();
  assert.equal(d.atributos["aria-hidden"], "true");
  assert.equal(d.atributos.tabindex, "-1");
  for (const y of [300, 301, 0]) {
    d.contexto.window.scrollY = y;
    d.eventos.scroll();
    assert.equal(d.classes.has("visivel"), y > 300);
    assert.equal(d.atributos.tabindex, y > 300 ? "0" : "-1");
    assert.equal(d.atributos["aria-hidden"], String(y <= 300));
  }
});

test("página restaurada com rolagem mostra botão e esconder remove foco existente", () => {
  const d = preparar(500);
  assert.equal(d.classes.has("visivel"), true);
  d.contexto.document.activeElement = d.botao;
  d.contexto.window.scrollY = 100;
  d.eventos.scroll();
  assert.equal(d.contexto.document.activeElement, null);
});

test("chamada programática usada por formulários continua voltando ao topo mesmo oculto", () => {
  const d = preparar(200);
  assert.equal(d.classes.has("visivel"), false);
  d.eventos.click();
  d.terminarAnimacao();
  assert.equal(d.contexto.window.scrollY, 0);
});
