import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { obterPedidoMaterialAberto } from "../gestao-escolar/src/js/regrasPedidosMateriais.js";

const abertos = ["RECEBIDA", "EM_ANALISE", "APROVADA", "EM_ATENDIMENTO", "AGUARDANDO_CONFIRMACAO"];
const encerrados = ["CONCLUIDA", "ATENDIDA_PARCIALMENTE", "CANCELADA", "INDEFERIDA"];
const abas = [["materiais-expediente", "MATERIAIS_EXPEDIENTE"], ["materiais-limpeza", "MATERIAIS_LIMPEZA"]];
const pedido = (modulo, status) => ({ id: "anterior", modulo, status, escolaId: "escola-1", solicitanteUid: "outro-gestor", protocolo: "PED-001", itens: [{ materialId: "papel" }] });

function iniciar(nome, registros) {
  const fonte = readFileSync(new URL(`../gestao-escolar/src/js/${nome}.js`, import.meta.url), "utf8");
  const bloqueio = fonte.slice(fonte.indexOf("function atualizarBloqueioNovaSolicitacao()"), fonte.indexOf("function formatarQuantidadeMaterial"));
  const envio = fonte.slice(fonte.indexOf("function alterarEstadoEnvio("), fonte.indexOf('form.addEventListener("submit"'));
  const c = { obterPedidoMaterialAberto, solicitacoesEscola: registros, dadosGestorAtual: { escolaId: "escola-1", uid: "gestor-atual" },
    enviandoSolicitacao: false, solicitacoesCarregadas: true,
    btnEnviarSolicitacao: {}, avisoConfirmacaoPendente: { style: {} }, textoConfirmacaoPendente: {},
    itensSolicitacao: [{ materialId: "caneta" }],
  };
  vm.runInNewContext(bloqueio + envio, c);
  return c;
}

for (const [nome, modulo] of abas) {
  test(`${nome}: pedido aberto bloqueia envio de itens diferentes em todas as etapas`, async () => {
    for (const status of abertos) {
      const c = iniciar(nome, [pedido(modulo, status)]);
      c.atualizarBloqueioNovaSolicitacao();
      assert.equal(c.btnEnviarSolicitacao.disabled, true);
      assert.equal(c.avisoConfirmacaoPendente.style.display, "flex");
      assert.match(c.textoConfirmacaoPendente.textContent, /mesmo que os itens sejam diferentes/);
      await assert.rejects(c.salvarSolicitacao(), /PED-001/);
    }
  });

  test(`${nome}: pedido encerrado libera novo pedido da aba`, () => {
    for (const status of encerrados) {
      const c = iniciar(nome, [pedido(modulo, status)]);
      c.atualizarBloqueioNovaSolicitacao();
      assert.equal(c.btnEnviarSolicitacao.disabled, false);
      assert.equal(c.avisoConfirmacaoPendente.style.display, "none");
    }
  });

  test(`${nome}: envio aguarda carga do histórico e permanece bloqueado durante gravação`, async () => {
    const c = iniciar(nome, []);
    c.solicitacoesCarregadas = false;
    c.atualizarBloqueioNovaSolicitacao();
    assert.equal(c.btnEnviarSolicitacao.disabled, true);
    await assert.rejects(c.salvarSolicitacao(), /carregamento/);
    c.solicitacoesCarregadas = true;
    c.alterarEstadoEnvio(true);
    c.atualizarBloqueioNovaSolicitacao();
    assert.equal(c.btnEnviarSolicitacao.disabled, true);
    c.alterarEstadoEnvio(false);
    assert.equal(c.btnEnviarSolicitacao.disabled, false);
  });
}

test("bloqueio de materiais é por escola e módulo e não se aplica aos insumos essenciais", () => {
  const p = pedido("MATERIAIS_EXPEDIENTE", "RECEBIDA");
  assert.equal(obterPedidoMaterialAberto([p], "MATERIAIS_EXPEDIENTE", "escola-1"), p);
  assert.equal(obterPedidoMaterialAberto([p], "MATERIAIS_LIMPEZA", "escola-1"), null);
  assert.equal(obterPedidoMaterialAberto([p], "MATERIAIS_EXPEDIENTE", "escola-2"), null);
  assert.equal(obterPedidoMaterialAberto([pedido("INSUMOS", "RECEBIDA")], "INSUMOS", "escola-1"), null);
});
