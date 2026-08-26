# Quequitos y Materias Primas by Gris

Catálogo web de materias primas de repostería. El cliente arma su carrito
eligiendo colores y presentaciones, y el pedido completo se manda por WhatsApp.
**No hay pagos en línea**: el cobro se cierra por WhatsApp, en efectivo o
transferencia.

Es un sitio **estático**: solo HTML, CSS y JavaScript. No necesita servidor ni
proceso de compilación. Opcionalmente puede mandar una copia de cada pedido a
una API propia — ver `BACKEND.md`.

---

## Cómo actualizar el contenido

Casi todo se cambia sin tocar el diseño:

| Qué quieres cambiar | Archivo | Dónde |
|---|---|---|
| Nombre del negocio, WhatsApp, teléfono, ciudad, redes sociales | `config.js` | arriba del archivo |
| Dirección que sale en el mapa | `config.js` | campo `direccion` |
| Cuántos productos se ven antes del botón "Ver más" | `config.js` | campo `productosVisibles` |
| Agregar, quitar o editar productos | `productos.js` | la lista `PRODUCTOS` |
| Colores y tamaños de un producto | `productos.js` | el campo `opciones` |
| **Marcar algo como agotado** | `disponibilidad.json` | se edita desde `admin.html` |
| URL de la API de pedidos | `config.js` | campo `apiPedidos` (ver `BACKEND.md`) |

### Agregar un producto

Abre `productos.js` y copia un bloque existente:

```js
{
  id: "chocolate-mesa",          // único y fijo: se guarda en los pedidos
  nombre: "Chocolate de mesa",
  precio: 180,                   // precio BASE, sin $ ni comas
  unidad: "1 kg",
  imagen: "img/foto_1.jpg",      // opcional
  disponible: true,
},
```

- `id` no se debe cambiar una vez publicado: es lo que identifica al producto
  en los pedidos ya hechos.
- `imagen` es opcional. La foto se guarda en la carpeta `img/`.
- `disponible: false` muestra el producto marcado como "Agotado".

### Que un producto venga en varios colores o tamaños

Agrégale un campo `opciones`:

```js
opciones: [
  { id: "color", etiqueta: "Color", tipo: "color", valores: COLORES_PASTEL },
  {
    id: "tamano", etiqueta: "Tamaño", tipo: "texto",
    valores: [
      { valor: "Chico" },                // precio base
      { valor: "Grande", precio: 60 },   // SUMA $60 al precio base
    ],
  },
],
```

El precio de cada opción **se suma** al precio base, así que conviene que el
precio base sea el de la variante más barata. Arriba de `productos.js` está la
explicación completa con todos los campos, y hay varios ejemplos marcados al
final de la lista que puedes borrar cuando metas tu catálogo real.

Las paletas `COLORES_PASTEL` y `COLORES_FUERTES` están definidas arriba en el
mismo archivo: edítalas ahí una vez y cambian en todos los productos que las
usen.

---

## Ver el sitio en tu computadora

Abrir `index.html` con doble clic funciona a medias. Es mejor levantar un
servidor local para que todo cargue igual que en internet:

```bash
cd ruta/al/proyecto
python3 -m http.server 5500
```

Luego abre <http://localhost:5500> en el navegador.

---

## Publicar los cambios

```bash
git add .
git commit -m "Describe aquí el cambio"
git push
```

Con GitHub Pages, Vercel o Cloudflare Pages conectados al repositorio, el sitio
se actualiza solo unos segundos después del `push`.

---

---

## Marcar un producto agotado (lo del día a día)

Esto **no** se hace en `productos.js`. Vive en `disponibilidad.json`, un archivo
chiquito aparte, justo para poder cambiarlo rápido y desde el celular.

1. Abre `.../admin.html` en el navegador (funciona desde el teléfono).
2. Apaga el interruptor del producto que se acabó, o pícale al color agotado.
3. **Copiar**.
4. **Abrir en GitHub** → lápiz ✏️ → seleccionar todo → pegar → *Commit changes*.
5. En menos de un minuto el sitio ya lo muestra agotado.

Cuando el producto vuelva, el mismo camino al revés.

Detalles que valen la pena saber:

- **No hay que subir el `?v=`** para esto. El sitio pide ese archivo con
  `cache: "no-store"`, así que siempre baja el más reciente.
- Si `disponibilidad.json` tiene un error de sintaxis, se cae la conexión o el
  archivo no existe, **el sitio muestra todo disponible**. Nunca se queda vacío
  por culpa de ese archivo.
- El catálogo se pinta primero y los agotados se apagan un instante después, así
  que la página no se tarda más en cargar.
- Si un cliente tenía algo en su carrito y se agotó, se le quita solo y se le
  avisa la próxima vez que entre.
- `admin.html` es pública, pero no guarda ni cambia nada: solo arma el texto.
  Para que el cambio se aplique hay que iniciar sesión en GitHub.
- El campo `disponible: false` de `productos.js` es otra cosa: úsalo para algo
  que **ya no vendes**, no para lo que se acaba y vuelve.

---

> **Importante al publicar cambios en `style.css`, `script.js`, `config.js` o
> `productos.js`:** sube el número de versión en `index.html`
> (`style.css?v=2` → `?v=3`, y lo mismo en los `<script>`). Si no, el navegador
> de tus clientes sigue mostrando la versión vieja que tiene guardada.

---

## Notas técnicas

- Las rutas de archivos son **relativas**, así que el sitio funciona tanto en la
  raíz de un dominio como en un subdirectorio (por ejemplo GitHub Pages).
- El carrito se guarda en el navegador del cliente (`localStorage`), así que si
  cierra la pestaña y vuelve, su pedido sigue ahí. Si el navegador no lo
  permite (modo privado), el carrito simplemente vive mientras dure la visita.
- Las imágenes deben ir optimizadas antes de subirlas: conviene que no pasen de
  unos 2000 px de ancho ni de ~500 KB. Una foto de varios megapíxeles hace que
  el header tarde en pintarse y se vea como si "saltara" al cargar.
- Los JPEG del sitio se guardan en modo *baseline* (no progresivo), para que no
  se dibujen primero borrosos y luego nítidos.
- El mapa usa el modo *embed* de Google Maps: no requiere API key ni cuenta.
