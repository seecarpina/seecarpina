// 🌀 Remove a tela de loading
window.addEventListener("load", () => {
  document.querySelector(".loading").style.display = "none";
});

// 📦 Imports Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  get,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ⚙️ Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCl69j1qpqKObNlZFSDOaJY5Ob8arFCr3k",
  authDomain: "see-carpina-2a774.firebaseapp.com",
  projectId: "see-carpina-2a774",
  databaseURL: "https://see-carpina-2a774-default-rtdb.firebaseio.com",
};

// 🔥 Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// 🧍‍♂️ Controle do usuário logado
let nomeResponsavel = "Usuário";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./login";
    return;
  }

  try {
    const userRef = doc(db, "usuarios", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      nomeResponsavel = userSnap.data().nome.split(" ")[0];
    } else if (user.displayName) {
      nomeResponsavel = user.displayName.split(" ")[0];
    }

    // Exibe nome em campos, se existirem
    const campoResp = document.getElementById("responsavel");
    if (campoResp) campoResp.value = nomeResponsavel;

    const boasVindas = document.getElementById("boasVindas");
    if (boasVindas) boasVindas.textContent = `👋 Olá, ${nomeResponsavel}!`;
  } catch (err) {
    console.error("Erro ao buscar nome:", err);
  }
});

// 🚪 Logout
const logoutLink = document.getElementById("logout");
if (logoutLink) {
  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = "./login";
    } catch (error) {
      alert("Erro ao sair: " + error.message);
    }
  });
}

// 🔥 Carregar destinos do Realtime Database
const destinosRef = ref(rtdb, "destinos");

let destinos = [];

const inputDestino = document.getElementById("destino");
const boxDestino = document.getElementById("autocompleteDestino");

const inputCopia = document.getElementById("copia");
const boxCopia = document.getElementById("autocompleteCopia");

// Carregar destinos
onValue(destinosRef, (snap) => {
  destinos = snap.exists() ? Object.values(snap.val()) : [];
});

// Função para mostrar sugestões
function mostrarSugestoes(input, lista, box) {
  const texto = input.value.toLowerCase();
  box.innerHTML = "";

  if (texto === "") {
    box.style.display = "none";
    return;
  }

  const filtrados = lista.filter((d) => d.toLowerCase().includes(texto));

  if (filtrados.length === 0) {
    box.style.display = "none";
    return;
  }

  filtrados.forEach((dest) => {
    const li = document.createElement("li");
    li.textContent = dest;
    li.onclick = () => {
      input.value = dest;
      box.style.display = "none";
    };
    box.appendChild(li);
  });

  box.style.display = "block";
}

// Eventos dos inputs
inputDestino.addEventListener("input", () =>
  mostrarSugestoes(inputDestino, destinos, boxDestino)
);

inputCopia.addEventListener("input", () =>
  mostrarSugestoes(inputCopia, destinos, boxCopia)
);

// Fechar ao clicar fora
document.addEventListener("click", (e) => {
  if (!inputDestino.contains(e.target)) boxDestino.style.display = "none";
  if (!inputCopia.contains(e.target)) boxCopia.style.display = "none";
});

// 💬 Notificações
function mostrarNotificacao(msg, tipo = "sucesso") {
  const c = document.getElementById("notificacao");
  if (!c) return alert(msg); // fallback se não existir container

  const div = document.createElement("div");
  div.className = `msg ${tipo}`;
  div.textContent = msg;
  c.appendChild(div);
  setTimeout(() => {
    div.style.animation = "desaparecer 0.4s forwards";
    setTimeout(() => div.remove(), 400);
  }, 5000);
}

// 💾 Cadastro de ofício
const formOficio = document.getElementById("formOficio");
if (formOficio) {
  formOficio.addEventListener("submit", async (e) => {
    e.preventDefault();

    const assunto = document.getElementById("assunto").value.trim();
    const destino = document.getElementById("destino").value;
    const copia = document.getElementById("copia").value;

    if (!assunto)
      return mostrarNotificacao("Preencha o campo de assunto!", "erro");
    if (!destino) return mostrarNotificacao("Selecione um destino!", "erro");

    const hoje = new Date();
    const dataISO = hoje.toISOString().split("T")[0];

    try {
      const oficiosRef = ref(rtdb, "oficios");
      const snap = await get(oficiosRef);
      const total = snap.exists() ? Object.keys(snap.val()).length : 0;
      const numeroGerado = total + 1;

      await push(oficiosRef, {
        numero: numeroGerado,
        assunto,
        data: dataISO,
        destino,
        copia,
        responsavel: nomeResponsavel,
        criadoEm: new Date().toISOString(),
      });

      mostrarNotificacao(`Ofício nº ${numeroGerado} cadastrado com sucesso!`);
      e.target.reset();
    } catch (err) {
      mostrarNotificacao("Erro: " + err.message, "erro");
    }
  });
}

// 📡 Atualização em tempo real da tabela
const tabela = document.querySelector("#tabelaOficios tbody");
const paginacao = document.getElementById("paginacao");
const inputBusca = document.getElementById("busca");
const oficiosRef = ref(rtdb, "oficios");

let todosOficios = [];
let paginaAtual = 1;
const porPagina = 100;

function formatarDataBR(iso) {
  if (!iso) return "-";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function renderTabela() {
  if (!tabela) return;

  const filtro = inputBusca ? inputBusca.value.toLowerCase() : "";
  const filtrados = todosOficios.filter((o) =>
    `${o.numero} ${o.assunto} ${o.data} ${o.destino} ${o.copia} ${o.responsavel}`
      .toLowerCase()
      .includes(filtro)
  );

  const totalPaginas = Math.ceil(filtrados.length / porPagina);
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas || 1;

  const inicio = (paginaAtual - 1) * porPagina;
  const pagina = filtrados.slice(inicio, inicio + porPagina);

  tabela.innerHTML = "";
  pagina.forEach((o) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${o.numero}</td>
        <td class='assunto'>${o.assunto}</td>
        <td>${formatarDataBR(o.data)}</td>
        <td>${o.destino ?? "-"}</td>
        <td>${o.copia ?? "-"}</td>
        <td>${o.responsavel}</td>
        <td>${
          o.responsavel === nomeResponsavel
            ? "<span class='material-symbols-outlined'>edit_square</span>"
            : ""
        }</td>`;
    tabela.appendChild(tr);
  });

  if (!pagina.length) {
    tabela.innerHTML =
      '<tr><td colspan="6" style="text-align:center;">Nenhum resultado encontrado</td></tr>';
  }

  // 🔢 Paginação numérica
  if (paginacao) {
    paginacao.innerHTML = "";
    const maxPaginasVisiveis = 10;
    let inicioPagina = Math.max(1, paginaAtual - 2);
    let fimPagina = Math.min(
      totalPaginas,
      inicioPagina + maxPaginasVisiveis - 1
    );

    for (let i = inicioPagina; i <= fimPagina; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      if (i === paginaAtual) btn.classList.add("ativo");
      btn.onclick = () => {
        paginaAtual = i;
        renderTabela();
      };
      paginacao.appendChild(btn);
    }
  }
}

onValue(oficiosRef, (snap) => {
  if (snap.exists()) {
    todosOficios = Object.values(snap.val()).reverse();
  } else {
    todosOficios = [];
  }
  renderTabela();
});

if (inputBusca) inputBusca.addEventListener("input", renderTabela);
