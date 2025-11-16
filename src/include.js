export async function carregarSidebar() {
  const el = document.getElementById("sidebar");
  if (!el) return;

  const html = await fetch("/src/template/sidebar.html").then((r) => r.text());
  el.innerHTML = html;

  // 🔥 Depois que o sidebar for carregado, ativar link correto
  ativarLinkAtual();
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
