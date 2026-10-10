(() => {
  class SeeSpinner extends HTMLElement {
    static get observedAttributes() { return ["mensagem"]; }

    connectedCallback() {
      this.setAttribute("role", "status");
      this.atualizarDescricao();
    }

    attributeChangedCallback() { this.atualizarDescricao(); }

    atualizarDescricao() {
      this.setAttribute("aria-label", this.getAttribute("mensagem") || "Carregando");
    }
  }

  if (!customElements.get("see-spinner")) customElements.define("see-spinner", SeeSpinner);

  function concluirCarregamentoPagina() {
    const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const tela of document.querySelectorAll(".loading")) {
      tela.setAttribute("data-concluido", "");
      setTimeout(() => { tela.hidden = true; }, reduzirMovimento ? 0 : 180);
    }
  }

  if (document.readyState === "complete") concluirCarregamentoPagina();
  else window.addEventListener("load", concluirCarregamentoPagina, { once: true });
})();
