import { rtdb } from "../firebaseConfig.js";
import { ref, get, runTransaction, increment } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { categoriaExigeValidade, inicializarLotes, selecionarLotesSaida, lotesParaDevolucao } from "./estoqueLotes.js";

export async function garantirLotes(materialId, exigirValidade) {
  const caminho = ref(rtdb, `materiais/${materialId}`);
  const snapshot = await get(caminho);
  if (!snapshot.exists()) throw new Error("Material não encontrado.");
  const atual = snapshot.val();
  if (exigirValidade === undefined) {
    const categoria = await get(ref(rtdb, `configuracoes/estoque/categorias/${atual.categoriaId}`));
    exigirValidade = categoriaExigeValidade(categoria.val() || {});
  }
  if (atual.controleLotes && (!exigirValidade || atual.exigeValidade)) return atual;
  const resultado = await runTransaction(caminho, material => material ? inicializarLotes(material, exigirValidade) : undefined, { applyLocally: false });
  if (!resultado.committed) throw new Error("Não foi possível preparar os lotes. Tente novamente.");
  return resultado.snapshot.val();
}

export function adicionarBaixaLotes(atualizacoes, materialId, material, quantidade) {
  const lotes = selecionarLotesSaida(material, quantidade);
  for (const lote of lotes) atualizacoes[`materiais/${materialId}/lotes/${lote.loteId}/saldo`] = increment(-lote.quantidade);
  return lotes;
}

export async function adicionarDevolucaoLotes(atualizacoes, item) {
  const material = await garantirLotes(item.materialId);
  for (const lote of lotesParaDevolucao(item)) {
    if (!material.lotes?.[lote.loteId]) throw new Error("Lote de origem não encontrado. A devolução não foi realizada.");
    const base = `materiais/${item.materialId}/lotes/${lote.loteId}`;
    atualizacoes[`${base}/saldo`] = increment(Number(lote.quantidade));
    if (lote.legado) atualizacoes[`${base}/quantidadeInicial`] = increment(Number(lote.quantidade));
  }
}
