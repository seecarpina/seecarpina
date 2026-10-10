const CORES = ["azul", "violeta", "verde", "laranja", "rosa", "ciano"];

// O ID do grupo define a cor: ordem, título e permissões não mudam o resultado.
export function corDoGrupoMenu(grupoId) {
  if (!grupoId) return null;
  let hash = 0;
  for (const caractere of String(grupoId)) {
    hash = (Math.imul(hash, 31) + caractere.codePointAt(0)) >>> 0;
  }
  return CORES[hash % CORES.length];
}
