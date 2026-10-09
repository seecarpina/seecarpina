import test from "node:test";
import assert from "node:assert/strict";
import { categoriaExigeValidade, dataValida, formatarValidade, inicializarLotes, selecionarLotesSaida, lotesParaDevolucao, loteDaEntradaParaExcluir } from "../src/js/core/estoqueLotes.js";

const lote = (saldo, validade, entradaEm = "2026-01-01") => ({ codigo: validade, saldo, quantidadeInicial: saldo, validade, entradaEm });

test("alimentos exigem validade e a data deve existir no calendário", () => {
  for (const nome of ["Alimentação", "GÊNEROS ALIMENTÍCIOS", "Merenda escolar"]) assert.equal(categoriaExigeValidade({ nome }), true);
  assert.equal(categoriaExigeValidade({ nome: "Limpeza" }), false);
  assert.equal(categoriaExigeValidade({ exigeValidade: true }), true);
  assert.equal(dataValida("2026-02-29"), false);
  assert.equal(dataValida("2028-02-29"), true);
  assert.equal(dataValida("2026-13-01"), false);
});

test("migração preserva o saldo antigo e nunca inventa validade", () => {
  const original = { nome: "Arroz", estoque: 180 };
  const m = inicializarLotes(original, true);
  assert.equal(m.lotes.legado.saldo, 180);
  assert.equal(m.lotes.legado.validade, "");
  assert.equal(original.controleLotes, undefined);
  assert.deepEqual(inicializarLotes(m, true), m);
  assert.deepEqual(selecionarLotesSaida(m, 1, "2026-10-08").map(l => [l.loteId, l.validade, l.quantidade]), [["legado", "", 1]]);
});

test("saída atravessa lotes por menor validade, independentemente da ordem de entrada", () => {
  const m = { nome: "Arroz", controleLotes: true, exigeValidade: true, lotes: {
    recente: lote(80, "2027-03-15", "2026-10-01"),
    primeiro: lote(100, "2026-12-20", "2026-10-08"),
  } };
  const utilizados = selecionarLotesSaida(m, 120, "2026-10-08");
  assert.deepEqual(utilizados.map(l => [l.loteId, l.quantidade]), [["primeiro", 100], ["recente", 20]]);
  assert.equal(m.lotes.primeiro.saldo, 100);
});

test("validade de hoje é utilizável, vencido e saldo zero não são", () => {
  const m = { controleLotes: true, exigeValidade: true, lotes: {
    vencido: lote(100, "2026-10-07"), hoje: lote(5, "2026-10-08"), vazio: lote(0, "2026-10-08"),
  } };
  assert.equal(selecionarLotesSaida(m, 5, "2026-10-08")[0].loteId, "hoje");
  assert.throws(() => selecionarLotesSaida(m, 6, "2026-10-08"), /insuficiente/);
});

test("empate de validade usa a entrada mais antiga e material não alimentar permite legado", () => {
  const m = { controleLotes: true, lotes: { novo: lote(3, "2026-12-01", "2026-10-08"), antigo: lote(3, "2026-12-01", "2026-10-01") } };
  assert.equal(selecionarLotesSaida(m, 2, "2026-10-08")[0].loteId, "antigo");
  assert.equal(selecionarLotesSaida(inicializarLotes({ estoque: 4 }), 4)[0].loteId, "legado");
  assert.throws(() => selecionarLotesSaida(m, -1), /inválida/);
});

test("estorno devolve as quantidades aos mesmos lotes e fecha os saldos", () => {
  const m = { estoque: 180, controleLotes: true, exigeValidade: true, lotes: { a: lote(100, "2026-12-20"), b: lote(80, "2027-03-15") } };
  const lotes = selecionarLotesSaida(m, 120, "2026-10-08");
  for (const l of lotes) m.lotes[l.loteId].saldo -= l.quantidade;
  m.estoque -= 120;
  assert.equal(m.lotes.a.saldo, 0);
  assert.equal(m.lotes.b.saldo, 60);
  for (const l of lotesParaDevolucao({ quantidade: 120, lotes })) m.lotes[l.loteId].saldo += l.quantidade;
  m.estoque += 120;
  assert.equal(m.lotes.a.saldo, 100);
  assert.equal(m.lotes.b.saldo, 80);
  assert.equal(Object.values(m.lotes).reduce((n, l) => n + l.saldo, 0), m.estoque);
});

test("romaneios antigos estornam para legado, dados de lotes inconsistentes são rejeitados", () => {
  assert.deepEqual(lotesParaDevolucao({ quantidade: 4 }), [{ loteId: "legado", quantidade: 4, legado: true }]);
  assert.throws(() => lotesParaDevolucao({ quantidade: 4, lotes: [{ loteId: "a", quantidade: 3 }] }), /inconsistentes/);
});

test("validade é exibida sem conversão de fuso horário", () => {
  assert.equal(formatarValidade("2026-12-20"), "20/12/2026");
  assert.equal(formatarValidade(""), "Não informada");
});

test("entrada consumida não pode ser excluída usando o saldo de outro lote", () => {
  const m = { estoque: 150, lotes: { consumido: lote(50, "2026-12-01"), outro: lote(100, "2026-12-20") } };
  assert.throws(() => loteDaEntradaParaExcluir(m, { loteId: "consumido", quantidade: 100 }), /já foi utilizada/);
  assert.equal(loteDaEntradaParaExcluir(m, { loteId: "outro", quantidade: 100 }), "outro");
});


test("transição usa alimentos com validade conhecida antes do saldo sem validade", () => {
  const m = { nome: "Arroz", controleLotes: true, exigeValidade: true, lotes: {
    semData: lote(10, "", "2026-01-01"),
    valido: lote(5, "2026-12-20", "2026-10-01"),
    vencido: lote(100, "2026-10-07"),
    invalido: lote(100, "2026-13-01"),
  } };
  const antes = structuredClone(m);
  const usados = selecionarLotesSaida(m, 12, "2026-10-08");
  assert.deepEqual(usados.map(l => [l.loteId, l.quantidade]), [["valido", 5], ["semData", 7]]);
  assert.equal(usados[1].validade, "");
  assert.deepEqual(m, antes);
  assert.throws(() => selecionarLotesSaida(m, 16, "2026-10-08"), /insuficiente/);
});
