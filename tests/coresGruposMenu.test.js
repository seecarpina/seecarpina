import test from "node:test";
import assert from "node:assert/strict";
import { corDoGrupoMenu } from "../src/js/core/coresGruposMenu.js";

test("cor do grupo permanece fixa ao mudar ordem e filtrar permissões", () => {
  const grupos = ["grupo-rh", "grupo-financeiro", "grupo-escolas", "grupo-documentos"];
  const original = new Map(grupos.map(id => [id, corDoGrupoMenu(id)]));
  for (const id of [...grupos].reverse().slice(1)) assert.equal(corDoGrupoMenu(id), original.get(id));
  for (const id of grupos) assert.ok(["azul", "violeta", "verde", "laranja", "rosa", "ciano"].includes(corDoGrupoMenu(id)));
});

test("itens sem grupo continuam neutros", () => {
  for (const id of [null, undefined, ""]) assert.equal(corDoGrupoMenu(id), null);
});
