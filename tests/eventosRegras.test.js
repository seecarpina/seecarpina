import test from "node:test";
import assert from "node:assert/strict";
import { dataEventoNoAno, eventoAtrasado, eventosCalendarioPorAno, separarEventosPorAba } from "../secretaria/src/js/core/eventosRegras.js";

test("aniversários ignoram o ano do cadastro e nunca ficam atrasados", () => {
  const evento = { data: "2020-01-10", categoria: "aniversario" };
  assert.equal(dataEventoNoAno(evento, 2026), "2026-01-10");
  assert.equal(eventoAtrasado(evento, new Date(2026, 9, 6)), false);
  assert.equal(dataEventoNoAno({ data: "2024-02-29", categoria: "aniversario" }, 2028), "2028-02-29");
});

test("eventos comuns mantêm ano e aviso de atraso, respeitando conclusão", () => {
  const evento = { data: "2025-10-06", categoria: "reuniao" };
  assert.equal(dataEventoNoAno(evento, 2026), "2025-10-06");
  assert.equal(eventoAtrasado(evento, new Date(2026, 9, 6)), true);
  assert.equal(eventoAtrasado({ ...evento, concluido: true }, new Date(2026, 9, 6)), false);
  assert.equal(eventoAtrasado({ ...evento, data: "2026-10-06" }, new Date(2026, 9, 6, 23)), false);
});

test("calendário reúne aniversário antigo com eventos do dia sem repetir eventos comuns", () => {
  const dados = {
    "2020-10-06": [{ titulo: "Aniversário", categoria: "aniversario" }],
    "2025-10-06": [{ titulo: "Reunião antiga", categoria: "reuniao" }],
    "2026-10-06": [{ titulo: "Reunião atual", categoria: "reuniao" }],
  };
  const atual = eventosCalendarioPorAno(dados, 2026);
  assert.deepEqual(atual["2026-10-06"].map((e) => e.titulo), ["Aniversário", "Reunião atual"]);
  assert.equal(atual["2025-10-06"].length, 1);
  const futuro = eventosCalendarioPorAno(dados, 2027);
  assert.equal(futuro["2027-10-06"].length, 1);
  assert.equal(dados["2020-10-06"].length, 1);
});

test("aniversários ficam somente na aba própria, mesmo com conclusão antiga", () => {
  const registros = [
    { categoria: "aniversario", concluido: false },
    { categoria: "aniversario", concluido: true },
    { categoria: "reuniao", concluido: false },
    { categoria: "alerta", concluido: true },
  ];
  const abas = separarEventosPorAba(registros);
  assert.equal(abas.aniversarios.length, 2);
  assert.equal(abas.futuros.length, 1);
  assert.equal(abas.concluidos.length, 1);
  assert.equal(registros[1].concluido, true);
});
