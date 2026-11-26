-- =====================================================================
-- PrototipShop  -  005_tienda_publica.sql
-- Extiende store_settings con contenido editorial para la tienda pública.
-- Idempotente: usa "add column if not exists" en cada línea.
-- Ejecutar DESPUÉS de 004_marca.sql.
-- =====================================================================

-- 1) Nuevas columnas en store_settings
alter table store_settings
  -- Texto libre de "Quiénes somos" (soporta saltos de línea)
  add column if not exists about_text        text,

  -- Hero: imagen opcional a la derecha del título
  add column if not exists hero_image_url    text,

  -- Hero: subtítulo independiente de welcome_message
  -- (si está vacío/null se usa welcome_message como fallback)
  add column if not exists hero_subtitle     text,

  -- Catálogo: subtítulo que reemplaza el texto fijo
  add column if not exists catalog_subtitle  text,

  -- Redes sociales (todas opcionales)
  add column if not exists instagram_url     text,
  add column if not exists facebook_url      text,
  add column if not exists tiktok_url        text;

-- 2) RLS
--    La política "lectura publica settings" (001_init.sql) ya aplica
--    un "for select using (true)" sobre toda la tabla, así que las
--    columnas nuevas son automáticamente legibles con la clave publishable.
--
--    store_settings solo contiene configuración de presentación y contacto
--    público (nombre, teléfono, dirección, logo, redes).  No hay campos
--    sensibles: whatsapp_number es el número público que ya aparece en
--    los mensajes, y no hay contraseñas, tokens ni datos de clientes.
--    No se necesitan políticas adicionales ni enmascaramiento de columnas.
