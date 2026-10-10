const abrir = document.getElementById("abrirDocs");
const dialog = document.getElementById("modalDocumentos");

function abrirModelos() {
  if (!dialog.open) dialog.showModal();
}

abrir.addEventListener("click", abrirModelos);
abrir.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    abrirModelos();
  }
});
dialog.querySelector(".modelos-fechar").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  const area = dialog.getBoundingClientRect();
  if (event.target === dialog &&
      (event.clientX < area.left || event.clientX > area.right ||
       event.clientY < area.top || event.clientY > area.bottom)) {
    dialog.close();
  }
});
dialog.addEventListener("close", () => abrir.focus());
