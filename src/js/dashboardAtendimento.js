import { auth, db, rtdb } from './firebaseConfig.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { ref, get, query, orderByChild, equalTo, onValue } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { modulosDashboardPermitidos, resumirAtendimento, diasDesdePedido } from './core/resumoDashboard.js';

const painel = document.getElementById('dashboardAtendimento');
const lista = document.getElementById('dashboardPedidosAtencao');
const mensagem = document.getElementById('dashboardAtendimentoMensagem');
const nomes = { INSUMOS: 'Água, gás e caminhão-pipa', MATERIAIS_EXPEDIENTE: 'Material de expediente',
  MATERIAIS_LIMPEZA: 'Material de limpeza', MANUTENCAO: 'Manutenção' };
let cancelar = [];
let versao = 0;

function iniciarCarregamento() {
  painel.setAttribute('aria-busy', 'true');
  mensagem.textContent = 'Carregando os pedidos dos seus módulos…';
  lista.innerHTML = '<see-spinner mensagem="Carregando pedidos"></see-spinner>';
  for (const chave of ['recebidas', 'atendimento', 'confirmacao', 'urgentes']) {
    document.getElementById(`dashboard-${chave}`).innerHTML = '<see-spinner tamanho="pequeno"></see-spinner>';
  }
}

function ocultarPainel() {
  painel.hidden = true;
  painel.setAttribute('aria-busy', 'false');
}

function mostrarErro(texto) {
  painel.hidden = false;
  painel.setAttribute('aria-busy', 'false');
  mensagem.textContent = texto;
  lista.replaceChildren();
  for (const chave of ['recebidas', 'atendimento', 'confirmacao', 'urgentes']) {
    document.getElementById(`dashboard-${chave}`).textContent = '—';
  }
}

function renderizar(registros) {
  const resumo = resumirAtendimento(registros);
  painel.setAttribute('aria-busy', 'false');
  for (const chave of ['recebidas', 'atendimento', 'confirmacao', 'urgentes']) {
    document.getElementById(`dashboard-${chave}`).textContent = resumo[chave];
  }
  mensagem.textContent = `${resumo.totalAberto} pedido${resumo.totalAberto === 1 ? '' : 's'} aguardando ação da secretaria. Urgentes aparecem primeiro, seguidos dos mais antigos.`;
  lista.replaceChildren();
  if (!resumo.atencao.length) {
    const vazio = document.createElement('p');
    vazio.className = 'dashboard-vazio';
    vazio.textContent = 'Nenhum pedido aguardando atendimento nos módulos que você acompanha.';
    lista.append(vazio);
  }
  for (const pedido of resumo.atencao) {
    const link = document.createElement('a');
    link.className = 'dashboard-pedido';
    link.href = `./solicitacoes?pedido=${encodeURIComponent(pedido.id)}`;
    const texto = document.createElement('div');
    const titulo = document.createElement('strong');
    titulo.textContent = pedido.escolaNome || 'Unidade escolar';
    const detalhe = document.createElement('span');
    detalhe.textContent = `${pedido.protocolo || 'Sem protocolo'} · ${pedido.tipoNome || pedido.categoriaNome || nomes[pedido.modulo] || 'Pedido'}`;
    texto.append(titulo, detalhe);
    const meta = document.createElement('div');
    meta.className = 'dashboard-pedido-meta';
    const badge = document.createElement('span');
    badge.className = pedido.prioridade === 'URGENTE' ? 'dashboard-badge urgente' : 'dashboard-badge';
    badge.textContent = pedido.prioridade === 'URGENTE' ? 'Urgente' : pedido.status === 'RECEBIDA' ? 'Recebida' : 'Em atendimento';
    const tempo = document.createElement('small');
    const dias = diasDesdePedido(pedido.criadoEm);
    tempo.textContent = dias === null ? 'Data não informada' : dias === 0 ? 'Recebido hoje' : `Há ${dias} dia${dias === 1 ? '' : 's'}`;
    meta.append(badge, tempo);
    link.append(texto, meta);
    lista.append(link);
  }
}

onAuthStateChanged(auth, async user => {
  const atual = ++versao;
  cancelar.forEach(fn => fn());
  cancelar = [];
  if (!user) { ocultarPainel(); return; }
  painel.hidden = false;
  iniciarCarregamento();
  try {
    const usuario = await getDoc(doc(db, 'usuarios', user.uid));
    if (atual !== versao) return;
    if (!usuario.exists() || usuario.data().ativo === false) { ocultarPainel(); return; }
    const perfil = String(usuario.data().cargo || '').trim().toUpperCase();
    if (!perfil || perfil === 'GESTOR_ESCOLAR') { ocultarPainel(); return; }
    const permissoes = await get(ref(rtdb, `configuracoes/solicitacoes/permissoes/${perfil}`));
    if (atual !== versao) return;
    const modulos = modulosDashboardPermitidos(permissoes.val());
    if (!modulos.length) { ocultarPainel(); return; }
    const porModulo = {};
    const carregados = new Set();
    const falhas = new Set();
    const atualizar = () => {
      if (atual !== versao || carregados.size !== modulos.length) return;
      if (falhas.size) {
        mostrarErro('Não foi possível carregar todos os pedidos. Abra a Central de Solicitações para consultar.');
        return;
      }
      renderizar(Object.values(porModulo).flat());
    };
    for (const modulo of modulos) {
      const consulta = query(ref(rtdb, 'portalGestor/solicitacoes/registros'), orderByChild('modulo'), equalTo(modulo));
      cancelar.push(onValue(consulta, snapshot => {
        if (atual !== versao) return;
        porModulo[modulo] = Object.entries(snapshot.val() || {}).map(([id, dados]) => ({ ...dados, id }));
        falhas.delete(modulo);
        carregados.add(modulo);
        atualizar();
      }, () => { falhas.add(modulo); carregados.add(modulo); atualizar(); }));
    }
  } catch (erro) {
    console.error('Erro ao carregar resumo de atendimento:', erro);
    if (atual === versao) {
      mostrarErro('Resumo indisponível no momento. Tente atualizar a página.');
    }
  }
});

