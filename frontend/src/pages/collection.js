async function loadCollection() {
  const body = $("collectionRuns");
  if (!body) return;
  body.replaceChildren(makeMessageRow("Cargando historial…"));
  try {
    const [overview, page] = await Promise.all([
      api("/collection-runs/overview"),
      api("/collection-runs"),
    ]);
    renderCollectionOverview(overview);
    renderCollectionRuns(page.items);
  } catch (cause) {
    if (session()) {
      // Separa el estado vacío de una falla de conexión para no mostrar errores como si fueran filas.
      body.replaceChildren(makeMessageRow("No se pudo cargar el historial de recolecciones."));
      const connectionFailure = cause instanceof TypeError && /fetch/i.test(cause.message);
      setNotice("collectionMessage", connectionFailure
        ? "No se pudo conectar con la API. Comprueba que el backend siga ejecutándose en 127.0.0.1:8000; si acabas de cambiar dependencias o .env, reinícialo."
        : cause.message, "error");
    }
  }
}

function renderCollectionOverview(overview) {
  const latest = overview.ultima_captura;
  $("collectionLatest").textContent = latest
    ? `${formatCaptureDate(latest.fecha_captura)} · semana ${latest.semana} · ${latest.perfiles_total} perfiles`
    : "Todavía no hay capturas completadas.";
  const status = $("collectionLatestStatus");
  status.replaceWith(makeStatusTag(latest?.estado || "Sin datos"));
  const newStatus = $("collectionOverview").querySelector(".tag");
  newStatus.id = "collectionLatestStatus";
}

function renderCollectionRuns(runs) {
  const body = $("collectionRuns");
  body.replaceChildren();
  if (!runs.length) {
    body.append(makeMessageRow("No hay ejecuciones registradas."));
    return;
  }
  runs.forEach((run) => {
    const row = document.createElement("tr");
    [run.semana, formatCaptureDate(run.fecha_captura), run.perfiles_total, run.perfiles_disponibles,
      run.perfiles_no_disponibles, run.perfiles_sin_publicar].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value ?? "—");
      row.append(cell);
    });
    const statusCell = document.createElement("td");
    statusCell.append(makeStatusTag(run.estado));
    row.append(statusCell);
    body.append(row);
  });
}

function makeMessageRow(message) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 7;
  cell.className = "muted";
  cell.textContent = message;
  row.append(cell);
  return row;
}

async function runCollection() {
  const button = $("runCollectionButton");
  const chooseButton = $("chooseCollectionFileButton");
  const input = $("collectionCsvFile");
  const file = input.files?.[0];
  if (!file) {
    setNotice("collectionMessage", "Elige un archivo CSV antes de iniciar la importación.", "error");
    return;
  }

  button.disabled = true;
  chooseButton.disabled = true;
  setNotice("collectionMessage", `Importando ${file.name}…`, "loading");
  try {
    const formData = new FormData();
    formData.append("file", file, file.name);
    const result = await api("/collection-runs", { method: "POST", body: formData });
    const outcome = `Captura ${result.estado}: ${result.perfiles_persistidos} perfiles guardados y ${result.perfiles_rechazados} rechazados.${result.mensaje_error ? ` ${result.mensaje_error}` : ""}`;
    const severity = result.estado === "fallida" ? "error"
      : result.estado === "parcial" || result.perfiles_rechazados > 0 ? "warning" : "success";
    setNotice("collectionMessage", outcome, severity);
    input.value = "";
    $("collectionFileName").textContent = "No hay archivo seleccionado.";
    button.disabled = true;
    await loadCollection();
  } catch (cause) {
    setNotice("collectionMessage", cause.message, "error");
    // Al limpiar el input se permite volver a elegir el mismo nombre tras corregir un CSV fallido.
    input.value = "";
    $("collectionFileName").textContent = "No hay archivo seleccionado.";
  } finally {
    chooseButton.disabled = false;
    button.disabled = !input.files?.[0];
  }
}

export { loadCollection, renderCollectionOverview, renderCollectionRuns, makeMessageRow, runCollection };
