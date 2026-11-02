async function loadConsistencyReport() {
  try {
    const report = await api("/consistency/latest");
    renderConsistencyReport(report);
  } catch (cause) {
    setNotice("consistencyTrainingMessage", cause.message, "error");
  }
}
function renderConsistencyReport(report) {
  const model = report.model;
  const summary = $("consistencyModelSummary");
  const metrics = $("consistencyMetrics");
  const importance = $("consistencyImportance");
  const matrixBody = $("consistencyConfusion");
  metrics.replaceChildren();
  importance.replaceChildren();
  matrixBody.replaceChildren();

  if (!model) {
    $("consistencyResults").hidden = true;
    $("consistencyDiagramCard").hidden = true;
    $("consistencyTreeDiagram").replaceChildren();
    summary.textContent = "";
    $("consistencyModelStatus").textContent = "";
    $("consistencyModelStatus").hidden = true;
    $("consistencyEvaluationNote").textContent = "";
    $("consistencyEvaluationNote").hidden = true;
    importance.append(modelText("p", "Sin resultados todavía.", "muted"));
    matrixBody.append(modelTableMessage("Sin resultados todavía.", 4));
    $("consistencyRules").textContent = "";
    $("consistencyRulesDetails").hidden = true;
    renderConsistencyHistory(report.history || []);
    return;
  }

  $("consistencyResults").hidden = false;
  const metadata = model.metadatos_entrenamiento || {};
  renderConsistencyTreeDiagram(metadata.diagrama_arbol, model.version);
  const parameters = metadata.parametros || {};
  const trainCount = Number(model.nro_registros_entrenamiento) || 0;
  const testCount = Number(model.nro_registros_prueba) || 0;
  const testedRows = trainCount + testCount;
  const modelStatus = $("consistencyModelStatus");
  modelStatus.textContent = model.es_vigente
    ? `Modelo vigente · ${model.version}`
    : `Versión histórica consultada · ${model.version}`;
  modelStatus.hidden = false;
  summary.textContent = `${model.es_vigente ? "Árbol vigente" : "Detalle del árbol"} ${model.version} · ${trainCount} observaciones de entrenamiento · ${testCount} de prueba (${formatMetric(parameters.test_size)}) · profundidad ${parameters.max_depth} · ${formatDate(model.fecha_entrenamiento)}.`;
  [["Accuracy", model.accuracy_score], ["F1 macro", model.f1_macro_score]].forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "metric";
    card.append(modelText("div", formatMetric(value), "n"), modelText("div", label, "l"));
    metrics.append(card);
  });
  const distribution = `Distribución de prioridades de referencia: baja ${metadata.conteo_clases_proxy?.bajo || 0}, media ${metadata.conteo_clases_proxy?.medio || 0}, alta ${metadata.conteo_clases_proxy?.alto || 0} · ${testedRows} observaciones en entrenamiento y prueba.`;
  const comparison = metadata.comparacion_arbol_regla_catalogo;
  const comparisonText = comparison
    ? ` En la última captura, el árbol coincidió con la regla en ${comparison.coincidencias} de ${comparison.total} perfiles.`
    : "";
  $("consistencyEvaluationNote").textContent = `${distribution}${comparisonText}`;
  $("consistencyEvaluationNote").hidden = false;
  const importances = model.importancia_variables || [];
  importances.forEach((item) => {
    const label = modelText("div", item.feature);
    const track = document.createElement("div");
    track.className = "track";
    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.width = `${Math.max(1, Number(item.importance) * 100)}%`;
    track.append(fill);
    importance.append(label, track, modelText("div", Number(item.importance).toFixed(3), "v"));
  });
  const risks = ["bajo", "medio", "alto"];
  (model.matriz_confusion || []).forEach((values, index) => {
    const row = document.createElement("tr");
    appendTextCell(row, `Real: ${risks[index] || "—"}`);
    values.forEach((value) => appendTextCell(row, String(value), "num"));
    matrixBody.append(row);
  });
  if (!matrixBody.children.length) matrixBody.append(modelTableMessage("Sin matriz disponible.", 4));
  const rules = (model.reglas_arbol || "").trim();
  $("consistencyRules").textContent = rules;
  $("consistencyRulesDetails").hidden = !rules;
  renderConsistencyHistory(report.history || [], model.id_modelo_consistencia);
}

// Dibuja cada versión desde la estructura del estimador que envió el backend.
function renderConsistencyTreeDiagram(treeData, version) {
  const section = $("consistencyDiagramCard");
  const container = $("consistencyTreeDiagram");
  container.replaceChildren();
  if (!treeData || typeof treeData !== "object") {
    section.hidden = true;
    return;
  }

  const svgNamespace = "http://www.w3.org/2000/svg";
  const makeSvgElement = (tag, attributes = {}) => {
    const element = document.createElementNS(svgNamespace, tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
    return element;
  };
  const countLeaves = (node) => (node.left && node.right
    ? countLeaves(node.left) + countLeaves(node.right) : 1);
  const depthOf = (node) => (node.left && node.right
    ? 1 + Math.max(depthOf(node.left), depthOf(node.right)) : 0);

  const leaves = countLeaves(treeData);
  const depth = depthOf(treeData);
  const nodeWidth = 210;
  const nodeHeight = 82;
  const columnGap = 245;
  const horizontalPadding = 32;
  const verticalPadding = 28;
  const rowGap = 140;
  const width = Math.max(500, horizontalPadding * 2 + leaves * columnGap);
  const height = verticalPadding * 2 + (depth + 1) * rowGap;
  let leafIndex = 0;
  const positions = [];

  function place(node, level) {
    let centerX;
    if (node.left && node.right) {
      const leftX = place(node.left, level + 1);
      const rightX = place(node.right, level + 1);
      centerX = (leftX + rightX) / 2;
    } else {
      centerX = horizontalPadding + leafIndex * columnGap + columnGap / 2;
      leafIndex += 1;
    }
    positions.push({ node, level, centerX, top: verticalPadding + level * rowGap });
    return centerX;
  }
  place(treeData, 0);

  const svg = makeSvgElement("svg", {
    class: "tree-diagram-svg",
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    role: "img",
    "aria-label": `Diagrama del árbol de decisión ${version}`,
  });
  const title = makeSvgElement("title");
  title.textContent = `Árbol de decisión ${version}`;
  const description = makeSvgElement("desc");
  description.textContent = "Las ramas muestran las condiciones y las hojas el nivel de riesgo asignado.";
  svg.append(title, description);

  const nodePositions = new Map(positions.map((position) => [position.node, position]));
  positions.forEach(({ node, centerX, top }) => {
    if (!node.left || !node.right) return;
    [[node.left, "≤"], [node.right, ">"]].forEach(([child, direction]) => {
      const childPosition = nodePositions.get(child);
      const startY = top + nodeHeight;
      const endY = childPosition.top;
      const path = makeSvgElement("path", {
        class: "tree-diagram-edge",
        d: `M ${centerX} ${startY} L ${childPosition.centerX} ${endY}`,
      });
      svg.append(path);
      const edgeLabel = makeSvgElement("text", {
        class: "tree-diagram-edge-label",
        x: (centerX + childPosition.centerX) / 2,
        y: (startY + endY) / 2 - 4,
      });
      const threshold = Number(node.threshold).toLocaleString("es-PE", { maximumFractionDigits: 2 });
      edgeLabel.textContent = `${direction} ${threshold}`;
      svg.append(edgeLabel);
    });
  });

  const riskLabels = { bajo: "Bajo", medio: "Medio", alto: "Alto" };
  positions.forEach(({ node, centerX, top }) => {
    const group = makeSvgElement("g", { class: `tree-node risk-${node.prediction}` });
    group.append(makeSvgElement("rect", {
      x: centerX - nodeWidth / 2, y: top, width: nodeWidth, height: nodeHeight, rx: 10,
    }));
    const firstLine = makeSvgElement("text", { x: centerX, y: top + 26 });
    firstLine.textContent = node.feature || `Riesgo: ${riskLabels[node.prediction] || node.prediction}`;
    const secondLine = makeSvgElement("text", {
      class: "tree-node-secondary", x: centerX, y: top + 48,
    });
    secondLine.textContent = node.feature
      ? `Condición: ≤ ${Number(node.threshold).toLocaleString("es-PE", { maximumFractionDigits: 2 })}`
      : `${node.samples} observaciones`;
    group.append(firstLine, secondLine);
    if (node.feature) {
      const thirdLine = makeSvgElement("text", {
        class: "tree-node-secondary", x: centerX, y: top + 66,
      });
      thirdLine.textContent = `${node.samples} observaciones`;
      group.append(thirdLine);
    }
    svg.append(group);
  });
  container.append(svg);
  section.hidden = false;
}

function renderConsistencyHistory(history, selectedModelId = null) {
  const body = $("consistencyHistory");
  body.replaceChildren();
  if (!history.length) {
    body.append(modelTableMessage("Todavía no hay versiones.", 6));
    return;
  }
  history.forEach((version) => {
    const row = document.createElement("tr");
    appendTextCell(row, version.version);
    appendTextCell(row, version.es_vigente ? "Vigente" : "Anterior");
    appendTextCell(row, formatMetric(version.accuracy_score));
    appendTextCell(row, formatMetric(version.f1_macro_score));
    appendTextCell(row, formatDate(version.fecha_entrenamiento));
    const cell = document.createElement("td");
    const button = modelText("button", "Ver");
    button.type = "button";
    button.dataset.consistencyModelId = String(version.id_modelo_consistencia);
    button.disabled = Number(selectedModelId) === Number(version.id_modelo_consistencia);
    cell.append(button);
    row.append(cell);
    body.append(row);
  });
}

async function showConsistencyVersion(modelId) {
  try {
    const report = await api(`/consistency/history/${modelId}`);
    renderConsistencyReport(report);
  } catch (cause) {
    setNotice("consistencyTrainingMessage", cause.message, "error");
  }
}

export { loadConsistencyReport, renderConsistencyReport, renderConsistencyTreeDiagram, renderConsistencyHistory, showConsistencyVersion };
