// ============================================================
// LÓGICA DEL SITIO
// No necesitas tocar este archivo para actualizar productos o
// datos del negocio — eso se hace en config.js y productos.js
// ============================================================

const BREAKPOINT_MOVIL = 600; // debe coincidir con el media query de style.css
const IMAGENES_PRODUCTOS = [
  "img/foto_1.jpg",
  "img/foto_2.jpg",
  "img/foto_3.jpg",
  "img/foto_4.jpg",
  "img/foto_5.jpg",
  "img/foto_6.jpg",
  "img/foto_8.jpg",
  "img/foto_9.jpg",
];

function waLink(mensaje) {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

function formatoPrecio(n) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function productoCardHTML(p, index) {
  const mensaje = CONFIG.mensajeWhatsapp(p.nombre);
  const imagenSrc = p.imagen || IMAGENES_PRODUCTOS[index] || "";
  const imagen = imagenSrc
    ? `<img src="${imagenSrc}" alt="${p.nombre}" loading="lazy" />`
    : `<div class="producto-img"><span>${p.emoji || "🧁"}</span></div>`;

  return `
    <div class="producto-card">
      ${imagen}
      <h3>${p.nombre}</h3>
      <p>${formatoPrecio(p.precio)} <span class="producto-unidad">/ ${p.unidad}</span></p>
      ${
        p.disponible
          ? `<a href="${waLink(mensaje)}" target="_blank" rel="noopener" class="btn-pedir">Pedir por WhatsApp</a>`
          : `<span class="producto-agotado">Agotado</span>`
      }
    </div>`;
}

function renderProductos() {
  const visibles = CONFIG.productosVisibles || 10;
  const grid = document.getElementById("productosGrid");
  const extra = document.getElementById("extraProductos");

  grid.innerHTML = PRODUCTOS.slice(0, visibles)
    .map((producto, index) => productoCardHTML(producto, index))
    .join("");

  const resto = PRODUCTOS.slice(visibles);
  if (resto.length) {
    extra.innerHTML = resto
      .map((producto, index) => productoCardHTML(producto, visibles + index))
      .join("");
  } else {
    document.getElementById("ver-mas").style.display = "none";
  }
}

function aplicarConfig() {
  // Use the configured business name as the document title
  document.title = CONFIG.nombreNegocio;

  document.querySelectorAll(".logo-texto").forEach((el) => {
    el.textContent = CONFIG.nombreNegocio;
  });

  // Links generales de WhatsApp
  const generalLink = waLink(CONFIG.mensajeWhatsappGeneral);
  ["referenciasWhatsapp", "footerWhatsapp", "promoWhatsapp"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = generalLink;
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
}

// --- Menú móvil (checkbox) ---
const menuCheckbox = document.getElementById("menu");
const navbar = document.querySelector(".navbar");

function ajustarNavbar() {
  if (window.innerWidth > BREAKPOINT_MOVIL) {
    navbar.style.display = "";      // en escritorio siempre visible
    menuCheckbox.checked = false;
  } else {
    navbar.style.display = menuCheckbox.checked ? "block" : "";
  }
}

menuCheckbox.addEventListener("change", ajustarNavbar);
window.addEventListener("resize", ajustarNavbar);

document.querySelectorAll(".navbar a").forEach((link) => {
  link.addEventListener("click", () => {
    menuCheckbox.checked = false;
    ajustarNavbar();
  });
});

// --- "Ver más" productos ---
document.getElementById("ver-mas").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("extraProductos").classList.add("show");
  e.currentTarget.style.display = "none";
});

window.addEventListener("DOMContentLoaded", () => {
  aplicarConfig();
  renderProductos();
  ajustarNavbar();
  // referencias: las imágenes se cargan directamente; sin animaciones
});