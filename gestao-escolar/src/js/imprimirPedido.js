export function imprimirPedido(solicitacao, notificar = () => {}) {
  if (!solicitacao) {
    notificar("Solicitação não localizada.");
    return;
  }

  const detalhes = document.querySelector(".drawer-detalhes-conteudo");
  if (!detalhes) {
    notificar("Não foi possível carregar o resumo da solicitação.");
    return;
  }

  // Abrir durante o clique evita que a janela seja bloqueada ao carregar imagens.
  const janela = window.open("", "_blank");
  if (!janela) {
    notificar("Permita pop-ups para abrir a impressão do pedido.");
    return;
  }
  janela.opener = null;

  const conteudo = detalhes.cloneNode(true);
  conteudo.querySelectorAll("button, input, select, textarea").forEach(elemento => elemento.remove());
  const doc = janela.document;
  doc.title = `Pedido - ${solicitacao.protocolo || "solicitação"}`;
  const estilo = doc.createElement("style");
  estilo.textContent = `
    @page { size: A4; margin: 42mm 18mm 25mm; }
    body { margin: 0; font: 11pt Arial, sans-serif; color: #172336; }
    .timbrado { position: fixed; inset: 0; width: 210mm; height: 297mm; z-index: -1; }
    h1 { font-size: 16pt; text-align: center; margin: 0 0 8mm; }
    h2 { font-size: 13pt; } h3 { font-size: 11pt; border-bottom: 1px solid #ccd3dd; padding-bottom: 3mm; }
    section { margin-bottom: 6mm; } small { display: block; color: #49566a; font-size: 9pt; margin-bottom: 1mm; }
    strong { display: block; } p { white-space: pre-wrap; overflow-wrap: anywhere; }
    .grade-detalhes { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
    .grade-detalhes > div, .item-material-detalhe, .historico-item { break-inside: avoid; }
    .material-symbols-outlined { display: none; }
    table { width: 100%; border-collapse: collapse; } td, th { border-bottom: 1px solid #ddd; padding: 2mm; text-align: left; }
    .detalhes-status-linha { display: flex; justify-content: space-between; gap: 4mm; margin-bottom: 5mm; }
    @media screen { body { max-width: 174mm; margin: 42mm auto 25mm; } .timbrado { left: 50%; transform: translateX(-50%); } }
    @media print { .timbrado { top: -42mm; left: -18mm; } }
  `;
  doc.head.appendChild(estilo);
  const imagem = doc.createElement("img");
  imagem.className = "timbrado";
  imagem.alt = "";
  const titulo = doc.createElement("h1");
  titulo.textContent = `Pedido da unidade escolar — ${solicitacao.protocolo || "Sem protocolo"}`;
  doc.body.append(imagem, titulo, doc.importNode(conteudo, true));

  imagem.onload = () => {
    janela.focus();
    janela.print();
  };
  imagem.onerror = () => {
    janela.close();
    notificar("Não foi possível carregar o papel timbrado para impressão.");
  };
  imagem.src = new URL("../images/papel-timbrado.png", import.meta.url).href;
}
