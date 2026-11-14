import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeDriveQueryId, extractGoogleDocId, selectSingleDocument,
  locateExistingLog, documentRecord, shouldUpdateLog, GOOGLE_DOCS_MIME,
} from './drive-plan.mjs';

const doc = { id: 'GoogleDoc123456', name: 'Notas', mimeType: GOOGLE_DOCS_MIME, modifiedTime: '2026-11-14T00:00:00Z' };

test('selecciona exactamente un documento sin confundir otros tipos', () => {
  assert.equal(selectSingleDocument([doc, { id: 'x', mimeType: 'image/png' }]).status, 'ok');
  assert.equal(selectSingleDocument([]).status, 'sin_documento');
  assert.equal(selectSingleDocument([doc, { ...doc, id: 'otro' }]).status, 'multiples_documentos');
});

test('reconoce el enlace Docs existente para evitar duplicados', () => {
  const rows = [{ id: 9, url_docs: `https://docs.google.com/document/d/${doc.id}/edit`, google_doc_id: null }];
  assert.equal(locateExistingLog(rows, doc.id)?.id, 9);
  assert.equal(extractGoogleDocId('https://docs.google.com.evil.com/document/d/abc/edit'), null);
  assert.equal(extractGoogleDocId('https://docs.google.com/spreadsheets/d/abc'), null);
});

test('reconoce un renombre y no modifica filas que ya coinciden', () => {
  const desired = documentRecord(10, { id: 'folder_12345', name: 'Bitácora nueva' }, doc);
  const same = { ...desired, id: 45 };
  assert.equal(shouldUpdateLog(same, desired), false);
  assert.equal(shouldUpdateLog({ ...same, titulo: 'Nombre anterior' }, desired), true);
  assert.equal(shouldUpdateLog({ ...same, drive_doc_name: 'Documento renombrado' }, desired), true);
});

test('rechaza un ID de carpeta no válido', () => {
  assert.equal(escapeDriveQueryId('folder_123456'), 'folder_123456');
  assert.throws(() => escapeDriveQueryId("abc' OR true"), /inválido/);
});
