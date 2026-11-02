async function loadPrioritizationReport() {
  const body = $("reportRows");
  currentPrioritizationReport = null;
  void loadPrioritizationHistory();
  $("reportLead").textContent = "Cargando la última captura y las predicciones del modelo vigente…";
  $("reportEmpty").hidden = true;
  $("reportChartCard").hidden = true;
  $("reportOe3Summary").hidden = true;
  $("reportOe3Toolbar").hidden = true;
  $("reportOe3TableCard").hidden = true;
  $("reportToolbar").hidden = true;
  $("reportTotal").textContent = "";
  body.replaceChildren(modelTableMessage("Cargando reporte…", 10));
  setNotice("reportMessage");
  try {
    const report = await api("/reports/current");
    if (report.estado !== "listo") {
      $("reportLead").textContent = "El reporte semanal aún no está disponible.";
      $("reportEmpty").textContent = report.mensaje || "No hay información para mostrar.";
      $("reportEmpty").hidden = false;
      body.replaceChildren(modelTableMessage(report.mensaje || "No hay datos para mostrar.", 10));
      // Mantiene visible la sección OE3 incluso antes de importar la primera captura.
      if (report.estado === "sin_capturas") {
        renderOe3Report({ estado: "sin_capturas", total: 0, segmentos: [], items: [] });
      }
      return;
    }
    currentPrioritizationReport = report;
    $("reportLead").textContent = `Semana ${report.semana} · captura ${formatCaptureDate(report.fecha_captura)} · ${report.total} mascotas disponibles.`;
    $("reportTotal").textContent = `${report.total} registros`;
    renderPrioritizationChart(report.prioridades, report.total);
    $("reportChartCard").hidden = false;
    $("reportToolbar").hidden = false;
    renderPrioritizationRows(report.items);
    renderOe3Report(report.oe3 || {});
  } catch (cause) {
    $("reportLead").textContent = "No se pudo cargar el reporte semanal.";
    $("reportEmpty").textContent = cause.message;
    $("reportEmpty").hidden = false;
    body.replaceChildren(modelTableMessage("No se pudo cargar el reporte.", 10));
    setNotice("reportMessage", cause.message, "error");
  }
}

async function loadPrioritizationHistory() {
  const body = $("reportHistoryRows");
  body.replaceChildren(modelTableMessage("Cargando historial…", 9));
  try {
    const result = await api("/reports/history");
    renderPrioritizationHistory(result.items || []);
  } catch (cause) {
    body.replaceChildren(modelTableMessage("No se pudo cargar el historial de reportes.", 9));
    setNotice("reportHistory", cause.message, "error");
  }
}

function renderPrioritizationHistory(items) {
  const body = $("reportHistoryRows");
  body.replaceChildren();
  if (!items.length) {
    body.replaceChildren(modelTableMessage("Aún no hay reportes guardados. Exporta el reporte actual como PDF o Excel para registrarlo aquí.", 9));
    return;
  }
  items.forEach((report) => {
    const row = document.createElement("tr");
    appendTextCell(row, formatReportDate(report.fecha_generacion));
    appendTextCell(row, `Semana ${report.semana}`);
    appendTextCell(row, report.modelo_version);
    appendTextCell(row, report.segmentacion_version || "—");
    appendTextCell(row, String(report.total_oe1 || 0), "num");
    appendTextCell(row, String(report.total_oe3 || 0), "num");
    appendTextCell(row, String(report.formato).toUpperCase());
    appendTextCell(row, report.usuario || "—");
    const action = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "report-history-action";
    button.dataset.reportHistoryId = String(report.id_reporte);
    button.dataset.reportFormat = String(report.formato).toLowerCase();
    button.textContent = `Descargar ${String(report.formato).toUpperCase()}`;
    action.append(button);
    row.append(action);
    body.append(row);
  });
}

async function downloadSavedReport(reportId, format, button) {
  button.disabled = true;
  try {
    const headers = new Headers();
    const current = session();
    if (current?.accessToken) headers.set("Authorization", `Bearer ${current.accessToken}`);
    const response = await fetch(`${API_BASE}/reports/history/${encodeURIComponent(reportId)}/export`, { headers });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail?.message || "No se pudo recuperar el reporte.");
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_priorizacion_${reportId}.${format}`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    setNotice("reportHistory", `Reporte ${format.toUpperCase()} descargado.`, "success");
  } catch (cause) {
    setNotice("reportHistory", cause.message, "error");
  } finally {
    button.disabled = false;
  }
}

function renderPrioritizationChart(counts, total) {
  const entries = [
    ["alta", "reportHighCount", "reportHighBar"],
    ["media", "reportMediumCount", "reportMediumBar"],
    ["baja", "reportLowCount", "reportLowBar"],
  ];
  const maximum = Math.max(1, ...entries.map(([key]) => Number(counts[key]) || 0));
  entries.forEach(([key, countId, barId]) => {
    const count = Number(counts[key]) || 0;
    $(countId).textContent = String(count);
    $(barId).style.height = `${Math.max(8, Math.round((count / maximum) * 112))}px`;
    $(barId).setAttribute("aria-label", `${count} mascotas con prioridad ${key}`);
  });
  $("reportBars").setAttribute("aria-label", `Distribución de ${total} mascotas por prioridad`);
}

function renderPrioritizationRows(items) {
  const body = $("reportRows");
  body.replaceChildren();
  items.forEach((pet) => {
    const row = document.createElement("tr");
    row.dataset.reportPet = "true";
    row.dataset.search = normalizeCatalogSearch(`${pet.sku} ${pet.nombre}`);
    row.dataset.priority = String(pet.nivel_prioridad || "").toLocaleLowerCase("es-PE");
    appendTextCell(row, pet.sku);
    appendTextCell(row, pet.nombre);
    appendTextCell(row, pet.especie);
    appendTextCell(row, pet.sexo === "H" ? "Hembra" : pet.sexo === "M" ? "Macho" : pet.sexo);
    appendTextCell(row, formatPetAge(pet.edad_meses, pet.edad_estimada));
    appendTextCell(row, pet.tamano);
    appendTextCell(row, pet.condicion_especial ? (pet.condicion_detalle || "Condición especial") : "Ninguna", "wrap");
    appendTextCell(row, String(pet.orden_publicacion), "num");
    appendTextCell(row, formatMetric(pet.probabilidad_adopcion), "num");
    const priorityCell = document.createElement("td");
    const priorityName = String(pet.nivel_prioridad || "").toLocaleLowerCase("es-PE");
    const priorityTag = document.createElement("span");
    priorityTag.className = `tag ${priorityName}`;
    priorityTag.textContent = pet.nivel_prioridad;
    priorityCell.append(priorityTag);
    row.append(priorityCell);
    body.append(row);
  });
  applyPrioritizationFilters();
}

function applyPrioritizationFilters() {
  const body = $("reportRows");
  const rows = [...body.querySelectorAll("tr[data-report-pet]")];
  const query = normalizeCatalogSearch($("reportSearch").value.trim());
  const priority = $("reportPriorityFilter").value;
  body.querySelector("#reportNoMatches")?.remove();
  let visible = 0;
  rows.forEach((row) => {
    const matches = (!query || row.dataset.search.includes(query))
      && (!priority || row.dataset.priority === priority);
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  $("reportFilterCount").textContent = `Mostrando ${visible} de ${rows.length}`;
  if (rows.length && visible === 0) {
    const empty = modelTableMessage("No hay mascotas que coincidan con los filtros.", 10);
    empty.id = "reportNoMatches";
    body.append(empty);
  }
}

function renderOe3Report(oe3) {
  const summaries = oe3.segmentos || [];
  const items = oe3.items || [];
  $("reportOe3Summary").hidden = false;
  $("reportOe3SummaryMeta").textContent = oe3.modelo_version
    ? `K-Means ${oe3.modelo_version} · ${Number(oe3.total) || 0} mascotas disponibles · ${Number(oe3.total_desfavorecidos) || 0} con atributos desfavorecidos`
    : `${Number(oe3.total) || 0} mascotas disponibles · ${Number(oe3.total_desfavorecidos) || 0} con atributos desfavorecidos`;
  const messages = {
    sin_capturas: "Importa una captura completa para agrupar las mascotas disponibles.",
    sin_modelo: "Entrena y activa K-Means desde Entrenamiento para agrupar el catálogo.",
    requiere_reentrenamiento: "El modelo activo es de la versión anterior del análisis. Entrena y activa un modelo nuevo para agrupar todo el catálogo.",
    pendiente_actualizacion: "La captura cambió. El Analista debe actualizar los segmentos antes de incluirlos en un reporte.",
  };
  $("reportOe3State").textContent = messages[oe3.estado]
    || (Number.isFinite(Number(oe3.silhouette_score))
      ? `Agrupación por atributos del perfil · silhouette ${Number(oe3.silhouette_score).toFixed(3)}.`
      : "Agrupación por atributos del perfil.");
  const summaryHost = $("reportOe3Clusters");
  summaryHost.replaceChildren();
  summaries.forEach((summary) => {
    const card = document.createElement("div");
    card.className = "segmentation-cluster-card";
    const title = document.createElement("strong");
    title.textContent = `${summary.nombre}: ${summary.cantidad_perfiles} perfiles`;
    const detail = document.createElement("span");
    const age = summary.edad_mediana_meses === null ? "edad no indicada" : `edad mediana ${summary.edad_mediana_meses} meses`;
    const concentration = summary.perfiles_con_atributos_desfavorecidos === undefined
      ? ""
      : ` · ${summary.perfiles_con_atributos_desfavorecidos} de ${summary.cantidad_perfiles} con atributos desfavorecidos (${Number(summary.porcentaje_con_atributos_desfavorecidos).toFixed(1)} %)`;
    detail.textContent = `Tamaño frecuente: ${summary.tamano_frecuente} · Energía frecuente: ${summary.energia_frecuente} · ${age}${concentration}`;
    card.append(title, detail);
    summaryHost.append(card);
  });
  $("reportOe3TableCard").hidden = false;
  $("reportOe3Toolbar").hidden = items.length === 0;
  $("reportOe3Total").textContent = `${items.length} mascotas disponibles`;
  const select = $("reportOe3Filter");
  select.replaceChildren(new Option("Todos", ""));
  summaries.forEach((summary) => select.add(new Option(summary.nombre, String(summary.numero_segmento))));
  renderOe3Rows(items, oe3.estado);
}

function renderOe3Rows(items, state = "") {
  const body = $("reportOe3Rows");
  body.replaceChildren();
  if (!items.length) {
    const message = state === "sin_capturas"
      ? "Todavía no hay capturas completas para listar perfiles."
      : state === "requiere_reentrenamiento"
      ? "El modelo vigente usa el enfoque anterior. Entrena y activa uno nuevo para agrupar todo el catálogo."
      : state === "pendiente_actualizacion"
      ? "No hay asignaciones para la última captura. Actualiza K-Means desde Entrenamiento."
      : "Todavía no hay una segmentación OE3 aplicada a esta captura.";
    body.append(modelTableMessage(message, 5));
    $("reportOe3FilterCount").textContent = "";
    return;
  }
  items.forEach((profile) => {
    const row = document.createElement("tr");
    row.dataset.oe3Profile = "true";
    row.dataset.search = normalizeCatalogSearch(`${profile.sku} ${profile.nombre}`);
    row.dataset.cluster = String(profile.numero_segmento);
    const criteria = (profile.criterios_desfavorecidos || []).map((item) => `${item.nombre}${item.estimado ? " (est.)" : ""}`);
    appendTextCell(row, profile.sku);
    appendTextCell(row, profile.nombre);
    appendTextCell(row, criteria.join(" · ") || "Ninguno", "wrap");
    appendTextCell(row, profile.segmento_nombre);
    const summary = profile.segmento_resumen || {};
    const age = summary.edad_mediana_meses === null ? "edad no indicada" : `mediana ${summary.edad_mediana_meses} meses`;
    const concentration = summary.perfiles_con_atributos_desfavorecidos === undefined
      ? ""
      : ` · ${summary.perfiles_con_atributos_desfavorecidos}/${summary.cantidad_perfiles} (${Number(summary.porcentaje_con_atributos_desfavorecidos).toFixed(1)} %) con atributos desfavorecidos`;
    appendTextCell(row, `Tamaño ${summary.tamano_frecuente || "—"} · energía ${summary.energia_frecuente || "—"} · ${age}${concentration}`, "wrap");
    body.append(row);
  });
  applyOe3Filters();
}

function applyOe3Filters() {
  const body = $("reportOe3Rows");
  const rows = [...body.querySelectorAll("tr[data-oe3-profile]")];
  const query = normalizeCatalogSearch($("reportOe3Search").value.trim());
  const cluster = $("reportOe3Filter").value;
  body.querySelector("#reportOe3NoMatches")?.remove();
  let visible = 0;
  rows.forEach((row) => {
    const matches = (!query || row.dataset.search.includes(query)) && (!cluster || row.dataset.cluster === cluster);
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  $("reportOe3FilterCount").textContent = `Mostrando ${visible} de ${rows.length}`;
  if (rows.length && !visible) {
    const empty = modelTableMessage("No hay perfiles que coincidan con los filtros.", 5);
    empty.id = "reportOe3NoMatches";
    body.append(empty);
  }
}

async function exportPrioritizationReport(format) {
  if (!currentPrioritizationReport) return;
  const button = $(format === "pdf" ? "exportReportPdf" : "exportReportXlsx");
  button.disabled = true;
  setNotice("reportExport", `Generando archivo ${format.toUpperCase()}…`, "loading");
  try {
    const headers = new Headers();
    const current = session();
    if (current?.accessToken) headers.set("Authorization", `Bearer ${current.accessToken}`);
    const response = await fetch(`${API_BASE}/reports/export?formato=${format === "xlsx" ? "xlsx" : "pdf"}`, {
      method: "POST", headers,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail?.message || "No se pudo generar el archivo.");
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    const date = String(currentPrioritizationReport.fecha_captura).replaceAll("-", "");
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_priorizacion_semana_${currentPrioritizationReport.semana}_${date}.${format}`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    setNotice("reportExport", `Reporte ${format.toUpperCase()} descargado y registrado.`, "success");
    void loadPrioritizationHistory();
  } catch (cause) {
    setNotice("reportExport", cause.message, "error");
  } finally {
    button.disabled = false;
  }
}

export { loadPrioritizationReport, loadPrioritizationHistory, renderPrioritizationHistory, downloadSavedReport, renderPrioritizationChart, renderPrioritizationRows, applyPrioritizationFilters, renderOe3Report, renderOe3Rows, applyOe3Filters, exportPrioritizationReport };
