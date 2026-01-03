import { auth, db, rtdb } from "./firebaseConfig.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  ref,
  push,
  onChildAdded,
  onValue,
  set,
  remove,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* =========================
   CONFIGURAÇÕES
========================= */
const CARGOS_PERMITIDOS = ["ADM", "GERENTE"];

/* =========================
   FUNÇÕES AUXILIARES
========================= */
function corDoUsuario(uid) {
  let hash = 5381;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 33) ^ uid.charCodeAt(i);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 40%)`;
}

function formatarData(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatarHora(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================
   INIT CHAT
========================= */
export function initChat() {
  let chatInicializado = false;
  let ultimaDataRenderizada = null;
  let ultimoUid = null;
  let ultimoTimestamp = 0;
  let ultimoGrupo = null;

  const chatBox = document.getElementById("chat-admin");
  const chatHeader = document.getElementById("chat-header");
  const chatMensagens = document.getElementById("chat-mensagens");
  const chatTexto = document.getElementById("chat-texto");
  const chatEnviar = document.getElementById("chat-enviar");
  const chatDigitando = document.getElementById("chat-digitando");
  const chatBadge = document.getElementById("chat-badge");
  const chatSound = document.getElementById("chat-sound");

  document.addEventListener(
    "click",
    () => {
      chatSound
        ?.play()
        .then(() => {
          chatSound.pause();
          chatSound.currentTime = 0;
        })
        .catch(() => {});
    },
    { once: true }
  );

  if (!chatBox) return;

  const mensagensRef = ref(rtdb, "chat_admin/mensagens");
  const digitandoRef = ref(rtdb, "chat_admin/digitando");

  let usuarioAtual = null;
  let dadosUsuario = null;
  let lastRead = 0;
  let naoLidas = 0;
  let typingTimeout = null;

  /* =========================
     ABRIR / FECHAR CHAT
  ========================= */
  chatHeader.addEventListener("click", () => {
    const aberto = chatBox.classList.toggle("aberto");

    if (aberto) {
      naoLidas = 0;
      atualizarBadge();
      marcarComoLido();
    }
  });

  window.addEventListener("beforeunload", () => {
    if (usuarioAtual) {
      remove(ref(rtdb, `chat_admin/digitando/${usuarioAtual.uid}`));
    }
  });

  /* =========================
     AUTENTICAÇÃO
  ========================= */
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      chatBox.style.display = "none";
      return;
    }

    if (chatInicializado) return;
    chatInicializado = true;

    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (!snap.exists()) {
      chatBox.style.display = "none";
      return;
    }

    const dados = snap.data();
    const cargo = dados.cargo?.trim().toUpperCase();

    if (!CARGOS_PERMITIDOS.includes(cargo)) {
      chatBox.style.display = "none";
      return;
    }

    usuarioAtual = user;
    dadosUsuario = dados;
    chatBox.style.display = "block";
    marcarComoLido();

    iniciarLeituraMensagens();
    iniciarDigitando();
    iniciarNaoLidas();

    chatEnviar.addEventListener("click", enviarMensagem);
    chatTexto.addEventListener("keydown", (e) => {
      if (e.key === "Enter") enviarMensagem();
    });
  });

  /* =========================
     MENSAGENS
  ========================= */
  function iniciarLeituraMensagens() {
    onChildAdded(mensagensRef, (snapshot) => {
      const msg = snapshot.val();
      const ehMinhaMensagem = msg.uid === usuarioAtual.uid;

      const dataMsg = formatarData(msg.timestamp);
      const horaMsg = formatarHora(msg.timestamp);

      // === separador de data ===
      if (dataMsg !== ultimaDataRenderizada) {
        ultimaDataRenderizada = dataMsg;

        const separador = document.createElement("div");
        separador.className = "chat-data";
        separador.textContent = dataMsg;
        chatMensagens.appendChild(separador);

        // resetar agrupamento ao mudar o dia
        ultimoUid = null;
        ultimoTimestamp = 0;
        ultimoGrupo = null;
      }

      const mesmaPessoa = msg.uid === ultimoUid;
      const dentroDoTempo = msg.timestamp - ultimoTimestamp < 5 * 60 * 1000; // 5 min

      // === criar novo grupo ===
      if (!mesmaPessoa || !dentroDoTempo || !ultimoGrupo) {
        ultimoGrupo = document.createElement("div");
        ultimoGrupo.className = "chat-grupo";

        if (ehMinhaMensagem) {
          ultimoGrupo.classList.add("minha");
        }

        ultimoGrupo.innerHTML = `
      <div class="chat-grupo-header">
        <span class="nome" style="color:${corDoUsuario(msg.uid)}">
          ${msg.nome}
        </span>
        <span class="hora">${horaMsg}</span>
      </div>
    `;

        chatMensagens.appendChild(ultimoGrupo);
      }

      // === mensagem ===
      const texto = document.createElement("div");
      texto.className = "chat-msg-texto";
      texto.textContent = msg.texto;

      ultimoGrupo.appendChild(texto);

      chatMensagens.scrollTop = chatMensagens.scrollHeight;

      // === controle de estado ===
      ultimoUid = msg.uid;
      ultimoTimestamp = msg.timestamp;

      // === não lidas + som ===
      if (
        msg.uid !== usuarioAtual.uid &&
        msg.timestamp > lastRead &&
        !chatBox.classList.contains("aberto")
      ) {
        naoLidas++;
        atualizarBadge();
        tocarSom();
      }
    });
  }

  function tocarSom() {
    if (!chatSound) return;

    chatSound.currentTime = 0;

    chatSound.play().catch(() => {
      // navegadores bloqueiam autoplay antes de interação
    });
  }
  function enviarMensagem() {
    const texto = chatTexto.value.trim();
    if (!texto) return;

    push(mensagensRef, {
      uid: usuarioAtual.uid,
      nome: dadosUsuario.nome.split(" ")[0],
      texto,
      timestamp: Date.now(),
    });

    chatTexto.value = "";
    remove(ref(rtdb, `chat_admin/digitando/${usuarioAtual.uid}`));
  }

  /* =========================
     DIGITANDO...
  ========================= */
  function iniciarDigitando() {
    chatTexto.addEventListener("input", () => {
      set(ref(rtdb, `chat_admin/digitando/${usuarioAtual.uid}`), {
        nome: dadosUsuario.nome.split(" ")[0],
        timestamp: Date.now(),
      });

      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        remove(ref(rtdb, `chat_admin/digitando/${usuarioAtual.uid}`));
      }, 1500);
    });

    onValue(digitandoRef, (snap) => {
      if (!snap.exists()) {
        chatDigitando.textContent = "";
        return;
      }

      const nomes = Object.entries(snap.val())
        .filter(([uid]) => uid !== usuarioAtual.uid)
        .map(([_, d]) => d.nome);

      chatDigitando.textContent =
        nomes.length > 0 ? `${nomes.join(", ")} digitando...` : "";
    });
  }

  /* =========================
     NÃO LIDAS
  ========================= */
  function iniciarNaoLidas() {
    const lidosRef = ref(rtdb, `chat_admin/lidos/${usuarioAtual.uid}`);

    onValue(lidosRef, (snap) => {
      if (snap.exists()) {
        lastRead = snap.val().lastRead || 0;
      }
    });
  }

  function marcarComoLido() {
    if (!usuarioAtual) return;

    set(ref(rtdb, `chat_admin/lidos/${usuarioAtual.uid}`), {
      lastRead: Date.now(),
    });
  }

  function atualizarBadge() {
    if (!chatBadge) return;

    if (naoLidas > 0) {
      chatBadge.textContent = naoLidas > 99 ? "99+" : naoLidas;
      chatBadge.style.display = "inline-block";
    } else {
      chatBadge.style.display = "none";
    }
  }
}
