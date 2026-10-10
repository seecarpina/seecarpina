import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { normalizarConsultaServidores } from "../src/js/core/memoriaConsulta.js";

const fonte = readFileSync(new URL("../src/js/servidores.js", import.meta.url), "utf8");
function prepararServidores(consulta = null) {
  const assinaturas = {};
  const frames = [];
  const tabela = { innerHTML: "", appendChild(tr) { this.innerHTML += tr.innerHTML; } };
  const contexto = {
    auth: { currentUser: consulta ? { uid: "usuario-teste" } : null }, consultaUid: null,
    cardsPendenciasServidores: null, normalizarConsultaServidores,
    memoriaConsulta: { ler: () => consulta, salvar(estado) { contexto.ultimaConsulta = estado; } },
    window: { addEventListener() {} },
    tabela, busca: { value: "" }, paginacao: { innerHTML: "" }, contadorServidores: {},
    servidores: [], carregandoServidores: true, erroCarregamentoServidores: "",
    paginaAtual: 1, itensPorPagina: 100, filtroPendenciaAtual: "todos",
    registrosRef: "registros", requestAnimationFrame: fn => frames.push(fn),
    onValue: (_, receber, falhar) => Object.assign(assinaturas, { receber, falhar }),
    normalizarTextoLocal: texto => String(texto).toLowerCase(),
    criarContagemCPFs: () => ({}), atualizarPainelPendencias() {},
    obterLocalServidor: () => "", servidorCorrespondePendencia: () => true,
    formatarCPF: valor => valor, formatarDataBR: () => "—",
    renderPaginacao() {}, abrirMenuAcoesServidor() {}, console: { error() {} },
    document: { createElement: () => ({ innerHTML: "", querySelector: () => ({ addEventListener() {} }) }) },
  };
  const render = fonte.slice(fonte.indexOf("function restaurarConsultaServidores() {"), fonte.indexOf("/* ===============================\n   DETALHES DO SERVIDOR"));
  const listener = fonte.slice(fonte.indexOf("onValue(registrosRef,"), fonte.indexOf("/* ===============================\n   HISTÓRICO DE TRANSFERÊNCIAS"));
  vm.runInNewContext(render + listener, contexto);
  return { contexto, tabela, assinaturas, frames, enviar(dados) {
    assinaturas.receber({ exists: () => dados !== null, val: () => dados });
    frames.shift()();
  } };
}

test("atualização de locais e filtros mantém carregamento até a resposta dos servidores", () => {
  const d = prepararServidores();
  d.contexto.renderTabela();
  assert.match(d.tabela.innerHTML, /see-spinner/);
  d.contexto.busca.value = "Maria";
  d.contexto.renderTabela();
  assert.doesNotMatch(d.tabela.innerHTML, /Nenhum servidor/);
  d.assinaturas.receber({ exists: () => true, val: () => ({ a: { nome: "Maria", situacao: "Ativo" } }) });
  d.contexto.renderTabela();
  assert.match(d.tabela.innerHTML, /see-spinner/);
  d.frames.shift()();
  assert.match(d.tabela.innerHTML, /Maria/);
  assert.doesNotMatch(d.tabela.innerHTML, /see-spinner|Nenhum servidor/);
});

test("resposta vazia limpa dados anteriores e só então mostra estado vazio", () => {
  const d = prepararServidores();
  d.contexto.paginaAtual = 4;
  d.enviar({ a: { nome: "Maria" } });
  assert.equal(d.contexto.paginaAtual, 1);
  assert.match(d.tabela.innerHTML, /Maria/);
  d.enviar(null);
  assert.equal(d.contexto.servidores.length, 0);
  assert.match(d.tabela.innerHTML, /Nenhum servidor encontrado/);
});

test("erro de leitura não vira mensagem de lista vazia ao filtrar; recuperação remove o erro", () => {
  const d = prepararServidores();
  d.assinaturas.falhar(new Error("Sem permissão"));
  d.contexto.renderTabela();
  assert.match(d.tabela.innerHTML, /Não foi possível carregar/);
  assert.doesNotMatch(d.tabela.innerHTML, /see-spinner|Nenhum servidor/);
  d.enviar({ a: { nome: "Maria" } });
  assert.match(d.tabela.innerHTML, /Maria/);
  assert.doesNotMatch(d.tabela.innerHTML, /Não foi possível/);
});

test("contratos, circulares e DFDs também preservam estado pendente ou erro durante filtros", () => {
  for (const [arquivo, estado, erro] of [
    ["fiscais-de-contrato.js", "carregandoContratos", "erroCarregamentoContratos"],
    ["oficios-circulares.js", "carregandoCirculares", "erroCarregamentoCirculares"],
    ["dfd.js", "carregandoDfds", "erroCarregamentoDfds"],
  ]) {
    const texto = readFileSync(new URL(`../src/js/${arquivo}`, import.meta.url), "utf8");
    // O primeiro bloco impede renderização antecipada, antes de qualquer filtro.
    const inicio = texto.indexOf("function renderTabela() {");
    const fim = texto.indexOf("    return;\n  }", inicio) + "    return;\n  }".length;
    const tabela = { innerHTML: "" };
    const contexto = {
      tabela, contador: {}, contadorContratos: {}, paginacao: {},
      [estado]: true, [erro]: "", renderizarPaginacao() {},
      mostrarLoadingTabela() { tabela.innerHTML = '<see-spinner></see-spinner>'; },
    };
    vm.runInNewContext(texto.slice(inicio, fim) + "\n}", contexto);
    contexto.renderTabela();
    assert.match(tabela.innerHTML, /see-spinner/, arquivo);
    contexto[estado] = false;
    contexto[erro] = "Falha na consulta";
    contexto.renderTabela();
    assert.match(tabela.innerHTML, /Falha na consulta/, arquivo);
    assert.doesNotMatch(tabela.innerHTML, /see-spinner/, arquivo);
  }
});

test("consulta restaurada aguarda os dados e mantém página; redução de resultados corrige a página salva", () => {
  const d = prepararServidores({ busca: "Maria", pagina: 2 });
  d.contexto.renderTabela();
  assert.equal(d.contexto.busca.value, "Maria");
  assert.equal(d.contexto.paginaAtual, 2);
  assert.match(d.tabela.innerHTML, /see-spinner/);
  const registros = Object.fromEntries(Array.from({length:150}, (_,i) => [String(i),{ nome: `Maria ${String(i).padStart(3,"0")}` }]));
  d.enviar(registros);
  assert.equal(d.contexto.paginaAtual, 2);
  assert.match(d.tabela.innerHTML, /Maria 100/);
  assert.doesNotMatch(d.tabela.innerHTML, /Maria 000/);
  assert.equal(d.contexto.ultimaConsulta.pagina, 2);
  d.contexto.busca.value = "João";
  d.contexto.renderTabela();
  assert.equal(d.contexto.busca.value, "João");
  assert.equal(d.contexto.paginaAtual, 1);
  assert.equal(d.contexto.ultimaConsulta.busca, "João");
  assert.equal(d.contexto.ultimaConsulta.pagina, 1);
});
