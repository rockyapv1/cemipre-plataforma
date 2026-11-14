-- Datos ficticios de ejemplo para probar CEMIPRE en Supabase (idempotente).
-- No usar datos personales reales.

insert into public.personas (codigo, nombre)
values
  ('USR-001', 'Usuario 001'),
  ('USR-002', 'Usuario 002'),
  ('USR-003', 'Usuario 003')
on conflict (codigo) do nothing;

insert into public.bitacoras (persona_id, titulo, orden, extracto_demo)
select p.id, v.titulo, v.orden, v.extracto_demo
from public.personas p
cross join (
  values
    (0, 'Seguimiento general', 'Registro ficticio: actividades de acompañamiento realizadas y próximas acciones.'),
    (1, 'Orientación', 'Registro ficticio: se coordinó una sesión informativa y se entregó material de apoyo.'),
    (2, 'Actividades', 'Registro ficticio: participación en talleres y actividades comunitarias.'),
    (3, 'Evaluación', 'Registro ficticio: revisión de objetivos del período.'),
    (4, 'Coordinación', 'Registro ficticio: contacto con el equipo para definir tareas.'),
    (5, 'Apoyos', 'Registro ficticio: identificación de apoyos y recursos disponibles.'),
    (6, 'Observaciones', 'Registro ficticio: notas generales pendientes de validación por el equipo.')
) as v(orden, titulo, extracto_demo)
where p.codigo in ('USR-001', 'USR-002', 'USR-003')
  and not exists (
    select 1
    from public.bitacoras b
    where b.persona_id = p.id
      and b.titulo = v.titulo
  );

insert into public.eventos (titulo, descripcion, inicio, fin, responsable)
select
  'Reunión de coordinación (demo)',
  'Evento ficticio de demostración.',
  date_trunc('day', now() + interval '2 days') + interval '10 hours',
  date_trunc('day', now() + interval '2 days') + interval '11 hours',
  'Equipo CEMIPRE'
where not exists (select 1 from public.eventos);
