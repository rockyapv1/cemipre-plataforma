import { useCallback, useEffect, useState } from 'react';
import { driveSupabase, isDriveConfigured } from '../drive-supabase.js';

const METRICS = [
  ['personas_vinculadas', 'Carpetas vinculadas'],
  ['personas_sin_vinculo', 'Carpetas sin vincular'],
  ['bitacoras_creadas', 'Bitácoras nuevas'],
  ['bitacoras_actualizadas', 'Bitácoras actualizadas'],
  ['bitacoras_sin_cambios', 'Sin cambios'],
  ['carpetas_sin_acceso', 'Problemas de acceso'],
  ['carpetas_ambiguas', 'Carpetas con varios Docs'],
];

function safeGoogleDocsLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'docs.google.com'
      && /^\/document\/d\/[a-zA-Z0-9_-]+(?:\/|$)/.test(url.pathname)
      ? url.toString() : null;
  } catch { return null; }
}

function readableDate(dateString) {
  if (!dateString) return 'Nunca';
  const value = new Date(dateString);
  return Number.isNaN(value.getTime()) ? 'Sin fecha' :
    new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago',
      dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

export default function CarpetasDriveView() {
  const [auth, setAuth] = useState('cargando');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [state, setState] = useState(null);
  const [folders, setFolders] = useState([]);

  const refresh = useCallback(async () => {
    const client = driveSupabase();
    if (!client) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: invokeError } = await client.functions.invoke('sync-drive', { method: 'GET' });
      if (invokeError || data?.error) {
        throw new Error(data?.error || 'No se pudo consultar el estado de Drive.');
      }
      setState(data.estado);
      setFolders(data.carpetas || []);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const client = driveSupabase();
    if (!client) { setAuth('sin_configuracion'); return; }
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setAuth(data.session ? 'autenticado' : 'sin_sesion');
    }).catch(() => { if (active) setAuth('sin_sesion'); });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setAuth(session ? 'autenticado' : 'sin_sesion');
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (auth === 'autenticado') refresh(); }, [auth, refresh]);

  async function synchronize() {
    if (busy || auth !== 'autenticado') return;
    const client = driveSupabase();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { data, error: invokeError } = await client.functions.invoke('sync-drive', {
        method: 'POST', body: {},
      });
      if (invokeError || data?.error) {
        throw new Error(data?.error || 'No se pudo iniciar la sincronización.');
      }
      setNotice(data.estado === 'completada'
        ? 'Sincronización completada correctamente.'
        : 'Sincronización parcial: revisa las advertencias antes de continuar.');
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  if (!isDriveConfigured() || auth === 'sin_configuracion') {
    return <section className="panel wide-panel" aria-label="Sincronización Google Drive">
      <h2>Carpetas de Google Drive</h2>
      <p role="status">La integración todavía no está configurada. Tomás debe crear Supabase y
        agregar <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> al entorno local.</p>
      <p className="muted">Por seguridad, no se muestra información de Google Drive ni se permite sincronizar.</p>
    </section>;
  }
  if (auth === 'cargando') return <p role="status">Comprobando sesión de Supabase…</p>;
  if (auth === 'sin_sesion') {
    return <section className="panel wide-panel">
      <h2>Inicia sesión para utilizar Drive</h2>
      <p role="status">El módulo solo está disponible para trabajadores autorizados.
        Jesús Uzcanga implementará el inicio de sesión en Supabase Auth.</p>
    </section>;
  }

  const result = state?.resultado ?? {};
  return <section className="panel wide-panel" aria-label="Sincronización Google Drive">
    <div className="panel-title"><h2>Carpetas de Google Drive</h2>
      <span className="count-pill">{folders.length} usuarios vinculados</span></div>
    <p className="muted">Lee carpetas y metadatos; no descarga ni modifica el contenido de Google Docs.
      Los documentos se editan directamente en Google Docs.</p>
    <div className="drive-sync-actions">
      <button type="button" className="btn btn-primary" disabled={busy || loading} onClick={synchronize}>
        {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
      </button>
      <button type="button" className="btn btn-secondary" disabled={busy || loading} onClick={refresh}>
        {loading ? 'Actualizando…' : 'Actualizar estado'}
      </button>
    </div>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {notice && <div className="notice notice-success" role="status">{notice}</div>}
    <div className="drive-state" aria-live="polite">
      <p><strong>Estado:</strong> {state?.estado ?? 'Nunca sincronizado'}</p>
      <p><strong>Última sincronización exitosa:</strong> {readableDate(state?.ultimo_exito_at)}</p>
      {state?.ultimo_error && <p role="alert">{state.ultimo_error}</p>}
    </div>
    <div className="drive-metrics" aria-label="Resultados de sincronización">
      {METRICS.map(([key, label]) => <div className="stat-card" key={key}>
        <span>{label}</span><strong>{Number(result[key] || 0)}</strong>
      </div>)}
    </div>
    {Array.isArray(result.advertencias) && result.advertencias.length > 0 &&
      <div className="notice notice-warn" role="status">
        <strong>Aspectos por revisar:</strong>
        <ul>{result.advertencias.map((message, i) => <li key={i}>{message}</li>)}</ul>
      </div>}
    <h3>Personas con carpeta vinculada</h3>
    {folders.length === 0 ? <p className="muted">Todavía no existen carpetas vinculadas a personas.
      Deben asignar cada <code>personas.drive_folder_id</code> antes de sincronizar.</p> :
      <div className="drive-folder-list">
        {folders.map((folder) => <details className="drive-folder" key={folder.id}>
          <summary>{folder.codigo || 'Sin código'} · {folder.nombre || 'Usuario'}
            <span className="count-pill">{folder.bitacoras.length} bitácoras</span></summary>
          <ul>{folder.bitacoras.map((b) => {
            const link = safeGoogleDocsLink(b.url_docs);
            return <li key={b.id}>
              <strong>{b.titulo}</strong>{b.drive_doc_name && b.drive_doc_name !== b.titulo ? ` (${b.drive_doc_name})` : ''} — {b.drive_sync_status || 'Pendiente'}{' '}
              {link ? <a href={link} target="_blank" rel="noopener noreferrer">Abrir Docs ↗</a>
                : <span>Sin enlace válido</span>}
            </li>;
          })}</ul>
        </details>)}
      </div>}
  </section>;
}
