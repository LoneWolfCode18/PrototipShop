# PrototipShop · Arquitectura del MVP para RKeens

Catálogo + mostrador digital para una tienda de ropa en galería de Gamarra.
Sin pasarela de pagos: el carrito genera un pedido estructurado y lo manda a **WhatsApp**.

**Repo:** `PrototipShop` (monorepo) · **Stack:** Next.js + Tailwind · Node/Express · PostgreSQL (Supabase)

---

## 1. Cosas que se nos escapaban (agregadas al diseño)

| # | Mejora | Por qué importa en Gamarra |
|---|--------|----------------------------|
| 1 | **Precio por mayor** (tabla `price_tiers`) | Gamarra vive del por mayor/docena. Si el catálogo no lo muestra, el cliente igual escribe a preguntar. |
| 2 | **Registro de pedidos** (`orders`, `order_items`) | Aunque el pago sea por WhatsApp, guardar qué se pidió da métricas (prendas más pedidas, tallas que faltan) y es oro para vender el servicio. |
| 3 | **Stock por variante** (talla + color) y alerta de stock bajo | El stock real es por talla/color, no por producto. |
| 4 | **Historial de movimientos de stock** | Evita el "¿quién tocó el stock?" entre socios y vendedores. |
| 5 | **Modo Mostrador** (pantalla en tienda) | Vista a pantalla completa para tablet/TV: muestra disponibilidad, QR por prenda, y el vendedor arma pedidos con el cliente. |
| 6 | **QR por prenda/estante** | Cuelgas un QR en la percha que abre la ficha del producto con tallas y stock. |
| 7 | **Código de pedido** (ej. `RK-20261020-0042`) | Va en el mensaje de WhatsApp para que el vendedor identifique el pedido y lo busque en el panel. |
| 8 | **Imágenes optimizadas** (Supabase Storage + `next/image`) | Muchos clientes en Gamarra navegan desde celular con datos móviles. |
| 9 | **Autenticación del admin** (Supabase Auth) con rol | El panel no puede quedar abierto. Mínimo: 1 admin + vendedores con permisos limitados (fase 2). |
| 10 | **Analítica básica** (Plausible/GA4 + clics en "Enviar a WhatsApp") | Sirve para demostrarle al cliente que el sistema le trae pedidos. |
| 11 | **Tema legal: marca Nike** | Los "Nike Tech réplica" son un riesgo si aparece el nombre o logo de Nike en el catálogo público (reclamos de marca, bloqueo de Instagram/Google). Recomendación: llamarlos *"Conjunto Tech Fleece"* / *"Estilo Tech"*, sin logos ni la palabra Nike en nombre, descripción, tags o SEO. |
| 12 | **Cold start de Render** | El plan gratuito de Render duerme el servicio tras inactividad y el primer request tarda. Para producción conviene un plan de pago o un "ping" programado. Ver nota de alternativa en la sección 6. |

---

## 2. Base de datos

Ver `schema.sql` (listo para pegar en Supabase → SQL Editor). Resumen del modelo:

```
categories ─┐
fits ───────┤
materials ──┼──< products >──< product_variants (talla + color + stock)
            │         │
            │         ├──< product_images
            │         └──< price_tiers  (precio por mayor)
sizes, colors ─── (catálogos para variantes)

orders >──< order_items          stock_movements (auditoría)
store_settings (1 fila: número de WhatsApp, dirección de galería, horario)
```

---

## 3. API REST (Express)

Base: `/api/v1` · Respuestas JSON · Errores `{ error: { code, message } }`

### 3.1 Público (sin login)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/products` | Lista con filtros y paginación. Query: `gender`, `category`, `fit`, `material`, `color`, `size`, `minPrice`, `maxPrice`, `inStock=true`, `q`, `sort` (`price_asc`, `price_desc`, `newest`), `page`, `limit` |
| GET | `/products/:slug` | Detalle con variantes (talla/color/stock), imágenes y escalas de precio por mayor |
| GET | `/products/featured` | Destacados para el home |
| GET | `/filters` | Opciones disponibles para los filtros (categorías, cortes, materiales, colores, tallas) |
| GET | `/settings` | Datos públicos de la tienda (WhatsApp, dirección, horario) |
| POST | `/cart/validate` | Recibe el carrito, valida stock y recalcula precios (incluye precio por mayor). Devuelve el carrito corregido |
| POST | `/orders` | Registra el pedido (`origin: online / tienda`), genera el código y devuelve `{ code, whatsappUrl, whatsappText }` |
| GET | `/health` | Para monitoreo y "ping" anti cold-start |

### 3.2 Admin (requiere `Authorization: Bearer <JWT de Supabase>` + rol admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/admin/auth/login` | Opcional si el login se hace directo con Supabase Auth desde el frontend |
| GET | `/admin/products` | Lista completa (incluye inactivos) |
| POST | `/admin/products` | Crear prenda |
| PUT | `/admin/products/:id` | Editar prenda (nombre, precio, corte, material, etc.) |
| PATCH | `/admin/products/:id/status` | Activar / desactivar |
| DELETE | `/admin/products/:id` | Eliminar (o desactivar si tiene pedidos) |
| POST | `/admin/products/:id/variants` | Agregar variante (talla + color + stock) |
| PUT | `/admin/variants/:id` | Editar variante |
| PATCH | `/admin/variants/:id/stock` | Ajustar stock `{ delta, reason }` → crea registro en `stock_movements` |
| POST | `/admin/products/:id/images` | Subir imagen (URL firmada de Supabase Storage) |
| DELETE | `/admin/images/:id` | Quitar imagen |
| PUT | `/admin/products/:id/price-tiers` | Reemplazar escalas de precio por mayor |
| GET | `/admin/orders` | Lista de pedidos con filtros por estado y fecha |
| GET | `/admin/orders/:id` | Detalle del pedido |
| PATCH | `/admin/orders/:id/status` | Cambiar estado (`confirmado`, `pagado`, `entregado`, `cancelado`). Al confirmar, descuenta stock |
| GET | `/admin/stock/low` | Variantes con stock bajo |
| GET | `/admin/stock/movements` | Historial de movimientos |
| GET | `/admin/stats` | Resumen: pedidos del mes, prendas más pedidas, tallas más pedidas |
| PUT | `/admin/settings` | Actualizar número de WhatsApp, dirección, horario |
| CRUD | `/admin/categories`, `/fits`, `/materials`, `/colors` | Mantenimiento de catálogos |

**Regla de stock sugerida:** el stock se descuenta cuando el admin marca el pedido como `confirmado`, no cuando el cliente lo envía (puede no concretarse).

---

## 4. Estructura de carpetas (monorepo)

```
PrototipShop/
├── README.md
├── package.json                 # workspaces: apps/*, packages/*
├── .gitignore
├── .env.example
├── docs/
│   ├── ARQUITECTURA.md
│   └── propuesta-comercial.md
├── supabase/
│   ├── schema.sql
│   ├── seed.sql
│   └── migrations/
├── packages/
│   └── shared/                  # tipos y validaciones compartidas (Zod)
│       └── src/{schemas,types,constants}.ts
├── apps/
│   ├── api/                     # Node + Express (Render)
│   │   ├── package.json
│   │   └── src/
│   │       ├── server.ts
│   │       ├── app.ts
│   │       ├── config/          # env, supabase client
│   │       ├── middlewares/     # auth.ts, validate.ts, errorHandler.ts, rateLimit.ts
│   │       ├── routes/          # public/ y admin/
│   │       ├── controllers/
│   │       ├── services/        # lógica: products, cart, orders, stock, whatsapp
│   │       ├── repositories/    # consultas a Supabase
│   │       └── utils/           # orderCode.ts, money.ts
│   └── web/                     # Next.js (App Router) + Tailwind (Vercel)
│       ├── package.json
│       ├── tailwind.config.ts
│       └── src/
│           ├── app/
│           │   ├── (tienda)/
│           │   │   ├── page.tsx                 # home
│           │   │   ├── catalogo/page.tsx        # listado + filtros
│           │   │   ├── producto/[slug]/page.tsx
│           │   │   └── carrito/page.tsx
│           │   ├── mostrador/page.tsx           # modo tienda (pantalla completa)
│           │   └── admin/
│           │       ├── login/page.tsx
│           │       ├── productos/...
│           │       ├── pedidos/...
│           │       └── stock/page.tsx
│           ├── components/
│           │   ├── ui/            # botones, modales, badges
│           │   ├── catalog/       # ProductCard, FilterBar, SizePicker
│           │   ├── cart/          # CartDrawer, CartSummary
│           │   └── admin/         # tablas y formularios
│           ├── lib/               # apiClient.ts, whatsapp.ts, format.ts
│           ├── store/             # carrito (Zustand + localStorage)
│           └── hooks/
└── .github/workflows/ci.yml       # lint + build en cada PR
```

**Flujo de trabajo con Miguel (Git):** rama `main` protegida, ramas `feature/...` por tarea, Pull Requests entre ustedes dos y commits cortos (`feat:`, `fix:`, `docs:`). Reparto natural: uno toma `apps/web`, el otro `apps/api` + `supabase`, y `packages/shared` lo acuerdan juntos primero.

---

## 5. Plantilla del mensaje de WhatsApp

### Texto que recibe el vendedor

```
🛍️ *NUEVO PEDIDO · RKeens*
Código: *RK-20261020-0042*
Origen: Web

👤 *Cliente:* {nombre}
📱 *Teléfono:* {telefono}
🚚 *Entrega:* {Recojo en galería | Envío a: dirección/distrito}

━━━━━━━━━━━━━━
*DETALLE*

1) Polo Boxy Fit "Ola Negra"
   Talla: M · Color: Negro
   2 × S/ 45.00 = S/ 90.00

2) Conjunto Tech Fleece (buzo + casaca)
   Talla: L · Color: Gris
   1 × S/ 140.00 = S/ 140.00

━━━━━━━━━━━━━━
*Total: S/ 230.00*

📝 Nota: {nota del cliente}

Pedido generado desde el catálogo digital.
```

### Código base (`apps/web/src/lib/whatsapp.ts`)

```ts
type Item = { name: string; size: string; color: string; qty: number; unitPrice: number };

export function buildWhatsAppUrl(opts: {
  phone: string; code: string; origin: 'Web' | 'Tienda';
  customer: { name: string; phone?: string; delivery: string; note?: string };
  items: Item[];
}) {
  const money = (n: number) => `S/ ${n.toFixed(2)}`;
  const lines = opts.items.map((it, i) =>
    `${i + 1}) ${it.name}\n   Talla: ${it.size} · Color: ${it.color}\n   ${it.qty} × ${money(it.unitPrice)} = ${money(it.qty * it.unitPrice)}`
  );
  const total = opts.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  const text = [
    `🛍️ *NUEVO PEDIDO · RKeens*`,
    `Código: *${opts.code}*`,
    `Origen: ${opts.origin}`,
    ``,
    `👤 *Cliente:* ${opts.customer.name}`,
    opts.customer.phone ? `📱 *Teléfono:* ${opts.customer.phone}` : '',
    `🚚 *Entrega:* ${opts.customer.delivery}`,
    ``,
    `━━━━━━━━━━━━━━`,
    `*DETALLE*`,
    ``,
    lines.join('\n\n'),
    ``,
    `━━━━━━━━━━━━━━`,
    `*Total: ${money(total)}*`,
    opts.customer.note ? `\n📝 Nota: ${opts.customer.note}` : '',
  ].filter(Boolean).join('\n');

  return `https://wa.me/${opts.phone}?text=${encodeURIComponent(text)}`;
}
```

**Flujo:** el cliente arma el carrito → `POST /cart/validate` → `POST /orders` (guarda y devuelve código) → se abre `wa.me` con el texto armado.

---

## 6. Decisiones técnicas a conversar con Miguel

- **¿Express separado o solo Next.js?** Express en Render cumple lo pedido, pero agrega un servicio más (y el cold start del plan gratuito). Alternativa más simple para el MVP: usar los *Route Handlers* de Next.js con Supabase y dejar Express para una fase 2. Si el cliente pide "backend propio" como parte del paquete, se queda Express.
- **Validación:** Zod compartido entre front y back (`packages/shared`).
- **Carrito:** Zustand + `localStorage`, el servidor siempre recalcula precios y stock.
- **Seguridad mínima:** `helmet`, `cors` restringido al dominio, `express-rate-limit` en `/orders` y `/cart/validate`, variables de entorno nunca en el repo.
- **Dominio:** `rkeens.pe` o `.com` a nombre del cliente.

---

## 7. Hoja de ruta sugerida

| Fase | Contenido | Tiempo aprox. (2 personas, part-time) |
|------|-----------|---------------------------------------|
| 0 | Repo, Supabase, diseño en Figma de 4 pantallas clave | 3-4 días |
| 1 | Catálogo público + filtros + ficha de producto | 1.5-2 semanas |
| 2 | Carrito + WhatsApp + registro de pedidos | 1 semana |
| 3 | Panel admin (productos, stock, pedidos) | 1.5-2 semanas |
| 4 | Modo mostrador + QR + pulido + despliegue | 1 semana |

Total: entre 5 y 7 semanas para un MVP vendible. **El prototipo para la presentación (fase 0 + una versión navegable de fases 1-2 con datos de ejemplo) se arma en 1.5-2 semanas**, y es lo que se usa para vender.

---

## 8. Cómo venderlo (y cuánto cobrar)

> Los montos son **referenciales en soles** y salen de un criterio de mercado general, no de una cotización oficial. Ajústenlos según su experiencia, tiempo real y lo que cobra la competencia local. Los precios de las plataformas cambian: verifiquen los planes vigentes de Supabase, Render y Vercel antes de cotizar.

### 8.1 El pitch (qué problema resuelves)

Los dueños de galería no compran "una web", compran **menos caos**. Frases que conectan:

- "Hoy mandas fotos por WhatsApp una por una; con esto mandas un link y el cliente arma su pedido completo."
- "El cliente ve qué tallas y colores hay **antes** de preguntarte. Menos '¿tienes en M?'."
- "Te llega el pedido ordenado, con total y código, sin errores de anotación."
- "Sabes qué prenda se pide más y qué talla se te agota."
- "En tu stand, el vendedor muestra el catálogo en una tablet y el cliente escanea el QR para llevarse el link."

### 8.2 Cómo presentarlo

1. **Demo con SU ropa**: carga 8-10 prendas reales con fotos de ellos. Esto vende más que cualquier explicación.
2. Muestra el flujo completo en el celular: filtrar → elegir talla → carrito → WhatsApp con el mensaje armado.
3. Muestra el panel admin: cambiar un precio y ver que se actualiza al instante.
4. Cierra con números simples: "Si esto te trae 5 pedidos extra al mes, se paga solo".

### 8.3 Paquetes sugeridos

| Paquete | Incluye | Pago único (ref.) |
|---------|---------|-------------------|
| **Básico** | Catálogo con filtros, ficha de producto, carrito → WhatsApp, carga inicial de hasta 30 prendas. Sin panel (ustedes actualizan) | S/ 900 – 1,500 |
| **Estándar** ⭐ | Todo lo básico + panel admin (stock, precios, prendas), precio por mayor, registro de pedidos, dominio configurado | S/ 2,200 – 3,800 |
| **Premium** | Todo lo estándar + modo mostrador, QR por prenda, estadísticas, capacitación, diseño de marca más personalizado | S/ 4,000 – 6,500 |

**Mantenimiento mensual (opcional pero recomendado):** S/ 80 – 250 → soporte, cambios menores, respaldos, carga de nuevas colecciones.

### 8.4 Costos operativos del cliente (aprox.)

| Concepto | Costo referencial |
|----------|-------------------|
| Dominio `.com` / `.pe` | S/ 50 – 150 al año |
| Frontend (Vercel) | Gratis para empezar; plan pago si es uso comercial intensivo |
| Backend (Render) | Gratis (con cold start) o ~USD 7/mes para servicio siempre activo |
| Base de datos (Supabase) | Gratis para empezar; ~USD 25/mes si crece |
| **Total mensual realista** | **S/ 0 – 150** al inicio |

**Importante:** abran las cuentas (dominio, Supabase, Vercel, Render) **a nombre del cliente** o transfiérelas al entregar. Evita problemas y da confianza.

### 8.4b Cómo calcular tu precio

```
Horas estimadas × tarifa por hora  +  margen de imprevistos (20%)  +  valor del resultado
```
Ejemplo: 110 horas entre los dos × S/ 20/h = S/ 2,200 + 20% = S/ 2,640. Si el cliente ve que le puede generar ventas, el valor percibido sube; no cobres solo por horas.

### 8.5 Lo que deben dejar por escrito

- Alcance exacto (qué incluye y qué NO: pagos online, app móvil, envíos con courier, etc. = cotización aparte).
- 50% de adelanto, 50% a la entrega.
- Cantidad de rondas de cambios incluidas (ej. 2).
- Quién es dueño del código y de las cuentas.
- Que el cliente es responsable de las fotos y de no usar marcas registradas en el catálogo (punto 11 de la sección 1).

### 8.6 Cómo escalarlo

Este mismo prototipo se **reutiliza** para otros emprendedores de Gamarra (ropa, calzado, accesorios). Si lo dejan parametrizable (catálogos de filtros configurables, tema de colores, número de WhatsApp), cada nuevo cliente es 60-70% menos trabajo. Ahí está el negocio real: pasar de "proyecto" a "producto con suscripción mensual".

---

## 9. Próximos pasos inmediatos

1. Crear el repo `PrototipShop` y subir esta carpeta `docs/` y `supabase/`.
2. Crear el proyecto en Supabase y correr `schema.sql`.
3. Armar 4 pantallas en Figma: Home, Catálogo con filtros, Ficha de producto, Carrito.
4. Levantar el esqueleto de `apps/web` y `apps/api`.
5. Cargar 8-10 prendas reales de RKeens para la demo.
