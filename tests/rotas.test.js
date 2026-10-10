import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { normalizarCaminhoPagina, normalizarLinkInterno } from "../src/js/core/rotas.js";

const origem = "https://www.seecarpina.online";

test("links de pedido perdem a extensão e preservam parâmetros e fragmentos", () => {
  assert.equal(normalizarLinkInterno("./solicitacoes.html?pedido=-P0gVZ_9rLCywlRrkA55", origem + "/"), "/solicitacoes?pedido=-P0gVZ_9rLCywlRrkA55");
  assert.equal(normalizarLinkInterno("./solicitacoes.html?prioridade=URGENTE&abertos=1#detalhes", origem + "/index"), "/solicitacoes?prioridade=URGENTE&abertos=1#detalhes");
  assert.equal(normalizarLinkInterno("./insumos.html#historico", origem + "/gestao-escolar/"), "/gestao-escolar/insumos#historico");
  assert.equal(normalizarLinkInterno(origem + "/oficios.html?ano=2026", origem + "/"), "/oficios?ano=2026");
});

test("links externos, arquivos e fragmentos não são alterados", () => {
  for (const href of ["https://outro.site/oficios.html", "./src/downloads/documento.pdf", "#historico", "mailto:contato@example.com", "./oficios?ano=2026"]) {
    assert.equal(normalizarLinkInterno(href, origem + "/"), href);
  }
});

function ativar(urlAtual, hrefs) {
  const links = hrefs.map(href => ({
    active: false, getAttribute: () => href,
    classList: { remove() { links.find(l => l.classList === this).active = false; }, add() { links.find(l => l.classList === this).active = true; } },
  }));
  const codigo = readFileSync(new URL("../src/js/include.js", import.meta.url), "utf8");
  const inicio = codigo.indexOf("export function ativarLinkAtual()");
  const fim = codigo.indexOf('import { initChat }', inicio);
  const contexto = { URL, normalizarCaminhoPagina, window: { location: new URL(urlAtual) }, document: { querySelectorAll: () => links } };
  vm.runInNewContext(codigo.slice(inicio, fim).replace("export function", "function"), contexto);
  contexto.ativarLinkAtual();
  return links.map(link => link.active);
}

test("menu fica ativo com ou sem extensão, inclusive com parâmetros no pedido", () => {
  for (const pagina of ["/solicitacoes?pedido=teste", "/solicitacoes.html?pedido=teste", "/solicitacoes/"]) {
    assert.deepEqual(ativar(origem + pagina, ["./solicitacoes", "/oficios", "https://outro.site/solicitacoes", "#", "http://["]), [true, false, false, false, false]);
  }
  assert.deepEqual(ativar(origem + "/solicitacoes", ["./solicitacoes.html"]), [true]);
});

test("home e páginas de subdiretório identificam o item correto no menu", () => {
  assert.deepEqual(ativar(origem + "/index.html", ["./", "/servidores"]), [true, false]);
  assert.deepEqual(ativar(origem + "/gestao-escolar/insumos", ["./insumos.html#historico", "/insumos"]), [true, false]);
});

test("as duas publicações usam URLs limpas e templates continuam sendo arquivos HTML", () => {
  for (const caminho of ["../vercel.json", "../gestao-escolar/vercel.json"]) {
    const config = JSON.parse(readFileSync(new URL(caminho, import.meta.url), "utf8"));
    assert.equal(config.cleanUrls, true);
    assert.equal(config.rewrites, undefined);
  }
  const codigo = readFileSync(new URL("../src/js/include.js", import.meta.url), "utf8");
  assert.match(codigo, /fetch\("\/src\/template\/sidebar\.html"\)/);
});
