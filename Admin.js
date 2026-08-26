/* ============================================================
   PÁGINA DE EXISTENCIAS
   ------------------------------------------------------------
   Arma el contenido de disponibilidad.json con interruptores, para
   no tener que escribir JSON a mano desde el celular (una coma de
   más y el archivo deja de servir).

   No guarda nada ni pide contraseñas: solo genera el texto. El
   cambio se aplica cuando lo pegas en GitHub.
   ============================================================ */

// Cambia esto si algún día mueves el repositorio.
const REPO = "luisangelhdzz/QuequitosYMateriasPrimasByGris";
const RAMA = "main";

const estado = {
  agotados: new Set(),          // ids de productos agotados por completo
  colores: new Map(),           // id de producto -> Set de valores agotados
};

/* ------------------------------------------------------------
   Carga lo que ya está publicado, para no perder lo marcado antes
   ------------------------------------------------------------ */
async function cargarEstadoActual() {
  try {
    const r = await fetch(`disponibilidad.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return;
    const datos = await r.json();
    (datos.agotados || []).forEach((id) => estado.agotados.add(id));
    Object.entries(datos.coloresAgotados || {}).forEach(([id, valores]) => {
      estado.colores.set(id, new Set(valores));
    });
  } catch (e) {
    // Primera vez, o el archivo todavía no existe: se empieza en limpio.
  }
}

/* ------------------------------------------------------------
   Pintado
   ------------------------------------------------------------ */
function esc(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function valoresDeOpciones(p) {
  // Solo tiene sentido marcar existencias por valor en los grupos de color
  // o presentación; se muestran todos los grupos que tenga el producto.
  return (p.opciones || []).map((g) => ({
    etiqueta: g.etiqueta,
    tipo: g.tipo,
    valores: g.valores.map((v) => ({ valor: v.valor, hex: v.hex })),
  }));
}

function pintarLista(filtro = "") {
  const lista = document.getElementById("lista");
  const texto = filtro.trim().toLowerCase();

  const visibles = PRODUCTOS.filter((p) =>
    !texto || p.nombre.toLowerCase().includes(texto) || p.id.toLowerCase().includes(texto)
  );

  if (!visibles.length) {
    lista.innerHTML = `<p class="vacio">No hay productos que coincidan con “${esc(filtro)}”.</p>`;
    return;
  }

  lista.innerHTML = visibles.map((p) => {
    const agotado = estado.agotados.has(p.id);
    const sinColor = estado.colores.get(p.id) || new Set();

    const grupos = valoresDeOpciones(p).map((g) => {
      const chips = g.valores.map((v) => {
        const apagado = sinColor.has(v.valor);
        const muestra = v.hex
          ? `<span class="pizca" style="background:${esc(v.hex)}"></span>` : "";
        return `
          <button type="button"
            class="chip${apagado ? " chip--agotado" : ""}"
            data-producto="${esc(p.id)}" data-valor="${esc(v.valor)}"
            ${agotado ? "disabled" : ""}>
            ${muestra}${esc(v.valor)}
          </button>`;
      }).join("");
      return `
        <div class="grupo">
          <span class="grupo-nombre">${esc(g.etiqueta)}</span>
          <div class="chips">${chips}</div>
        </div>`;
    }).join("");

    return `
      <article class="fila${agotado ? " fila--agotada" : ""}">
        <div class="fila-cabeza">
          <div>
            <h3>${esc(p.nombre)}</h3>
            <span class="id">${esc(p.id)}</span>
          </div>
          <label class="switch">
            <input type="checkbox" data-producto-todo="${esc(p.id)}" ${agotado ? "" : "checked"} />
            <span class="pista"></span>
            <span class="etiqueta">${agotado ? "Agotado" : "Hay"}</span>
          </label>
        </div>
        ${grupos ? `<div class="grupos">${grupos}</div>` : ""}
        ${grupos && agotado ? `<p class="nota-fila">El producto entero está agotado, así que los colores no importan.</p>` : ""}
      </article>`;
  }).join("");
}

function actualizarSalida() {
  const coloresAgotados = {};
  estado.colores.forEach((valores, id) => {
    // Si el producto entero está agotado, no tiene caso listar sus colores
    if (estado.agotados.has(id)) return;
    if (valores.size) coloresAgotados[id] = [...valores].sort();
  });

  const salida = {
    _ayuda: "Productos y colores agotados. Generado desde admin.html. Si este archivo tiene un error de sintaxis, el sitio lo ignora y muestra todo disponible.",
    _actualizado: new Date().toISOString().slice(0, 10),
    agotados: [...estado.agotados].sort(),
    coloresAgotados,
  };

  document.getElementById("json").value = JSON.stringify(salida, null, 2) + "\n";

  const nProd = estado.agotados.size;
  const nCol = Object.values(coloresAgotados).reduce((s, v) => s + v.length, 0);
  const partes = [];
  if (nProd) partes.push(`${nProd} producto${nProd === 1 ? "" : "s"} agotado${nProd === 1 ? "" : "s"}`);
  if (nCol) partes.push(`${nCol} color${nCol === 1 ? "" : "es"} agotado${nCol === 1 ? "" : "s"}`);
  document.getElementById("resumen").textContent = partes.length ? partes.join(" · ") : "Todo disponible";
}

/* ------------------------------------------------------------
   Eventos
   ------------------------------------------------------------ */
document.addEventListener("change", (e) => {
  const id = e.target.dataset?.productoTodo;
  if (!id) return;
  if (e.target.checked) estado.agotados.delete(id);
  else estado.agotados.add(id);
  pintarLista(document.getElementById("buscar").value);
  actualizarSalida();
});

document.addEventListener("click", (e) => {
  const chip = e.target.closest("[data-valor]");
  if (!chip || chip.disabled) return;
  const { producto, valor } = chip.dataset;
  if (!estado.colores.has(producto)) estado.colores.set(producto, new Set());
  const set = estado.colores.get(producto);
  if (set.has(valor)) set.delete(valor); else set.add(valor);
  pintarLista(document.getElementById("buscar").value);
  actualizarSalida();
});

document.getElementById("buscar").addEventListener("input", (e) => {
  pintarLista(e.target.value);
});

document.getElementById("copiar").addEventListener("click", async () => {
  const area = document.getElementById("json");
  const aviso = document.getElementById("aviso");
  try {
    await navigator.clipboard.writeText(area.value);
    aviso.textContent = "Copiado. Ahora pégalo en GitHub.";
  } catch (err) {
    // Safari viejo o sin permisos: al menos lo dejamos seleccionado
    area.removeAttribute("readonly");
    area.select();
    area.setAttribute("readonly", "");
    aviso.textContent = "Selecciónalo y cópialo a mano (⌘C o mantén presionado).";
  }
  aviso.classList.add("visible");
  setTimeout(() => aviso.classList.remove("visible"), 5000);
});

/* ------------------------------------------------------------
   Arranque
   ------------------------------------------------------------ */
document.getElementById("editarEnGitHub").href =
  `https://github.com/${REPO}/edit/${RAMA}/disponibilidad.json`;

cargarEstadoActual().then(() => {
  pintarLista();
  actualizarSalida();
});
