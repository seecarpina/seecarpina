function abrirOuBaixarPDF(documento, nomeArquivo) {
  // Baixar permite imprimir ou compartilhar o pedido também no celular.
  documento.save(nomeArquivo);
}

function obterDadosStatus(status) {
  const opcoes = {
    RECEBIDA: {
      nome: "Recebida",
      classe: "recebida",
    },

    EM_ANALISE: {
      nome: "Em análise",
      classe: "em-analise",
    },

    APROVADA: {
      nome: "Aprovada",
      classe: "aprovada",
    },

    EM_ATENDIMENTO: {
      nome: "Em atendimento",
      classe: "em-atendimento",
    },

    AGUARDANDO_CONFIRMACAO: {
      nome: "Aguardando confirmação",
      classe: "aguardando-confirmacao",
    },

    CONCLUIDA: {
      nome: "Concluída",
      classe: "concluida",
    },

    ATENDIDA_PARCIALMENTE: {
      nome: "Atendida parcialmente",
      classe: "parcial",
    },

    INDEFERIDA: {
      nome: "Indeferida",
      classe: "indeferida",
    },

    CANCELADA: {
      nome: "Cancelada",
      classe: "cancelada",
    },
  };

  return (
    opcoes[status] || {
      nome: status || "Sem situação",
      classe: "recebida",
    }
  );
}

function obterNomeModulo(modulo) {
  const nomes = {
    INSUMOS: "Água, gás e caminhão-pipa",
    MATERIAIS_EXPEDIENTE: "Material de expediente",
    MATERIAIS_LIMPEZA: "Materiais de limpeza e higiene",
    MANUTENCAO: "Chamados de manutenção",
  };

  return nomes[modulo] || modulo || "Solicitação";
}

function formatarUnidadeRomaneio(unidade, quantidade) {
  if (Number(quantidade) === 1) return unidade || "Unidade";
  const plurais = {
    Unidade: "Unidades",
    Caixa: "Caixas",
    Resma: "Resmas",
    Pacote: "Pacotes",
    Fardo: "Fardos",
    Kit: "Kits",
    Kg: "Kg",
    Quilograma: "Quilogramas",
    Grama: "Gramas",
    Litro: "Litros",
    Mililitro: "Mililitros",
    Saco: "Sacos",
    Lata: "Latas",
    Garrafa: "Garrafas",
    Pote: "Potes",
    Frasco: "Frascos",
    "Mão (50 unidades)": "Mãos (50 unidades)",
  };
  return plurais[unidade] || unidade || "Unidades";
}

export function obterListaPedido(valor) {
  if (Array.isArray(valor)) return valor.filter(Boolean);
  return valor && typeof valor === "object" ? Object.values(valor) : [];
}

function formatarDataPedido(valor, incluirHora = false) {
  if (!valor) return "-";

  if (!incluirHora && /^\d{4}-\d{2}-\d{2}$/.test(String(valor))) {
    const [ano, mes, dia] = String(valor).split("-");
    return `${dia}/${mes}/${ano}`;
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return String(valor);

  if (incluirHora) {
    return data.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  return data.toLocaleDateString("pt-BR");
}

export function gerarPDFPedidoSolicitacao(solicitacao, {
  notificar = () => {},
  imagemUrl = new URL("../images/papel-timbrado.png", import.meta.url).href,
  abrirPDF = abrirOuBaixarPDF,
} = {}) {
  const jsPDF = window.jspdf?.jsPDF;
  if (!solicitacao) {
    notificar("Solicitação não localizada.", "erro");
    return;
  }

  if (!jsPDF) {
    notificar("O gerador de PDF não foi carregado.", "erro");
    return;
  }

  const documento = new jsPDF();
  const imagem = new Image();
  

  imagem.onload = () => {
    const larguraPagina = documento.internal.pageSize.getWidth();
    const alturaPagina = documento.internal.pageSize.getHeight();
    const margem = 20;
    const larguraTexto = larguraPagina - margem * 2;
    const limiteInferior = alturaPagina - 24;
    let pagina = 1;
    let y = 0;

    function adicionarFundoPagina() {
      documento.addImage(imagem, "PNG", 0, 0, larguraPagina, alturaPagina);

      documento.setFont("helvetica", "normal");
      documento.setFontSize(8);
      documento.setTextColor(90);
      documento.text(
        `Página ${pagina}`,
        larguraPagina - margem,
        alturaPagina - 10,
        { align: "right" },
      );
      documento.setTextColor(0);
    }

    function novaPagina() {
      documento.addPage();
      pagina++;
      adicionarFundoPagina();

      documento.setFont("helvetica", "bold");
      documento.setFontSize(11);
      documento.text("CONTINUAÇÃO DO PEDIDO", margem, 48);
      y = 58;
    }

    function garantirEspaco(alturaNecessaria) {
      if (y + alturaNecessaria > limiteInferior) novaPagina();
    }

    function adicionarTituloSecao(titulo) {
      garantirEspaco(14);
      y += 4;
      documento.setFillColor(238, 242, 247);
      documento.rect(margem, y - 5, larguraTexto, 10, "F");
      documento.setFont("helvetica", "bold");
      documento.setFontSize(10);
      documento.text(titulo, margem + 4, y + 1.5);
      y += 10;
    }

    function adicionarCampo(rotulo, valor) {
      if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ""
      ) {
        return;
      }

      documento.setFontSize(10);
      documento.setFont("helvetica", "bold");
      const prefixo = `${rotulo}: `;
      const larguraPrefixo = documento.getTextWidth(prefixo);
      const linhas = documento.splitTextToSize(
        String(valor),
        larguraTexto - larguraPrefixo,
      );

      garantirEspaco(Math.max(7, linhas.length * 5.5));
      documento.text(prefixo, margem, y);
      documento.setFont("helvetica", "normal");
      documento.text(linhas, margem + larguraPrefixo, y);
      y += Math.max(7, linhas.length * 5.5);
    }

    function adicionarParagrafo(texto, recuo = 0) {
      if (!texto) return;

      documento.setFont("helvetica", "normal");
      documento.setFontSize(10);
      const linhas = documento.splitTextToSize(
        String(texto),
        larguraTexto - recuo,
      );

      garantirEspaco(linhas.length * 5.5 + 2);
      documento.text(linhas, margem + recuo, y);
      y += linhas.length * 5.5 + 2;
    }

    adicionarFundoPagina();

    documento.setFont("helvetica", "bold");
    documento.setFontSize(14);
    documento.text("PEDIDO DA UNIDADE ESCOLAR", larguraPagina / 2, 48, {
      align: "center",
    });

    documento.setFontSize(11);
    documento.text(
      `PROTOCOLO: ${solicitacao.protocolo || "-"}`,
      larguraPagina / 2,
      57,
      { align: "center" },
    );

    y = 70;

    adicionarTituloSecao("IDENTIFICAÇÃO");
    adicionarCampo("Escola", solicitacao.escolaNome || "-");
    adicionarCampo("Solicitante", solicitacao.solicitanteNome || "-");
    adicionarCampo("E-mail", solicitacao.solicitanteEmail || "");
    adicionarCampo(
      "Data do pedido",
      formatarDataPedido(solicitacao.criadoEm, true),
    );
    adicionarCampo("Módulo", obterNomeModulo(solicitacao.modulo));
    adicionarCampo("Situação", obterDadosStatus(solicitacao.status).nome);
    adicionarCampo("Prioridade", solicitacao.prioridade || "");
    adicionarCampo(
      "Data da necessidade",
      solicitacao.dataNecessidade
        ? formatarDataPedido(solicitacao.dataNecessidade)
        : "",
    );

    adicionarTituloSecao("DADOS DO PEDIDO");

    const itens = obterListaPedido(solicitacao.itens);

    if (itens.length) {
      itens.forEach((item, indice) => {
        const quantidade = Number(
          item.quantidadeSolicitada ?? item.quantidade ?? 0,
        );

        adicionarParagrafo(
          `${indice + 1}. ${item.nome || item.tipoNome || "Item"} — ` +
            `${quantidade} ${item.unidade || "Unidade"}`,
          2,
        );
      });

      const quantidadeTotal = itens.reduce(
        (total, item) =>
          total + Number(item.quantidadeSolicitada ?? item.quantidade ?? 0),
        0,
      );

      adicionarCampo("Quantidade total solicitada", quantidadeTotal);
    } else {
      adicionarCampo(
        "Tipo",
        solicitacao.tipoNome || solicitacao.tipo || solicitacao.categoria || "",
      );
      adicionarCampo(
        "Quantidade",
        solicitacao.quantidade
          ? `${solicitacao.quantidade} ${solicitacao.unidade || ""}`
          : "",
      );
    }

    adicionarCampo("Categoria", solicitacao.categoria || "");
    adicionarCampo("Ambiente", solicitacao.ambiente || "");
    adicionarCampo(
      "Descrição do problema",
      solicitacao.descricaoProblema || "",
    );
    adicionarCampo("Justificativa", solicitacao.justificativa || "");
    adicionarCampo("Observações", solicitacao.observacoes || "");

    const entrega = solicitacao.confirmacaoEntrega;

    if (entrega?.tipoAtendimento) {
      adicionarTituloSecao("ATENDIMENTO / ENTREGA");
      adicionarCampo(
        "Resultado",
        entrega.tipoAtendimento === "TOTAL"
          ? "Entrega total"
          : "Entrega parcial",
      );
      adicionarCampo("Informado por", entrega.informadoPorNome || "");
      adicionarCampo("Data", formatarDataPedido(entrega.informadoEm, true));
      adicionarCampo("Observação", entrega.observacao || "");
      adicionarCampo(
        "Confirmação da escola",
        entrega.pendente === false
          ? `Confirmada por ${entrega.confirmadoPorNome || "gestor"} em ${formatarDataPedido(entrega.confirmadoEm, true)}`
          : "Pendente",
      );

      const itensEntregues = obterListaPedido(entrega.itensEntregues).filter(
        (item) => Number(item.quantidadeEntregue || 0) > 0,
      );

      itensEntregues.forEach((item, indice) => {
        adicionarParagrafo(
          `${indice + 1}. ${item.nome || "Material"} — entregue: ` +
            `${item.quantidadeEntregue} de ${item.quantidadeSolicitada} ${item.unidade || "Unidade"}`,
          2,
        );
      });

      const materiaisUtilizados = obterListaPedido(entrega.materiaisUtilizados);

      if (materiaisUtilizados.length) {
        adicionarCampo("Materiais utilizados na manutenção", " ");

        materiaisUtilizados.forEach((item, indice) => {
          adicionarParagrafo(
            `${indice + 1}. ${item.nome || "Material"} — ` +
              `${item.quantidade} ${formatarUnidadeRomaneio(
                item.unidade || "Unidade",
                item.quantidade,
              )}`,
            2,
          );
        });
      }

      if (entrega.romaneioId) {
        adicionarCampo("Romaneio vinculado", entrega.romaneioId);
      }
    }

    const historico = obterListaPedido(solicitacao.historico).sort(
      (a, b) => Number(a.criadoEm || 0) - Number(b.criadoEm || 0),
    );

    if (historico.length) {
      adicionarTituloSecao("HISTÓRICO");

      historico.forEach((registro) => {
        const data = formatarDataPedido(registro.criadoEm, true);
        const responsavel =
          registro.responsavelNome || registro.usuarioNome || "Usuário";
        const descricao =
          registro.descricao ||
          `Situação: ${obterDadosStatus(registro.status).nome}`;

        adicionarParagrafo(`${data} — ${responsavel}: ${descricao}`, 2);
      });
    }

    garantirEspaco(45);
    y += 25;
    documento.line(margem + 15, y, margem + 80, y);
    documento.line(
      larguraPagina - margem - 80,
      y,
      larguraPagina - margem - 15,
      y,
    );

    documento.setFont("helvetica", "normal");
    documento.setFontSize(9);
    documento.text("Responsável pela solicitação", margem + 47.5, y + 6, {
      align: "center",
    });
    documento.text(
      "Responsável pelo atendimento",
      larguraPagina - margem - 47.5,
      y + 6,
      { align: "center" },
    );

    const protocoloArquivo = String(solicitacao.protocolo || "pedido").replace(
      /[^\w-]+/g,
      "-",
    );

    abrirPDF(documento, `Pedido - ${protocoloArquivo}.pdf`);
  };

  imagem.onerror = () => {
    console.error("Não foi possível carregar o papel timbrado.");
    notificar("Não foi possível gerar o PDF do pedido.", "erro");
  };
  imagem.src = imagemUrl;
}

