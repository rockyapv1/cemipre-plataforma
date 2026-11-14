# Configuración temporal con Supabase

Esta carpeta prepara la base de datos en Supabase para operar el prototipo del frontend sin depender del servidor Django local.

## Pasos para probarlo

1. Crea un proyecto en [Supabase](https://supabase.com).
2. En **SQL Editor**, ejecuta completo el archivo [`schema.sql`](./schema.sql).
3. En **SQL Editor**, ejecuta [`seed.sql`](./seed.sql) para cargar los 3 usuarios ficticios (`USR-001` a `USR-003`), sus 7 bitácoras y 1 evento de ejemplo.
4. En **Project Settings → API**, copia el **Project URL** y la clave pública **`anon` / `publishable`**.
5. Copia [`frontend/.env.example`](../frontend/.env.example) a `frontend/.env.local` y pega tus credenciales:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-public-key
```

6. Ejecuta el frontend:

```bash
cd frontend
npm install
npm run dev
```

> [!WARNING]
> **Modo temporal sin autenticación:** las políticas RLS incluidas en `schema.sql` permiten leer y escribir con la clave `anon` solo para pruebas con datos ficticios. **Antes de cargar datos reales de CEMIPRE**, activa Supabase Auth y restringe las políticas a usuarios autenticados.
