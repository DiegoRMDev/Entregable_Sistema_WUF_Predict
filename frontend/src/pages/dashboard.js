async function loadDashboard() {
  const activityRows = $("dashboardActivityRows");
  const evolutionRows = $("dashboardEvolutionRows");
  if (!activityRows || !evolutionRows) return;
  activityRows.replaceChildren(modelTableMessage("Cargando actividad…", 2));
  evolutionRows.replaceChildren(modelTableMessage("Cargando capturas…", 7));
  try {
    const summary = await api("/dashboard/summary");
    renderDashboard(summary);
  } catch (cause) {
    $("dashboardLead").textContent = "No se pudo cargar el resumen del sistema.";
    activityRows.replaceChildren(modelTableMessage("No se pudo cargar la actividad.", 2));
    evolutionRows.replaceChildren(modelTableMessage("No se pudo cargar la evolución.", 7));
    setNotice("dashboardLoad", cause.message, "error");
  }
}

function dashboardCell(row, value, className = "") {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = value == null ? "—" : String(value);
  row.append(cell);
  return cell;
}

function renderDashboard(data) {
  setNotice("dashboardLoad");
  const capture = data.captura;
  const hasCapture = Boolean(capture);
  const oe1 = data.oe1 || {};
  const oe2 = data.oe2 || {};
  const oe3 = data.oe3 || {};
  const catalog = data.catalogo || {};

  $("dashboardLead").textContent = hasCapture
    ? `Semana ${capture.semana} · captura ${formatCaptureDate(capture.fecha_captura)}`
    : "Todavía no hay capturas completadas.";

  $("dashboardOe1Value").textContent = oe1.version == null ? "—" : String(oe1.prioridad_alta ?? 0);
  $("dashboardOe1Meta").textContent = hasCapture
    ? `de ${catalog.disponibles ?? 0} disponibles`
    : "—";
  $("dashboardOe1Target").textContent = `Mascotas de baja probabilidad con prioridad alta · meta: +${oe1.meta_aumento_porcentaje ?? 25} %`;

  $("dashboardOe2Value").textContent = String(oe2.alertas_altas_abiertas ?? 0);
  $("dashboardOe2Target").textContent = `Perfiles con riesgo alto abiertos · meta de exactitud del catálogo: ${oe2.meta_exactitud_porcentaje ?? 98} %`;

  $("dashboardOe3Value").textContent = hasCapture ? String(oe3.perfiles_con_criterios ?? 0) : "—";
  $("dashboardOe3Meta").textContent = hasCapture
    ? `de ${catalog.disponibles ?? 0} disponibles`
    : "—";
  const oe3Coverage = oe3.cobertura_porcentaje;
  const oe3Assigned = oe3.perfiles_con_criterios_asignados;
  const oe3Eligible = oe3.perfiles_con_criterios;
  $("dashboardOe3Target").textContent = oe3Coverage == null
    ? `Perfiles con criterios de desventaja · meta de cobertura: ${oe3.meta_cobertura_porcentaje ?? 100} %`
    : `${oe3.segmentos} segmentos · cobertura ${oe3Assigned}/${oe3Eligible} · meta: ${oe3.meta_cobertura_porcentaje ?? 100} %`;

  $("dashboardCatalogEmpty").hidden = hasCapture;
  $("dashboardCatalogTable").hidden = !hasCapture;
  if (hasCapture) {
    $("dashboardCatalogTotal").textContent = String(catalog.perfiles_total ?? 0);
    $("dashboardCatalogAvailable").textContent = String(catalog.disponibles ?? 0);
    $("dashboardCatalogUnavailable").textContent = String(catalog.no_disponibles ?? 0);
    $("dashboardCatalogUnpublished").textContent = String(catalog.sin_publicar ?? 0);
    const prioritiesExist = oe1.version != null;
    $("dashboardCatalogPriorities").textContent = prioritiesExist
      ? `${catalog.prioridad_alta ?? 0} / ${catalog.prioridad_media ?? 0} / ${catalog.prioridad_baja ?? 0}`
      : "Sin predicción vigente";
  }

  const evolutionRows = $("dashboardEvolutionRows");
  evolutionRows.replaceChildren();
  const history = Array.isArray(data.evolucion) ? data.evolucion : [];
  if (!history.length) {
    evolutionRows.append(modelTableMessage("Todavía no hay capturas completadas.", 7));
  } else {
    history.forEach((item) => {
      const row = document.createElement("tr");
      dashboardCell(row, `Semana ${item.semana} · ${formatCaptureDate(item.fecha_captura)}`);
      dashboardCell(row, item.perfiles_total, "num");
      dashboardCell(row, item.perfiles_disponibles, "num");
      dashboardCell(row, item.oe1?.version == null ? "—" : item.oe1.prioridad_alta, "num");
      dashboardCell(row, item.oe2?.version == null ? "—" : item.oe2.riesgo_alto, "num");
      dashboardCell(row, item.oe3?.perfiles_con_criterios ?? "—", "num");
      dashboardCell(row, item.oe3?.version == null ? "—" : item.oe3.segmentos, "num");
      evolutionRows.append(row);
    });
  }

  const activityRows = $("dashboardActivityRows");
  activityRows.replaceChildren();
  const activity = Array.isArray(data.actividad) ? data.actividad : [];
  if (!activity.length) {
    activityRows.append(modelTableMessage("Aún no hay actividad registrada.", 2));
  } else {
    activity.forEach((item) => {
      const row = document.createElement("tr");
      dashboardCell(row, item.accion || "Actividad");
      const detail = [item.detalle, formatReportDate(item.fecha)].filter(Boolean).join(" · ");
      dashboardCell(row, detail, "muted num");
      activityRows.append(row);
    });
  }
}

export { loadDashboard, dashboardCell, renderDashboard };
