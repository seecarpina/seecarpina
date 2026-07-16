document.addEventListener("keyup", (e) => {
  if (e.target.tagName === "INPUT" && e.target.type !== "date") {
    e.target.value = e.target.value.toUpperCase();
  }
});

/* ---------------------------
    Aplicar tema salvo em todas as páginas
---------------------------- */

if (localStorage.getItem("temaCores")) {
  localStorage.removeItem("temaCores");
}

document.addEventListener("DOMContentLoaded", () => {
  const temaSalvo = localStorage.getItem("temaCores");

  // Remove qualquer tema anterior
  document.body.classList.remove(
    "paleta_1",
    "paleta_2",
    "paleta_3",
    "paleta_4",
  );

  // Aplica se existir
  if (temaSalvo) {
    document.body.classList.add(temaSalvo);
  }
});

// Remove a tela de loading e Aplicar tema salvo
window.addEventListener("load", () => {
  setTimeout(() => {
    document.querySelector(".loading").style.display = "none";
  }, 400);
});

import "./eventosStore.js";
import { carregarSidebar, carregarRight, carregarChat } from "./include.js";
import { auth, db } from "./firebaseConfig.js"; // <<–– CONFIG DO FIREBASE AGORA ESTÁ AQUI

// DESATIVAR/ATIVAR CHAt
// carregarChat();

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
  async function carregarLinksUteis() {
    const container = document.getElementById("linksContainer");
    if (!container) return;

    container.innerHTML = "";

    const q = query(collection(db, "linksUteis"), orderBy("ordem"));
    const snapshot = await getDocs(q);

    let grupos = {};

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (!grupos[data.grupo]) {
        grupos[data.grupo] = [];
      }

      grupos[data.grupo].push(data);
    });

    // montar HTML
    Object.keys(grupos).forEach((grupo) => {
      const details = document.createElement("details");

      details.innerHTML = `
      <summary>${grupo}</summary>
      <ul>
        ${grupos[grupo]
          .map(
            (link) => `
          <li>
            <a href="${link.url}" target="_blank">
              ${link.nome}
            </a>
          </li>
        `,
          )
          .join("")}
      </ul>
    `;

      container.appendChild(details);
    });
  }

  const btnSalvarLink = document.getElementById("salvarLink");

  if (btnSalvarLink) {
    btnSalvarLink.addEventListener("click", async () => {
      const grupo = document.getElementById("grupoLink").value;
      const nome = document.getElementById("nomeLink").value;
      const url = document.getElementById("urlLink").value;

      if (!grupo || !nome || !url) {
        mostrarNotificacao("Preencha todos os campos", "erro");
        return;
      }

      try {
        await addDoc(collection(db, "linksUteis"), {
          grupo,
          nome,
          url,
          ordem: Date.now(),
        });

        mostrarNotificacao("Link salvo!", "sucesso");

        document.getElementById("modalLink").style.display = "none";

        carregarLinksUteis(); // 🔥 atualiza sem recarregar
      } catch (e) {
        mostrarNotificacao("Erro ao salvar", "erro");
      }
    });
  }

  const modalLink = document.getElementById("modalLink");
  const btnAbrirLink = document.getElementById("btnNovoLink");
  const btnFecharLink = modalLink.querySelector(".fechar");

  // mesma função do index
  function abrirFecharModalLink(acao) {
    modalLink.style.display = acao;
  }

  // abrir
  btnAbrirLink.addEventListener("click", () => {
    abrirFecharModalLink("flex");
  });

  // fechar no X
  btnFecharLink.addEventListener("click", () => {
    abrirFecharModalLink("none");
  });

  // fechar no ESC (igual ao index)
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      abrirFecharModalLink("none");
    }
  });

  // fechar clicando fora (igual ao index)
  modalLink.addEventListener("click", (e) => {
    if (e.target === modalLink) {
      abrirFecharModalLink("none");
    }
  });
  carregarLinksUteis();

  function initCalendario() {
    // ==============================
    // CALENDÁRIO (global)
    // ==============================
    const calDias = document.getElementById("calDias");
    const mesAno = document.getElementById("mesAno");
    const prevMes = document.getElementById("prevMes");
    const nextMes = document.getElementById("nextMes");

    if (calDias && mesAno && prevMes && nextMes) {
      let dataAtual = new Date();
      let eventosPorData = {};

      function renderCalendario() {
        calDias.innerHTML = "";

        const ano = dataAtual.getFullYear();
        const mes = dataAtual.getMonth();

        const textoMes = dataAtual.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        });

        mesAno.textContent =
          textoMes.charAt(0).toUpperCase() + textoMes.slice(1);

        const primeiroDia = new Date(ano, mes, 1).getDay();
        const totalDias = new Date(ano, mes + 1, 0).getDate();

        // espaços vazios antes do dia 1
        for (let i = 0; i < primeiroDia; i++) {
          calDias.appendChild(document.createElement("div"));
        }

        for (let dia = 1; dia <= totalDias; dia++) {
          const div = document.createElement("div");
          div.textContent = dia;

          const dataISO = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(
            dia,
          ).padStart(2, "0")}`;

          if (eventosPorData[dataISO]) {
            div.classList.add("tem-evento");

            div.addEventListener("click", (e) => {
              e.stopPropagation();
              mostrarTooltipEvento(div, eventosPorData[dataISO]);
            });
          }

          calDias.appendChild(div);
        }
      }

      prevMes.onclick = () => {
        dataAtual.setMonth(dataAtual.getMonth() - 1);
        renderCalendario();
      };

      nextMes.onclick = () => {
        dataAtual.setMonth(dataAtual.getMonth() + 1);
        renderCalendario();
      };

      // 🔔 escuta eventos vindos do eventos.js
      window.addEventListener("eventosAtualizados", (e) => {
        eventosPorData = e.detail || {};
        renderCalendario();
      });

      // Tooltip eventos
      function mostrarTooltipEvento(elemento, eventos) {
        removerTooltip();

        const tooltip = document.createElement("div");
        tooltip.className = "tooltip-evento";

        tooltip.innerHTML = eventos
          .map((e) => `<div>• ${e.titulo}</div>`)
          .join("");

        document.body.appendChild(tooltip);

        const rect = elemento.getBoundingClientRect();

        const calendario = document.querySelector(".calendario");
        const calRect = calendario.getBoundingClientRect();
        const calStyle = getComputedStyle(calendario);

        const paddingLeft = parseFloat(calStyle.paddingLeft);
        const paddingRight = parseFloat(calStyle.paddingRight);

        const limiteEsquerdo = calRect.left + window.scrollX + paddingLeft;
        const limiteDireito = calRect.right + window.scrollX - paddingRight;

        let left = rect.left + window.scrollX;
        const top = rect.bottom + window.scrollY + 6;

        // força layout para medir largura
        tooltip.style.maxWidth = `${limiteDireito - limiteEsquerdo}px`;
        const tooltipWidth = tooltip.offsetWidth;

        // ajuste se passar do limite direito
        if (left + tooltipWidth > limiteDireito) {
          left = limiteDireito - tooltipWidth;
        }

        // ajuste se passar do limite esquerdo
        if (left < limiteEsquerdo) {
          left = limiteEsquerdo;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;

        // fechar clicando fora
        setTimeout(() => {
          document.addEventListener("click", removerTooltip, { once: true });
        }, 0);
      }

      function removerTooltip() {
        document.querySelector(".tooltip-evento")?.remove();
      }

      renderCalendario();
    }
  }
  if (document.querySelector(".calendario")) {
    initCalendario();
  }

  // menu
  const sideMenu = document.querySelector("aside");
  const menuBtn = document.querySelector("#menu_bar");
  const closeBtn = document.querySelector("#close_btn");

  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      sideMenu.style.display = "block";
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      sideMenu.style.display = "none";
    });
  }

  // pegar elementos pelo id (usei ids para ser explícito)
  const themeToggler = document.getElementById("themeToggler");
  const iconLight = document.getElementById("iconLight");
  const iconDark = document.getElementById("iconDark");
  const iconSystem = document.getElementById("iconSystem");

  // função que atualiza os ícones conforme o modo
  function setThemeIcons(mode) {
    iconLight.classList.remove("active");
    iconDark.classList.remove("active");
    iconSystem.classList.remove("active");

    if (mode === "light") {
      iconLight.classList.add("active");
    } else if (mode === "dark") {
      iconDark.classList.add("active");
    } else {
      iconSystem.classList.add("active");
    }
  }

  function aplicarTema(mode) {
    const sistemaEscuro = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    const usarDark = mode === "dark" || (mode === "system" && sistemaEscuro);

    document.body.classList.toggle("dark-theme-variables", usarDark);

    setThemeIcons(mode);
  }

  // aplicar tema salvo ao carregar (ou fallback ao prefer-color-scheme)
  const temaSalvo = localStorage.getItem("theme") || "system";

  aplicarTema(temaSalvo);

  // listener do toggle
  if (themeToggler) {
    themeToggler.querySelectorAll("[data-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tema = btn.dataset.theme;

        localStorage.setItem("theme", tema);
        aplicarTema(tema);
      });
    });
  }

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const tema = localStorage.getItem("theme");

      if (tema === "system") {
        aplicarTema("system");
      }
    });
});

// 📦 Imports necessários do Firebase (agora sem config)
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  addDoc,
  query,
  orderBy,
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

// controle de alteração do lembrete
let lembreteOriginal = "";

function saudacao() {
  const agora = new Date();

  // horário UTC em ms
  const utc = agora.getTime() + agora.getTimezoneOffset() * 60000;

  // Brasília = UTC - 3
  const brasilia = new Date(utc - 3 * 60 * 60 * 1000);
  const hora = brasilia.getHours();

  let mensagem = "";

  if (hora >= 5 && hora < 12) {
    mensagem = "☀️ Bom dia";
  } else if (hora >= 12 && hora < 18) {
    mensagem = "🌇 Boa tarde";
  } else {
    mensagem = "🌙 Boa noite";
  }

  return mensagem;
}

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

    // 🔐 Controle de acesso por cargo (sidebar)
    function controlarAcessoSidebar() {
      const cargoUsuario = window.dadosUsuario?.cargo?.trim().toUpperCase();

      document.querySelectorAll("[data-role]").forEach((item) => {
        const cargosPermitidos = item
          .getAttribute("data-role")
          .split(",")
          .map((c) => c.trim().toUpperCase());

        // Se o cargo do usuário NÃO estiver na lista → esconde
        if (!cargosPermitidos.includes(cargoUsuario)) {
          item.style.display = "none";
        }
      });
    }
    controlarAcessoSidebar();

    const campoResp = document.getElementById("responsavel");
    if (campoResp) campoResp.value = nomeResponsavel;

    const boasVindas = document.getElementById("boasVindas");
    if (boasVindas)
      boasVindas.textContent = `${saudacao()}, ${nomeResponsavel}!`;

    if (window.dadosUsuario?.nome) {
      document.querySelector("#nomeUsuario").textContent = nomeResponsavel;
    }

    if (window.dadosUsuario?.cargo) {
      document.querySelector("#cargoUsuario").textContent =
        window.dadosUsuario.cargo;
    }

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

  // lembretes
  if (window.dadosUsuario?.lembretes) {
    const textarea = document.getElementById("lembretes");
    if (textarea) {
      lembreteOriginal = window.dadosUsuario.lembretes;
      textarea.value = lembreteOriginal;
    }
  }

  // salvar somente se mudar
  const textareaLembretes = document.getElementById("lembretes");
  if (textareaLembretes) {
    textareaLembretes.addEventListener("blur", async () => {
      const novoTexto = textareaLembretes.value.trim();
      if (novoTexto === lembreteOriginal) return;

      const user = window.usuarioAuth;
      if (!user) return;

      try {
        await updateDoc(doc(db, "usuarios", user.uid), {
          lembretes: novoTexto,
          atualizadoEm: new Date().toISOString(),
        });

        lembreteOriginal = novoTexto;
        mostrarNotificacao("Lembrete salvo");
      } catch {
        mostrarNotificacao("Erro ao salvar lembrete", "erro");
      }
    });
  }
});

// Frase do Dia
let fraseAtual = "";

async function carregarFraseDoDia() {
  const span = document.getElementById("frase-do-dia");
  const btnPin = document.getElementById("btn-pin");

  try {
    const response = await fetch("./src/json/frases.json");
    const frases = await response.json();

    const fraseSalva = localStorage.getItem("fraseFavorita");

    if (fraseSalva) {
      fraseAtual = fraseSalva;
    } else {
      const randomIndex = Math.floor(Math.random() * frases.length);
      fraseAtual = frases[randomIndex].frase;
    }

    span.textContent = `"${fraseAtual}"`;

    atualizarIconePin();

    btnPin.onclick = () => {
      const fraseSalva = localStorage.getItem("fraseFavorita");
      if (fraseSalva === fraseAtual) {
        localStorage.removeItem("fraseFavorita");
      } else {
        localStorage.setItem("fraseFavorita", fraseAtual);
      }
      atualizarIconePin();
    };
  } catch (error) {
    console.error(error);
    span.textContent = "Acredite: você já deu o primeiro passo.";
  }
}

function atualizarIconePin() {
  const btnPin = document.getElementById("btn-pin");
  const fraseSalva = localStorage.getItem("fraseFavorita");

  btnPin.classList.toggle("ativo", fraseSalva === fraseAtual);
}

carregarFraseDoDia();

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
window.mostrarNotificacao = mostrarNotificacao;

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

const inputData = document.querySelector("#dataHoje");
if (inputData) {
  const hoje = new Date().toISOString().split("T")[0];
  inputData.value = hoje;
}

async function carregarUsuarios() {
  const lista = document.getElementById("listaUsuarios");
  const busca = document.getElementById("buscaUsuarios");
  const contador = document.getElementById("contadorUsuarios");

  if (!lista) return;

  lista.innerHTML = `
    <div class="usuarios-carregando">
      <svg class="svg-spinner" viewBox="0 0 50 50">
        <circle
          class="path"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke-width="4"
        />
      </svg>
    </div>
  `;

  try {
    const snapshot = await getDocs(collection(db, "usuarios"));

    let usuarios = [];

    snapshot.forEach((documento) => {
      const usuario = documento.data();

      if (usuario.ativo === false) return;

      usuarios.push({
        id: documento.id,
        ...usuario,
      });
    });

    usuarios.sort((a, b) =>
      (a.nome || "").localeCompare(b.nome || "", "pt-BR"),
    );

    function renderizarUsuarios() {
      const termo = normalizarTexto(busca?.value || "");

      const filtrados = usuarios.filter((usuario) => {
        const texto = normalizarTexto(
          `${usuario.nome || ""} ${usuario.email || ""} ${usuario.cargo || ""}`,
        );

        return texto.includes(termo);
      });

      if (contador) {
        contador.textContent = `${filtrados.length} usuário${
          filtrados.length === 1 ? "" : "s"
        }`;
      }

      if (!filtrados.length) {
        lista.innerHTML = `
          <div class="usuarios-vazio">
            Nenhum usuário encontrado.
          </div>
        `;

        return;
      }

      lista.innerHTML = filtrados
        .map(
          (usuario) => `
            <article class="card-usuario">
              <div class="usuario-foto">
                <img
                  src="${usuario.foto || "./src/images/profile.webp"}"
                  alt="Foto de ${escaparHtmlUsuario(usuario.nome || "usuário")}"
                />
              </div>

              <div class="usuario-conteudo">
                <h3 class="usuario-nome">
                  ${escaparHtmlUsuario(usuario.nome || "-")}
                </h3>

                <span class="usuario-email">
                  ${escaparHtmlUsuario(usuario.email || "-")}
                </span>

                <span class="usuario-cargo">
                  <span class="material-symbols-outlined">
                    badge
                  </span>

                  ${escaparHtmlUsuario(usuario.cargo || "Sem cargo")}
                </span>
              </div>
            </article>
          `,
        )
        .join("");
    }

    busca?.addEventListener("input", renderizarUsuarios);

    renderizarUsuarios();
  } catch (erro) {
    console.error("Erro ao carregar usuários:", erro);

    lista.innerHTML = `
      <div class="usuarios-vazio">
        Não foi possível carregar os usuários.
      </div>
    `;

    mostrarNotificacao("Erro ao carregar usuários.", "erro");
  }
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escaparHtmlUsuario(texto) {
  const elemento = document.createElement("div");
  elemento.textContent = texto ?? "";
  return elemento.innerHTML;
}

carregarUsuarios();
// 📅 Injeta aviso no topo do body se existir evento HOJE
(function avisoEventoHojeTopo() {
  let box = null;
  let eventosCarregados = false;

  function criarBox() {
    if (box) return box;

    box = document.createElement("div");
    box.id = "avisoEventoHoje";
    box.className = "glass";
    box.style.display = "none";

    document.body.insertBefore(box, document.body.firstChild);
    return box;
  }

  window.addEventListener("eventosAtualizados", (e) => {
    eventosCarregados = true;

    const eventosPorData = e.detail || {};
    // const hojeISO = new Date().toISOString().split("T")[0];
    const hojeISO = new Date().toLocaleDateString("sv-SE");
    const aviso = criarBox();

    const eventosHoje = (eventosPorData[hojeISO] || []).filter(
      (e) => !e.concluido,
    );

    if (eventosHoje.length === 0) {
      aviso.style.display = "none";
      aviso.innerHTML = "";
    } else {
      const eventosHoje = eventosPorData[hojeISO].filter((e) => !e.concluido);

      aviso.innerHTML = `
        <div class="aviso-evento-wrap">
          <div class="aviso-evento-label">
            📅 Eventos hoje:
          </div>

          <div class="aviso-evento-marquee">
            <div class="aviso-evento-marquee__content">
              ${eventosHoje.map((e) => e.titulo).join(" • ")}
            </div>
          </div>
        </div>
      `;

      aviso.style.display = "block";
    }

    // 🔔 avisa que a checagem já ocorreu
    window.dispatchEvent(new Event("eventoHojeChecado"));
  });
})();
