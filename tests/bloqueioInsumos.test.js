import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const fonte = readFileSync(new URL("../gestao-escolar/src/js/insumos.js", import.meta.url), "utf8");
const bloqueio = fonte.slice(fonte.indexOf("function atualizarBloqueioNovaSolicitacao()"), fonte.indexOf("function renderizarSolicitacoes()"));
const salvar = fonte.slice(fonte.indexOf("async function salvarSolicitacao()"), fonte.indexOf('form.addEventListener("submit"'));

function iniciar(registros) {
  const contexto = {
    solicitacoesEscola: registros,
    dadosGestorAtual: { escolaId: "escola-1" },
    tipoInsumo: { value: "AGUA_MINERAL" },
    btnEnviarSolicitacao: {},
    avisoConfirmacaoPendente: { style: {} },
    textoConfirmacaoPendente: {},
    enviandoSolicitacao: false,
    obterNomeTipoInsumo: tipo => tipo,
  };
  vm.runInNewContext(bloqueio + salvar, contexto);
  return contexto;
}

const pendente = tipo => ({ id: tipo, modulo: "INSUMOS", tipo, escolaId: "escola-1", status: "AGUARDANDO_CONFIRMACAO", confirmacaoEntrega: { pendente: true }, protocolo: tipo });

test("água pendente bloqueia água e permite gás e caminhão-pipa ao trocar a seleção", () => {
  const c = iniciar([pendente("AGUA_MINERAL")]);
  for (const tipo of ["AGUA_MINERAL", "GAS_P13", "GAS_P45", "CAMINHAO_PIPA", "AGUA_MINERAL"]) {
    c.tipoInsumo.value = tipo;
    c.atualizarBloqueioNovaSolicitacao();
    assert.equal(c.btnEnviarSolicitacao.disabled, tipo === "AGUA_MINERAL");
    assert.equal(c.avisoConfirmacaoPendente.style.display, tipo === "AGUA_MINERAL" ? "flex" : "none");
  }
});

test("cada tipo encontra seu próprio pedido pendente", () => {
  const tipos = ["AGUA_MINERAL", "GAS_P13", "GAS_P45", "CAMINHAO_PIPA"];
  const c = iniciar(tipos.map(pendente));
  for (const tipo of tipos) {
    c.tipoInsumo.value = tipo;
    c.atualizarBloqueioNovaSolicitacao();
    assert.equal(c.confirmacaoPendenteAtual.id, tipo);
    assert.match(c.textoConfirmacaoPendente.textContent, new RegExp(tipo));
  }
});

test("recebimento confirmado libera o item e outras escolas e módulos não bloqueiam", () => {
  const c = iniciar([
    { ...pendente("AGUA_MINERAL"), escolaId: "outra" },
    { ...pendente("AGUA_MINERAL"), modulo: "MANUTENCAO" },
    { ...pendente("AGUA_MINERAL"), confirmacaoEntrega: { pendente: false }, status: "CONCLUIDA" },
  ]);
  c.atualizarBloqueioNovaSolicitacao();
  assert.equal(c.btnEnviarSolicitacao.disabled, false);
});

test("atualização em tempo real mantém botão desabilitado durante envio", () => {
  const c = iniciar([]);
  c.enviandoSolicitacao = true;
  c.atualizarBloqueioNovaSolicitacao();
  assert.equal(c.btnEnviarSolicitacao.disabled, true);
});

test("salvar valida novamente o bloqueio do mesmo item antes de gravar", async () => {
  const c = iniciar([pendente("AGUA_MINERAL")]);
  await assert.rejects(c.salvarSolicitacao(), /Confirme o recebimento do pedido anterior deste item/);
});
