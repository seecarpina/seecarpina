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
        finalizar(false);
      }

      if (event.key === "Enter") {
        finalizar(true);
      }
    }

    btnConfirmar.addEventListener("click", confirmar);

    btnCancelar.addEventListener("click", cancelar);

    overlay.addEventListener("click", clicarFora);

    document.addEventListener("keydown", pressionarTecla);

    setTimeout(() => {
      btnConfirmar.focus();
    }, 50);
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
