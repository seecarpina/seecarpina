(() => {
  const standalone = window.matchMedia("(display-mode: standalone)");
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const mobile = ios || /Android/.test(navigator.userAgent) || window.matchMedia("(max-width: 800px)").matches;
  if (!mobile || standalone.matches || navigator.standalone) return;

  const manifesto = document.querySelector('link[rel="manifest"]');
  if (!manifesto) return;
  const storageKey = `instalar-app:${manifesto.href}`;
  const semana = 7 * 24 * 60 * 60 * 1000;
  try {
    const adiadoEm = Number(localStorage.getItem(storageKey));
    if (adiadoEm && Date.now() - adiadoEm < semana) return;
  } catch { /* A instalação continua disponível sem armazenamento local. */ }

  let eventoInstalacao = null;
  const estilo = document.createElement("style");
  estilo.textContent = `
    .app-install { position: fixed; z-index: 9999; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); max-width: 480px; margin: auto; padding: 16px; background: #fff; color: #172336; border: 1px solid #dae2ec; border-radius: 18px; box-shadow: 0 8px 32px #17233630; font: 14px/1.45 Arial, sans-serif; }
    .app-install-header { display: flex; align-items: center; gap: 12px; padding-right: 24px; }
    .app-install img { width: 44px; height: 44px; border-radius: 10px; }
    .app-install strong { display: block; font-size: 15px; } .app-install p { margin: 3px 0 0; }
    .app-install-close { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border: 0; background: transparent; color: #526177; font-size: 24px; cursor: pointer; }
    .app-install-actions { display: flex; gap: 10px; margin-top: 12px; }
    .app-install-action { flex: 1; border: 0; border-radius: 10px; padding: 11px; background: #0a84ff; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
    .app-install-later { background: #eef3f8; color: #43546a; }
    .app-install-help { margin-top: 12px !important; padding: 12px; border-radius: 10px; background: #f1f6fc; }
    .app-install button:focus-visible { outline: 3px solid #172336; outline-offset: 2px; }
  `;
  document.head.appendChild(estilo);
  const aviso = document.createElement("section");
  aviso.className = "app-install";
  aviso.setAttribute("aria-label", "Adicionar aplicativo à tela inicial");
  aviso.innerHTML = `<button class="app-install-close" type="button" aria-label="Fechar aviso de instalação">×</button>
    <div class="app-install-header"><img alt="" /><div><strong></strong><p>Acesse pela tela inicial do celular.</p></div></div>
    <div class="app-install-actions"><button class="app-install-action" type="button" aria-expanded="false" aria-controls="app-install-help">Como instalar</button><button class="app-install-action app-install-later" type="button">Agora não</button></div>
    <p class="app-install-help" id="app-install-help" hidden></p>`;
  aviso.querySelector("img").src = new URL("../images/app/icon-192.png?v=2", document.currentScript.src).href;
  aviso.querySelector("strong").textContent = document.querySelector('meta[name="apple-mobile-web-app-title"]')?.content || "Instalar aplicativo";
  const botao = aviso.querySelector(".app-install-action");
  const ajuda = aviso.querySelector(".app-install-help");
  ajuda.textContent = ios
    ? 'No Safari, toque em Compartilhar → Adicionar à Tela de Início. Mantenha “Abrir como App da Web” ativado e toque em Adicionar.'
    : 'No menu do navegador (⋮), escolha “Instalar aplicativo” ou “Adicionar à tela inicial”. Se essa opção não aparecer, abra este endereço no Chrome.';
  document.body.appendChild(aviso);

  function adiar() {
    try { localStorage.setItem(storageKey, String(Date.now())); } catch { /* Sem armazenamento local. */ }
    aviso.remove();
  }
  aviso.querySelector(".app-install-close").addEventListener("click", adiar);
  aviso.querySelector(".app-install-later").addEventListener("click", adiar);
  window.addEventListener("beforeinstallprompt", (evento) => {
    if (!aviso.isConnected) return;
    evento.preventDefault();
    eventoInstalacao = evento;
    botao.textContent = "Instalar aplicativo";
    botao.removeAttribute("aria-expanded");
    ajuda.hidden = true;
  });
  botao.addEventListener("click", async () => {
    if (!eventoInstalacao) {
      ajuda.hidden = !ajuda.hidden;
      botao.setAttribute("aria-expanded", String(!ajuda.hidden));
      return;
    }
    const evento = eventoInstalacao;
    eventoInstalacao = null;
    botao.disabled = true;
    try {
      await evento.prompt();
      const escolha = await evento.userChoice;
      if (escolha.outcome === "accepted") aviso.remove();
    } catch {
      ajuda.hidden = false;
    } finally {
      botao.disabled = false;
      botao.textContent = "Como instalar";
      botao.setAttribute("aria-expanded", String(!ajuda.hidden));
    }
  });
  window.addEventListener("appinstalled", () => aviso.remove());
  standalone.addEventListener("change", evento => { if (evento.matches) aviso.remove(); });
})();
