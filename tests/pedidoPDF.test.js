import test from "node:test";
import assert from "node:assert/strict";
import { gerarPDFPedidoSolicitacao, obterListaPedido } from "../gestao-escolar/src/js/pedidoPDF.js";

test("listas do pedido aceitam itens em array ou registros do Firebase", () => {
  assert.deepEqual(obterListaPedido({ a: { nome: "Papel" } }), [{ nome: "Papel" }]);
  assert.deepEqual(obterListaPedido([null, { nome: "Papel" }]), [{ nome: "Papel" }]);
  assert.deepEqual(obterListaPedido(null), []);
});

test("pedido ausente informa erro sem tentar gerar PDF", () => {
  globalThis.window = {};
  const mensagens = [];
  gerarPDFPedidoSolicitacao(null, { notificar: mensagem => mensagens.push(mensagem) });
  assert.deepEqual(mensagens, ["Solicitação não localizada."]);
  delete globalThis.window;
});

test("falha de carregamento do gerador informa erro", () => {
  globalThis.window = {};
  const mensagens = [];
  gerarPDFPedidoSolicitacao({ protocolo: "TESTE" }, { notificar: mensagem => mensagens.push(mensagem) });
  assert.deepEqual(mensagens, ["O gerador de PDF não foi carregado."]);
  delete globalThis.window;
});
