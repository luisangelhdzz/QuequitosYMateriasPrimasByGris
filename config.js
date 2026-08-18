// ============================================================
// CONFIGURACIÓN DEL NEGOCIO
// Edita estos valores con los datos reales de tu negocio.
// Todo lo demás (HTML, CSS, JS) toma la info de aquí.
// ============================================================

const CONFIG = {
  nombreNegocio: "Quequitos y Materias Primas by Gris", // nombre mostrado en la página y pestaña

  // Número de WhatsApp SIN espacios, SIN "+", con código de país.
  whatsapp: "528129016051",

  // Mensaje que se completa con el nombre del producto al pedir.
  mensajeWhatsapp: (producto) =>
    `Hola, me gustaría hacer un pedido de: *${producto}*. ¿Me pueden confirmar disponibilidad y precio?`,

  mensajeWhatsappGeneral:
    "Hola, vi su catálogo en línea y quisiera más información.",

  ciudad: "Saltillo, Coahuila",
  telefonoTexto: "+52 81 2901 6051",

  facebook: "https://www.facebook.com/luis.angel.hernandez.692401/",
  instagram: "https://www.instagram.com/luisangelhdzz/",

  // Cuántos productos se muestran de entrada antes de "Ver más".
  productosVisibles: 10,
};
