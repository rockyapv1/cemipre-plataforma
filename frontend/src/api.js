import { isSupabaseConfigured, supabase } from './supabase.js';

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en frontend/.env.local.',
    );
  }
  return supabase;
}

function unwrap({ data, error }, fallback = 'Error al consultar Supabase.') {
  if (error) {
    throw new Error(error.message || fallback);
  }
  return data;
}

function validString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function parseDocsLink(value) {
  if (!value) {
    return { valid: true, url: '', docId: '' };
  }
  if (typeof value !== 'string' || value.length > 500) {
    return { valid: false };
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { valid: false };
  }
  const match = parsed.pathname.match(/^\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (
    parsed.protocol !== 'https:'
    || parsed.hostname !== 'docs.google.com'
    || parsed.username
    || parsed.password
    || !match
  ) {
    return { valid: false };
  }
  return { valid: true, url: value, docId: match[1] };
}

async function logActivity(client, { descripcion, persona_id = null, bitacora_id = null }) {
  const { error } = await client
    .from('actividad')
    .insert({ descripcion, persona_id, bitacora_id });
  if (error) {
    throw new Error(error.message || 'No se pudo registrar el movimiento en actividad.');
  }
}

export const api = {
  async users() {
    const client = requireSupabase();
    const data = unwrap(
      await client.from('personas').select('id, codigo, nombre, bitacoras(count)').order('codigo'),
    );
    return {
      personas: data.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        total_bitacoras: p.bitacoras?.[0]?.count ?? 0,
      })),
    };
  },

  async logs() {
    const client = requireSupabase();
    const data = unwrap(
      await client
        .from('bitacoras')
        .select('id, persona_id, titulo, url_docs, extracto_demo, actualizada, orden, personas(codigo, nombre)')
        .order('actualizada', { ascending: false }),
    );
    return {
      bitacoras: data.map((b) => ({
        id: b.id,
        persona_id: b.persona_id,
        persona_codigo: b.personas?.codigo || '',
        persona_nombre: b.personas?.nombre || 'Usuario',
        titulo: b.titulo,
        url_docs: b.url_docs,
        extracto_demo: b.extracto_demo,
        actualizada: b.actualizada,
        orden: b.orden,
      })),
    };
  },

  async user(id) {
    const client = requireSupabase();
    const persona = unwrap(
      await client
        .from('personas')
        .select('id, codigo, nombre, bitacoras(id, titulo, url_docs, extracto_demo, actualizada, orden)')
        .eq('id', id)
        .single(),
    );
    const bitacoras = [...(persona.bitacoras || [])].sort(
      (a, b) => (a.orden - b.orden) || (a.id - b.id),
    );
    return {
      id: persona.id,
      codigo: persona.codigo,
      nombre: persona.nombre,
      bitacoras: bitacoras.map(({ id: bId, titulo, url_docs, extracto_demo, actualizada }) => ({
        id: bId,
        persona_id: persona.id,
        persona_nombre: persona.nombre,
        persona_codigo: persona.codigo,
        titulo,
        url_docs,
        extracto_demo,
        actualizada,
      })),
    };
  },

  async createUser({ codigo, nombre }) {
    const client = requireSupabase();
    if (!validString(codigo, 32) || !validString(nombre, 120)) {
      throw new Error('Código y nombre obligatorios; verifica sus longitudes.');
    }
    const cleanCode = codigo.trim();
    const cleanName = nombre.trim();
    const { data: existing, error: lookupError } = await client
      .from('personas')
      .select('id')
      .ilike('codigo', cleanCode)
      .limit(1);
    if (lookupError) throw new Error(lookupError.message);
    if (existing && existing.length > 0) {
      throw new Error('Ya existe un usuario con ese código.');
    }

    const { data: persona, error } = await client
      .from('personas')
      .insert({ codigo: cleanCode, nombre: cleanName })
      .select('id, codigo, nombre')
      .single();
    if (error) {
      if (error.code === '23505') throw new Error('Ya existe un usuario con ese código.');
      throw new Error(error.message);
    }

    await logActivity(client, {
      descripcion: `Se creó el registro ${persona.codigo}.`,
      persona_id: persona.id,
    });
    return persona;
  },

  async createLog({ persona_id, titulo, url_docs = '' }) {
    const client = requireSupabase();
    if (!validString(titulo, 160)) {
      throw new Error('El título es obligatorio (máximo 160 caracteres).');
    }
    const personaId = Number(persona_id);
    if (!Number.isInteger(personaId) || personaId <= 0) {
      throw new Error('persona_id inválido.');
    }
    const parsedLink = parseDocsLink(url_docs);
    if (!parsedLink.valid) {
      throw new Error('Se requiere un enlace HTTPS a docs.google.com/document/d/... o vacío.');
    }

    const persona = unwrap(
      await client.from('personas').select('id, codigo').eq('id', personaId).single(),
    );
    const { count, error: countError } = await client
      .from('bitacoras')
      .select('id', { count: 'exact', head: true })
      .eq('persona_id', personaId);
    if (countError) throw new Error(countError.message);

    const bitacora = unwrap(
      await client
        .from('bitacoras')
        .insert({
          persona_id: personaId,
          titulo: titulo.trim(),
          url_docs: parsedLink.url,
          google_doc_id: parsedLink.docId,
          orden: count ?? 0,
        })
        .select('id, titulo, url_docs, actualizada')
        .single(),
    );

    await logActivity(client, {
      descripcion: `Se agregó "${bitacora.titulo}" a ${persona.codigo}.`,
      persona_id: persona.id,
      bitacora_id: bitacora.id,
    });
    return bitacora;
  },

  async updateLog(id, body) {
    const client = requireSupabase();
    if (!body || (!('titulo' in body) && !('url_docs' in body))) {
      throw new Error('Solo se pueden cambiar título o enlace de Google Docs.');
    }
    const updates = {};
    if ('titulo' in body) {
      if (!validString(body.titulo, 160)) {
        throw new Error('Título inválido (máximo 160 caracteres).');
      }
      updates.titulo = body.titulo.trim();
    }
    if ('url_docs' in body) {
      const parsedLink = parseDocsLink(body.url_docs);
      if (!parsedLink.valid) {
        throw new Error('El enlace debe apuntar a https://docs.google.com/document/d/...');
      }
      updates.url_docs = parsedLink.url;
      updates.google_doc_id = parsedLink.docId;
    }

    const bitacora = unwrap(
      await client
        .from('bitacoras')
        .update(updates)
        .eq('id', id)
        .select('id, titulo, url_docs, actualizada, persona_id, personas(codigo)')
        .single(),
    );

    const codigo = bitacora.personas?.codigo || '';
    await logActivity(client, {
      descripcion: `Se actualizaron datos de "${bitacora.titulo}"${codigo ? ` (${codigo})` : ''}.`,
      persona_id: bitacora.persona_id,
      bitacora_id: bitacora.id,
    });
    return {
      id: bitacora.id,
      titulo: bitacora.titulo,
      url_docs: bitacora.url_docs,
      actualizada: bitacora.actualizada,
    };
  },

  async summary(id) {
    const client = requireSupabase();
    const persona = unwrap(
      await client
        .from('personas')
        .select('id, nombre, bitacoras(id, titulo, extracto_demo, orden)')
        .eq('id', id)
        .single(),
    );
    const bitacoras = [...(persona.bitacoras || [])].sort(
      (a, b) => (a.orden - b.orden) || (a.id - b.id),
    );
    return {
      es_demo: true,
      nombre: persona.nombre,
      cantidad_bitacoras: bitacoras.length,
      advertencia: 'Vista temporal de ejemplo desde Supabase. Aún no lee el contenido real de Google Docs ni usa IA.',
      secciones: bitacoras.map((b) => ({
        titulo: b.titulo,
        texto: b.extracto_demo || 'Sin información de ejemplo disponible.',
      })),
    };
  },

  async events() {
    const client = requireSupabase();
    const eventos = unwrap(
      await client
        .from('eventos')
        .select('id, titulo, descripcion, inicio, fin, responsable')
        .order('inicio', { ascending: true }),
    );
    return { eventos };
  },

  async createEvent({ titulo, descripcion = '', responsable = 'Equipo CEMIPRE', inicio, fin }) {
    const client = requireSupabase();
    if (!validString(titulo, 160)) {
      throw new Error('El título del evento es obligatorio.');
    }
    const start = new Date(inicio);
    const end = new Date(fin);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new Error('Las fechas deben ser válidas y el fin posterior al inicio.');
    }
    const owner = (responsable || 'Equipo CEMIPRE').trim();
    if (typeof descripcion !== 'string' || descripcion.length > 2000 || !validString(owner, 120)) {
      throw new Error('Descripción o responsable inválido.');
    }

    const evento = unwrap(
      await client
        .from('eventos')
        .insert({
          titulo: titulo.trim(),
          descripcion,
          inicio: start.toISOString(),
          fin: end.toISOString(),
          responsable: owner,
        })
        .select('id, titulo, descripcion, inicio, fin, responsable')
        .single(),
    );

    await logActivity(client, { descripcion: `Se creó el evento "${evento.titulo}".` });
    return evento;
  },

  async deleteEvent(id) {
    const client = requireSupabase();
    const deleted = unwrap(
      await client.from('eventos').delete().eq('id', id).select('id, titulo').single(),
    );
    await logActivity(client, { descripcion: `Se eliminó el evento "${deleted.titulo}".` });
    return { ok: true };
  },

  async activity() {
    const client = requireSupabase();
    const actividad = unwrap(
      await client
        .from('actividad')
        .select('id, descripcion, fecha')
        .order('fecha', { ascending: false })
        .order('id', { ascending: false })
        .limit(30),
    );
    return { actividad };
  },
};
