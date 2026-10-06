import { gerarPDFPedidoSolicitacao } from "./pedidoPDF.js";

export function imprimirPedido(solicitacao, notificar = () => {}) {
  if (!solicitacao || !window.jspdf?.jsPDF) {
    gerarPDFPedidoSolicitacao(solicitacao, { notificar });
    return;
  }

  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // Reserva a janela durante o clique, antes de carregar o timbrado.
  const janela = isTouch || isIOS ? null : window.open("", "_blank");
  if (janela) janela.opener = null;

  gerarPDFPedidoSolicitacao(solicitacao, {
    notificar: (mensagem, tipo) => {
      janela?.close();
      notificar(mensagem, tipo);
    },
    abrirPDF: (documento, nomeArquivo) => {
      if (!janela || janela.closed) {
        documento.save(nomeArquivo);
        return;
      }
      const url = URL.createObjectURL(documento.output("blob"));
      janela.location.replace(url);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },
  });
}
