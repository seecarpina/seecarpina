export function categoriaExigeValidade(categoria = {}) {
  const nome = String(categoria.nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return categoria.exigeValidade === true || /alimenta|generos|merenda/.test(nome);
}

export function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || "")) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

export function formatarValidade(valor) {
  if (!dataValida(valor)) return "Não informada";
  return valor.split("-").reverse().join("/");
}

export function hojeLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function inicializarLotes(material, exigeValidade = false) {
  if (material.controleLotes) return { ...material, exigeValidade: material.exigeValidade || exigeValidade };
  const saldo = Number(material.estoque || 0);
  return { ...material, controleLotes: true, exigeValidade, lotes: {
    legado: { codigo: "Estoque anterior", saldo, quantidadeInicial: saldo, validade: "", entradaEm: material.criadoEm || "", legado: true },
  } };
}

export function listarLotes(material) {
  const m = material.controleLotes ? material : inicializarLotes(material, material.exigeValidade);
  return Object.entries(m.lotes || {}).map(([id, lote]) => ({ id, ...lote })).sort((a, b) =>
    (a.validade || "9999-12-31").localeCompare(b.validade || "9999-12-31") ||
    String(a.entradaEm || "").localeCompare(String(b.entradaEm || "")) || a.id.localeCompare(b.id));
}

export function selecionarLotesSaida(material, quantidade, hoje = hojeLocal()) {
  if (!Number.isFinite(quantidade) || quantidade <= 0) throw new Error("Quantidade inválida.");
  let restante = quantidade;
  const utilizados = [];
  for (const lote of listarLotes(material)) {
    // Durante a transição, saldo sem validade pode sair; datas inválidas ou vencidas continuam bloqueadas.
    if (lote.saldo <= 0 || (lote.validade && (!dataValida(lote.validade) || lote.validade < hoje))) continue;
    const baixa = Math.min(restante, Number(lote.saldo));
    if (baixa > 0) utilizados.push({ loteId: lote.id, codigo: lote.codigo || lote.id, validade: lote.validade || "", quantidade: baixa });
    restante -= baixa;
    if (restante === 0) break;
  }
  if (restante > 0) throw new Error(`Saldo de lotes disponíveis insuficiente para "${material.nome || "material"}". Confira os saldos e lotes vencidos ou com validade inválida em Ver lotes.`);
  return utilizados;
}

export function lotesParaDevolucao(item) {
  if (!item.lotes?.length) return [{ loteId: "legado", quantidade: Number(item.quantidade), legado: true }];
  const soma = item.lotes.reduce((total, lote) => total + Number(lote.quantidade), 0);
  if (Math.abs(soma - Number(item.quantidade)) > 0.000001 || item.lotes.some(l => !l.loteId || !(Number(l.quantidade) > 0))) throw new Error("Lotes do romaneio inconsistentes.");
  return item.lotes;
}

export function loteDaEntradaParaExcluir(material, movimentacao) {
  const loteId = movimentacao.loteId || "legado";
  const quantidade = Number(movimentacao.quantidade);
  if (!(quantidade > 0) || Number(material.lotes?.[loteId]?.saldo || 0) < quantidade) {
    throw new Error("Esta entrada já foi utilizada. Não é possível excluir o lote sem estornar as saídas.");
  }
  return loteId;
}

// Informações de entrega para o PDF, sem nomes de lotes nem saldos internos.
export function linhasValidadeRomaneio(item, alimentacao = item.alimentacao === true) {
  if (!alimentacao) return [];
  const porValidade = new Map();
  for (const lote of item.lotes || []) {
    const quantidade = Number(lote.quantidade || 0);
    if (!(quantidade > 0)) continue;
    const validade = dataValida(lote.validade) ? lote.validade : "";
    porValidade.set(validade, (porValidade.get(validade) || 0) + quantidade);
  }
  return [...porValidade].map(([validade, quantidade]) =>
    `Validade: ${formatarValidade(validade)} - Quantidade entregue: ${quantidade} ${item.unidade || "Unidade"}`,
  );
}
