function allowed(view) {
  const current = session();
  const link = document.querySelector(`.navitem[data-view="${CSS.escape(view)}"]`);
  return Boolean(current && link && !link.classList.contains("hidden"));
}

function showView(name) {
  if (!allowed(name)) name = "dashboard";
  document.querySelectorAll(".view").forEach((view) => view.classList.add("hidden"));
  const activeView = $(`view-${name}`);
  if (!activeView) return;
  if (name !== "configuracion") $("passwordForm")?.reset();
  activeView.classList.remove("hidden");
  document.querySelectorAll(".navitem").forEach((nav) => nav.classList.toggle("active", nav.dataset.view === name));
  $("topTitle").textContent = activeView.querySelector("h1")?.textContent || "WUF Predict";
  closeSidebar();
  if (location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
  window.scrollTo(0, 0);
  if (name === "dashboard") loadDashboard();
  if (name === "recoleccion") {
    // Al volver a la sección se limpia cualquier aviso de la visita anterior.
    setNotice("collectionMessage");
    loadCollection();
  }
  if (name === "dataset") loadDataset();
  if (name === "entrenamiento") {
    loadModels();
    loadConsistencyReport();
    loadSegmentationModels();
    refreshAlertBadge();
  }
  if (name === "alertas") loadAlerts();
  if (name === "catalogo") loadCatalog();
  if (name === "reporte") loadPrioritizationReport();
}

// El Dashboard solo resume resultados persistidos por los módulos anteriores.

export { allowed, showView };
