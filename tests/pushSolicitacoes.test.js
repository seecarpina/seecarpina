import test from "node:test";
import assert from "node:assert/strict";
import { podeReceberPedido, criarAvisoPedido } from "../functions/regrasPush.js";

const usuario = { uid: "agente", perfil: "ALMOXARIFADO", ativo: true };
const permissoes = { ALMOXARIFADO: { modulos: { materiaisExpediente: true } } };
test("push vai somente ao perfil com acesso ao módulo do novo pedido", () => {
  assert.equal(podeReceberPedido(usuario, permissoes, "MATERIAIS_EXPEDIENTE", "gestor"), true);
  assert.equal(podeReceberPedido(usuario, permissoes, "INSUMOS", "gestor"), false);
  assert.equal(podeReceberPedido(usuario, permissoes, "DESCONHECIDO", "gestor"), false);
});
test("push exclui inativos, gestores e o próprio solicitante", () => {
  for (const alteracao of [{ ativo: false }, { perfil: "GESTOR_ESCOLAR" }, { uid: "gestor" }]) {
    assert.equal(podeReceberPedido({ ...usuario, ...alteracao }, permissoes, "MATERIAIS_EXPEDIENTE", "gestor"), false);
  }
});
test("administrador e perfil com todas as permissões recebem pedidos", () => {
  assert.equal(podeReceberPedido({ ...usuario, perfil: "ADM" }, {}, "INSUMOS", "gestor"), true);
  assert.equal(podeReceberPedido(usuario, { ALMOXARIFADO: { todas: true } }, "INSUMOS", "gestor"), true);
});
test("notificação preserva dados pessoais e aponta ao pedido exato", () => {
  const aviso = criarAvisoPedido("pedido-123", { escolaNome: "Escola privada", justificativa: "Informação sensível" }, "https://secretaria.example");
  assert.equal(new URL(aviso.url).searchParams.get("pedido"), "pedido-123");
  assert.equal(new URL(aviso.url).pathname, "/solicitacoes.html");
  assert.equal(aviso.tag, "solicitacao-pedido-123");
  assert.doesNotMatch(JSON.stringify(aviso), /Informação sensível|Escola privada/);
});
