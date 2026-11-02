async function loadModels() {
  const history = $("modelHistory");
  history.replaceChildren(modelTableMessage("Cargando versiones…"));
  setNotice("modelMessage");
  try {
    const [options, modelPage] = await Promise.all([api("/models/options"), api("/models")]);
    window.modelDefaults = options.defaults;
    populateModelDatasets(options.datasets);
    $("modelThreshold").textContent = `Accuracy mínima para publicar: ${formatMetric(options.defaults.min_accuracy)}. Semilla reproducible: ${options.defaults.random_state}.`;
    $("modelTestSize").value = String(options.defaults.test_size);
    $("modelTrees").value = options.defaults.n_estimators;
    renderModels(modelPage.items);
  } catch (cause) {
    history.replaceChildren(modelTableMessage("No se pudo cargar el historial de modelos."));
    setNotice("modelMessage", cause.message, "error");
  }
}
function populateModelDatasets(datasets) {
  const select = $("modelDataset");
  const previous = select.value;
  select.replaceChildren();
  datasets.forEach((dataset) => {
    const option = document.createElement("option");
    option.value = dataset.id_dataset;
    option.textContent = `${dataset.version} · ${dataset.registros} filas · ${dataset.permanece} permanecen · ${dataset.salio_catalogo} salieron · ${dataset.indeterminada} indeterminadas`;
    select.append(option);
  });
  if (datasets.some((dataset) => String(dataset.id_dataset) === previous)) select.value = previous;
  $("trainModelButton").disabled = datasets.length === 0;
  if (!datasets.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Genera primero un dataset en Dataset Histórico";
    select.append(option);
  }
}

function modelTableMessage(message, columnCount = 6) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = columnCount;
  cell.className = "muted";
  cell.textContent = message;
  row.append(cell);
  return row;
}

function renderModels(models) {
  const current = models.find((model) => model.es_vigente);
  const latest = current || models[0];
  renderModelDetails(latest);
  const body = $("modelHistory");
  body.replaceChildren();
  if (!models.length) {
    body.append(modelTableMessage("Todavía no hay entrenamientos registrados."));
    return;
  }
  models.forEach((model) => {
    const row = document.createElement("tr");
    appendTextCell(row, model.version);
    appendTextCell(row, model.dataset_version);
    const statusCell = document.createElement("td");
    const [statusText, statusClass] = modelStatusPresentation(model.estado);
    const badge = document.createElement("span");
    badge.className = `tag ${statusClass}`;
    badge.textContent = statusText;
    statusCell.append(badge);
    row.append(statusCell);
    appendTextCell(row, formatMetric(model.accuracy_score));
    appendTextCell(row, formatDate(model.fecha_entrenamiento));
    const actionCell = document.createElement("td");
    const actionGroup = document.createElement("div");
    actionGroup.className = "model-actions";
    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.textContent = "Ver";
    viewButton.setAttribute("aria-label", `Ver detalles de ${model.version}`);
    // El historial mantiene cada evaluación para que se pueda consultar después de publicar.
    viewButton.addEventListener("click", () => renderModelDetails(model));
    actionGroup.append(viewButton);
    if (model.estado === "publicable") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary";
      button.textContent = "Publicar y predecir";
      button.addEventListener("click", () => activateModel(model.id_modelo));
      actionGroup.append(button);
    } else if (model.es_vigente) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Actualizar predicciones";
      button.addEventListener("click", () => refreshPredictions(model.id_modelo));
      actionGroup.append(button);
    }
    actionCell.append(actionGroup);
    row.append(actionCell);
    body.append(row);
  });
}

function renderModelDetails(model) {
  const badge = $("modelStatus");
  const title = $("modelTitle");
  const summary = $("modelSummary");
  const metrics = $("modelMetrics");
  const importance = $("modelImportance");
  const confusionBody = $("modelConfusion");
  const note = $("modelEvaluationNote");
  metrics.replaceChildren();
  importance.replaceChildren();
  confusionBody.replaceChildren();
  if (!model) {
    title.textContent = "Modelo vigente";
    badge.className = "tag neutral";
    badge.textContent = "Sin modelo";
    summary.textContent = "Entrena y publica una versión para ver sus métricas.";
    importance.append(modelText("p", "Sin resultados todavía.", "muted"));
    confusionBody.append(modelTableMessage("Sin resultados todavía.", 3));
    note.textContent = "";
    return;
  }
  const [statusText, statusClass] = modelStatusPresentation(model.estado);
  title.textContent = model.es_vigente
    ? `Modelo vigente: Random Forest ${model.version}`
    : `Detalle de versión: Random Forest ${model.version}`;
  badge.className = `tag ${statusClass}`;
  badge.textContent = statusText;
  const meta = model.metadatos_entrenamiento || {};
  summary.textContent = `Dataset ${model.dataset_version} · ${model.nro_registros_entrenamiento} filas de entrenamiento · ${model.nro_registros_prueba} de prueba (${formatMetric(meta.test_size)}) · ${model.nro_registros_excluidos} indeterminadas excluidas · ${formatDate(model.fecha_entrenamiento)} · ${meta.n_estimators || "—"} árboles · profundidad ${meta.max_depth ?? "sin límite"}`;

  [["Accuracy", model.accuracy_score], ["Precision", model.precision_score],
    ["Recall", model.recall_score], ["F1-score", model.f1_score]].forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "metric";
    card.append(modelText("div", formatMetric(value), "n"), modelText("div", label, "l"));
    metrics.append(card);
  });
  const values = model.importancia_variables || [];
  if (!values.length) importance.append(modelText("p", "Sin resultados de importancia.", "muted"));
  const max = Math.max(0.000001, ...values.map((item) => Number(item.importance) || 0));
  values.forEach((item) => {
    const label = modelText("div", String(item.feature).replace(/^(numeric|categorical)__/, "").replaceAll("_", " "));
    const track = document.createElement("div");
    track.className = "track";
    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.width = `${Math.max(1, Number(item.importance) / max * 100)}%`;
    track.append(fill);
    importance.append(label, track, modelText("div", Number(item.importance).toFixed(3), "v"));
  });
  const matrix = model.matriz_confusion || [];
  const labels = ["Permanece", "Salió del catálogo"];
  if (matrix.length === 2) {
    matrix.forEach((valuesRow, index) => {
      const row = document.createElement("tr");
      appendTextCell(row, `Real: ${labels[index]}`);
      valuesRow.forEach((value) => appendTextCell(row, String(value), "num"));
      confusionBody.append(row);
    });
  } else confusionBody.append(modelTableMessage("No hay matriz de confusión.", 3));
  const classCounts = meta.conteo_clases || {};
  note.textContent = `Prueba por grupos de SKU; distribución entrenable: ${classCounts.permanece || 0} permanecen y ${classCounts.salio_catalogo || 0} salieron. Clase positiva: “Salió del catálogo”. Umbral de publicación: ${formatMetric(model.umbral_accuracy)}. Motivos de exclusión: ${JSON.stringify(meta.motivos_excluidos || {})}.`;
}

function modelText(tagName, value, className = "") {
  const element = document.createElement(tagName);
  element.textContent = value;
  if (className) element.className = className;
  return element;
}

async function trainModel() {
  const button = $("trainModelButton");
  button.disabled = true;
  setNotice("modelMessage", "Preparando los datos y entrenando el modelo…", "loading");
  const depth = $("modelDepth").value;
  try {
    const model = await api("/models/train", {
      method: "POST",
      body: JSON.stringify({
        id_dataset: Number($("modelDataset").value),
        proporcion_prueba: Number($("modelTestSize").value),
        cantidad_arboles: Number($("modelTrees").value),
        profundidad_maxima: depth ? Number(depth) : null,
      }),
    });
    setNotice("modelMessage", model.estado === "publicable"
      ? `Entrenamiento ${model.version} finalizado. Revisa las métricas y publícalo desde el historial si estás de acuerdo.`
      : `Entrenamiento ${model.version} finalizado, pero Accuracy no alcanza el umbral; queda guardado sin publicar.`, model.estado === "publicable" ? "success" : "warning");
    await loadModels();
    // Muestra de inmediato la evaluación de la versión recién entrenada, esté o no publicable.
    renderModelDetails(model);
    setNotice("modelMessage", model.estado === "publicable"
      ? `Entrenamiento ${model.version} finalizado. Revisa las métricas y publícalo desde el historial si estás de acuerdo.`
      : `Entrenamiento ${model.version} finalizado, pero Accuracy no alcanza el umbral; queda guardado sin publicar.`, model.estado === "publicable" ? "success" : "warning");
  } catch (cause) {
    setNotice("modelMessage", cause.message, "error");
  } finally {
    button.disabled = !$("modelDataset").value;
  }
}

async function activateModel(modelId) {
  setNotice("modelMessage", "Verificando el artefacto, publicando el modelo y calculando predicciones…", "loading");
  try {
    const result = await api(`/models/${modelId}/activate`, { method: "POST", body: JSON.stringify({}) });
    setNotice("modelMessage", `${result.version} publicado. Se generaron ${result.predicciones_generadas} predicciones para mascotas disponibles.`, "success");
    await loadModels();
    setNotice("modelMessage", `${result.version} publicado. Se generaron ${result.predicciones_generadas} predicciones para mascotas disponibles.`, "success");
  } catch (cause) {
    setNotice("modelMessage", cause.message, "error");
  }
}

async function refreshPredictions(modelId) {
  setNotice("modelMessage", "Calculando predicciones para la última captura completa…", "loading");
  try {
    const result = await api(`/models/${modelId}/refresh-predictions`, {
      method: "POST", body: JSON.stringify({}),
    });
    setNotice("modelMessage", `Predicciones del modelo ${result.version} actualizadas: ${result.predicciones_generadas} perfiles disponibles.`, "success");
    await loadModels();
    setNotice("modelMessage", `Predicciones del modelo ${result.version} actualizadas: ${result.predicciones_generadas} perfiles disponibles.`, "success");
  } catch (cause) {
    setNotice("modelMessage", cause.message, "error");
  }
}

export { loadModels, populateModelDatasets, modelTableMessage, renderModels, renderModelDetails, modelText, trainModel, activateModel, refreshPredictions };
