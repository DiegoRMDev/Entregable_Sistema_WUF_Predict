async function loadSegmentationModels() {
  const history = $("segmentationHistory");
  history.replaceChildren(modelTableMessage("Cargando segmentaciones…", 7));
  try {
    const [options, page] = await Promise.all([
      api("/segmentation/options"), api("/segmentation/models"),
    ]);
    const capture = options.captura;
    const permittedClusters = new Set(options.segmentos_permitidos || []);
    const clusterSelect = $("segmentationK");
    [...clusterSelect.options].forEach((option) => {
      option.disabled = !permittedClusters.has(Number(option.value));
    });
    if (clusterSelect.selectedOptions[0]?.disabled && permittedClusters.size) {
      clusterSelect.value = String(Math.min(...permittedClusters));
    }
    $("segmentationOptionsSummary").textContent = capture
      ? `Captura semana ${capture.semana} · ${options.perfiles_disponibles} mascotas disponibles; ${options.perfiles_con_criterios} cumplen uno o más criterios de perfil desfavorecido. K-Means agrupa todas. Variables: edad, tamaño, energía y condición especial.`
      : "Importa una captura completa antes de entrenar K-Means.";
    $("trainSegmentationButton").disabled = options.estado !== "listo";
    renderSegmentationModels(page.items || []);
  } catch (cause) {
    history.replaceChildren(modelTableMessage("No se pudo cargar el historial de segmentación.", 7));
    $("segmentationOptionsSummary").textContent = cause.message;
    $("trainSegmentationButton").disabled = true;
  }
}

function renderSegmentationModels(models) {
  const storedActive = models.find((model) => model.es_vigente);
  const active = models.find((model) => model.es_vigente && model.compatible_enfoque);
  const selected = models.find((model) => model.id_modelo_segmentacion === selectedSegmentationModelId)
    || active || storedActive;
  const title = $("segmentationModelTitle");
  const status = $("segmentationModelStatus");
  const summary = $("segmentationModelSummary");
  const cards = $("segmentationClusterSummaries");
  cards.replaceChildren();
  if (!selected) {
    title.textContent = "Segmentación vigente";
    status.textContent = "Sin modelo";
    status.className = "tag neutral";
    summary.textContent = "Entrena una versión K-Means para agrupar todas las mascotas disponibles.";
  } else {
    const isActive = Boolean(selected.es_vigente);
    title.textContent = `${isActive ? "Segmentación vigente" : "Detalle de versión"} · K-Means ${selected.version}`;
    const isCompatible = Boolean(selected.compatible_enfoque);
    status.textContent = isActive && !isCompatible
      ? "Requiere reentrenamiento"
      : isCompatible && isActive ? "Vigente"
        : isCompatible && selected.estado === "candidato" ? "Pendiente de activar"
          : isCompatible ? "Anterior" : "Método anterior";
    // Reutiliza el color de estado activo que ya emplean los otros modelos.
    status.className = `tag ${isActive && isCompatible ? "alta" : "neutral"}`;
    summary.textContent = `${selected.cantidad_perfiles} perfiles · ${selected.cantidad_clusters} segmentos · silhouette ${Number(selected.silhouette_score).toFixed(3)} · captura semana ${selected.semana_referencia} · ${formatReportDate(selected.fecha_entrenamiento)}.${isCompatible ? "" : " Esta versión agrupó solo perfiles que cumplían criterios; entrena una nueva versión para cubrir todo el catálogo."}`;
    (selected.resumen_clusters || []).forEach((cluster) => {
      const card = document.createElement("div");
      card.className = "segmentation-cluster-card";
      const heading = document.createElement("strong");
      heading.textContent = `${cluster.nombre}: ${cluster.cantidad_perfiles} perfiles`;
      const details = document.createElement("span");
      const age = cluster.edad_mediana_meses === null ? "edad mediana no disponible" : `edad mediana ${cluster.edad_mediana_meses} meses`;
      const concentration = cluster.perfiles_con_atributos_desfavorecidos === undefined
        ? ""
        : ` · Con atributos desfavorecidos: ${cluster.perfiles_con_atributos_desfavorecidos} de ${cluster.cantidad_perfiles} (${Number(cluster.porcentaje_con_atributos_desfavorecidos).toFixed(1)} %)`;
      details.textContent = `Tamaño frecuente: ${cluster.tamano_frecuente} · Energía frecuente: ${cluster.energia_frecuente} · ${age} · edades estimadas: ${cluster.edades_estimadas} · edades no indicadas: ${cluster.edades_no_indicadas}${concentration}`;
      card.append(heading, details);
      cards.append(card);
    });
  }

  const scatterCard = $("segmentationScatterCard");
  if (selected) {
    scatterCard.hidden = false;
    void loadSegmentationScatter(selected.id_modelo_segmentacion);
  } else {
    // Invalida cualquier solicitud anterior si ya no hay un modelo que mostrar.
    segmentationScatterRequestId += 1;
    scatterCard.hidden = true;
  }

  const body = $("segmentationHistory");
  body.replaceChildren();
  if (!models.length) body.append(modelTableMessage("Todavía no hay modelos de segmentación.", 7));
  models.forEach((model) => {
    const row = document.createElement("tr");
    appendTextCell(row, model.version);
    appendTextCell(row, `Semana ${model.semana_referencia} · ${formatCaptureDate(model.fecha_captura_referencia)}`);
    appendTextCell(row, String(model.cantidad_perfiles), "num");
    appendTextCell(row, String(model.cantidad_clusters), "num");
    appendTextCell(row, Number(model.silhouette_score).toFixed(3), "num");
    appendTextCell(row, model.es_vigente && !model.compatible_enfoque
      ? "Requiere reentrenamiento"
      : !model.compatible_enfoque ? "Método anterior"
        : model.es_vigente ? "Vigente" : model.estado === "candidato" ? "Pendiente de activar" : "Anterior");
    const action = document.createElement("td");
    const actionGroup = document.createElement("div");
    actionGroup.className = "segmentation-actions";
    const view = document.createElement("button");
    view.type = "button";
    view.dataset.segmentationView = String(model.id_modelo_segmentacion);
    view.textContent = "Ver";
    actionGroup.append(view);
    if (model.estado === "candidato" && model.compatible_enfoque) {
      const activate = document.createElement("button");
      activate.type = "button";
      activate.className = "primary";
      activate.dataset.segmentationActivate = String(model.id_modelo_segmentacion);
      activate.textContent = "Activar";
      actionGroup.append(activate);
    }
    if (model.es_vigente && model.compatible_enfoque) {
      const refresh = document.createElement("button");
      refresh.type = "button";
      refresh.dataset.segmentationRefresh = "true";
      refresh.textContent = "Actualizar captura";
      actionGroup.append(refresh);
    }
    action.append(actionGroup);
    row.append(action);
    body.append(row);
  });
}

async function loadSegmentationScatter(modelId) {
  const requestId = ++segmentationScatterRequestId;
  const host = $("segmentationScatter");
  const legend = $("segmentationScatterLegend");
  host.textContent = "Cargando gráfico…";
  legend.replaceChildren();
  selectedSegmentationScatterCluster = null;
  $("segmentationScatterNote").textContent = "Preparando la proyección de los perfiles de esta versión…";
  try {
    const plot = await api(`/segmentation/models/${encodeURIComponent(modelId)}/scatter`);
    if (requestId !== segmentationScatterRequestId) return;
    renderSegmentationScatter(plot);
  } catch (cause) {
    if (requestId !== segmentationScatterRequestId) return;
    host.textContent = cause.message || "No se pudo cargar el gráfico de dispersión.";
    $("segmentationScatterNote").textContent = "No se pudo preparar la proyección de esta versión.";
  }
}

function renderSegmentationScatter(plot) {
  const host = $("segmentationScatter");
  const legend = $("segmentationScatterLegend");
  host.replaceChildren();
  legend.replaceChildren();
  const points = plot.points || [];
  if (!points.length) {
    host.textContent = "Esta versión no tiene perfiles para graficar.";
    $("segmentationScatterNote").textContent = "No hay perfiles asignados a esta versión.";
    return;
  }

  // El SVG es nativo para evitar añadir una librería de gráficos al frontend.
  const svgNs = "http://www.w3.org/2000/svg";
  const makeSvgElement = (name, attributes = {}) => {
    const element = document.createElementNS(svgNs, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  };
  const width = 760;
  const height = 430;
  const plotArea = { left: 72, right: 735, top: 24, bottom: 350 };
  const svg = makeSvgElement("svg", {
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": `Dispersión de ${points.length} perfiles agrupados por K-Means, versión ${plot.version}`,
    class: "segmentation-scatter-svg",
  });
  const title = makeSvgElement("title");
  title.textContent = `Segmentos de K-Means ${plot.version}`;
  svg.append(title);

  const xValues = points.map((point) => Number(point.x));
  const yValues = points.map((point) => Number(point.y));
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const x = (value) => plotArea.left + ((Number(value) - xMin) / xRange) * (plotArea.right - plotArea.left);
  const y = (value) => plotArea.bottom - ((Number(value) - yMin) / yRange) * (plotArea.bottom - plotArea.top);
  const tickValue = (value) => Math.abs(Number(value)) < 0.05 ? "0" : Number(value).toFixed(1);

  // Las marcas numéricas muestran la escala de las coordenadas PCA de cada punto.
  for (let index = 0; index <= 4; index += 1) {
    const gridX = plotArea.left + ((plotArea.right - plotArea.left) * index) / 4;
    const gridY = plotArea.top + ((plotArea.bottom - plotArea.top) * index) / 4;
    const valueX = xMin + (xRange * index) / 4;
    const valueY = yMax - (yRange * index) / 4;
    svg.append(makeSvgElement("line", { x1: gridX, y1: plotArea.top, x2: gridX, y2: plotArea.bottom, class: "segmentation-scatter-grid" }));
    svg.append(makeSvgElement("line", { x1: plotArea.left, y1: gridY, x2: plotArea.right, y2: gridY, class: "segmentation-scatter-grid" }));
    const xTick = makeSvgElement("text", { x: gridX, y: plotArea.bottom + 20, "text-anchor": "middle", class: "segmentation-scatter-tick" });
    xTick.textContent = tickValue(valueX);
    const yTick = makeSvgElement("text", { x: plotArea.left - 9, y: gridY + 4, "text-anchor": "end", class: "segmentation-scatter-tick" });
    yTick.textContent = tickValue(valueY);
    svg.append(xTick, yTick);
  }
  svg.append(makeSvgElement("line", { x1: plotArea.left, y1: plotArea.bottom, x2: plotArea.right, y2: plotArea.bottom, class: "segmentation-scatter-axis" }));
  svg.append(makeSvgElement("line", { x1: plotArea.left, y1: plotArea.top, x2: plotArea.left, y2: plotArea.bottom, class: "segmentation-scatter-axis" }));

  const variance = plot.explained_variance_ratio || [];
  const firstVariance = Number(variance[0] || 0) * 100;
  const secondVariance = Number(variance[1] || 0) * 100;
  const combinedVariance = firstVariance + secondVariance;
  $("segmentationScatterNote").textContent = `La vista 2D resume ${combinedVariance.toFixed(1)} % de la variación (PC1: ${firstVariance.toFixed(1)} %; PC2: ${secondVariance.toFixed(1)} %). Cada punto es un perfil; el gráfico proyecta las variables para mostrarlas, mientras K-Means agrupa usando todas las variables. Selecciona un segmento en la leyenda para enfocarlo; vuelve a pulsarlo para mostrar todos.`;
  const xLabel = makeSvgElement("text", { x: (plotArea.left + plotArea.right) / 2, y: 405, "text-anchor": "middle", class: "segmentation-scatter-label" });
  xLabel.textContent = `Componente principal 1 (${firstVariance.toFixed(1)} %)`;
  const yLabel = makeSvgElement("text", { x: 18, y: (plotArea.top + plotArea.bottom) / 2, transform: `rotate(-90 18 ${(plotArea.top + plotArea.bottom) / 2})`, "text-anchor": "middle", class: "segmentation-scatter-label" });
  yLabel.textContent = `Componente principal 2 (${secondVariance.toFixed(1)} %)`;
  svg.append(xLabel, yLabel);

  const counts = new Map();
  points.forEach((point) => {
    const cluster = Number(point.numero_segmento);
    counts.set(cluster, (counts.get(cluster) || 0) + 1);
    const circle = makeSvgElement("circle", {
      cx: x(point.x), cy: y(point.y), r: 6,
      class: `segmentation-scatter-point cluster-${cluster}`,
      "data-point-cluster": cluster,
      tabindex: "0",
      "aria-label": `${point.sku} ${point.nombre}, segmento ${cluster}, atributos desfavorecidos: ${(point.atributos_desfavorecidos || []).join(", ") || "ninguno"}, PC1 ${tickValue(point.x)}, PC2 ${tickValue(point.y)}`,
    });
    const tooltip = makeSvgElement("title");
    tooltip.textContent = `${point.sku} · ${point.nombre} · Segmento ${cluster} · Atributos desfavorecidos: ${(point.atributos_desfavorecidos || []).join(", ") || "ninguno"} · PC1 ${tickValue(point.x)} · PC2 ${tickValue(point.y)}`;
    circle.append(tooltip);
    svg.append(circle);
  });
  host.append(svg);

  [...counts.entries()].sort(([left], [right]) => left - right).forEach(([cluster, count]) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "segmentation-legend-item";
    item.dataset.scatterCluster = String(cluster);
    item.setAttribute("aria-pressed", "false");
    item.title = "Enfocar este segmento; vuelve a pulsar para mostrar todos";
    const swatch = document.createElement("span");
    swatch.className = `segmentation-legend-swatch cluster-${cluster}`;
    swatch.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = `Segmento ${cluster} · ${count} perfiles`;
    item.append(swatch, label);
    legend.append(item);
  });
}

// La leyenda permite enfocar un grupo sin eliminar perfiles del gráfico.
function applySegmentationScatterFilter(cluster) {
  selectedSegmentationScatterCluster = cluster;
  document.querySelectorAll("[data-point-cluster]").forEach((point) => {
    point.classList.toggle("is-filtered", cluster !== null && point.dataset.pointCluster !== String(cluster));
  });
  document.querySelectorAll("[data-scatter-cluster]").forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.scatterCluster) === cluster));
  });
}

async function trainSegmentationModel() {
  const button = $("trainSegmentationButton");
  button.disabled = true;
  setNotice("segmentationMessage", "Entrenando y evaluando agrupaciones…", "loading");
  try {
    const candidate = await api("/segmentation/models/train", {
      method: "POST", body: JSON.stringify({ cantidad_clusters: Number($("segmentationK").value) }),
    });
    selectedSegmentationModelId = candidate.id_modelo_segmentacion;
    await loadSegmentationModels();
    setNotice("segmentationMessage", `K-Means ${candidate.version} agrupó ${candidate.cantidad_perfiles} mascotas disponibles. Silhouette ${Number(candidate.silhouette_score).toFixed(3)}; revisa los grupos y actívalo si te resultan útiles.`, "success");
  } catch (cause) {
    setNotice("segmentationMessage", cause.message, "error");
  } finally {
    button.disabled = false;
  }
}

async function activateSegmentationModel(modelId, button) {
  button.disabled = true;
  setNotice("segmentationMessage", "Aplicando K-Means a la captura vigente…", "loading");
  try {
    const result = await api(`/segmentation/models/${encodeURIComponent(modelId)}/activate`, { method: "POST" });
    selectedSegmentationModelId = result.id_modelo_segmentacion;
    await loadSegmentationModels();
    setNotice("segmentationMessage", `Segmentación ${result.version} activada para ${result.asignaciones_actualizadas} mascotas disponibles de la semana ${result.semana_aplicada}.`, "success");
  } catch (cause) {
    setNotice("segmentationMessage", cause.message, "error");
  } finally {
    button.disabled = false;
  }
}

async function refreshSegmentationModel(button) {
  button.disabled = true;
  setNotice("segmentationMessage", "Actualizando segmentos para la última captura…", "loading");
  try {
    const result = await api("/segmentation/models/current/refresh", { method: "POST" });
    await Promise.all([loadSegmentationModels(), loadPrioritizationReport()]);
    setNotice("segmentationMessage", `Se actualizaron ${result.asignaciones_actualizadas} perfiles en la semana ${result.semana_aplicada}.`, "success");
  } catch (cause) {
    setNotice("segmentationMessage", cause.message, "error");
  } finally {
    button.disabled = false;
  }
}

export { loadSegmentationModels, renderSegmentationModels, loadSegmentationScatter, renderSegmentationScatter, applySegmentationScatterFilter, trainSegmentationModel, activateSegmentationModel, refreshSegmentationModel };
