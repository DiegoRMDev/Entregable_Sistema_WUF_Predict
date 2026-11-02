// Cliente integrado de la maqueta WUF Predict.
const HOME = { analista: "dashboard", marketing: "dashboard", ayuda: "dashboard" };
const ROLE_LABELS = {
  analista: "Analista de Datos",
  marketing: "Marketing",
  ayuda: "Área de Ayuda",
};
const API_BASE = window.WUF_CONFIG?.apiBaseUrl?.replace(/\/$/, "");
let currentPrioritizationReport = null;
let selectedSegmentationModelId = null;
let segmentationScatterRequestId = 0;
let selectedSegmentationScatterCluster = null;
let currentUser = null;
let alertItems = [];

function $(id) { return document.getElementById(id); }
const toastEntries = new Map();

// Los avisos de todos los módulos se muestran en una región global común.

export { HOME, ROLE_LABELS, API_BASE, currentPrioritizationReport, selectedSegmentationModelId, segmentationScatterRequestId, selectedSegmentationScatterCluster, currentUser, alertItems, $, toastEntries };
