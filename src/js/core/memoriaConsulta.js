// Estado da consulta nesta aba, separado por módulo e usuário.
export function criarMemoriaConsulta(modulo, obterUid, obterStorage = () => window.sessionStorage) {
  function chave() {
    const uid = obterUid();
    return uid ? `see:consulta:v1:${modulo}:${uid}` : null;
  }
  return {
    ler() {
      try {
        const id = chave();
        if (!id) return null;
        const estado = JSON.parse(obterStorage().getItem(id));
        return estado && typeof estado === "object" && !Array.isArray(estado) ? estado : null;
      } catch { return null; }
    },
    salvar(estado) {
      try {
        const id = chave();
        if (id) obterStorage().setItem(id, JSON.stringify(estado));
      } catch { /* A consulta continua funcionando se o navegador bloquear o armazenamento. */ }
    },
  };
}

function pagina(valor) {
  return Number.isSafeInteger(valor) && valor > 0 ? valor : 1;
}
function texto(valor) { return typeof valor === "string" ? valor : ""; }
function dataDoAno(valor, ano) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || !valor.startsWith(`${ano}-`)) return "";
  const data = new Date(`${valor}T00:00:00Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0,10) === valor ? valor : "";
}

export function normalizarConsultaOficios(estado, anoAtual, hoje) {
  const ano = String(estado?.ano || anoAtual);
  const anoValido = /^\d{4}$/.test(ano) && Number(ano) >= 2025 && Number(ano) <= Number(anoAtual);
  const selecionado = anoValido ? ano : String(anoAtual);
  let inicio = dataDoAno(estado?.inicio, selecionado);
  let fim = estado ? dataDoAno(estado.fim, selecionado) : dataDoAno(hoje, selecionado);
  if (inicio && fim && inicio > fim) { inicio = ""; fim = ""; }
  return { ano: selecionado, busca: texto(estado?.busca), disponiveis: estado?.disponiveis === true,
    inicio, fim, pagina: pagina(estado?.pagina) };
}

export function normalizarConsultaServidores(estado, filtrosPermitidos) {
  return { busca: texto(estado?.busca),
    pendencia: filtrosPermitidos.includes(estado?.pendencia) ? estado.pendencia : "todos",
    pagina: pagina(estado?.pagina) };
}
