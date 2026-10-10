// Indica colunas fora da área visível, inclusive após carregar ou filtrar dados.
export function prepararTabelaRolavel(wrapper, indice, ambiente = window) {
  const tabela = wrapper.querySelector("table");
  if (!tabela) return;
  const aviso = wrapper.ownerDocument.createElement("p");
  aviso.id = `aviso-rolagem-tabela-${indice}`;
  aviso.className = "aviso-rolagem-tabela";
  aviso.textContent = "Role a tabela para ver todas as colunas.";
  aviso.hidden = true;
  wrapper.insertAdjacentElement("beforebegin", aviso);

  function atualizar() {
    const rolavel = wrapper.clientWidth > 0 && wrapper.scrollWidth > wrapper.clientWidth + 1;
    aviso.hidden = !rolavel;
    if (rolavel) {
      wrapper.tabIndex = 0;
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", "Tabela de dados com rolagem horizontal");
      wrapper.setAttribute("aria-describedby", aviso.id);
    } else {
      wrapper.removeAttribute("tabindex");
      wrapper.removeAttribute("role");
      wrapper.removeAttribute("aria-label");
      wrapper.removeAttribute("aria-describedby");
    }
  }

  if (ambiente.ResizeObserver) {
    const resize = new ambiente.ResizeObserver(atualizar);
    resize.observe(wrapper);
    resize.observe(tabela);
  } else {
    ambiente.addEventListener("resize", atualizar);
  }
  const mudancas = new ambiente.MutationObserver(atualizar);
  mudancas.observe(tabela, { childList: true, subtree: true, characterData: true });
  atualizar();
}

function iniciar() {
  document.querySelectorAll(".portal-refinado main .table-wrapper")
    .forEach((wrapper, indice) => prepararTabelaRolavel(wrapper, indice));
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
}
