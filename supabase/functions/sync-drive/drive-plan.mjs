/** Funciones puras, reutilizables en Edge y pruebas Node sin Google real. */
export const GOOGLE_DOCS_MIME = 'application/vnd.google-apps.document';
export const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder';

export function escapeDriveQueryId(value) {
  if (!/^[a-zA-Z0-9_-]{5,200}$/.test(String(value))) {
    throw new Error('Identificador de carpeta de Google Drive inválido.');
  }
  return value;
}

export function extractGoogleDocId(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com') return null;
    const match = url.pathname.match(/^\/document\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);
    return match?.[1] ?? null;
  } catch { return null; }
}

export function selectSingleDocument(children) {
  const docs = children.filter((f) => f.mimeType === GOOGLE_DOCS_MIME);
  if (docs.length === 0) return { status: 'sin_documento', doc: null };
  if (docs.length > 1) return { status: 'multiples_documentos', doc: null };
  return { status: 'ok', doc: docs[0] };
}

export function documentRecord(personaId, bitacoraFolder, doc) {
  return {
    persona_id: personaId,
    titulo: bitacoraFolder.name.trim() || doc.name || 'Bitácora',
    url_docs: `https://docs.google.com/document/d/${doc.id}/edit`,
    google_doc_id: doc.id,
    drive_doc_name: doc.name || null,
    drive_folder_id: bitacoraFolder.id,
    drive_modified_time: doc.modifiedTime ?? null,
    drive_last_seen_at: new Date().toISOString(),
    drive_sync_status: 'sincronizada',
  };
}

export function locateExistingLog(rows, docId) {
  return rows.find((row) => row.google_doc_id === docId ||
    (!row.google_doc_id && extractGoogleDocId(row.url_docs) === docId));
}

export function shouldUpdateLog(oldRow, desired) {
  return oldRow.titulo !== desired.titulo ||
    oldRow.url_docs !== desired.url_docs ||
    oldRow.google_doc_id !== desired.google_doc_id ||
    oldRow.drive_doc_name !== desired.drive_doc_name ||
    oldRow.drive_folder_id !== desired.drive_folder_id ||
    oldRow.drive_modified_time !== desired.drive_modified_time ||
    oldRow.drive_sync_status !== 'sincronizada';
}
