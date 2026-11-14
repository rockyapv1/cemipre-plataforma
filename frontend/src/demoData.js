/**
 * Datos ficticios de demostración para previsualizar el frontend cuando Supabase
 * aún no está configurado en frontend/.env.local. Nunca usar información real.
 */

export const TEAM_MEMBERS = [
  { id: 'camila', name: 'Camila Torres', initials: 'CT', role: 'Psicóloga' },
  { id: 'daniel', name: 'Daniel Rojas', initials: 'DR', role: 'Terapeuta ocupacional' },
  { id: 'valentina', name: 'Valentina Soto', initials: 'VS', role: 'Trabajadora social' },
  { id: 'francisca', name: 'Francisca Muñoz', initials: 'FM', role: 'Coordinadora' },
];

const DEFAULT_AREAS = [
  { titulo: 'Seguimiento individual', area: 'Psicología', author: 'Camila' },
  { titulo: 'Autonomía y vida diaria', area: 'Terapia ocupacional', author: 'Daniel' },
  { titulo: 'Vínculo familiar', area: 'Trabajo social', author: 'Valentina' },
  { titulo: 'Participación en talleres', area: 'Talleres', author: 'Francisca' },
  { titulo: 'Plan de acompañamiento', area: 'Coordinación', author: 'Camila' },
  { titulo: 'Entrevistas y acuerdos', area: 'Entrevistas', author: 'Valentina' },
  { titulo: 'Apoyos y recursos', area: 'Acuerdos', author: 'Daniel' },
];

export const AVATAR_COLORS = ['peach', 'sage', 'lavender', 'blue'];

const DEMO_PEOPLE_SEED = [
  { id: 1, codigo: 'USR-001', nombre: 'Elena Martínez', program: 'Rehabilitación integral', color: 'peach', joined: 'Marzo 2026' },
  { id: 2, codigo: 'USR-002', nombre: 'Tomás González', program: 'Autonomía e inclusión', color: 'sage', joined: 'Abril 2026' },
  { id: 3, codigo: 'USR-003', nombre: 'Sofía Riquelme', program: 'Programa de acompañamiento', color: 'lavender', joined: 'Abril 2026' },
  { id: 4, codigo: 'USR-004', nombre: 'Mateo Herrera', program: 'Rehabilitación integral', color: 'blue', joined: 'Mayo 2026' },
  { id: 5, codigo: 'USR-005', nombre: 'Isabel Fuentes', program: 'Autonomía e inclusión', color: 'sage', joined: 'Mayo 2026' },
  { id: 6, codigo: 'USR-006', nombre: 'Benjamín Castro', program: 'Programa de acompañamiento', color: 'peach', joined: 'Junio 2026' },
  { id: 7, codigo: 'USR-007', nombre: 'Lucía Morales', program: 'Rehabilitación integral', color: 'blue', joined: 'Julio 2026' },
  { id: 8, codigo: 'USR-008', nombre: 'Vicente Pérez', program: 'Autonomía e inclusión', color: 'sage', joined: 'Agosto 2026' },
];

export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'US';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function buildDemoState() {
  const now = new Date();
  const isoDaysAgo = (days, hour = 10) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, 15, 0, 0);
    return d.toISOString();
  };
  const isoDaysAhead = (days, hour = 9, minutes = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minutes, 0, 0);
    return d.toISOString();
  };

  let logId = 1;
  const logs = [];
  DEMO_PEOPLE_SEED.forEach((person, pIdx) => {
    DEFAULT_AREAS.forEach((tmpl, aIdx) => {
      const id = logId++;
      const hasDemoUrl = aIdx < 3;
      logs.push({
        id,
        persona_id: person.id,
        persona_nombre: person.nombre,
        persona_codigo: person.codigo,
        titulo: tmpl.titulo,
        area: tmpl.area,
        author: tmpl.author,
        url_docs: hasDemoUrl ? `https://docs.google.com/document/d/demo-${person.id}-${aIdx + 1}/edit` : '',
        actualizada: isoDaysAgo((pIdx + aIdx) % 9, 10 + (aIdx % 6)),
        favorite: id <= 3,
        extracto_demo: `Registro ficticio de ${tmpl.titulo.toLowerCase()} para ${person.nombre}: avances positivos en la participación reciente y coordinación del equipo.`,
        contenido: `Bitácora de demostración (${tmpl.area}) — ${person.nombre}\n\n• Sesión reciente con foco en objetivos del período.\n• Se acuerda dar seguimiento con el equipo interdisciplinario y revisar avances en la próxima reunión.\n\nNota: En producción este contenido se abrirá y editará directamente en Google Docs.`,
        history: [
          { id: `${id}-h1`, author: `${tmpl.author} (${TEAM_MEMBERS.find((m) => m.name.startsWith(tmpl.author))?.role || 'Equipo'})`, date: isoDaysAgo((pIdx + aIdx) % 9, 10), note: 'Actualización de seguimiento (demo)' },
          { id: `${id}-h2`, author: 'Camila Torres', date: isoDaysAgo(14 + aIdx, 16), note: 'Creación de ficha inicial' },
        ],
        comments: aIdx === 0 ? [
          { id: `${id}-c1`, author: 'Daniel Rojas', date: isoDaysAgo(1, 15), text: 'Coordinemos la próxima sesión conjunta esta semana.' },
        ] : [],
      });
    });
  });

  const people = DEMO_PEOPLE_SEED.map((p) => ({
    ...p,
    total_bitacoras: 7,
  }));

  const events = [
    {
      id: 1,
      titulo: 'Reunión de equipo',
      descripcion: 'Sala de reuniones · Revisión semanal de bitácoras',
      inicio: isoDaysAhead(1, 9, 0),
      fin: isoDaysAhead(1, 10, 0),
      responsable: 'Camila Torres',
      tipo: 'Reunión',
    },
    {
      id: 2,
      titulo: 'Sesión de seguimiento',
      descripcion: 'Elena Martínez · Psicología',
      inicio: isoDaysAhead(2, 11, 0),
      fin: isoDaysAhead(2, 12, 0),
      responsable: 'Camila Torres',
      tipo: 'Sesión',
    },
    {
      id: 3,
      titulo: 'Taller de autonomía',
      descripcion: 'Grupo de orientación y movilidad',
      inicio: isoDaysAhead(3, 15, 30),
      fin: isoDaysAhead(3, 17, 0),
      responsable: 'Daniel Rojas',
      tipo: 'Taller',
    },
    {
      id: 4,
      titulo: 'Evaluación trimestral',
      descripcion: 'Tomás González · Equipo interdisciplinario',
      inicio: isoDaysAhead(5, 10, 0),
      fin: isoDaysAhead(5, 11, 30),
      responsable: 'Valentina Soto',
      tipo: 'Evaluación',
    },
  ];

  const activity = [
    { id: 1, descripcion: 'Camila actualizó "Seguimiento individual" de Elena Martínez.', fecha: isoDaysAgo(0, 11) },
    { id: 2, descripcion: 'Daniel agregó un comentario en "Autonomía y vida diaria" (Tomás González).', fecha: isoDaysAgo(0, 9) },
    { id: 3, descripcion: 'Valentina programó el evento "Evaluación trimestral".', fecha: isoDaysAgo(1, 17) },
    { id: 4, descripcion: 'Francisca vinculó Google Docs en "Participación en talleres" (Sofía Riquelme).', fecha: isoDaysAgo(2, 14) },
  ];

  const notices = [
    {
      id: 1,
      subject: 'Actualización en bitácora: Seguimiento individual · Elena Martínez',
      recipients: ['daniel@cemipre-demo.org', 'valentina@cemipre-demo.org'],
      author: 'Camila Torres',
      fecha: isoDaysAgo(0, 11),
      logTitle: 'Seguimiento individual',
      personName: 'Elena Martínez',
      preview: 'Se registró una actualización en la bitácora de Elena Martínez. Por privacidad, el contenido clínico se revisa únicamente dentro de la plataforma o en el Google Doc autorizado.',
      unread: true,
    },
  ];

  return { people, logs, events, activity, notices };
}
