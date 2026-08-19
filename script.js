const BREAKPOINT_MOVIL = 600;
const IMAGENES_PRODUCTOS = [
  "img/foto_1.jpg","img/foto_2.jpg","img/foto_3.jpg","img/foto_4.jpg",
  "img/foto_5.jpg","img/foto_6.jpg","img/foto_8.jpg","img/foto_9.jpg",
];

function waLink(mensaje) { return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}`; }
function formatoPrecio(n) { return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" }); }

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
      ${p.disponible
          ? `<a href="${waLink(mensaje)}" target="_blank" rel="noopener" class="btn-pedir">Pedir por WhatsApp</a>`
          : `<span class="producto-agotado">Agotado</span>`}
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

window.addEventListener("DOMContentLoaded", () => {
  aplicarConfig();
  renderProductos();
  ajustarNavbar();
  // Animación del título desactivada por petición del usuario
});
// Animación del título removida: no quedan funciones ni llamadas relacionadas.