import { rtdb } from "./firebaseConfig.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { categoriaCalendario, dataLocalCalendario } from "./core/calendarioEventos.js";
import { dataEventoNoAno } from "./core/eventosRegras.js";

const container = document.getElementById("datasComemorativas");
let datas = null;
let eventos = [];
let eventosCarregados = false;
let erroDatas = false;
let erroEventos = false;

function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function renderizar() {
  if (!container || datas === null || !eventosCarregados) return;
  const hoje = new Date();
  const iso = dataLocalCalendario(hoje);
  const comemoracoes = datas.filter((data) => data.data === iso.slice(5));
  const cadastrados = eventos.filter((evento) => (evento.categoria === "aniversario" || !evento.concluido) && dataEventoNoAno(evento, hoje.getFullYear()) === iso);
  const icones = { "Educação": "school", "Profissional": "work", "Cultura": "palette", "Saúde": "health_and_safety", "Inclusão": "diversity_1", "Meio Ambiente": "eco", "História": "history_edu", "Religiosa": "church" };
  const iconesEventos = { aniversario: "cake", reuniao: "groups", resposta_mp: "gavel", alerta: "warning", audiencias: "record_voice_over" };
  const itens = [
    ...comemoracoes.map((data) => ({ titulo: data.nome, categoria: data.categoria, icone: icones[data.categoria] || "celebration" })),
    ...cadastrados.map((evento) => ({ titulo: evento.titulo, categoria: categoriaCalendario(evento.categoria).nome, icone: iconesEventos[evento.categoria] || "event" })),
  ];
  container.innerHTML = `
    <div class="datas-comemorativas-header">
      <div class="datas-comemorativas-titulo">
        <span class="material-symbols-outlined">event</span>
        <div><strong>Datas e eventos de hoje</strong><span>${comemoracoes.length} ${comemoracoes.length === 1 ? "comemoração" : "comemorações"} · ${cadastrados.length} ${cadastrados.length === 1 ? "evento" : "eventos"}</span></div>
      </div>
      <span class="datas-comemorativas-data">${iso.slice(8)}/${iso.slice(5, 7)}</span>
    </div>
    <div class="datas-comemorativas-lista">
      ${itens.map((item) => `
        <div class="data-comemorativa-item">
          <div class="data-comemorativa-icone"><span class="material-symbols-outlined">${item.icone}</span></div>
          <div class="data-comemorativa-conteudo"><strong>${escapar(item.titulo)}</strong><span>${escapar(item.categoria)}</span></div>
        </div>
      `).join("")}
    </div>
    ${!itens.length && !erroDatas && !erroEventos ? '<p>Não há datas comemorativas nem eventos pendentes para hoje.</p>' : ""}
    ${erroDatas || erroEventos ? '<p role="status">Parte da agenda não pôde ser carregada. Tente atualizar a página.</p>' : ""}
  `;
}

onValue(ref(rtdb, "eventos"), (snapshot) => {
  eventosCarregados = true;
  eventos = Object.values(snapshot.val() || {});
  erroEventos = false;
  renderizar();
}, () => {
  eventosCarregados = true;
  erroEventos = true;
  renderizar();
});

fetch(new URL("../datasComemorativas.json", import.meta.url))
  .then((resposta) => {
    if (!resposta.ok) throw new Error("Falha ao carregar datas comemorativas");
    return resposta.json();
  })
  .then((dados) => { datas = dados; renderizar(); })
  .catch(() => { datas = []; erroDatas = true; renderizar(); });

document.addEventListener("visibilitychange", () => { if (!document.hidden) renderizar(); });
