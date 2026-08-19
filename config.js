// ============================================================
// CONFIGURACIÓN DEL NEGOCIO
// Edita estos valores con los datos reales de tu negocio.
// Todo lo demás (HTML, CSS, JS) toma la info de aquí.
// ============================================================

const CONFIG = {
  nombreNegocio: "Quequitos y Materias Primas by Gris", // nombre mostrado en la página y pestaña

  // Número de WhatsApp SIN espacios, SIN "+", con código de país.
  whatsapp: "528441756301",   // aquí llegan los pedidos del catálogo

  // Mensaje que se completa con el nombre del producto al pedir.
  mensajeWhatsapp: (producto) =>
    `Hola, me gustaría hacer un pedido de: *${producto}*. ¿Me pueden confirmar disponibilidad y precio?`,

  mensajeWhatsappGeneral:
    "Hola, vi su catálogo en línea y quisiera más información.",

  ciudad: "Saltillo, Coahuila",

  // Dirección del local para el mapa de la sección "Pasión por la repostería".
  // Escríbela como la buscarías en Google Maps: calle, número, colonia, ciudad.
  // Entre más exacta, mejor cae el pin.
  direccion: "calle Pablo Neruda #1124, Col. Chapultepec, Saltillo, Coahuila",
  telefonoTexto: "+52 844 175 6301",   // teléfono público del negocio

  facebook: "https://www.facebook.com/profile.php?id=100063769861712",
  instagram: "https://www.instagram.com/luisangelhdzz/",

  // Cuántos productos se muestran de entrada antes de "Ver más".
  productosVisibles: 9,
};