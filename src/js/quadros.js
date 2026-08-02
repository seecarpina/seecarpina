import { rtdb } from "./firebaseConfig.js";
import {
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const selectLocal = document.getElementById("selectLocal");
const btnGerar = document.getElementById("btnGerarQuadro");
const btnValidarQuadro = document.getElementById("btnValidarQuadro");

const resultadoValidacaoQuadro = document.getElementById(
  "resultadoValidacaoQuadro",
);

const subtituloValidacaoQuadro = document.getElementById(
  "subtituloValidacaoQuadro",
);

const conteudoValidacaoQuadro = document.getElementById(
  "conteudoValidacaoQuadro",
);

const btnFecharValidacaoQuadro = document.getElementById(
  "btnFecharValidacaoQuadro",
);
const resumoQuadro = document.getElementById("resumoQuadro");
const nomeEscolaQuadro = document.getElementById("nomeEscolaQuadro");
const situacaoQuadro = document.getElementById("situacaoQuadro");

const totalServidoresQuadro = document.getElementById("totalServidoresQuadro");

const totalProfessoresQuadro = document.getElementById(
  "totalProfessoresQuadro",
);

const totalAuxiliaresSalaQuadro = document.getElementById(
  "totalAuxiliaresSalaQuadro",
);

const totalApoioQuadro = document.getElementById("totalApoioQuadro");

const totalCuidadoresQuadro = document.getElementById("totalCuidadoresQuadro");

let servidores = [];
let locais = [];
let turmas = [];
let escolas = [];

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function obterGrupoTurma(nomeTurma) {
  const nome = normalizarTexto(nomeTurma);

  if (nome.includes("creche")) {
    return 1;
  }

  if (
    nome.includes("pre ") ||
    nome.startsWith("pre") ||
    nome.includes("pré ") ||
    nome.startsWith("pré")
  ) {
    return 2;
  }

  if (/^\d/.test(nome)) {
    return 3;
  }

  if (nome.includes("eja")) {
    return 4;
  }

  if (nome.includes("aee")) {
    return 5;
  }

  return 6;
}

function compararTurmas(a, b) {
  const grupoA = obterGrupoTurma(a?.nome);
  const grupoB = obterGrupoTurma(b?.nome);

  if (grupoA !== grupoB) {
    return grupoA - grupoB;
  }

  return String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR", {
    sensitivity: "base",
    numeric: true,
  });
}

function normalizarCargo(cargo) {
  return normalizarTexto(cargo)
    .replace(/[./_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatarCPF(cpf) {
  const numeros = String(cpf || "").replace(/\D/g, "");

  if (numeros.length !== 11) {
    return cpf || "-";
  }

  return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function obterTipoVinculo(servidor) {
  const vinculo = normalizarTexto(servidor?.vinculo);

  if (vinculo.includes("efetiv")) {
    return "efetivo";
  }

  if (vinculo.includes("contrat") || vinculo.includes("temporar")) {
    return "contrato";
  }

  if (vinculo.includes("bolsa") || vinculo.includes("bolsista")) {
    return "bolsa";
  }

  return "outro";
}

function obterCorVinculoPDF(servidor) {
  const tipo = obterTipoVinculo(servidor);

  const cores = {
    efetivo: [207, 235, 180],
    contrato: [255, 239, 164],
    bolsa: [224, 207, 242],
    outro: [240, 240, 240],
  };

  return cores[tipo];
}

function obterNomeVinculo(servidor) {
  const tipo = obterTipoVinculo(servidor);

  const nomes = {
    efetivo: "EFETIVO",
    contrato: "CONTRATO",
    bolsa: "BOLSA",
    outro: servidor?.vinculo || "-",
  };

  return nomes[tipo];
}

function servidorEstaAtivo(servidor) {
  return normalizarTexto(servidor?.situacao) === "ativo";
}

function servidorEhDiretor(servidor) {
  const cargo = normalizarTexto(servidor?.cargo);

  return (
    cargo.includes("diretor") ||
    cargo.includes("diretora") ||
    cargo.includes("gestor escolar") ||
    cargo.includes("gestora escolar")
  );
}

function servidorEhSecretarioEscolar(servidor) {
  const cargo = normalizarTexto(servidor?.cargo);

  return (
    cargo.includes("secretario escolar") || cargo.includes("secretaria escolar")
  );
}

function servidorEhCoordenadorPedagogico(servidor) {
  const cargo = normalizarTexto(servidor?.cargo);

  return (
    cargo.includes("coordenador pedagogico") ||
    cargo.includes("coordenadora pedagogica") ||
    cargo.includes("coordenacao pedagogica")
  );
}

function servidorEhProfessorForaSala(servidor) {
  return servidorEhProfessor(servidor) && servidor?.foraSala === true;
}

function servidorEhProfessor(servidor) {
  const cargo = normalizarTexto(servidor?.cargo);

  return (
    cargo.includes("professor") ||
    cargo.includes("tutor") ||
    cargo.includes("instrutor de informatica") ||
    cargo.includes("instrutor informatica") ||
    cargo.includes("instrutor de libras") ||
    cargo.includes("instrutor libras") ||
    cargo.includes("estagio") ||
    cargo.includes("estagiario") ||
    cargo.includes("estagiaria")
  );
}

function servidorEhAuxiliarSala(servidor) {
  const cargo = normalizarTexto(servidor?.cargo);

  return (
    cargo.includes("auxiliar de sala") ||
    cargo.includes("auxiliar sala") ||
    cargo.includes("aux de sala") ||
    cargo.includes("aux sala")
  );
}

function servidorEhCuidador(servidor) {
  const cargo = normalizarTexto(servidor?.cargo);

  return cargo.includes("cuidador");
}

function servidorEhApoio(servidor) {
  return (
    !servidorEhAuxiliarSala(servidor) && obterCategoriaApoio(servidor) !== null
  );
}

function obterCategoriaApoio(servidor) {
  const cargo = normalizarCargo(servidor?.cargo);

  if (!cargo) {
    return null;
  }

  // =========================================
  // ASG
  // =========================================

  const funcoesASG = [
    "asg",
    "aux servicos gerais",
    "auxiliar servicos gerais",
    "servente",
    "zelador",
    "trabalhador bracal",
    "trab bracal",
    "continuo",
  ];

  if (
    funcoesASG.some(
      (funcao) =>
        cargo === funcao ||
        cargo.startsWith(`${funcao} `) ||
        cargo.includes(funcao),
    )
  ) {
    return "ASG";
  }

  // =========================================
  // AUXILIAR ADMINISTRATIVO
  // =========================================

  const funcoesAdministrativas = [
    "auxiliar administrativo",
    "aux administrativo",
    "assistente administrativo",
    "agente administrativo",
    "analista administrativo",
    "escriturario",
    "aux escrita",
    "digitador",
    "aux secretaria",
    "auxiliar de secretaria",
    "auxiliar secretaria",
  ];

  if (
    funcoesAdministrativas.some(
      (funcao) =>
        cargo === funcao ||
        cargo.startsWith(`${funcao} `) ||
        cargo.includes(funcao),
    )
  ) {
    return "AUXILIAR ADMINISTRATIVO";
  }

  // =========================================
  // MERENDEIRA
  // =========================================

  if (cargo.includes("merendeira") || cargo.includes("merendeiro")) {
    return "MERENDEIRA";
  }

  // =========================================
  // PORTEIRO
  // =========================================

  if (cargo.includes("porteiro") || cargo.includes("porteira")) {
    return "PORTEIRO";
  }

  // =========================================
  // VIGIA
  // =========================================

  if (cargo.includes("vigia") || cargo.includes("vigilante")) {
    return "VIGIA";
  }

  return null;
}

function obterServidoresAtivosDoLocal(localId) {
  return servidores.filter((servidor) => {
    const mesmoLocal = servidor.localExercicioId === localId;

    return mesmoLocal && servidorEstaAtivo(servidor);
  });
}

function obterTurmasDoLocal(localId) {
  return turmas
    .filter(
      (turma) => String(turma.localExercicioId || "") === String(localId || ""),
    )
    .sort(compararTurmas);
}

function obterServidorPorId(servidorId) {
  if (servidorId === null || servidorId === undefined || servidorId === "") {
    return null;
  }

  return (
    servidores.find(
      (servidor) => String(servidor.id || servidor._key) === String(servidorId),
    ) || null
  );
}

function obterEscolaPorLocalId(localId) {
  if (!localId) {
    return null;
  }

  return escolas.find((escola) => escola.localExercicioId === localId);
}

function obterGestorDaEscola(escola) {
  if (!escola?.gestorId) {
    return null;
  }

  return obterServidorPorId(escola.gestorId);
}

function obterSecretarioDaEscola(escola) {
  if (!escola?.secretarioId) {
    return null;
  }

  return obterServidorPorId(escola.secretarioId);
}

function obterCoordenadoresDaEscola(escola) {
  return (escola?.coordenadores || [])
    .map((coordenador) => {
      const servidor = obterServidorPorId(coordenador.servidorId);

      if (!servidor) {
        return null;
      }

      const modalidades = Array.isArray(coordenador.modalidades)
        ? coordenador.modalidades
        : [];

      return {
        ...servidor,

        modalidade: modalidades.length ? modalidades.join(", ") : "-",
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
        sensitivity: "base",
      }),
    );
}

function obterProfessoresDaTurma(turma) {
  const professores = turma?.professores;

  if (!professores) {
    return [];
  }

  if (Array.isArray(professores)) {
    return professores
      .map((item) => {
        const servidorId = typeof item === "string" ? item : item?.servidorId;

        return obterServidorPorId(servidorId);
      })
      .filter(
        (servidor) =>
          servidor &&
          servidorEstaAtivo(servidor) &&
          servidorEhProfessor(servidor) &&
          servidor.foraSala !== true,
      );
  }

  return Object.entries(professores)
    .map(([chave, dados]) => {
      const servidorId =
        typeof dados === "object" && dados?.servidorId
          ? dados.servidorId
          : chave;

      return obterServidorPorId(servidorId);
    })
    .filter(
      (servidor) =>
        servidor &&
        servidorEstaAtivo(servidor) &&
        servidorEhProfessor(servidor) &&
        servidor.foraSala !== true,
    );
}

function obterProfessoresEmSalaDoLocal(localId) {
  const turmasDoLocal = obterTurmasDoLocal(localId);

  const professoresPorId = new Map();

  turmasDoLocal.forEach((turma) => {
    const professoresDaTurma = obterProfessoresDaTurma(turma);

    professoresDaTurma.forEach((servidor) => {
      const servidorId = String(
        servidor.id || servidor._key || servidor.cpf || servidor.nome,
      );

      professoresPorId.set(servidorId, servidor);
    });
  });

  return Array.from(professoresPorId.values());
}

function obterIdServidor(servidor) {
  return String(
    servidor?.id || servidor?._key || servidor?.cpf || servidor?.nome || "",
  );
}

function escaparHtmlValidacao(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function criarItemValidacao(tipo, titulo, descricao, itens = []) {
  const configuracoes = {
    sucesso: {
      classe: "validacao-sucesso",
      icone: "check_circle",
    },

    alerta: {
      classe: "validacao-alerta",
      icone: "warning",
    },

    erro: {
      classe: "validacao-erro",
      icone: "error",
    },
  };

  const configuracao = configuracoes[tipo] || configuracoes.alerta;

  const lista = itens.length
    ? `
      <ul class="validacao-lista">
        ${itens
          .map(
            (item) => `
              <li>${escaparHtmlValidacao(item)}</li>
            `,
          )
          .join("")}
      </ul>
    `
    : "";

  return `
    <div class="validacao-item ${configuracao.classe}">
      <span class="material-symbols-outlined">
        ${configuracao.icone}
      </span>

      <div>
        <strong>
          ${escaparHtmlValidacao(titulo)}
        </strong>

        <span>
          ${escaparHtmlValidacao(descricao)}
        </span>

        ${lista}
      </div>
    </div>
  `;
}

function validarQuadroSelecionado() {
  const localId = selectLocal.value;

  if (!localId) {
    mostrarNotificacao("Selecione uma escola para validar o quadro.", "erro");

    return;
  }

  const localSelecionado = locais.find(
    (local) => String(local.id) === String(localId),
  );

  if (!localSelecionado) {
    mostrarNotificacao("Escola não encontrada.", "erro");

    return;
  }

  const escola = obterEscolaPorLocalId(localId);

  const servidoresAtivos = obterServidoresAtivosDoLocal(localId);

  const turmasDoLocal = obterTurmasDoLocal(localId);

  const itensValidacao = [];

  /*
   * Guarda todos os registros que aparecem
   * em alguma seção do quadro.
   */
  const idsIncluidos = new Set();

  /*
   * Guarda as turmas vinculadas a cada cadastro
   * de professor.
   */
  const turmasPorProfessor = new Map();

  // =========================================
  // EQUIPE GESTORA
  // =========================================

  const gestor = obterGestorDaEscola(escola);

  const secretario = obterSecretarioDaEscola(escola);

  const coordenadores = obterCoordenadoresDaEscola(escola);

  if (gestor) {
    idsIncluidos.add(obterIdServidor(gestor));

    itensValidacao.push(
      criarItemValidacao(
        "sucesso",
        "Diretor(a) cadastrado(a)",
        gestor.nome || "Servidor identificado.",
      ),
    );
  } else {
    itensValidacao.push(
      criarItemValidacao(
        "alerta",
        "Diretor(a) não cadastrado(a)",
        "A escola não possui diretor vinculado na página Escolas.",
      ),
    );
  }

  if (secretario) {
    idsIncluidos.add(obterIdServidor(secretario));

    itensValidacao.push(
      criarItemValidacao(
        "sucesso",
        "Secretário(a) escolar cadastrado(a)",
        secretario.nome || "Servidor identificado.",
      ),
    );
  } else {
    itensValidacao.push(
      criarItemValidacao(
        "alerta",
        "Secretário(a) escolar não cadastrado(a)",
        "A escola não possui secretário vinculado.",
      ),
    );
  }

  coordenadores.forEach((servidor) => {
    idsIncluidos.add(obterIdServidor(servidor));
  });

  if (coordenadores.length) {
    itensValidacao.push(
      criarItemValidacao(
        "sucesso",
        "Coordenação pedagógica cadastrada",
        `${coordenadores.length} coordenador(es) vinculado(s).`,
      ),
    );
  } else {
    itensValidacao.push(
      criarItemValidacao(
        "alerta",
        "Coordenação pedagógica não cadastrada",
        "Nenhum coordenador foi vinculado à escola.",
      ),
    );
  }

  // =========================================
  // TURMAS E PROFESSORES
  // =========================================

  const turmasSemProfessor = [];

  const professoresLotacaoDiferente = [];

  turmasDoLocal.forEach((turma) => {
    const professoresDaTurma = obterProfessoresDaTurma(turma);

    if (!professoresDaTurma.length) {
      turmasSemProfessor.push(turma.nome || "Turma sem nome");

      return;
    }

    professoresDaTurma.forEach((professor) => {
      const professorId = obterIdServidor(professor);

      idsIncluidos.add(professorId);

      const turmasProfessor = turmasPorProfessor.get(professorId) || [];

      turmasProfessor.push(turma.nome || "Turma sem nome");

      turmasPorProfessor.set(professorId, turmasProfessor);

      const mesmoLocal =
        String(professor.localExercicioId || "") === String(localId || "");

      if (!mesmoLocal) {
        professoresLotacaoDiferente.push(
          `${professor.nome || "Professor"} — ${
            turma.nome || "Turma sem nome"
          }`,
        );
      }
    });
  });

  if (!turmasDoLocal.length) {
    itensValidacao.push(
      criarItemValidacao(
        "alerta",
        "Nenhuma turma cadastrada",
        "A escola ainda não possui turmas cadastradas.",
      ),
    );
  } else if (turmasSemProfessor.length) {
    itensValidacao.push(
      criarItemValidacao(
        "erro",
        "Turmas sem professor",
        `${turmasSemProfessor.length} turma(s) não possuem professor vinculado.`,
        turmasSemProfessor,
      ),
    );
  } else {
    itensValidacao.push(
      criarItemValidacao(
        "sucesso",
        "Todas as turmas possuem professor",
        `${turmasDoLocal.length} turma(s) verificadas.`,
      ),
    );
  }

  if (professoresLotacaoDiferente.length) {
    itensValidacao.push(
      criarItemValidacao(
        "erro",
        "Professores com lotação diferente",
        "Estes professores estão vinculados a turmas desta escola, mas possuem outra lotação no cadastro.",
        professoresLotacaoDiferente,
      ),
    );
  } else {
    itensValidacao.push(
      criarItemValidacao(
        "sucesso",
        "Lotações dos professores conferidas",
        "Todos os professores das turmas estão lotados nesta escola.",
      ),
    );
  }

  // =========================================
  // PROFESSORES EM MAIS DE UMA TURMA
  // =========================================

  const professoresRepetidos = [];

  turmasPorProfessor.forEach((nomesTurmas, professorId) => {
    if (nomesTurmas.length <= 1) {
      return;
    }

    const professor = obterServidorPorId(professorId);

    professoresRepetidos.push(
      `${professor?.nome || "Professor"} — ${nomesTurmas.join(", ")}`,
    );
  });

  if (professoresRepetidos.length) {
    itensValidacao.push(
      criarItemValidacao(
        "alerta",
        "Professor vinculado a mais de uma turma",
        "Confira se são realmente duas turmas do mesmo vínculo ou se deveria existir outro cadastro funcional.",
        professoresRepetidos,
      ),
    );
  } else {
    itensValidacao.push(
      criarItemValidacao(
        "sucesso",
        "Nenhum professor repetido entre turmas",
        "Cada cadastro funcional está vinculado a somente uma turma.",
      ),
    );
  }

  // =========================================
  // PROFESSORES FORA DE SALA
  // =========================================

  const professoresForaSala = servidoresAtivos.filter(
    servidorEhProfessorForaSala,
  );

  professoresForaSala.forEach((servidor) => {
    idsIncluidos.add(obterIdServidor(servidor));
  });

  // =========================================
  // AUXILIARES DE SALA
  // =========================================

  const auxiliaresSala = servidoresAtivos.filter(servidorEhAuxiliarSala);

  auxiliaresSala.forEach((servidor) => {
    idsIncluidos.add(obterIdServidor(servidor));
  });

  // =========================================
  // FUNCIONÁRIOS DE APOIO
  // =========================================

  const funcionariosApoio = servidoresAtivos.filter(servidorEhApoio);

  funcionariosApoio.forEach((servidor) => {
    idsIncluidos.add(obterIdServidor(servidor));
  });

  // =========================================
  // CUIDADORES
  // =========================================

  const cuidadores = servidoresAtivos.filter(servidorEhCuidador);

  cuidadores.forEach((servidor) => {
    idsIncluidos.add(obterIdServidor(servidor));
  });

  // =========================================
  // SERVIDORES NÃO INCLUÍDOS
  // =========================================

  const servidoresNaoIncluidos = servidoresAtivos.filter(
    (servidor) => !idsIncluidos.has(obterIdServidor(servidor)),
  );

  if (servidoresNaoIncluidos.length) {
    itensValidacao.push(
      criarItemValidacao(
        "erro",
        "Servidores ativos não incluídos no quadro",
        `${servidoresNaoIncluidos.length} servidor(es) não aparecem em nenhuma seção.`,
        servidoresNaoIncluidos.map(
          (servidor) =>
            `${servidor.nome || "Sem nome"} — ${
              servidor.cargo || "Cargo não informado"
            }`,
        ),
      ),
    );
  } else {
    itensValidacao.push(
      criarItemValidacao(
        "sucesso",
        "Todos os servidores ativos foram identificados",
        `${servidoresAtivos.length} servidor(es) ativos estão contemplados no quadro.`,
      ),
    );
  }

  // =========================================
  // TOTAL IDENTIFICADO
  // =========================================

  const totalIdentificados = servidoresAtivos.filter((servidor) =>
    idsIncluidos.has(obterIdServidor(servidor)),
  ).length;

  const possuiErro =
    turmasSemProfessor.length > 0 ||
    professoresLotacaoDiferente.length > 0 ||
    servidoresNaoIncluidos.length > 0;

  const possuiAlerta =
    !gestor ||
    !secretario ||
    !coordenadores.length ||
    professoresRepetidos.length > 0 ||
    !turmasDoLocal.length;

  const validacaoCompleta = !possuiErro && !possuiAlerta;

  itensValidacao.unshift(
    criarItemValidacao(
      validacaoCompleta ? "sucesso" : possuiErro ? "erro" : "alerta",

      validacaoCompleta
        ? "Quadro validado com sucesso"
        : possuiErro
          ? "Quadro possui inconsistências"
          : "Quadro possui pontos para conferência",

      `${totalIdentificados} de ${servidoresAtivos.length} servidor(es) ativos foram identificados.`,
    ),
  );

  subtituloValidacaoQuadro.textContent = localSelecionado.nome;

  conteudoValidacaoQuadro.innerHTML = itensValidacao.join("");

  resultadoValidacaoQuadro.style.display = "block";

  resultadoValidacaoQuadro.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function atualizarResumoQuadro() {
  const localId = selectLocal.value;

  if (!localId) {
    resumoQuadro.style.display = "none";
    return;
  }

  const localSelecionado = locais.find((local) => local.id === localId);

  if (!localSelecionado) {
    resumoQuadro.style.display = "none";
    return;
  }

  const servidoresAtivos = obterServidoresAtivosDoLocal(localId);

  const professores = obterProfessoresEmSalaDoLocal(localId);

  const auxiliaresSala = servidoresAtivos.filter(servidorEhAuxiliarSala);

  const apoio = servidoresAtivos.filter(servidorEhApoio);

  const cuidadores = servidoresAtivos.filter(servidorEhCuidador);

  const turmasDoLocal = obterTurmasDoLocal(localId);

  nomeEscolaQuadro.textContent = localSelecionado.nome;
  totalServidoresQuadro.textContent = servidoresAtivos.length;
  totalProfessoresQuadro.textContent = professores.length;
  totalAuxiliaresSalaQuadro.textContent = auxiliaresSala.length;
  totalApoioQuadro.textContent = apoio.length;
  totalCuidadoresQuadro.textContent = cuidadores.length;

  if (servidoresAtivos.length) {
    situacaoQuadro.textContent =
      `${servidoresAtivos.length} servidor(es) ativo(s) e ` +
      `${turmasDoLocal.length} turma(s) encontrada(s).`;
  } else {
    situacaoQuadro.textContent =
      "Nenhum servidor ativo foi encontrado nesta escola.";
  }

  resumoQuadro.style.display = "block";
}

function atualizarSelectEscolasCadastradas() {
  selectLocal.innerHTML = "";

  /*
   * Espera o carregamento dos dois nós:
   * - escolas
   * - servidores/locaisExercicio
   */
  if (!escolas.length || !locais.length) {
    selectLocal.innerHTML = `
      <option value="">
        Carregando escolas...
      </option>
    `;

    selectLocal.disabled = true;
    return;
  }

  const idsLocaisCadastrados = new Set(
    escolas
      .map((escola) => String(escola.localExercicioId || ""))
      .filter(Boolean),
  );

  const escolasCadastradas = locais
    .filter((local) => idsLocaisCadastrados.has(String(local.id)))
    .sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
        sensitivity: "base",
      }),
    );

  const optDefault = document.createElement("option");

  optDefault.value = "";
  optDefault.textContent = "Selecione uma escola";
  optDefault.disabled = true;
  optDefault.selected = true;

  selectLocal.appendChild(optDefault);

  escolasCadastradas.forEach((local) => {
    const option = document.createElement("option");

    option.value = local.id;
    option.textContent = local.nome;

    selectLocal.appendChild(option);
  });

  if (!escolasCadastradas.length) {
    selectLocal.innerHTML = `
      <option value="">
        Nenhuma escola cadastrada
      </option>
    `;

    selectLocal.disabled = true;
    return;
  }

  selectLocal.disabled = false;
}

// ===============================
// 🔄 ESTADO INICIAL (CARREGANDO)
// ===============================
selectLocal.innerHTML = `<option>Carregando...</option>`;
selectLocal.disabled = true;

// ===============================
// 🔥 CARREGAR SERVIDORES
// ===============================
onValue(ref(rtdb, "servidores/registros"), (snap) => {
  servidores = snap.exists()
    ? Object.entries(snap.val()).map(([id, dados]) => ({
        id,
        ...dados,
      }))
    : [];

  atualizarResumoQuadro();
});

// ===============================
// 🔥 CARREGAR TURMAS
// ===============================
onValue(ref(rtdb, "turmas"), (snap) => {
  turmas = snap.exists()
    ? Object.entries(snap.val()).map(([id, dados]) => ({
        id,
        ...dados,
      }))
    : [];

  atualizarResumoQuadro();
});

// ===============================
// 🔥 CARREGAR ESCOLAS
// ===============================
onValue(ref(rtdb, "escolas"), (snap) => {
  escolas = snap.exists()
    ? Object.entries(snap.val()).map(([id, dados]) => ({
        id,
        ...dados,
      }))
    : [];

  atualizarSelectEscolasCadastradas();
  atualizarResumoQuadro();
});

// ===============================
// 🔥 CARREGAR LOCAIS
// ===============================
onValue(ref(rtdb, "servidores/locaisExercicio"), (snap) => {
  locais = snap.exists()
    ? Object.entries(snap.val())
        .map(([id, dados]) => ({
          id,
          nome: dados?.nome || "",
        }))
        .filter((local) => local.nome)
    : [];

  atualizarSelectEscolasCadastradas();
});

selectLocal.addEventListener("change", atualizarResumoQuadro);

btnValidarQuadro?.addEventListener("click", validarQuadroSelecionado);

btnFecharValidacaoQuadro?.addEventListener("click", () => {
  resultadoValidacaoQuadro.style.display = "none";
});

selectLocal.addEventListener("change", () => {
  resultadoValidacaoQuadro.style.display = "none";
});

// ===============================
// 📄 GERAR PDF
// ===============================
btnGerar.addEventListener("click", () => {
  const localId = selectLocal.value;

  if (!localId) {
    mostrarNotificacao("Selecione um local de exercício.", "erro");

    return;
  }

  const localSelecionado = locais.find((local) => local.id === localId);

  if (!localSelecionado) {
    mostrarNotificacao("Local de exercício não encontrado.", "erro");

    return;
  }

  const filtrados = obterServidoresAtivosDoLocal(localId);

  if (!filtrados.length) {
    mostrarNotificacao("Nenhum servidor ativo encontrado neste local.", "erro");

    return;
  }

  gerarPDF(localSelecionado.nome, filtrados);
});

// ===============================
// 🧾 FUNÇÃO PDF
// ===============================
function gerarPDF(local, lista) {
  const { jsPDF } = window.jspdf;

  // Paisagem, como o modelo do quadro distributivo
  const doc = new jsPDF("l", "mm", "a4");

  const larguraPagina = 297;
  const alturaPagina = 210;

  const margemEsquerda = 12;
  const margemDireita = 12;

  const limiteDireito = larguraPagina - margemDireita;
  const limiteInferior = 188;

  const alturaLinha = 8;

  let y = 38;

  const img = new Image();
  img.src = "./src/images/papel-timbrado-horizontal.png";

  const funcionariosApoio = lista.filter(servidorEhApoio).sort((a, b) =>
    String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
      sensitivity: "base",
    }),
  );

  img.onload = () => {
    function recortarCabecalhoTimbrado() {
      const canvas = document.createElement("canvas");
      const contexto = canvas.getContext("2d");

      /*
       * Recorta apenas a parte superior do papel timbrado.
       * Ajuste 0.18 caso seja necessário mostrar mais ou
       * menos conteúdo do cabeçalho.
       */
      const alturaRecorte = Math.round(img.naturalHeight * 0.18);

      canvas.width = img.naturalWidth;
      canvas.height = alturaRecorte;

      contexto.drawImage(
        img,
        0,
        0,
        img.naturalWidth,
        alturaRecorte,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      return canvas.toDataURL("image/png");
    }

    const cabecalhoTimbrado = recortarCabecalhoTimbrado();

    function adicionarPapelTimbrado() {
      const proporcao = img.naturalWidth / Math.round(img.naturalHeight * 0.18);

      const alturaCabecalho = larguraPagina / proporcao;

      doc.addImage(
        cabecalhoTimbrado,
        "PNG",
        0,
        0,
        larguraPagina,
        alturaCabecalho,
      );
    }
    function desenharTituloPagina(continuacao = false) {
      doc.setTextColor(0, 0, 0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);

      const titulo = continuacao
        ? "FUNCIONÁRIOS DE APOIO — CONTINUAÇÃO"
        : "FUNCIONÁRIOS DE APOIO";

      doc.text(titulo, larguraPagina / 2, 43, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(local, larguraPagina / 2, 49, {
        align: "center",
      });

      y = 55;
    }

    function desenharCabecalhoTabela() {
      const larguras = {
        situacao: 28,
        asg: 49,
        auxiliar: 55,
        merendeira: 49,
        porteiro: 49,
        vigia: 43,
      };

      const colunas = [
        {
          titulo: "VÍNCULO",
          largura: larguras.situacao,
        },
        {
          titulo: "ASG",
          largura: larguras.asg,
        },
        {
          titulo: "AUX. ADMINISTRATIVO",
          largura: larguras.auxiliar,
        },
        {
          titulo: "MERENDEIRA",
          largura: larguras.merendeira,
        },
        {
          titulo: "PORTEIRO",
          largura: larguras.porteiro,
        },
        {
          titulo: "VIGIA",
          largura: larguras.vigia,
        },
      ];

      let x = margemEsquerda;

      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.25);

      colunas.forEach((coluna) => {
        doc.setFillColor(222, 211, 235);
        doc.setDrawColor(100, 100, 100);

        doc.rect(x, y, coluna.largura, 12, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(25, 25, 25);

        const linhasTitulo = doc.splitTextToSize(
          coluna.titulo,
          coluna.largura - 3,
        );

        doc.text(linhasTitulo, x + coluna.largura / 2, y + 5, {
          align: "center",
        });

        x += coluna.largura;
      });

      y += 12;
    }

    function iniciarPagina(continuacao = false) {
      adicionarPapelTimbrado();
      desenharTituloPagina(continuacao);
      desenharCabecalhoTabela();
    }

    function novaPagina() {
      doc.addPage("a4", "landscape");
      iniciarPagina(true);
    }

    function verificarEspaco(alturaNecessaria = alturaLinha) {
      if (y + alturaNecessaria > limiteInferior) {
        novaPagina();
      }
    }

    function obterServidoresCategoria(categoria, tipoVinculo) {
      return funcionariosApoio.filter((servidor) => {
        return (
          obterCategoriaApoio(servidor) === categoria &&
          obterTipoVinculo(servidor) === tipoVinculo
        );
      });
    }

    function montarTextoServidor(servidor) {
      const nome = String(servidor.nome || "-").trim();
      const cpf = formatarCPF(servidor.cpf);

      return `${nome}\nCPF: ${cpf}`;
    }

    function calcularAlturaLinha(celulas, larguras) {
      let maiorQuantidadeLinhas = 1;

      celulas.forEach((texto, indice) => {
        const larguraCelula = larguras[indice] - 4;

        const linhas = doc.splitTextToSize(String(texto || ""), larguraCelula);

        maiorQuantidadeLinhas = Math.max(maiorQuantidadeLinhas, linhas.length);
      });

      return Math.max(alturaLinha, maiorQuantidadeLinhas * 4 + 4);
    }

    function desenharLinha(tipoVinculo, servidoresPorCategoria) {
      const larguras = [28, 49, 55, 49, 49, 43];

      const nomesCategorias = [
        "ASG",
        "AUXILIAR ADMINISTRATIVO",
        "MERENDEIRA",
        "PORTEIRO",
        "VIGIA",
      ];

      const maiorQuantidade = Math.max(
        1,
        ...nomesCategorias.map(
          (categoria) => servidoresPorCategoria[categoria].length,
        ),
      );

      /*
       * Primeiro montamos todas as linhas do vínculo
       * e calculamos a altura de cada uma.
       */
      const linhasDoGrupo = [];

      for (let indice = 0; indice < maiorQuantidade; indice++) {
        const celulas = [
          servidoresPorCategoria.ASG[indice]
            ? montarTextoServidor(servidoresPorCategoria.ASG[indice])
            : "",

          servidoresPorCategoria["AUXILIAR ADMINISTRATIVO"][indice]
            ? montarTextoServidor(
                servidoresPorCategoria["AUXILIAR ADMINISTRATIVO"][indice],
              )
            : "",

          servidoresPorCategoria.MERENDEIRA[indice]
            ? montarTextoServidor(servidoresPorCategoria.MERENDEIRA[indice])
            : "",

          servidoresPorCategoria.PORTEIRO[indice]
            ? montarTextoServidor(servidoresPorCategoria.PORTEIRO[indice])
            : "",

          servidoresPorCategoria.VIGIA[indice]
            ? montarTextoServidor(servidoresPorCategoria.VIGIA[indice])
            : "",
        ];

        const alturaAtual = calcularAlturaLinha(["", ...celulas], larguras);

        linhasDoGrupo.push({
          celulas,
          altura: alturaAtual,
        });
      }

      const cor = obterCorVinculoPDF({
        vinculo: tipoVinculo,
      });

      let indiceInicial = 0;

      /*
       * Um vínculo pode ocupar mais de uma página.
       * Cada página recebe uma célula mesclada própria.
       */
      while (indiceInicial < linhasDoGrupo.length) {
        if (y + alturaLinha > limiteInferior) {
          novaPagina();
        }

        let alturaBloco = 0;
        let indiceFinal = indiceInicial;

        /*
         * Descobre quantas linhas cabem na página atual.
         */
        while (indiceFinal < linhasDoGrupo.length) {
          const proximaAltura = linhasDoGrupo[indiceFinal].altura;

          if (y + alturaBloco + proximaAltura > limiteInferior) {
            break;
          }

          alturaBloco += proximaAltura;
          indiceFinal++;
        }

        /*
         * Caso nem uma linha caiba, cria uma nova página.
         */
        if (indiceFinal === indiceInicial) {
          novaPagina();
          continue;
        }

        const yInicioBloco = y;

        /*
         * Célula mesclada do vínculo.
         */
        doc.setFillColor(...cor);
        doc.setDrawColor(110, 110, 110);
        doc.setLineWidth(0.2);

        doc.rect(margemEsquerda, yInicioBloco, larguras[0], alturaBloco, "FD");

        doc.setTextColor(25, 25, 25);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);

        doc.text(
          tipoVinculo.toUpperCase(),
          margemEsquerda + larguras[0] / 2,
          yInicioBloco + alturaBloco / 2 + 1.5,
          {
            align: "center",
          },
        );

        /*
         * Desenha as células dos servidores.
         */
        let yLinha = yInicioBloco;

        for (
          let indiceLinha = indiceInicial;
          indiceLinha < indiceFinal;
          indiceLinha++
        ) {
          const linha = linhasDoGrupo[indiceLinha];

          let x = margemEsquerda + larguras[0];

          linha.celulas.forEach((texto, indiceCelula) => {
            const larguraCelula = larguras[indiceCelula + 1];

            doc.setFillColor(...cor);
            doc.setDrawColor(110, 110, 110);
            doc.setLineWidth(0.2);

            doc.rect(x, yLinha, larguraCelula, linha.altura, "FD");

            doc.setTextColor(25, 25, 25);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);

            const linhasTexto = doc.splitTextToSize(
              String(texto || ""),
              larguraCelula - 4,
            );

            doc.text(linhasTexto, x + 2, yLinha + 4.5);

            x += larguraCelula;
          });

          yLinha += linha.altura;
        }

        y += alturaBloco;
        indiceInicial = indiceFinal;

        /*
         * Se ainda houver registros do mesmo vínculo,
         * eles continuarão na próxima página.
         */
        if (indiceInicial < linhasDoGrupo.length) {
          novaPagina();
        }
      }
    }

    function desenharGrupoVinculo(tipoVinculo) {
      const categorias = [
        "ASG",
        "AUXILIAR ADMINISTRATIVO",
        "MERENDEIRA",
        "PORTEIRO",
        "VIGIA",
      ];

      const servidoresPorCategoria = {};

      categorias.forEach((categoria) => {
        servidoresPorCategoria[categoria] = obterServidoresCategoria(
          categoria,
          tipoVinculo,
        );
      });

      const possuiServidor = categorias.some(
        (categoria) => servidoresPorCategoria[categoria].length > 0,
      );

      if (!possuiServidor) {
        return;
      }

      desenharLinha(tipoVinculo, servidoresPorCategoria);
    }

    function desenharMensagemSemRegistros() {
      verificarEspaco(12);

      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(130, 130, 130);

      doc.rect(margemEsquerda, y, limiteDireito - margemEsquerda, 12, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);

      doc.text(
        "Nenhum funcionário de apoio ativo foi encontrado nesta escola.",
        larguraPagina / 2,
        y + 7,
        {
          align: "center",
        },
      );

      y += 12;
    }

    function desenharCabecalhoCuidadores() {
      const colunas = [
        {
          titulo: "NOME COMPLETO",
          largura: 70,
        },
        {
          titulo: "JORNADA",
          largura: 32,
        },
        {
          titulo: "CPF",
          largura: 38,
        },
        {
          titulo: "VÍNCULO",
          largura: 32,
        },
        {
          titulo: "HABILITAÇÃO",
          largura: 42,
        },
        {
          titulo: "ALUNO(S) ATENDIDO(S) / TURMA",
          largura: 59,
        },
      ];

      let x = margemEsquerda;

      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.25);

      colunas.forEach((coluna) => {
        doc.setFillColor(222, 211, 235);
        doc.setDrawColor(100, 100, 100);

        doc.rect(x, y, coluna.largura, 14, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(25, 25, 25);

        const linhasTitulo = doc.splitTextToSize(
          coluna.titulo,
          coluna.largura - 3,
        );

        const alturaTexto = linhasTitulo.length * 3.2;

        doc.text(
          linhasTitulo,
          x + coluna.largura / 2,
          y + 7 - alturaTexto / 2 + 2.5,
          {
            align: "center",
          },
        );

        x += coluna.largura;
      });

      y += 14;
    }

    function iniciarPaginaCuidadores(continuacao = false) {
      adicionarPapelTimbrado();

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);

      const titulo = continuacao ? "CUIDADORES — CONTINUAÇÃO" : "CUIDADORES";

      doc.text(titulo, larguraPagina / 2, 43, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(local, larguraPagina / 2, 49, {
        align: "center",
      });

      y = 55;

      desenharCabecalhoCuidadores();
    }

    function novaPaginaCuidadores() {
      doc.addPage("a4", "landscape");
      iniciarPaginaCuidadores(true);
    }

    function obterDadosCuidador(servidor) {
      return {
        nome: String(servidor?.nome || "-").trim(),

        jornada: servidor?.jornada || servidor?.cargaHoraria || "-",

        cpf: formatarCPF(servidor?.cpf),

        vinculo: obterNomeVinculo(servidor),

        habilitacao: servidor?.habilitacao || "-",

        atendimento:
          servidor?.alunosAtendidos ||
          servidor?.alunoAtendido ||
          servidor?.turma ||
          "-",
      };
    }

    function calcularAlturaLinhaCuidador(dados) {
      const larguras = [70, 32, 38, 32, 42, 59];

      const textos = [
        dados.nome,
        dados.jornada,
        dados.cpf,
        dados.vinculo,
        dados.habilitacao,
        dados.atendimento,
      ];

      let maiorQuantidadeLinhas = 1;

      textos.forEach((texto, indice) => {
        const linhas = doc.splitTextToSize(
          String(texto || "-"),
          larguras[indice] - 4,
        );

        maiorQuantidadeLinhas = Math.max(maiorQuantidadeLinhas, linhas.length);
      });

      return Math.max(9, maiorQuantidadeLinhas * 4 + 4);
    }

    function desenharLinhaCuidador(servidor) {
      const dados = obterDadosCuidador(servidor);

      const larguras = [70, 32, 38, 32, 42, 59];

      const textos = [
        dados.nome,
        dados.jornada,
        dados.cpf,
        dados.vinculo,
        dados.habilitacao,
        dados.atendimento,
      ];

      const alturaAtual = calcularAlturaLinhaCuidador(dados);

      if (y + alturaAtual > limiteInferior) {
        novaPaginaCuidadores();
      }

      const cor = obterCorVinculoPDF(servidor);

      let x = margemEsquerda;

      textos.forEach((texto, indice) => {
        doc.setFillColor(...cor);
        doc.setDrawColor(110, 110, 110);
        doc.setLineWidth(0.2);

        doc.rect(x, y, larguras[indice], alturaAtual, "FD");

        doc.setTextColor(25, 25, 25);
        doc.setFont("helvetica", indice === 0 ? "bold" : "normal");
        doc.setFontSize(7.5);

        const linhasTexto = doc.splitTextToSize(
          String(texto || "-"),
          larguras[indice] - 4,
        );

        doc.text(linhasTexto, x + 2, y + 4.5);

        x += larguras[indice];
      });

      y += alturaAtual;
    }

    function desenharMensagemSemCuidadores() {
      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(130, 130, 130);
      doc.setLineWidth(0.2);

      doc.rect(margemEsquerda, y, limiteDireito - margemEsquerda, 12, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);

      doc.text(
        "Nenhum cuidador ativo foi encontrado nesta escola.",
        larguraPagina / 2,
        y + 7,
        {
          align: "center",
        },
      );

      y += 12;
    }

    function desenharSecaoCuidadores() {
      const cuidadores = lista.filter(servidorEhCuidador).sort((a, b) =>
        String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
          sensitivity: "base",
        }),
      );

      doc.addPage("a4", "landscape");

      iniciarPaginaCuidadores(false);

      if (!cuidadores.length) {
        desenharMensagemSemCuidadores();
        return;
      }

      cuidadores.forEach((servidor) => {
        desenharLinhaCuidador(servidor);
      });
    }

    function desenharTituloEquipe(continuacao = false) {
      adicionarPapelTimbrado();

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);

      const titulo = continuacao
        ? "EQUIPE GESTORA E PEDAGÓGICA — CONTINUAÇÃO"
        : "EQUIPE GESTORA E PEDAGÓGICA";

      doc.text(titulo, larguraPagina / 2, 43, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(local, larguraPagina / 2, 49, {
        align: "center",
      });

      y = 57;
    }

    function novaPaginaEquipe() {
      doc.addPage("a4", "landscape");
      desenharTituloEquipe(true);
    }

    function desenharCabecalhoEquipe(colunas) {
      let x = margemEsquerda;

      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.25);

      colunas.forEach((coluna) => {
        doc.setFillColor(222, 211, 235);

        doc.rect(x, y, coluna.largura, 11, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(25, 25, 25);

        const linhas = doc.splitTextToSize(coluna.titulo, coluna.largura - 3);

        doc.text(linhas, x + coluna.largura / 2, y + 5, {
          align: "center",
        });

        x += coluna.largura;
      });

      y += 11;
    }

    function calcularAlturaLinhaEquipe(textos, larguras) {
      let maiorQuantidadeLinhas = 1;

      textos.forEach((texto, indice) => {
        const linhas = doc.splitTextToSize(
          String(texto || "-"),
          larguras[indice] - 4,
        );

        maiorQuantidadeLinhas = Math.max(maiorQuantidadeLinhas, linhas.length);
      });

      return Math.max(9, maiorQuantidadeLinhas * 4 + 4);
    }

    function desenharLinhaEquipe(servidor, colunas, textos) {
      const larguras = colunas.map((coluna) => coluna.largura);

      const alturaAtual = calcularAlturaLinhaEquipe(textos, larguras);

      if (y + alturaAtual > limiteInferior) {
        novaPaginaEquipe();
        desenharCabecalhoEquipe(colunas);
      }

      const cor = obterCorVinculoPDF(servidor);

      let x = margemEsquerda;

      textos.forEach((texto, indice) => {
        doc.setFillColor(...cor);
        doc.setDrawColor(110, 110, 110);
        doc.setLineWidth(0.2);

        doc.rect(x, y, larguras[indice], alturaAtual, "FD");

        doc.setTextColor(25, 25, 25);
        doc.setFont("helvetica", indice === 0 ? "bold" : "normal");
        doc.setFontSize(7.5);

        const linhas = doc.splitTextToSize(
          String(texto || "-"),
          larguras[indice] - 4,
        );

        doc.text(linhas, x + 2, y + 4.5);

        x += larguras[indice];
      });

      y += alturaAtual;
    }

    function desenharMensagemEquipeVazia(colunas, mensagem) {
      const larguraTotal = colunas.reduce(
        (total, coluna) => total + coluna.largura,
        0,
      );

      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(130, 130, 130);
      doc.setLineWidth(0.2);

      doc.rect(margemEsquerda, y, larguraTotal, 10, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);

      doc.text(mensagem, margemEsquerda + larguraTotal / 2, y + 6, {
        align: "center",
      });

      y += 10;
    }

    function desenharSubsecaoEquipe(
      titulo,
      servidoresSecao,
      colunas,
      montarTextos,
    ) {
      if (y + 22 > limiteInferior) {
        novaPaginaEquipe();
      }

      y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);

      doc.text(titulo, margemEsquerda, y);

      y += 3;

      desenharCabecalhoEquipe(colunas);

      if (!servidoresSecao.length) {
        desenharMensagemEquipeVazia(
          colunas,
          "Nenhum servidor identificado nesta função.",
        );

        return;
      }

      servidoresSecao.forEach((servidor) => {
        desenharLinhaEquipe(servidor, colunas, montarTextos(servidor));
      });
    }

    function desenharSecaoEquipe() {
      const ordenarPorNome = (a, b) =>
        String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
          sensitivity: "base",
        });

      const localId = selectLocal.value;

      const escola = obterEscolaPorLocalId(localId);

      if (!escola) {
        console.warn(
          `Nenhum cadastro de escola encontrado para o local ${localId}.`,
        );
      }

      const gestor = obterGestorDaEscola(escola);

      const secretario = obterSecretarioDaEscola(escola);

      const diretores = gestor ? [gestor] : [];

      const secretarios = secretario ? [secretario] : [];

      const coordenadores = obterCoordenadoresDaEscola(escola);

      /*
       * Esta parte ainda continuará temporariamente
       * sendo identificada pelo cargo.
       *
       * Depois criaremos o vínculo específico dos
       * professores fora de sala.
       */
      const professoresForaSala = lista
        .filter(servidorEhProfessorForaSala)
        .sort(ordenarPorNome);

      desenharTituloEquipe(false);

      const colunasPadrao = [
        {
          titulo: "NOME COMPLETO",
          largura: 115,
        },
        {
          titulo: "CPF",
          largura: 53,
        },
        {
          titulo: "VÍNCULO",
          largura: 45,
        },
        {
          titulo: "HABILITAÇÃO",
          largura: 60,
        },
      ];

      desenharSubsecaoEquipe(
        "DIRETOR(A)",
        diretores,
        colunasPadrao,
        (servidor) => [
          servidor.nome || "-",
          formatarCPF(servidor.cpf),
          obterNomeVinculo(servidor),
          servidor.habilitacao || "-",
        ],
      );

      desenharSubsecaoEquipe(
        "SECRETÁRIO(A) ESCOLAR",
        secretarios,
        colunasPadrao,
        (servidor) => [
          servidor.nome || "-",
          formatarCPF(servidor.cpf),
          obterNomeVinculo(servidor),
          servidor.habilitacao || "-",
        ],
      );

      const colunasForaSala = [
        {
          titulo: "NOME COMPLETO",
          largura: 115,
        },
        {
          titulo: "CPF",
          largura: 53,
        },
        {
          titulo: "VÍNCULO",
          largura: 45,
        },
        {
          titulo: "HABILITAÇÃO",
          largura: 60,
        },
      ];

      desenharSubsecaoEquipe(
        "PROFESSORES FORA DE SALA",
        professoresForaSala,
        colunasForaSala,
        (servidor) => [
          servidor.nome || "-",
          formatarCPF(servidor.cpf),
          obterNomeVinculo(servidor),
          servidor.habilitacao || "-",
        ],
      );

      const colunasCoordenacao = [
        {
          titulo: "NOME COMPLETO",
          largura: 85,
        },
        {
          titulo: "CPF",
          largura: 43,
        },
        {
          titulo: "VÍNCULO",
          largura: 38,
        },
        {
          titulo: "MODALIDADE",
          largura: 47,
        },
        {
          titulo: "HABILITAÇÃO",
          largura: 60,
        },
      ];

      desenharSubsecaoEquipe(
        "COORDENAÇÃO PEDAGÓGICA",
        coordenadores,
        colunasCoordenacao,
        (servidor) => [
          servidor.nome || "-",
          formatarCPF(servidor.cpf),
          obterNomeVinculo(servidor),
          servidor.modalidade || "-",
          servidor.habilitacao || "-",
        ],
      );
    }

    function desenharCabecalhoProfessores() {
      const colunas = [
        {
          titulo: "TURMA",
          largura: 35,
        },
        {
          titulo: "TURNO",
          largura: 27,
        },
        {
          titulo: "QTD. DE ALUNOS",
          largura: 27,
        },
        {
          titulo: "PROFESSOR",
          largura: 70,
        },
        {
          titulo: "HABILITAÇÃO",
          largura: 40,
        },
        {
          titulo: "CPF",
          largura: 42,
        },
        {
          titulo: "VÍNCULO",
          largura: 32,
        },
      ];

      let x = margemEsquerda;

      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.25);

      colunas.forEach((coluna) => {
        doc.setFillColor(222, 211, 235);
        doc.setDrawColor(100, 100, 100);

        doc.rect(x, y, coluna.largura, 14, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(25, 25, 25);

        const linhasTitulo = doc.splitTextToSize(
          coluna.titulo,
          coluna.largura - 3,
        );

        const alturaTexto = linhasTitulo.length * 3.2;

        doc.text(
          linhasTitulo,
          x + coluna.largura / 2,
          y + 7 - alturaTexto / 2 + 2.5,
          {
            align: "center",
          },
        );

        x += coluna.largura;
      });

      y += 14;
    }

    function iniciarPaginaProfessores(continuacao = false) {
      adicionarPapelTimbrado();

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);

      const titulo = continuacao ? "PROFESSORES — CONTINUAÇÃO" : "PROFESSORES";

      doc.text(titulo, larguraPagina / 2, 43, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(local, larguraPagina / 2, 49, {
        align: "center",
      });

      y = 55;

      desenharCabecalhoProfessores();
    }

    function novaPaginaProfessores() {
      doc.addPage("a4", "landscape");
      iniciarPaginaProfessores(true);
    }

    function calcularAlturaLinhaProfessor(textos) {
      const larguras = [35, 27, 27, 70, 40, 42, 32];

      let maiorQuantidadeLinhas = 1;

      textos.forEach((texto, indice) => {
        const linhas = doc.splitTextToSize(
          String(texto || "-"),
          larguras[indice] - 4,
        );

        maiorQuantidadeLinhas = Math.max(maiorQuantidadeLinhas, linhas.length);
      });

      return Math.max(9, maiorQuantidadeLinhas * 4 + 4);
    }

    function desenharTextoCelulaProfessor({
      texto,
      x,
      yCelula,
      largura,
      altura,
      cor,
      negrito = false,
      centralizarVertical = true,
    }) {
      doc.setFillColor(...cor);
      doc.setDrawColor(110, 110, 110);
      doc.setLineWidth(0.2);

      doc.rect(x, yCelula, largura, altura, "FD");

      doc.setTextColor(25, 25, 25);

      doc.setFont("helvetica", negrito ? "bold" : "normal");

      doc.setFontSize(7.5);

      const linhasTexto = doc.splitTextToSize(
        String(texto ?? "-"),
        largura - 4,
      );

      const alturaTexto = linhasTexto.length * 3.2;

      const posicaoY = centralizarVertical
        ? yCelula + (altura - alturaTexto) / 2 + 2.8
        : yCelula + 4.5;

      doc.text(linhasTexto, x + 2, posicaoY);
    }

    function obterCorCelulasMescladas(professores) {
      const professoresValidos = professores.filter(Boolean);

      if (!professoresValidos.length) {
        return [245, 245, 245];
      }

      const tiposVinculo = new Set(
        professoresValidos.map((professor) => obterTipoVinculo(professor)),
      );

      /*
       * Se todos possuírem o mesmo vínculo,
       * usa a cor correspondente.
       */
      if (tiposVinculo.size === 1) {
        return obterCorVinculoPDF(professoresValidos[0]);
      }

      /*
       * Se houver vínculos diferentes,
       * utiliza uma cor neutra nas colunas mescladas.
       */
      return [238, 233, 245];
    }

    function desenharGrupoProfessoresTurma(turma, professores) {
      const larguras = [35, 27, 27, 70, 40, 42, 32];

      const professoresExibir = professores.length ? professores : [null];

      /*
       * Calcula a altura individual necessária
       * para cada professor.
       */
      const alturasLinhas = professoresExibir.map((professor) => {
        const textosProfessor = [
          "",
          "",
          "",
          professor?.nome || "-",
          professor?.habilitacao || "-",
          professor ? formatarCPF(professor.cpf) : "-",
          professor ? obterNomeVinculo(professor) : "-",
        ];

        return calcularAlturaLinhaProfessor(textosProfessor);
      });

      let alturaTotal = alturasLinhas.reduce(
        (total, altura) => total + altura,
        0,
      );

      /*
       * Garante espaço suficiente para os textos
       * das células mescladas.
       */
      const textosMesclados = [
        turma.nome || turma.turma || "-",
        turma.turno || "-",
        turma.quantidadeAlunos ?? turma.qtdAlunos ?? turma.totalAlunos ?? "-",
      ];

      let alturaMinimaMescladas = 9;

      textosMesclados.forEach((texto, indice) => {
        const linhas = doc.splitTextToSize(
          String(texto ?? "-"),
          larguras[indice] - 4,
        );

        alturaMinimaMescladas = Math.max(
          alturaMinimaMescladas,
          linhas.length * 4 + 4,
        );
      });

      if (alturaTotal < alturaMinimaMescladas) {
        const diferenca = alturaMinimaMescladas - alturaTotal;

        alturasLinhas[alturasLinhas.length - 1] += diferenca;

        alturaTotal = alturaMinimaMescladas;
      }

      /*
       * Não divide uma mesma turma entre páginas
       * quando o grupo inteiro ainda cabe em uma página.
       */
      if (y + alturaTotal > limiteInferior) {
        novaPaginaProfessores();
      }

      const yInicialGrupo = y;

      const corMesclada = obterCorCelulasMescladas(professoresExibir);

      /*
       * TURMA
       */
      desenharTextoCelulaProfessor({
        texto: textosMesclados[0],
        x: margemEsquerda,
        yCelula: yInicialGrupo,
        largura: larguras[0],
        altura: alturaTotal,
        cor: corMesclada,
        negrito: true,
      });

      /*
       * TURNO
       */
      desenharTextoCelulaProfessor({
        texto: textosMesclados[1],
        x: margemEsquerda + larguras[0],
        yCelula: yInicialGrupo,
        largura: larguras[1],
        altura: alturaTotal,
        cor: corMesclada,
      });

      /*
       * QUANTIDADE DE ALUNOS
       */
      desenharTextoCelulaProfessor({
        texto: textosMesclados[2],
        x: margemEsquerda + larguras[0] + larguras[1],
        yCelula: yInicialGrupo,
        largura: larguras[2],
        altura: alturaTotal,
        cor: corMesclada,
      });

      /*
       * PROFESSORES
       */
      let yProfessor = yInicialGrupo;

      professoresExibir.forEach((professor, indiceProfessor) => {
        const alturaAtual = alturasLinhas[indiceProfessor];

        const corProfessor = professor
          ? obterCorVinculoPDF(professor)
          : [245, 245, 245];

        const textosProfessor = [
          professor?.nome || "-",
          professor?.habilitacao || "-",
          professor ? formatarCPF(professor.cpf) : "-",
          professor ? obterNomeVinculo(professor) : "-",
        ];

        let x = margemEsquerda + larguras[0] + larguras[1] + larguras[2];

        textosProfessor.forEach((texto, indice) => {
          const indiceColuna = indice + 3;

          desenharTextoCelulaProfessor({
            texto,
            x,
            yCelula: yProfessor,
            largura: larguras[indiceColuna],
            altura: alturaAtual,
            cor: corProfessor,
            negrito: indice === 0,
          });

          x += larguras[indiceColuna];
        });

        yProfessor += alturaAtual;
      });

      y = yInicialGrupo + alturaTotal;
    }

    function desenharMensagemSemTurmas() {
      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(130, 130, 130);
      doc.setLineWidth(0.2);

      doc.rect(margemEsquerda, y, limiteDireito - margemEsquerda, 12, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);

      doc.text(
        "Nenhuma turma foi vinculada a esta escola.",
        larguraPagina / 2,
        y + 7,
        {
          align: "center",
        },
      );

      y += 12;
    }

    function desenharSecaoProfessores() {
      const localId = selectLocal.value;

      const turmasDoLocal = obterTurmasDoLocal(localId);

      doc.addPage("a4", "landscape");

      iniciarPaginaProfessores(false);

      if (!turmasDoLocal.length) {
        desenharMensagemSemTurmas();
        return;
      }

      turmasDoLocal.forEach((turma) => {
        const professoresDaTurma = obterProfessoresDaTurma(turma);

        desenharGrupoProfessoresTurma(turma, professoresDaTurma);
      });
    }

    function desenharCabecalhoAuxiliaresSala() {
      const colunas = [
        {
          titulo: "NOME COMPLETO",
          largura: 85,
        },
        {
          titulo: "CPF",
          largura: 45,
        },
        {
          titulo: "VÍNCULO",
          largura: 38,
        },
        {
          titulo: "HABILITAÇÃO",
          largura: 48,
        },
        {
          titulo: "ALUNO(S) ATENDIDO(S) / TURMA",
          largura: 57,
        },
      ];

      let x = margemEsquerda;

      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.25);

      colunas.forEach((coluna) => {
        doc.setFillColor(222, 211, 235);

        doc.rect(x, y, coluna.largura, 14, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(25, 25, 25);

        const linhasTitulo = doc.splitTextToSize(
          coluna.titulo,
          coluna.largura - 3,
        );

        const alturaTexto = linhasTitulo.length * 3.2;

        doc.text(
          linhasTitulo,
          x + coluna.largura / 2,
          y + 7 - alturaTexto / 2 + 2.5,
          {
            align: "center",
          },
        );

        x += coluna.largura;
      });

      y += 14;
    }

    function iniciarPaginaAuxiliaresSala(continuacao = false) {
      adicionarPapelTimbrado();

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);

      const titulo = continuacao
        ? "AUXILIARES DE SALA — CONTINUAÇÃO"
        : "AUXILIARES DE SALA";

      doc.text(titulo, larguraPagina / 2, 43, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(local, larguraPagina / 2, 49, {
        align: "center",
      });

      y = 55;

      desenharCabecalhoAuxiliaresSala();
    }

    function novaPaginaAuxiliaresSala() {
      doc.addPage("a4", "landscape");

      iniciarPaginaAuxiliaresSala(true);
    }

    function obterDadosAuxiliarSala(servidor) {
      return {
        nome: servidor?.nome || "-",
        cpf: formatarCPF(servidor?.cpf),
        vinculo: obterNomeVinculo(servidor),
        habilitacao: servidor?.habilitacao || "-",
        atendimento:
          servidor?.alunosAtendidos ||
          servidor?.alunoAtendido ||
          servidor?.turma ||
          "-",
      };
    }

    function calcularAlturaLinhaAuxiliarSala(dados) {
      const larguras = [85, 45, 38, 48, 57];

      const textos = [
        dados.nome,
        dados.cpf,
        dados.vinculo,
        dados.habilitacao,
        dados.atendimento,
      ];

      let maiorQuantidadeLinhas = 1;

      textos.forEach((texto, indice) => {
        const linhas = doc.splitTextToSize(
          String(texto || "-"),
          larguras[indice] - 4,
        );

        maiorQuantidadeLinhas = Math.max(maiorQuantidadeLinhas, linhas.length);
      });

      return Math.max(9, maiorQuantidadeLinhas * 4 + 4);
    }

    function desenharLinhaAuxiliarSala(servidor) {
      const dados = obterDadosAuxiliarSala(servidor);

      const larguras = [85, 45, 38, 48, 57];

      const textos = [
        dados.nome,
        dados.cpf,
        dados.vinculo,
        dados.habilitacao,
        dados.atendimento,
      ];

      const alturaAtual = calcularAlturaLinhaAuxiliarSala(dados);

      if (y + alturaAtual > limiteInferior) {
        novaPaginaAuxiliaresSala();
      }

      const cor = obterCorVinculoPDF(servidor);

      let x = margemEsquerda;

      textos.forEach((texto, indice) => {
        doc.setFillColor(...cor);
        doc.setDrawColor(110, 110, 110);
        doc.setLineWidth(0.2);

        doc.rect(x, y, larguras[indice], alturaAtual, "FD");

        doc.setTextColor(25, 25, 25);
        doc.setFont("helvetica", indice === 0 ? "bold" : "normal");
        doc.setFontSize(7.5);

        const linhasTexto = doc.splitTextToSize(
          String(texto || "-"),
          larguras[indice] - 4,
        );

        doc.text(linhasTexto, x + 2, y + 4.5);

        x += larguras[indice];
      });

      y += alturaAtual;
    }

    function desenharMensagemSemAuxiliaresSala() {
      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(130, 130, 130);

      doc.rect(margemEsquerda, y, limiteDireito - margemEsquerda, 12, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);

      doc.text(
        "Nenhum auxiliar de sala ativo foi encontrado nesta escola.",
        larguraPagina / 2,
        y + 7,
        {
          align: "center",
        },
      );

      y += 12;
    }

    function desenharSecaoAuxiliaresSala() {
      const auxiliaresSala = lista.filter(servidorEhAuxiliarSala).sort((a, b) =>
        String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
          sensitivity: "base",
        }),
      );

      doc.addPage("a4", "landscape");

      iniciarPaginaAuxiliaresSala(false);

      if (!auxiliaresSala.length) {
        desenharMensagemSemAuxiliaresSala();
        return;
      }

      auxiliaresSala.forEach((servidor) => {
        desenharLinhaAuxiliarSala(servidor);
      });
    }

    function adicionarRodapes() {
      const totalPaginas = doc.getNumberOfPages();

      for (let pagina = 1; pagina <= totalPaginas; pagina++) {
        doc.setPage(pagina);

        const yRodape = 201;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(30, 30, 30);

        let x = margemEsquerda;

        doc.setFillColor(207, 235, 180);
        doc.rect(x, yRodape - 3.5, 5, 5, "F");
        doc.text("Efetivo", x + 7, yRodape);

        x += 32;

        doc.setFillColor(255, 239, 164);
        doc.rect(x, yRodape - 3.5, 5, 5, "F");
        doc.text("Contrato", x + 7, yRodape);

        x += 36;

        doc.setFillColor(224, 207, 242);
        doc.rect(x, yRodape - 3.5, 5, 5, "F");
        doc.text("Bolsa", x + 7, yRodape);

        doc.text(
          `Página ${pagina} de ${totalPaginas}`,
          limiteDireito,
          yRodape,
          {
            align: "right",
          },
        );
      }
    }

    // Primeira seção
    desenharSecaoEquipe();

    // Segunda seção
    desenharSecaoProfessores();

    // Terceira seção
    desenharSecaoAuxiliaresSala();

    // Quarta seção: funcionários de apoio
    doc.addPage("a4", "landscape");

    iniciarPagina(false);

    if (!funcionariosApoio.length) {
      desenharMensagemSemRegistros();
    } else {
      desenharGrupoVinculo("efetivo");
      desenharGrupoVinculo("contrato");
      desenharGrupoVinculo("bolsa");
      desenharGrupoVinculo("outro");
    }

    // Quinta seção
    desenharSecaoCuidadores();

    adicionarRodapes();

    window.abrirOuBaixarPDF(doc, `Quadro Distributivo - ${local}.pdf`);
  };

  img.onerror = () => {
    mostrarNotificacao("Não foi possível carregar o papel timbrado.", "erro");
  };
}
