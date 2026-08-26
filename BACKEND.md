# Backend de pedidos — contrato para Java + PostgreSQL

La página ya está lista para mandarle los pedidos a tu API. Este documento
tiene **exactamente** lo que la web envía, el esquema de base de datos que le
corresponde y un esqueleto de Spring Boot para recibirlo.

---

## 1. Cómo se conecta la web

En `config.js`:

```js
apiPedidos: "",     // vacío = solo WhatsApp
apiToken:   "",     // opcional
```

Mientras `apiPedidos` esté vacío, la página funciona igual pero solo manda el
pedido por WhatsApp. Cuando tengas tu API publicada, pones la URL:

```js
apiPedidos: "https://api.tudominio.com/api/pedidos",
```

Y a partir de ahí cada pedido se manda a los dos lados.

### Tres cosas que te van a morder si no las cuidas

1. **HTTPS obligatorio.** La página vive en GitHub Pages, que es HTTPS. El
   navegador **bloquea** cualquier `fetch` a `http://`. Tu API tiene que estar
   en HTTPS (Railway, Render, Fly.io y Cloudflare Tunnel te dan certificado
   gratis). Para probar en local sirve `http://localhost` abriendo la página
   también desde `localhost`.
2. **CORS.** El navegador va a mandar primero un `OPTIONS` (preflight) porque
   el `Content-Type` es `application/json`. Si tu backend no responde ese
   `OPTIONS`, el pedido nunca llega. Abajo está la configuración de Spring.
3. **El pedido nunca se pierde.** La web manda el POST con `keepalive` y **no
   espera la respuesta**. Si tu servidor está apagado, el cliente igual se va a
   WhatsApp sin enterarse de nada. Esto es a propósito: no quieres perder una
   venta porque se cayó el servidor.

> Sobre `apiToken`: al ser una página estática, ese valor queda visible para
> quien revise el código fuente. Sirve para filtrar bots tontos, **no** como
> seguridad de verdad. Si te llegan a spamear pedidos falsos, lo que funciona
> es rate limiting por IP y un campo honeypot, no el token.

---

## 2. El JSON que manda la web

`POST /api/pedidos`
`Content-Type: application/json`
`Authorization: Bearer <apiToken>` (solo si configuraste uno)

```json
{
  "folio": "QG-260821-5353",
  "creado_en": "2026-08-21T22:34:15.336Z",
  "canal": "web",
  "moneda": "MXN",
  "cliente": {
    "nombre": "Luis",
    "telefono": null
  },
  "nota": "Lo necesito el viernes",
  "total": 145,
  "items": [
    {
      "producto_id": "colorante-gel",
      "nombre": "Colorante en gel",
      "unidad": "frasco",
      "cantidad": 1,
      "precio_unitario": 100,
      "subtotal": 100,
      "opciones": { "Color": "Azul rey", "Presentación": "100 g" },
      "nota": "el azul mas intenso"
    },
    {
      "producto_id": "colorante-gel",
      "nombre": "Colorante en gel",
      "unidad": "frasco",
      "cantidad": 1,
      "precio_unitario": 45,
      "subtotal": 45,
      "opciones": { "Color": "Rojo", "Presentación": "30 g" },
      "nota": null
    }
  ]
}
```

Notas sobre el formato:

- `folio` lo genera la web. Es legible para humanos y sirve para cruzar el
  mensaje de WhatsApp con el registro de la base. **No confíes en que sea
  único**: se arma con fecha + 4 dígitos al azar. Ponle `UNIQUE` en la tabla y
  si choca, regeneras uno del lado del servidor.
- `creado_en` viene en UTC (ISO-8601). Guárdalo como `timestamptz`.
- `opciones` es un diccionario **libre**: las llaves son las etiquetas que
  pusiste en `productos.js` ("Color", "Tamaño", "Presentación", "Ancho"…).
  Por eso va como `jsonb` y no como columnas fijas — si mañana agregas un
  producto con la opción "Sabor", no tienes que migrar nada.
- `telefono` hoy siempre viene `null`. El teléfono real lo obtienes de
  WhatsApp cuando el cliente te escribe. Lo dejé en el contrato para que no
  tengas que cambiar el esquema si algún día pides el número en la web.
- El mismo producto con distintas opciones son **dos renglones distintos**.
- Los precios ya vienen calculados (base + lo que suma cada opción). Aun así
  **recalcula el total en el servidor** antes de darlo por bueno: cualquiera
  puede editar el JSON desde la consola del navegador.

---

## 3. Esquema de PostgreSQL

```sql
CREATE TABLE pedidos (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    folio            TEXT        NOT NULL UNIQUE,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
    recibido_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    cliente_nombre   TEXT,
    cliente_telefono TEXT,
    canal            TEXT        NOT NULL DEFAULT 'web',
    moneda           TEXT        NOT NULL DEFAULT 'MXN',
    total            NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    nota             TEXT,
    estado           TEXT        NOT NULL DEFAULT 'nuevo'
                     CHECK (estado IN ('nuevo','confirmado','preparando','entregado','cancelado'))
);

CREATE TABLE pedido_items (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id       BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id     TEXT   NOT NULL,
    nombre          TEXT   NOT NULL,
    unidad          TEXT,
    cantidad        INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal        NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    opciones        JSONB  NOT NULL DEFAULT '{}'::jsonb,
    nota            TEXT
);

CREATE INDEX idx_pedidos_creado    ON pedidos (creado_en DESC);
CREATE INDEX idx_pedidos_estado    ON pedidos (estado);
CREATE INDEX idx_items_pedido      ON pedido_items (pedido_id);
CREATE INDEX idx_items_producto    ON pedido_items (producto_id);
CREATE INDEX idx_items_opciones    ON pedido_items USING GIN (opciones);
```

> Si tu Postgres es anterior a la versión 10, cambia
> `BIGINT GENERATED ALWAYS AS IDENTITY` por `BIGSERIAL`.

Guardo `nombre`, `precio_unitario` y `unidad` **copiados** dentro de
`pedido_items` en vez de solo apuntar a un catálogo. Es a propósito: si mañana
le subes el precio al fondant, los pedidos viejos tienen que seguir mostrando
lo que se cobró ese día.

`estado` es para el dashboard: nuevo → confirmado → preparando → entregado.

---

## 4. Esqueleto de Spring Boot

### DTOs

```java
package com.gris.pedidos.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record PedidoDTO(
        String folio,
        OffsetDateTime creado_en,
        String canal,
        String moneda,
        ClienteDTO cliente,
        String nota,
        BigDecimal total,
        List<ItemDTO> items
) {
    public record ClienteDTO(String nombre, String telefono) {}

    public record ItemDTO(
            String producto_id,
            String nombre,
            String unidad,
            int cantidad,
            BigDecimal precio_unitario,
            BigDecimal subtotal,
            Map<String, String> opciones,
            String nota
    ) {}
}
```

Jackson mapea `creado_en` y `producto_id` tal cual si agregas en
`application.properties`:

```properties
spring.jackson.property-naming-strategy=SNAKE_CASE
```

…o si prefieres nombres Java normales, pon `@JsonProperty("producto_id")` en
cada campo. Cualquiera de las dos sirve.

### Controlador

```java
@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoService service;

    public PedidoController(PedidoService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<?> recibir(@RequestBody PedidoDTO dto) {
        // Recalcula el total del lado del servidor: el JSON viene del navegador
        // y cualquiera puede editarlo antes de mandarlo.
        BigDecimal calculado = dto.items().stream()
                .map(i -> i.precio_unitario().multiply(BigDecimal.valueOf(i.cantidad())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long id = service.guardar(dto, calculado);
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(Map.of("id", id, "folio", dto.folio()));
    }

    @GetMapping
    public List<PedidoResumen> listar(
            @RequestParam(defaultValue = "nuevo") String estado) {
        return service.listar(estado);
    }
}
```

### Guardar con JdbcTemplate

Si no quieres pelearte con JPA para dos tablas, esto basta:

```java
@Service
public class PedidoService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public PedidoService(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc; this.mapper = mapper;
    }

    @Transactional
    public long guardar(PedidoDTO dto, BigDecimal total) {
        Long pedidoId = jdbc.queryForObject("""
            INSERT INTO pedidos
                (folio, creado_en, cliente_nombre, cliente_telefono,
                 canal, moneda, total, nota)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            """,
            Long.class,
            dto.folio(),
            Timestamp.from(dto.creado_en().toInstant()),
            dto.cliente() == null ? null : dto.cliente().nombre(),
            dto.cliente() == null ? null : dto.cliente().telefono(),
            dto.canal(), dto.moneda(), total, dto.nota());

        for (var it : dto.items()) {
            PGobject opciones = new PGobject();
            opciones.setType("jsonb");
            opciones.setValue(mapper.writeValueAsString(it.opciones()));

            jdbc.update("""
                INSERT INTO pedido_items
                    (pedido_id, producto_id, nombre, unidad, cantidad,
                     precio_unitario, subtotal, opciones, nota)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                pedidoId, it.producto_id(), it.nombre(), it.unidad(),
                it.cantidad(), it.precio_unitario(), it.subtotal(),
                opciones, it.nota());
        }
        return pedidoId;
    }
}
```

(`mapper.writeValueAsString` lanza `JsonProcessingException` — envuélvelo o
declara `throws` según cómo manejes errores.)

### CORS

Sin esto el navegador **no** manda el pedido y no vas a ver nada en los logs
más que un `OPTIONS`:

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(
                    "https://luisangelhdzz.github.io",
                    "http://localhost:5500"      // para pruebas locales
                )
                .allowedMethods("GET", "POST", "PATCH", "OPTIONS")
                .allowedHeaders("*");
    }
}
```

Pon el origen exacto (`https://luisangelhdzz.github.io`), sin la ruta del
repositorio y sin diagonal al final.

---

## 5. Consultas útiles para el dashboard

```sql
-- Pedidos nuevos, con su número de artículos
SELECT p.id, p.folio, p.creado_en, p.cliente_nombre, p.total, p.estado,
       (SELECT sum(cantidad) FROM pedido_items i WHERE i.pedido_id = p.id) AS articulos
FROM pedidos p
WHERE p.estado = 'nuevo'
ORDER BY p.creado_en DESC;

-- Un pedido completo, con todo y opciones
SELECT i.nombre, i.cantidad, i.precio_unitario, i.subtotal, i.opciones, i.nota
FROM pedido_items i
JOIN pedidos p ON p.id = i.pedido_id
WHERE p.folio = 'QG-260821-5353';

-- Lo más vendido del mes
SELECT i.nombre, sum(i.cantidad) AS piezas, sum(i.subtotal) AS vendido
FROM pedido_items i
JOIN pedidos p ON p.id = i.pedido_id
WHERE p.creado_en >= date_trunc('month', now())
GROUP BY i.nombre
ORDER BY piezas DESC;

-- Qué colores te piden más (aprovechando el jsonb)
SELECT i.opciones ->> 'Color' AS color, sum(i.cantidad) AS piezas
FROM pedido_items i
WHERE i.opciones ? 'Color'
GROUP BY color
ORDER BY piezas DESC;
```

Esa última es la que justifica haber guardado las opciones en `jsonb`: te dice
qué colores conviene tener siempre en existencia.

---

## 6. La app de escritorio en Java

Como la base es Postgres, la app de escritorio tiene dos caminos:

- **Conectarse directo por JDBC** (`org.postgresql.Driver`). Es lo más rápido
  de escribir, pero la contraseña de la base queda dentro del `.jar` que
  instalas en la computadora del local. Sirve si la app solo la va a usar Gris
  en la tienda.
- **Consumir la misma API REST** que ya vas a tener. Es más trabajo al
  principio pero la lógica de negocio queda en un solo lugar, y el día que
  quieras una app de celular no reescribes nada.

Si vas por JDBC, para que la app se entere de pedidos nuevos sin estar
consultando cada segundo, Postgres tiene `LISTEN/NOTIFY`:

```sql
CREATE OR REPLACE FUNCTION avisar_pedido_nuevo() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('pedidos_nuevos', NEW.folio);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pedido_nuevo
AFTER INSERT ON pedidos
FOR EACH ROW EXECUTE FUNCTION avisar_pedido_nuevo();
```

Del lado de Java, `PGConnection.getNotifications()` te entrega el aviso y ahí
haces sonar una campanita en la caja.

---

## 7. Orden sugerido para armarlo

1. Levanta Postgres y corre el DDL de arriba.
2. Spring Boot con el `POST /api/pedidos` y CORS. Pruébalo con `curl` pegando
   el JSON de la sección 2.
3. Publícalo en HTTPS (Railway o Render son gratis para empezar).
4. Pon la URL en `config.js`, sube el número de `?v=` en `index.html`, y haz
   `git push`.
5. Haz un pedido de prueba desde el celular y confirma que llega a las dos
   partes: WhatsApp y la tabla `pedidos`.
6. Ya con datos reales, el dashboard y la app de escritorio.
