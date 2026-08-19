# Quequitos y Materias Primas by Gris

Catálogo web de materias primas de repostería. Los pedidos se cierran por WhatsApp;
no hay carrito ni pagos en línea.

Es un sitio **estático**: solo HTML, CSS y JavaScript. No necesita servidor,
base de datos ni proceso de compilación.

---

## Cómo actualizar el contenido

Casi todo se cambia sin tocar el diseño:

| Qué quieres cambiar | Archivo | Dónde |
|---|---|---|
| Nombre del negocio, WhatsApp, teléfono, ciudad, redes sociales | `config.js` | arriba del archivo |
| Dirección que sale en el mapa | `config.js` | campo `direccion` |
| Cuántos productos se ven antes del botón "Ver más" | `config.js` | campo `productosVisibles` |
| Agregar, quitar o editar productos | `productos.js` | la lista `PRODUCTOS` |

### Agregar un producto

Abre `productos.js` y copia una línea existente:

```js
{ nombre: "Chocolate de mesa", precio: 180, unidad: "1 kg", imagen: "img/foto_1.jpg", disponible: true },
```

- `precio` va sin signo de pesos ni comas.
- `imagen` es opcional. La foto se guarda en la carpeta `img/`.
- `disponible: false` muestra el producto marcado como "Agotado".

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

## Notas técnicas

- Las rutas de archivos son **relativas**, así que el sitio funciona tanto en la
  raíz de un dominio como en un subdirectorio (por ejemplo GitHub Pages).
- Las imágenes deben ir optimizadas antes de subirlas: conviene que no pasen de
  unos 2000 px de ancho ni de ~500 KB. Una foto de varios megapíxeles hace que
  el header tarde en pintarse y se vea como si "saltara" al cargar.
- Los JPEG del sitio se guardan en modo *baseline* (no progresivo), para que no
  se dibujen primero borrosos y luego nítidos.
- El mapa usa el modo *embed* de Google Maps: no requiere API key ni cuenta.
