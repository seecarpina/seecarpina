import test from 'node:test';
import assert from 'node:assert/strict';
import { validarEntrada, ocultarCPFs, restaurarCPFs, mensagensRevisao } from '../secretaria/server/revisao.js';
import handler from '../secretaria/api/revisar-texto.js';

test('valida tamanho e formato e preserva o texto', () => {
  assert.throws(() => validarEntrada({texto: 'curto', tipo: 'oficio'}), /20/);
  assert.throws(() => validarEntrada({texto: 'a'.repeat(6001), tipo: 'oficio'}), /6.000/);
  assert.throws(() => validarEntrada({texto: 'a'.repeat(50), tipo: 'prompt'}), /válido/);
  assert.equal(validarEntrada({texto: '  Solicito análise do pedido apresentado.  ', tipo: 'email'}).texto, 'Solicito análise do pedido apresentado.');
});

test('CPF não segue para o provedor e marcador alterado rejeita resultado', () => {
  const original = 'CPF 123.456.789-00 e 98765432100. Ofício 039/2026.';
  const protegido = ocultarCPFs(original);
  assert.ok(!protegido.texto.includes('123.456.789-00'));
  assert.ok(!protegido.texto.includes('98765432100'));
  assert.equal(restaurarCPFs(protegido.texto, protegido.mapa), original);
  assert.throws(() => restaurarCPFs('Texto sem marcadores', protegido.mapa), /identificador/);
  assert.equal(mensagensRevisao(protegido.texto, 'oficio')[1].content, protegido.texto);
});

async function chamar(req) {
  const res = { headers: {}, setHeader(k,v) {this.headers[k]=v;}, status(code) {this.code=code;return this;}, json(body) {this.body=body;return this;} };
  await handler(req,res); return res;
}

test('API bloqueia método e ausência de sessão antes de chamar serviços', async () => {
  assert.equal((await chamar({method: 'GET', headers: {}})).code, 405);
  assert.equal((await chamar({method: 'POST', headers: {}, body: {}})).code, 401);
});

test('API valida acesso e trata resposta real sem expor CPF ao provedor', async t => {
  const originalFetch = globalThis.fetch;
  const chaveAnterior = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'chave-ficticia-de-teste';
  t.after(() => {globalThis.fetch = originalFetch; if(chaveAnterior === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY=chaveAnterior;});
  const req = {method: 'POST', headers: {authorization: 'Bearer token-ficticio'}, body: {tipo: 'oficio', texto: 'Solicito correção do cadastro, CPF 123.456.789-00.'}};
  let perfil = 'GESTOR_ESCOLAR';
  let groqChamadas = 0;
  globalThis.fetch = async (url, options) => {
    if(String(url).includes('accounts:lookup')) return {ok: true, json: async () => ({users:[{localId: 'usuario-teste'}]})};
    if(String(url).includes('firebaseio.com')) return {ok:true, json:async()=>({ativo:true, perfil})};
    groqChamadas++;
    const texto = JSON.parse(options.body).messages[1].content;
    assert.ok(!texto.includes('123.456.789-00'));
    return {ok:true, json:async()=>({choices:[{finish_reason:'stop',message:{content:texto}}]})};
  };
  assert.equal((await chamar(req)).code,403);
  assert.equal(groqChamadas,0);
  perfil='ADM';
  const resposta=await chamar(req);
  assert.equal(resposta.code,200);
  assert.equal(resposta.body.texto,req.body.texto);
  globalThis.fetch = async () => ({ok:false});
  assert.equal((await chamar(req)).code,401);
});
