import { app, auth, rtdb } from "./firebaseConfig.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { get, ref, set, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { getMessaging, getToken, deleteToken, isSupported } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging.js";

let messaging;
let registro;
let configuracao;
let usuario;
let habilitado = false;
const bloco = document.getElementById("blocoNotificacoesPush");
const botao = document.getElementById("btnNotificacoesPush");
const mensagem = document.getElementById("mensagemNotificacoesPush");
const chaveLocal = uid => `push-dispositivo:${location.origin}:${uid}`;
function informar(texto) { if (mensagem) mensagem.textContent = texto; }
function atualizarBotao() {
  if (botao) botao.textContent = habilitado ? "Desativar notificações neste dispositivo" : "Ativar notificações neste dispositivo";
}

async function registrarDispositivo() {
  registro ||= await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  if (!registro.active) await new Promise((resolve, reject) => {
    const worker = registro.installing || registro.waiting;
    if (!worker) return reject(new Error("O serviço de notificações não iniciou."));
    worker.addEventListener("statechange", () => {
      if (worker.state === "activated") resolve();
      if (worker.state === "redundant") reject(new Error("O serviço de notificações não iniciou."));
    });
  });
  const uid = usuario?.uid;
  if (!uid || auth.currentUser?.uid !== uid) return;
  const token = await getToken(messaging, { vapidKey: configuracao.vapidKey, serviceWorkerRegistration: registro });
  if (!token || auth.currentUser?.uid !== uid) return;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const id = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  await set(ref(rtdb, `push/dispositivos/${id}`), { uid, token, origem: location.origin, atualizadoEm: serverTimestamp() });
  try { localStorage.setItem(chaveLocal(uid), id); } catch { /* Registro válido sem cache local. */ }
  habilitado = true;
  atualizarBotao();
}

export async function desativarPushNesteDispositivo() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  let id;
  try { id = localStorage.getItem(chaveLocal(uid)); } catch {}
  if (id) await remove(ref(rtdb, `push/dispositivos/${id}`));
  if (messaging) await deleteToken(messaging);
  try { localStorage.removeItem(chaveLocal(uid)); } catch {}
  habilitado = false;
  atualizarBotao();
}

onAuthStateChanged(auth, async user => {
  usuario = user;
  if (botao) botao.hidden = true;
  if (bloco) bloco.hidden = true;
  if (!user) return;
  try {
    configuracao ||= await fetch("/push-config.json", { cache: "no-store" }).then(resposta => resposta.json());
    if (!configuracao.enabled || !configuracao.vapidKey || !configuracao.messagingSenderId || !configuracao.appId) return;
    const acesso = (await get(ref(rtdb, `controleAcesso/usuarios/${user.uid}`))).val();
    if (!acesso || acesso.ativo !== true || acesso.perfil === "GESTOR_ESCOLAR") return;
    const permissoes = (await get(ref(rtdb, `configuracoes/solicitacoes/permissoes/${acesso.perfil}`))).val() || {};
    if (acesso.perfil !== "ADM" && permissoes.todas !== true && !Object.values(permissoes.modulos || {}).some(valor => valor === true)) return;
    if (bloco) bloco.hidden = false;
    if (!(await isSupported())) {
      informar("Para receber notificações no iPhone, adicione o sistema à tela inicial e abra pelo ícone do aplicativo.");
      return;
    }
    messaging ||= getMessaging(initializeApp({ ...app.options, messagingSenderId: configuracao.messagingSenderId, appId: configuracao.appId }, "push"));
    if (botao) botao.hidden = false;
    // Só renova uma inscrição existente; não solicita permissão ao abrir a página.
    let inscrito = false;
    try { inscrito = Boolean(localStorage.getItem(chaveLocal(user.uid))); } catch {}
    if (Notification.permission === "granted" && inscrito) await registrarDispositivo();
    atualizarBotao();
  } catch (erro) {
    console.error("Erro ao preparar notificações:", erro);
    informar("Não foi possível preparar as notificações neste dispositivo.");
  }
});

botao?.addEventListener("click", async () => {
  botao.disabled = true;
  try {
    if (habilitado) {
      await desativarPushNesteDispositivo();
      informar("Notificações desativadas neste dispositivo.");
      return;
    }
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") {
      informar("Para ativar os avisos, permita notificações nas configurações do navegador.");
      return;
    }
    await registrarDispositivo();
    informar("Notificações ativadas. Você receberá avisos dos pedidos que pode atender.");
  } catch (erro) {
    console.error("Erro ao configurar notificações:", erro);
    informar("Não foi possível configurar as notificações. Tente novamente.");
  } finally { botao.disabled = false; }
});
