import { auth, rtdb } from './firebaseConfig.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
const form = document.getElementById('formRevisao');
const original = document.getElementById('textoOriginal');
const resultado = document.getElementById('textoRevisado');
const botao = document.getElementById('melhorarTexto');
const copiar = document.getElementById('copiarTexto');
const limpar = document.getElementById('limparTexto');
const status = document.getElementById('statusRevisao');
let autorizado = false;
let versao = 0;
onAuthStateChanged(auth, async user => {
  const atual = ++versao;
  autorizado = false;
  botao.disabled = true;
  if (!user) { location.href = './login'; return; }
  try {
    const snapshot = await get(ref(rtdb, `controleAcesso/usuarios/${user.uid}`));
    if (atual !== versao) return;
    const dados = snapshot.val();
    autorizado = dados?.ativo === true && Boolean(dados.perfil) && dados.perfil !== 'GESTOR_ESCOLAR';
    botao.disabled = !autorizado;
    status.textContent = autorizado ? 'Pronto para revisar. O uso está sujeito à cota disponível da IA.' : 'Revisão disponível para usuários ativos da secretaria.';
  } catch { status.textContent = 'Não foi possível validar seu acesso. Atualize a página.'; }
});
original.addEventListener('input', () => {
  document.getElementById('contadorTexto').textContent = `${original.value.length.toLocaleString('pt-BR')}/6.000 caracteres`;
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!autorizado || !auth.currentUser) return;
  botao.disabled = true;
  limpar.disabled = true;
  copiar.disabled = true;
  resultado.value = '';
  status.textContent = 'Revisando o texto…';
  try {
    const token = await auth.currentUser.getIdToken();
    const resposta = await fetch('/api/revisar-texto', {method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
      body: JSON.stringify({texto: original.value, tipo: document.getElementById('tipoTexto').value}),
      signal: AbortSignal.timeout(50000)});
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível revisar o texto.');
    resultado.value = dados.texto;
    copiar.disabled = false;
    status.textContent = 'Revisão concluída. Confira nomes, datas, valores e o sentido do texto antes de copiar.';
  } catch (erro) { status.textContent = erro.name === 'TimeoutError' ? 'A revisão demorou demais. Tente novamente.' : erro.message; }
  finally { botao.disabled = !autorizado; limpar.disabled = false; }
});
copiar.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(resultado.value); window.mostrarNotificacao('Texto copiado.'); }
  catch { resultado.focus(); resultado.select(); status.textContent = 'Selecionei o resultado. Use a opção Copiar do seu dispositivo.'; }
});
limpar.addEventListener('click', () => {
  original.value = ''; resultado.value = ''; copiar.disabled = true;
  original.dispatchEvent(new Event('input')); original.focus();
  status.textContent = 'Cole outro texto para revisar.';
});
