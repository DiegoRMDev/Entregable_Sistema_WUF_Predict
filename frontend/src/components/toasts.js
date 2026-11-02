function setNotice(id, text = "", state = "") {
  const current = toastEntries.get(id);
  if (current?.timer) window.clearTimeout(current.timer);
  if (!text) {
    current?.element.remove();
    toastEntries.delete(id);
    return;
  }

  const region = $("toastRegion");
  if (!region) return;
  const severity = ["success", "warning", "error", "loading"].includes(state) ? state : "info";
  const labels = { success: "Listo", warning: "Aviso", error: "Error", loading: "Procesando", info: "Información" };
  const symbols = { success: "✓", warning: "!", error: "×", loading: "…", info: "i" };
  let element = current?.element;
  if (!element) {
    element = document.createElement("div");
    element.className = "toast";
    const icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.setAttribute("aria-hidden", "true");
    const content = document.createElement("div");
    content.className = "toast-content";
    const title = document.createElement("strong");
    title.className = "toast-title";
    const message = document.createElement("span");
    message.className = "toast-message";
    content.append(title, message);
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "toast-dismiss";
    dismiss.setAttribute("aria-label", "Cerrar mensaje");
    dismiss.textContent = "×";
    dismiss.addEventListener("click", () => dismissToast(id));
    element.append(icon, content, dismiss);
    region.append(element);
  }

  element.className = `toast toast-${severity}`;
  element.setAttribute("role", severity === "error" ? "alert" : "status");
  element.setAttribute("aria-live", severity === "error" ? "assertive" : "polite");
  element.setAttribute("aria-atomic", "true");
  element.querySelector(".toast-icon").textContent = symbols[severity];
  element.querySelector(".toast-title").textContent = labels[severity];
  element.querySelector(".toast-message").textContent = text;

  // Los mensajes de proceso siguen visibles hasta que la operación termine; los demás caducan solos.
  const timeout = { success: 5500, warning: 8000, error: 9000, info: 6500 }[severity];
  const entry = { element, timer: null };
  if (severity !== "loading") {
    entry.timer = window.setTimeout(() => {
      if (toastEntries.get(id) === entry) dismissToast(id);
    }, timeout);
  }
  toastEntries.set(id, entry);
}

function dismissToast(id) {
  const entry = toastEntries.get(id);
  if (!entry) return;
  if (entry.timer) window.clearTimeout(entry.timer);
  entry.element.remove();
  toastEntries.delete(id);
}

export { setNotice, dismissToast };
