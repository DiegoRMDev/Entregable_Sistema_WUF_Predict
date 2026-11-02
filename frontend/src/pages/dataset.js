function datasetStateLabel(state) {
  return ({ disponible: "Disponible", no_disponible: "No disponible", sin_publicar: "Sin publicar" })[state]
    || "Sin registro";
}

function datasetLabelTag(label, reason) {
  const presentation = {
    permanece: ["Permanece", "alta"],
    salio_catalogo: ["Salió del catálogo", "baja"],
    indeterminada: ["Indeterminada", "neutral"],
  }[label] || ["Sin etiqueta", "neutral"];
  const tag = document.createElement("span");
  tag.className = `tag ${presentation[1]}`;
  tag.textContent = presentation[0];
  const content = document.createElement("div");
  content.append(tag);
  if (label === "indeterminada" && reason) {
    // El motivo ayuda a interpretar por qué esta fila no sirve como etiqueta de entrenamiento.
    const explanation = document.createElement("small");
    explanation.className = "dataset-reason";
    explanation.textContent = ({
      estado_sin_evidencia_concluyente: "Se observó «Sin publicar» sin una salida concluyente posterior.",
      sin_captura_posterior: "No hay captura posterior para confirmar el resultado.",
    })[reason] || "No hubo evidencia concluyente durante el seguimiento.";
    content.append(explanation);
  }
  return content;
}

async function loadDataset() {
  const body = $("datasetRows");
  window.datasetRowsData = null;
  window.currentDatasetId = null;
  window.currentDatasetRunCount = 0;
  $("datasetFilterCount").textContent = "";
  setNotice("datasetMessage");
  body.replaceChildren(makeMessageRow("Cargando datasets…"));
  try {
    const [sources, page] = await Promise.all([api("/datasets/sources"), api("/datasets")]);
    window.datasetSources = sources.items;
    populateDatasetCaptureChoices(sources.items);
    const latest = page.items[0];
    if (!latest) {
      resetDatasetTableHeader();
      $("datasetVersion").textContent = "Sin dataset";
      $("datasetSummary").textContent = "Todavía no hay datasets generados.";
      $("datasetProvenance").textContent = "Importa al menos tres capturas completas y elige un horizonte de seguimiento.";
      $("exportDatasetButton").disabled = true;
      $("datasetFilterCount").textContent = "Mostrando 0 de 0";
      body.replaceChildren(makeDatasetMessageRow("Todavía no hay registros de dataset."));
      return;
    }
    const dataset = await api(`/datasets/${latest.id_dataset}`);
    renderDataset(dataset);
  } catch (cause) {
    $("exportDatasetButton").disabled = true;
    window.datasetRowsData = null;
    window.currentDatasetId = null;
    resetDatasetTableHeader();
    $("datasetVersion").textContent = "No disponible";
    $("datasetSummary").textContent = "No se pudo cargar el dataset.";
    $("datasetProvenance").textContent = "";
    $("datasetFilterCount").textContent = "Mostrando 0 de 0";
    setNotice("datasetMessage", cause.message, "error");
    body.replaceChildren(makeDatasetMessageRow("No se pudo cargar el dataset histórico."));
  }
}

function populateDatasetCaptureChoices(captures) {
  const uniqueDates = [...new Map(captures.map((capture) => [capture.fecha_captura, capture])).values()];
  for (const selectId of ["datasetFrom", "datasetTo"]) {
    const select = $(selectId);
    const previous = select.value;
    select.replaceChildren();
    uniqueDates.forEach((capture) => {
      const option = document.createElement("option");
      option.value = capture.fecha_captura;
      option.textContent = `Semana ${capture.semana} · ${formatCaptureDate(capture.fecha_captura)} · ${capture.perfiles_total} perfiles`;
      select.append(option);
    });
    if (uniqueDates.some((capture) => capture.fecha_captura === previous)) select.value = previous;
  }
  if (uniqueDates.length) {
    if (!$("datasetFrom").value) $("datasetFrom").value = uniqueDates[0].fecha_captura;
    if (!$("datasetTo").value) $("datasetTo").value = uniqueDates.at(-1).fecha_captura;
  }
  updateDatasetHorizon();
}

function updateDatasetHorizon() {
  const start = $("datasetFrom").value;
  const end = $("datasetTo").value;
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  const days = Number.isFinite(startTime) && Number.isFinite(endTime)
    ? (endTime - startTime) / 86_400_000 : 0;
  const selected = (window.datasetSources || []).filter((capture) =>
    capture.fecha_captura >= start && capture.fecha_captura <= end);
  const weeks = days / 7;
  const valid = selected.length >= 3 && Number.isInteger(weeks) && weeks >= 2;
  $("datasetHorizon").textContent = valid
    ? `Horizonte: ${weeks} ${weeks === 1 ? "semana" : "semanas"} · ${selected.length} capturas completas incluidas.`
    : "Elige un periodo con al menos tres capturas completas y dos semanas de seguimiento.";
  $("generateDatasetButton").disabled = !valid;
}

function makeDatasetMessageRow(message) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 4 + (window.currentDatasetRunCount || 0);
  cell.className = "muted";
  cell.textContent = message;
  row.append(cell);
  return row;
}

function resetDatasetTableHeader() {
  const header = document.createElement("tr");
  ["ID", "Mascota", "Orden", "Etiqueta final"].forEach((label) => {
    const cell = document.createElement("th");
    cell.textContent = label;
    header.append(cell);
  });
  $("datasetHead").replaceChildren(header);
}

function renderDataset(data) {
  const meta = data.dataset;
  const runs = data.runs;
  const pets = data.pets;
  // La API entrega el motivo en los detalles de auditoría; se vincula por SKU con la fila visible.
  const reasonsBySku = new Map((data.details || []).map((detail) => [detail.sku, detail.motivo_indeterminado]));
  window.datasetRowsData = { runs, pets, reasonsBySku };
  window.currentDatasetId = meta.id_dataset;
  window.currentDatasetRunCount = runs.length;
  $("datasetVersion").textContent = `Versión ${meta.version}`;
  $("datasetSummary").textContent = `· ${meta.nro_registros} registros · ${meta.permanece} permanecen · ${meta.salio} salieron del catálogo${meta.indeterminada ? ` · ${meta.indeterminada} indeterminadas` : ""}`;
  $("datasetProvenance").textContent = `Rango ${formatCaptureDate(meta.fecha_desde)}–${formatCaptureDate(meta.fecha_hasta)} · etiquetas derivadas del catálogo (proxy) · regla ${meta.version_regla_etiquetado}`;
  setNotice("datasetMessage");
  $("exportDatasetButton").disabled = false;

  const head = $("datasetHead");
  const header = document.createElement("tr");
  ["ID", "Mascota", "Orden"].forEach((label) => {
    const cell = document.createElement("th"); cell.textContent = label; header.append(cell);
  });
  runs.forEach((run) => {
    const cell = document.createElement("th");
    cell.textContent = `Semana ${run.semana}`;
    cell.title = formatCaptureDate(run.fecha_captura);
    header.append(cell);
  });
  const labelHeader = document.createElement("th"); labelHeader.textContent = "Etiqueta final"; header.append(labelHeader);
  head.replaceChildren(header);

  applyDatasetFilters();
}

function applyDatasetFilters() {
  const data = window.datasetRowsData;
  if (!data) {
    $("datasetFilterCount").textContent = "Mostrando 0 de 0";
    return;
  }
  const query = $("datasetSearch").value.trim().toLocaleLowerCase("es-PE");
  const selectedLabel = $("datasetLabelFilter").value;
  const filtered = data.pets.filter((pet) => {
    const matchesText = !query || `${pet.sku} ${pet.nombre}`.toLocaleLowerCase("es-PE").includes(query);
    return matchesText && (!selectedLabel || pet.etiqueta === selectedLabel);
  });
  const body = $("datasetRows"); body.replaceChildren();
  $("datasetFilterCount").textContent = `Mostrando ${filtered.length} de ${data.pets.length}`;
  if (!filtered.length) { body.append(makeDatasetMessageRow("No hay mascotas que coincidan con los filtros.")); return; }
  filtered.forEach((pet) => {
    const row = document.createElement("tr");
    [pet.sku, pet.nombre, String(pet.orden_publicacion)].forEach((value, index) => {
      const cell = document.createElement("td");
      if (index === 2) cell.className = "num";
      cell.textContent = value;
      row.append(cell);
    });
    data.runs.forEach((run) => {
      const cell = document.createElement("td");
      cell.textContent = datasetStateLabel(pet.estados[String(run.id_ejecucion)]);
      row.append(cell);
    });
    const label = document.createElement("td");
    label.append(datasetLabelTag(pet.etiqueta, data.reasonsBySku.get(pet.sku)));
    row.append(label);
    body.append(row);
  });
}

async function generateDataset() {
  const button = $("generateDatasetButton");
  button.disabled = true;
  const fechaDesde = $("datasetFrom").value;
  const fechaHasta = $("datasetTo").value;
  setNotice("datasetMessage", "Generando una versión con el periodo seleccionado…", "loading");
  try {
    await api("/datasets", {
      method: "POST",
      body: JSON.stringify({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta }),
    });
    await loadDataset();
    setNotice("datasetMessage", "Dataset generado correctamente.", "success");
  } catch (cause) {
    setNotice("datasetMessage", cause.message, "error");
  } finally { button.disabled = false; }
}

async function exportDataset() {
  if (!window.currentDatasetId) return;
  const current = session();
  try {
    const response = await fetch(`${API_BASE}/datasets/${window.currentDatasetId}/export`, {
      headers: { Authorization: `Bearer ${current.accessToken}` },
    });
    if (!response.ok) throw new Error("No se pudo exportar el dataset.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `dataset_${window.currentDatasetId}.csv`;
    document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    setNotice("datasetMessage", "Descarga del dataset iniciada.", "success");
  } catch (cause) {
    setNotice("datasetMessage", cause.message, "error");
  }
}

export { datasetStateLabel, datasetLabelTag, loadDataset, populateDatasetCaptureChoices, updateDatasetHorizon, makeDatasetMessageRow, resetDatasetTableHeader, renderDataset, applyDatasetFilters, generateDataset, exportDataset };
