import test from "node:test";
import assert from "node:assert/strict";
import { prepararTabelaRolavel } from "../secretaria/src/js/componentes/tabelasRolaveis.js";

test("aviso acompanha carga, filtro e redimensionamento sem manter foco em tabela que cabe", () => {
  const callbacks={}; const attrs=new Map(); const tabela={}; let aviso;
  const wrapper={ clientWidth:300, scrollWidth:300, querySelector:()=>tabela,
    ownerDocument:{createElement:()=>({hidden:false})},
    insertAdjacentElement:(_,el)=>aviso=el,
    setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>{attrs.delete(k);if(k==="tabindex") delete wrapper.tabIndex;},
  };
  const ambiente={ ResizeObserver:class {constructor(fn){callbacks.resize=fn;} observe(){}},
    MutationObserver:class {constructor(fn){callbacks.mutation=fn;} observe(){}}, };
  prepararTabelaRolavel(wrapper,0,ambiente);
  assert.equal(aviso.hidden,true); assert.equal(wrapper.tabIndex,undefined);
  wrapper.scrollWidth=850; callbacks.mutation();
  assert.equal(aviso.hidden,false); assert.equal(wrapper.tabIndex,0); assert.equal(attrs.get("aria-describedby"),aviso.id);
  wrapper.clientWidth=1000; callbacks.resize();
  assert.equal(aviso.hidden,true); assert.equal(attrs.size,0);
  wrapper.clientWidth=0; callbacks.resize(); assert.equal(aviso.hidden,true);
  wrapper.clientWidth=300; callbacks.resize(); assert.equal(aviso.hidden,false);
  wrapper.scrollWidth=300; callbacks.mutation(); assert.equal(aviso.hidden,true);
});
