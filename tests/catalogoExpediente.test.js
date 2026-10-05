import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const codigo = readFileSync(new URL("../gestao-escolar/src/js/materiais-expediente.js", import.meta.url), "utf8");
const funcao = codigo.slice(codigo.indexOf("function preencherSelectMateriais()"), codigo.indexOf("function atualizarMaterialSelecionado()"));

function carregarCatalogo(configuracao) {
  const contexto = {
    configuracaoCategoriasPermitidas: configuracao,
    categoriasEstoque: [{ id: "expediente", nome: "Expediente" }, { id: "alimentos", nome: "Alimentação" }, { id: "limpeza", nome: "Limpeza" }],
    materiaisEstoque: [
      { id: "papel", nome: "Papel", categoriaId: "expediente", estoque: 5 },
      { id: "caneta", nome: "Caneta", categoriaId: "expediente", estoque: 0 },
      { id: "arroz", nome: "Arroz", categoriaId: "alimentos", estoque: 10 },
      { id: "sabao", nome: "Sabão", categoriaId: "limpeza", estoque: 10 },
    ],
    materiaisDisponiveis: [],
    materialSelecionado: { appendChild() {} },
    btnAdicionarMaterial: {},
    document: { createElement: () => ({ appendChild() {} }) },
  };
  runInNewContext(`${funcao}; preencherSelectMateriais();`, contexto);
  return contexto;
}

test("expediente lista apenas materiais com saldo das categorias vinculadas, mesmo com todas legado", () => {
  const resultado = carregarCatalogo({ todas: true, categorias: { expediente: true } });
  assert.equal(JSON.stringify(resultado.materiaisDisponiveis.map(item => item.id)), '["papel"]');
  assert.equal(resultado.materialSelecionado.disabled, false);
});

test("expediente sem categorias vinculadas não libera todo o estoque", () => {
  for (const configuracao of [{ todas: true }, { todas: false, categorias: {} }]) {
    const resultado = carregarCatalogo(configuracao);
    assert.equal(resultado.materiaisDisponiveis.length, 0);
    assert.equal(resultado.materialSelecionado.disabled, true);
    assert.equal(resultado.btnAdicionarMaterial.disabled, true);
  }
});
