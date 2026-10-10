// Comparação do menu ignora a extensão, a barra final e o nome index.
export function normalizarCaminhoPagina(caminho) {
  return caminho
    .replace(/\.html(?=\/?$)/i, "")
    .replace(/\/index\/?$/i, "/")
    .replace(/\/+$/, "") || "/";
}

// Normaliza somente navegação na mesma origem. Links externos ficam intactos.
export function normalizarLinkInterno(href, base) {
  if (!href || href.startsWith("#")) return href;
  try {
    const url = new URL(href, base);
    const origem = new URL(base);
    if (url.origin !== origem.origin || !["http:", "https:"].includes(url.protocol)) return href;
    if (!/\.html$/i.test(url.pathname)) return href;
    url.pathname = url.pathname.replace(/\.html$/i, "");
    return url.pathname + url.search + url.hash;
  } catch {
    return href;
  }
}
