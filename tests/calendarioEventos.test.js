import test from "node:test";
import assert from "node:assert/strict";
import { categoriaCalendario, categoriasDoDia, dataLocalCalendario } from "../src/js/core/calendarioEventos.js";

test("categorias do calendário usam as cores existentes e eventos legados usam Outros", () => {
  assert.equal(categoriaCalendario("aniversario").cor, "mediumorchid");
  assert.equal(categoriaCalendario("reuniao").cor, "darkorange");
  assert.equal(categoriaCalendario("alerta").cor, "crimson");
  for (const valor of [undefined, "categoria-antiga", "__proto__"]) {
    assert.equal(categoriaCalendario(valor).nome, "Outros");
  }
});

test("dias com várias categorias têm marcadores distintos sem repetir a mesma categoria", () => {
  const categorias = categoriasDoDia([
    { categoria: "reuniao" }, { categoria: "alerta" }, { categoria: "reuniao" }, {},
  ]);
  assert.deepEqual(categorias.map((c) => c.nome), ["Reunião", "Alerta", "Outros"]);
  assert.deepEqual(categoriasDoDia([]), []);
});

test("data de hoje usa componentes locais sem converter para UTC", () => {
  const data = {
    getFullYear: () => 2026,
    getMonth: () => 9,
    getDate: () => 6,
    toISOString: () => { throw new Error("Não deve converter para UTC"); },
  };
  assert.equal(dataLocalCalendario(data), "2026-10-06");
  assert.equal(dataLocalCalendario(new Date(2026, 0, 2, 23, 30)), "2026-01-02");
});
