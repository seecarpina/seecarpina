import { dataLocalCalendario } from "./calendarioEventos.js";

export function dataEventoNoAno(evento, ano) {
  if (!evento.data) return "";
  return evento.categoria === "aniversario" ? `${ano}-${evento.data.slice(5)}` : evento.data;
}

export function eventoAtrasado(evento, hoje = new Date()) {
  if (!evento.data || evento.concluido || evento.categoria === "aniversario") return false;
  return evento.data < dataLocalCalendario(hoje);
}

export function eventosCalendarioPorAno(porData, ano) {
  const resultado = {};
  for (const [data, eventos] of Object.entries(porData)) {
    for (const evento of eventos) {
      const dia = dataEventoNoAno({ ...evento, data }, ano);
      (resultado[dia] ||= []).push(evento);
    }
  }
  return resultado;
}
