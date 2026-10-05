import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getMessaging } from "firebase-admin/messaging";
import { onValueCreated } from "firebase-functions/v2/database";
import { defineString } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { chavesModulos, podeReceberPedido, criarAvisoPedido } from "./regrasPush.js";

initializeApp();
const origemSecretaria = defineString("ORIGEM_SECRETARIA", { description: "Origem HTTPS do sistema da secretaria (sem caminho)." });

export const notificarNovoPedido = onValueCreated({
  ref: "/portalGestor/solicitacoes/registros/{pedidoId}",
  instance: "see-carpina-2a774-default-rtdb",
  region: "us-central1",
  retry: true,
}, async (event) => {
  const pedido = event.data.val();
  if (!pedido || pedido.status !== "RECEBIDA" || !chavesModulos[pedido.modulo]) return;
  const origem = new URL(origemSecretaria.value()).origin;
  if (!origem.startsWith("https://")) throw new Error("ORIGEM_SECRETARIA deve usar HTTPS.");
  const db = getDatabase();
  const [usuariosSnap, permissoesSnap, dispositivosSnap, enviadosSnap] = await Promise.all([
    db.ref("controleAcesso/usuarios").get(),
    db.ref("configuracoes/solicitacoes/permissoes").get(),
    db.ref("push/dispositivos").get(),
    db.ref(`push/enviados/${event.params.pedidoId}`).get(),
  ]);
  const usuarios = usuariosSnap.val() || {};
  const permissoes = permissoesSnap.val() || {};
  const enviados = enviadosSnap.val() || {};
  const destinos = Object.entries(dispositivosSnap.val() || {}).filter(([id, dispositivo]) =>
    !enviados[id] && dispositivo.origem === origem && typeof dispositivo.token === "string" &&
    podeReceberPedido({ ...usuarios[dispositivo.uid], uid: dispositivo.uid }, permissoes, pedido.modulo, pedido.solicitanteUid),
  );
  const aviso = criarAvisoPedido(event.params.pedidoId, pedido, origem);
  let falhasTemporarias = 0;
  for (let inicio = 0; inicio < destinos.length; inicio += 500) {
    const lote = destinos.slice(inicio, inicio + 500);
    const resultado = await getMessaging().sendEachForMulticast({
      tokens: lote.map(([, dispositivo]) => dispositivo.token),
      data: aviso,
      webpush: { headers: { TTL: "86400", Urgency: "normal" } },
    });
    for (const [indice, resposta] of resultado.responses.entries()) {
      const [id, dispositivo] = lote[indice];
      if (resposta.success) {
        await db.ref(`push/enviados/${event.params.pedidoId}/${id}`).set(Date.now());
      } else if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(resposta.error?.code)) {
        await db.ref(`push/dispositivos/${id}`).transaction(atual => atual?.token === dispositivo.token && atual?.uid === dispositivo.uid ? null : undefined);
      } else {
        falhasTemporarias++;
      }
    }
  }
  logger.info("Envio de avisos de pedido concluído", { pedidoId: event.params.pedidoId, dispositivos: destinos.length, falhasTemporarias });
  if (falhasTemporarias) throw new Error("Falha temporária no envio; tentar novamente.");
});
