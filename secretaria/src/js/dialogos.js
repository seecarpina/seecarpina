/* =========================================
   DIÁLOGOS GLOBAIS
========================================= */

function criarEstruturaDialogo() {
  if (document.getElementById("dialogoGlobalOverlay")) {
    return;
  }

  const overlay = document.createElement("div");

  overlay.id = "dialogoGlobalOverlay";
  overlay.className = "dialogo-global-overlay";

  overlay.innerHTML = `
    <div
      id="dialogoGlobal"
      class="dialogo-global"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialogoGlobalTitulo"
      aria-describedby="dialogoGlobalMensagem"
      tabindex="-1"
    >
      <div class="dialogo-global-icone">
        <span
          id="dialogoGlobalIcone"
          class="material-symbols-outlined"
        >
          info
        </span>
      </div>

      <div class="dialogo-global-conteudo">
        <h2 id="dialogoGlobalTitulo">
          Confirmação
        </h2>

        <p id="dialogoGlobalMensagem"></p>
      </div>

      <div class="dialogo-global-acoes">
        <button
          type="button"
          id="dialogoGlobalCancelar"
          class="btn-dialogo btn-dialogo-secundario"
        >
          Cancelar
        </button>

        <button
          type="button"
          id="dialogoGlobalConfirmar"
          class="btn-dialogo btn-dialogo-principal"
        >
          Confirmar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function obterConfiguracaoDialogo(tipo) {
  const configuracoes = {
    informacao: {
      icone: "info",
      classe: "dialogo-informacao",
    },

    sucesso: {
      icone: "check_circle",
      classe: "dialogo-sucesso",
    },

    alerta: {
      icone: "warning",
      classe: "dialogo-alerta",
    },

    perigo: {
      icone: "error",
      classe: "dialogo-perigo",
    },
  };

  return configuracoes[tipo] || configuracoes.informacao;
}

// Mantém a navegação por Tab no diálogo e devolve o foco ao fechar.
function gerenciarFocoDialogo(dialogo, inicial) {
  const anterior = document.activeElement;
  const temporizador = setTimeout(() => inicial.focus(), 50);

  function conterFoco(event) {
    if (event.key !== "Tab") return;
    const campos = [...dialogo.querySelectorAll("button, textarea")]
      .filter((campo) => !campo.disabled && campo.getClientRects().length > 0);
    const primeiro = campos[0] || dialogo;
    const ultimo = campos.at(-1) || dialogo;
    const foco = document.activeElement;
    if (!dialogo.contains(foco) || (event.shiftKey && foco === primeiro) ||
        (!event.shiftKey && foco === ultimo)) {
      event.preventDefault();
      (event.shiftKey ? ultimo : primeiro).focus();
    }
  }

  document.addEventListener("keydown", conterFoco);
  return () => {
    clearTimeout(temporizador);
    document.removeEventListener("keydown", conterFoco);
    if (anterior?.isConnected) anterior.focus();
  };
}

function abrirDialogo({
  titulo = "Confirmação",
  mensagem = "",
  tipo = "informacao",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  mostrarCancelar = true,
} = {}) {
  criarEstruturaDialogo();

  const overlay = document.getElementById("dialogoGlobalOverlay");

  const dialogo = document.getElementById("dialogoGlobal");

  const tituloElemento = document.getElementById("dialogoGlobalTitulo");

  const mensagemElemento = document.getElementById("dialogoGlobalMensagem");

  const iconeElemento = document.getElementById("dialogoGlobalIcone");

  const btnConfirmar = document.getElementById("dialogoGlobalConfirmar");

  const btnCancelar = document.getElementById("dialogoGlobalCancelar");

  const configuracao = obterConfiguracaoDialogo(tipo);

  dialogo.className = `
    dialogo-global
    ${configuracao.classe}
  `;

  tituloElemento.textContent = titulo;
  mensagemElemento.textContent = mensagem;

  iconeElemento.textContent = configuracao.icone;

  btnConfirmar.textContent = textoConfirmar;
  btnCancelar.textContent = textoCancelar;

  btnCancelar.style.display = mostrarCancelar ? "inline-flex" : "none";

  const restaurarFoco = gerenciarFocoDialogo(dialogo, btnConfirmar);

  overlay.classList.add("ativo");

  document.body.classList.add("dialogo-aberto");

  return new Promise((resolve) => {
    let resolvido = false;

    function finalizar(valor) {
      if (resolvido) return;

      resolvido = true;

      overlay.classList.remove("ativo");

      document.body.classList.remove("dialogo-aberto");

      btnConfirmar.removeEventListener("click", confirmar);

      btnCancelar.removeEventListener("click", cancelar);

      overlay.removeEventListener("click", clicarFora);

      document.removeEventListener("keydown", pressionarTecla);

      restaurarFoco();
      resolve(valor);
    }

    function confirmar() {
      finalizar(true);
    }

    function cancelar() {
      finalizar(false);
    }

    function clicarFora(event) {
      if (event.target === overlay) {
        finalizar(false);
      }
    }

    function pressionarTecla(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finalizar(false);
      }
      // Enter segue o comportamento nativo do botão que tem foco.
    }

    btnConfirmar.addEventListener("click", confirmar);

    btnCancelar.addEventListener("click", cancelar);

    overlay.addEventListener("click", clicarFora);

    document.addEventListener("keydown", pressionarTecla);

  });
}

window.mostrarConfirmacao = function ({
  titulo = "Confirmar ação",
  mensagem = "",
  tipo = "alerta",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
} = {}) {
  return abrirDialogo({
    titulo,
    mensagem,
    tipo,
    textoConfirmar,
    textoCancelar,
    mostrarCancelar: true,
  });
};

window.mostrarAlerta = function ({
  titulo = "Atenção",
  mensagem = "",
  tipo = "informacao",
  textoConfirmar = "Entendi",
} = {}) {
  return abrirDialogo({
    titulo,
    mensagem,
    tipo,
    textoConfirmar,
    mostrarCancelar: false,
  });
};

window.mostrarPrompt = function ({
  titulo = "Informe os dados",
  mensagem = "",
  tipo = "informacao",
  placeholder = "",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  obrigatorio = false,
} = {}) {
  criarEstruturaDialogo();

  const overlay = document.getElementById("dialogoGlobalOverlay");
  const dialogo = document.getElementById("dialogoGlobal");
  const tituloElemento = document.getElementById("dialogoGlobalTitulo");
  const mensagemElemento = document.getElementById("dialogoGlobalMensagem");
  const iconeElemento = document.getElementById("dialogoGlobalIcone");
  const btnConfirmar = document.getElementById("dialogoGlobalConfirmar");
  const btnCancelar = document.getElementById("dialogoGlobalCancelar");

  const configuracao = obterConfiguracaoDialogo(tipo);

  dialogo.className = `
    dialogo-global
    ${configuracao.classe}
  `;

  tituloElemento.textContent = titulo;
  mensagemElemento.textContent = mensagem;

  iconeElemento.textContent = configuracao.icone;

  btnConfirmar.textContent = textoConfirmar;
  btnCancelar.textContent = textoCancelar;

  btnCancelar.style.display = "inline-flex";

  // Remove um campo anterior, caso exista
  document.getElementById("dialogoGlobalPrompt")?.remove();

  const input = document.createElement("textarea");

  input.id = "dialogoGlobalPrompt";
  input.className = "dialogo-global-prompt";
  input.placeholder = placeholder;
  input.rows = 3;
  input.maxLength = 500;
  input.required = obrigatorio;
  input.setAttribute("aria-label", titulo);
  input.setAttribute("aria-describedby", "dialogoGlobalMensagem dialogoGlobalPromptErro");

  const erro = document.createElement("p");
  erro.id = "dialogoGlobalPromptErro";
  erro.className = "dialogo-global-erro";
  erro.setAttribute("role", "alert");
  erro.textContent = "Preencha este campo para continuar.";
  erro.hidden = true;

  mensagemElemento.insertAdjacentElement("afterend", input);
  input.insertAdjacentElement("afterend", erro);
  const restaurarFoco = gerenciarFocoDialogo(dialogo, input);

  overlay.classList.add("ativo");
  document.body.classList.add("dialogo-aberto");

  return new Promise((resolve) => {
    let resolvido = false;

    function finalizar(valor) {
      if (resolvido) return;

      resolvido = true;

      overlay.classList.remove("ativo");
      document.body.classList.remove("dialogo-aberto");

      input.remove();
      erro.remove();

      btnConfirmar.removeEventListener("click", confirmar);
      btnCancelar.removeEventListener("click", cancelar);
      overlay.removeEventListener("click", clicarFora);
      document.removeEventListener("keydown", pressionarTecla);

      restaurarFoco();
      resolve(valor);
    }

    function confirmar() {
      const valor = input.value.trim();

      if (obrigatorio && !valor) {
        input.classList.add("erro");
        input.setAttribute("aria-invalid", "true");
        erro.hidden = false;
        input.focus();
        return;
      }

      finalizar(valor);
    }

    function cancelar() {
      finalizar(null);
    }

    function clicarFora(event) {
      if (event.target === overlay) {
        finalizar(null);
      }
    }

    function pressionarTecla(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finalizar(null);
      }

      // Ctrl + Enter confirma
      if (event.key === "Enter" && event.ctrlKey) {
        event.preventDefault();
        confirmar();
      }
    }

    btnConfirmar.addEventListener("click", confirmar);
    btnCancelar.addEventListener("click", cancelar);
    overlay.addEventListener("click", clicarFora);
    document.addEventListener("keydown", pressionarTecla);

    input.addEventListener("input", () => {
      input.classList.remove("erro");
      input.removeAttribute("aria-invalid");
      erro.hidden = true;
    });

  });
};
