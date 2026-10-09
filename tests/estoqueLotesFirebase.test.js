import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { categoriaExigeValidade, inicializarLotes, selecionarLotesSaida, lotesParaDevolucao } from "../src/js/core/estoqueLotes.js";

function iniciar(material) {
  const dados = { materiais: { arroz: structuredClone(material) }, configuracoes: { estoque: { categorias: { comida: { nome: "Alimentação" } } } } };
  const ler = caminho => caminho.split("/").reduce((obj, chave) => obj?.[chave], dados);
  const contexto = {
    rtdb: {}, categoriaExigeValidade, inicializarLotes, selecionarLotesSaida, lotesParaDevolucao,
    ref: (_, caminho) => caminho,
    get: async caminho => ({ exists: () => !!ler(caminho), val: () => ler(caminho) }),
    runTransaction: async (caminho, fn) => {
      const valor = fn(structuredClone(ler(caminho)));
      if (!valor) return { committed: false };
      const chaves = caminho.split("/");
      const ultimo = chaves.pop();
      const pai = chaves.reduce((obj, chave) => obj[chave], dados);
      pai[ultimo] = valor;
      return { committed: true, snapshot: { exists: () => true, val: () => structuredClone(valor) } };
    },
    increment: quantidade => ({ incremento: quantidade }),
  };
  const codigo = readFileSync(new URL("../src/js/core/estoqueLotesFirebase.js", import.meta.url), "utf8").replace(/^import .*;\n/gm, "").replace(/export /g, "");
  vm.runInNewContext(codigo, contexto);
  return { contexto, dados };
}

test("preparação de material antigo é idempotente e detecta categoria alimentar", async () => {
  const { contexto: c, dados } = iniciar({ estoque: 50, categoriaId: "comida" });
  const primeiro = await c.garantirLotes("arroz");
  const segundo = await c.garantirLotes("arroz");
  assert.equal(primeiro.exigeValidade, true);
  assert.equal(segundo.lotes.legado.saldo, 50);
  assert.equal(Object.keys(dados.materiais.arroz.lotes).length, 1);
});

test("baixa gera incrementos separados por lote e devolução usa os mesmos caminhos", async () => {
  const { contexto: c } = iniciar({ estoque: 15, controleLotes: true, categoriaId: "comida", exigeValidade: true,
    lotes: { a: { codigo: "A", saldo: 10, validade: "2099-01-01" }, b: { codigo: "B", saldo: 5, validade: "2099-02-01" } } });
  const material = await c.garantirLotes("arroz");
  const baixa = {};
  const lotes = c.adicionarBaixaLotes(baixa, "arroz", material, 12);
  assert.equal(baixa["materiais/arroz/lotes/a/saldo"].incremento, -10);
  assert.equal(baixa["materiais/arroz/lotes/b/saldo"].incremento, -2);
  const devolucao = {};
  await c.adicionarDevolucaoLotes(devolucao, { materialId: "arroz", quantidade: 12, lotes });
  assert.equal(devolucao["materiais/arroz/lotes/a/saldo"].incremento, 10);
  assert.equal(devolucao["materiais/arroz/lotes/b/saldo"].incremento, 2);
});

test("estorno de romaneio anterior aumenta saldo e quantidade inicial do legado", async () => {
  const { contexto: c } = iniciar({ estoque: 0, categoriaId: "comida" });
  const atualizacoes = {};
  await c.adicionarDevolucaoLotes(atualizacoes, { materialId: "arroz", quantidade: 20 });
  assert.equal(atualizacoes["materiais/arroz/lotes/legado/saldo"].incremento, 20);
  assert.equal(atualizacoes["materiais/arroz/lotes/legado/quantidadeInicial"].incremento, 20);
});

test("devolução sem lote de origem falha antes de gravar", async () => {
  const { contexto: c } = iniciar({ estoque: 0, categoriaId: "comida" });
  await assert.rejects(c.adicionarDevolucaoLotes({}, { materialId: "arroz", quantidade: 2, lotes: [{ loteId: "ausente", quantidade: 2 }] }), /origem não encontrado/);
});

test("cache vazio permite a transação consultar o servidor e usar o saldo mais recente", async () => {
  const { contexto: c } = iniciar({ estoque: 50, categoriaId: "comida" });
  c.runTransaction = async (_, fn) => {
    assert.equal(fn(null), null);
    const atualizado = fn({ estoque: 35, categoriaId: "comida" });
    assert.equal(atualizado.lotes.legado.saldo, 35);
    return { committed: true, snapshot: { exists: () => true, val: () => atualizado } };
  };
  const material = await c.garantirLotes("arroz");
  assert.equal(material.estoque, 35);
  assert.equal(material.lotes.legado.saldo, 35);
});

test("material removido no servidor não é recriado a partir da leitura anterior", async () => {
  const { contexto: c } = iniciar({ estoque: 50, categoriaId: "comida" });
  c.runTransaction = async (_, fn) => {
    assert.equal(fn(null), null);
    return { committed: true, snapshot: { exists: () => false, val: () => null } };
  };
  await assert.rejects(c.garantirLotes("arroz"), /Material não encontrado/);
});


test("alimento migrado sem validade permite baixa e estorno no mesmo lote", async () => {
  const { contexto: c } = iniciar({ estoque: 50, categoriaId: "comida" });
  const material = await c.garantirLotes("arroz");
  const baixa = {};
  const lotes = c.adicionarBaixaLotes(baixa, "arroz", material, 12);
  assert.equal(baixa["materiais/arroz/lotes/legado/saldo"].incremento, -12);
  assert.equal(lotes[0].validade, "");
  assert.equal(lotes[0].quantidade, 12);
  const devolucao = {};
  await c.adicionarDevolucaoLotes(devolucao, { materialId: "arroz", quantidade: 12, lotes });
  assert.equal(devolucao["materiais/arroz/lotes/legado/saldo"].incremento, 12);
});
