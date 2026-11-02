function modelStatusPresentation(status) {
  return ({
    vigente: ["Vigente", "alta"],
    publicable: ["Listo para publicar", "media"],
    no_publicable: ["No supera el umbral", "baja"],
    publicado: ["Publicado anteriormente", "neutral"],
  })[status] || [status || "Desconocido", "neutral"];
}

function appendTextCell(row, value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value;
  if (className) cell.className = className;
  row.append(cell);
  return cell;
}

function formatMetric(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${(numeric * 100).toFixed(1)} %` : "—";
}

export { modelStatusPresentation, appendTextCell, formatMetric };
