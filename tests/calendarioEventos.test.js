import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { categoriaCalendario, categoriasDoDia, dataLocalCalendario, datasComemorativasDoDia } from "../src/js/core/calendarioEventos.js";

test("carregamento global preserva categoria do evento enviada ao calendário", () => {
  let receber;
  let publicado;
  const codigo = readFileSync(new URL("../src/js/eventosStore.js", import.meta.url), "utf8")
    .replace(/import[\s\S]*?from\s+"[^"]+";/g, "");
  vm.runInNewContext(codigo, {
    concluirCarregamento() {},
    rtdb: {}, ref: (_, caminho) => caminho,
    onValue: (_, callback) => { receber = callback; },
    window: { dispatchEvent: (evento) => { publicado = evento; } },
    CustomEvent: function(tipo, opcoes) { this.type = tipo; this.detail = opcoes.detail; },
  });
  receber({ exists: () => true, val: () => ({
    aniversario: { data: "2026-10-06", titulo: "Aniversário de Lucicleide", categoria: "aniversario", concluido: true },
    reuniao: { data: "2026-10-06", titulo: "Reunião", categoria: "reuniao", concluido: true },
  }) });
  assert.equal(publicado.type, "eventosAtualizados");
  const eventos = publicado.detail["2026-10-06"];
  assert.equal(eventos[0].categoria, "aniversario");
  assert.equal(eventos[0].concluido, false);
  assert.equal(eventos[1].concluido, true);
  assert.equal(categoriaCalendario(eventos[0].categoria).cor, "mediumorchid");
  assert.equal(categoriasDoDia(eventos).length, 2);
});

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

test("datas comemorativas se repetem por mês e dia em diferentes anos", () => {
  const datas = [
    { data: "10-06", nome: "Comemoração A", categoria: "Educação" },
    { data: "10-06", nome: "Comemoração B", categoria: "Cultura" },
    { data: "10-07", nome: "Outro dia" },
  ];
  const eventos = datasComemorativasDoDia(datas, "2026-10-06");
  assert.equal(eventos.length, 2);
  assert.equal(eventos[0].titulo, "Comemoração A");
  assert.equal(eventos[0].categoriaComemorativa, "Educação");
  assert.equal(categoriaCalendario(eventos[0].categoria).cor, "goldenrod");
  assert.deepEqual(datasComemorativasDoDia(datas, "2027-10-06"), eventos);
  assert.deepEqual(datasComemorativasDoDia(datas, "2026-11-06"), []);
});

test("comemorações coexistem com eventos cadastrados sem alterar o cadastro", () => {
  const cadastrados = [{ titulo: "Aniversário", categoria: "aniversario" }];
  const datas = [{ data: "10-06", nome: "Data comemorativa" }];
  const combinados = [...cadastrados, ...datasComemorativasDoDia(datas, "2026-10-06")];
  assert.equal(combinados.length, 2);
  assert.deepEqual(categoriasDoDia(combinados).map((c) => c.nome), ["Aniversário", "Data comemorativa"]);
  assert.equal(cadastrados.length, 1);
});
