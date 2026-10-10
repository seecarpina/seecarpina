import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { criarMemoriaConsulta, normalizarConsultaOficios, normalizarConsultaServidores } from "../secretaria/src/js/core/memoriaConsulta.js";

function storage() {
  const dados=new Map(); return {dados,getItem:k=>dados.get(k)||null,setItem:(k,v)=>dados.set(k,v)};
}

test("consulta sobrevive à navegação e separa usuários e módulos nesta sessão",()=>{
  const s=storage(); let uid="A";
  const oficios=criarMemoriaConsulta("oficios",()=>uid,()=>s);
  oficios.salvar({busca:"MERENDA",pagina:3});
  assert.deepEqual(criarMemoriaConsulta("oficios",()=>uid,()=>s).ler(),{busca:"MERENDA",pagina:3});
  assert.equal(criarMemoriaConsulta("servidores",()=>uid,()=>s).ler(),null);
  uid="B"; assert.equal(oficios.ler(),null); oficios.salvar({pagina:2});
  uid="A"; assert.equal(oficios.ler().pagina,3);
  uid=null; oficios.salvar({pagina:9}); assert.equal(oficios.ler(),null);
  assert.equal(s.dados.size,2);
});

test("armazenamento bloqueado ou corrompido não impede consultar os dados",()=>{
  const memoria=criarMemoriaConsulta("oficios",()=>"A",()=>{throw Error("bloqueado");});
  assert.equal(memoria.ler(),null); assert.doesNotThrow(()=>memoria.salvar({pagina:2}));
  for(const valor of ["{quebrado","null","[]","42"]){
    const m=criarMemoriaConsulta("oficios",()=>"A",()=>({getItem:()=>valor}));
    assert.equal(m.ler(),null);
  }
});

test("ofícios preservam filtros completos e período intencionalmente vazio; primeira visita usa hoje",()=>{
  const estado={ano:"2025",busca:"Escola",disponiveis:true,inicio:"2025-02-01",fim:"2025-11-30",pagina:4};
  assert.deepEqual(normalizarConsultaOficios(estado,2026,"2026-10-10"),estado);
  assert.equal(normalizarConsultaOficios(null,2026,"2026-10-10").fim,"2026-10-10");
  assert.equal(normalizarConsultaOficios({...estado,ano:"2026",inicio:"",fim:""},2026,"2026-10-10").fim,"");
});

test("estado inválido não injeta ano fora do catálogo, datas impossíveis ou página inválida",()=>{
  const estado=normalizarConsultaOficios({ano:"2099",inicio:"2026-02-30",fim:"2025-12-31",pagina:-2,busca:42,disponiveis:"true"},2026,"2026-10-10");
  assert.deepEqual(estado,{ano:"2026",inicio:"",fim:"",pagina:1,busca:"",disponiveis:false});
  const invertido=normalizarConsultaOficios({ano:"2026",inicio:"2026-10-10",fim:"2026-01-01"},2026,"2026-10-10");
  assert.equal(invertido.inicio,"");assert.equal(invertido.fim,"");
  assert.equal(normalizarConsultaServidores({pendencia:"inexistente",pagina:1.5},["todos","ativos"]).pendencia,"todos");
  assert.deepEqual(normalizarConsultaServidores({busca:"Maria",pendencia:"ativos",pagina:2},["todos","ativos"]),{busca:"Maria",pendencia:"ativos",pagina:2});
});

test("inicialização de ofícios restaura o ano antes da consulta e mantém página durante a carga",()=>{
  const fonte=readFileSync(new URL("../secretaria/src/js/oficios.js",import.meta.url),"utf8");
  const filtroAno={value:"2026",innerHTML:"",appendChild(){}};
  const ctx={filtroAno,ANO_ATUAL:"2026", memoriaConsulta:{ler:()=>({ano:"2025",busca:"Escola",disponiveis:true,inicio:"2025-03-01",fim:"2025-04-30",pagina:4})},normalizarConsultaOficios,
    inputBusca:{},filtroDisponiveis:{},filtroDataInicio:{},filtroDataFim:{},anoSelecionado:"2026",paginaAtual:1,
    atualizarLimitesPeriodo(){},carregarOficiosPorAno(){ctx.anoConsultado=ctx.anoSelecionado;},
    document:{createElement:()=>({})}, };
  const inicio=fonte.indexOf("function carregarAnosDisponiveis()"); const fim=fonte.indexOf('filtroAno?.addEventListener("change"',inicio);
  vm.runInNewContext(fonte.slice(inicio,fim),ctx);ctx.carregarAnosDisponiveis();
  assert.equal(ctx.anoConsultado,"2025");assert.equal(filtroAno.value,"2025");assert.equal(ctx.paginaAtual,4);
  assert.equal(ctx.inputBusca.value,"Escola");assert.equal(ctx.filtroDisponiveis.checked,true);
  assert.equal(ctx.filtroDataInicio.value,"2025-03-01");
  const a=fonte.indexOf("function carregarOficiosPorAno()"); const b=fonte.indexOf("function validarPeriodo()",a);
  Object.assign(ctx,{pararEscutaOficios:null,carregandoOficios:false, renderTabela(){ctx.paginaDuranteCarga=ctx.paginaAtual;}, getOficiosRef:()=>"oficios/2025",onValue:()=>()=>{}});
  vm.runInNewContext(fonte.slice(a,b),ctx);ctx.carregarOficiosPorAno();
  assert.equal(ctx.paginaDuranteCarga,4);assert.equal(ctx.carregandoOficios,true);
});
