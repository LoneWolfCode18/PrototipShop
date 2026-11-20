-- =====================================================================
-- PrototipShop  -  004_marca.sql
-- Extiende store_settings con los campos necesarios para que la marca
-- sea 100% configurable (nombre, logo, color, moneda, teléfono, etc.)
-- Ejecutar DESPUÉS de 001_init.sql y 003_mostrador.sql.
-- =====================================================================

-- 1) Nuevas columnas en store_settings
alter table store_settings
  add column if not exists logo_url           text,
  add column if not exists primary_color      char(7)  default '#111111'
      check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column if not exists currency_symbol    text     not null default 'S/',
  add column if not exists phone_country_code text     not null default '51',
  add column if not exists location_tag       text;

-- 2) Nada más: las políticas RLS ya cubren store_settings (lectura pública
--    en 001, escritura admin en 001/002).  No se necesita SQL adicional.
