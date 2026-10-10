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

  const concluidos = new Set(window.carregamentosConcluidos || []);
  const telas = [...document.querySelectorAll(".loading")];
  const pendentes = new Set(telas.flatMap(tela =>
    (tela.getAttribute("data-aguardar") || "").split(/\s+/).filter(Boolean),
  ));
  let paginaCarregada = document.readyState === "complete";
  let encerrado = false;
  let limite;

  function verificar() {
    if (paginaCarregada && [...pendentes].every(nome => concluidos.has(nome))) {
      concluirCarregamentoPagina();
    }
  }

  window.carregamentoPagina = {
    liberar: concluirCarregamentoPagina,
    concluir(nome) {
      concluidos.add(nome);
      verificar();
    },
  };
  delete window.carregamentosConcluidos;

  function concluirCarregamentoPagina() {
    if (encerrado) return;
    encerrado = true;
    clearTimeout(limite);
    const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const tela of telas) {
      tela.setAttribute("data-concluido", "");
      setTimeout(() => { tela.hidden = true; }, reduzirMovimento ? 0 : 180);
    }
  }

  // Proteção contra serviços que nunca respondem ou módulos que falham ao iniciar.
  if (pendentes.size) limite = setTimeout(() => {
    console.warn("Tempo limite do carregamento inicial:", [...pendentes].filter(nome => !concluidos.has(nome)));
    concluirCarregamentoPagina();
  }, 30000);

  if (paginaCarregada) verificar();
  else window.addEventListener("load", () => {
    paginaCarregada = true;
    verificar();
  }, { once: true });
})();
