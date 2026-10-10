export const MODULOS_DASHBOARD = {
  INSUMOS: 'insumos',
  MATERIAIS_EXPEDIENTE: 'materiaisExpediente',
  MATERIAIS_LIMPEZA: 'materiaisLimpeza',
  MANUTENCAO: 'manutencao',
};

export function modulosDashboardPermitidos(permissao) {
  return Object.keys(MODULOS_DASHBOARD).filter(modulo =>
    permissao?.todas === true || permissao?.modulos?.[MODULOS_DASHBOARD[modulo]] === true);
}

export function resumirAtendimento(registros, agora = Date.now()) {
  const recebidas = registros.filter(p => p.status === 'RECEBIDA');
  const atendimento = registros.filter(p => ['EM_ATENDIMENTO', 'EM_ANALISE', 'APROVADA'].includes(p.status));
  const confirmacao = registros.filter(p => p.status === 'AGUARDANDO_CONFIRMACAO');
  const abertos = [...recebidas, ...atendimento];
  const urgentes = abertos.filter(p => p.prioridade === 'URGENTE');
  const atencao = [...abertos].sort((a, b) => {
    const prioridade = Number(b.prioridade === 'URGENTE') - Number(a.prioridade === 'URGENTE');
    return prioridade || Number(a.criadoEm || agora) - Number(b.criadoEm || agora);
  }).slice(0, 6);
  return { recebidas: recebidas.length, atendimento: atendimento.length,
    confirmacao: confirmacao.length, urgentes: urgentes.length, atencao,
    totalAberto: abertos.length };
}

export function diasDesdePedido(criadoEm, agora = Date.now()) {
  const data = Number(criadoEm);
  return Number.isFinite(data) && data > 0 ? Math.max(0, Math.floor((agora - data) / 86400000)) : null;
}
