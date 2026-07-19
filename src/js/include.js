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

  const pathAtual = window.location.pathname.replace(/\/$/, "").toLowerCase();

  links.forEach((link) => {
    link.classList.remove("active");

    const href = link.getAttribute("href");

    if (!href) return;

    const urlLink = new URL(href, window.location.origin);

    const pathLink = urlLink.pathname.replace(/\/$/, "").toLowerCase();

    if (pathAtual === pathLink) {
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
