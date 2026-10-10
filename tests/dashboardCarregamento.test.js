import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function iniciarDashboard() {
  let corTema = "#123456";
  let observarTema;
  const elementos = new Map();
  function elemento(id) {
    const el = {
      id, hidden: true, value: "", textContent: "", innerHTML: "", erro: null,
      appendChild(filho) {
        if (filho.className === "dashboard-grafico-erro") this.erro = filho;
        else if (!this.value) this.value = filho.value;
      },
      querySelector(seletor) { if (seletor === ".dashboard-grafico-carregando") return elementos.get(this.id + "Loader"); return seletor === "strong" ? elementos.get("totalContratosStrong") : this.erro; },
      setAttribute() {},
      addEventListener(tipo, fn) { this[tipo] = fn; },
      remove() { for (const pai of elementos.values()) if (pai.erro === this) pai.erro = null; },
    };
    elementos.set(id, el);
    return el;
  }
  for (const id of ["dashboardGraficos", "resumoOficios", "resumoContratos", "graficoOficiosMes", "graficoContratos", "totalOficios", "filtroAno", "totalStrong", "totalContratos", "totalContratosStrong", "resumoOficiosLoader", "resumoContratosLoader"]) elemento(id);
  for (const id of ["dashboardGraficos", "resumoOficios", "resumoContratos", "resumoOficiosLoader", "resumoContratosLoader"]) elementos.get(id).hidden = false;
  elementos.get("graficoOficiosMes").closest = () => elementos.get("resumoOficios");
  elementos.get("graficoContratos").closest = () => elementos.get("resumoContratos");
  const assinaturas = new Map();
  const graficos = [];
  const contexto = {
    rtdb: {}, ref: (_, caminho) => caminho,
    onValue: (caminho, receber, falhar) => assinaturas.set(caminho, { receber, falhar }),
    document: {
      body: {}, getElementById: (id) => elementos.get(id),
      querySelector: () => elementos.get("totalStrong"), createElement: () => elemento(Symbol()),
    },
    getComputedStyle: () => ({ getPropertyValue: () => corTema }),
    MutationObserver: function(callback) { observarTema = callback; this.observe = () => {}; },
    Chart: function(canvas, configuracao) {
      assert.equal(canvas.hidden, false);
      assert.equal(canvas.closest().hidden, false);
      assert.equal(elementos.get("dashboardGraficos").hidden, false);
      graficos.push({ canvas, configuracao });
      this.options = configuracao.options;
      this.data = configuracao.data;
      this.atualizacoes = 0;
      this.update = () => { this.atualizacoes++; };
      graficos.at(-1).instancia = this;
      this.destroy = () => {};
    },
    console: { error() {} },
  };
  const codigo = readFileSync(new URL("../src/js/dashboard.js", import.meta.url), "utf8")
    .replace(/import[\s\S]*?from\s+"[^"]+";/g, "");
  vm.runInNewContext(codigo, contexto);
  const enviar = (caminho, dados) => assinaturas.get(caminho).receber({ exists: () => dados !== null, val: () => dados });
  return { elementos, assinaturas, graficos, enviar, trocarTema: cor => { corTema = cor; observarTema(); } };
}

test("indicadores dos gráficos são substituídos independentemente após receber dados, inclusive dados vazios", () => {
  const d = iniciarDashboard();
  assert.equal(d.graficos.length, 0);
  assert.equal(d.elementos.get("resumoOficiosLoader").hidden, false);
  assert.equal(d.elementos.get("resumoContratosLoader").hidden, false);
  d.enviar("contratos/fiscais", null);
  assert.equal(d.elementos.get("resumoContratos").hidden, false);
  assert.equal(d.elementos.get("resumoOficios").hidden, false);
  assert.equal(d.elementos.get("resumoOficiosLoader").hidden, false);
  assert.equal(d.elementos.get("resumoContratosLoader").hidden, true);
  d.enviar("oficios", null);
  assert.equal(d.elementos.get("resumoOficios").hidden, false);
  assert.equal(d.elementos.get("totalStrong").textContent, 0);
  assert.equal(d.graficos.length, 2);
  assert.equal(d.elementos.get("resumoOficiosLoader").hidden, true);
  assert.equal(d.elementos.get("filtroAno").disabled, false);
});

test("troca de ano usa dados recebidos sem acumular assinaturas", () => {
  const d = iniciarDashboard();
  d.enviar("oficios", { "2025": { a: { data: "2025-02-10" } }, "2024": {} });
  const filtro = d.elementos.get("filtroAno");
  filtro.value = "2025";
  filtro.change();
  assert.equal(d.elementos.get("totalStrong").textContent, 1);
  filtro.value = "2024";
  filtro.change();
  assert.equal(d.elementos.get("totalStrong").textContent, 0);
  assert.equal(d.assinaturas.size, 2);
});

test("falha apresenta mensagem e recuperação substitui erro pelo gráfico", () => {
  const d = iniciarDashboard();
  d.assinaturas.get("oficios").falhar();
  assert.match(d.elementos.get("resumoOficios").erro.textContent, /Não foi possível/);
  assert.equal(d.elementos.get("graficoOficiosMes").hidden, true);
  assert.equal(d.elementos.get("resumoOficiosLoader").hidden, true);
  d.enviar("oficios", null);
  assert.equal(d.elementos.get("resumoOficios").erro, null);
  assert.equal(d.elementos.get("graficoOficiosMes").hidden, false);
});


test("cards preservam totais e usam gráficos com altura controlada", () => {
  const d = iniciarDashboard();
  d.enviar("contratos/fiscais", {
    a: { tipoContrato: "CONTRATOS CNPJ 30.784.957/0001-37" },
    b: { tipoContrato: "CONTRATOS CNPJ 59.593.430/0001-07" },
    c: { tipoContrato: "ARPS" },
  });
  assert.equal(d.elementos.get("totalContratosStrong").textContent, 3);
  assert.equal(d.elementos.get("totalContratos").hidden, false);
  assert.equal(d.graficos[0].configuracao.type, "doughnut");
  assert.equal(d.graficos[0].configuracao.options.maintainAspectRatio, false);
  d.assinaturas.get("contratos/fiscais").falhar();
  assert.equal(d.elementos.get("totalContratos").hidden, true);
  d.enviar("contratos/fiscais", null);
  assert.equal(d.elementos.get("totalContratosStrong").textContent, 0);
  assert.equal(d.elementos.get("totalContratos").hidden, false);
});

test("troca de tema atualiza as cores sem refazer gráficos, consultar dados ou alterar valores", () => {
  const d = iniciarDashboard();
  d.enviar("contratos/fiscais", { a: { tipoContrato: "ARPS" } });
  d.enviar("oficios", { "2026": { a: { data: "2026-02-10" } } });
  const dadosAntes = JSON.stringify(d.graficos.map(g => g.configuracao.data.datasets[0].data));
  d.trocarTema("#abcdef");
  assert.equal(d.graficos.length, 2);
  assert.equal(d.assinaturas.size, 2);
  assert.equal(JSON.stringify(d.graficos.map(g => g.configuracao.data.datasets[0].data)), dadosAntes);
  for (const g of d.graficos) {
    assert.equal(g.instancia.atualizacoes, 1);
    assert.equal(g.configuracao.options.plugins.tooltip.bodyColor, "#abcdef");
    if (g.configuracao.type === "bar") {
      assert.equal(g.configuracao.options.scales.y.ticks.color, "#abcdef");
      assert.equal(g.configuracao.options.scales.y.grid.color, "#abcdef");
    } else {
      assert.equal(g.configuracao.options.plugins.legend.labels.color, "#abcdef");
    }
  }
});
