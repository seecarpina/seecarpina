const documentos = [
  "RG", "CPF", "PIS/PASEP/NIS", "Título de Eleitor",
  "Certidão de Regularidade Eleitoral", "CTPS", "Registro de Nascimento/Casamento",
  "Comprovante de Residência", "Carteira de Reservista", "Foto 3x4", "Currículo",
  "Comprovante de Grau de Escolaridade", "Certidão de Improbidade",
  "Certidão negativa criminal Estadual", "Certidão negativa criminal Federal", "Conta do Santander",
];

const lista = document.getElementById("docs");
const prancheta = document.getElementById("pranchetaChecklist");
const contagem = document.getElementById("contagemDocumentos");
const progresso = document.getElementById("progressoDocumentos");
const mensagem = document.getElementById("mensagemChecklist");
const nova = document.getElementById("novaConferencia");

lista.innerHTML = documentos.map((nome, indice) => `
  <li>
    <label class="filtro-disponiveis checklist-documento">
      <input id="documento-${indice + 1}" type="checkbox" />
      <span class="filtro-checkbox" aria-hidden="true">
        <span class="material-symbols-outlined">check</span>
      </span>
      <span class="checklist-nome">${nome}</span>
      <span class="checklist-numero" aria-hidden="true">${String(indice + 1).padStart(2, "0")}</span>
    </label>
  </li>
`).join("");

const campos = [...lista.querySelectorAll('input[type="checkbox"]')];
progresso.max = documentos.length;

function atualizarConferencia() {
  const conferidos = campos.filter(campo => campo.checked).length;
  const completo = conferidos === documentos.length;
  contagem.textContent = `${conferidos} de ${documentos.length} documentos conferidos`;
  progresso.value = conferidos;
  nova.disabled = conferidos === 0;
  prancheta.classList.toggle("completa", completo);
  mensagem.textContent = completo
    ? "Todos os documentos foram conferidos."
    : "Marque os documentos à medida que forem conferidos.";
}

lista.addEventListener("change", atualizarConferencia);
nova.addEventListener("click", () => {
  campos.forEach(campo => { campo.checked = false; });
  atualizarConferencia();
  campos[0]?.focus();
});
atualizarConferencia();
