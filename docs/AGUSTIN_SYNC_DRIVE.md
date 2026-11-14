# DRV-03 · Agustín · Sincronización Google Drive → Supabase

## Qué se implementó

- `supabase/migrations/0003_drive_sync_y_notificaciones.sql`: campos para vincular carpetas y Docs; tablas de control; funciones SQL de bloqueo para sincronización; habilita RLS sin conceder acceso directo al navegador.
- `supabase/functions/sync-drive/index.ts`: Edge Function con **GET** (estado y carpetas vinculadas) y **POST** (sincronizar), ambas protegidas por sesión y rol.
- `supabase/functions/sync-drive/google-drive.ts`: adaptador temporal, solo lectura, Google Drive REST, Service Account con JWT RS256. Mauricio puede reemplazarlo por `supabase/functions/_shared/google.ts` sin cambiar el resto del módulo.
- `supabase/functions/sync-drive/drive-plan.mjs`: funciones puras de selección, conciliación y comparación de Docs; pruebas con datos inventados.
- `frontend/src/components/CarpetasDriveView.jsx`: interfaz accesible con botón Sincronizar, último estado y lista de personas/bitácoras vinculadas.
- `frontend/src/drive-supabase.js`: cliente público de Supabase (no contiene secretos).
- Ajustes de `App.jsx`, `styles.css` y `package.json`: integra pestaña **Carpetas Drive** en el frontend existente.

**Alcance limitado:** se sincronizan metadatos, vínculos y estados. **NO** se lee el contenido del documento, no se envían emails, no se generan resúmenes y no se borran bitácoras. Un 403/404 de Google **no** se interpreta como eliminación irreversible.

## Estado y dependencias

El repositorio de GitHub revisado aún usa **Django + SQLite** y NO contiene `supabase/schema.sql` ni `0002_auth_y_rls.sql`. Esta entrega está preparada para el plan **React + Supabase** del PDF, pero **no puede conectarse a datos reales** hasta que Tomás y Jhoel publiquen las bases necesarias. La vista se muestra desactivada cuando faltan variables o sesión.

**Confirmar con Jhoel y Tomás el siguiente contrato (nombres y tipos) ANTES de aplicar `0003`:**

```sql
-- Referencia ilustrativa, no ejecutar como parte de este módulo:
public.personas(id, codigo, nombre, drive_folder_id)  -- drive_folder_id se añade en 0003
public.bitacoras(id, persona_id, titulo, url_docs, google_doc_id) -- google_doc_id se añade en 0003
public.perfiles(id uuid references auth.users(id), rol text) -- rol: admin | trabajador | pendiente
```

`personas.id` y `bitacoras.persona_id` deben ser compatibles; la migración respeta los tipos definidos antes. Si cambian nombres, adaptar el SQL y las consultas. Las tablas de notificaciones son un **contrato inicial compartido con Matías**; coordinar los cambios antes de fusionar su rama.

## Cómo probar sin acceder a información real

Desde la raíz del repositorio:

```bash
node --test supabase/functions/sync-drive/drive-plan.test.mjs
```

Las pruebas usan únicamente nombres e IDs ficticios. Comprueban selección de un único Doc, rechazo de URLs falsas, reutilización de fichas existentes, detección de renombres y validación de IDs.

## Instalación cuando esté lista la infraestructura Supabase

1. Crear el proyecto Supabase del equipo y ejecutar su `schema.sql` y **después** `0002_auth_y_rls.sql`. El campo `public.perfiles.id` debe identificar al usuario de Supabase Auth y `rol` debe ser `admin`, `trabajador` o `pendiente`.
2. Aplicar **una sola vez** `0003_drive_sync_y_notificaciones.sql` con la CLI de Supabase o el SQL Editor autorizado. No ejecutar antes de confirmar el contrato de tablas.
3. Configurar Google Cloud: habilitar **Google Drive API**, crear Service Account y dar acceso de **lector** a la carpeta raíz autorizada, con autorización de CEMIPRE. Probar **primero una carpeta ficticia**. Solo se requieren credenciales en el servidor.
4. Configurar secretos para la Edge Function (en Supabase, no Git):

   - `GOOGLE_DRIVE_ROOT_FOLDER_ID`: ID de la carpeta raíz de usuarios, no su URL.
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: correo de la Service Account.
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: llave PEM completa, con saltos de línea. Nunca ponerla en `VITE_...`.
   - `APP_ALLOWED_ORIGINS`: orígenes exactos permitidos, separados por comas, por ejemplo `http://localhost:5173,https://mi-dominio.example`.
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: disponibles como secretos del proyecto en configuraciones compatibles. **Verificar que existan antes de desplegar.**

5. Desplegar `sync-drive` manteniendo `verify_jwt=true` (`supabase/config.toml`). No desactivar esta comprobación.
6. En **frontend**, ejecutar `npm install` después de fusionar `package.json`, copiar `frontend/.env.example` a `frontend/.env.local` y completar **solo** `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores públicos del proyecto.
7. Iniciar sesión con una cuenta aprobada (`rol=admin` o `rol=trabajador`). Las cuentas `pendiente` y los visitantes reciben acceso denegado.
8. Vincular carpetas de usuario a las personas existentes, usando IDs verdaderos aprobados por CEMIPRE. Por ejemplo, de manera conceptual:

   ```sql
   update public.personas
      set drive_folder_id = 'ID_DE_CARPETA_USUARIO'
    where codigo = 'CODIGO_DE_PRUEBA';
   ```

   **No** vincular por coincidencia aproximada de nombres: la identidad debe confirmarse manualmente. Los trabajadores solo ven carpetas ya vinculadas; las otras se contabilizan como pendientes.
9. Pulsar **Sincronizar ahora**, después **Actualizar estado**. Verificar que una segunda sincronización no cree bitácoras duplicadas.

## Cómo funciona

```text
Carpeta raíz CEMIPRE (Service Account con acceso de lectura)
  └─ Carpeta persona (ID == personas.drive_folder_id)
     └─ Carpeta bitácora
        └─ Google Doc (único)
             ├─ si existe por google_doc_id o URL antigua → UPDATE
             └─ si no existe → INSERT
```

La función pagina las consultas de Google Drive y Supabase; no confía en índices de carpetas. Si una carpeta contiene dos Docs, la función no elige arbitrariamente. Si una carpeta pierde acceso, no se infiere que fue eliminada. Los documentos no localizados se marcan `no_disponible`/`sin_permiso` **sin borrarlos**.

## Responsabilidades compartidas

- **Mauricio:** consolidar el cliente Google en `_shared/google.ts`; debe preservar firmas equivalentes a `listChildren(folderId)` y `getFile(fileId)`, además de proveer credenciales seguras.
- **Jhoel:** confirmar `perfiles(id,rol)` y habilitar reglas RLS en `personas`/`bitacoras`. Nuestra Edge Function usa Service Role solo **después** de verificar la sesión y el rol; no exponer nunca Service Role en frontend.
- **Tomás:** configurar URL y claves públicas del frontend, secretos de servidor, CI y despliegue. Configurar dominios en `APP_ALLOWED_ORIGINS`.
- **Matías:** consumir `drive_sync_state.page_token` y ampliar `notificaciones_enviadas` en una migración posterior, sin alterar el flujo de DRV-03 ni sobrescribir `0003`.
- **Jesús Uzcanga:** implementar login con Supabase Auth. Esta vista no implementa login propio ni sustituye su módulo.

## Casos de aceptación manual

- [ ] La carpeta ficticia `Usuario A/Bitácora 1/Documento 1` crea una sola bitácora.
- [ ] Una segunda sincronización no duplica registros.
- [ ] Renombrar la carpeta de bitácora actualiza el título de su ficha existente.
- [ ] Una carpeta con dos Google Docs genera advertencia, sin elegir uno al azar.
- [ ] Una carpeta de usuario sin `drive_folder_id` vinculado se contabiliza sin crear una identidad nueva.
- [ ] Un permiso faltante genera aviso y nunca borra datos locales.
- [ ] Un usuario no autenticado o con `rol=pendiente` no puede ejecutar GET ni POST.
- [ ] Dos ejecuciones simultáneas no corren en paralelo (`409` para la segunda).
- [ ] No aparecen claves privadas ni contenido de Docs en respuestas, logs o Git.

## Despliegue y límites

El módulo no ha podido validarse aquí contra Google Cloud/Supabase reales por ausencia de credenciales y base final. Requiere pruebas integradas con servicios autorizados antes de producción. El tiempo de una Edge Function puede ser insuficiente para Drives grandes; de ser así, añadir una sincronización incremental o trabajo por lotes (no hay queue incluida). El módulo no detecta por sí solo cambios de texto dentro de Docs: eso corresponde al trabajo de Matías.
