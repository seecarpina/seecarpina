import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const codigo = readFileSync(new URL("../secretaria/src/js/instalar-app.js", import.meta.url), "utf8");
function iniciar({ instalado = false, ios = false, adiado = false } = {}) {
  const eventos = {};
  const elementos = {};
  function elemento() {
    return { hidden: true, isConnected: true, atributos: {}, listeners: {},
      setAttribute(k, v) { this.atributos[k] = v; }, removeAttribute(k) { delete this.atributos[k]; },
      addEventListener(k, v) { this.listeners[k] = v; }, remove() { this.isConnected = false; },
      querySelector(k) { return elementos[k] ||= elemento(); } };
  }
  let aviso;
  const storage = new Map(adiado ? [["instalar-app:https://app.example/manifest.webmanifest", String(Date.now())]] : []);
  runInNewContext(codigo, {
    URL, Date,
    navigator: { userAgent: ios ? "iPhone" : "Android", platform: "", maxTouchPoints: 0 },
    localStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) },
    window: { matchMedia: q => ({ matches: q.includes("display-mode") ? instalado : true, addEventListener() {} }), addEventListener: (k,v) => eventos[k] = v },
    document: { currentScript: { src: "https://app.example/src/js/instalar-app.js" },
      querySelector: q => q.includes('rel="manifest"') ? { href: "https://app.example/manifest.webmanifest" } : { content: "SEE Carpina" },
      createElement: elemento, head: { appendChild() {} }, body: { appendChild(el) { aviso = el; } } },
  });
  return { eventos, elementos, aviso, storage };
}

test("app aberto em modo instalado e aviso adiado não mostram instalação", () => {
  assert.equal(iniciar({ instalado: true }).aviso, undefined);
  assert.equal(iniciar({ adiado: true }).aviso, undefined);
});

test("Android usa o evento nativo uma vez e remove aviso após aceite", async () => {
  const contexto = iniciar();
  let chamadas = 0;
  contexto.eventos.beforeinstallprompt({ preventDefault() {}, prompt: async () => chamadas++, userChoice: Promise.resolve({ outcome: "accepted" }) });
  assert.equal(contexto.elementos[".app-install-action"].textContent, "Instalar aplicativo");
  await contexto.elementos[".app-install-action"].listeners.click();
  assert.equal(chamadas, 1);
  assert.equal(contexto.aviso.isConnected, false);
});

test("iPhone mostra instrução de compartilhar ao tocar em Como instalar", async () => {
  const contexto = iniciar({ ios: true });
  await contexto.elementos[".app-install-action"].listeners.click();
  assert.equal(contexto.elementos[".app-install-help"].hidden, false);
  assert.match(contexto.elementos[".app-install-help"].textContent, /Compartilhar/);
});

test("Agora não dispensa o aviso por sete dias", () => {
  const contexto = iniciar();
  contexto.elementos[".app-install-later"].listeners.click();
  assert.equal(contexto.aviso.isConnected, false);
  assert.ok(Number(contexto.storage.get("instalar-app:https://app.example/manifest.webmanifest")) > 0);
});
