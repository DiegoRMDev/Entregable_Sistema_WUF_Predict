async function loadAlerts() {
  setNotice("alertsMessage");
  try {
    const report = await api("/alerts");
    alertItems = report.items || [];
    updateAlertBadge(report.total_abiertas || 0);
    const openCount = Number(report.total_abiertas) || 0;
    $("consistencyAlertsSummary").textContent = `${openCount} alertas pendientes o en revisión · ${alertItems.length} alertas en el historial.`;
    renderAlerts();
  } catch (cause) {
    updateAlertBadge(0);
    setNotice("alertsMessage", cause.message, "error");
    $("consistencyItems").replaceChildren(modelText("p", "No se pudo cargar la bandeja de alertas.", "muted pad"));
    $("resolvedAlertItems").replaceChildren(modelText("p", "No se pudo cargar la bandeja de alertas.", "muted pad"));
    $("openAlertsCount").textContent = "—";
    $("resolvedAlertsCount").textContent = "—";
    $("consistencyFilterCount").textContent = "—";
  }
}

async function refreshAlertBadge() {
  if (!currentUser || !["analista", "ayuda"].includes(currentUser.rol)) return;
  try {
    const report = await api("/alerts");
    updateAlertBadge(report.total_abiertas || 0);
  } catch (_cause) {
    updateAlertBadge(0);
  }
}

function updateAlertBadge(openCount) {
  const badge = $("alertBadge");
  if (!badge) return;
  badge.textContent = String(openCount);
  badge.hidden = openCount <= 0;
}

function renderAlerts() {
  const openContainer = $("consistencyItems");
  const resolvedContainer = $("resolvedAlertItems");
  const search = ($("consistencySearch")?.value || "").trim().toLocaleLowerCase("es-PE");
  const selectedState = $("alertStateFilter")?.value || "todos";
  const filtered = alertItems.filter((item) => {
    const matchesText = !search || `${item.sku} ${item.nombre}`.toLocaleLowerCase("es-PE").includes(search);
    return matchesText && (selectedState === "todos" || item.estado === selectedState);
  });
  const openItems = filtered.filter((item) => item.estado !== "resuelta");
  const resolvedItems = filtered.filter((item) => item.estado === "resuelta");
  openContainer.replaceChildren();
  resolvedContainer.replaceChildren();
  $("consistencyFilterCount").textContent = `Mostrando ${filtered.length} de ${alertItems.length}`;
  $("openAlertsCount").textContent = String(openItems.length);
  $("resolvedAlertsCount").textContent = String(resolvedItems.length);
  const openEmptyMessage = !alertItems.length
    ? "Todavía no hay alertas. El Analista debe ejecutar una evaluación HU04 para detectar perfiles de prioridad alta."
    : "No hay alertas pendientes o en revisión que coincidan con los filtros.";
  const resolvedEmptyMessage = !alertItems.length
    ? "Todavía no hay alertas resueltas."
    : "No hay alertas resueltas que coincidan con los filtros.";
  if (!openItems.length) openContainer.append(modelText("p", openEmptyMessage, "muted pad"));
  if (!resolvedItems.length) resolvedContainer.append(modelText("p", resolvedEmptyMessage, "muted pad"));

  filtered.forEach((item) => {
    const container = item.estado === "resuelta" ? resolvedContainer : openContainer;
    const row = document.createElement("article");
    row.className = "alert-row";
    const content = document.createElement("div");
    const name = modelText("p", "", "name");
    name.append(document.createTextNode(`${item.nombre} · ${item.sku} `));
    name.append(modelText("span", "Riesgo alto", "tag baja"));
    const stateLabels = { pendiente: "Pendiente", en_revision: "En revisión", resuelta: "Resuelta" };
    const stateClass = item.estado === "resuelta" ? "alta" : item.estado === "en_revision" ? "media" : "baja";
    name.append(modelText("span", stateLabels[item.estado] || item.estado, `tag ${stateClass}`));
    const observedDays = item.dias_sin_cambio_observado;
    const observedDaysLabel = observedDays === null || observedDays === undefined
      ? "Días sin cambio no registrados"
      : `${observedDays} días sin cambio observado`;
    const detail = modelText("p",
      `Semana ${item.semana} · ${observedDaysLabel} · árbol ${item.version_arbol}`, "meta");
    const generated = modelText("p", `Alerta creada ${formatDate(item.fecha)} · última detección ${formatDate(item.fecha_ultima_deteccion)}`, "meta");
    const reason = modelText("p", item.justificacion, "justif");
    content.append(name, detail, generated, reason);
    const history = document.createElement("details");
    history.className = "alert-history";
    const historyTitle = document.createElement("summary");
    historyTitle.textContent = `Historial de atención (${item.historial_atencion.length})`;
    history.append(historyTitle);
    if (!item.historial_atencion.length) {
      history.append(modelText("p", "Todavía no se registraron acciones de atención.", "muted"));
    } else {
      item.historial_atencion.forEach((event) => {
        history.append(modelText("p",
          `${event.estado_anterior.replaceAll("_", " ")} → ${event.estado_nuevo.replaceAll("_", " ")} · ${event.atendido_por} · ${formatDate(event.fecha)} · ${event.nota}`, "alert-history-event"));
      });
    }
    content.append(history);
    row.append(content);
    if (currentUser?.rol === "ayuda" && item.estado !== "resuelta") {
      const actions = document.createElement("div");
      actions.className = "alert-actions";
      const note = document.createElement("textarea");
      note.rows = 2;
      note.maxLength = 500;
      note.required = true;
      note.dataset.alertNote = String(item.id_alerta);
      note.placeholder = "Registra qué comprobaste (máximo 500 caracteres)";
      note.setAttribute("aria-label", `Nota de atención para ${item.nombre}`);
      actions.append(note);
      if (item.estado === "pendiente") {
        const startButton = document.createElement("button");
        startButton.type = "button";
        startButton.className = "secondary";
        startButton.textContent = "Iniciar revisión";
        startButton.dataset.alertId = String(item.id_alerta);
        startButton.dataset.alertState = "en_revision";
        actions.append(startButton);
      }
      const resolveButton = document.createElement("button");
      resolveButton.type = "button";
      resolveButton.className = "primary";
      resolveButton.textContent = "Resolver";
      resolveButton.dataset.alertId = String(item.id_alerta);
      resolveButton.dataset.alertState = "resuelta";
      actions.append(resolveButton);
      row.append(actions);
    }
    container.append(row);
  });
}

async function attendAlert(button) {
  const alertId = Number(button.dataset.alertId);
  const note = document.querySelector(`textarea[data-alert-note="${alertId}"]`);
  const cleanedNote = note?.value.trim() || "";
  if (!cleanedNote) {
    setNotice("alertsMessage", "Escribe una nota breve antes de guardar la atención.", "warning");
    note?.focus();
    return;
  }
  const buttons = [...document.querySelectorAll(`[data-alert-id="${alertId}"]`)];
  buttons.forEach((entry) => { entry.disabled = true; });
  try {
    const result = await api(`/alerts/${alertId}/attention`, {
      method: "PATCH",
      body: JSON.stringify({ estado_nuevo: button.dataset.alertState, nota: cleanedNote }),
    });
    await loadAlerts();
    setNotice("alertsMessage", `Alerta de ${result.nombre} actualizada a ${result.estado.replaceAll("_", " ")}.`, "success");
  } catch (cause) {
    setNotice("alertsMessage", cause.message, "error");
    buttons.forEach((entry) => { entry.disabled = false; });
  }
}

async function trainConsistencyModel() {
  const button = $("trainConsistencyButton");
  button.disabled = true;
  setNotice("consistencyTrainingMessage", "Preparando el historial y entrenando el árbol…", "loading");
  try {
    const report = await api("/consistency/train", {
      method: "POST",
      body: JSON.stringify({
        profundidad_maxima: Number($("consistencyDepth").value),
        proporcion_prueba: Number($("consistencyTestSize").value),
      }),
    });
    renderConsistencyReport(report);
    const alertSummary = report.alertas_hu07 || { nuevas: 0, actualizadas: 0 };
    await refreshAlertBadge();
    setNotice(
      "consistencyTrainingMessage",
      `Evaluación ${report.model.version} guardada para ${report.items.length} perfiles. Alertas nuevas: ${alertSummary.nuevas}; actualizadas: ${alertSummary.actualizadas}.`,
      "success",
    );
  } catch (cause) {
    setNotice("consistencyTrainingMessage", cause.message, "error");
  } finally {
    button.disabled = false;
  }
}

export { loadAlerts, refreshAlertBadge, updateAlertBadge, renderAlerts, attendAlert, trainConsistencyModel };
