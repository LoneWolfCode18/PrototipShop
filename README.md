# PrototipShop · RKeens

Catálogo y mostrador digital para la marca de ropa RKeens (Gamarra). Sin pagos en línea:
el carrito arma un pedido ordenado y lo envía por **WhatsApp**.

**Stack:** Next.js + Tailwind (web) · Node + Express (API) · PostgreSQL en Supabase.

## Estructura

```
PrototipShop/
├── apps/
│   ├── api/        # Express + supabase-js (se despliega en Render)
│   └── web/        # Next.js App Router + Tailwind (se despliega en Vercel)
├── supabase/       # SQL y migraciones
└── docs/           # Arquitectura y propuesta comercial
```

Más detalle de endpoints, base de datos y hoja de ruta en `docs/ARQUITECTURA.md`.

## Puesta en marcha

Requisitos: Node 20 o superior y Git.

```bash
# 1. Instalar dependencias (desde la raíz)
npm install

# 2. Variables de entorno
cp apps/api/.env.example apps/api/.env      # completar URL y service_role de Supabase
cp apps/web/.env.example apps/web/.env.local

# 3. Levantar (dos terminales)
npm run dev:api     # http://localhost:4000/api/v1/health
npm run dev:web     # http://localhost:3000
```

La base de datos se crea antes, ejecutando `supabase/migrations/001_init.sql` en Supabase.

## Estado actual

| Parte | Estado |
|-------|--------|
| `GET /health`, `/settings`, `/filters` | Hecho |
| `GET /products` (filtros, orden, paginación), `/products/featured`, `/products/:slug` | Hecho |
| Admin: ajustar stock, cambiar estado de pedido (descuenta stock al confirmar) | Hecho |
| `POST /cart/validate` y `POST /orders` | Pendiente (devuelven 501) |
| Admin: CRUD de productos, variantes, imágenes, precio por mayor | Pendiente |
| Web: home con destacados, estado del carrito (Zustand), generador del link de WhatsApp | Base lista |
| Web: catálogo con filtros, ficha de producto, carrito, panel admin, modo mostrador | Pendiente |

## Trabajo en equipo (Git)

- `main` está protegida: no se sube directo.
- Una rama por tarea: `feature/catalogo-filtros`, `fix/stock-negativo`, etc.
- Commits cortos con prefijo: `feat:`, `fix:`, `docs:`, `chore:`.
- Pull Request revisado por la otra persona antes de unir a `main`.
- **Nunca** subir `.env` ni la `service_role`. Las claves se comparten por un canal privado.

Reparto sugerido: una persona en `supabase/` + `apps/api`, la otra en `apps/web`.

## Despliegue

- **API en Render:** Root Directory `apps/api`, Build `npm install && npm run build`,
  Start `npm start`. Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN`.
- **Web en Vercel:** Root Directory `apps/web`. Variable: `NEXT_PUBLIC_API_URL` con la URL de Render + `/api/v1`.
