/**
 * DRV-03 · Sincronización Drive → Supabase (solo metadatos).
 * POST inicia sincronización; GET consulta estado; ambos requieren JWT y rol autorizado.
 * No descarga el contenido de Docs, no envía correos y no borra bitácoras.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { googleDriveClient, DriveApiError } from './google-drive.ts';
import {
  GOOGLE_FOLDER_MIME, documentRecord, locateExistingLog,
  selectSingleDocument, shouldUpdateLog,
} from './drive-plan.mjs';

const ALLOWED = (Deno.env.get('APP_ALLOWED_ORIGINS') ??
  'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim());

function response(request: Request, data: unknown, status = 200): Response {
  const origin = request.headers.get('Origin');
  const cors = origin && ALLOWED.includes(origin)
    ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  });
}

function newStats() {
  return {
    personas_vinculadas: 0, personas_sin_vinculo: 0, carpetas_bitacora: 0,
    bitacoras_creadas: 0, bitacoras_actualizadas: 0, bitacoras_sin_cambios: 0,
    carpetas_sin_doc: 0, carpetas_ambiguas: 0, docs_no_disponibles: 0,
    carpetas_sin_acceso: 0, errores_bd: 0,
  };
}

async function fetchAll(db: any, table: string, columns: string, filter?: [string, string]) {
  const all: any[] = [];
  for (let from = 0; ; from += 500) {
    let q = db.from(table).select(columns).order('id').range(from, from + 499);
    if (filter) q = q.eq(filter[0], filter[1]);
    const { data, error } = await q;
    if (error) throw new Error(`Error consultando tabla ${table}.`);
    all.push(...(data ?? []));
    if (!data || data.length < 500) return all;
  }
}

async function runSync(db: any, rootFolderId: string) {
  const stats = newStats();
  const warnings: string[] = [];
  const drive = await googleDriveClient();

  // La carpeta de cada persona debe vincularse previamente con personas.drive_folder_id.
  // Nunca inferir identidades a partir de nombres de carpetas.
  const personas = await fetchAll(db, 'personas', 'id,drive_folder_id');
  const byFolder = new Map(personas.filter((p) => p.drive_folder_id)
    .map((p) => [p.drive_folder_id, p]));

  const userFolders = (await drive.listChildren(rootFolderId))
    .filter((f) => f.mimeType === GOOGLE_FOLDER_MIME);
  const observedPersonFolderIds = new Set(userFolders.map((folder) => folder.id));
  const hasLinked = userFolders.some((folder) => byFolder.has(folder.id));
  if (!hasLinked) warnings.push('No hay carpetas vinculadas a personas en Supabase.');

  for (const folder of userFolders) {
    const persona = byFolder.get(folder.id);
    if (!persona) {
      stats.personas_sin_vinculo++;
      continue;
    }
    stats.personas_vinculadas++;
    const seenDocIds = new Set<string>();
    let fullyScanned = true;
    let bitacoraFolders;
    try {
      bitacoraFolders = (await drive.listChildren(folder.id))
        .filter((item) => item.mimeType === GOOGLE_FOLDER_MIME);
    } catch (error) {
      fullyScanned = false;
      stats.carpetas_sin_acceso++;
      warnings.push(`No se pudo consultar una carpeta de usuario (${error instanceof DriveApiError ? error.status : 'error'}).`);
      continue;
    }

    let existing: any[];
    try {
      existing = await fetchAll(db, 'bitacoras',
        'id,persona_id,titulo,url_docs,google_doc_id,drive_doc_name,drive_folder_id,drive_modified_time,drive_sync_status',
        ['persona_id', String(persona.id)]);
    } catch (error) {
      stats.errores_bd++;
      warnings.push('No se pudo consultar las bitácoras de una persona.');
      continue;
    }

    for (const bitacoraFolder of bitacoraFolders) {
      stats.carpetas_bitacora++;
      let children;
      try {
        children = await drive.listChildren(bitacoraFolder.id);
      } catch (error) {
        fullyScanned = false;
        stats.carpetas_sin_acceso++;
        warnings.push(`No se pudo consultar una carpeta de bitácora (${error instanceof DriveApiError ? error.status : 'error'}).`);
        continue;
      }
      const selection = selectSingleDocument(children);
      if (selection.status === 'sin_documento') {
        stats.carpetas_sin_doc++;
        continue;
      }
      if (selection.status === 'multiples_documentos') {
        fullyScanned = false;
        stats.carpetas_ambiguas++;
        warnings.push('Una carpeta de bitácora contiene varios Google Docs; revisar manualmente.');
        continue;
      }
      const doc = selection.doc!;
      seenDocIds.add(doc.id);
      const desired = documentRecord(persona.id, bitacoraFolder, doc);
      const old = locateExistingLog(existing, doc.id);
      if (old) {
        // Comparar fechas como instantes, no formatos de cadena ISO.
        const oldComparable = {
          ...old,
          drive_modified_time: old.drive_modified_time
            ? new Date(old.drive_modified_time).toISOString() : null,
        };
        const newComparable = {
          ...desired,
          drive_modified_time: desired.drive_modified_time
            ? new Date(desired.drive_modified_time).toISOString() : null,
        };
        const changed = shouldUpdateLog(oldComparable, newComparable);
        const { error } = await db.from('bitacoras')
          .update({ ...desired }).eq('id', old.id).eq('persona_id', persona.id);
        if (error) {
          stats.errores_bd++;
          warnings.push('No se pudo actualizar una bitácora.');
        } else if (changed) {
          stats.bitacoras_actualizadas++;
        } else {
          stats.bitacoras_sin_cambios++;
        }
      } else {
        const { error } = await db.from('bitacoras').insert(desired);
        if (error) {
          stats.errores_bd++;
          warnings.push('No se pudo registrar una bitácora nueva (revisar restricciones).');
        } else {
          stats.bitacoras_creadas++;
        }
      }
    }

    // Solo verificar faltantes cuando TODA la carpeta de esa persona pudo escanearse.
    // Nunca eliminar registros: 403/404 no demuestran que el Doc fue borrado.
    if (fullyScanned) {
      for (const old of existing) {
        if (!old.google_doc_id || seenDocIds.has(old.google_doc_id)) continue;
        let estado = 'no_disponible';
        try {
          await drive.getFile(old.google_doc_id);
          // Existe, pero quedó fuera de la ruta esperada: no borrar el registro.
        } catch (error) {
          if (error instanceof DriveApiError && error.status === 403) estado = 'sin_permiso';
          else if (!(error instanceof DriveApiError && error.status === 404)) {
            warnings.push('No se pudo verificar el estado de un documento previamente registrado.');
            continue;
          }
        }
        const { error } = await db.from('bitacoras')
          .update({ drive_sync_status: estado })
          .eq('id', old.id).eq('persona_id', persona.id);
        if (!error) stats.docs_no_disponibles++;
        else stats.errores_bd++;
      }
    }
  }

  for (const persona of byFolder.values()) {
    if (!observedPersonFolderIds.has(persona.drive_folder_id)) {
      stats.carpetas_sin_acceso++;
      warnings.push('Una carpeta previamente vinculada no aparece dentro de la raíz compartida.');
    }
  }
  return { ...stats, advertencias: [...new Set(warnings)].slice(0, 20) };
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin');
  if (origin && !ALLOWED.includes(origin)) return response(request, { error: 'Origen no autorizado.' }, 403);
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, headers: {
        'Access-Control-Allow-Origin': origin ?? '', Vary: 'Origin',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
      },
    });
  }
  if (!['GET', 'POST'].includes(request.method)) {
    return response(request, { error: 'Método no permitido.' }, 405);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const root = Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID');
  if (!url || !anonKey || !serviceKey || !root) {
    return response(request, { error: 'Integración no configurada por el equipo.' }, 503);
  }

  const jwt = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!jwt) return response(request, { error: 'Debes iniciar sesión.' }, 401);
  const publicClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await publicClient.auth.getUser(jwt);
  if (authError || !authData.user) return response(request, { error: 'Sesión inválida.' }, 401);

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  // Contrato con 0002 de Jhoel: perfiles.id = auth.users.id y rol = admin/trabajador/pendiente.
  const { data: perfil, error: perfilError } = await db.from('perfiles')
    .select('rol').eq('id', authData.user.id).maybeSingle();
  if (perfilError || !['admin', 'trabajador'].includes(perfil?.rol)) {
    return response(request, { error: 'Tu cuenta no tiene permiso para sincronizar.' }, 403);
  }

  if (request.method === 'GET') {
    const { data, error } = await db.from('drive_sync_state')
      .select('estado,inicio_at,termino_at,ultimo_exito_at,ultimo_error,resultado')
      .eq('root_folder_id', root).maybeSingle();
    if (error) return response(request, { error: 'No se pudo consultar el estado.' }, 500);
    try {
      const personas = await fetchAll(db, 'personas', 'id,codigo,nombre,drive_folder_id');
      const logs = await fetchAll(db, 'bitacoras',
        'id,persona_id,titulo,url_docs,google_doc_id,drive_doc_name,drive_sync_status');
      const byPerson = new Map<string, any[]>();
      for (const log of logs) {
        const key = String(log.persona_id);
        if (!byPerson.has(key)) byPerson.set(key, []);
        byPerson.get(key)!.push(log);
      }
      // Un usuario autorizado puede ver los metadatos pero jamás secretos ni texto del Doc.
      return response(request, {
        estado: data ?? { estado: 'nunca', resultado: {} },
        carpetas: personas.filter((p) => p.drive_folder_id).map((p) => ({
          id: p.id, codigo: p.codigo, nombre: p.nombre,
          bitacoras: byPerson.get(String(p.id)) ?? [],
        })),
      });
    } catch {
      return response(request, { error: 'No se pudieron consultar las carpetas vinculadas.' }, 500);
    }
  }

  const runId = crypto.randomUUID();
  const { data: started, error: lockError } = await db.rpc('iniciar_sync_drive', {
    p_root_folder_id: root, p_run_id: runId,
  });
  if (lockError) return response(request, { error: 'No se pudo iniciar la sincronización.' }, 500);
  if (!started) return response(request, { error: 'Ya hay una sincronización en curso.' }, 409);

  try {
    const result = await runSync(db, root);
    const estado = result.advertencias.length || result.errores_bd ? 'parcial' : 'completada';
    const { error } = await db.rpc('terminar_sync_drive', {
      p_root_folder_id: root, p_run_id: runId, p_estado: estado,
      p_resultado: result, p_error: null,
    });
    if (error) throw new Error('No se pudo guardar el estado de sincronización.');
    return response(request, { estado, resultado: result });
  } catch (_error) {
    // No transmitir tokens, documentos ni datos privados en errores públicos.
    await db.rpc('terminar_sync_drive', {
      p_root_folder_id: root, p_run_id: runId, p_estado: 'error',
      p_resultado: {}, p_error: 'Sincronización interrumpida; revisar configuración y permisos.',
    });
    return response(request, {
      error: 'No se pudo completar la sincronización. Revisa permisos y configuración.',
    }, 502);
  }
});
