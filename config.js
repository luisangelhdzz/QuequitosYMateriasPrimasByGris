// ============================================================
// CONFIGURACIÓN DEL NEGOCIO
// Edita estos valores con los datos reales de tu negocio.
// Todo lo demás (HTML, CSS, JS) toma la info de aquí.
// ============================================================

const CONFIG = {
  nombreNegocio: "Quequitos y Materias Primas by Gris", // nombre mostrado en la página y pestaña

  // Número de WhatsApp SIN espacios, SIN "+", con código de país.
  whatsapp: "528441756301",   // aquí llegan los pedidos del catálogo

  // Mensaje al pedir UN SOLO producto directo desde su tarjeta.
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

  // ============================================================
  // PEDIDOS
  // ============================================================

  // Prefijo del folio. Cada pedido genera algo como QG-260821-4831.
  folioPrefijo: "QG",

  // Pedir el nombre del cliente antes de mandar el pedido.
  pedirNombreCliente: true,

  // ------------------------------------------------------------
  // BACKEND (tu API en Java + PostgreSQL)
  // ------------------------------------------------------------
  // Déjalo en "" mientras no tengas el backend arriba: el pedido se
  // manda SOLO por WhatsApp y la página funciona igual de bien.
  //
  // Cuando publiques tu API, pon aquí la URL del endpoint que recibe
  // los pedidos, por ejemplo:
  //   apiPedidos: "https://api.quequitosbygris.com/api/pedidos",
  //
  // IMPORTANTE:
  //  · Tiene que ser HTTPS. Si la página está en HTTPS (GitHub Pages,
  //    Vercel, Cloudflare) el navegador BLOQUEA llamadas a http:// .
  //  · Tu backend debe permitir CORS desde el dominio de la página.
  //  · Si la API falla o está apagada, el pedido igual se manda por
  //    WhatsApp. Nunca se pierde una venta por culpa del servidor.
  apiPedidos: "",

  // Opcional: token que se manda en el header "Authorization" para que
  // no cualquiera pueda insertar pedidos falsos en tu base de datos.
  // Ojo: al ser una página estática, este valor es visible para quien
  // revise el código. Sirve para filtrar bots, no como seguridad real.
  apiToken: "",
};
