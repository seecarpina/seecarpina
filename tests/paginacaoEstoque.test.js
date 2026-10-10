import test from "node:test";
import assert from "node:assert/strict";
import { paginarRegistros } from "../secretaria/src/js/core/paginacaoEstoque.js";

test("estoque mostra trinta registros por página sem perder nem repetir itens", () => {
  const registros = Array.from({ length: 63 }, (_, i) => i);
  const paginas = [1, 2, 3].map((pagina) => paginarRegistros(registros, pagina));
  assert.deepEqual(paginas.map((p) => p.registros.length), [30, 30, 3]);
  assert.deepEqual(paginas.flatMap((p) => p.registros), registros);
  assert.deepEqual([paginas[2].primeiro, paginas[2].ultimo, paginas[2].totalPaginas], [61, 63, 3]);
});

test("remoção ou filtro ajusta página fora do limite e trata resultado vazio", () => {
  const resumo = paginarRegistros(["permitido"], 8);
  assert.equal(resumo.pagina, 1);
  assert.deepEqual(resumo.registros, ["permitido"]);
  const vazio = paginarRegistros([], 8);
  assert.deepEqual([vazio.pagina, vazio.totalPaginas, vazio.primeiro, vazio.ultimo, vazio.total], [1, 1, 0, 0, 0]);
  assert.deepEqual(vazio.registros, []);
});

test("paginação mantém a ordenação e não altera a lista filtrada", () => {
  const registros = Array.from({ length: 31 }, (_, i) => ({ id: 31 - i }));
  const copia = [...registros];
  assert.equal(paginarRegistros(registros, 2).registros[0].id, 1);
  assert.deepEqual(registros, copia);
  assert.equal(paginarRegistros(registros, -1).pagina, 1);
});
