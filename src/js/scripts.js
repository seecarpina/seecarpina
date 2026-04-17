const ANO_ATUAL = new Date().getFullYear().toString();
let anoSelecionado = ANO_ATUAL;

// Remove a tela de loading e Aplicar tema salvo
window.addEventListener("load", () => {
  const temaSalvo = localStorage.getItem("theme");

  if (temaSalvo === "dark") {
    document.body.classList.add("dark-theme-variables");

    // ajustar spans do ícone
    const themeToggler = document.querySelector(".theme-toggler");
    if (themeToggler) {
      themeToggler.querySelector("span:nth-child(1)").classList.add("active");
      themeToggler
        .querySelector("span:nth-child(2)")
        .classList.remove("active");
    }
  }

  setTimeout(() => {
    document.querySelector(".loading").style.display = "none";
  }, 400);
});

import "./eventosStore.js";
import { carregarSidebar, carregarRight, carregarChat } from "./include.js";
import { auth, db, rtdb } from "./firebaseConfig.js"; // <<–– CONFIG DO FIREBASE AGORA ESTÁ AQUI

carregarChat();

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

  // função que atualiza os ícones conforme o modo
  function setThemeIcons(mode) {
    if (!iconLight || !iconDark) return;
    if (mode === "dark") {
      iconLight.classList.remove("active");
      iconDark.classList.add("active");
    } else {
      iconLight.classList.add("active");
      iconDark.classList.remove("active");
    }
  }

  // aplicar tema salvo ao carregar (ou fallback ao prefer-color-scheme)
  const temaSalvo =
    localStorage.getItem("theme") ||
    (window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");

  if (temaSalvo === "dark") {
    document.body.classList.add("dark-theme-variables");
  } else {
    document.body.classList.remove("dark-theme-variables");
  }
  setThemeIcons(temaSalvo);

  // listener do toggle
  if (themeToggler) {
    themeToggler.addEventListener("click", () => {
      // toggle retorna true se agora contém a classe
      const isDark = document.body.classList.toggle("dark-theme-variables");

      // atualiza ícones de forma explícita
      setThemeIcons(isDark ? "dark" : "light");

      // salvar escolha
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }
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
  collection,
  getDocs,
  updateDoc,
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
    mensagem = "Bom dia";
  } else if (hora >= 12 && hora < 18) {
    mensagem = "Boa tarde";
  } else {
    mensagem = "Boa noite";
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
      boasVindas.textContent = `👋 ${saudacao()}, ${nomeResponsavel}!`;

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
async function carregarFraseDoDia() {
  const span = document.getElementById("frase-do-dia");

  try {
    const response = await fetch("./src/json/frases.json");
    const frases = await response.json();

    const randomIndex = Math.floor(Math.random() * frases.length);
    const frase = frases[randomIndex].frase;

    span.textContent = `"${frase}"`;
  } catch (error) {
    console.error(error);
    span.textContent = "Acredite: você já deu o primeiro passo.";
  }
}

carregarFraseDoDia();

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

if (inputDestino) {
  inputDestino.addEventListener("input", () =>
    mostrarSugestoes(inputDestino, destinos, boxDestino),
  );
}

if (inputCopia) {
  inputCopia.addEventListener("input", () =>
    mostrarSugestoes(inputCopia, destinos, boxCopia),
  );
}

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
window.mostrarNotificacao = mostrarNotificacao;

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
      const oficiosRef = ref(rtdb, `oficios/${ANO_ATUAL}`);
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
if (tabela) {
  tabela.innerHTML = `<tr><td colspan="7" style="text-align:center;"><svg class="svg-spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4"/></svg></td></tr>`;
}
const paginacao = document.getElementById("paginacao");
const inputBusca = document.getElementById("busca");
function getOficiosRef() {
  return ref(rtdb, `oficios/${anoSelecionado}`);
}

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
      .includes(filtro),
  );

  if (mostrarDisponiveis) {
    filtrados = filtrados.filter(
      (o) =>
        !o.assunto ||
        o.assunto.trim() === "" ||
        o.assunto.trim() === "undefined",
    );
  }

  const totalPaginas = Math.ceil(filtrados.length / porPagina);
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas || 1;

  const inicio = (paginaAtual - 1) * porPagina;
  const pagina = filtrados.slice(inicio, inicio + porPagina);

  tabela.innerHTML = "";
  pagina.forEach((o) => {
    const tr = document.createElement("tr");
    let assuntoFormatado = o.assunto || "";

    // Verifica condição
    if (
      assuntoFormatado.toLowerCase().includes("processo") &&
      (o.copia || "").toLowerCase() === "sistema carpina digital"
    ) {
      const match = assuntoFormatado.match(/processo\s*(\d+)/i);

      if (match && match[1]) {
        const numeroProcesso = match[1];
        const link = `https://digital.carpina.pe.gov.br/app/processos/manage/${numeroProcesso}`;

        assuntoFormatado = `<a href="${link}" target="_blank" title="Abrir Processo">${assuntoFormatado} <span class="material-symbols-outlined">link_2</span></a>`;
      }
    }
    tr.innerHTML = `
      <td data-key="${o._key}">
        ${formatarNumeroOficio(o.numero, anoSelecionado)}
      </td>
      <td class='assunto'>${assuntoFormatado}</td>
      <td>${formatarDataBR(o.data)}</td>
      <td>${o.destino ?? "-"}</td>
      <td>${o.copia ?? "-"}</td>
      <td>${o.responsavel}</td>
      <td>
  <div class="flex align-center">

    <label class="icon-btn upload-btn" title="Enviar PDF">
      <input type="file" accept="application/pdf" hidden class="input-pdf">
        <span class="material-symbols-outlined upload-btn">upload_file</span>
    </label>

    <button class="icon-btn view-btn" title="Visualizar PDF" ${
      o.pdf ? "" : "disabled"
    }>
      <span class="material-symbols-outlined">picture_as_pdf</span>
    </button>

    ${
      o.responsavel === nomeResponsavel ||
      nomeResponsavel === "Raphael" ||
      !o.responsavel
        ? `
        <button class='edit-btn'>
          <span class='material-symbols-outlined'>edit_square</span>
        </button>

        <button class='cancel-btn'>
          <span class='material-symbols-outlined'>cancel</span>
        </button>
      `
        : ""
    }

  </div>
</td>`;

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
      inicioPagina + maxPaginasVisiveis - 1,
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

onValue(getOficiosRef(), (snap) => {
  if (snap.exists()) {
    todosOficios = Object.entries(snap.val())
      .filter(([key, val]) => typeof val === "object" && val !== null)
      .map(([key, val]) => ({ ...val, _key: key }))
      .sort((a, b) => Number(b.numero) - Number(a.numero));
  } else {
    todosOficios = [];
  }

  renderTabela();

  if (tabela) {
    tabela.onclick = (e) => {
      const alvo = e.target.closest("span.material-symbols-outlined");
      if (!alvo) return;

      const linha = alvo.closest("tr");
      const chave = linha.querySelector("td[data-key]").dataset.key;
      const oficio = todosOficios.find((o) => o._key === chave);
      if (!oficio) return;

      // ✏️ EDITAR
      if (alvo.textContent.trim() === "edit_square") {
        editando = true;
        chaveEdicao = chave;

        document.getElementById("assunto").value = oficio.assunto ?? "";
        document.getElementById("destino").value = oficio.destino ?? "";
        document.getElementById("copia").value = oficio.copia ?? "";

        document.getElementById("btnCadastrar").style.display = "none";
        document.getElementById("botoesEdicao").style.display = "flex";

        const msg = document.getElementById("msgEdicao");
        msg.textContent = `✏️ Editando ofício nº ${oficio.numero}`;
        msg.style.display = "block";

        btnTopo.click();
      }

      // ❌ CANCELAR OFÍCIO
      if (alvo.textContent.trim() === "cancel") {
        if (
          !confirm(
            `Tem certeza que deseja cancelar o ofício nº ${oficio.numero} ?`,
          )
        )
          return;

        const refCancelar = ref(rtdb, `oficios/${anoSelecionado}/${chave}`);

        update(refCancelar, {
          assunto: "",
          destino: "",
          copia: "",
          responsavel: "",
        })
          .then(() => {
            mostrarNotificacao(`Ofício nº ${oficio.numero} cancelado.`);
          })
          .catch(() => mostrarNotificacao("Erro ao cancelar!", "erro"));
      }

      // 📤 UPLOAD PDF
      if (alvo.closest(".upload-btn")) {
        const inputFile = linha.querySelector(".input-pdf");

        inputFile.onchange = async () => {
          const file = inputFile.files[0];
          if (!file) return;

          if (file.type !== "application/pdf") {
            return mostrarNotificacao("Envie apenas PDF", "erro");
          }

          const reader = new FileReader();

          reader.onload = async () => {
            const base64 = reader.result.split(",")[1];

            const refPdf = ref(rtdb, `oficios/${anoSelecionado}/${chave}`);

            await update(refPdf, {
              pdf: base64,
            });

            mostrarNotificacao("PDF enviado com sucesso!");
          };

          reader.readAsDataURL(file);
        };
      }

      // 👁️ VISUALIZAR PDF
      if (alvo.textContent.trim() === "picture_as_pdf") {
        if (!oficio.pdf) return;

        const byteCharacters = atob(oficio.pdf);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });

        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    };
  }
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
let btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
let btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

if (btnSalvarEdicao) {
  btnSalvarEdicao.onclick = async () => {
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

    const refEdicao = ref(rtdb, `oficios/${anoSelecionado}/${chaveEdicao}`);

    try {
      await update(refEdicao, {
        assunto,
        destino,
        copia,
        numero: oficioOriginal.numero,
        data: oficioOriginal.data,
        responsavel:
          oficioOriginal.responsavel && oficioOriginal.responsavel.trim() !== ""
            ? oficioOriginal.responsavel
            : nomeResponsavel,
      });

      mostrarNotificacao("Ofício atualizado com sucesso!");
      resetarFormularioEdicao();
    } catch (erro) {
      mostrarNotificacao("Erro ao salvar no Firebase!", "erro");
    }
  };
}

if (btnCancelarEdicao) {
  btnCancelarEdicao.onclick = () => {
    resetarFormularioEdicao();
  };
}

function resetarFormularioEdicao() {
  editando = false;
  chaveEdicao = null;

  formOficio.reset();

  document.getElementById("msgEdicao").style.display = "none";
  document.getElementById("btnCadastrar").style.display = "block";
  document.getElementById("botoesEdicao").style.display = "none";
}

const inputData = document.querySelector("#dataHoje");
if (inputData) {
  const hoje = new Date().toISOString().split("T")[0];
  inputData.value = hoje;
}

async function carregarUsuarios() {
  const tbody = document.querySelector("#tabelaUsuarios tbody");
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">
        <svg class="svg-spinner" viewBox="0 0 50 50">
          <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4"/>
        </svg></td></tr>`;

  try {
    const snap = await getDocs(collection(db, "usuarios"));
    tbody.innerHTML = "";

    snap.forEach((doc) => {
      const u = doc.data();
      const tr = document.createElement("tr");

      tr.innerHTML = `
            <td><div id="profile-photo"><img src="${
              u.foto ?? "./src/images/profile.webp"
            }"></div></td>
            <td>${u.nome ?? "-"}</td>
            <td>${u.email ?? "-"}</td>
            <td>${u.cargo ?? "-"}</td>
          `;

      tbody.appendChild(tr);
    });

    if (!tbody.innerHTML.trim()) {
      tbody.innerHTML =
        '<tr><td colspan="5">Nenhum usuário encontrado</td></tr>';
    }
  } catch (error) {
    alert("Erro ao carregar usuários: " + error.message);
  }
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

    if (!eventosPorData[hojeISO]) {
      aviso.style.display = "none";
      aviso.innerHTML = "";
    } else {
      const eventosHoje = eventosPorData[hojeISO];

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

async function carregarAnosDisponiveis() {
  const select = document.getElementById("filtroAno");
  if (!select) return;

  const snapshot = await get(ref(rtdb, "oficios"));
  if (!snapshot.exists()) return;

  const anos = Object.keys(snapshot.val())
    .filter((k) => /^\d{4}$/.test(k))
    .sort((a, b) => b - a); // mais recente primeiro

  select.innerHTML = "";

  anos.forEach((ano) => {
    const option = document.createElement("option");
    option.value = ano;
    option.textContent = ano;

    if (ano === ANO_ATUAL) option.selected = true;

    select.appendChild(option);
  });

  anoSelecionado = select.value;
}
document.getElementById("filtroAno")?.addEventListener("change", (e) => {
  anoSelecionado = e.target.value;
  carregarOficiosPorAno();
});

await carregarAnosDisponiveis();
carregarOficiosPorAno();

function carregarOficiosPorAno() {
  const refAno = getOficiosRef();

  onValue(refAno, (snap) => {
    if (snap.exists()) {
      todosOficios = Object.entries(snap.val())
        .map(([key, val]) => ({ ...val, _key: key }))
        .sort((a, b) => Number(b.numero) - Number(a.numero));
    } else {
      todosOficios = [];
    }

    renderTabela();
  });
}

function formatarNumeroOficio(numero, ano) {
  if (!numero) return "-";
  return `${String(numero).padStart(3, "0")}/${ano}`;
}

// 📊 Exportar tabela para Excel
const btnExportar = document.getElementById("btnExportarExcel");

if (btnExportar) {
  btnExportar.addEventListener("click", () => {
    if (!todosOficios.length) {
      mostrarNotificacao("Nenhum dado para exportar", "erro");
      return;
    }

    // Usa os mesmos filtros aplicados na tela
    const filtro = inputBusca?.value.toLowerCase() || "";
    const somenteDisponiveis =
      document.getElementById("filtroDisponiveis")?.checked;

    let dadosFiltrados = todosOficios.filter((o) =>
      `${o.numero} ${o.assunto} ${o.data} ${o.destino} ${o.copia} ${o.responsavel}`
        .toLowerCase()
        .includes(filtro),
    );

    if (somenteDisponiveis) {
      dadosFiltrados = dadosFiltrados.filter(
        (o) =>
          !o.assunto || o.assunto.trim() === "" || o.assunto === "undefined",
      );
    }

    if (!dadosFiltrados.length) {
      mostrarNotificacao("Nenhum registro encontrado", "erro");
      return;
    }

    // Ordena em ordem crescente
    dadosFiltrados.sort((a, b) => Number(a.numero) - Number(b.numero));

    // Monta dados para o Excel
    const dadosExcel = dadosFiltrados.map((o) => ({
      Número: formatarNumeroOficio(o.numero, anoSelecionado),
      Assunto: o.assunto || "",
      Data: formatarDataBR(o.data),
      Destino: o.destino || "",
      Cópia: o.copia || "",
      Responsável: o.responsavel || "",
    }));
    // Criar planilha
    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Ofícios");

    // Nome do arquivo
    const nomeArquivo = `oficios_${anoSelecionado}.xlsx`;

    XLSX.writeFile(workbook, nomeArquivo);
  });
}
