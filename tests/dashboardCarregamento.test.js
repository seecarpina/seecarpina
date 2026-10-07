import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function iniciarDashboard() {
  const elementos = new Map();
  function elemento(id) {
    const el = {
      id, hidden: true, value: "", textContent: "", innerHTML: "", erro: null,
      appendChild(filho) {
        if (filho.className === "dashboard-grafico-erro") this.erro = filho;
        else if (!this.value) this.value = filho.value;
      },
      querySelector() { return this.erro; },
      setAttribute() {},
      addEventListener(tipo, fn) { this[tipo] = fn; },
      remove() { for (const pai of elementos.values()) if (pai.erro === this) pai.erro = null; },
    };
    elementos.set(id, el);
    return el;
  }
  for (const id of ["dashboardGraficos", "resumoOficios", "resumoContratos", "graficoOficiosMes", "graficoContratos", "totalOficios", "filtroAno", "totalStrong"]) elemento(id);
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
    getComputedStyle: () => ({ getPropertyValue: () => "#123456" }),
    Chart: function(canvas, configuracao) {
      assert.equal(canvas.hidden, false);
      assert.equal(canvas.closest().hidden, false);
      assert.equal(elementos.get("dashboardGraficos").hidden, false);
      graficos.push({ canvas, configuracao });
      this.destroy = () => {};
    },
    console: { error() {} },
  };
  const codigo = readFileSync(new URL("../src/js/dashboard.js", import.meta.url), "utf8")
    .replace(/import[\s\S]*?from\s+"[^"]+";/g, "");
  vm.runInNewContext(codigo, contexto);
  const enviar = (caminho, dados) => assinaturas.get(caminho).receber({ exists: () => dados !== null, val: () => dados });
  return { elementos, assinaturas, graficos, enviar };
}

test("gráficos são revelados independentemente após receber dados, inclusive dados vazios", () => {
  const d = iniciarDashboard();
  assert.equal(d.graficos.length, 0);
  d.enviar("contratos/fiscais", null);
  assert.equal(d.elementos.get("resumoContratos").hidden, false);
  assert.equal(d.elementos.get("resumoOficios").hidden, true);
  d.enviar("oficios", null);
  assert.equal(d.elementos.get("resumoOficios").hidden, false);
  assert.equal(d.elementos.get("totalStrong").textContent, 0);
  assert.equal(d.graficos.length, 2);
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
  d.enviar("oficios", null);
  assert.equal(d.elementos.get("resumoOficios").erro, null);
  assert.equal(d.elementos.get("graficoOficiosMes").hidden, false);
});
