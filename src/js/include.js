export async function carregarSidebar() {
  const el = document.getElementById("sidebar");
  if (!el) return;

  const html = await fetch("/src/template/sidebar.html").then((r) => r.text());
  el.innerHTML = html;

  // 🔥 Depois que o sidebar for carregado, ativar link correto
  ativarLinkAtual();
}

export async function carregarRight() {
  const el = document.querySelector(".right");
  if (!el) return;

  const html = await fetch("/src/template/right.html").then((r) => r.text());
  el.innerHTML = html;
}

function ativarLinkAtual() {
  const links = document.querySelectorAll("#sidebar a");
  const path = window.location.pathname.toLowerCase();

  links.forEach((link) => {
    const href = link.getAttribute("href").toLowerCase();

    // Caso especial: página principal ("/")
    if (href === "/" && path === "/") {
      link.classList.add("active");
      return;
    }

    // Para páginas internas, ex: /oficios
    if (href !== "/" && path.includes(href.replace("./", ""))) {
      link.classList.add("active");
    }
  });
}
import { initChat } from "./chat.js";

export async function carregarChat() {
  const res = await fetch("/src/template/chat.html");
  const html = await res.text();
  document.body.insertAdjacentHTML("beforeend", html);

  // 🔥 AGORA o HTML existe
  initChat();
}
