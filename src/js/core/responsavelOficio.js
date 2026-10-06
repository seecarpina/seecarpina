export function primeiroEUltimoNome(nome) {
  const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "Usuário";
  return partes.length === 1 ? partes[0] : `${partes[0]} ${partes.at(-1)}`;
}

export function podeEditarOficio(registro, nome, uid) {
  const primeiroNome = nome.split(/\s+/)[0];
  // Mantém a exceção e a compatibilidade dos registros antigos.
  if (primeiroNome === "Raphael") return true;
  if (registro.responsavelUid) return Boolean(uid) && registro.responsavelUid === uid;
  return !registro.responsavel || registro.responsavel === nome ||
    registro.responsavel === primeiroNome;
}
