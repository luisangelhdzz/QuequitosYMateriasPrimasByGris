// ============================================================
// CATÁLOGO DE PRODUCTOS
// ------------------------------------------------------------
// CAMPOS DE CADA PRODUCTO
//
//   id          Identificador ÚNICO y estable. No lo cambies después
//               de publicarlo: es lo que se guarda en los pedidos y en
//               la base de datos. Usa minúsculas y guiones.
//   nombre      Nombre que ve el cliente.
//   precio      Precio BASE, sin signo de pesos ni comas.
//   unidad      "1 kg", "pieza", "set"… solo texto informativo.
//   categoria   Etiqueta gris que sale ARRIBA del nombre en la tarjeta
//               ("Colorantes", "Moldes", "Harinas"…). ADEMÁS sirve para
//               armar el submenú de la sección de productos: las pastillas
//               salen SOLAS de lo que escribas aquí, así que basta con
//               poner la misma palabra en los productos que van juntos.
//               Escríbela siempre igual (cuida acentos y mayúsculas), o
//               saldrán dos pastillas distintas para lo mismo.
//               Si un producto no la trae, solo aparece en "Todos".
//   imagen      Opcional: "img/archivo.jpg". Si no la pones, se usa el emoji.
//   emoji       Opcional: se muestra cuando no hay imagen.
//   disponible  false = se muestra "Agotado" y no se puede pedir.
//               OJO: esto es para algo que ya NO vendes. Lo que se agota y
//               vuelve NO se marca aquí, va en disponibilidad.json (que se
//               edita desde admin.html o desde github.com, sin tocar este
//               archivo ni subir el número de versión).
//   opciones    Opcional: grupos de variantes (ver abajo).
//   nota        Opcional: true = el cliente puede escribir una
//               especificación libre ("el rosa más pálido", "sin logo").
//
// ------------------------------------------------------------
// CÓMO FUNCIONAN LAS OPCIONES (colores, tamaños, presentaciones)
//
//   opciones: [
//     {
//       id: "color",            // clave interna, sin espacios
//       etiqueta: "Color",      // lo que ve el cliente
//       tipo: "color",          // "color" = muestras redondas
//       valores: [
//         { valor: "Rosa", hex: "#f2a2b4" },
//         { valor: "Azul", hex: "#9dc4e8" },
//       ],
//     },
//     {
//       id: "tamano",
//       etiqueta: "Tamaño",
//       tipo: "texto",          // "texto" = botones con el nombre
//       valores: [
//         { valor: "Chico" },              // no cambia el precio
//         { valor: "Mediano", precio: 25 } // SUMA $25 al precio base
//       ],
//     },
//   ]
//
//   · El precio de cada opción SE SUMA al precio base. Por eso conviene
//     que el precio base sea el de la variante más barata.
//   · Para marcar que un color se agotó (pero los demás sí hay), NO edites
//     este archivo: abre admin.html, apágalo ahí y pega el resultado en
//     disponibilidad.json. Así el cambio se ve en el sitio al momento.
//   · Un producto puede tener 1, 2 o los grupos que quieras.
//   · Si un producto no lleva variantes, simplemente no pongas "opciones".
// ============================================================

/* Paletas de color reutilizables: así no repites los hex en cada producto.
   Agrega o quita colores aquí y se actualizan todos los productos que las usen. */
const COLORES_PASTEL = [
  { valor: "Rosa",     hex: "#f2a2b4" },
  { valor: "Azul",     hex: "#9dc4e8" },
  { valor: "Amarillo", hex: "#f7dd8f" },
  { valor: "Verde",    hex: "#a8d5b5" },
  { valor: "Lila",     hex: "#c9b3e0" },
  { valor: "Blanco",   hex: "#ffffff" },
];

const COLORES_FUERTES = [
  { valor: "Rojo",   hex: "#d92b3a" },
  { valor: "Azul rey", hex: "#1f5fbf" },
  { valor: "Verde",  hex: "#1f9e56" },
  { valor: "Negro",  hex: "#2b2b2b" },
  { valor: "Dorado", hex: "#c9a227" },
  { valor: "Blanco", hex: "#ffffff" },
];

const PRODUCTOS = [
  // ----------------------------------------------------------
  // TUS PRODUCTOS
  // ----------------------------------------------------------
  {
    id: "bolas",
    categoria: "Decoración",
    nombre: "bolas",
    precio: 45,
    unidad: "1 kg",
    emoji: "🌾",
    disponible: true,
    opciones: [
      { id: "color", etiqueta: "Color", tipo: "color", valores: COLORES_PASTEL },
    ],
  },
  {
    id: "molde1",
    categoria: "Moldes",
    nombre: "molde1",
    precio: 38,
    unidad: "900 g",
    emoji: "🍚",
    disponible: true,
  },
  {
    id: "molde2",
    categoria: "Moldes",
    nombre: "molde2",
    precio: 180,
    unidad: "1 kg",
    emoji: "🍫",
    disponible: true,
  },
  {
    id: "molde3",
    categoria: "Moldes",
    nombre: "molde3",
    precio: 150,
    unidad: "set",
    emoji: "🎨",
    disponible: true,
  },
  {
    id: "corona",
    categoria: "Decoración",
    nombre: "corona",
    precio: 65,
    unidad: "250 ml",
    emoji: "🍶",
    disponible: true,
  },
  {
    id: "hbd",
    categoria: "Decoración",
    nombre: "hbd",
    precio: 55,
    unidad: "1 kg",
    emoji: "🧈",
    disponible: true,
    opciones: [
      { id: "color", etiqueta: "Color", tipo: "color", valores: COLORES_FUERTES },
    ],
  },
  {
    id: "fc",
    categoria: "Decoración",
    nombre: "fc",
    precio: 30,
    unidad: "100 g",
    emoji: "🎊",
    disponible: true,
  },

  // ----------------------------------------------------------
  // ↓↓↓ EJEMPLOS — muestran cómo se arman las variantes.
  //     Bórralos cuando metas tu catálogo real.
  // ----------------------------------------------------------
  {
    id: "colorante-gel",
    categoria: "Colorantes",
    nombre: "Colorante en gel",
    precio: 45,
    unidad: "frasco",
    emoji: "🎨",
    disponible: true,
    nota: true, // deja al cliente escribir el tono exacto que busca
    opciones: [
      { id: "color", etiqueta: "Color", tipo: "color", valores: COLORES_FUERTES },
      {
        id: "tamano",
        etiqueta: "Presentación",
        tipo: "texto",
        valores: [
          { valor: "30 g" },              // precio base: $45
          { valor: "100 g", precio: 55 }, // $45 + $55 = $100
          { valor: "250 g", precio: 130 },
        ],
      },
    ],
  },
  {
    id: "capacillos",
    categoria: "Capacillos",
    nombre: "Capacillos decorados",
    precio: 35,
    unidad: "paquete 50 pz",
    emoji: "🧁",
    disponible: true,
    opciones: [
      {
        id: "color",
        etiqueta: "Color",
        tipo: "color",
        valores: [
          ...COLORES_PASTEL,
          { valor: "Plata", hex: "#c9ccd1" }, // color extra, además de la paleta
        ],
      },
    ],
  },
  {
    id: "molde-silicon",
    categoria: "Moldes",
    nombre: "Molde de silicón",
    precio: 90,
    unidad: "pieza",
    emoji: "🍰",
    disponible: true,
    opciones: [
      {
        id: "tamano",
        etiqueta: "Tamaño",
        tipo: "texto",
        valores: [
          { valor: "Chico" },
          { valor: "Mediano", precio: 40 },
          { valor: "Grande", precio: 95 },
        ],
      },
      { id: "color", etiqueta: "Color", tipo: "color", valores: COLORES_PASTEL },
    ],
  },
  {
    id: "fondant",
    categoria: "Coberturas",
    nombre: "Fondant listo para usar",
    precio: 120,
    unidad: "1 kg",
    emoji: "⚪",
    disponible: true,
    opciones: [
      { id: "color", etiqueta: "Color", tipo: "color", valores: COLORES_PASTEL },
      {
        id: "presentacion",
        etiqueta: "Presentación",
        tipo: "texto",
        valores: [
          { valor: "500 g" },
          { valor: "1 kg", precio: 100 },
          { valor: "5 kg", precio: 480 },
        ],
      },
    ],
  },
  {
    id: "listón",
    categoria: "Decoración",
    nombre: "Listón decorativo",
    precio: 60,
    unidad: "rollo 30 m",
    emoji: "🎀",
    disponible: true,
    opciones: [
      { id: "color", etiqueta: "Color", tipo: "color", valores: COLORES_PASTEL },
      {
        id: "ancho",
        etiqueta: "Ancho",
        tipo: "texto",
        valores: [
          { valor: "1 cm" },
          { valor: "2.5 cm", precio: 25 },
          { valor: "4 cm", precio: 45 },
        ],
      },
    ],
  },
  {
    id: "base-carton",
    categoria: "Empaque",
    nombre: "Base de cartón para pastel",
    precio: 18,
    unidad: "pieza",
    emoji: "📦",
    disponible: true,
    opciones: [
      {
        id: "medida",
        etiqueta: "Medida",
        tipo: "texto",
        valores: [
          { valor: '8"' },
          { valor: '10"', precio: 7 },
          { valor: '12"', precio: 14 },
          { valor: '14"', precio: 22 },
        ],
      },
    ],
  },
  {
    id: "chispas",
    categoria: "Decoración",
    nombre: "Chispas de colores",
    precio: 50,
    unidad: "200 g",
    emoji: "🎊",
    disponible: true,
  },
  {
    id: "mangas",
    categoria: "Utensilios",
    nombre: "Mangas desechables",
    precio: 85,
    unidad: "paquete 100 pz",
    emoji: "🥄",
    disponible: true,
  },
];
