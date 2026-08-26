/* ============================================================
   QUEQUITOS Y MATERIAS PRIMAS BY GRIS
   Catálogo + selección de variantes + carrito + envío de pedido.

   El pedido se manda SIEMPRE por WhatsApp. Además, si en config.js
   está puesta la URL de tu API (CONFIG.apiPedidos), se manda también
   una copia en JSON a tu backend de Java/PostgreSQL.
   ============================================================ */

const BREAKPOINT_MOVIL = 600;
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
        imagen: producto.imagen || IMAGENES_PRODUCTOS[PRODUCTOS.indexOf(producto)] || "",
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
   ============================================================ */
function productoCardHTML(p, index) {
  const imagenSrc = p.imagen || IMAGENES_PRODUCTOS[index] || "";
  const imagen = imagenSrc
    ? `<img src="${esc(imagenSrc)}" alt="${esc(p.nombre)}" loading="lazy" />`
    : `<div class="producto-img"><span>${esc(p.emoji || "🧁")}</span></div>`;

  const tieneOpciones = Array.isArray(p.opciones) && p.opciones.length > 0;

  // Vistazo de los colores disponibles, para que se note desde la
  // tarjeta que el producto viene en varios tonos.
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
    ? `<span class="precio-desde">Desde</span> ${formatoPrecio(p.precio)}`
    : formatoPrecio(p.precio);

  let acciones;
  if (!p.disponible) {
    acciones = `<span class="producto-agotado">Agotado</span>`;
  } else if (tieneOpciones) {
    acciones = `
      <button type="button" class="btn-pedir" data-abrir-opciones="${esc(p.id)}">Elegir opciones</button>
      <a href="${waLink(CONFIG.mensajeWhatsapp(p.nombre))}" target="_blank" rel="noopener" class="link-pedir-ya">o pedir directo por WhatsApp</a>`;
  } else {
    acciones = `
      <button type="button" class="btn-pedir" data-agregar-directo="${esc(p.id)}">Agregar</button>
      <a href="${waLink(CONFIG.mensajeWhatsapp(p.nombre))}" target="_blank" rel="noopener" class="link-pedir-ya">o pedir directo por WhatsApp</a>`;
  }

  return `
    <div class="producto-card">
      ${imagen}
      <h3>${esc(p.nombre)}</h3>
      <p>${etiquetaPrecio} <span class="producto-unidad">/ ${esc(p.unidad)}</span></p>
      ${muestrasColor}
      ${acciones}
    </div>`;
}

function renderProductos() {
  const visibles = CONFIG.productosVisibles || 10;
  const grid = document.getElementById("productosGrid");
  const extra = document.getElementById("extraProductos");
  grid.innerHTML = PRODUCTOS.slice(0, visibles).map((p, i) => productoCardHTML(p, i)).join("");
  const resto = PRODUCTOS.slice(visibles);
  if (resto.length) {
    extra.innerHTML = resto.map((p, i) => productoCardHTML(p, visibles + i)).join("");
  } else {
    document.getElementById("ver-mas").style.display = "none";
  }
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
    renderProductos();
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
    const imagenSrc = p.imagen || IMAGENES_PRODUCTOS[PRODUCTOS.indexOf(p)] || "";

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
const navbar = document.querySelector(".navbar");
function ajustarNavbar() {
  if (window.innerWidth > BREAKPOINT_MOVIL) { navbar.style.display = ""; menuCheckbox.checked = false; }
  else { navbar.style.display = menuCheckbox.checked ? "block" : ""; }
}
menuCheckbox.addEventListener("change", ajustarNavbar);
window.addEventListener("resize", ajustarNavbar);
document.querySelectorAll(".navbar a").forEach((link) => {
  link.addEventListener("click", () => { menuCheckbox.checked = false; ajustarNavbar(); });
});

document.getElementById("ver-mas").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("extraProductos").classList.add("show");
  e.currentTarget.style.display = "none";
});

/* ============================================================
   EVENTOS
   Se usa delegación: un solo listener en document en vez de uno por
   tarjeta. Así funciona aunque las tarjetas se vuelvan a dibujar.
   ============================================================ */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-abrir-opciones], [data-agregar-directo], [data-grupo], [data-cantidad], [data-carrito-menos], [data-carrito-mas], [data-carrito-quitar]");

  // --- Tarjetas ---
  if (t?.dataset.abrirOpciones) { Modal.abrir(t.dataset.abrirOpciones); return; }

  if (t?.dataset.agregarDirecto) {
    Carrito.agregar(t.dataset.agregarDirecto, {}, 1, "");
    abrirCarrito();
    return;
  }

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

  clonarValoresDeOpciones(); // antes que nada: separa las paletas compartidas
  aplicarConfig();
  renderProductos();
  Carrito.cargar();
  actualizarVistaCarrito();
  ajustarNavbar();

  // Se pide al final, sin await: el catálogo ya se pintó y esto solo
  // apaga lo que esté agotado cuando llegue.
  cargarDisponibilidad();
});
