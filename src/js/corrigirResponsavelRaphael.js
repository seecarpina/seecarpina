import { auth, rtdb } from "./firebaseConfig.js";
import { ref, get, runTransaction } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { listarResponsaveisRaphael, corrigirNomeRaphael } from "./core/correcaoResponsavelRaphael.js";

// Execução manual no console do site, com a conta autenticada e suas permissões existentes.
export async function corrigirResponsavelRaphael({ aplicar = false } = {}) {
  if (!auth.currentUser) throw new Error("Entre no sistema antes de executar a correção.");
  const [oficios, circulares] = await Promise.all([
    get(ref(rtdb, "oficios")),
    get(ref(rtdb, "oficiosCirculares")),
  ]);
  const registros = listarResponsaveisRaphael({ oficios: oficios.val(), oficiosCirculares: circulares.val() });
  console.table(registros);
  if (aplicar !== true) {
    console.info(`Prévia: ${registros.length} registro(s). Nenhuma alteração foi gravada.`);
    return { encontrados: registros.length, registros, aplicado: false };
  }
  const resultado = { encontrados: registros.length, alterados: 0, ignorados: 0, falhas: [], aplicado: true };
  for (const registro of registros) {
    try {
      const transacao = await runTransaction(ref(rtdb, registro.caminho), corrigirNomeRaphael, { applyLocally: false });
      if (transacao.committed && transacao.snapshot.val() === "Raphael Silva") resultado.alterados++;
      else resultado.ignorados++;
    } catch (erro) {
      resultado.falhas.push({ caminho: registro.caminho, mensagem: erro.message });
    }
  }
  console.info("Resultado da correção:", resultado);
  return resultado;
}
