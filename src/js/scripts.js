// 🌀 Remove a tela de loading
window.addEventListener("load", () => {
  document.querySelector(".loading").style.display = "none";
});

import { carregarSidebar, carregarRight } from "./include.js";
import { auth, db, rtdb } from "./firebaseConfig.js"; // <<–– CONFIG DO FIREBASE AGORA ESTÁ AQUI

carregarSidebar().then(() => {
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
});

carregarRight().then(() => {
  // menu
  const sideMenu = document.querySelector("aside");
  const menuBtn = document.querySelector("#menu_bar");
  const closeBtn = document.querySelector("#close_btn");

  // tema
  const themeToggler = document.querySelector(".theme-toggler");

  menuBtn.addEventListener("click", () => {
    sideMenu.style.display = "block";
  });

  closeBtn.addEventListener("click", () => {
    sideMenu.style.display = "none";
  });

  themeToggler.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme-variables");
    themeToggler.querySelector("span:nth-child(1)").classList.toggle("active");
    themeToggler.querySelector("span:nth-child(2)").classList.toggle("active");
  });
});

function padronizarTexto(str) {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

// 📦 Imports necessários do Firebase (agora sem config)
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  ref,
  push,
  onValue,
  get,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

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

    window.dadosUsuario = userSnap.data();
    window.usuarioAuth = user;

    const campoResp = document.getElementById("responsavel");
    if (campoResp) campoResp.value = nomeResponsavel;

    const boasVindas = document.getElementById("boasVindas");
    if (boasVindas) boasVindas.textContent = `👋 Olá, ${nomeResponsavel}!`;

    document.querySelector("#nomeUsuario").textContent = nomeResponsavel;

    // Foto do usuário no topo
    const fotoTopo = document.querySelector(".profile-photo img");

    if (window.dadosUsuario?.foto) {
      fotoTopo.src = window.dadosUsuario.foto;
    } else {
      fotoTopo.src = "./src/images/profile.webp"; // fallback padrão
    }
  } catch (err) {
    console.error("Erro ao buscar nome:", err);
  }
});

// 🔥 Carregar destinos do Realtime Database
const destinosRef = ref(rtdb, "destinos");
let destinos = [];

const inputDestino = document.getElementById("destino");
const boxDestino = document.getElementById("autocompleteDestino");

const inputCopia = document.getElementById("copia");
const boxCopia = document.getElementById("autocompleteCopia");

onValue(destinosRef, (snap) => {
  destinos = snap.exists()
    ? [...new Set(Object.values(snap.val()).map((d) => padronizarTexto(d)))]
    : [];
});

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

inputDestino.addEventListener("input", () =>
  mostrarSugestoes(inputDestino, destinos, boxDestino)
);

inputCopia.addEventListener("input", () =>
  mostrarSugestoes(inputCopia, destinos, boxCopia)
);

document.addEventListener("click", (e) => {
  if (!inputDestino.contains(e.target)) boxDestino.style.display = "none";
  if (!inputCopia.contains(e.target)) boxCopia.style.display = "none";
});

// 💬 Notificações
function mostrarNotificacao(msg, tipo = "sucesso") {
  const c = document.getElementById("notificacao");
  if (!c) return alert(msg);

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

    if (editando) {
      document.getElementById("btnSalvarEdicao").click();
      return;
    }

    const assunto = document.getElementById("assunto").value.trim();
    const destino = padronizarTexto(document.getElementById("destino").value);
    const copia = padronizarTexto(document.getElementById("copia").value);

    if (!assunto)
      return mostrarNotificacao("Preencha o campo de assunto!", "erro");
    if (!destino) return mostrarNotificacao("Selecione um destino!", "erro");

    const hoje = new Date();
    const dataISO = hoje.toISOString().split("T")[0];

    try {
      const oficiosRef = ref(rtdb, "oficios");
      const snap = await get(oficiosRef);
      const dados = snap.exists() ? snap.val() : {};
      let maiorNumero = 0;

      Object.values(dados).forEach((o) => {
        const num = Number(o.numero);
        if (!isNaN(num) && num > maiorNumero) maiorNumero = num;
      });

      const numeroGerado = maiorNumero + 1;

      await push(oficiosRef, {
        numero: numeroGerado,
        assunto,
        data: dataISO,
        destino,
        copia,
        responsavel: nomeResponsavel,
        criadoEm: new Date().toISOString(),
      });

      if (destino && !destinos.includes(destino)) push(destinosRef, destino);
      if (copia && !destinos.includes(copia)) push(destinosRef, copia);

      mostrarNotificacao(`Ofício nº ${numeroGerado} cadastrado com sucesso!`);
      e.target.reset();
    } catch (err) {
      mostrarNotificacao("Erro: " + err.message, "erro");
    }
  });
}

// 📡 Atualização da tabela
const tabela = document.querySelector("#tabelaOficios tbody");
tabela.innerHTML = `<tr><td colspan="7" style="text-align:center;"><svg class="svg-spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4"/></svg></td></tr>`;

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
  const mostrarDisponiveis =
    document.getElementById("filtroDisponiveis")?.checked;

  let filtrados = todosOficios.filter((o) =>
    `${o.numero} ${o.assunto} ${o.data} ${o.destino} ${o.copia} ${o.responsavel}`
      .toLowerCase()
      .includes(filtro)
  );

  if (mostrarDisponiveis) {
    filtrados = filtrados.filter((o) => !o.assunto || o.assunto.trim() === "");
  }

  const totalPaginas = Math.ceil(filtrados.length / porPagina);
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas || 1;

  const inicio = (paginaAtual - 1) * porPagina;
  const pagina = filtrados.slice(inicio, inicio + porPagina);

  tabela.innerHTML = "";
  pagina.forEach((o) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-key="${o._key}">${o.numero}</td>
      <td class='assunto'>${o.assunto}</td>
      <td>${formatarDataBR(o.data)}</td>
      <td>${o.destino ?? "-"}</td>
      <td>${o.copia ?? "-"}</td>
      <td>${o.responsavel}</td>
      <td>${
        o.responsavel === nomeResponsavel || nomeResponsavel === "Raphael"
          ? "<button class='edit-btn'><span class='material-symbols-outlined'>edit_square</span></button>"
          : ""
      }</td>`;

    tabela.appendChild(tr);
  });

  if (!pagina.length) {
    tabela.innerHTML =
      '<tr><td colspan="6" style="text-align:center;">Nenhum resultado encontrado</td></tr>';
  }

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
    todosOficios = Object.entries(snap.val())
      .filter(([key, val]) => typeof val === "object" && val !== null)
      .map(([key, val]) => ({ ...val, _key: key }))
      .sort((a, b) => Number(b.numero) - Number(a.numero));
  } else {
    todosOficios = [];
  }

  renderTabela();

  tabela.onclick = (e) => {
    const icone = e.target.closest("span.material-symbols-outlined");
    if (!icone) return;

    const linha = icone.closest("tr");
    const chave = linha.querySelector("td[data-key]").dataset.key;
    const oficio = todosOficios.find((o) => o._key === chave);

    if (!oficio) return;

    editando = true;
    chaveEdicao = chave;

    document.getElementById("assunto").value = oficio.assunto;
    document.getElementById("destino").value = oficio.destino;
    document.getElementById("copia").value = oficio.copia;

    document.getElementById("btnCadastrar").style.display = "none";
    document.getElementById("botoesEdicao").style.display = "flex";

    const msg = document.getElementById("msgEdicao");
    msg.textContent = `✏️ Editando ofício nº ${oficio.numero}`;
    msg.style.display = "block";

    btnTopo.click();
  };
});

if (inputBusca) inputBusca.addEventListener("input", renderTabela);

const filtroDisponiveis = document.getElementById("filtroDisponiveis");
if (filtroDisponiveis)
  filtroDisponiveis.addEventListener("change", renderTabela);

const btnTopo = document.getElementById("btnTopo");

window.addEventListener("scroll", function () {
  btnTopo.style.opacity = window.scrollY > 300 ? "1" : "0";
});

btnTopo.addEventListener("click", function () {
  const duration = 800;
  const start = window.scrollY;
  const startTime = performance.now();

  function animateScroll(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    window.scrollTo(0, start * (1 - ease));

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  }

  requestAnimationFrame(animateScroll);
});

let editando = false;
let chaveEdicao = null;

document.getElementById("btnSalvarEdicao").onclick = async () => {
  if (!editando || !chaveEdicao) {
    return mostrarNotificacao("Erro ao localizar ofício!", "erro");
  }

  const assunto = document.getElementById("assunto").value.trim();
  const destino = document.getElementById("destino").value;
  const copia = document.getElementById("copia").value;

  if (!assunto)
    return mostrarNotificacao("Preencha o campo de assunto!", "erro");
  if (!destino) return mostrarNotificacao("Selecione um destino!", "erro");

  const oficioOriginal = todosOficios.find((o) => o._key === chaveEdicao);

  if (!oficioOriginal) {
    return mostrarNotificacao("Erro ao localizar ofício!", "erro");
  }

  const refEdicao = ref(rtdb, `oficios/${chaveEdicao}`);

  try {
    await update(refEdicao, {
      assunto,
      destino,
      copia,
      numero: oficioOriginal.numero,
      data: oficioOriginal.data,
      responsavel: oficioOriginal.responsavel ?? nomeResponsavel,
    });

    mostrarNotificacao("Ofício atualizado com sucesso!");
    resetarFormularioEdicao();
  } catch (erro) {
    mostrarNotificacao("Erro ao salvar no Firebase!", "erro");
  }
};

document.getElementById("btnCancelarEdicao").onclick = () => {
  resetarFormularioEdicao();
};

function resetarFormularioEdicao() {
  editando = false;
  chaveEdicao = null;

  formOficio.reset();

  document.getElementById("msgEdicao").style.display = "none";
  document.getElementById("btnCadastrar").style.display = "block";
  document.getElementById("botoesEdicao").style.display = "none";
}
