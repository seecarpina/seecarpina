/// ===============================
// CONFIG
// ===============================
const API_KEY = "7c91257f76c94b96b2bdc1b06cbc85f1";
const POR_PAGINA = 4;

let noticias = [];
let paginaAtual = 1;

// ===============================
// ELEMENTOS
// ===============================
const lista = document.getElementById("listaNoticias");
const paginacao = document.getElementById("paginacao");

// ===============================
// FETCH NOTÍCIAS
// ===============================
async function carregarNoticias() {
  try {
    const url = `https://newsapi.org/v2/everything?q="Lei de Diretrizes e Bases da Educação" OR "Base Nacional Comum Curricular" OR "Plano Nacional de Educação" OR "PNE" OR "Política Nacional de Educação"&language=pt&pageSize=50&sortBy=publishedAt&apiKey=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    noticias = data.articles || [];
    renderizar();
  } catch (e) {
    lista.innerHTML = "<p>Erro ao carregar notícias.</p>";
  } finally {
    document.querySelector(".loading").style.display = "none";
  }
}

// ===============================
// RENDER
// ===============================
function renderizar() {
  lista.innerHTML = "";

  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const fim = inicio + POR_PAGINA;
  const pagina = noticias.slice(inicio, fim);

  pagina.forEach((n) => {
    const div = document.createElement("div");
    div.className = "box noticia";

    const imagem =
      n.urlToImage && n.urlToImage.startsWith("http")
        ? n.urlToImage
        : "./src/images/noticia-default.jpg";

    div.innerHTML = `
  <div class="noticia-img">
    <img src="${imagem}" alt="${n.title ?? "Notícia"}" loading="lazy">
  </div>

  <h3>${n.title ?? "Sem título"}</h3>
  <small>${formatarData(n.publishedAt)}</small>
  <p>${n.description ?? ""}</p>

  <a href="${n.url}" target="_blank" rel="noopener">
    Ler mais →
  </a>
`;

    lista.appendChild(div);
  });

  renderPaginacao();
}

// ===============================
// PAGINAÇÃO
// ===============================
function renderPaginacao() {
  paginacao.innerHTML = "";

  const totalPaginas = Math.ceil(noticias.length / POR_PAGINA);

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;

    if (i === paginaAtual) btn.classList.add("ativo");

    btn.onclick = () => {
      paginaAtual = i;
      renderizar();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    paginacao.appendChild(btn);
  }
}

// ===============================
// UTILS
// ===============================
function formatarData(dataISO) {
  if (!dataISO) return "";
  return new Date(dataISO).toLocaleDateString("pt-BR");
}

// ===============================
// INIT
// ===============================
carregarNoticias();
