import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

function preparar() {
  const elementos = new Map();
  const timers = new Map();
  let numero = 0;
  const doc = {
    activeElement: null,
    listeners: new Set(),
    getElementById: id => elementos.get(id),
    createElement: tag => criar(tag),
    addEventListener: (_, fn) => doc.listeners.add(fn),
    removeEventListener: (_, fn) => doc.listeners.delete(fn),
  };
  function criar(tag = "div", id) {
    const classes = new Set();
    const attrs = new Map();
    const listeners = new Map();
    const el = {
      id, tagName: tag.toUpperCase(), style: {}, hidden: false, isConnected: true,
      value: "", textContent: "", disabled: false,
      classList: { add: v => classes.add(v), remove: v => classes.delete(v), contains: v => classes.has(v) },
      setAttribute: (k,v) => attrs.set(k,v), getAttribute: k => attrs.get(k), removeAttribute: k => attrs.delete(k),
      addEventListener: (k,fn) => { if (!listeners.has(k)) listeners.set(k,new Set()); listeners.get(k).add(fn); },
      removeEventListener: (k,fn) => listeners.get(k)?.delete(fn),
      fire: k => [...(listeners.get(k) || [])].forEach(fn => fn({target:el})),
      focus: () => { doc.activeElement = el; },
      getClientRects: () => el.hidden || el.style.display === "none" ? [] : [{}],
      insertAdjacentElement: (_, child) => elementos.set(child.id,child),
      remove: () => { elementos.delete(el.id); el.isConnected = false; },
    };
    if (id) elementos.set(id,el);
    return el;
  }
  doc.body = criar();
  for (const id of ["dialogoGlobalOverlay", "dialogoGlobal", "dialogoGlobalTitulo", "dialogoGlobalMensagem", "dialogoGlobalIcone"]) criar("div",id);
  const cancelar = criar("button","dialogoGlobalCancelar");
  const confirmar = criar("button","dialogoGlobalConfirmar");
  const dialogo = elementos.get("dialogoGlobal");
  const campos = () => [elementos.get("dialogoGlobalPrompt"),cancelar,confirmar].filter(Boolean);
  dialogo.querySelectorAll = campos;
  dialogo.contains = el => el === dialogo || campos().includes(el);
  const origem = criar("button"); origem.focus();
  const contexto = { document:doc, window:{}, setTimeout: fn => { timers.set(++numero,fn); return numero; }, clearTimeout: id => timers.delete(id) };
  vm.runInNewContext(readFileSync(new URL("../src/js/dialogos.js",import.meta.url),"utf8"),contexto);
  function tecla(key, extra = {}) {
    const event = {key, shiftKey:false, ctrlKey:false, prevented:false, preventDefault(){this.prevented=true;},stopPropagation(){},...extra};
    [...doc.listeners].forEach(fn => fn(event));
    return event;
  }
  return { doc, elementos, origem, cancelar, confirmar, api:contexto.window, tecla, timers, flush: () => { for (const fn of timers.values()) fn(); timers.clear(); } };
}

test("Tab permanece na confirmação, Shift+Tab retorna ao último botão e Escape devolve foco",async () => {
  const h=preparar(); const p=h.api.mostrarConfirmacao(); h.flush();
  assert.equal(h.doc.activeElement,h.confirmar);
  assert.equal(h.tecla("Tab").prevented,true);
  assert.equal(h.doc.activeElement,h.cancelar);
  h.tecla("Tab",{shiftKey:true}); assert.equal(h.doc.activeElement,h.confirmar);
  h.tecla("Escape"); assert.equal(await p,false);
  assert.equal(h.doc.activeElement,h.origem); assert.equal(h.doc.listeners.size,0);
});

test("Enter com Cancelar selecionado não confirma a ação; o clique nativo cancela",async () => {
  const h=preparar(); const p=h.api.mostrarConfirmacao(); h.flush(); h.cancelar.focus();
  let resultado="pendente"; p.then(v=>resultado=v);
  h.tecla("Enter"); await Promise.resolve(); assert.equal(resultado,"pendente");
  h.cancelar.fire("click"); assert.equal(await p,false);
});

test("prompt obrigatório explica o erro, permite corrigir e envia texto com Ctrl+Enter",async () => {
  const h=preparar(); const p=h.api.mostrarPrompt({titulo:"Justificativa", obrigatorio:true}); h.flush();
  const input=h.elementos.get("dialogoGlobalPrompt"); const erro=h.elementos.get("dialogoGlobalPromptErro");
  assert.equal(input.getAttribute("aria-label"),"Justificativa"); assert.equal(input.required,true);
  h.confirmar.fire("click"); assert.equal(erro.hidden,false); assert.equal(input.getAttribute("aria-invalid"),"true");
  assert.equal(h.doc.activeElement,input);
  input.value="  Motivo informado\nsegunda linha  "; input.fire("input");
  assert.equal(erro.hidden,true); assert.equal(input.getAttribute("aria-invalid"),undefined);
  h.tecla("Enter"); assert.equal(input.isConnected,true);
  assert.equal(h.tecla("Enter",{ctrlKey:true}).prevented,true);
  assert.equal(await p,"Motivo informado\nsegunda linha"); assert.equal(h.doc.activeElement,h.origem);
  assert.equal(input.isConnected,false); assert.equal(erro.isConnected,false);
});

test("fechar antes do foco agendado evita foco em botão oculto e alerta ignora Cancelar oculto",async () => {
  const h=preparar(); const p=h.api.mostrarAlerta(); h.flush();
  h.tecla("Tab"); assert.equal(h.doc.activeElement,h.confirmar);
  h.confirmar.fire("click"); assert.equal(await p,true);
  const q=h.api.mostrarConfirmacao(); h.tecla("Escape"); assert.equal(await q,false);
  assert.equal(h.timers.size,0); h.flush(); assert.equal(h.doc.activeElement,h.origem);
});
