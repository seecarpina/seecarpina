import { rtdb } from "./firebaseConfig.js";
import {
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const eventosRef = ref(rtdb, "eventos");

onValue(eventosRef, (snap) => {
  const eventosPorData = {};

  if (snap.exists()) {
    Object.values(snap.val()).forEach((e) => {
      if (!eventosPorData[e.data]) {
        eventosPorData[e.data] = [];
      }

      eventosPorData[e.data].push({
        titulo: e.titulo,
      });
    });
  }

  // 🔔 avisa TODAS as páginas
  window.dispatchEvent(
    new CustomEvent("eventosAtualizados", {
      detail: eventosPorData,
    })
  );
});
