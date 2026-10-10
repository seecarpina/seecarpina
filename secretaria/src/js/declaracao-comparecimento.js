import { rtdb } from "./firebaseConfig.js";

import {
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const form = document.getElementById("formDeclaracao");
const nome = document.getElementById("nome");
const tratamento = document.getElementById("tratamento");
const cpf = document.getElementById("cpf");
const funcao = document.getElementById("funcao");
const assunto = document.getElementById("assunto");
const dataAtendimento = document.getElementById("dataAtendimento");
const horaInicio = document.getElementById("horaInicio");
const horaFim = document.getElementById("horaFim");
const autocompleteServidor = document.getElementById("autocompleteServidor");
const previaTexto = document.getElementById("previaTexto");
const btnGerarDeclaracao = document.getElementById("btnGerarDeclaracao");
const btnLimpar = document.getElementById("btnLimpar");

let servidores = [];
let servidorSelecionadoId = null;

const hoje = new Date();
const hojeLocal = new Date(
  hoje.getTime() - hoje.getTimezoneOffset() * 60000,
)
  .toISOString()
  .slice(0, 10);

dataAtendimento.value = hojeLocal;

function notificar(mensagem, tipo = "sucesso") {
  if (typeof window.mostrarNotificacao === "function") {
    window.mostrarNotificacao(mensagem, tipo);
    return;
  }

  console[tipo === "erro" ? "error" : "log"](mensagem);
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escaparHtml(valor) {
  const elemento = document.createElement("div");
  elemento.textContent = String(valor || "");
  return elemento.innerHTML;
}

function formatarCPF(valor) {
  return String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatarDataExtenso(valor) {
  if (!valor) return "___ de __________ de ____";

  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(data);
}

function formatarHorario(valor) {
  if (!valor) return "--h--";

  const [horas, minutos] = valor.split(":");
  const horaNumero = String(Number(horas));

  return minutos === "00"
    ? `${horaNumero}h`
    : `${horaNumero}h${minutos}`;
}

function obterDadosFormulario() {
  return {
    nome: nome.value.trim(),
    tratamento: tratamento.value,
    cpf: formatarCPF(cpf.value),
    funcao: funcao.value.trim(),
    assunto: assunto.value.trim().replace(/[.\s]+$/, ""),
    data: dataAtendimento.value,
    horaInicio: horaInicio.value,
    horaFim: horaFim.value,
  };
}

function montarTextoDeclaracao(dados) {
  const pessoa = dados.nome || "NOME DA PESSOA";
  const cpfPessoa = dados.cpf || "000.000.000-00";
  const cargo = dados.funcao || "função não informada";
  const motivo = dados.assunto || "assunto administrativo";
  const data = formatarDataExtenso(dados.data);
  const inicio = formatarHorario(dados.horaInicio);
  const fim = formatarHorario(dados.horaFim);

  const feminino = dados.tratamento === "sra.";
  const artigo = feminino ? "a" : "o";
  const inscricao = feminino ? "inscrita" : "inscrito";

  return (
    `Declaro, para os devidos fins, que ${artigo} ${dados.tratamento} ${pessoa}, ` +
    `${inscricao} no CPF sob o nº ${cpfPessoa}, exercendo a função de ${cargo}, ` +
    "compareceu ao Setor de Recursos Humanos da Secretaria Municipal de " +
    `Educação e Esportes para tratar de assuntos relacionados à ${motivo}.\n\n` +
    `O atendimento ocorreu no dia ${data}, das ${inicio} às ${fim}.`
  );
}

function atualizarPrevia() {
  previaTexto.textContent = montarTextoDeclaracao(obterDadosFormulario());
}

function fecharSugestoes() {
  autocompleteServidor.classList.remove("ativo");
  autocompleteServidor.innerHTML = "";
}

function obterTratamentoServidor(servidor) {
  const sexo = normalizarTexto(servidor.sexo);

  if (
    sexo === "feminino" ||
    sexo === "f" ||
    sexo === "mulher"
  ) {
    return "sra.";
  }

  return "sr.";
}

function selecionarServidor(servidor) {
  servidorSelecionadoId = servidor._key;
  nome.value = servidor.nome || "";
  cpf.value = formatarCPF(servidor.cpf || "");
  funcao.value = servidor.cargo || servidor.funcao || "";
  tratamento.value = obterTratamentoServidor(servidor);
  fecharSugestoes();
  atualizarPrevia();
}

function mostrarSugestoes() {
  const termo = normalizarTexto(nome.value);
  servidorSelecionadoId = null;

  if (termo.length < 2) {
    fecharSugestoes();
    return;
  }

  const encontrados = servidores
    .filter((servidor) => {
      const situacao = normalizarTexto(servidor.situacao);
      const ativo = situacao !== "inativo" && servidor.ativo !== false;
      const busca = normalizarTexto(
        `${servidor.nome || ""} ${servidor.cpf || ""} ${servidor.cargo || ""}`,
      );

      return ativo && busca.includes(termo);
    })
    .sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"),
    )
    .slice(0, 8);

  autocompleteServidor.innerHTML = "";

  if (!encontrados.length) {
    fecharSugestoes();
    return;
  }

  encontrados.forEach((servidor) => {
    const item = document.createElement("li");
    const botao = document.createElement("button");

    botao.type = "button";
    botao.setAttribute("role", "option");
    botao.innerHTML = `
      <strong>${escaparHtml(servidor.nome || "Sem nome")}</strong>
      <span>
        ${escaparHtml(formatarCPF(servidor.cpf || ""))}
        ${servidor.cargo ? ` • ${escaparHtml(servidor.cargo)}` : ""}
      </span>
    `;
    botao.addEventListener("click", () => selecionarServidor(servidor));

    item.appendChild(botao);
    autocompleteServidor.appendChild(item);
  });

  autocompleteServidor.classList.add("ativo");
}

function validarFormulario(dados) {
  const cpfNumeros = dados.cpf.replace(/\D/g, "");

  if (cpfNumeros.length !== 11) {
    notificar("Informe um CPF com 11 dígitos.", "erro");
    cpf.focus();
    return false;
  }

  if (dados.horaFim <= dados.horaInicio) {
    notificar(
      "O horário final deve ser posterior ao horário inicial.",
      "erro",
    );
    horaFim.focus();
    return false;
  }

  return true;
}

function gerarPDF(dados) {
  if (!window.jspdf?.jsPDF) {
    notificar("Não foi possível carregar o gerador de PDF.", "erro");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("portrait", "mm", "a4");
  const larguraPagina = 210;
  const alturaPagina = 297;
  const margem = 25;
  const larguraTexto = larguraPagina - margem * 2;
  let finalizado = false;

  function desenharDocumento(comTimbrado) {
    if (finalizado) return;
    finalizado = true;

    if (comTimbrado) {
      doc.addImage(
        imagemTimbrado,
        "PNG",
        0,
        0,
        larguraPagina,
        alturaPagina,
      );
    }

    doc.setTextColor(25, 25, 25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("DECLARAÇÃO", larguraPagina / 2, 55, { align: "center" });
    doc.text("DE COMPARECIMENTO", larguraPagina / 2, 62, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    doc.setLineHeightFactor(1.7);

    const feminino = dados.tratamento === "sra.";
    const artigo = feminino ? "a" : "o";
    const inscricao = feminino ? "inscrita" : "inscrito";

    const primeiroParagrafo =
      `Declaro, para os devidos fins, que ${artigo} ${dados.tratamento} ` +
      `${dados.nome.toUpperCase()}, ${inscricao} no CPF sob o nº ${dados.cpf}, ` +
      `exercendo a função de ${dados.funcao}, compareceu ao Setor de Recursos ` +
      "Humanos da Secretaria Municipal de Educação e Esportes para tratar de " +
      `assuntos relacionados à ${dados.assunto}.`;

    const linhasPrimeiro = doc.splitTextToSize(primeiroParagrafo, larguraTexto);
    doc.text(linhasPrimeiro, margem, 88, {
      align: "justify",
      maxWidth: larguraTexto,
    });

    const ySegundo = 88 + linhasPrimeiro.length * 7.3 + 8;
    const segundoParagrafo =
      `O atendimento ocorreu no dia ${formatarDataExtenso(dados.data)}, ` +
      `das ${formatarHorario(dados.horaInicio)} às ${formatarHorario(dados.horaFim)}.`;

    const linhasSegundo = doc.splitTextToSize(segundoParagrafo, larguraTexto);
    doc.text(linhasSegundo, margem, ySegundo, {
      align: "justify",
      maxWidth: larguraTexto,
    });

    const yTerceiro = ySegundo + linhasSegundo.length * 7.3 + 8;
    const terceiroParagrafo =
      "Por ser expressão da verdade, firmo a presente declaração para os fins cabíveis.";

    doc.text(
      doc.splitTextToSize(terceiroParagrafo, larguraTexto),
      margem,
      yTerceiro,
      {
        align: "justify",
        maxWidth: larguraTexto,
      },
    );

    const dataEmissao = formatarDataExtenso(dados.data);
    doc.text(
      `Carpina, ${dataEmissao}.`,
      larguraPagina / 2,
      205,
      { align: "center" },
    );

    doc.setDrawColor(60, 60, 60);
    doc.line(55, 233, 155, 233);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const responsavel =
      String(window.dadosUsuario?.nome || "RESPONSÁVEL PELA EMISSÃO")
        .trim()
        .toUpperCase();

    doc.text(responsavel, larguraPagina / 2, 239, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      "Secretaria Municipal de Educação e Esportes",
      larguraPagina / 2,
      244,
      { align: "center" },
    );

    const nomeArquivo = dados.nome
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    window.abrirOuBaixarPDF(
      doc,
      `Declaração de Comparecimento - ${nomeArquivo}.pdf`,
    );
  }

  const imagemTimbrado = new Image();
  imagemTimbrado.onload = () => desenharDocumento(true);
  imagemTimbrado.onerror = () => desenharDocumento(false);
  imagemTimbrado.src = "./src/images/papel-timbrado.png";
}

onValue(
  ref(rtdb, "servidores/registros"),
  (snapshot) => {
    servidores = snapshot.exists()
      ? Object.entries(snapshot.val()).map(([chave, servidor]) => ({
          _key: chave,
          ...servidor,
        }))
      : [];
  },
  (erro) => {
    console.error("Erro ao carregar servidores:", erro);
    notificar(
      "Não foi possível carregar a lista de servidores. O preenchimento manual continua disponível.",
      "erro",
    );
  },
);

nome.addEventListener("input", () => {
  mostrarSugestoes();
  atualizarPrevia();
});

cpf.addEventListener("input", () => {
  cpf.value = formatarCPF(cpf.value);
  atualizarPrevia();
});

[
  tratamento,
  funcao,
  assunto,
  dataAtendimento,
  horaInicio,
  horaFim,
].forEach((campo) => {
  campo.addEventListener("input", atualizarPrevia);
  campo.addEventListener("change", atualizarPrevia);
});

document.addEventListener("click", (evento) => {
  if (
    evento.target !== nome &&
    !autocompleteServidor.contains(evento.target)
  ) {
    fecharSugestoes();
  }
});

btnLimpar.addEventListener("click", () => {
  form.reset();
  servidorSelecionadoId = null;
  dataAtendimento.value = hojeLocal;
  assunto.value = "alteração de sua lotação";
  fecharSugestoes();
  nome.focus();
  atualizarPrevia();
});

form.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const dados = obterDadosFormulario();

  if (!validarFormulario(dados)) return;

  btnGerarDeclaracao.disabled = true;

  try {
    gerarPDF(dados);
  } catch (erro) {
    console.error("Erro ao gerar declaração:", erro);
    notificar("Não foi possível gerar a declaração.", "erro");
  } finally {
    btnGerarDeclaracao.disabled = false;
  }
});

atualizarPrevia();
