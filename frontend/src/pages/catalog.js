async function loadCatalog() {
  const body = $("catalogRows");
  setNotice("catalogMessage");
  $("catalogFilterCount").textContent = "Cargando catálogo…";
  body.replaceChildren(modelTableMessage("Cargando catálogo…", 13));
  try {
    const result = await api("/models/predictions");
    body.replaceChildren();
    $("catalogLead").textContent = result.mensaje || (result.modelo_version
      ? `Catálogo vigente · predicciones del modelo ${result.modelo_version}.`
      : "Aún no hay un modelo publicado; los datos del catálogo se mostrarán sin predicciones.");
    if (!result.items.length) {
      body.append(modelTableMessage(result.mensaje || "Todavía no hay mascotas registradas en el catálogo.", 13));
      $("catalogFilterCount").textContent = "Mostrando 0 de 0";
      return;
    }
    result.items.forEach((pet) => {
      const row = document.createElement("tr");
      row.dataset.catalogPet = "true";
      row.dataset.search = normalizeCatalogSearch(`${pet.sku} ${pet.nombre}`);
      row.dataset.state = pet.estado_publicado;
      row.dataset.priority = pet.nivel_prioridad?.toLocaleLowerCase("es-PE") || "sin_prioridad";
      appendTextCell(row, pet.sku);
      appendTextCell(row, pet.nombre);
      appendTextCell(row, pet.especie);
      appendTextCell(row, pet.sexo === "H" ? "Hembra" : pet.sexo === "M" ? "Macho" : pet.sexo);
      appendTextCell(row, formatPetAge(pet.edad_meses, pet.edad_estimada));
      appendTextCell(row, pet.tipo_pelaje);
      appendTextCell(row, pet.tamano);
      appendTextCell(row, pet.nivel_energia);
      appendTextCell(row, pet.condicion_detalle || (pet.condicion_especial ? "Sí" : "Ninguna"), "wrap");
      appendTextCell(row, String(pet.orden_publicacion), "num");
      const state = document.createElement("td");
      const stateTag = document.createElement("span");
      stateTag.className = "tag neutral";
      stateTag.textContent = ({
        disponible: "Disponible", no_disponible: "No disponible", sin_publicar: "Sin publicar",
      })[pet.estado_publicado] || pet.estado_publicado;
      state.append(stateTag);
      row.append(state);
      const probability = document.createElement("td");
      if (pet.probabilidad_adopcion === null || pet.probabilidad_adopcion === undefined) {
        probability.textContent = pet.estado_publicado === "disponible" ? "Sin predicción" : "No aplica";
      } else {
        probability.textContent = formatMetric(pet.probabilidad_adopcion);
        probability.title = `Estimación proxy calculada a partir de la salida del catálogo · ${result.modelo_version}`;
      }
      row.append(probability);
      const priority = document.createElement("td");
      if (pet.nivel_prioridad) {
        const [label, cssClass] = pet.nivel_prioridad === "Alta" ? ["Alta", "alta"]
          : pet.nivel_prioridad === "Media" ? ["Media", "media"] : ["Baja", "baja"];
        const tag = document.createElement("span");
        tag.className = `tag ${cssClass}`;
        tag.textContent = label;
        priority.append(tag);
      } else priority.textContent = "—";
      row.append(priority);
      body.append(row);
    });
    applyCatalogFilters();
  } catch (cause) {
    body.replaceChildren(modelTableMessage("No se pudo cargar el catálogo.", 13));
    $("catalogFilterCount").textContent = "Mostrando 0 de 0";
    setNotice("catalogMessage", cause.message, "error");
  }
}

function normalizeCatalogSearch(value) {
  return value.toLocaleLowerCase("es-PE").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function applyCatalogFilters() {
  const body = $("catalogRows");
  const rows = [...body.querySelectorAll("tr[data-catalog-pet]")];
  const query = normalizeCatalogSearch($("catalogSearch").value.trim());
  const selectedState = $("catalogStateFilter").value;
  const selectedPriority = $("catalogPriorityFilter").value;
  let visible = 0;

  body.querySelector("#catalogNoMatches")?.remove();
  rows.forEach((row) => {
    const matches = (!query || row.dataset.search.includes(query))
      && (!selectedState || row.dataset.state === selectedState)
      && (!selectedPriority || row.dataset.priority === selectedPriority);
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  $("catalogFilterCount").textContent = `Mostrando ${visible} de ${rows.length}`;
  if (rows.length && !visible) {
    const emptyRow = modelTableMessage("No hay mascotas que coincidan con los filtros.", 13);
    emptyRow.id = "catalogNoMatches";
    body.append(emptyRow);
  }
}

function formatPetAge(months, estimated) {
  if (months === null || months === undefined) return "No indicada";
  const years = Math.floor(Number(months) / 12);
  const remainingMonths = Number(months) % 12;
  const age = years ? `${years} ${years === 1 ? "año" : "años"}${remainingMonths ? ` ${remainingMonths} meses` : ""}`
    : `${remainingMonths} ${remainingMonths === 1 ? "mes" : "meses"}`;
  return `${age}${estimated ? " (est.)" : ""}`;
}

export { loadCatalog, normalizeCatalogSearch, applyCatalogFilters, formatPetAge };
