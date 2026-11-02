import * as appState from "./core/state.js";
import * as toastModule from "./components/toasts.js";
import * as apiModule from "./api/client.js";
import * as authModule from "./auth/session.js";
import * as navigationModule from "./core/navigation.js";
import * as dashboardModule from "./pages/dashboard.js";
import * as uiModule from "./core/ui.js";
import * as collectionModule from "./pages/collection.js";
import * as datasetModule from "./pages/dataset.js";
import * as modelTableModule from "./components/model-table.js";
import * as modelsModule from "./pages/models.js";
import * as consistencyModule from "./pages/consistency.js";
import * as segmentationModule from "./pages/segmentation.js";
import * as alertsModule from "./pages/alerts.js";
import * as catalogModule from "./pages/catalog.js";
import * as reportsModule from "./pages/reports.js";

// Puente de compatibilidad: publica las funciones compartidas y los manejadores
// que aún usa el HTML; los módulos se cargan mediante imports desde este punto.
Object.assign(window, appState, toastModule, apiModule, authModule, navigationModule, dashboardModule, uiModule, collectionModule, datasetModule, modelTableModule, modelsModule, consistencyModule, segmentationModule, alertsModule, catalogModule, reportsModule, { selectModelTab });

document.addEventListener("DOMContentLoaded", async () => {
  if (window.lucide) window.lucide.createIcons();
  applyTheme(localStorage.getItem("wuf.theme") || "sistema");
  document.querySelectorAll("[data-model-tab]").forEach((tab) => {
    tab.addEventListener("click", () => selectModelTab(tab.dataset.modelTab));
    tab.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const tabs = [...document.querySelectorAll("[data-model-tab]")];
        const currentIndex = tabs.indexOf(tab);
        const step = event.key === "ArrowRight" ? 1 : -1;
        const nextTab = tabs[(currentIndex + step + tabs.length) % tabs.length];
        const next = nextTab.dataset.modelTab;
        selectModelTab(next);
        nextTab.focus();
      }
    });
  });
  document.querySelectorAll(".navitem").forEach((nav) => {
    nav.addEventListener("click", (event) => { event.preventDefault(); showView(nav.dataset.view); });
  });
  window.addEventListener("hashchange", () => { if (session()) showView(location.hash.slice(1)); });
  $("profileForm").addEventListener("submit", saveProfileName);
  $("passwordForm").addEventListener("submit", changeAccountPassword);
  $("chooseCollectionFileButton").addEventListener("click", () => $("collectionCsvFile").click());
  $("collectionCsvFile").addEventListener("change", (event) => {
    const file = event.currentTarget.files?.[0];
    $("collectionFileName").textContent = file ? file.name : "No hay archivo seleccionado.";
    $("runCollectionButton").disabled = !file;
    setNotice("collectionMessage");
  });
  $("runCollectionButton").addEventListener("click", runCollection);
  $("generateDatasetButton").addEventListener("click", generateDataset);
  $("exportDatasetButton").addEventListener("click", exportDataset);
  $("trainModelButton").addEventListener("click", trainModel);
  $("trainSegmentationButton").addEventListener("click", trainSegmentationModel);
  $("segmentationHistory").addEventListener("click", (event) => {
    const view = event.target.closest("button[data-segmentation-view]");
    const activate = event.target.closest("button[data-segmentation-activate]");
    const refresh = event.target.closest("button[data-segmentation-refresh]");
    if (view) {
      selectedSegmentationModelId = Number(view.dataset.segmentationView);
      void api("/segmentation/models")
        .then((page) => renderSegmentationModels(page.items || []))
        .catch((cause) => setNotice("segmentationMessage", cause.message, "error"));
    } else if (activate) {
      activateSegmentationModel(Number(activate.dataset.segmentationActivate), activate);
    } else if (refresh) {
      refreshSegmentationModel(refresh);
    }
  });
  $("segmentationScatterLegend").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-scatter-cluster]");
    if (!button) return;
    const cluster = Number(button.dataset.scatterCluster);
    applySegmentationScatterFilter(selectedSegmentationScatterCluster === cluster ? null : cluster);
  });
  $("trainConsistencyButton").addEventListener("click", trainConsistencyModel);
  $("consistencyHistory").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-consistency-model-id]");
    if (button) showConsistencyVersion(Number(button.dataset.consistencyModelId));
  });
  $("consistencySearch").addEventListener("input", renderAlerts);
  $("alertStateFilter").addEventListener("change", renderAlerts);
  $("view-alertas").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-alert-id][data-alert-state]");
    if (button) attendAlert(button);
  });
  $("catalogSearch").addEventListener("input", applyCatalogFilters);
  $("catalogStateFilter").addEventListener("change", applyCatalogFilters);
  $("catalogPriorityFilter").addEventListener("change", applyCatalogFilters);
  $("reportSearch").addEventListener("input", applyPrioritizationFilters);
  $("reportPriorityFilter").addEventListener("change", applyPrioritizationFilters);
  $("reportOe3Search").addEventListener("input", applyOe3Filters);
  $("reportOe3Filter").addEventListener("change", applyOe3Filters);
  $("reportHistoryRows").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-report-history-id]");
    if (button) downloadSavedReport(button.dataset.reportHistoryId, button.dataset.reportFormat, button);
  });
  $("reportChartCard").addEventListener("click", (event) => {
    const button = event.target.closest(".report-help-button");
    if (!button) return;
    const help = button.closest(".report-help");
    const shouldOpen = !help.classList.contains("is-open");
    document.querySelectorAll("#reportChartCard .report-help.is-open").forEach((item) => {
      item.classList.remove("is-open");
      item.querySelector(".report-help-button")?.setAttribute("aria-expanded", "false");
    });
    if (shouldOpen) {
      help.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
    }
  });
  $("reportChartCard").addEventListener("focusout", (event) => {
    const help = event.target.closest(".report-help");
    if (!help || help.contains(event.relatedTarget)) return;
    help.classList.remove("is-open");
    help.querySelector(".report-help-button")?.setAttribute("aria-expanded", "false");
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("#reportChartCard .report-help")) return;
    document.querySelectorAll("#reportChartCard .report-help.is-open").forEach((item) => {
      item.classList.remove("is-open");
      item.querySelector(".report-help-button")?.setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll("#reportChartCard .report-help.is-open").forEach((item) => {
      item.classList.remove("is-open");
      item.querySelector(".report-help-button")?.setAttribute("aria-expanded", "false");
    });
  });
  $("exportReportPdf").addEventListener("click", () => exportPrioritizationReport("pdf"));
  $("exportReportXlsx").addEventListener("click", () => exportPrioritizationReport("xlsx"));
  $("datasetFrom").addEventListener("change", () => {
    if ($("datasetTo").value <= $("datasetFrom").value) {
      const nextCapture = (window.datasetSources || []).find((capture) =>
        capture.fecha_captura > $("datasetFrom").value);
      if (nextCapture) $("datasetTo").value = nextCapture.fecha_captura;
    }
    updateDatasetHorizon();
  });
  $("datasetTo").addEventListener("change", updateDatasetHorizon);
  $("datasetSearch").addEventListener("input", applyDatasetFilters);
  $("datasetLabelFilter").addEventListener("change", applyDatasetFilters);
  $("sidebarToggle").addEventListener("click", openSidebar);
  $("sidebarClose").addEventListener("click", closeSidebar);
  $("sidebarBackdrop").addEventListener("click", closeSidebar);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });
  const current = session();
  if (!current?.accessToken) {
    showLoginScreen();
    return;
  }
  try {
    const user = await api("/auth/me");
    enterApp(user, location.hash.slice(1) || HOME[user.rol]);
  } catch (_cause) {
    sessionStorage.removeItem("wuf.session");
    showLoginScreen();
  }
});

// Alterna los paneles de entrenamiento y mantiene accesible el estado activo.
function selectModelTab(name) {
  const panels = { adoption: "adoptionPanel", consistency: "consistencyPanel", segmentation: "segmentationPanel" };
  document.querySelectorAll("[data-model-tab]").forEach((tab) => {
    const active = tab.dataset.modelTab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  Object.entries(panels).forEach(([key, panelId]) => { $(panelId).hidden = key !== name; });
}

export { selectModelTab };
