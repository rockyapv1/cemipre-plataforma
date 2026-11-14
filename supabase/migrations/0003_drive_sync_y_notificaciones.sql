-- DRV-03 (Agustín) · aplicar DESPUÉS de schema.sql y 0002_auth_y_rls.sql.
-- Contrato mínimo esperado de 0002: public.personas(id), public.bitacoras
-- (id, persona_id, titulo, url_docs). Requiere que el equipo confirme sus tipos.
-- Esta migración NO permite lectura directa desde el navegador. Solo la Edge Function
-- con SERVICE_ROLE_KEY puede acceder a tablas de control (nunca al frontend).

begin;

alter table public.personas
  add column if not exists drive_folder_id text;
create unique index if not exists personas_drive_folder_id_uidx
  on public.personas (drive_folder_id) where drive_folder_id is not null;

alter table public.bitacoras
  add column if not exists google_doc_id text,
  add column if not exists drive_folder_id text,
  add column if not exists drive_doc_name text,
  add column if not exists drive_modified_time timestamptz,
  add column if not exists drive_last_seen_at timestamptz,
  add column if not exists drive_sync_status text not null default 'pendiente';

create unique index if not exists bitacoras_google_doc_id_uidx
  on public.bitacoras (google_doc_id) where google_doc_id is not null;
create index if not exists bitacoras_persona_drive_idx
  on public.bitacoras (persona_id, drive_folder_id);

-- Una fila por carpeta raíz configurada. page_token reservado para el módulo
-- de notificaciones de Matías; DRV-03 no modifica este token.
create table if not exists public.drive_sync_state (
  root_folder_id text primary key,
  estado text not null default 'nunca' check (estado in ('nunca','ejecutando','completada','parcial','error')),
  run_id uuid,
  inicio_at timestamptz,
  termino_at timestamptz,
  ultimo_exito_at timestamptz,
  ultimo_error text,
  resultado jsonb not null default '{}'::jsonb,
  page_token text,
  actualizado_at timestamptz not null default now()
);

-- Estructura mínima para uso posterior de Matías; no se envían correos desde DRV-03.
create table if not exists public.notificaciones_enviadas (
  id bigint generated always as identity primary key,
  google_doc_id text not null,
  dedup_key text not null unique,
  destinatario text not null,
  estado text not null default 'pendiente',
  enviado_at timestamptz,
  creado_at timestamptz not null default now()
);

-- Denegación por defecto. Los trabajadores acceden a ESTADO vía Edge Function
-- autenticada; nunca a estas tablas directamente. service_role omite RLS.
alter table public.drive_sync_state enable row level security;
alter table public.notificaciones_enviadas enable row level security;
revoke all on table public.drive_sync_state from anon, authenticated;
revoke all on table public.notificaciones_enviadas from anon, authenticated;

-- Bloqueo atómico para impedir sincronizaciones simultáneas.
-- Si un proceso desaparece, el bloqueo expira después de 20 minutos.
create or replace function public.iniciar_sync_drive(p_root_folder_id text, p_run_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare inicio_permitido boolean := false;
begin
  insert into public.drive_sync_state (root_folder_id) values (p_root_folder_id)
  on conflict (root_folder_id) do nothing;

  update public.drive_sync_state
     set estado = 'ejecutando', run_id = p_run_id,
         inicio_at = now(), termino_at = null, ultimo_error = null,
         actualizado_at = now()
   where root_folder_id = p_root_folder_id
     and (estado <> 'ejecutando' or inicio_at < now() - interval '20 minutes')
  returning true into inicio_permitido;

  return coalesce(inicio_permitido, false);
end;
$$;

create or replace function public.terminar_sync_drive(
  p_root_folder_id text, p_run_id uuid, p_estado text,
  p_resultado jsonb, p_error text default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_estado not in ('completada','parcial','error') then
    raise exception 'Estado inválido';
  end if;

  update public.drive_sync_state
     set estado = p_estado, termino_at = now(), actualizado_at = now(),
         ultimo_error = left(p_error, 300), resultado = coalesce(p_resultado,'{}'::jsonb),
         ultimo_exito_at = case when p_estado = 'completada' then now() else ultimo_exito_at end
   where root_folder_id = p_root_folder_id and run_id = p_run_id;
end;
$$;

revoke all on function public.iniciar_sync_drive(text, uuid) from public, anon, authenticated;
revoke all on function public.terminar_sync_drive(text, uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.iniciar_sync_drive(text, uuid) to service_role;
grant execute on function public.terminar_sync_drive(text, uuid, text, jsonb, text) to service_role;

commit;
