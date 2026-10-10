import { normalizarCaminhoPagina } from "./core/rotas.js";
export async function carregarSidebar() {
  const el = document.getElementById("sidebar");
  if (!el) return;

  const html = await fetch("/src/template/sidebar.html").then((r) => r.text());
  el.innerHTML = html;
}

export async function carregarRight() {
  const el = document.querySelector(".right");
  if (!el) return;

  const html = await fetch("/src/template/right.html").then((r) => r.text());
  el.innerHTML = html;
}

export function ativarLinkAtual() {
  const links = document.querySelectorAll("#sidebar a");

  const pathAtual = normalizarCaminhoPagina(window.location.pathname);
  const basePagina = new URL(window.location.href);
  // As páginas do portal são arquivos: uma barra final não cria uma pasta.
  basePagina.pathname = basePagina.pathname.replace(/\/+$/, "") || "/";

  links.forEach((link) => {
    link.classList.remove("active");

    const href = link.getAttribute("href");

    if (!href || href.startsWith("#")) return;

    let urlLink;
    try { urlLink = new URL(href, basePagina); }
    catch { return; }

    const pathLink = normalizarCaminhoPagina(urlLink.pathname);

    if (urlLink.origin === window.location.origin && pathAtual === pathLink) {
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
