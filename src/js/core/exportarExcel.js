const COR_CABECALHO = "FF9B59B6";
const COR_LINHA_ALTERNADA = "FFF7F0FA";
const COR_BORDA = "FFD9C9E2";
const COR_TEXTO = "FF363949";

function baixarArquivo(buffer, nomeArquivo) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportarTabelaExcel({
  nomeArquivo,
  nomePlanilha,
  nomeTabela,
  colunas,
  linhas,
}) {
  if (!window.ExcelJS) {
    throw new Error("A biblioteca de exportação do Excel não foi carregada.");
  }

  const workbook = new window.ExcelJS.Workbook();
  workbook.creator = "SEE Carpina";
  workbook.created = new Date();

  const planilha = workbook.addWorksheet(nomePlanilha, {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { defaultRowHeight: 21 },
  });

  planilha.columns = colunas.map((coluna) => ({
    key: coluna.chave,
    width: coluna.largura || 18,
    style: coluna.formato ? { numFmt: coluna.formato } : {},
  }));

  planilha.addTable({
    name: nomeTabela,
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      showFirstColumn: false,
      showLastColumn: false,
      showRowStripes: false,
      showColumnStripes: false,
    },
    columns: colunas.map((coluna) => ({
      name: coluna.titulo,
      filterButton: true,
    })),
    rows: linhas.map((linha) =>
      colunas.map((coluna) => linha[coluna.chave] ?? ""),
    ),
  });

  const cabecalho = planilha.getRow(1);
  cabecalho.height = 28;
  cabecalho.eachCell((celula) => {
    celula.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
    };
    celula.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COR_CABECALHO },
    };
    celula.alignment = {
      vertical: "middle",
      horizontal: "center",
    };
  });

  planilha.eachRow((linha, numeroLinha) => {
    if (numeroLinha > 1 && numeroLinha % 2 === 0) {
      linha.eachCell((celula) => {
        celula.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COR_LINHA_ALTERNADA },
        };
      });
    }

    linha.eachCell((celula) => {
      celula.border = {
        top: { style: "thin", color: { argb: COR_BORDA } },
        left: { style: "thin", color: { argb: COR_BORDA } },
        bottom: { style: "thin", color: { argb: COR_BORDA } },
        right: { style: "thin", color: { argb: COR_BORDA } },
      };

      if (numeroLinha > 1) {
        celula.font = { color: { argb: COR_TEXTO }, size: 10 };
        celula.alignment = {
          vertical: "middle",
          horizontal: "left",
        };
      }
    });
  });

  planilha.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: colunas.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  baixarArquivo(buffer, nomeArquivo);
}
