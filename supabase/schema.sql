-- Esquema inicial CEMIPRE para Supabase (PostgreSQL)
-- Ejecuta este archivo en el SQL Editor de tu proyecto Supabase.

create table if not exists public.personas (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  creado timestamptz not null default now()
);

create unique index if not exists idx_personas_codigo_ci
  on public.personas (lower(codigo));

create table if not exists public.bitacoras (
  id bigint generated always as identity primary key,
  persona_id bigint not null references public.personas(id) on delete cascade,
  titulo text not null,
  -- Enlace al documento colaborativo en Google Docs y su ID para futuras integraciones API.
  url_docs text not null default '',
  google_doc_id text not null default '',
  -- Solo demostración: reemplazar por lectura autorizada desde Google Docs + IA.
  extracto_demo text not null default '',
  actualizada timestamptz not null default now(),
  orden integer not null default 0
);

create index if not exists idx_bitacoras_persona_id
  on public.bitacoras(persona_id);

create index if not exists idx_bitacoras_google_doc_id
  on public.bitacoras(google_doc_id)
  where google_doc_id <> '';

create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  titulo text not null,
  descripcion text not null default '',
  inicio timestamptz not null,
  fin timestamptz not null,
  responsable text not null default 'Equipo CEMIPRE',
  creado timestamptz not null default now(),
  constraint eventos_fin_posterior check (fin > inicio)
);

create table if not exists public.actividad (
  id bigint generated always as identity primary key,
  descripcion text not null,
  persona_id bigint references public.personas(id) on delete set null,
  bitacora_id bigint references public.bitacoras(id) on delete set null,
  fecha timestamptz not null default now()
);

create index if not exists idx_actividad_fecha
  on public.actividad(fecha desc, id desc);

create or replace function public.set_bitacora_actualizada()
returns trigger
language plpgsql
as $$
begin
  new.actualizada = now();
  return new;
end;
$$;

drop trigger if exists trg_bitacoras_actualizada on public.bitacoras;
create trigger trg_bitacoras_actualizada
  before update on public.bitacoras
  for each row
  execute function public.set_bitacora_actualizada();

-- =============================================================================
-- TEMPORAL (SOLO DEMO SIN LOGIN):
-- Permite lectura y escritura con la anon key mientras no exista Supabase Auth.
-- ANTES DE CARGAR DATOS REALES DE CEMIPRE: habilita Auth y reemplaza estas
-- políticas por reglas que exijan auth.role() = 'authenticated' (y roles).
-- =============================================================================
alter table public.personas enable row level security;
alter table public.bitacoras enable row level security;
alter table public.eventos enable row level security;
alter table public.actividad enable row level security;

drop policy if exists "demo_personas_all" on public.personas;
create policy "demo_personas_all" on public.personas
  for all using (true) with check (true);

drop policy if exists "demo_bitacoras_all" on public.bitacoras;
create policy "demo_bitacoras_all" on public.bitacoras
  for all using (true) with check (true);

drop policy if exists "demo_eventos_all" on public.eventos;
create policy "demo_eventos_all" on public.eventos
  for all using (true) with check (true);

drop policy if exists "demo_actividad_all" on public.actividad;
create policy "demo_actividad_all" on public.actividad
  for all using (true) with check (true);
