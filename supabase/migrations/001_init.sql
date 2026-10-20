-- =====================================================================
-- PrototipShop / RKeens  -  Esquema PostgreSQL para Supabase
-- Ejecutar en: Supabase > SQL Editor
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type gender_t        as enum ('dama', 'caballero', 'unisex');
create type order_status_t  as enum ('enviado_whatsapp', 'confirmado', 'pagado', 'entregado', 'cancelado');
create type order_origin_t  as enum ('online', 'tienda');
create type stock_move_t    as enum ('ingreso', 'venta', 'ajuste', 'devolucion');

-- ---------- CATALOGOS (tablas de apoyo para filtros) ----------
create table categories (           -- tipo de prenda: Polo, Polera, Conjunto...
  id          smallserial primary key,
  name        text not null unique,
  slug        text not null unique,
  sort_order  smallint not null default 0,
  is_active   boolean not null default true
);

create table fits (                 -- corte: Clasico, Oversize, Boxy Fit
  id          smallserial primary key,
  name        text not null unique,
  slug        text not null unique
);

create table materials (            -- Algodon gamuzado, Pima, Fleece...
  id          smallserial primary key,
  name        text not null unique,
  slug        text not null unique
);

create table colors (
  id          smallserial primary key,
  name        text not null unique,
  hex         char(7) not null check (hex ~ '^#[0-9A-Fa-f]{6}$')
);

create table sizes (
  id          smallserial primary key,
  label       text not null unique,      -- S, M, L, XL, XXL
  sort_order  smallint not null default 0
);

-- ---------- PRODUCTOS ----------
create table products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  gender        gender_t not null,
  category_id   smallint not null references categories(id),
  fit_id        smallint references fits(id),         -- null si no aplica (poleras, conjuntos)
  material_id   smallint references materials(id),
  print_name    text,                                  -- estampado / diseno
  has_embroidery boolean not null default false,       -- bordado
  has_collar_placket boolean not null default false,   -- tapetera en el cuello
  base_price    numeric(10,2) not null check (base_price >= 0),   -- precio por unidad (S/)
  sale_price    numeric(10,2) check (sale_price >= 0),            -- oferta opcional
  tags          text[] not null default '{}',
  is_featured   boolean not null default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_products_gender   on products(gender)      where is_active;
create index idx_products_category on products(category_id) where is_active;
create index idx_products_fit      on products(fit_id)      where is_active;
create index idx_products_material on products(material_id) where is_active;
create index idx_products_search   on products using gin (to_tsvector('spanish', name || ' ' || coalesce(description,'')));

-- Variantes: combinacion talla + color con su propio stock
create table product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  size_id     smallint not null references sizes(id),
  color_id    smallint not null references colors(id),
  sku         text not null unique,
  stock       integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 3,
  price_override numeric(10,2),                        -- si una variante cuesta distinto
  is_active   boolean not null default true,
  unique (product_id, size_id, color_id)
);
create index idx_variants_product on product_variants(product_id);

create table product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  color_id    smallint references colors(id),          -- foto asociada a un color (opcional)
  url         text not null,                           -- Supabase Storage
  alt         text,
  sort_order  smallint not null default 0
);
create index idx_images_product on product_images(product_id);

-- Precio por mayor (muy comun en Gamarra): a partir de X unidades cuesta Y
create table price_tiers (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  min_qty     integer not null check (min_qty > 1),
  unit_price  numeric(10,2) not null check (unit_price >= 0),
  unique (product_id, min_qty)
);

-- ---------- PEDIDOS (registro de lo que sale por WhatsApp) ----------
create table orders (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,                 -- ej: RK-20261020-0042 (se muestra en el mensaje)
  origin         order_origin_t not null default 'online',
  status         order_status_t not null default 'enviado_whatsapp',
  customer_name  text,
  customer_phone text,
  customer_note  text,
  delivery_type  text check (delivery_type in ('recojo_galeria','envio')),
  subtotal       numeric(10,2) not null default 0,
  total          numeric(10,2) not null default 0,
  whatsapp_text  text,                                 -- mensaje exacto que se envio
  created_at     timestamptz not null default now()
);

create table order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  variant_id    uuid references product_variants(id) on delete set null,
  product_name  text not null,                         -- snapshot por si luego cambia el producto
  size_label    text not null,
  color_name    text not null,
  quantity      integer not null check (quantity > 0),
  unit_price    numeric(10,2) not null,
  line_total    numeric(10,2) not null
);
create index idx_order_items_order on order_items(order_id);

-- Historial de stock (auditoria: quien movio que y cuando)
create table stock_movements (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references product_variants(id) on delete cascade,
  type        stock_move_t not null,
  quantity    integer not null,                        -- positivo o negativo
  reason      text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- ---------- CONFIGURACION DE TIENDA ----------
create table store_settings (
  id                 smallint primary key default 1 check (id = 1),   -- una sola fila
  store_name         text not null default 'RKeens',
  whatsapp_number    text not null,                    -- formato 519XXXXXXXX (sin +)
  gallery_address    text,                             -- Galeria / stand / piso
  opening_hours      text,
  currency           text not null default 'PEN',
  welcome_message    text
);

-- ---------- TRIGGER updated_at ----------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

create trigger trg_products_updated before update on products
for each row execute function set_updated_at();

-- ---------- VISTA PUBLICA: producto con stock total ----------
create or replace view v_products_public as
select p.*,
       coalesce(sum(v.stock) filter (where v.is_active), 0) as total_stock,
       coalesce(p.sale_price, p.base_price)                  as final_price
from products p
left join product_variants v on v.product_id = p.id
where p.is_active
group by p.id;

-- ---------- SEGURIDAD (Row Level Security) ----------
-- Idea: el catalogo es de lectura publica. Escritura solo para admins autenticados
-- (el backend Express usa la service_role key, que ignora RLS, y valida el JWT del admin).
alter table categories       enable row level security;
alter table fits             enable row level security;
alter table materials        enable row level security;
alter table colors           enable row level security;
alter table sizes            enable row level security;
alter table products         enable row level security;
alter table product_variants enable row level security;
alter table product_images   enable row level security;
alter table price_tiers      enable row level security;
alter table orders           enable row level security;
alter table order_items      enable row level security;
alter table stock_movements  enable row level security;
alter table store_settings   enable row level security;

create policy "lectura publica categories" on categories for select using (true);
create policy "lectura publica fits"       on fits       for select using (true);
create policy "lectura publica materials"  on materials  for select using (true);
create policy "lectura publica colors"     on colors     for select using (true);
create policy "lectura publica sizes"      on sizes      for select using (true);
create policy "lectura publica products"   on products   for select using (is_active);
create policy "lectura publica variants"   on product_variants for select using (is_active);
create policy "lectura publica images"     on product_images   for select using (true);
create policy "lectura publica tiers"      on price_tiers      for select using (true);
create policy "lectura publica settings"   on store_settings   for select using (true);
-- orders, order_items y stock_movements: sin politica publica => solo accesibles via backend (service_role).

-- ---------- DATOS SEMILLA (para la demo) ----------
insert into categories (name, slug, sort_order) values
  ('Polos', 'polos', 1),
  ('Poleras', 'poleras', 2),
  ('Conjuntos', 'conjuntos', 3),
  ('Casacas', 'casacas', 4);

insert into fits (name, slug) values
  ('Clasico', 'clasico'),
  ('Oversize', 'oversize'),
  ('Boxy Fit', 'boxy-fit');

insert into materials (name, slug) values
  ('Algodon gamuzado', 'algodon-gamuzado'),
  ('Algodon Pima', 'algodon-pima'),
  ('Fleece tech', 'fleece-tech'),
  ('Algodon frisa', 'algodon-frisa');

insert into sizes (label, sort_order) values
  ('S',1), ('M',2), ('L',3), ('XL',4), ('XXL',5);

insert into colors (name, hex) values
  ('Negro', '#111111'), ('Blanco', '#FFFFFF'), ('Gris', '#8A8D91'),
  ('Beige', '#D9C7A3'), ('Azul marino', '#1B2A49'), ('Rosa palo', '#E8B4BC');

insert into store_settings (whatsapp_number, gallery_address, opening_hours)
values ('51900000000', 'Galeria ___, stand ___, Gamarra', 'Lun-Sab 9:00 - 19:00');


-- =====================================================================
-- PrototipShop / RKeens  -  002_extras.sql
-- Ejecutar DESPUES de schema.sql, en Supabase > SQL Editor
-- Agrega: roles de admin, politicas de escritura, bucket de imagenes,
--         codigo de pedido, funciones atomicas de stock y vistas utiles.
-- =====================================================================

-- ---------- 1) PERFILES Y ROLES (ligados a Supabase Auth) ----------
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null default 'vendedor' check (role in ('admin', 'vendedor')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "ver mi perfil" on profiles for select using (id = auth.uid());

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- ---------- 2) POLITICAS DE ESCRITURA PARA ADMIN ----------
-- (El backend Express usa service_role y las ignora; sirven si algun dia el
--  panel admin consulta Supabase directo con el JWT del usuario.)
create policy "admin gestiona categories"  on categories       for all using (is_admin()) with check (is_admin());
create policy "admin gestiona fits"        on fits             for all using (is_admin()) with check (is_admin());
create policy "admin gestiona materials"   on materials        for all using (is_admin()) with check (is_admin());
create policy "admin gestiona colors"      on colors           for all using (is_admin()) with check (is_admin());
create policy "admin gestiona sizes"       on sizes            for all using (is_admin()) with check (is_admin());
create policy "admin gestiona products"    on products         for all using (is_admin()) with check (is_admin());
create policy "admin gestiona variants"    on product_variants for all using (is_admin()) with check (is_admin());
create policy "admin gestiona images"      on product_images   for all using (is_admin()) with check (is_admin());
create policy "admin gestiona tiers"       on price_tiers      for all using (is_admin()) with check (is_admin());
create policy "admin gestiona orders"      on orders           for all using (is_admin()) with check (is_admin());
create policy "admin gestiona order_items" on order_items      for all using (is_admin()) with check (is_admin());
create policy "admin ve movimientos"       on stock_movements  for select using (is_admin());
create policy "admin gestiona settings"    on store_settings   for all using (is_admin()) with check (is_admin());

-- ---------- 3) VISTA PUBLICA RESPETANDO RLS ----------
alter view v_products_public set (security_invoker = true);

-- ---------- 4) CODIGO DE PEDIDO (RK-YYYYMMDD-0001) ----------
-- Nota: el contador no se reinicia cada dia; para el prototipo basta.
create sequence if not exists order_seq;

create or replace function next_order_code() returns text
language sql as $$
  select 'RK-' || to_char(now() at time zone 'America/Lima', 'YYYYMMDD')
         || '-' || lpad(nextval('order_seq')::text, 4, '0');
$$;

alter table orders alter column code set default next_order_code();

create index if not exists idx_orders_created on orders(created_at desc);
create index if not exists idx_orders_status  on orders(status);
create index if not exists idx_stock_mov_var  on stock_movements(variant_id, created_at desc);

-- ---------- 5) FUNCIONES ATOMICAS DE STOCK ----------
-- Ajusta stock sin permitir negativos y deja registro en stock_movements.
create or replace function adjust_stock(
  p_variant uuid, p_delta integer, p_type stock_move_t, p_reason text, p_user uuid
) returns integer
language plpgsql as $$
declare
  new_stock integer;
begin
  update product_variants
     set stock = stock + p_delta
   where id = p_variant and stock + p_delta >= 0
  returning stock into new_stock;

  if not found then
    raise exception 'Stock insuficiente o variante inexistente';
  end if;

  insert into stock_movements (variant_id, type, quantity, reason, created_by)
  values (p_variant, p_type, p_delta, p_reason, p_user);

  return new_stock;
end;
$$;

-- Confirma un pedido: descuenta stock de todos sus items o no hace nada (transaccion).
create or replace function confirm_order(p_order uuid, p_user uuid) returns void
language plpgsql as $$
declare
  it  record;
  cur order_status_t;
  ocode text;
begin
  select status, code into cur, ocode from orders where id = p_order for update;
  if not found then
    raise exception 'Pedido no existe';
  end if;
  if cur <> 'enviado_whatsapp' then
    raise exception 'El pedido ya fue procesado (estado: %)', cur;
  end if;

  for it in
    select variant_id, quantity from order_items
    where order_id = p_order and variant_id is not null
  loop
    perform adjust_stock(it.variant_id, -it.quantity, 'venta', 'Pedido ' || ocode, p_user);
  end loop;

  update orders set status = 'confirmado' where id = p_order;
end;
$$;

-- Solo el backend (service_role) puede llamar estas funciones.
revoke execute on function adjust_stock(uuid, integer, stock_move_t, text, uuid) from public, anon, authenticated;
revoke execute on function confirm_order(uuid, uuid) from public, anon, authenticated;

-- ---------- 6) VISTA DE STOCK BAJO ----------
create or replace view v_low_stock with (security_invoker = true) as
select v.id as variant_id,
       p.id as product_id,
       p.name as product_name,
       s.label as size,
       c.name as color,
       v.stock,
       v.low_stock_threshold
from product_variants v
join products p on p.id = v.product_id
join sizes s    on s.id = v.size_id
join colors c   on c.id = v.color_id
where v.is_active and p.is_active and v.stock <= v.low_stock_threshold;

-- ---------- 7) STORAGE: BUCKET PUBLICO PARA FOTOS ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Lectura publica: ya la da el bucket publico. Escritura solo admin:
create policy "admin sube imagenes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "admin edita imagenes" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy "admin borra imagenes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ---------- 8) COMO CREAR EL PRIMER ADMIN ----------
-- a) Supabase > Authentication > Users > Add user (correo + clave).
-- b) Copia su UUID y ejecuta:
--    insert into profiles (id, full_name, role) values ('<UUID>', 'Tu nombre', 'admin');
