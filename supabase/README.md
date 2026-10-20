# Base de datos (Supabase)

- `migrations/001_init.sql`: esquema completo (tablas, seguridad, funciones de stock, bucket de fotos).
  Se ejecuta **una sola vez** en Supabase > SQL Editor.
- Cada cambio nuevo a la base de datos se guarda como un archivo numerado
  (`002_...sql`, `003_...sql`) y se avisa al otro antes de ejecutarlo, para que los dos
  trabajen sobre la misma estructura.

## Crear el primer admin

1. Supabase > Authentication > Users > Add user (correo + clave).
2. Copia su UUID y ejecuta:

```sql
insert into profiles (id, full_name, role) values ('<UUID>', 'Tu nombre', 'admin');
```
