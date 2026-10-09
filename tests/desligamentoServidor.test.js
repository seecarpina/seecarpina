import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const fonte = readFileSync(new URL("../src/js/servidores.js", import.meta.url), "utf8");
const inicio = fonte.indexOf("async function desligarServidor(");
const fim = fonte.indexOf("function resetarFormulario(", inicio);

function preparar({ confirmar = true, falhar = "" } = {}) {
  const botao = { disabled: false, innerHTML: "<span>Desligar servidor</span>" };
  const gravacoes = [];
  const avisos = [];
  const contexto = {
    window: { mostrarConfirmacao: async () => confirmar, dadosUsuario: { nome: "Usuário Teste" } },
    rtdb: {},
    ref: (_, caminho) => caminho || "/",
    get: async () => {
      assert.equal(botao.disabled, true);
      assert.match(botao.innerHTML, /hourglass_top/);
      if (falhar === "leitura") throw new Error("Falha na leitura");
      return { exists: () => false };
    },
    push: () => ({ key: `oficio-${gravacoes.length + 1}` }),
    update: async (_, dados) => {
      assert.equal(botao.disabled, true);
      if (falhar === "gravacao") throw new Error("Falha na gravação");
      gravacoes.push(dados);
    },
    mostrarNotificacao: (...args) => avisos.push(args),
    console: { error: () => {} },
  };
  vm.runInNewContext(fonte.slice(inicio, fim), contexto);
  return { desligar: servidor => contexto.desligarServidor(servidor, botao), botao, gravacoes, avisos };
}

test("desligamento restaura o botão compartilhado e permite desligar outro servidor", async () => {
  const { desligar, botao, gravacoes } = preparar();
  const original = botao.innerHTML;
  for (const id of ["primeiro", "segundo"]) {
    assert.equal(botao.disabled, false);
    await desligar({ _key: id, nome: id, situacao: "Ativo" });
    assert.equal(botao.disabled, false);
    assert.equal(botao.innerHTML, original);
  }
  assert.equal(gravacoes.length, 2);
  assert.equal(gravacoes[0]["servidores/registros/primeiro/situacao"], "Inativo");
  assert.equal(gravacoes[1]["servidores/registros/segundo/situacao"], "Inativo");
  for (const dados of gravacoes) {
    assert.equal(Object.values(dados).filter(v => v?.origem === "DESLIGAMENTO_SERVIDOR").length, 1);
  }
});

test("falhas de leitura e gravação restauram o botão e informam o erro", async () => {
  for (const falhar of ["leitura", "gravacao"]) {
    const { desligar, botao, gravacoes, avisos } = preparar({ falhar });
    const original = botao.innerHTML;
    await desligar({ _key: "servidor", nome: "Servidor", situacao: "Ativo" });
    assert.equal(botao.disabled, false);
    assert.equal(botao.innerHTML, original);
    assert.equal(gravacoes.length, 0);
    assert.equal(avisos.at(-1)[1], "erro");
  }
});

test("cancelar a confirmação não altera o botão nem grava o desligamento", async () => {
  const { desligar, botao, gravacoes } = preparar({ confirmar: false });
  const original = botao.innerHTML;
  await desligar({ _key: "servidor", nome: "Servidor", situacao: "Ativo" });
  assert.equal(botao.disabled, false);
  assert.equal(botao.innerHTML, original);
  assert.equal(gravacoes.length, 0);
});
