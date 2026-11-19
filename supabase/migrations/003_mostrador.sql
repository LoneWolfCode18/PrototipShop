-- =====================================================================
-- PrototipShop  -  003_mostrador.sql
-- Agrega las columnas de mostrador a products y una vista pública
-- dedicada para la pantalla de tablet /mostrador.
-- Ejecutar DESPUÉS de 001_init.sql y 002 (si existe).
-- =====================================================================

-- 1) Nuevas columnas en products
--    show_in_counter      → interruptor "Mostrar en mostrador"
--    counter_order        → orden manual dentro del mostrador (menor = primero)
--    is_counter_featured  → destacado en la pantalla de mostrador
alter table products
  add column if not exists show_in_counter      boolean     not null default true,
  add column if not exists counter_order        integer     not null default 0,
  add column if not exists is_counter_featured  boolean     not null default false;

-- Índice para ordenar eficientemente la pantalla del mostrador
create index if not exists idx_products_counter
  on products(counter_order, name)
  where is_active and show_in_counter;

-- 2) Vista pública del mostrador
--    Solo prendas activas con show_in_counter = true.
--    Incluye stock total activo, precio final y primera imagen.
create or replace view v_mostrador with (security_invoker = true) as
select
  p.id,
  p.name,
  p.slug,
  p.description,
  p.gender,
  p.base_price,
  p.sale_price,
  coalesce(p.sale_price, p.base_price)                      as final_price,
  p.is_featured,
  p.is_counter_featured,
  p.counter_order,
  coalesce(sum(v.stock) filter (where v.is_active), 0)      as total_stock,
  c.name                                                     as category_name,
  c.slug                                                     as category_slug,
  -- Primera imagen (sort_order más bajo)
  (
    select img.url
    from product_images img
    where img.product_id = p.id
    order by img.sort_order
    limit 1
  )                                                          as cover_url
from products p
left join categories c         on c.id = p.category_id
left join product_variants v   on v.product_id = p.id
where p.is_active
  and p.show_in_counter
group by p.id, c.name, c.slug
order by p.counter_order, p.name;

-- Política de lectura pública para la vista
-- (la vista ya tiene security_invoker; la política sobre products "lectura publica products"
--  del 001 cubre los SELECT directos. Nada adicional necesario en RLS para la vista.)

-- 3) Política RLS: admins pueden actualizar las columnas nuevas
--    La política "admin gestiona products" del 001/002 ya cubre FOR ALL,
--    así que no se necesita política nueva. Solo documentamos la intención.
-- (sin acción adicional)
