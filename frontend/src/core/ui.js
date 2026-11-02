function openSidebar() {
  $("sidebar").classList.add("open");
  $("sidebarBackdrop").hidden = false;
  $("sidebarToggle").setAttribute("aria-expanded", "true");
  document.body.classList.add("sidebar-open");
}

function closeSidebar() {
  $("sidebar").classList.remove("open");
  $("sidebarBackdrop").hidden = true;
  $("sidebarToggle").setAttribute("aria-expanded", "false");
  document.body.classList.remove("sidebar-open");
}

function applyTheme(value) {
  if (value === "sistema") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", value);
  localStorage.setItem("wuf.theme", value);
  if ($("cfgTema")) $("cfgTema").value = value;
}

function formatDate(value) {
  if (!value) return "—";
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Lima",
  }).format(parsed);
}

function formatCaptureDate(value) {
  if (!value) return "—";
  // Las fechas de captura son calendarios (sin hora); UTC evita desplazarlas al día anterior en Lima.
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short", timeZone: "UTC",
  }).format(parsed);
}

function formatReportDate(value) {
  if (!value) return "—";
  // PostgreSQL guarda estas horas como hora local de Lima sin zona; se explicita -05:00 al mostrarlas.
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? value.replace(" ", "T")
    : `${value.replace(" ", "T")}-05:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Lima",
  }).format(parsed);
}

function statusPresentation(status) {
  const values = {
    completada: ["Completada", "alta"],
    parcial: ["Parcial", "media"],
    fallida: ["Fallida", "baja"],
    en_proceso: ["En proceso", "neutral"],
  };
  return values[status] || [status || "Desconocido", "neutral"];
}

function makeStatusTag(status) {
  const [label, cssClass] = statusPresentation(status);
  const tag = document.createElement("span");
  tag.className = `tag ${cssClass}`;
  tag.textContent = label;
  return tag;
}

export { openSidebar, closeSidebar, applyTheme, formatDate, formatCaptureDate, formatReportDate, statusPresentation, makeStatusTag };
