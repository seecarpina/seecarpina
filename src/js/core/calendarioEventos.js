const categorias = {
  aniversario: { nome: "Aniversário", cor: "mediumorchid" },
  eventos: { nome: "Evento", cor: "dodgerblue" },
  reuniao: { nome: "Reunião", cor: "darkorange" },
  resposta_mp: { nome: "Resposta ao MP", cor: "slateblue" },
  alerta: { nome: "Alerta", cor: "crimson" },
  audiencias: { nome: "Audiência", cor: "seagreen" },
  outros: { nome: "Outros", cor: "gray" },
  data_comemorativa: { nome: "Data comemorativa", cor: "goldenrod" },
};

export function categoriaCalendario(valor) {
  return Object.hasOwn(categorias, valor) ? categorias[valor] : categorias.outros;
}

export function categoriasDoDia(eventos) {
  return [...new Set(eventos.map((evento) => categoriaCalendario(evento.categoria)))];
}

export function dataLocalCalendario(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

export function datasComemorativasDoDia(datas, dataISO) {
  return datas.filter((data) => data.data === dataISO.slice(5)).map((data) => ({
    titulo: data.nome,
    categoria: "data_comemorativa",
    categoriaComemorativa: data.categoria || "",
  }));
}
