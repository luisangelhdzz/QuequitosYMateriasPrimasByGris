/* ============================================================
   QUEQUITOS Y MATERIAS PRIMAS BY GRIS
   Catálogo + selección de variantes + carrito + envío de pedido.

   El pedido se manda SIEMPRE por WhatsApp. Además, si en config.js
   está puesta la URL de tu API (CONFIG.apiPedidos), se manda también
   una copia en JSON a tu backend de Java/PostgreSQL.
   ============================================================ */

const BREAKPOINT_MOVIL = 870;   // debe coincidir con el media query de la barra en style.css
const IMAGENES_PRODUCTOS = [
  "img/foto_1.jpg","img/foto_2.jpg","img/foto_3.jpg","img/foto_4.jpg",
  "img/foto_5.jpg","img/foto_6.jpg","img/foto_8.jpg","img/foto_9.jpg",
];
const CLAVE_CARRITO = "qg_carrito_v1";

/* ------------------------------------------------------------
   UTILIDADES
   ------------------------------------------------------------ */
function waLink(mensaje) {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

function formatoPrecio(n) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

/* Todo lo que venga de productos.js o de lo que escriba el cliente pasa
   por aquí antes de insertarse en el HTML. */
function esc(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function buscarProducto(id) {
  return PRODUCTOS.find((p) => p.id === id);
}

/* Precio de un producto con un conjunto de opciones elegidas.
   El precio base es el punto de partida y cada opción SUMA. */
function precioConOpciones(producto, seleccion) {
  let total = Number(producto.precio) || 0;
  (producto.opciones || []).forEach((grupo) => {
    const elegido = seleccion?.[grupo.id];
    if (!elegido) return;
    const valor = grupo.valores.find((v) => v.valor === elegido);
    if (valor && valor.precio) total += Number(valor.precio) || 0;
  });
  return total;
}

/* Selección por defecto: el primer valor disponible de cada grupo.
   Así el cliente nunca ve un precio vacío ni puede mandar un pedido
   sin especificar el color. */
function seleccionPorDefecto(producto) {
  const seleccion = {};
  (producto.opciones || []).forEach((grupo) => {
    const primero = grupo.valores.find((v) => v.disponible !== false);
    if (primero) seleccion[grupo.id] = primero.valor;
  });
  return seleccion;
}

/* Texto corto para mostrar las opciones elegidas: "Rosa · Mediano" */
function resumenOpciones(seleccion) {
  const partes = Object.values(seleccion || {}).filter(Boolean);
  return partes.join(" · ");
}

/* Las paletas de productos.js (COLORES_PASTEL, COLORES_FUERTES) las comparten
   varios productos: son el MISMO arreglo en memoria. Si marcáramos un color
   como agotado directamente, se agotaría en todos los productos que usan esa
   paleta. Por eso cada producto se queda con su propia copia. */
function clonarValoresDeOpciones() {
  PRODUCTOS.forEach((p) => {
    (p.opciones || []).forEach((g) => {
      g.valores = g.valores.map((v) => ({ ...v }));
    });
  });
}

/* Texto largo con etiquetas: "Color: Rosa · Tamaño: Mediano" */
function resumenOpcionesConEtiqueta(producto, seleccion) {
  return (producto.opciones || [])
    .map((g) => (seleccion?.[g.id] ? `${g.etiqueta}: ${seleccion[g.id]}` : null))
    .filter(Boolean)
    .join(" · ");
}

/* ============================================================
   CARRITO
   Cada línea es una combinación única de producto + opciones + nota.
   El mismo molde en rosa y en azul son DOS líneas distintas.
   ============================================================ */
const Carrito = {
  items: [],

  cargar() {
    // localStorage puede fallar (modo privado, permisos). Si falla, el
    // carrito simplemente vive en memoria mientras dure la visita.
    try {
      const guardado = localStorage.getItem(CLAVE_CARRITO);
      this.items = guardado ? JSON.parse(guardado) : [];
      if (!Array.isArray(this.items)) this.items = [];
    } catch (e) {
      this.items = [];
    }
    // Quita del carrito guardado los productos que ya no existen en el catálogo
    this.items = this.items.filter((it) => buscarProducto(it.productoId));
  },

  guardar() {
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(this.items));
    } catch (e) { /* sin persistencia, pero el carrito sigue funcionando */ }
  },

  clave(productoId, seleccion, nota) {
    return `${productoId}||${JSON.stringify(seleccion || {})}||${(nota || "").trim()}`;
  },

  agregar(productoId, seleccion, cantidad, nota) {
    const producto = buscarProducto(productoId);
    if (!producto) return;
    const clave = this.clave(productoId, seleccion, nota);
    const existente = this.items.find((it) => it.clave === clave);

    if (existente) {
      existente.cantidad += cantidad;
    } else {
      this.items.push({
        clave,
        productoId,
        nombre: producto.nombre,
        unidad: producto.unidad,
        imagen: imagenDe(producto),
        emoji: producto.emoji || "🧁",
        opciones: seleccion || {},
        nota: (nota || "").trim(),
        cantidad,
        precioUnitario: precioConOpciones(producto, seleccion),
      });
    }
    this.guardar();
    actualizarVistaCarrito();
  },

  cambiarCantidad(clave, delta) {
    const item = this.items.find((it) => it.clave === clave);
    if (!item) return;
    item.cantidad += delta;
    if (item.cantidad <= 0) this.items = this.items.filter((it) => it.clave !== clave);
    this.guardar();
    actualizarVistaCarrito();
  },

  quitar(clave) {
    this.items = this.items.filter((it) => it.clave !== clave);
    this.guardar();
    actualizarVistaCarrito();
  },

  vaciar() {
    this.items = [];
    this.guardar();
    actualizarVistaCarrito();
  },

  totalArticulos() {
    return this.items.reduce((s, it) => s + it.cantidad, 0);
  },

  total() {
    return this.items.reduce((s, it) => s + it.precioUnitario * it.cantidad, 0);
  },
};

/* ============================================================
   TARJETAS DE PRODUCTO
   ------------------------------------------------------------
   La foto va a sangre (de orilla a orilla de la tarjeta) y el
   botón flota encima de ella. Cuando el producto ya está en el
   carrito, ese botón se convierte en un contador − 2 + para
   poder ajustar la cantidad sin abrir nada.
   ============================================================ */

/* Cuántas piezas de este producto hay en el carrito, sumando todas
   sus variantes (rosa + azul + verde = un solo número). */
function cantidadEnCarrito(productoId) {
  return Carrito.items
    .filter((it) => it.productoId === productoId)
    .reduce((s, it) => s + it.cantidad, 0);
}

/* La línea de carrito de un producto SIN variantes: siempre es una sola,
   así que el contador de la tarjeta puede apuntar directo a ella. */
function claveSimple(productoId) {
  return Carrito.clave(productoId, {}, "");
}

const ICONO_CARRITO = `<svg viewBox="0 0 24 24" aria-hidden="true" class="icono-mini">
  <path d="M5 6h15l-1.6 8.6a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.7L5.4 4.2A1 1 0 0 0 4.4 3.4H2.2"
        fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="9.6" cy="19.4" r="1.3" fill="currentColor"/>
  <circle cx="17" cy="19.4" r="1.3" fill="currentColor"/>
</svg>`;

const ICONO_WA = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 8.24 8.24c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z"/>
</svg>`;

/* La foto de respaldo se elige por la posición del producto en PRODUCTOS,
   NO por su posición en la lista que se está pintando. Si se usara la
   segunda, al filtrar por categoría las fotos se recorrerían y cada
   producto aparecería con la imagen de otro. */
function imagenDe(p) {
  return p.imagen || IMAGENES_PRODUCTOS[PRODUCTOS.indexOf(p)] || "";
}

function productoCardHTML(p) {
  const imagenSrc = imagenDe(p);
  const imagen = imagenSrc
    ? `<img src="${esc(imagenSrc)}" alt="${esc(p.nombre)}" loading="lazy" />`
    : `<div class="producto-img"><span>${esc(p.emoji || "🧁")}</span></div>`;

  const tieneOpciones = Array.isArray(p.opciones) && p.opciones.length > 0;
  const enCarrito = cantidadEnCarrito(p.id);

  // Vistazo de los colores, para que se note desde la tarjeta que el
  // producto viene en varios tonos.
  let muestrasColor = "";
  const grupoColor = (p.opciones || []).find((g) => g.tipo === "color");
  if (grupoColor) {
    const puntos = grupoColor.valores.slice(0, 6).map((v) =>
      `<span class="punto-color${v.disponible === false ? " punto-color--agotado" : ""}"
             style="background:${esc(v.hex || "#eee")}" title="${esc(v.valor)}"></span>`
    ).join("");
    const extra = grupoColor.valores.length > 6
      ? `<span class="punto-mas">+${grupoColor.valores.length - 6}</span>` : "";
    muestrasColor = `<div class="producto-colores">${puntos}${extra}</div>`;
  }

  // "Desde $X" cuando alguna variante sube el precio.
  const subeElPrecio = (p.opciones || []).some((g) => g.valores.some((v) => v.precio));
  const etiquetaPrecio = subeElPrecio
    ? `<span class="precio-desde">Desde</span>${formatoPrecio(p.precio)}`
    : formatoPrecio(p.precio);

  /* --- La pastilla que flota sobre la foto --- */
  let pastilla;
  if (!p.disponible) {
    pastilla = `<span class="pastilla pastilla--agotado">Agotado</span>`;
  } else if (tieneOpciones) {
    // Con variantes el contador sería ambiguo (¿el rosa o el azul?),
    // así que el botón siempre manda al modal y la cuenta va en la esquina.
    pastilla = `<button type="button" class="pastilla" data-abrir-opciones="${esc(p.id)}">
        ${ICONO_CARRITO}<span>${enCarrito ? "Agregar otro" : "Elegir"}</span>
      </button>`;
  } else if (enCarrito) {
    const clave = claveSimple(p.id);
    pastilla = `<div class="pastilla pastilla--contador">
        <button type="button" data-card-menos="${esc(clave)}" aria-label="Quitar uno">−</button>
        <span>${enCarrito}</span>
        <button type="button" data-card-mas="${esc(clave)}" aria-label="Agregar uno">+</button>
      </div>`;
  } else {
    pastilla = `<button type="button" class="pastilla" data-agregar-directo="${esc(p.id)}">
        ${ICONO_CARRITO}<span>Agregar</span>
      </button>`;
  }

  const insignia = (tieneOpciones && enCarrito)
    ? `<span class="producto-insignia">${enCarrito}</span>` : "";

  const categoria = p.categoria
    ? `<span class="producto-categoria">${esc(p.categoria)}</span>` : "";

  return `
    <article class="producto-card${enCarrito ? " producto-card--en-carrito" : ""}${!p.disponible ? " producto-card--agotado" : ""}">
      <div class="producto-media">
        ${imagen}
        ${insignia}
        ${pastilla}
      </div>
      <div class="producto-info">
        ${categoria}
        <h3>${esc(p.nombre)}</h3>
        ${muestrasColor}
        <div class="producto-pie">
          <span class="producto-precio">${etiquetaPrecio}<i>/ ${esc(p.unidad)}</i></span>
          <a href="${waLink(CONFIG.mensajeWhatsapp(p.nombre))}" target="_blank" rel="noopener"
             class="btn-wa" title="Pedir solo este por WhatsApp" aria-label="Pedir solo ${esc(p.nombre)} por WhatsApp">
            ${ICONO_WA}
          </a>
        </div>
      </div>
    </article>`;
}

/* ============================================================
   ANIMACIÓN DEL TÍTULO — LETRA POR LETRA
   ------------------------------------------------------------
   Se parte el h1 en letras sueltas para escalonarlas. Dos cuidados
   que ya nos habían mordido antes:

   1) Cada palabra va envuelta en un .word con white-space:nowrap.
      Sin eso el navegador puede cortar la línea EN MEDIO de una
      palabra, porque cada letra es un inline-block independiente
      ("Queq / uitos").
   2) Los espacios se dejan como texto normal entre palabras. Si se
      meten en un span, miden 0px y las palabras se pegan ("byGris").

   Además se respeta el <br> y el <span>Gris</span> con su cursiva.
   ============================================================ */
const PASO_LETRA = 0.045;   // segundos de diferencia entre una letra y la siguiente

/* Tintes muy claros a propósito: el título del hero va sobre una foto, y
   un pastel saturado se perdería. Se leen casi como blanco, con un matiz
   que solo se nota cuando pasa el brillo. */
const TINTES_TITULO = [
  "var(--titulo-tinte-1)",
  "var(--titulo-tinte-2)",
  "var(--titulo-tinte-3)",
  "var(--titulo-tinte-4)",
];

/* Parte un título en letras sueltas. Sirve para cualquier encabezado:
   la animación en sí la decide el CSS según el elemento padre. */
function partirEnLetras(selector, { paso = PASO_LETRA, tintes = false } = {}) {
  const el = document.querySelector(selector);
  if (!el || el.dataset.partido === "1") return;

  let i = 0;

  const crearLetra = (ch) => {
    const span = document.createElement("span");
    span.className = "letter";
    span.textContent = ch;
    span.style.setProperty("--letter-delay", `${(i * paso).toFixed(3)}s`);
    if (tintes) span.style.setProperty("--tinte", TINTES_TITULO[i % TINTES_TITULO.length]);
    i++;
    return span;
  };

  // Mete el texto en destino, partido en palabras y luego en letras
  const llenar = (destino, texto) => {
    texto.split(/(\s+)/).forEach((trozo) => {
      if (!trozo) return;
      if (/^\s+$/.test(trozo)) { destino.appendChild(document.createTextNode(" ")); return; }
      const palabra = document.createElement("span");
      palabra.className = "word";
      for (const ch of trozo) palabra.appendChild(crearLetra(ch));
      destino.appendChild(palabra);
    });
  };

  const recorrer = (origen, destino) => {
    [...origen.childNodes].forEach((nodo) => {
      if (nodo.nodeType === Node.TEXT_NODE) {
        llenar(destino, nodo.textContent);
      } else if (nodo.nodeName === "BR") {
        destino.appendChild(document.createElement("br"));
      } else if (nodo.nodeType === Node.ELEMENT_NODE) {
        // <span>, <em>… se conservan por si llevan estilo propio
        const copia = document.createElement(nodo.nodeName.toLowerCase());
        copia.className = nodo.className;
        recorrer(nodo, copia);
        destino.appendChild(copia);
      }
    });
  };

  const fragmento = document.createDocumentFragment();
  recorrer(el, fragmento);

  el.innerHTML = "";
  el.appendChild(fragmento);
  el.dataset.partido = "1";

  // Cuánto tarda la ola completa: el CSS lo usa para arrancar el bucle
  // justo cuando la última letra terminó de aparecer.
  el.style.setProperty("--recorrido", `${(i * paso + 0.6).toFixed(2)}s`);

  // Doble requestAnimationFrame: las letras se insertan primero y se
  // animan en el frame siguiente. Si se hace todo junto, el navegador
  // calcula posiciones y anima al mismo tiempo y se ve un tirón.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add("animar"));
  });
}

/* ============================================================
   ANIMACIÓN DE LOS TÍTULOS
   ------------------------------------------------------------
   Dos cuidados que ya nos habían mordido antes:

   1) Cada palabra va envuelta en un .word con white-space:nowrap.
      Sin eso el navegador puede cortar la línea EN MEDIO de una
      palabra, porque cada letra es un inline-block independiente
      ("Queq / uitos").
   2) Los espacios se dejan como texto normal entre palabras. Si se
      meten en un span, miden 0px y las palabras se pegan ("byGris").
   ============================================================ */
/* ------------------------------------------------------------
   MÁQUINA DE ESCRIBIR (título del hero)

   El truco clásico de CSS anima el ANCHO con steps() y necesita
   white-space:nowrap, o sea que solo sirve en UNA línea. Este
   título va en tres líneas y a 135px, así que se hace letra por
   letra sobre los spans que ya existen.

   Las letras se ocultan con visibility:hidden, no con display:none:
   así el bloque conserva su tamaño desde el principio y la página
   no da saltos mientras se escribe.
   ------------------------------------------------------------ */
const ESCRITURA = {
  velocidad:    55,    // ms por letra al escribir
  borrado:      28,    // ms por letra al borrar (borrar siempre se siente más rápido)
  esperaLleno:  4000,  // ms con el texto completo antes de borrar
  esperaVacio:  550,   // ms en blanco antes de volver a escribir
  repetir:      true,  // false = se escribe una vez y el cursor se queda parpadeando
};

function escribirTitulo(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  const letras = [...el.querySelectorAll(".letter")];
  if (!letras.length) return;

  // Con "reducir movimiento" activado se muestra todo de golpe
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    letras.forEach((l) => l.classList.add("visible"));
    return;
  }

  el.classList.add("escribiendo-modo");

  let i = 0;              // cuántas letras se ven
  let borrando = false;

  const ponerCursor = () => {
    letras.forEach((l) => l.classList.remove("cursor", "cursor-antes"));
    if (i === 0) letras[0].classList.add("cursor-antes");
    else letras[i - 1].classList.add("cursor");
  };

  const paso = () => {
    if (!borrando) {
      if (i < letras.length) {
        letras[i].classList.add("visible");
        i++;
        ponerCursor();
        setTimeout(paso, ESCRITURA.velocidad);
        return;
      }
      // Terminó de escribir
      ponerCursor();
      if (!ESCRITURA.repetir) return;
      borrando = true;
      setTimeout(paso, ESCRITURA.esperaLleno);
      return;
    }

    if (i > 0) {
      i--;
      letras[i].classList.remove("visible");
      ponerCursor();
      setTimeout(paso, ESCRITURA.borrado);
      return;
    }
    // Quedó vacío: vuelve a empezar
    borrando = false;
    ponerCursor();
    setTimeout(paso, ESCRITURA.esperaVacio);
  };

  ponerCursor();
  setTimeout(paso, 350);   // un respiro antes de arrancar
}

function animarTitulos() {
  // Hero: máquina de escribir
  partirEnLetras(".header-texto h1", { tintes: true });
  escribirTitulo(".header-texto h1");

  // Productos: las letras caen y se quedan colgando, meciéndose
  partirEnLetras(".productos-encabezado h2", { paso: 0.065 });
}

/* ============================================================
   FILTROS: SUBMENÚ DE CATEGORÍAS + BUSCADOR
   ============================================================ */
const Filtros = {
  categoria: "todos",
  texto: "",
  verTodo: false,      // ya le dio a "Ver más"

  activo() { return this.categoria !== "todos" || this.texto.trim() !== ""; },
  limpiar() { this.categoria = "todos"; this.texto = ""; this.verTodo = false; },
};

/* Quita acentos y mayúsculas para que "azucar" encuentre "Azúcar"
   y "chocolate" encuentre "Chocolaté". */
function normalizar(t) {
  return String(t ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim();
}

/* Las categorías salen solas del catálogo, en el orden en que aparecen
   en productos.js. Así Luis no tiene que mantener una lista aparte. */
function categoriasDelCatalogo() {
  const cuenta = new Map();
  PRODUCTOS.forEach((p) => {
    const c = (p.categoria || "").trim();
    if (!c) return;
    cuenta.set(c, (cuenta.get(c) || 0) + 1);
  });
  return [...cuenta.entries()];
}

function productosFiltrados() {
  const busqueda = normalizar(Filtros.texto);
  return PRODUCTOS.filter((p) => {
    if (Filtros.categoria !== "todos" && (p.categoria || "").trim() !== Filtros.categoria) return false;
    if (!busqueda) return true;
    const heno = normalizar(`${p.nombre} ${p.categoria || ""} ${p.unidad || ""}`);
    return busqueda.split(/\s+/).every((palabra) => heno.includes(palabra));
  });
}

function renderChips() {
  const cont = document.getElementById("filtrosChips");
  if (!cont) return;
  const cats = categoriasDelCatalogo();

  // Con una sola categoría (o ninguna) el submenú no aporta nada
  if (cats.length < 2) { cont.innerHTML = ""; cont.hidden = true; return; }
  cont.hidden = false;

  const chip = (valor, texto, cuenta) => `
    <button type="button" class="chip-cat${Filtros.categoria === valor ? " activo" : ""}"
            data-categoria="${esc(valor)}" aria-pressed="${Filtros.categoria === valor}">
      ${esc(texto)}<span class="chip-num">${cuenta}</span>
    </button>`;

  cont.innerHTML = chip("todos", "Todos", PRODUCTOS.length)
    + cats.map(([c, n]) => chip(c, c, n)).join("");
}

function renderProductos() {
  const grid = document.getElementById("productosGrid");
  const extra = document.getElementById("extraProductos");
  const botonMas = document.getElementById("ver-mas");
  const vacio = document.getElementById("sinResultados");
  const conteo = document.getElementById("conteo");
  if (!grid) return;

  const lista = productosFiltrados();

  // --- Nada encontrado ---
  if (!lista.length) {
    grid.innerHTML = "";
    extra.innerHTML = "";
    extra.classList.remove("show");
    if (botonMas) botonMas.hidden = true;
    if (conteo) conteo.textContent = "";
    if (vacio) {
      vacio.hidden = false;
      const txt = document.getElementById("sinResultadosTexto");
      if (txt) {
        txt.textContent = Filtros.texto.trim()
          ? `No encontramos nada con “${Filtros.texto.trim()}”.`
          : "No hay productos en esta categoría.";
      }
    }
    return;
  }
  if (vacio) vacio.hidden = true;

  // --- Con filtro activo se muestra todo lo que coincide, sin "Ver más":
  //     cortar los resultados de una búsqueda confunde más de lo que ayuda. ---
  const visibles = CONFIG.productosVisibles || 10;
  const paginar = !Filtros.activo() && !Filtros.verTodo && lista.length > visibles;

  if (paginar) {
    grid.innerHTML = lista.slice(0, visibles).map((p) => productoCardHTML(p)).join("");
    extra.innerHTML = lista.slice(visibles).map((p) => productoCardHTML(p)).join("");
    extra.classList.remove("show");
    if (botonMas) botonMas.hidden = false;
  } else {
    grid.innerHTML = lista.map((p) => productoCardHTML(p)).join("");
    extra.innerHTML = "";
    extra.classList.remove("show");
    if (botonMas) botonMas.hidden = true;
  }

  if (conteo) {
    conteo.textContent = Filtros.activo()
      ? `${lista.length} ${lista.length === 1 ? "producto" : "productos"}`
      : "";
  }
}

function aplicarFiltros() {
  renderChips();
  renderProductos();
}

/* ============================================================
   DISPONIBILIDAD
   ------------------------------------------------------------
   Lo que está agotado NO vive en productos.js, sino en
   disponibilidad.json: un archivo chiquito que se puede editar
   desde github.com (o desde admin.html) sin tocar el catálogo
   ni subir el número de versión de los scripts.

   El catálogo se pinta primero y esto se aplica después, así que
   la página nunca se queda esperando. Si el archivo no carga o
   trae un error de sintaxis, todo se muestra disponible: es
   preferible vender algo que ya no hay —y avisarlo por WhatsApp—
   a que la tienda se vea vacía.
   ============================================================ */
async function cargarDisponibilidad() {
  try {
    // cache:"no-store" + la marca de tiempo evitan que el navegador
    // sirva una copia vieja: es justo el archivo que más cambia.
    const respuesta = await fetch(`disponibilidad.json?t=${Date.now()}`, { cache: "no-store" });
    if (!respuesta.ok) return;
    const datos = await respuesta.json();
    aplicarDisponibilidad(datos);
    aplicarFiltros();
    limpiarCarritoDeAgotados();
  } catch (e) {
    // Sin conexión, archivo ausente o JSON mal escrito: se deja el
    // catálogo tal como está.
  }
}

function aplicarDisponibilidad(datos) {
  const agotados = new Set(Array.isArray(datos.agotados) ? datos.agotados : []);
  const coloresAgotados = datos.coloresAgotados || {};

  PRODUCTOS.forEach((p) => {
    if (agotados.has(p.id)) p.disponible = false;

    const fuera = coloresAgotados[p.id];
    if (!Array.isArray(fuera) || !p.opciones) return;
    const sinExistencia = new Set(fuera);
    p.opciones.forEach((g) => {
      g.valores.forEach((v) => {
        if (sinExistencia.has(v.valor)) v.disponible = false;
      });
    });
  });
}

/* ¿La combinación exacta que trae esta línea del carrito sigue existiendo? */
function itemSigueDisponible(item) {
  const p = buscarProducto(item.productoId);
  if (!p || !p.disponible) return false;
  return (p.opciones || []).every((g) => {
    const elegido = item.opciones?.[g.id];
    if (!elegido) return true;
    const valor = g.valores.find((v) => v.valor === elegido);
    return valor ? valor.disponible !== false : true;
  });
}

/* Si a alguien se le quedó algo en el carrito y mientras tanto se agotó,
   se le quita y se le avisa, en vez de dejarlo mandar un pedido imposible. */
function limpiarCarritoDeAgotados() {
  const antes = Carrito.items.length;
  const quitados = Carrito.items.filter((it) => !itemSigueDisponible(it));
  if (!quitados.length) return;

  Carrito.items = Carrito.items.filter(itemSigueDisponible);
  Carrito.guardar();
  actualizarVistaCarrito();

  const aviso = document.getElementById("carritoAviso");
  if (!aviso) return;
  const nombres = [...new Set(quitados.map((q) => q.nombre))].join(", ");
  aviso.innerHTML = antes === quitados.length
    ? `Se agotó lo que tenías en el carrito (${esc(nombres)}). Escríbenos por WhatsApp y te decimos cuándo vuelve.`
    : `Quitamos del carrito lo que se agotó: <b>${esc(nombres)}</b>.`;
  aviso.classList.add("visible", "carrito-aviso--alerta");
  setTimeout(() => aviso.classList.remove("visible", "carrito-aviso--alerta"), 9000);
}

/* ============================================================
   MODAL DE OPCIONES
   Se abre al dar clic en "Elegir opciones". Ahí el cliente escoge
   color, tamaño, cantidad y nota, y ve el precio actualizarse.
   ============================================================ */
const Modal = {
  producto: null,
  seleccion: {},
  cantidad: 1,
  nota: "",

  abrir(productoId) {
    const p = buscarProducto(productoId);
    if (!p || !p.disponible) return;
    this.producto = p;
    this.seleccion = seleccionPorDefecto(p);
    this.cantidad = 1;
    this.nota = ""; // importante: no arrastrar la nota del producto anterior
    this.render();
    document.getElementById("modalOpciones").classList.add("abierto");
    document.body.classList.add("sin-scroll");
  },

  cerrar() {
    document.getElementById("modalOpciones").classList.remove("abierto");
    document.body.classList.remove("sin-scroll");
    this.producto = null;
    this.nota = "";
  },

  // El modal se vuelve a dibujar completo cada vez que cambia una opción,
  // así que hay que rescatar lo escrito antes de reemplazar el HTML.
  guardarNota() {
    const campo = document.getElementById("modalNota");
    if (campo) this.nota = campo.value;
  },

  render() {
    const p = this.producto;
    if (!p) return;
    const cuerpo = document.getElementById("modalCuerpo");
    const imagenSrc = imagenDe(p);

    const grupos = (p.opciones || []).map((grupo) => {
      const valores = grupo.valores.map((v) => {
        const agotado = v.disponible === false;
        const activo = this.seleccion[grupo.id] === v.valor;
        const extra = v.precio ? ` (+${formatoPrecio(v.precio)})` : "";

        if (grupo.tipo === "color") {
          return `
            <button type="button"
              class="muestra-color${activo ? " activa" : ""}${agotado ? " agotada" : ""}"
              style="--muestra:${esc(v.hex || "#eee")}"
              ${agotado ? "disabled" : ""}
              data-grupo="${esc(grupo.id)}" data-valor="${esc(v.valor)}"
              title="${esc(v.valor)}${agotado ? " (agotado)" : ""}${extra}"
              aria-label="${esc(v.valor)}"></button>`;
        }
        return `
          <button type="button"
            class="pill-opcion${activo ? " activa" : ""}${agotado ? " agotada" : ""}"
            ${agotado ? "disabled" : ""}
            data-grupo="${esc(grupo.id)}" data-valor="${esc(v.valor)}">
            ${esc(v.valor)}${extra}
          </button>`;
      }).join("");

      const elegido = this.seleccion[grupo.id];
      return `
        <div class="grupo-opcion">
          <span class="grupo-etiqueta">${esc(grupo.etiqueta)}
            ${elegido ? `<b>${esc(elegido)}</b>` : ""}
          </span>
          <div class="grupo-valores${grupo.tipo === "color" ? " grupo-valores--color" : ""}">${valores}</div>
        </div>`;
    }).join("");

    const campoNota = p.nota
      ? `<div class="grupo-opcion">
           <span class="grupo-etiqueta">Especificaciones <i>(opcional)</i></span>
           <textarea id="modalNota" rows="2" maxlength="180"
             placeholder="Ej. el rosa más pálido, sin logo…">${esc(this.nota)}</textarea>
         </div>`
      : "";

    const unitario = precioConOpciones(p, this.seleccion);

    cuerpo.innerHTML = `
      <div class="modal-encabezado">
        ${imagenSrc
          ? `<img src="${esc(imagenSrc)}" alt="${esc(p.nombre)}" />`
          : `<div class="producto-img"><span>${esc(p.emoji || "🧁")}</span></div>`}
        <div>
          <h3>${esc(p.nombre)}</h3>
          <span class="modal-unidad">${esc(p.unidad)}</span>
        </div>
      </div>
      ${grupos}
      ${campoNota}
      <div class="grupo-opcion">
        <span class="grupo-etiqueta">Cantidad</span>
        <div class="contador">
          <button type="button" data-cantidad="-1" aria-label="Quitar uno">−</button>
          <span id="modalCantidad">${this.cantidad}</span>
          <button type="button" data-cantidad="1" aria-label="Agregar uno">+</button>
        </div>
      </div>
      <div class="modal-total">
        <span>Subtotal</span>
        <b>${formatoPrecio(unitario * this.cantidad)}</b>
      </div>
      <button type="button" class="btn-1 modal-agregar" id="modalAgregar">Agregar al carrito</button>`;
  },
};

/* ============================================================
   PANEL DEL CARRITO
   ============================================================ */
function abrirCarrito() {
  document.getElementById("panelCarrito").classList.add("abierto");
  document.getElementById("fondoCarrito").classList.add("visible");
  document.body.classList.add("sin-scroll");
}

function cerrarCarrito() {
  document.getElementById("panelCarrito").classList.remove("abierto");
  document.getElementById("fondoCarrito").classList.remove("visible");
  document.body.classList.remove("sin-scroll");
}

function actualizarVistaCarrito() {
  const cantidad = Carrito.totalArticulos();

  // Las tarjetas muestran el contador y el borde de "ya está en el carrito",
  // así que se vuelven a dibujar cada vez que el carrito cambia.
  if (document.getElementById("productosGrid")) renderProductos();

  const badge = document.getElementById("carritoContador");
  if (badge) {
    badge.textContent = cantidad;
    badge.classList.toggle("visible", cantidad > 0);
  }
  const boton = document.getElementById("botonCarrito");
  if (boton) boton.classList.toggle("con-items", cantidad > 0);

  const lista = document.getElementById("carritoLista");
  const pie = document.getElementById("carritoPie");
  if (!lista) return;

  if (!Carrito.items.length) {
    lista.innerHTML = `
      <div class="carrito-vacio">
        <span>🧁</span>
        <p>Tu carrito está vacío.</p>
        <small>Elige productos del catálogo y aparecerán aquí.</small>
      </div>`;
    if (pie) pie.classList.add("oculto");
    return;
  }

  if (pie) pie.classList.remove("oculto");

  lista.innerHTML = Carrito.items.map((it) => {
    const detalle = resumenOpciones(it.opciones);
    return `
      <div class="carrito-item">
        ${it.imagen
          ? `<img src="${esc(it.imagen)}" alt="${esc(it.nombre)}" />`
          : `<div class="carrito-item-emoji">${esc(it.emoji)}</div>`}
        <div class="carrito-item-info">
          <h4>${esc(it.nombre)}</h4>
          ${detalle ? `<span class="carrito-item-opciones">${esc(detalle)}</span>` : ""}
          ${it.nota ? `<span class="carrito-item-nota">“${esc(it.nota)}”</span>` : ""}
          <span class="carrito-item-precio">${formatoPrecio(it.precioUnitario)} / ${esc(it.unidad)}</span>
          <div class="contador contador--chico">
            <button type="button" data-carrito-menos="${esc(it.clave)}" aria-label="Quitar uno">−</button>
            <span>${it.cantidad}</span>
            <button type="button" data-carrito-mas="${esc(it.clave)}" aria-label="Agregar uno">+</button>
          </div>
        </div>
        <div class="carrito-item-lado">
          <b>${formatoPrecio(it.precioUnitario * it.cantidad)}</b>
          <button type="button" class="carrito-quitar" data-carrito-quitar="${esc(it.clave)}">Quitar</button>
        </div>
      </div>`;
  }).join("");

  const total = document.getElementById("carritoTotal");
  if (total) total.textContent = formatoPrecio(Carrito.total());
  const conteo = document.getElementById("carritoConteo");
  if (conteo) conteo.textContent = `${cantidad} ${cantidad === 1 ? "artículo" : "artículos"}`;
}

/* ============================================================
   ENVÍO DEL PEDIDO
   ============================================================ */
function generarFolio() {
  const ahora = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const fecha = `${String(ahora.getFullYear()).slice(2)}${p(ahora.getMonth() + 1)}${p(ahora.getDate())}`;
  const azar = Math.floor(1000 + Math.random() * 9000);
  return `${CONFIG.folioPrefijo || "PED"}-${fecha}-${azar}`;
}

function mensajePedidoWhatsapp(pedido) {
  const lineas = [];
  lineas.push(`*NUEVO PEDIDO*`);
  lineas.push(`${CONFIG.nombreNegocio}`);
  lineas.push(`Folio: ${pedido.folio}`);
  if (pedido.cliente.nombre) lineas.push(`Cliente: ${pedido.cliente.nombre}`);
  lineas.push("");

  pedido.items.forEach((it, i) => {
    lineas.push(`${i + 1}) *${it.nombre}*`);
    const detalle = Object.entries(it.opciones)
      .map(([k, v]) => `${k}: ${v}`).join(" · ");
    if (detalle) lineas.push(`   ${detalle}`);
    if (it.nota) lineas.push(`   Nota: ${it.nota}`);
    lineas.push(`   ${it.cantidad} x ${formatoPrecio(it.precio_unitario)} = ${formatoPrecio(it.subtotal)}`);
  });

  lineas.push("");
  lineas.push(`*Total: ${formatoPrecio(pedido.total)}*`);
  lineas.push(`(${pedido.items.reduce((s, it) => s + it.cantidad, 0)} artículos)`);
  if (pedido.nota) {
    lineas.push("");
    lineas.push(`Comentario: ${pedido.nota}`);
  }
  return lineas.join("\n");
}

function armarPedido() {
  const nombre = (document.getElementById("clienteNombre")?.value || "").trim();
  const nota = (document.getElementById("clienteNota")?.value || "").trim();

  return {
    folio: generarFolio(),
    creado_en: new Date().toISOString(),
    canal: "web",
    moneda: "MXN",
    cliente: { nombre: nombre || null, telefono: null },
    nota: nota || null,
    total: Number(Carrito.total().toFixed(2)),
    items: Carrito.items.map((it) => {
      // Se mandan las etiquetas bonitas ("Color", "Tamaño"), no los ids internos.
      const producto = buscarProducto(it.productoId);
      const opciones = {};
      (producto?.opciones || []).forEach((g) => {
        if (it.opciones[g.id]) opciones[g.etiqueta] = it.opciones[g.id];
      });
      return {
        producto_id: it.productoId,
        nombre: it.nombre,
        unidad: it.unidad,
        cantidad: it.cantidad,
        precio_unitario: Number(it.precioUnitario.toFixed(2)),
        subtotal: Number((it.precioUnitario * it.cantidad).toFixed(2)),
        opciones,
        nota: it.nota || null,
      };
    }),
  };
}

/* Manda una copia del pedido al backend.
   No se espera la respuesta: si el servidor está caído o tarda, el
   cliente igual se va a WhatsApp sin notar nada. keepalive hace que la
   petición sobreviva aunque la pestaña navegue a otro lado. */
function enviarPedidoAlBackend(pedido) {
  if (!CONFIG.apiPedidos) return;
  try {
    const headers = { "Content-Type": "application/json" };
    if (CONFIG.apiToken) headers["Authorization"] = `Bearer ${CONFIG.apiToken}`;
    fetch(CONFIG.apiPedidos, {
      method: "POST",
      headers,
      body: JSON.stringify(pedido),
      keepalive: true,
      mode: "cors",
    }).catch(() => { /* el pedido ya va por WhatsApp de todos modos */ });
  } catch (e) { /* idem */ }
}

function hacerPedido() {
  if (!Carrito.items.length) return;

  if (CONFIG.pedirNombreCliente) {
    const campo = document.getElementById("clienteNombre");
    if (campo && !campo.value.trim()) {
      campo.classList.add("campo-error");
      campo.focus();
      return;
    }
    campo?.classList.remove("campo-error");
  }

  const pedido = armarPedido();

  // 1) copia al backend (no bloquea)
  enviarPedidoAlBackend(pedido);

  // 2) WhatsApp. Se abre en el mismo tick del clic para que el navegador
  //    no lo tome por ventana emergente y lo bloquee.
  const url = waLink(mensajePedidoWhatsapp(pedido));
  const ventana = window.open(url, "_blank", "noopener");
  if (!ventana) window.location.href = url;

  mostrarConfirmacion(pedido.folio);
  Carrito.vaciar();
}

function mostrarConfirmacion(folio) {
  const aviso = document.getElementById("carritoAviso");
  if (!aviso) return;
  aviso.innerHTML = `Pedido <b>${esc(folio)}</b> enviado por WhatsApp. Ahí se confirman existencias y pago.`;
  aviso.classList.add("visible");
  setTimeout(() => aviso.classList.remove("visible"), 6000);
}

/* ============================================================
   CONFIGURACIÓN GENERAL DE LA PÁGINA
   ============================================================ */
function aplicarConfig() {
  document.title = CONFIG.nombreNegocio;
  const generalLink = waLink(CONFIG.mensajeWhatsappGeneral);
  ["referenciasWhatsapp", "footerWhatsapp", "promoWhatsapp"].forEach((id) => {
    const el = document.getElementById(id); if (el) el.href = generalLink;
  });
  const footerCiudad = document.getElementById("footerCiudad");
  if (footerCiudad) footerCiudad.textContent = CONFIG.ciudad;
  const footerTelefono = document.getElementById("footerTelefono");
  if (footerTelefono) {
    footerTelefono.textContent = `Llamar: ${CONFIG.telefonoTexto}`;
    footerTelefono.href = `tel:${CONFIG.telefonoTexto.replace(/\s+/g, "")}`;
  }
  const footerFacebook = document.getElementById("footerFacebook");
  const footerInstagram = document.getElementById("footerInstagram");
  if (footerFacebook) footerFacebook.href = CONFIG.facebook;
  if (footerInstagram) footerInstagram.href = CONFIG.instagram;
  const anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();

  const campoNombre = document.getElementById("clienteNombre");
  if (campoNombre && !CONFIG.pedirNombreCliente) {
    campoNombre.closest(".carrito-campo")?.classList.add("oculto");
  }

  aplicarMapa();
}

/* ============================================================
   MAPA DEL LOCAL
   Usa el modo "embed" de Google Maps, que no necesita API key ni
   cuenta de Google. Solo depende de CONFIG.direccion.
   ============================================================ */
function aplicarMapa() {
  const direccion = (CONFIG.direccion || CONFIG.ciudad || "").trim();
  if (!direccion) return;

  const consulta = encodeURIComponent(direccion);

  const iframe = document.getElementById("mapaLocal");
  if (iframe) iframe.src = `https://www.google.com/maps?q=${consulta}&z=16&output=embed`;

  const texto = document.getElementById("mapaDireccion");
  if (texto) texto.textContent = direccion;

  // "Cómo llegar" abre Google Maps con la ruta ya cargada
  const link = document.getElementById("mapaComoLlegar");
  if (link) link.href = `https://www.google.com/maps/dir/?api=1&destination=${consulta}`;
}

/* ============================================================
   MENÚ MÓVIL
   ============================================================ */
const menuCheckbox = document.getElementById("menu");
const barraMenu = document.getElementById("barraMenu");

/* Abrir y cerrar el menú lo resuelve el CSS con el checkbox. Aquí solo
   se cierra al pasar a escritorio y al picarle a un link. */
function ajustarNavbar() {
  if (window.innerWidth > BREAKPOINT_MOVIL) menuCheckbox.checked = false;
}
window.addEventListener("resize", ajustarNavbar);
document.querySelectorAll(".navbar a").forEach((link) => {
  link.addEventListener("click", () => { menuCheckbox.checked = false; });
});

/* ------------------------------------------------------------
   La barra se pone sólida al bajar
   Sobre la foto va transparente; en cuanto la página se desplaza,
   el fondo crema entra para que los links se sigan leyendo contra
   lo que venga abajo.
   ------------------------------------------------------------ */
function actualizarBarra() {
  if (!barraMenu) return;
  barraMenu.classList.toggle("menu--fijo", window.scrollY > 30);
}
window.addEventListener("scroll", actualizarBarra, { passive: true });

/* ------------------------------------------------------------
   Marcar en qué sección va el visitante
   ------------------------------------------------------------ */
function vigilarSecciones() {
  const links = [...document.querySelectorAll(".navbar a")];
  const porId = new Map();
  links.forEach((a) => {
    const id = a.getAttribute("href")?.replace("#", "");
    const seccion = id && document.getElementById(id);
    if (seccion) porId.set(seccion, a);
  });
  if (!porId.size || !("IntersectionObserver" in window)) return;

  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.remove("activo"));
      porId.get(e.target)?.classList.add("activo");
    });
  }, {
    // La franja de detección va a media pantalla: la sección se marca
    // cuando de verdad es la que se está viendo, no al asomarse.
    rootMargin: "-45% 0px -50% 0px",
    threshold: 0,
  });

  porId.forEach((_, seccion) => observador.observe(seccion));
}

document.getElementById("ver-mas").addEventListener("click", (e) => {
  e.preventDefault();
  Filtros.verTodo = true;
  renderProductos();
});

/* ============================================================
   EVENTOS
   Se usa delegación: un solo listener en document en vez de uno por
   tarjeta. Así funciona aunque las tarjetas se vuelvan a dibujar.
   ============================================================ */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-abrir-opciones], [data-agregar-directo], [data-grupo], [data-cantidad], [data-carrito-menos], [data-carrito-mas], [data-carrito-quitar], [data-card-menos], [data-card-mas]");

  // --- Tarjetas ---
  if (t?.dataset.abrirOpciones) { Modal.abrir(t.dataset.abrirOpciones); return; }

  if (t?.dataset.agregarDirecto) {
    // Sin variantes se agrega de una vez. No se abre el carrito: la tarjeta
    // ya se convierte en contador y se ve lo que pasó sin tapar el catálogo.
    Carrito.agregar(t.dataset.agregarDirecto, {}, 1, "");
    return;
  }

  // --- Contador dentro de la tarjeta ---
  if (t?.dataset.cardMenos) { Carrito.cambiarCantidad(t.dataset.cardMenos, -1); return; }
  if (t?.dataset.cardMas)   { Carrito.cambiarCantidad(t.dataset.cardMas, 1); return; }

  // --- Modal: elegir una opción ---
  if (t?.dataset.grupo) {
    Modal.guardarNota(); // el modal se redibuja entero: la nota se conserva aquí
    Modal.seleccion[t.dataset.grupo] = t.dataset.valor;
    Modal.render();
    return;
  }

  // --- Modal: cantidad ---
  if (t?.dataset.cantidad) {
    Modal.guardarNota();
    Modal.cantidad = Math.max(1, Modal.cantidad + Number(t.dataset.cantidad));
    Modal.render();
    return;
  }

  // --- Carrito: cantidades y quitar ---
  if (t?.dataset.carritoMenos) { Carrito.cambiarCantidad(t.dataset.carritoMenos, -1); return; }
  if (t?.dataset.carritoMas)   { Carrito.cambiarCantidad(t.dataset.carritoMas, 1); return; }
  if (t?.dataset.carritoQuitar){ Carrito.quitar(t.dataset.carritoQuitar); return; }
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("modalAgregarWrap")?.remove(); // limpieza defensiva

  document.getElementById("modalCuerpo")?.addEventListener("click", (e) => {
    if (e.target.id === "modalAgregar") {
      if (!Modal.producto) return;
      Modal.guardarNota();
      Carrito.agregar(Modal.producto.id, Modal.seleccion, Modal.cantidad, Modal.nota);
      Modal.cerrar();
      abrirCarrito();
    }
  });

  document.getElementById("modalCerrar")?.addEventListener("click", () => Modal.cerrar());
  document.getElementById("modalFondo")?.addEventListener("click", () => Modal.cerrar());

  document.getElementById("botonCarrito")?.addEventListener("click", abrirCarrito);
  document.getElementById("carritoCerrar")?.addEventListener("click", cerrarCarrito);
  document.getElementById("fondoCarrito")?.addEventListener("click", cerrarCarrito);
  document.getElementById("carritoVaciar")?.addEventListener("click", () => {
    if (Carrito.items.length) Carrito.vaciar();
  });
  document.getElementById("carritoPedir")?.addEventListener("click", hacerPedido);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (document.getElementById("modalOpciones")?.classList.contains("abierto")) Modal.cerrar();
    else if (document.getElementById("panelCarrito")?.classList.contains("abierto")) cerrarCarrito();
  });

  /* --- Submenú de categorías --- */
  document.getElementById("filtrosChips")?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-categoria]");
    if (!chip) return;
    Filtros.categoria = chip.dataset.categoria;
    Filtros.verTodo = false;
    aplicarFiltros();
  });

  /* --- Buscador --- */
  const campoBuscar = document.getElementById("buscador");
  const botonLimpiar = document.getElementById("buscadorLimpiar");

  campoBuscar?.addEventListener("input", () => {
    Filtros.texto = campoBuscar.value;
    Filtros.verTodo = false;
    if (botonLimpiar) botonLimpiar.hidden = !campoBuscar.value;
    renderProductos();
  });

  // Enter no debe recargar nada: no hay formulario que enviar
  campoBuscar?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
    if (e.key === "Escape" && campoBuscar.value) {
      campoBuscar.value = "";
      campoBuscar.dispatchEvent(new Event("input"));
    }
  });

  botonLimpiar?.addEventListener("click", () => {
    campoBuscar.value = "";
    campoBuscar.dispatchEvent(new Event("input"));
    campoBuscar.focus();
  });

  document.getElementById("limpiarFiltros")?.addEventListener("click", () => {
    Filtros.limpiar();
    if (campoBuscar) campoBuscar.value = "";
    if (botonLimpiar) botonLimpiar.hidden = true;
    aplicarFiltros();
  });

  clonarValoresDeOpciones(); // antes que nada: separa las paletas compartidas
  aplicarConfig();
  Carrito.cargar();          // antes de pintar: las tarjetas muestran el contador
  aplicarFiltros();
  actualizarVistaCarrito();
  ajustarNavbar();
  actualizarBarra();
  vigilarSecciones();
  animarTitulos();

  // Se pide al final, sin await: el catálogo ya se pintó y esto solo
  // apaga lo que esté agotado cuando llegue.
  cargarDisponibilidad();
});
